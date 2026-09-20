import {
  Injectable, Logger, BadRequestException, NotFoundException, Inject,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/supabase.provider';
import { AiService, AIEvaluationInput } from '../ai/ai.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ScoresService } from '../scores/scores.service';
import { computeFileKeccak256 } from '../../utils/canonical';
import { ConfigService } from '@nestjs/config';

export interface CreateQuotationDto {
  campaignId: number;
  creatorAddress: string;
  purpose: string;
  vendorName: string;
  vendorContact?: string;
  requestedAmountFtu: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceFtu: number;
    totalFtu: number;
  }>;
}

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);
  private readonly bucket: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly aiService: AiService,
    private readonly blockchainService: BlockchainService,
    private readonly scoresService: ScoresService,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('SUPABASE_STORAGE_BUCKET') || 'receipts';
  }

  /**
   * Upload quotation document, compute hash, save to Supabase, run AI evaluation.
   * Returns the full quotation record with AI recommendation.
   */
  async createQuotation(dto: CreateQuotationDto, file?: Express.Multer.File) {
    const { campaignId, creatorAddress } = dto;

    // 1. Compute file hash (or hash the JSON body if no file)
    let quotationHash: string;
    let storagePath: string | null = null;
    let documentUrl: string | null = null;

    if (file && file.buffer) {
      quotationHash = computeFileKeccak256(file.buffer);
      storagePath = `quotations/${campaignId}/${Date.now()}_${file.originalname}`;

      const { error: uploadError } = await this.supabase.storage
        .from(this.bucket)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        this.logger.warn(`Storage upload failed: ${uploadError.message}`);
      } else {
        const { data: urlData } = this.supabase.storage
          .from(this.bucket)
          .getPublicUrl(storagePath);
        documentUrl = urlData?.publicUrl || null;
      }
    } else {
      // Hash the canonical quotation data
      const canonical = JSON.stringify({
        campaignId: dto.campaignId,
        creator: dto.creatorAddress.toLowerCase(),
        purpose: dto.purpose,
        vendor: dto.vendorName,
        amount: dto.requestedAmountFtu,
        items: dto.items,
      });
      quotationHash = '0x' + require('crypto').createHash('sha256').update(canonical).digest('hex');
    }

    // 2. Fetch creator score for AI input
    const scoreData = await this.scoresService.getScore(creatorAddress);
    const creatorScore = scoreData.supabase?.current_score
      ?? scoreData.onChain?.score
      ?? 70;

    // 3. Fetch campaign data for AI context
    let campaignObjective = 'Transparent crowdfunding campaign';
    let campaignBalance = dto.requestedAmountFtu * 2; // safe fallback
    try {
      const contract = this.blockchainService.getContract();
      if (contract) {
        const financials = await contract.getCampaignFinancials(campaignId);
        campaignBalance = Number(financials.remainingBalance);
        // Try to get campaign metadata from Supabase for objective
        const { data: meta } = await this.supabase
          .from('campaigns')
          .select('story, title')
          .eq('on_chain_id', campaignId)
          .maybeSingle();
        if (meta) campaignObjective = `${meta.title}: ${meta.story?.slice(0, 200)}`;
      }
    } catch (err: any) {
      this.logger.warn(`Could not fetch campaign financials: ${err.message}`);
    }

    // 4. Fetch historical approved vs claimed
    const { data: previousQuotations } = await this.supabase
      .from('quotations')
      .select('allocated_amount_ftu, claimed_amount_ftu, state')
      .eq('creator_address', creatorAddress.toLowerCase());

    let totalApproved = 0, totalClaimed = 0;
    for (const q of (previousQuotations || [])) {
      totalApproved += Number(q.allocated_amount_ftu || 0);
      totalClaimed += Number(q.claimed_amount_ftu || 0);
    }

    // 5. Run AI evaluation
    const aiInput: AIEvaluationInput = {
      quotationAmount: dto.requestedAmountFtu,
      campaignObjective,
      campaignBalance,
      requestedAllocation: dto.requestedAmountFtu,
      previousRequestsCount: (previousQuotations || []).length,
      creatorReliabilityScore: creatorScore,
      previousProofBehavior: {
        onTimeProofs: scoreData.supabase?.on_time_proof_pct ?? 0,
        lateProofs: scoreData.supabase?.late_proofs ?? 0,
        missingProofs: scoreData.supabase?.missing_proofs ?? 0,
        unresolvedRequests: scoreData.supabase?.unresolved_requests ?? 0,
      },
      quotationPurpose: dto.purpose,
      vendorName: dto.vendorName,
      items: dto.items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPriceFtu,
        total: i.totalFtu,
      })),
      historicalApprovedVsClaimed: { approved: totalApproved, claimed: totalClaimed },
    };

    const aiRecommendation = await this.aiService.evaluateQuotation(aiInput);
    const aiRecommendationHash = this.aiService.hashRecommendation(aiRecommendation);

    // 6. Determine initial state based on AI recommendation
    let initialState = 'AIEvaluated';

    // 7. Save to Supabase
    const { data: saved, error: dbError } = await this.supabase
      .from('quotations')
      .insert({
        campaign_id: campaignId,
        creator_address: creatorAddress.toLowerCase(),
        purpose: dto.purpose,
        vendor_name: dto.vendorName,
        vendor_contact: dto.vendorContact || null,
        requested_amount_ftu: dto.requestedAmountFtu,
        items: dto.items,
        quotation_document_url: documentUrl,
        quotation_hash: quotationHash,
        state: initialState,
        ai_recommendation: aiRecommendation,
        ai_recommendation_hash: aiRecommendationHash,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      this.logger.error(`Failed to save quotation: ${dbError.message}`);
      throw new BadRequestException('Failed to save quotation record');
    }

    this.logger.log(`Quotation #${saved.id} created for campaign ${campaignId} with AI: ${aiRecommendation.recommendation}`);

    return {
      quotation: saved,
      aiRecommendation,
      quotationHash,
    };
  }

  async findByCampaign(campaignId: number) {
    const { data, error } = await this.supabase
      .from('quotations')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('submitted_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async findOne(id: number) {
    const { data, error } = await this.supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Quotation ${id} not found`);
    return data;
  }

  async sanctionQuotation(id: number, sanctionedBy: string, allocatedAmountFtu: number, isAutomated: boolean) {
    const quotation = await this.findOne(id);

    const { data, error } = await this.supabase
      .from('quotations')
      .update({
        state: 'Claimable',
        allocated_amount_ftu: allocatedAmountFtu,
        sanctioned_by: sanctionedBy.toLowerCase(),
        is_automated_sanction: isAutomated,
        sanctioned_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`Quotation ${id} sanctioned for ₹${allocatedAmountFtu} FTU by ${sanctionedBy}`);
    return data;
  }

  async rejectQuotation(id: number, rejectedBy: string, reason: string) {
    const { data, error } = await this.supabase
      .from('quotations')
      .update({
        state: 'DonorRejected',
        rejected_by: rejectedBy.toLowerCase(),
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async recordClaim(id: number, claimAmountFtu: number, txHash: string) {
    const quotation = await this.findOne(id);
    const newClaimed = Number(quotation.claimed_amount_ftu || 0) + claimAmountFtu;

    const newState = newClaimed >= quotation.allocated_amount_ftu ? 'ProofPending' : 'Claimable';

    const { data, error } = await this.supabase
      .from('quotations')
      .update({
        state: newState,
        claimed_amount_ftu: newClaimed,
        claimed_at: new Date().toISOString(),
        claim_tx_hash: txHash,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Trigger score recompute
    await this.scoresService.recomputeAndSaveScore(quotation.creator_address);

    return data;
  }

  async submitProof(id: number, proofHash: string, proofDocumentUrl: string | null, file?: Express.Multer.File) {
    const quotation = await this.findOne(id);

    let finalProofHash = proofHash;
    let finalDocumentUrl = proofDocumentUrl;

    if (file && file.buffer) {
      finalProofHash = computeFileKeccak256(file.buffer);
      const storagePath = `proofs/${quotation.campaign_id}/${id}_${Date.now()}_${file.originalname}`;

      const { error: uploadError } = await this.supabase.storage
        .from(this.bucket)
        .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

      if (!uploadError) {
        const { data: urlData } = this.supabase.storage.from(this.bucket).getPublicUrl(storagePath);
        finalDocumentUrl = urlData?.publicUrl || null;
      }
    }

    // Determine proof timing (30 day window from claimed_at)
    let proofTiming = 'OnTime';
    if (quotation.claimed_at) {
      const deadline = new Date(quotation.claimed_at).getTime() + 30 * 24 * 60 * 60 * 1000;
      if (Date.now() > deadline) proofTiming = 'Late';
    }

    const { data, error } = await this.supabase
      .from('quotations')
      .update({
        state: 'ProofSubmitted',
        proof_hash: finalProofHash,
        proof_document_url: finalDocumentUrl,
        proof_timing: proofTiming,
        proof_submitted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Recompute score
    await this.scoresService.recomputeAndSaveScore(quotation.creator_address);

    return data;
  }
}
