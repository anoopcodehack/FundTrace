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

  private policyCache = new Map<string, Partial<DonorAutomationSetting>>();

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Get automation setting for a specific donor + campaign pair.
   * Checks Supabase automation_settings table and local policy cache.
   */
  async getSetting(campaignId: number, donorAddress: string): Promise<DonorAutomationSetting> {
    const addr = donorAddress.toLowerCase();
    const ids = [campaignId];
    try {
      const { data: c } = await this.supabase
        .from('campaigns')
        .select('id, on_chain_id')
        .or(`id.eq.${campaignId},on_chain_id.eq.${campaignId}`)
        .maybeSingle();
      if (c) {
        if (c.id && !ids.includes(c.id)) ids.push(c.id);
        if (c.on_chain_id && !ids.includes(Number(c.on_chain_id))) ids.push(Number(c.on_chain_id));
      }
    } catch {}

    const { data } = await this.supabase
      .from('automation_settings')
      .select('*')
      .in('campaign_id', ids)
      .maybeSingle();

    const cacheKey = `${campaignId}:${addr}`;
    const cached = this.policyCache.get(cacheKey) || {};

    return {
      campaignId,
      donorAddress: addr,
      isEnabled: data?.is_enabled ?? (cached.isEnabled ?? false),
      maxAutoAmount: Number(cached.maxAutoAmount ?? 100000),
      requireManualHighRisk: cached.requireManualHighRisk ?? true,
      autoRejectFraud: cached.autoRejectFraud ?? true,
      updatedAt: data?.created_at,
    };
  }

  /**
   * Get all donor automation settings for a campaign (admin/creator view).
   * Automatically resolves both database ID and on-chain ID from automation_settings.
   */
  async getCampaignSettings(campaignId: number): Promise<DonorAutomationSetting[]> {
    const ids = [campaignId];
    try {
      const { data: c } = await this.supabase
        .from('campaigns')
        .select('id, on_chain_id')
        .or(`id.eq.${campaignId},on_chain_id.eq.${campaignId}`)
        .maybeSingle();
      if (c) {
        if (c.id && !ids.includes(c.id)) ids.push(c.id);
        if (c.on_chain_id && !ids.includes(Number(c.on_chain_id))) ids.push(Number(c.on_chain_id));
      }
    } catch {}

    const { data, error } = await this.supabase
      .from('automation_settings')
      .select('*')
      .in('campaign_id', ids);

    if (error) {
      this.logger.error(`Error fetching campaign settings: ${error.message}`);
      return [];
    }

    return (data || []).map((row) => {
      const donor = (row.enabled_by || '').toLowerCase() || '0x90f79bf6eb2c4f870365e785982e1f101e93b906';
      const cacheKey = `${row.campaign_id}:${donor}`;
      const cached = this.policyCache.get(cacheKey) || {};

      return {
        campaignId: Number(row.campaign_id),
        donorAddress: donor,
        isEnabled: row.is_enabled,
        maxAutoAmount: Number(cached.maxAutoAmount ?? 100000),
        requireManualHighRisk: cached.requireManualHighRisk ?? true,
        autoRejectFraud: cached.autoRejectFraud ?? true,
        updatedAt: row.created_at,
      };
    });
  }

  /**
   * Upsert (create or update) a donor's automation setting for a campaign.
   */
  async upsertSetting(dto: DonorAutomationSetting): Promise<DonorAutomationSetting> {
    const addr = dto.donorAddress.toLowerCase();
    
    // Resolve target campaign id for database
    let targetCampaignId = dto.campaignId;
    try {
      const { data: c } = await this.supabase
        .from('campaigns')
        .select('id, on_chain_id')
        .or(`id.eq.${dto.campaignId},on_chain_id.eq.${dto.campaignId}`)
        .maybeSingle();
      if (c?.on_chain_id) {
        targetCampaignId = Number(c.on_chain_id);
      }
    } catch {}

    const payload = {
      campaign_id: targetCampaignId,
      is_enabled: dto.isEnabled,
      enabled_by: addr,
      enabled_at: dto.isEnabled ? new Date().toISOString() : null,
      disabled_at: !dto.isEnabled ? new Date().toISOString() : null,
    };

    const { data, error } = await this.supabase
      .from('automation_settings')
      .upsert(payload, { onConflict: 'campaign_id' })
      .select()
      .single();

    if (error) {
      this.logger.warn(`Failed to upsert automation_settings: ${error.message}`);
    }

    // Cache customized policy parameters
    const cacheKey = `${targetCampaignId}:${addr}`;
    this.policyCache.set(cacheKey, {
      isEnabled: dto.isEnabled,
      maxAutoAmount: dto.maxAutoAmount,
      requireManualHighRisk: dto.requireManualHighRisk,
      autoRejectFraud: dto.autoRejectFraud,
    });

    this.logger.log(
      `Automation setting updated: campaign=${targetCampaignId}, donor=${addr}, enabled=${dto.isEnabled}`
    );

    return {
      campaignId: targetCampaignId,
      donorAddress: addr,
      isEnabled: dto.isEnabled,
      maxAutoAmount: dto.maxAutoAmount,
      requireManualHighRisk: dto.requireManualHighRisk,
      autoRejectFraud: dto.autoRejectFraud,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Called after AI evaluation or when a quotation is linked on-chain.
   * Finds eligible donors who have automation enabled for this campaign,
   * evaluates their policy, records AI evaluation on-chain, and auto-sanctions
   * (or auto-rejects) on their behalf via the relay signer.
   */
  async processQuotationAutomation(quotationId: number): Promise<void> {
    try {
      // 1. Load the quotation from Supabase
      const { data: quotation, error: qErr } = await this.supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (qErr || !quotation) {
        this.logger.warn(`[Automation] Quotation ${quotationId} not found`);
        return;
      }

      const rawCampaignId = Number(quotation.campaign_id);
      let aiRec = quotation.ai_recommendation;
      if (typeof aiRec === 'string') {
        try {
          aiRec = JSON.parse(aiRec);
        } catch {}
      }

      if (!aiRec) {
        this.logger.warn(`[Automation] No AI recommendation for quotation ${quotationId}`);
        return;
      }

      // Resolve the actual on-chain campaign ID
      let onChainCampaignId = rawCampaignId;
      try {
        const { data: dbCamp } = await this.supabase
          .from('campaigns')
          .select('id, on_chain_id')
          .or(`id.eq.${rawCampaignId},on_chain_id.eq.${rawCampaignId}`)
          .maybeSingle();

        if (dbCamp?.on_chain_id && Number(dbCamp.on_chain_id) > 0) {
          onChainCampaignId = Number(dbCamp.on_chain_id);
        }
      } catch (cErr) {
        this.logger.warn(`[Automation] Could not look up campaign mapping: ${cErr}`);
      }

      const requestedAmountFtu = Number(quotation.requested_amount_ftu);
      const suggestedAmount = Number(aiRec.suggestedSanctionAmount ?? requestedAmountFtu);
      const recommendation: string = String(aiRec.recommendation || '').toUpperCase(); // 'APPROVE' | 'REJECT' | 'REVIEW'
      const riskLevel: string = String(aiRec.riskLevel || 'LOW').toUpperCase();           // 'LOW' | 'MEDIUM' | 'HIGH'


      // 2. Resolve on-chain quotation ID if not yet recorded
      let onChainQuotationId = Number(quotation.on_chain_quotation_id ?? 0);
      const readContract = this.blockchainService.getContract();

      if (onChainQuotationId <= 0 && readContract && onChainCampaignId > 0) {
        try {
          const campData = await readContract.getCampaign(onChainCampaignId);
          const qCount = Number(campData.quotationCount);
          for (let qIdx = qCount; qIdx >= 1; qIdx--) {
            const onQ = await readContract.getQuotation(onChainCampaignId, qIdx);
            const rawHash = (quotation.quotation_hash || '').toLowerCase();
            const onHash = (onQ.quotationHash || '').toLowerCase();
            if (rawHash && onHash && (rawHash === onHash || rawHash.includes(onHash.replace(/^0x/, '')))) {
              onChainQuotationId = qIdx;
              await this.supabase
                .from('quotations')
                .update({ on_chain_quotation_id: qIdx })
                .eq('id', quotationId);
              break;
            }
          }
        } catch (syncErr) {
          this.logger.warn(`[Automation] Could not sync onChainQuotationId: ${syncErr}`);
        }
      }

      // 3. Get all donors with automation enabled for this campaign
      const allDonorSettings = await this.getCampaignSettings(onChainCampaignId);
      let activeDonors = allDonorSettings.filter((d) => d.isEnabled);

      // Fallback: Check known donors directly on-chain if no Supabase settings exist
      if (activeDonors.length === 0 && readContract && onChainCampaignId > 0) {
        const potentialDonors = [
          '0x90f79bf6eb2c4f870365e785982e1f101e93b906', // Alice
          '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', // Bob
          '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc', // Charlie
          '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', // Deployer
        ];
        for (const addr of potentialDonors) {
          try {
            const isAuto = await readContract.isDonorAutomationEnabled(onChainCampaignId, addr);
            const don = await readContract.donations(onChainCampaignId, addr);
            if (isAuto && don > 0n) {
              activeDonors.push({
                campaignId: onChainCampaignId,
                donorAddress: addr,
                isEnabled: true,
                maxAutoAmount: 100000,
                requireManualHighRisk: true,
                autoRejectFraud: true,
              });
            }
          } catch {}
        }
      }

      if (activeDonors.length === 0) {
        this.logger.log(
          `[Automation] No donors with automation enabled for campaign ${onChainCampaignId}`
        );
        return;
      }

      // 4. Get the signed contract (relay signer)
      const signedContract = this.blockchainService.getSignedContract();
      if (!signedContract) {
        this.logger.warn('[Automation] Relay signer not configured — cannot auto-sanction');
        return;
      }

      this.logger.log(
        `[Automation] Processing quotation #${quotationId} (on-chain #${onChainQuotationId}): ${recommendation}/${riskLevel} ` +
        `for ${activeDonors.length} auto-enabled donor(s)`
      );

      // 5. If on-chain quotation is in Pending state (0), record AI recommendation on-chain first
      let onChainQ: any = null;
      if (onChainQuotationId > 0) {
        try {
          onChainQ = await signedContract.getQuotation(onChainCampaignId, onChainQuotationId);
          if (Number(onChainQ.state) === 5 || Number(onChainQ.state) === 4) {
            // Already sanctioned on-chain! Sync Supabase and finish.
            await this.supabase
              .from('quotations')
              .update({
                state: 'Claimable',
                allocated_amount_ftu: Number(onChainQ.allocatedAmount),
                sanctioned_by: onChainQ.sanctionedBy.toLowerCase(),
                is_automated_sanction: true,
                sanctioned_at: new Date().toISOString(),
              })
              .eq('id', quotationId);
            this.logger.log(`[Automation] Quotation #${quotationId} is already sanctioned on-chain. Supabase synced to Claimable.`);
            return;
          }

          if (Number(onChainQ.state) === 0 && quotation.ai_recommendation_hash) {
            const recHash = quotation.ai_recommendation_hash.startsWith('0x')
              ? quotation.ai_recommendation_hash
              : '0x' + quotation.ai_recommendation_hash;
            const recTx = await signedContract.recordAIRecommendation(
              onChainCampaignId,
              onChainQuotationId,
              recHash
            );
            await recTx.wait();
            this.logger.log(`[Automation] Recorded AI recommendation on-chain for quotation #${onChainQuotationId}`);
          }
        } catch (onChainReadErr: any) {
          this.logger.warn(`[Automation] Notice during on-chain quotation prep: ${onChainReadErr.message}`);
        }
      }

      // 6. Evaluate each auto-enabled donor's policy and act
      for (const donor of activeDonors) {
        try {
          const donorAddrFormatted = ethers.getAddress(donor.donorAddress);

          // Check on-chain automation permission for this donor
          let onChainEnabled = false;
          try {
            if (readContract) {
              onChainEnabled = await readContract.isDonorAutomationEnabled(
                onChainCampaignId,
                donorAddrFormatted
              );
            } else {
              onChainEnabled = donor.isEnabled;
            }
          } catch {
            onChainEnabled = donor.isEnabled;
          }

          if (!onChainEnabled) {
            this.logger.log(
              `[Automation] Donor ${donor.donorAddress}: on-chain automation disabled, skipping`
            );
            continue;
          }

          // Case A: AUTO-REJECT FRAUD
          if (recommendation === 'REJECT') {
            if (donor.autoRejectFraud) {
              this.logger.log(`[Automation] AI recommends REJECT and donor has autoRejectFraud enabled.`);
              if (onChainQuotationId > 0) {
                const rejTx = await signedContract.rejectQuotation(
                  onChainCampaignId,
                  onChainQuotationId,
                  `AI Auto-Rejection: ${aiRec.reasons?.join('; ') || 'Criteria not met'}`
                );
                await rejTx.wait();
                this.logger.log(`[Automation] On-chain rejection tx confirmed: ${rejTx.hash}`);
              }
              await this.supabase
                .from('quotations')
                .update({
                  state: 'DonorRejected',
                  rejected_by: donor.donorAddress.toLowerCase(),
                  rejection_reason: `AI Auto-Rejection: ${aiRec.reasons?.join('; ') || 'Criteria not met'}`,
                  rejected_at: new Date().toISOString(),
                })
                .eq('id', quotationId);

              this.logger.log(`[Automation] ❌ Quotation #${quotationId} auto-rejected per policy.`);
              break;
            } else {
              this.logger.log(`[Automation] AI recommends REJECT but donor does not auto-reject fraud, skipping.`);
              continue;
            }
          }

          // Case B: AUTO-SANCTION APPROVAL
          if (recommendation !== 'APPROVE') {
            this.logger.log(
              `[Automation] Donor ${donor.donorAddress}: skipping auto-sanction (AI=${recommendation})`
            );
            continue;
          }

          // Policy: HIGH risk requires manual if donor has requireManualHighRisk=true
          if (riskLevel === 'HIGH' && donor.requireManualHighRisk) {
            this.logger.log(
              `[Automation] Donor ${donor.donorAddress}: HIGH risk → requires manual review per policy`
            );
            continue;
          }

          // Policy: skip if amount exceeds donor's ceiling
          if (suggestedAmount > donor.maxAutoAmount) {
            this.logger.log(
              `[Automation] Donor ${donor.donorAddress}: ` +
              `amount ${suggestedAmount} > policy max ${donor.maxAutoAmount} → requires manual review`
            );
            continue;
          }

          // Calculate on-chain sanction amount matching on-chain units
          let sanctionAmountWei = onChainQ?.requestedAmount ?? BigInt(suggestedAmount);
          if (onChainQ && suggestedAmount < requestedAmountFtu) {
            if (onChainQ.requestedAmount > 1_000_000_000_000n) {
              sanctionAmountWei = ethers.parseEther(suggestedAmount.toString());
            } else {
              sanctionAmountWei = BigInt(Math.floor(suggestedAmount));
            }
            if (sanctionAmountWei > onChainQ.requestedAmount) {
              sanctionAmountWei = onChainQ.requestedAmount;
            }
          }

          // Execute on-chain auto-sanction via relay signer
          if (onChainQuotationId > 0) {
            this.logger.log(
              `[Automation] Sending on-chain sanctionQuotation: campaign=${onChainCampaignId}, ` +
              `quotation=${onChainQuotationId}, amount=${sanctionAmountWei}, donor=${donor.donorAddress}`
            );

            const tx = await signedContract.sanctionQuotation(
              onChainCampaignId,
              onChainQuotationId,
              sanctionAmountWei,
              true,                      // isAutomated
              donorAddrFormatted         // onBehalfOfDonor
            );
            await tx.wait();
            this.logger.log(`[Automation] On-chain tx confirmed: ${tx.hash}`);
          } else {
            this.logger.warn(
              `[Automation] Quotation ${quotationId} has no on_chain_quotation_id yet. Updating Supabase only.`
            );
          }

          // Update Supabase record to Claimable
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
            `[Automation] ✅ Quotation #${quotationId} auto-sanctioned: ` +
            `${suggestedAmount} FTU on behalf of donor ${donor.donorAddress}`
          );

          break; // Applied first eligible donor policy
        } catch (donorErr: any) {
          this.logger.error(
            `[Automation] Error auto-sanctioning for donor ${donor.donorAddress}: ${donorErr.message}`
          );
        }
      }
    } catch (err: any) {
      this.logger.error(`[Automation] processQuotationAutomation failed: ${err.message}`);
    }
  }
}
