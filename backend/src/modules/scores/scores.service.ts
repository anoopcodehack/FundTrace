import { Injectable, Logger, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/supabase.provider';
import { AiService } from '../ai/ai.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class ScoresService {
  private readonly logger = new Logger(ScoresService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly aiService: AiService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async getScore(creatorAddress: string) {
    const addr = creatorAddress.toLowerCase();

    // Fetch from Supabase
    const { data, error } = await this.supabase
      .from('creator_scores')
      .select('*')
      .eq('creator_address', addr)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error fetching score: ${error.message}`);
    }

    // Also fetch on-chain profile for authoritative score
    let onChainProfile = null;
    try {
      const contract = this.blockchainService.getContract();
      if (contract) {
        const p = await contract.getCreatorProfile(creatorAddress);
        onChainProfile = {
          score: Number(p.score),
          totalQuotations: Number(p.totalQuotations),
          approvedQuotations: Number(p.approvedQuotations),
          claimedAmount: p.claimedAmount.toString(),
          proofSubmitted: Number(p.proofSubmitted),
          onTimeProofs: Number(p.onTimeProofs),
          lateProofs: Number(p.lateProofs),
          missingProofs: Number(p.missingProofs),
          unresolvedRequests: Number(p.unresolvedRequests),
          completedCampaigns: Number(p.completedCampaigns),
          lastUpdated: Number(p.lastUpdated),
        };
      }
    } catch (err: any) {
      this.logger.warn(`Could not fetch on-chain profile: ${err.message}`);
    }

    return {
      supabase: data || null,
      onChain: onChainProfile,
    };
  }

  async getScoreHistory(creatorAddress: string) {
    const addr = creatorAddress.toLowerCase();
    const { data, error } = await this.supabase
      .from('score_history')
      .select('*')
      .eq('creator_address', addr)
      .order('changed_at', { ascending: false })
      .limit(50);

    if (error) {
      this.logger.error(`Error fetching score history: ${error.message}`);
      return [];
    }
    return data || [];
  }

  /**
   * Recomputes and stores the creator score. Called after proof/claim events.
   */
  async recomputeAndSaveScore(creatorAddress: string): Promise<number> {
    const addr = creatorAddress.toLowerCase();

    // Fetch all quotations for this creator from Supabase
    const { data: quotations } = await this.supabase
      .from('quotations')
      .select('*')
      .eq('creator_address', addr);

    const allQuotations = quotations || [];

    let onTimeProofs = 0, lateProofs = 0, missingProofs = 0;
    let totalApproved = 0, totalClaimed = 0;
    let unresolvedRequests = 0, completedCampaigns = 0;

    for (const q of allQuotations) {
      if (q.state === 'ProofSubmitted' || q.state === 'Completed') {
        if (q.proof_timing === 'OnTime') onTimeProofs++;
        else if (q.proof_timing === 'Late') lateProofs++;
        if (q.state === 'Completed') completedCampaigns++;
      } else if (q.state === 'ProofPending') {
        unresolvedRequests++;
        // Check if proof deadline has passed
        if (q.claimed_at) {
          const deadline = new Date(q.claimed_at).getTime() + 30 * 24 * 60 * 60 * 1000;
          if (Date.now() > deadline) missingProofs++;
        }
      }
      if (q.allocated_amount_ftu) totalApproved += Number(q.allocated_amount_ftu);
      if (q.claimed_amount_ftu) totalClaimed += Number(q.claimed_amount_ftu);
    }

    const historicalVariancePct = totalApproved > 0
      ? Math.abs(totalApproved - totalClaimed) / totalApproved
      : 0;

    const { score, breakdown } = this.aiService.computeCreatorScore({
      totalQuotations: allQuotations.length,
      approvedQuotations: allQuotations.filter(q => ['Sanctioned', 'Claimable', 'Claimed', 'ProofPending', 'ProofSubmitted', 'Completed'].includes(q.state)).length,
      onTimeProofs,
      lateProofs,
      missingProofs,
      unresolvedRequests,
      completedCampaigns,
      historicalVariancePct,
    });

    // Get current score for history
    const { data: existing } = await this.supabase
      .from('creator_scores')
      .select('current_score')
      .eq('creator_address', addr)
      .maybeSingle();

    const oldScore = existing?.current_score || 70;

    // Upsert score in Supabase
    const totalExpected = onTimeProofs + lateProofs + missingProofs;
    const proofCompletionPct = totalExpected > 0
      ? Math.round(((onTimeProofs + lateProofs) / totalExpected) * 100)
      : 100;
    const onTimePct = (onTimeProofs + lateProofs) > 0
      ? Math.round((onTimeProofs / (onTimeProofs + lateProofs)) * 100)
      : 100;
    const budgetConsistencyPct = 100 - Math.round(historicalVariancePct * 100);

    await this.supabase.from('creator_scores').upsert({
      creator_address: addr,
      current_score: score,
      proof_completion_pct: proofCompletionPct,
      on_time_proof_pct: onTimePct,
      budget_consistency_pct: budgetConsistencyPct,
      unresolved_requests: unresolvedRequests,
      completed_campaigns: completedCampaigns,
      total_quotations: allQuotations.length,
      approved_quotations: allQuotations.filter(q => ['Claimable', 'Claimed', 'ProofPending', 'ProofSubmitted', 'Completed'].includes(q.state)).length,
      total_claimed_ftu: totalClaimed,
      late_proofs: lateProofs,
      missing_proofs: missingProofs,
      score_breakdown: breakdown,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'creator_address' });

    // Log score history if changed
    if (Math.abs(score - oldScore) >= 1) {
      const reason = score > oldScore
        ? 'Score improved: proof submission activity'
        : 'Score decreased: penalties applied';

      await this.supabase.from('score_history').insert({
        creator_address: addr,
        old_score: oldScore,
        new_score: score,
        reason,
        changed_at: new Date().toISOString(),
      });
    }

    // Also attempt updating on-chain creator profile score
    try {
      const signedContract = this.blockchainService.getSignedContract();
      if (signedContract) {
        const tx = await signedContract.updateCreatorScore(
          addr,
          score,
          `Score recomputed: ${score}/100 (Proofs on-time: ${onTimeProofs})`
        );
        await tx.wait();
        this.logger.log(`On-chain score synced for ${addr}: ${score}`);
      }
    } catch (chainErr: any) {
      this.logger.warn(`Could not sync on-chain score: ${chainErr?.message || chainErr}`);
    }

    this.logger.log(`Score recomputed for ${addr}: ${oldScore} → ${score}`);
    return score;
  }
}
