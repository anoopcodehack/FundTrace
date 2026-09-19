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
 * 
 * 2. MONGODB (The Presentation & Supporting Layer):
 *    - Rich storytelling: campaign titles, detailed stories, categories, updates.
 *    - Visual media: cover images, photos of progress.
 *    - Documents: original quote PDFs, invoice PDFs, supplier specs.
 *    - Tamper-evident link: Every MongoDB document is bound to on-chain financial
 *      truth via deterministic Keccak-256 canonical hashing.
 * ============================================================================
 */

// --- 1. BLOCKCHAIN (FINANCIAL TRUTH) ---

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
}

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
    | "Refunded";
  transactionHash: string;
  blockNumber: number;
  timestamp?: number;
  args: Record<string, any>;
}

// --- 2. MONGODB (PRESENTATION & SUPPORTING DATA) ---

export interface CampaignMetadata {
  onChainId: number;
  title: string;
  tagline: string;
  category: "Education" | "Health" | "Environment" | "Community" | "Emergency";
  story: string;
  location: string;
  coverImageUrl: string;
  canonicalHash: string; // Keccak-256 hash committed to blockchain
  createdAt: string;
  updatedAt: string;
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
    unitPriceEth: string;
    totalEth: string;
  }>;
  quoteFileName: string;
  quoteFileHash: string; // Matches on-chain requestHash
  createdAt: string;
}

export interface ProofDocumentRecord {
  campaignId: number;
  requestId: number;
  documentType: "quote" | "invoice_original" | "invoice_tampered" | "receipt";
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileHash: string; // Keccak-256 of the raw file buffer
  fileContentBase64?: string; // Stored file content
  uploadedAt: string;
  isTamperedDemo?: boolean;
}

// --- 3. INTEGRITY VERIFICATION RESULT ---

export interface IntegrityVerificationResult {
  target: "campaign_metadata" | "spending_quote" | "receipt_proof";
  onChainHash: string;
  computedHash: string;
  isMatch: boolean;
  status: "TAMPER_FREE" | "TAMPER_DETECTED" | "UNSUBMITTED";
  details: string;
}
