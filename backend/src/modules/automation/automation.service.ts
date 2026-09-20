import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/supabase.provider';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ethers } from 'ethers';

export interface DonorAutomationSetting {
  campaignId: number;
  donorAddress: string;
  isEnabled: boolean;
  maxAutoAmount: number;          // FTU ceiling for auto-sanction
  requireManualHighRisk: boolean; // Force manual review for HIGH risk AI output
  autoRejectFraud: boolean;       // Auto-reject if riskLevel = HIGH and AI=REJECT
  updatedAt?: string;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Get automation setting for a specific donor + campaign pair.
   * Returns defaults (isEnabled=false) if no row exists.
   */
  async getSetting(campaignId: number, donorAddress: string): Promise<DonorAutomationSetting> {
    const addr = donorAddress.toLowerCase();
    const { data, error } = await this.supabase
      .from('donor_automation_settings')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('donor_address', addr)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error fetching automation setting: ${error.message}`);
    }

    return {
      campaignId,
      donorAddress: addr,
      isEnabled: data?.is_enabled ?? false,
      maxAutoAmount: Number(data?.max_auto_amount ?? 10000),
      requireManualHighRisk: data?.require_manual_high_risk ?? true,
      autoRejectFraud: data?.auto_reject_fraud ?? true,
      updatedAt: data?.updated_at,
    };
  }

  /**
   * Get all donor automation settings for a campaign (admin/creator view).
   */
  async getCampaignSettings(campaignId: number): Promise<DonorAutomationSetting[]> {
    const { data, error } = await this.supabase
      .from('donor_automation_settings')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('donor_address');

    if (error) {
      this.logger.error(`Error fetching campaign settings: ${error.message}`);
      return [];
    }

    return (data || []).map((row) => ({
      campaignId: Number(row.campaign_id),
      donorAddress: row.donor_address,
      isEnabled: row.is_enabled,
      maxAutoAmount: Number(row.max_auto_amount ?? 10000),
      requireManualHighRisk: row.require_manual_high_risk ?? true,
      autoRejectFraud: row.auto_reject_fraud ?? true,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Upsert (create or update) a donor's automation setting for a campaign.
   */
  async upsertSetting(dto: DonorAutomationSetting): Promise<DonorAutomationSetting> {
    const addr = dto.donorAddress.toLowerCase();
    const { data, error } = await this.supabase
      .from('donor_automation_settings')
      .upsert({
        campaign_id: dto.campaignId,
        donor_address: addr,
        is_enabled: dto.isEnabled,
        max_auto_amount: dto.maxAutoAmount,
        require_manual_high_risk: dto.requireManualHighRisk,
        auto_reject_fraud: dto.autoRejectFraud,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'campaign_id,donor_address' })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to save automation setting: ${error.message}`);
    }

    this.logger.log(
      `Automation setting updated: campaign=${dto.campaignId}, donor=${addr}, enabled=${dto.isEnabled}`
    );

    return {
      campaignId: Number(data.campaign_id),
      donorAddress: data.donor_address,
      isEnabled: data.is_enabled,
      maxAutoAmount: Number(data.max_auto_amount),
      requireManualHighRisk: data.require_manual_high_risk,
      autoRejectFraud: data.auto_reject_fraud,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Called by QuotationsService after AI evaluation completes (non-blocking).
   * Finds all donors who have automation enabled for this campaign,
   * evaluates their policy, and auto-sanctions on their behalf via the relay signer.
   *
   * IMPORTANT: For the prototype, the first eligible auto-donor's policy is applied.
   * A production system would support per-donor weighted allocations.
   */
  async processQuotationAutomation(quotationId: number): Promise<void> {
    try {
      // 1. Load the quotation
      const { data: quotation, error: qErr } = await this.supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (qErr || !quotation) {
        this.logger.warn(`[Automation] Quotation ${quotationId} not found`);
        return;
      }

      const campaignId = Number(quotation.campaign_id);
      const aiRec = quotation.ai_recommendation;

      if (!aiRec) {
        this.logger.warn(`[Automation] No AI recommendation for quotation ${quotationId}`);
        return;
      }

      const requestedAmountFtu = Number(quotation.requested_amount_ftu);
      const suggestedAmount = Number(aiRec.suggestedSanctionAmount ?? requestedAmountFtu);
      const recommendation: string = aiRec.recommendation; // 'APPROVE' | 'REJECT' | 'REVIEW'
      const riskLevel: string = aiRec.riskLevel;           // 'LOW' | 'MEDIUM' | 'HIGH'

      // 2. Get all donors with automation enabled for this campaign
      const allDonorSettings = await this.getCampaignSettings(campaignId);
      const activeDonors = allDonorSettings.filter((d) => d.isEnabled);

      if (activeDonors.length === 0) {
        this.logger.log(
          `[Automation] No donors with automation enabled for campaign ${campaignId}`
        );
        return;
      }

      // 3. Get the signed contract (relay signer)
      const signedContract = this.blockchainService.getSignedContract();
      if (!signedContract) {
        this.logger.warn('[Automation] Relay signer not configured — cannot auto-sanction');
        return;
      }

      this.logger.log(
        `[Automation] Processing quotation ${quotationId}: ${recommendation}/${riskLevel} ` +
        `for ${activeDonors.length} auto-enabled donors`
      );

      // 4. For each auto-enabled donor, evaluate policy and act
      for (const donor of activeDonors) {
        try {
          // Policy: skip if AI does not recommend approval
          if (recommendation !== 'APPROVE') {
            this.logger.log(
              `[Automation] Donor ${donor.donorAddress}: skipping auto-sanction (AI=${recommendation})`
            );
            continue;
          }

          // Policy: HIGH risk requires manual if donor has requireManualHighRisk=true
          if (riskLevel === 'HIGH' && donor.requireManualHighRisk) {
            this.logger.log(
              `[Automation] Donor ${donor.donorAddress}: HIGH risk → requires manual per policy`
            );
            continue;
          }

          // Policy: skip if amount exceeds donor's ceiling
          if (suggestedAmount > donor.maxAutoAmount) {
            this.logger.log(
              `[Automation] Donor ${donor.donorAddress}: ` +
              `amount ${suggestedAmount} > policy max ${donor.maxAutoAmount} → needs manual`
            );
            continue;
          }

          // 5. Verify on-chain automation flag for this donor (authoritative check)
          let onChainEnabled = false;
          try {
            const readContract = this.blockchainService.getContract();
            if (readContract) {
              onChainEnabled = await readContract.isDonorAutomationEnabled(
                campaignId,
                ethers.getAddress(donor.donorAddress)
              );
            } else {
              onChainEnabled = donor.isEnabled; // Fallback to Supabase if no contract
            }
          } catch (err: any) {
            this.logger.warn(
              `[Automation] On-chain check failed for ${donor.donorAddress}: ${err.message} — using Supabase`
            );
            onChainEnabled = donor.isEnabled;
          }

          if (!onChainEnabled) {
            this.logger.log(
              `[Automation] Donor ${donor.donorAddress}: on-chain automation disabled, skipping`
            );
            continue;
          }

          // 6. Execute on-chain auto-sanction via relay signer
          const onChainQuotationId = Number(quotation.on_chain_quotation_id ?? 0);

          if (onChainQuotationId > 0) {
            this.logger.log(
              `[Automation] Sending on-chain sanctionQuotation: campaign=${campaignId}, ` +
              `quotation=${onChainQuotationId}, amount=${suggestedAmount}, donor=${donor.donorAddress}`
            );

            const tx = await signedContract.sanctionQuotation(
              campaignId,
              onChainQuotationId,
              BigInt(suggestedAmount),
              true,                                           // isAutomated
              ethers.getAddress(donor.donorAddress)           // onBehalfOfDonor
            );
            await tx.wait();
            this.logger.log(`[Automation] On-chain tx confirmed: ${tx.hash}`);
          } else {
            this.logger.warn(
              `[Automation] Quotation ${quotationId} has no on_chain_quotation_id yet. ` +
              `Updating Supabase only — on-chain sanction deferred.`
            );
          }

          // 7. Update Supabase record to Claimable
          await this.supabase
            .from('quotations')
            .update({
              state: 'Claimable',
              allocated_amount_ftu: suggestedAmount,
              sanctioned_by: donor.donorAddress.toLowerCase(),
              is_automated_sanction: true,
              sanctioned_at: new Date().toISOString(),
            })
            .eq('id', quotationId);

          this.logger.log(
            `[Automation] ✅ Quotation ${quotationId} auto-sanctioned: ` +
            `${suggestedAmount} FTU for donor ${donor.donorAddress}`
          );

          // Prototype: apply first eligible donor's policy and stop.
          break;
        } catch (err: any) {
          this.logger.error(
            `[Automation] Error auto-sanctioning for donor ${donor.donorAddress}: ${err.message}`
          );
        }
      }
    } catch (err: any) {
      this.logger.error(`[Automation] processQuotationAutomation failed: ${err.message}`);
    }
  }
}
