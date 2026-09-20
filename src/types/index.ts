/**
 * ============================================================================
 * FUNDTRACE DATA ARCHITECTURE TYPE DEFINITIONS
 * ============================================================================
 *
 * CORE ARCHITECTURAL PRINCIPLE:
 * -----------------------------
 * 1. BLOCKCHAIN (The Financial Truth):
 *    - Strict ledger: balances, goals, donor addresses, amounts.
 *    - Voting governance: donor snapshot weights, request approvals, timestamps.
 *    - Release execution: immutable transfers directly to vendor recipients.
 *    - Cryptographic commitments: Keccak-256 hashes of metadata, quotes, and receipts.
 *    - Quotation sanction, allocation, claim — all enforced on-chain.
 *
 * 2. SUPABASE (The Presentation & Storage Layer):
 *    - PostgreSQL: campaign titles, detailed stories, categories, itemized breakdown.
 *    - Storage: quotation PDFs, invoice PDFs, cover images in 'receipts'/'quotations' buckets.
 *    - Tamper-evident link: Every Supabase document/record is bound to on-chain financial
 *      truth via deterministic Keccak-256 canonical hashing.
 *
 * 3. FTU (FundTrace Unit):
 *    - 1 FTU = ₹1 campaign value
 *    - Prototype uses 1 FTU = 1 wei on-chain for simplicity
 *    - UI renders all amounts in FTU (₹ symbol)
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. BLOCKCHAIN ENUMS (mirror Solidity)
// ─────────────────────────────────────────────────────────────────────────────

export enum CampaignState {
  PendingVerification = 0,
  Verified = 1,
  Rejected = 2,
  FundingClosed = 3,
  Failed = 4,
}

export enum RequestState {
  Pending = 0,
  Approved = 1,
  Released = 2,
  Closed = 3,
}

export enum ProofTiming {
  None = 0,
  OnTime = 1,
  Late = 2,
}

export enum QuotationState {
  Pending = 0,
  AIEvaluated = 1,
  DonorApproved = 2,
  DonorRejected = 3,
  Sanctioned = 4,
  Claimable = 5,
  Claimed = 6,
  ProofPending = 7,
  ProofSubmitted = 8,
  Completed = 9,
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BLOCKCHAIN STRUCTS (mirror Solidity)
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignOnChain {
  id: number;
  creator: string;
  verifier: string;
  goalWei: string;
  deadline: number;
  totalDonatedWei: string;
  totalReleasedWei: string;
  metadataHash: string;
  state: CampaignState;
  requestCount: number;
  activeRequestId: number;
  beneficiary?: string;
  lastActivityTimestamp?: number;
  dormancySnapshotEscrow?: string;
  // New financial tracking
  totalSanctionedWei: string;
  totalAllocatedWei: string;
  totalClaimedWei: string;
  quotationCount: number;
}

export interface SpendingRequestOnChain {
  id: number;
  campaignId: number;
  recipient: string;
  amountWei: string;
  requestHash: string;
  votingDeadline: number;
  proofDeadline: number;
  approvalWeightWei: string;
  state: RequestState;
  receiptHash: string;
  proofSubmitted: boolean;
  releasedAt: number;
  proofSubmittedAt: number;
  timing: ProofTiming;
  deliveryConfirmed?: boolean;
  deliveryConfirmedAt?: number;
}

export interface QuotationOnChain {
  id: number;
  campaignId: number;
  creator: string;
  requestedAmount: string; // FTU (wei)
  quotationHash: string;
  submittedAt: number;
  state: QuotationState;
  allocatedAmount: string;
  claimedAmount: string;
  aiRecommendationHash: string;
  sanctionedAt: number;
  claimedAt: number;
  sanctionedBy: string;
  proofHash: string;
  proofSubmitted: boolean;
  proofSubmittedAt: number;
  proofTiming: ProofTiming;
}

export interface CreatorProfileOnChain {
  score: number;
  totalQuotations: number;
  approvedQuotations: number;
  claimedAmount: string;
  proofSubmitted: number;
  onTimeProofs: number;
  lateProofs: number;
  missingProofs: number;
  unresolvedRequests: number;
  completedCampaigns: number;
  lastUpdated: number;
}

export interface CampaignFinancials {
  totalRaised: string;        // FTU
  totalAllocated: string;     // FTU
  totalSanctioned: string;    // FTU
  totalClaimed: string;       // FTU
  proofBackedAmount: string;  // FTU
  remainingAllocation: string; // FTU (Allocated - Claimed)
  remainingBalance?: string;   // Alias for backwards compatibility
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUDIT TRAIL EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface LedgerEvent {
  eventName:
    | "CampaignCreated"
    | "CampaignVerified"
    | "CampaignRejected"
    | "Donated"
    | "FundingClosed"
    | "RequestCreated"
    | "Approved"
    | "RequestApproved"
    | "Released"
    | "RequestClosed"
    | "ProofSubmitted"
    | "Refunded"
    | "BeneficiarySet"
    | "DeliveryConfirmed"
    | "DormancyRefundClaimed"
    | "QuotationRegistered"
    | "QuotationAIEvaluated"
    | "QuotationSanctioned"
    | "QuotationRejected"
    | "AllocationClaimed"
    | "QuotationProofSubmitted"
    | "CreatorScoreUpdated"
    | "AutomationToggled";
  transactionHash: string;
  blockNumber: number;
  timestamp?: number;
  args: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUPABASE LAYER (Presentation & Supporting Data)
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignMetadata {
  onChainId: number;
  title: string;
  tagline: string;
  category: "Education" | "Health" | "Environment" | "Community" | "Emergency";
  story: string;
  location: string;
  coverImageUrl: string;
  canonicalHash: string;
  createdAt: string;
  updatedAt: string;
  fundingDeadline?: string;
  plannedBudget: Array<{category: string; amountFtu: number;}>;
  creatorName: string;
}

export interface SpendingRequestMetadata {
  onChainCampaignId: number;
  onChainRequestId: number;
  title: string;
  description: string;
  vendorName: string;
  vendorWebsite?: string;
  itemBreakdown: Array<{
    item: string;
    quantity: number;
    unitPriceFtu: string;
    totalFtu: string;
  }>;
  quoteFileName: string;
  quoteFileHash: string;
  createdAt: string;
}

export interface ProofDocumentRecord {
  campaignId: number;
  requestId: number;
  documentType: "quote" | "invoice_original" | "invoice_tampered" | "receipt";
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileHash: string;
  fileContentBase64?: string;
  storagePath?: string;
  uploadedAt: string;
  isTamperedDemo?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. NEW: QUOTATION SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export interface AIRecommendation {
  recommendation: "APPROVE" | "REJECT" | "REVIEW";
  confidence: number; // 0–100
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  requestedAmount: number;
  suggestedSanctionAmount: number;
  campaignRelevance: string;
  budgetImpact: string;
  priceAssessment: string;
  creatorReliabilityScore: string;
  proofHistory: string;
  reasons: string[];
  riskFlags: string[];
  evaluatedAt: string;
}

export interface QuotationMetadata {
  id?: number;
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
  quotationDocumentUrl?: string;
  quotationHash: string;
  onChainQuotationId?: number;
  state: QuotationState;
  aiRecommendation?: AIRecommendation;
  allocatedAmountFtu?: number;
  claimedAmountFtu?: number;
  sanctionedBy?: string;
  isAutomatedSanction?: boolean;
  submittedAt: string;
  sanctionedAt?: string;
  claimedAt?: string;
  proofDocumentUrl?: string;
  proofHash?: string;
  proofTiming?: ProofTiming;
  completedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. NEW: CREATOR RELIABILITY SCORE
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatorScore {
  creatorAddress: string;
  currentScore: number;         // 0–100
  proofCompletionPct: number;   // % of quotations with proof submitted
  onTimeProofPct: number;       // % of proofs submitted on time
  budgetConsistencyPct: number; // % where claimed ≈ approved
  unresolvedRequests: number;
  completedCampaigns: number;
  totalQuotations: number;
  approvedQuotations: number;
  totalClaimedFtu: number;
  lateProofs: number;
  missingProofs: number;
  lastUpdated: string;
}

export interface ScoreHistoryEntry {
  id: number;
  creatorAddress: string;
  oldScore: number;
  newScore: number;
  reason: string;
  changedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. FTU UTILITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Convert wei bigint to FTU display string */
export function weiToFtu(wei: bigint | string): string {
  const n = typeof wei === "string" ? BigInt(wei) : wei;
  return n.toString(); // 1 wei = 1 FTU in prototype
}

/** Convert FTU number to wei bigint */
export function ftuToWei(ftu: number): bigint {
  return BigInt(Math.floor(ftu));
}

/** Format FTU with ₹ symbol */
export function formatFtu(ftu: number | string): string {
  const n = typeof ftu === "string" ? Number(ftu) : ftu;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. INTEGRITY VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegrityVerificationResult {
  target: "campaign_metadata" | "spending_quote" | "receipt_proof" | "quotation_document";
  onChainHash: string;
  computedHash: string;
  isMatch: boolean;
  status: "TAMPER_FREE" | "TAMPER_DETECTED" | "UNSUBMITTED";
  details: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. DONOR AUTOMATION SETTINGS (Per-donor, per-campaign)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-donor, per-campaign automation preference stored in Supabase.
 *
 * IMPORTANT: This is NOT global. Alice + Campaign A can be MANUAL while
 * Bob + Campaign A is AUTO. Each donor controls their own automation independently.
 *
 * The on-chain `donorAutomation[campaignId][donor]` mapping is the authoritative
 * source for the enabled flag; Supabase stores the additional policy fields that
 * cannot be stored on-chain cheaply.
 */
export interface DonorAutomationSetting {
  campaignId: number;
  donorAddress: string;
  /** Master switch: if false, donor always sees quotations for manual review */
  isEnabled: boolean;
  /** FTU ceiling: auto-sanction only if suggestedAmount <= this value */
  maxAutoAmount: number;
  /** If true, HIGH risk AI outputs always require manual donor review */
  requireManualHighRisk: boolean;
  /** If true, HIGH risk REJECT recommendations are automatically rejected */
  autoRejectFraud: boolean;
  updatedAt?: string;
}

/**
 * @deprecated Use DonorAutomationSetting instead.
 * This was the old global-per-campaign setting.
 */
export interface AutomationSettings {
  campaignId: number;
  isEnabled: boolean;
  enabledBy?: string;
  enabledAt?: string;
}
