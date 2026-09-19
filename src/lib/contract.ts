import { ethers } from "ethers";
import { getRpcProvider, DEFAULT_CHAIN_ID } from "./blockchain";

// Default address deployed on local Hardhat node
export const DEFAULT_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const FUNDTRACE_ABI = [
  // Events
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

  // Read Functions
  "function campaignCount() view returns (uint256)",
  "function campaigns(uint256) view returns (uint256 id, address creator, address verifier, uint256 goal, uint256 deadline, uint256 totalDonated, uint256 totalReleased, bytes32 metadataHash, uint8 state, uint256 requestCount, uint256 activeRequestId)",
  "function getCampaign(uint256 _campaignId) view returns (tuple(uint256 id, address creator, address verifier, uint256 goal, uint256 deadline, uint256 totalDonated, uint256 totalReleased, bytes32 metadataHash, uint8 state, uint256 requestCount, uint256 activeRequestId))",
  "function requests(uint256, uint256) view returns (uint256 id, address recipient, uint256 amount, bytes32 requestHash, uint256 votingDeadline, uint256 proofDeadline, uint256 approvalWeight, uint8 state, bytes32 receiptHash, bool proofSubmitted, uint256 releasedAt, uint256 proofSubmittedAt, uint8 timing)",
  "function getRequest(uint256 _campaignId, uint256 _requestId) view returns (tuple(uint256 id, address recipient, uint256 amount, bytes32 requestHash, uint256 votingDeadline, uint256 proofDeadline, uint256 approvalWeight, uint8 state, bytes32 receiptHash, bool proofSubmitted, uint256 releasedAt, uint256 proofSubmittedAt, uint8 timing))",
  "function donations(uint256, address) view returns (uint256)",
  "function hasVoted(uint256, uint256, address) view returns (bool)",
  "function checkProofHash(uint256 _campaignId, uint256 _requestId, bytes32 _candidateHash) view returns (bool matches, bool isSubmitted, uint8 timing)",
  "function hasOverdueProof(uint256 _campaignId) view returns (bool)",

  // Write Functions
  "function createCampaign(uint256 _goal, uint256 _deadline, bytes32 _metadataHash, address _verifier) returns (uint256)",
  "function verifyCampaign(uint256 _campaignId)",
  "function rejectCampaign(uint256 _campaignId, string _reason)",
  "function donate(uint256 _campaignId) payable",
  "function createRequest(uint256 _campaignId, address _recipient, uint256 _amount, bytes32 _requestHash, uint256 _votingDuration, uint256 _proofDuration) returns (uint256)",
  "function vote(uint256 _campaignId, uint256 _requestId)",
  "function approveRequest(uint256 _campaignId, uint256 _requestId)",
  "function release(uint256 _campaignId, uint256 _requestId)",
  "function closeExpiredRequest(uint256 _campaignId, uint256 _requestId)",
  "function submitProof(uint256 _campaignId, uint256 _requestId, bytes32 _receiptHash)",
  "function refund(uint256 _campaignId)",
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
