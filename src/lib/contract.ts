import { ethers } from "ethers";
export { getRpcProvider, DEFAULT_CHAIN_ID } from "./blockchain";
import { getRpcProvider, DEFAULT_CHAIN_ID } from "./blockchain";

// Default address deployed on local Hardhat node
export const DEFAULT_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const FUNDTRACE_ABI = [
  // ── EVENTS (Existing) ──────────────────────────────────────────────────────
  "event CampaignCreated(uint256 indexed campaignId, address indexed creator, address indexed verifier, uint256 goal, uint256 deadline, bytes32 metadataHash)",
  "event CampaignVerified(uint256 indexed campaignId, address indexed verifier)",
  "event CampaignRejected(uint256 indexed campaignId, address indexed verifier, string reason)",
  "event Donated(uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 totalDonated)",
  "event FundingClosed(uint256 indexed campaignId, uint256 totalRaised)",
  "event CampaignFailed(uint256 indexed campaignId, uint256 totalDonated, uint256 goal)",
  "event RequestCreated(uint256 indexed campaignId, uint256 indexed requestId, address indexed recipient, uint256 amount, bytes32 requestHash, uint256 votingDeadline, uint256 proofDeadline)",
  "event Approved(uint256 indexed campaignId, uint256 indexed requestId, address indexed donor, uint256 weight, uint256 currentApprovalWeight)",
  "event RequestApproved(uint256 indexed campaignId, uint256 indexed requestId, uint256 totalApprovalWeight)",
  "event Released(uint256 indexed campaignId, uint256 indexed requestId, address indexed recipient, uint256 amount)",
  "event RequestClosed(uint256 indexed campaignId, uint256 indexed requestId, string reason)",
  "event ProofSubmitted(uint256 indexed campaignId, uint256 indexed requestId, bytes32 receiptHash, bool isLate, uint256 submittedAt)",
  "event Refunded(uint256 indexed campaignId, address indexed donor, uint256 amount)",
  "event BeneficiarySet(uint256 indexed campaignId, address indexed beneficiary)",
  "event DeliveryConfirmed(uint256 indexed campaignId, uint256 indexed requestId, address indexed beneficiary, uint256 timestamp)",
  "event DormancyRefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 remainingEscrow)",
  // ── EVENTS (New) ──────────────────────────────────────────────────────────
  "event QuotationRegistered(uint256 indexed campaignId, uint256 indexed quotationId, address indexed creator, uint256 requestedAmount, bytes32 quotationHash, uint256 submittedAt)",
  "event QuotationAIEvaluated(uint256 indexed campaignId, uint256 indexed quotationId, bytes32 aiRecommendationHash)",
  "event QuotationSanctioned(uint256 indexed campaignId, uint256 indexed quotationId, address indexed sanctionedBy, uint256 allocatedAmount, bool isAutomated)",
  "event QuotationRejected(uint256 indexed campaignId, uint256 indexed quotationId, address indexed rejectedBy, string reason)",
  "event AllocationClaimed(uint256 indexed campaignId, uint256 indexed quotationId, address indexed creator, uint256 claimedAmount, uint256 remainingAllocation)",
  "event QuotationProofSubmitted(uint256 indexed campaignId, uint256 indexed quotationId, bytes32 proofHash, bool isLate, uint256 submittedAt)",
  "event CreatorScoreUpdated(address indexed creator, uint256 oldScore, uint256 newScore, string reason)",
  "event AutomationToggled(uint256 indexed campaignId, address indexed donor, bool enabled)",

  // ── READ FUNCTIONS (Existing) ──────────────────────────────────────────────
  "function campaignCount() view returns (uint256)",
  "function campaigns(uint256) view returns (uint256 id, address creator, address verifier, uint256 goal, uint256 deadline, uint256 totalDonated, uint256 totalReleased, bytes32 metadataHash, uint8 state, uint256 requestCount, uint256 activeRequestId, address beneficiary, uint256 lastActivityTimestamp, uint256 dormancySnapshotEscrow, uint256 totalSanctioned, uint256 totalAllocated, uint256 totalClaimed, uint256 quotationCount)",
  "function getCampaign(uint256 _campaignId) view returns (tuple(uint256 id, address creator, address verifier, uint256 goal, uint256 deadline, uint256 totalDonated, uint256 totalReleased, bytes32 metadataHash, uint8 state, uint256 requestCount, uint256 activeRequestId, address beneficiary, uint256 lastActivityTimestamp, uint256 dormancySnapshotEscrow, uint256 totalSanctioned, uint256 totalAllocated, uint256 totalClaimed, uint256 quotationCount))",
  "function requests(uint256, uint256) view returns (uint256 id, address recipient, uint256 amount, bytes32 requestHash, uint256 votingDeadline, uint256 proofDeadline, uint256 approvalWeight, uint8 state, bytes32 receiptHash, bool proofSubmitted, uint256 releasedAt, uint256 proofSubmittedAt, uint8 timing, bool deliveryConfirmed, uint256 deliveryConfirmedAt)",
  "function getRequest(uint256 _campaignId, uint256 _requestId) view returns (tuple(uint256 id, address recipient, uint256 amount, bytes32 requestHash, uint256 votingDeadline, uint256 proofDeadline, uint256 approvalWeight, uint8 state, bytes32 receiptHash, bool proofSubmitted, uint256 releasedAt, uint256 proofSubmittedAt, uint8 timing, bool deliveryConfirmed, uint256 deliveryConfirmedAt))",
  "function donations(uint256, address) view returns (uint256)",
  "function hasVoted(uint256, uint256, address) view returns (bool)",
  "function checkProofHash(uint256 _campaignId, uint256 _requestId, bytes32 _candidateHash) view returns (bool matches, bool isSubmitted, uint8 timing)",
  "function hasOverdueProof(uint256 _campaignId) view returns (bool)",
  "function hasUnconfirmedDelivery(uint256 _campaignId) view returns (bool)",
  "function isCampaignDormant(uint256 _campaignId) view returns (bool)",
  "function DORMANCY_TIMEOUT() view returns (uint256)",
  // ── READ FUNCTIONS (New) ──────────────────────────────────────────────────
  "function getQuotation(uint256 _campaignId, uint256 _quotationId) view returns (tuple(uint256 id, uint256 campaignId, address creator, uint256 requestedAmount, bytes32 quotationHash, uint256 submittedAt, uint8 state, uint256 allocatedAmount, uint256 claimedAmount, bytes32 aiRecommendationHash, uint256 sanctionedAt, uint256 claimedAt, address sanctionedBy, bytes32 proofHash, bool proofSubmitted, uint256 proofSubmittedAt, uint8 proofTiming))",
  "function getCreatorProfile(address _creator) view returns (tuple(uint256 score, uint256 totalQuotations, uint256 approvedQuotations, uint256 claimedAmount, uint256 proofSubmitted, uint256 onTimeProofs, uint256 lateProofs, uint256 missingProofs, uint256 unresolvedRequests, uint256 completedCampaigns, uint256 lastUpdated))",
  "function getCampaignFinancials(uint256 _campaignId) view returns (uint256 totalRaised, uint256 totalAllocated, uint256 totalSanctioned, uint256 totalClaimed, uint256 proofBackedAmount, uint256 remainingAllocation)",
  "function donorAutomation(uint256, address) view returns (bool)",
  "function isDonorAutomationEnabled(uint256 _campaignId, address _donor) view returns (bool)",
  "function trustedRelayAddress() view returns (address)",
  "function admin() view returns (address)",

  // ── WRITE FUNCTIONS (Existing) ─────────────────────────────────────────────
  "function createCampaign(uint256 _goal, uint256 _deadline, bytes32 _metadataHash, address _verifier) returns (uint256)",
  "function verifyCampaign(uint256 _campaignId)",
  "function rejectCampaign(uint256 _campaignId, string _reason)",
  "function setBeneficiary(uint256 _campaignId, address _beneficiary)",
  "function donate(uint256 _campaignId) payable",
  "function createRequest(uint256 _campaignId, address _recipient, uint256 _amount, bytes32 _requestHash, uint256 _votingDuration, uint256 _proofDuration) returns (uint256)",
  "function vote(uint256 _campaignId, uint256 _requestId)",
  "function approveRequest(uint256 _campaignId, uint256 _requestId)",
  "function release(uint256 _campaignId, uint256 _requestId)",
  "function confirmDelivery(uint256 _campaignId, uint256 _requestId)",
  "function closeExpiredRequest(uint256 _campaignId, uint256 _requestId)",
  "function submitProof(uint256 _campaignId, uint256 _requestId, bytes32 _receiptHash)",
  "function refund(uint256 _campaignId)",
  "function claimDormancyRefund(uint256 _campaignId)",
  // ── WRITE FUNCTIONS (New) ─────────────────────────────────────────────────
  "function registerQuotation(uint256 _campaignId, uint256 _requestedAmount, bytes32 _quotationHash) returns (uint256)",
  "function recordAIRecommendation(uint256 _campaignId, uint256 _quotationId, bytes32 _aiRecommendationHash)",
  "function sanctionQuotation(uint256 _campaignId, uint256 _quotationId, uint256 _allocatedAmount, bool _isAutomated, address _onBehalfOfDonor)",
  "function rejectQuotation(uint256 _campaignId, uint256 _quotationId, string _reason)",
  "function claimAllocation(uint256 _campaignId, uint256 _quotationId, uint256 _claimAmount)",
  "function submitQuotationProof(uint256 _campaignId, uint256 _quotationId, bytes32 _proofHash)",
  "function updateCreatorScore(address _creator, uint256 _newScore, string _reason)",
  "function completeQuotation(uint256 _campaignId, uint256 _quotationId)",
  "function enableAutomation(uint256 _campaignId)",
  "function disableAutomation(uint256 _campaignId)",
];

/**
 * Returns the currently active contract address.
 */
export function getContractAddress(): string {
  try {
    // If in Node or build environment, attempt reading localhost.json
    if (typeof window === "undefined") {
      const fs = require("fs");
      const path = require("path");
      const deployFile = path.join(process.cwd(), "deployments", "localhost.json");
      if (fs.existsSync(deployFile)) {
        const data = JSON.parse(fs.readFileSync(deployFile, "utf8"));
        if (data?.address) return data.address;
      }
    }
  } catch {
    // Fall back to default
  }
  return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || DEFAULT_CONTRACT_ADDRESS;
}

/**
 * Creates an ethers.Contract instance connected to either a Signer or Provider.
 */
export function getFundTraceContract(
  signerOrProvider?: ethers.ContractRunner | null,
  address = getContractAddress()
): ethers.Contract {
  const runner = signerOrProvider || getRpcProvider(DEFAULT_CHAIN_ID);
  return new ethers.Contract(address, FUNDTRACE_ABI, runner);
}

export const SOLIDITY_CUSTOM_ERRORS: Record<string, string> = {
  "0xbaf3f0f7": "This campaign cannot accept donations because it is not in the 'Verified' state (e.g. pending verification or unanchored).",
  "0x82b42900": "The campaign creator cannot donate to their own campaign.",
  "0x70f65caa": "The campaign funding deadline has passed.",
  "0x2eb35430": "The campaign deadline has not passed yet.",
  "0x8cb8251e": "The funding goal for this campaign has already been reached.",
  "0x2c5211c6": "Invalid contribution amount (must be greater than 0).",
  "0xe6c4247b": "Invalid address provided.",
  "0xef9a91a6": "An active spending request already exists for this campaign.",
  "0x69a354c9": "Spending requests are locked because a proof of expenditure is overdue.",
  "0xe2d72c20": "Spending requests are locked pending beneficiary delivery confirmation.",
  "0x7c9a1cf9": "You have already voted on this spending request.",
  "0x66b6cb4a": "Voting on this spending request has closed.",
  "0x90b8ec18": "Blockchain ETH transfer failed.",
  "0xb931e8c9": "Quotation not found on blockchain.",
  "0x34332468": "Insufficient campaign balance for this allocation.",
  "0x12f02dca": "Claim exceeds approved allocation amount.",
  "0xd5a5a1af": "Donor automation is not enabled for this campaign.",
  "0x21ccfed7": "Caller is not a donor of this campaign.",
};

export function parseContractError(err: any): string {
  const data = err?.data || err?.error?.data || err?.info?.error?.data;
  if (typeof data === 'string') {
    const selector = data.slice(0, 10).toLowerCase();
    if (SOLIDITY_CUSTOM_ERRORS[selector]) {
      return SOLIDITY_CUSTOM_ERRORS[selector];
    }
  }
  const message = err?.message || '';
  for (const [selector, desc] of Object.entries(SOLIDITY_CUSTOM_ERRORS)) {
    if (message.toLowerCase().includes(selector.toLowerCase())) {
      return desc;
    }
  }
  return err?.reason || err?.shortMessage || err?.message || 'Transaction failed on blockchain';
}

/**
 * Verifies a campaign on-chain.
 * Uses the provided userSigner if authorized; otherwise uses local admin relay to verify.
 */
export async function executeVerifyCampaignOnChain(
  onChainId: number,
  userSigner?: ethers.Signer | null
): Promise<ethers.TransactionReceipt | null> {
  const contract = getFundTraceContract(userSigner);
  if (userSigner) {
    try {
      const tx = await contract.verifyCampaign(onChainId);
      return await tx.wait();
    } catch (err: any) {
      console.warn('Direct user verification call did not succeed, falling back to verifier relay:', err?.message || err);
    }
  }

  // Fallback to local admin / deployer key for hackathon demo execution
  const provider = getRpcProvider(DEFAULT_CHAIN_ID);
  const adminKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const adminWallet = new ethers.Wallet(adminKey, provider);
  const adminContract = getFundTraceContract(adminWallet);
  const tx = await adminContract.verifyCampaign(onChainId);
  return await tx.wait();
}

/**
 * Rejects a campaign on-chain.
 */
export async function executeRejectCampaignOnChain(
  onChainId: number,
  reason: string,
  userSigner?: ethers.Signer | null
): Promise<ethers.TransactionReceipt | null> {
  const contract = getFundTraceContract(userSigner);
  if (userSigner) {
    try {
      const tx = await contract.rejectCampaign(onChainId, reason);
      return await tx.wait();
    } catch (err: any) {
      console.warn('Direct user rejection call did not succeed, falling back to verifier relay:', err?.message || err);
    }
  }

  const provider = getRpcProvider(DEFAULT_CHAIN_ID);
  const adminKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const adminWallet = new ethers.Wallet(adminKey, provider);
  const adminContract = getFundTraceContract(adminWallet);
  const tx = await adminContract.rejectCampaign(onChainId, reason);
  return await tx.wait();
}

/**
 * Anchors an off-chain/database campaign to the blockchain and verifies it.
 */
export async function executeAnchorAndVerifyCampaign(
  camp: {
    id?: number;
    title: string;
    story: string;
    category: string;
    location: string;
    goalFtu: number;
    creatorAddress?: string;
  }
): Promise<number> {
  const provider = getRpcProvider(DEFAULT_CHAIN_ID);
  const adminKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const adminWallet = new ethers.Wallet(adminKey, provider);
  const adminContract = getFundTraceContract(adminWallet);

  const goalWei = BigInt(camp.goalFtu > 0 ? camp.goalFtu : 50000);
  const latestBlock = await provider.getBlock('latest').catch(() => null);
  const currentBlockTime = latestBlock?.timestamp || Math.floor(Date.now() / 1000);
  const deadline = currentBlockTime + 86400 * 30; // 30 days ahead from EVM block time

  const metaHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({
    title: camp.title,
    story: camp.story,
    category: camp.category,
    location: camp.location
  })));
  const verifier = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

  // Ensure campaign creator on-chain matches creatorAddress (or Hardhat Account 1)
  const targetCreator = camp.creatorAddress && ethers.isAddress(camp.creatorAddress)
    ? camp.creatorAddress
    : "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  let creatorSigner: ethers.Signer;
  if (targetCreator.toLowerCase() === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8".toLowerCase()) {
    creatorSigner = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
  } else {
    try {
      await provider.send("hardhat_impersonateAccount", [targetCreator]);
      await provider.send("hardhat_setBalance", [targetCreator, "0x1000000000000000000000"]);
      creatorSigner = await provider.getSigner(targetCreator);
    } catch {
      creatorSigner = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
    }
  }

  const creatorContract = getFundTraceContract(creatorSigner);
  const createTx = await creatorContract.createCampaign(goalWei, deadline, metaHash, verifier);
  const receipt = await createTx.wait();

  let newOnChainId = 0;
  if (receipt?.logs) {
    for (const log of receipt.logs) {
      try {
        const parsed = adminContract.interface.parseLog(log);
        if (parsed && parsed.name === 'CampaignCreated') {
          newOnChainId = Number(parsed.args[0]);
          break;
        }
      } catch {}
    }
  }

  if (newOnChainId === 0) {
    newOnChainId = Number(await adminContract.campaignCount());
  }

  if (newOnChainId > 0) {
    const vTx = await adminContract.verifyCampaign(newOnChainId);
    await vTx.wait();

    if (camp.id && newOnChainId > 0) {
      if (typeof window !== 'undefined') {
        try {
          const map = JSON.parse(localStorage.getItem('fundtrace_anchored_campaign_map') || '{}');
          map[camp.id.toString()] = newOnChainId;
          localStorage.setItem('fundtrace_anchored_campaign_map', JSON.stringify(map));

          const allotted = JSON.parse(localStorage.getItem('fundtrace_allotted_campaign_ids') || '[]');
          if (!allotted.includes(camp.id)) allotted.push(camp.id);
          if (!allotted.includes(newOnChainId)) allotted.push(newOnChainId);
          localStorage.setItem('fundtrace_allotted_campaign_ids', JSON.stringify(allotted));
        } catch {}
      }

      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/campaigns/${camp.id}/confirm`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-wallet-address': targetCreator
          },
          body: JSON.stringify({ 
            txHash: createTx.hash,
            onChainId: newOnChainId
          })
        });
      } catch (confirmErr) {
        console.warn('Could not notify backend of campaign confirmation:', confirmErr);
      }
    }
  }

  return newOnChainId;
}

export const ANCHORED_CAMPAIGNS_KEY = 'fundtrace_anchored_campaign_map';
export const ALLOTTED_CAMPAIGNS_KEY = 'fundtrace_allotted_campaign_ids';

export function getStoredAnchoredMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ANCHORED_CAMPAIGNS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredAnchoredId(dbId: number | string, onChainId: number) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredAnchoredMap();
    current[dbId.toString()] = onChainId;
    localStorage.setItem(ANCHORED_CAMPAIGNS_KEY, JSON.stringify(current));
  } catch {}
}

export function getStoredAllottedIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(ALLOTTED_CAMPAIGNS_KEY);
    return raw ? new Set(JSON.parse(raw).map((v: any) => Number(v))) : new Set();
  } catch {
    return new Set();
  }
}

export function saveStoredAllottedId(id: number | string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredAllottedIds();
    const numId = Number(id);
    if (!isNaN(numId)) current.add(numId);
    localStorage.setItem(ALLOTTED_CAMPAIGNS_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

export function isCampaignAllotted(id: number | string): boolean {
  const allotted = getStoredAllottedIds();
  const numId = Number(id);
  if (!isNaN(numId) && allotted.has(numId)) return true;
  const map = getStoredAnchoredMap();
  if (map[id.toString()] && allotted.has(map[id.toString()])) return true;
  return false;
}


