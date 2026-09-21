import { QuotationMetadata, AIRecommendation, QuotationState } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface CreateQuotationPayload {
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
  file?: File;
}

export async function createQuotation(payload: CreateQuotationPayload): Promise<{
  quotation: QuotationMetadata;
  aiRecommendation: AIRecommendation;
  quotationHash: string;
}> {
  const formData = new FormData();
  formData.append('campaignId', payload.campaignId.toString());
  formData.append('creatorAddress', payload.creatorAddress);
  formData.append('purpose', payload.purpose);
  formData.append('vendorName', payload.vendorName);
  if (payload.vendorContact) formData.append('vendorContact', payload.vendorContact);
  formData.append('requestedAmountFtu', payload.requestedAmountFtu.toString());
  formData.append('items', JSON.stringify(payload.items));
  if (payload.file) formData.append('file', payload.file);

  const response = await fetch(`${API_URL}/quotations`, {
    method: 'POST',
    headers: {
      'x-wallet-address': payload.creatorAddress,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to create quotation' }));
    throw new Error(err.message || 'Failed to create quotation');
  }

  const result = await response.json();
  return {
    quotation: mapQuotation(result.quotation),
    aiRecommendation: result.aiRecommendation,
    quotationHash: result.quotationHash,
  };
}

export async function getQuotationsByCampaign(campaignId: number): Promise<QuotationMetadata[]> {
  const response = await fetch(`${API_URL}/quotations/campaign/${campaignId}`);
  if (!response.ok) return [];
  const data = await response.json();
  return (data || []).map(mapQuotation);
}

export async function getQuotation(id: number): Promise<QuotationMetadata | null> {
  const response = await fetch(`${API_URL}/quotations/${id}`);
  if (!response.ok) return null;
  return mapQuotation(await response.json());
}

export async function sanctionQuotation(
  id: number,
  sanctionedBy: string,
  allocatedAmountFtu: number,
  isAutomated = false
): Promise<QuotationMetadata> {
  const response = await fetch(`${API_URL}/quotations/${id}/sanction`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': sanctionedBy,
    },
    body: JSON.stringify({ sanctionedBy, allocatedAmountFtu, isAutomated }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to sanction quotation');
  }
  return mapQuotation(await response.json());
}

export async function rejectQuotation(
  id: number,
  rejectedBy: string,
  reason: string
): Promise<QuotationMetadata> {
  const response = await fetch(`${API_URL}/quotations/${id}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': rejectedBy,
    },
    body: JSON.stringify({ rejectedBy, reason }),
  });
  if (!response.ok) throw new Error('Failed to reject quotation');
  return mapQuotation(await response.json());
}

export async function reviewQuotation(
  id: number,
  reviewedBy: string,
  reason: string
): Promise<QuotationMetadata> {
  const response = await fetch(`${API_URL}/quotations/${id}/review`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': reviewedBy,
    },
    body: JSON.stringify({ reviewedBy, reason }),
  });
  if (!response.ok) throw new Error('Failed to mark quotation for review');
  return mapQuotation(await response.json());
}

export async function updateQuotationOnChainId(
  id: number,
  onChainQuotationId: number
): Promise<QuotationMetadata | null> {
  try {
    const response = await fetch(`${API_URL}/quotations/${id}/onchain-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onChainQuotationId }),
    });
    if (!response.ok) return null;
    return mapQuotation(await response.json());
  } catch (e) {
    console.warn('Could not update quotation on-chain ID:', e);
    return null;
  }
}

export async function recordClaim(
  id: number,
  claimAmountFtu: number,
  txHash: string,
  creatorAddress?: string
): Promise<QuotationMetadata> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (creatorAddress) {
    headers['x-wallet-address'] = creatorAddress;
  }
  const response = await fetch(`${API_URL}/quotations/${id}/claim`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ claimAmountFtu, txHash }),
  });
  if (!response.ok) throw new Error('Failed to record claim');
  return mapQuotation(await response.json());
}

export async function submitQuotationProof(
  id: number,
  proofData: { proofHash?: string; proofDocumentUrl?: string; file?: File; creatorAddress?: string }
): Promise<QuotationMetadata> {
  const formData = new FormData();
  if (proofData.proofHash) formData.append('proofHash', proofData.proofHash);
  if (proofData.proofDocumentUrl) formData.append('proofDocumentUrl', proofData.proofDocumentUrl);
  if (proofData.file) formData.append('file', proofData.file);

  const headers: Record<string, string> = {};
  if (proofData.creatorAddress) {
    headers['x-wallet-address'] = proofData.creatorAddress;
  }

  const response = await fetch(`${API_URL}/quotations/${id}/proof`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit proof');
  }
  return mapQuotation(await response.json());
}

const QUOTATION_STATE_MAP: Record<string, QuotationState> = {
  'Pending': QuotationState.Pending,
  'AIEvaluated': QuotationState.AIEvaluated,
  'DonorApproved': QuotationState.DonorApproved,
  'DonorRejected': QuotationState.DonorRejected,
  'Sanctioned': QuotationState.Sanctioned,
  'Claimable': QuotationState.Claimable,
  'Claimed': QuotationState.Claimed,
  'ProofPending': QuotationState.ProofPending,
  'ProofSubmitted': QuotationState.ProofSubmitted,
  'Completed': QuotationState.Completed,
};

function parseQuotationState(val: any): QuotationState {
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && QUOTATION_STATE_MAP[val] !== undefined) {
    return QUOTATION_STATE_MAP[val];
  }
  return QuotationState.Pending;
}

function mapQuotation(raw: any): QuotationMetadata {
  return {
    id: raw.id,
    campaignId: raw.campaign_id,
    creatorAddress: raw.creator_address,
    purpose: raw.purpose,
    vendorName: raw.vendor_name,
    vendorContact: raw.vendor_contact,
    requestedAmountFtu: Number(raw.requested_amount_ftu || 0),
    items: raw.items || [],
    quotationDocumentUrl: raw.quotation_document_url,
    quotationHash: raw.quotation_hash,
    onChainQuotationId: raw.on_chain_quotation_id,
    state: parseQuotationState(raw.state),
    aiRecommendation: raw.ai_recommendation,
    allocatedAmountFtu: raw.allocated_amount_ftu ? Number(raw.allocated_amount_ftu) : undefined,
    claimedAmountFtu: raw.claimed_amount_ftu ? Number(raw.claimed_amount_ftu) : undefined,
    sanctionedBy: raw.sanctioned_by,
    isAutomatedSanction: raw.is_automated_sanction,
    submittedAt: raw.submitted_at,
    sanctionedAt: raw.sanctioned_at,
    claimedAt: raw.claimed_at,
    proofDocumentUrl: raw.proof_document_url,
    proofHash: raw.proof_hash,
    proofTiming: raw.proof_timing,
    completedAt: raw.completed_at,
  };
}
