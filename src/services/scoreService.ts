import { CreatorScore, ScoreHistoryEntry } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function getCreatorScore(address: string): Promise<{
  score: CreatorScore | null;
  onChain: any | null;
}> {
  try {
    const response = await fetch(`${API_URL}/scores/${address}`);
    if (!response.ok) return { score: null, onChain: null };
    const data = await response.json();
    return {
      score: data.supabase ? mapScore(data.supabase) : null,
      onChain: data.onChain || null,
    };
  } catch {
    return { score: null, onChain: null };
  }
}

export async function getScoreHistory(address: string): Promise<ScoreHistoryEntry[]> {
  try {
    const response = await fetch(`${API_URL}/scores/${address}/history`);
    if (!response.ok) return [];
    return (await response.json()) || [];
  } catch {
    return [];
  }
}

function mapScore(raw: any): CreatorScore {
  return {
    creatorAddress: raw.creator_address,
    currentScore: Number(raw.current_score || 70),
    proofCompletionPct: Number(raw.proof_completion_pct || 100),
    onTimeProofPct: Number(raw.on_time_proof_pct || 100),
    budgetConsistencyPct: Number(raw.budget_consistency_pct || 100),
    unresolvedRequests: Number(raw.unresolved_requests || 0),
    completedCampaigns: Number(raw.completed_campaigns || 0),
    totalQuotations: Number(raw.total_quotations || 0),
    approvedQuotations: Number(raw.approved_quotations || 0),
    totalClaimedFtu: Number(raw.total_claimed_ftu || 0),
    lateProofs: Number(raw.late_proofs || 0),
    missingProofs: Number(raw.missing_proofs || 0),
    lastUpdated: raw.last_updated || new Date().toISOString(),
  };
}
