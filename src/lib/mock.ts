import {
  CampaignState,
  QuotationState,
  ProofTiming,
  CampaignOnChain,
  CampaignMetadata,
  QuotationOnChain,
  QuotationMetadata,
  CreatorScore,
  LedgerEvent,
  AIRecommendation
} from "@/types";

export const MOCK_CAMPAIGNS_ONCHAIN: CampaignOnChain[] = [
  {
    id: 1,
    creator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    verifier: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    goalWei: "150000",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 30,
    totalDonatedWei: "155000",
    totalReleasedWei: "50000",
    metadataHash: "0x123",
    state: CampaignState.FundingClosed,
    requestCount: 2,
    activeRequestId: 0,
    totalSanctionedWei: "80000",
    totalAllocatedWei: "80000",
    totalClaimedWei: "50000",
    quotationCount: 2,
  },
  {
    id: 2,
    creator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    verifier: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    goalWei: "500000",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 15,
    totalDonatedWei: "250000",
    totalReleasedWei: "0",
    metadataHash: "0x456",
    state: CampaignState.Verified,
    requestCount: 0,
    activeRequestId: 0,
    totalSanctionedWei: "0",
    totalAllocatedWei: "0",
    totalClaimedWei: "0",
    quotationCount: 0,
  }
];

export const MOCK_CAMPAIGNS_METADATA: Record<number, CampaignMetadata> = {
  1: {
    onChainId: 1,
    title: "Build Rural STEM Lab & Robotics Center",
    tagline: "Empowering rural students with modern technology.",
    category: "Education",
    story: "We are building a state-of-the-art STEM lab for students in rural areas. This lab will include computers, robotics kits, and 3D printers.",
    location: "Bengaluru, India",
    coverImageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop",
    canonicalHash: "0x123",
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    fundingDeadline: new Date(Date.now() + 86400000 * 30).toISOString(),
    plannedBudget: [
      { category: "Equipment", amountFtu: 100000 },
      { category: "Operations", amountFtu: 50000 }
    ],
    creatorName: "Alice Creator",
  },
  2: {
    onChainId: 2,
    title: "Clean Drinking Water Initiative",
    tagline: "Providing safe and accessible drinking water to 5 villages.",
    category: "Health",
    story: "Installing water filtration systems and borewells to ensure 5 villages have year-round access to clean drinking water.",
    location: "Rajasthan, India",
    coverImageUrl: "https://images.unsplash.com/photo-1538300342682-ffa5ac83ce20?q=80&w=2000&auto=format&fit=crop",
    canonicalHash: "0x456",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    fundingDeadline: new Date(Date.now() + 86400000 * 15).toISOString(),
    plannedBudget: [
      { category: "Materials", amountFtu: 500000 }
    ],
    creatorName: "Bob Creator",
  }
};

export const MOCK_AI_RECOMMENDATION: AIRecommendation = {
  recommendation: "APPROVE",
  confidence: 94,
  riskLevel: "LOW",
  requestedAmount: 50000,
  suggestedSanctionAmount: 50000,
  campaignRelevance: "High. Equipment listed directly matches campaign objectives.",
  budgetImpact: "Within planned budget (33% of total goal).",
  priceAssessment: "Prices are consistent with current market rates for these electronics.",
  creatorReliabilityScore: "92/100 (Excellent)",
  proofHistory: "Creator has successfully provided proofs for 100% of past claims.",
  reasons: [
    "Vendor is verified and has a positive track record.",
    "Item prices match market averages.",
    "Creator has excellent reliability history."
  ],
  riskFlags: [],
  evaluatedAt: new Date().toISOString(),
};

export const MOCK_QUOTATIONS: QuotationMetadata[] = [
  {
    id: 1,
    campaignId: 1,
    creatorAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    purpose: "Purchase 20 laptops and 5 robotics kits",
    vendorName: "TechEdu Suppliers",
    vendorContact: "sales@techedu.in",
    requestedAmountFtu: 50000,
    items: [
      { description: "Student Laptops (Refurbished)", quantity: 20, unitPriceFtu: 2000, totalFtu: 40000 },
      { description: "Basic Robotics Kits", quantity: 5, unitPriceFtu: 2000, totalFtu: 10000 }
    ],
    quotationDocumentUrl: "https://example.com/quote1.pdf",
    quotationHash: "0xabc",
    onChainQuotationId: 1,
    state: QuotationState.Completed,
    aiRecommendation: MOCK_AI_RECOMMENDATION,
    allocatedAmountFtu: 50000,
    claimedAmountFtu: 50000,
    sanctionedBy: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    isAutomatedSanction: false,
    submittedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    sanctionedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    claimedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    proofDocumentUrl: "https://example.com/invoice1.pdf",
    proofHash: "0xdef",
    proofTiming: ProofTiming.OnTime,
    completedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 2,
    campaignId: 1,
    creatorAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    purpose: "Purchase 3D Printers and Filament",
    vendorName: "MakerSpace India",
    requestedAmountFtu: 30000,
    items: [
      { description: "3D Printers", quantity: 2, unitPriceFtu: 12000, totalFtu: 24000 },
      { description: "PLA Filament Rolls", quantity: 10, unitPriceFtu: 600, totalFtu: 6000 }
    ],
    quotationHash: "0xghi",
    onChainQuotationId: 2,
    state: QuotationState.AIEvaluated,
    aiRecommendation: { ...MOCK_AI_RECOMMENDATION, requestedAmount: 30000, suggestedSanctionAmount: 30000 },
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
];

export const MOCK_CREATOR_SCORE: CreatorScore = {
  creatorAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  currentScore: 92,
  proofCompletionPct: 100,
  onTimeProofPct: 100,
  budgetConsistencyPct: 98,
  unresolvedRequests: 0,
  completedCampaigns: 4,
  totalQuotations: 12,
  approvedQuotations: 11,
  totalClaimedFtu: 450000,
  lateProofs: 0,
  missingProofs: 0,
  lastUpdated: new Date().toISOString(),
};

export const MOCK_LEDGER_EVENTS: LedgerEvent[] = [
  {
    eventName: "CampaignCreated",
    transactionHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    blockNumber: 1001,
    timestamp: Date.now() - 86400000 * 10,
    args: { campaignId: 1, creator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", goal: 150000 }
  },
  {
    eventName: "Donated",
    transactionHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
    blockNumber: 1005,
    timestamp: Date.now() - 86400000 * 9,
    args: { campaignId: 1, donor: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", amount: 155000, totalDonated: 155000 }
  },
  {
    eventName: "QuotationRegistered",
    transactionHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    blockNumber: 1010,
    timestamp: Date.now() - 86400000 * 8,
    args: { campaignId: 1, quotationId: 1, requestedAmount: 50000 }
  },
  {
    eventName: "QuotationSanctioned",
    transactionHash: "0x4444444444444444444444444444444444444444444444444444444444444444",
    blockNumber: 1015,
    timestamp: Date.now() - 86400000 * 7,
    args: { campaignId: 1, quotationId: 1, allocatedAmount: 50000, sanctionedBy: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" }
  },
  {
    eventName: "AllocationClaimed",
    transactionHash: "0x5555555555555555555555555555555555555555555555555555555555555555",
    blockNumber: 1020,
    timestamp: Date.now() - 86400000 * 6,
    args: { campaignId: 1, quotationId: 1, claimedAmount: 50000 }
  },
  {
    eventName: "QuotationProofSubmitted",
    transactionHash: "0x6666666666666666666666666666666666666666666666666666666666666666",
    blockNumber: 1025,
    timestamp: Date.now() - 86400000 * 5,
    args: { campaignId: 1, quotationId: 1, proofHash: "0xdef", isLate: false }
  }
];
