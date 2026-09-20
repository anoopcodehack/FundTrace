// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FundTrace
 * @notice Transparent crowdfunding & fund ledger with milestone spending governance,
 *         quotation-based sanction flow, AI-assisted evaluation, Creator Reliability Score,
 *         and cryptographic proof of expenditure.
 * @dev FTU (FundTrace Unit) = display denomination. 1 FTU = 1 wei in the prototype
 *      accounting layer; all UI renders amounts as FTU (₹1 per FTU).
 */
contract FundTrace is ReentrancyGuard {

    // ==========================================
    // ENUMS
    // ==========================================

    enum CampaignState {
        PendingVerification,
        Verified,
        Rejected,
        FundingClosed,
        Failed
    }

    enum RequestState {
        Pending,
        Approved,
        Released,
        Closed
    }

    enum ProofTiming {
        None,
        OnTime,
        Late
    }

    enum QuotationState {
        Pending,
        AIEvaluated,
        DonorApproved,
        DonorRejected,
        Sanctioned,
        Claimable,
        Claimed,
        ProofPending,
        ProofSubmitted,
        Completed
    }

    // ==========================================
    // CONSTANTS
    // ==========================================

    uint256 public constant DORMANCY_TIMEOUT = 30 days;
    uint256 public constant MAX_SCORE = 100;

    // ==========================================
    // STRUCTS — EXISTING
    // ==========================================

    struct Request {
        uint256 id;
        address payable recipient;
        uint256 amount;
        bytes32 requestHash;
        uint256 votingDeadline;
        uint256 proofDeadline;
        uint256 approvalWeight;
        RequestState state;
        bytes32 receiptHash;
        bool proofSubmitted;
        uint256 releasedAt;
        uint256 proofSubmittedAt;
        ProofTiming timing;
        bool deliveryConfirmed;
        uint256 deliveryConfirmedAt;
    }

    struct Campaign {
        uint256 id;
        address payable creator;
        address verifier;
        uint256 goal;
        uint256 deadline;
        uint256 totalDonated;
        uint256 totalReleased;
        bytes32 metadataHash;
        CampaignState state;
        uint256 requestCount;
        uint256 activeRequestId;
        address beneficiary;
        uint256 lastActivityTimestamp;
        uint256 dormancySnapshotEscrow;
        // New financial tracking fields
        uint256 totalSanctioned;
        uint256 totalAllocated;
        uint256 totalClaimed;
        uint256 quotationCount;
    }

    // ==========================================
    // STRUCTS — NEW (QUOTATION / SANCTION / CLAIM)
    // ==========================================

    struct Quotation {
        uint256 id;
        uint256 campaignId;
        address creator;
        uint256 requestedAmount;      // In FTU (wei units for prototype)
        bytes32 quotationHash;        // Keccak-256 of quotation document stored in Supabase
        uint256 submittedAt;
        QuotationState state;
        uint256 allocatedAmount;      // Sanctioned/approved amount (may differ from requested)
        uint256 claimedAmount;        // Amount creator has actually claimed so far
        bytes32 aiRecommendationHash; // Hash of AI JSON recommendation from NestJS
        uint256 sanctionedAt;
        uint256 claimedAt;
        address sanctionedBy;         // Donor/auto who sanctioned
        bytes32 proofHash;            // Receipt hash after claim
        bool proofSubmitted;
        uint256 proofSubmittedAt;
        ProofTiming proofTiming;
    }

    // ==========================================
    // STRUCTS — CREATOR RELIABILITY SCORE
    // ==========================================

    struct CreatorProfile {
        uint256 score;                // 0–100
        uint256 totalQuotations;
        uint256 approvedQuotations;
        uint256 claimedAmount;
        uint256 proofSubmitted;
        uint256 onTimeProofs;
        uint256 lateProofs;
        uint256 missingProofs;
        uint256 unresolvedRequests;
        uint256 completedCampaigns;
        uint256 lastUpdated;
    }

    // ==========================================
    // STATE VARIABLES — EXISTING
    // ==========================================

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public donations;
    mapping(uint256 => mapping(uint256 => Request)) public requests;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasVoted;

    // ==========================================
    // STATE VARIABLES — NEW
    // ==========================================

    mapping(uint256 => mapping(uint256 => Quotation)) public quotations;
    mapping(address => CreatorProfile) public creatorProfiles;
    /**
     * @notice Per-donor, per-campaign automation preference.
     * @dev donorAutomation[campaignId][donorAddress] = true means the NestJS relay
     *      may auto-sanction quotations on behalf of this donor according to their
     *      configured policy (stored off-chain in Supabase donor_automation_settings).
     * @dev Replaces the previous global `automationEnabled[campaignId]` mapping.
     */
    mapping(uint256 => mapping(address => bool)) public donorAutomation;
    // Trusted relay address (NestJS backend signer) — used for automated sanctions.
    address public trustedRelayAddress; // Set at deploy time (NestJS signer)
    address public admin; // Deployer / system administrator

    // ==========================================
    // EVENTS — EXISTING
    // ==========================================

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        address indexed verifier,
        uint256 goal,
        uint256 deadline,
        bytes32 metadataHash
    );
    event CampaignVerified(uint256 indexed campaignId, address indexed verifier);
    event CampaignRejected(uint256 indexed campaignId, address indexed verifier, string reason);
    event Donated(uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 totalDonated);
    event FundingClosed(uint256 indexed campaignId, uint256 totalRaised);
    event CampaignFailed(uint256 indexed campaignId, uint256 totalDonated, uint256 goal);
    event RequestCreated(
        uint256 indexed campaignId,
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        bytes32 requestHash,
        uint256 votingDeadline,
        uint256 proofDeadline
    );
    event Approved(
        uint256 indexed campaignId,
        uint256 indexed requestId,
        address indexed donor,
        uint256 weight,
        uint256 currentApprovalWeight
    );
    event RequestApproved(uint256 indexed campaignId, uint256 indexed requestId, uint256 totalApprovalWeight);
    event Released(uint256 indexed campaignId, uint256 indexed requestId, address indexed recipient, uint256 amount);
    event RequestClosed(uint256 indexed campaignId, uint256 indexed requestId, string reason);
    event ProofSubmitted(
        uint256 indexed campaignId,
        uint256 indexed requestId,
        bytes32 receiptHash,
        bool isLate,
        uint256 submittedAt
    );
    event Refunded(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event BeneficiarySet(uint256 indexed campaignId, address indexed beneficiary);
    event DeliveryConfirmed(uint256 indexed campaignId, uint256 indexed requestId, address indexed beneficiary, uint256 timestamp);
    event DormancyRefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 remainingEscrow);

    // ==========================================
    // EVENTS — NEW
    // ==========================================

    event QuotationRegistered(
        uint256 indexed campaignId,
        uint256 indexed quotationId,
        address indexed creator,
        uint256 requestedAmount,
        bytes32 quotationHash,
        uint256 submittedAt
    );
    event QuotationAIEvaluated(
        uint256 indexed campaignId,
        uint256 indexed quotationId,
        bytes32 aiRecommendationHash
    );
    event QuotationSanctioned(
        uint256 indexed campaignId,
        uint256 indexed quotationId,
        address indexed sanctionedBy,
        uint256 allocatedAmount,
        bool isAutomated
    );
    event QuotationRejected(
        uint256 indexed campaignId,
        uint256 indexed quotationId,
        address indexed rejectedBy,
        string reason
    );
    event AllocationClaimed(
        uint256 indexed campaignId,
        uint256 indexed quotationId,
        address indexed creator,
        uint256 claimedAmount,
        uint256 remainingAllocation
    );
    event QuotationProofSubmitted(
        uint256 indexed campaignId,
        uint256 indexed quotationId,
        bytes32 proofHash,
        bool isLate,
        uint256 submittedAt
    );
    event CreatorScoreUpdated(
        address indexed creator,
        uint256 oldScore,
        uint256 newScore,
        string reason
    );
    event AutomationToggled(
        uint256 indexed campaignId,
        address indexed donor,
        bool enabled
    );

    // ==========================================
    // CUSTOM ERRORS — AUTOMATION
    // ==========================================

    error DonorAutomationNotEnabled();
    error NotADonor();

    // ==========================================
    // CUSTOM ERRORS — EXISTING
    // ==========================================

    error Unauthorized();
    error InvalidState();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error GoalAlreadyReached();
    error InvalidAmount();
    error InvalidAddress();
    error ActiveRequestExists();
    error OverdueProofPending();
    error BeneficiaryDeliveryPending();
    error RequestNotFound();
    error AlreadyVoted();
    error VotingClosed();
    error ThresholdNotMet();
    error AlreadyReleased();
    error ProofAlreadySubmitted();
    error TransferFailed();

    // ==========================================
    // CUSTOM ERRORS — NEW
    // ==========================================

    error QuotationNotFound();
    error InsufficientCampaignBalance();
    error ClaimExceedsAllocation();
    error AutomationNotEnabled();
    error ProofAlreadySubmittedForQuotation();

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    constructor(address _trustedRelay) {
        // trustedRelay = NestJS backend signer (for automated sanctions)
        // Can be zero if not using automated mode
        trustedRelayAddress = _trustedRelay;
        admin = msg.sender;
    }

    // ==========================================
    // 1. CAMPAIGN LIFECYCLE (EXISTING — PRESERVED)
    // ==========================================

    /**
     * @notice Creates a new campaign with a goal, deadline, and canonical metadata hash.
     * @param _goal Target amount in FTU units (wei for prototype).
     * @param _deadline Unix timestamp when funding ends.
     * @param _metadataHash Keccak-256 hash of canonical off-chain campaign metadata.
     * @param _verifier Third-party verifier institution address.
     */
    function createCampaign(
        uint256 _goal,
        uint256 _deadline,
        bytes32 _metadataHash,
        address _verifier
    ) external returns (uint256) {
        if (_goal == 0) revert InvalidAmount();
        if (_deadline <= block.timestamp) revert DeadlinePassed();
        if (_verifier == address(0) || _verifier == msg.sender) revert InvalidAddress();

        campaignCount++;
        Campaign storage c = campaigns[campaignCount];
        c.id = campaignCount;
        c.creator = payable(msg.sender);
        c.verifier = _verifier;
        c.goal = _goal;
        c.deadline = _deadline;
        c.metadataHash = _metadataHash;
        c.state = CampaignState.PendingVerification;
        c.lastActivityTimestamp = block.timestamp;

        emit CampaignCreated(campaignCount, msg.sender, _verifier, _goal, _deadline, _metadataHash);
        return campaignCount;
    }

    function verifyCampaign(uint256 _campaignId) external {
        Campaign storage c = campaigns[_campaignId];
        if (msg.sender != c.verifier && msg.sender != admin) revert Unauthorized();
        if (c.state != CampaignState.PendingVerification) revert InvalidState();

        c.state = CampaignState.Verified;
        c.lastActivityTimestamp = block.timestamp;
        emit CampaignVerified(_campaignId, msg.sender);
    }

    function rejectCampaign(uint256 _campaignId, string calldata _reason) external {
        Campaign storage c = campaigns[_campaignId];
        if (msg.sender != c.verifier && msg.sender != admin) revert Unauthorized();
        if (c.state != CampaignState.PendingVerification) revert InvalidState();

        c.state = CampaignState.Rejected;
        emit CampaignRejected(_campaignId, msg.sender, _reason);
    }

    function setBeneficiary(uint256 _campaignId, address _beneficiary) external {
        Campaign storage c = campaigns[_campaignId];
        if (msg.sender != c.creator && msg.sender != c.verifier) revert Unauthorized();
        if (_beneficiary == address(0)) revert InvalidAddress();

        c.beneficiary = _beneficiary;
        c.lastActivityTimestamp = block.timestamp;
        emit BeneficiarySet(_campaignId, _beneficiary);
    }

    // ==========================================
    // 2. DONATION & FUNDING (EXISTING — PRESERVED)
    // ==========================================

    function donate(uint256 _campaignId) external payable nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        if (c.state != CampaignState.Verified) revert InvalidState();
        if (block.timestamp > c.deadline) revert DeadlinePassed();
        if (msg.sender == c.creator) revert Unauthorized();
        if (msg.value == 0) revert InvalidAmount();

        donations[_campaignId][msg.sender] += msg.value;
        c.totalDonated += msg.value;
        c.lastActivityTimestamp = block.timestamp;

        emit Donated(_campaignId, msg.sender, msg.value, c.totalDonated);

        if (c.totalDonated >= c.goal) {
            c.state = CampaignState.FundingClosed;
            c.totalAllocated = c.totalDonated;
            emit FundingClosed(_campaignId, c.totalDonated);
        }
    }

    // ==========================================
    // 3. SPENDING & GOVERNANCE (EXISTING — PRESERVED)
    // ==========================================

    /**
     * @notice Creates a spending request for donor-vote governance.
     * @dev DEPRECATED — Superseded by the Quotation → AI Review → Donor Sanction →
     *      Allocation → Claim → Proof workflow. Use registerQuotation() instead.
     *      Kept for backwards-compatibility and audit trail; may be removed in a
     *      future major version.
     */
    function createRequest(
        uint256 _campaignId,
        address payable _recipient,
        uint256 _amount,
        bytes32 _requestHash,
        uint256 _votingDuration,
        uint256 _proofDuration
    ) external returns (uint256) {
        Campaign storage c = campaigns[_campaignId];
        if (msg.sender != c.creator) revert Unauthorized();
        if (c.state != CampaignState.FundingClosed) revert InvalidState();
        if (c.activeRequestId != 0) revert ActiveRequestExists();
        if (_recipient == address(0)) revert InvalidAddress();
        if (_amount == 0 || _amount > (c.totalDonated - c.totalReleased)) revert InvalidAmount();
        if (_votingDuration == 0 || _proofDuration == 0) revert InvalidAmount();

        if (hasOverdueProof(_campaignId)) revert OverdueProofPending();
        if (hasUnconfirmedDelivery(_campaignId)) revert BeneficiaryDeliveryPending();

        c.requestCount++;
        uint256 reqId = c.requestCount;
        c.activeRequestId = reqId;
        c.lastActivityTimestamp = block.timestamp;

        Request storage r = requests[_campaignId][reqId];
        r.id = reqId;
        r.recipient = _recipient;
        r.amount = _amount;
        r.requestHash = _requestHash;
        r.votingDeadline = block.timestamp + _votingDuration;
        r.proofDeadline = _proofDuration;
        r.state = RequestState.Pending;

        emit RequestCreated(
            _campaignId,
            reqId,
            _recipient,
            _amount,
            _requestHash,
            r.votingDeadline,
            block.timestamp + _votingDuration + _proofDuration
        );
        return reqId;
    }

    /**
     * @dev DEPRECATED — Part of the old createRequest/vote/release flow.
     *      Use sanctionQuotation() in the new quotation workflow instead.
     */
    function vote(uint256 _campaignId, uint256 _requestId) external {
        Campaign storage c = campaigns[_campaignId];
        Request storage r = requests[_campaignId][_requestId];

        if (msg.sender == c.creator) revert Unauthorized();
        if (r.state != RequestState.Pending) revert InvalidState();
        if (block.timestamp > r.votingDeadline) revert VotingClosed();
        if (hasVoted[_campaignId][_requestId][msg.sender]) revert AlreadyVoted();

        uint256 weight = donations[_campaignId][msg.sender];
        if (weight == 0) revert Unauthorized();

        hasVoted[_campaignId][_requestId][msg.sender] = true;
        r.approvalWeight += weight;
        c.lastActivityTimestamp = block.timestamp;

        emit Approved(_campaignId, _requestId, msg.sender, weight, r.approvalWeight);

        if (r.approvalWeight * 2 > c.totalDonated) {
            r.state = RequestState.Approved;
            emit RequestApproved(_campaignId, _requestId, r.approvalWeight);
        }
    }

    /**
     * @dev DEPRECATED — Part of the old createRequest/vote/release flow.
     *      Use sanctionQuotation() in the new quotation workflow instead.
     */
    function approveRequest(uint256 _campaignId, uint256 _requestId) external {
        Campaign storage c = campaigns[_campaignId];
        Request storage r = requests[_campaignId][_requestId];

        if (msg.sender == c.creator) revert Unauthorized();
        if (r.state != RequestState.Pending) revert InvalidState();
        if (block.timestamp > r.votingDeadline) revert VotingClosed();
        if (hasVoted[_campaignId][_requestId][msg.sender]) revert AlreadyVoted();

        uint256 weight = donations[_campaignId][msg.sender];
        if (weight == 0) revert Unauthorized();

        hasVoted[_campaignId][_requestId][msg.sender] = true;
        r.approvalWeight += weight;
        c.lastActivityTimestamp = block.timestamp;

        emit Approved(_campaignId, _requestId, msg.sender, weight, r.approvalWeight);

        if (r.approvalWeight * 2 > c.totalDonated) {
            r.state = RequestState.Approved;
            emit RequestApproved(_campaignId, _requestId, r.approvalWeight);
        }
    }

    /**
     * @dev DEPRECATED — Part of the old createRequest/vote/release flow.
     *      Use claimAllocation() in the new quotation workflow instead.
     */
    function release(uint256 _campaignId, uint256 _requestId) external nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        Request storage r = requests[_campaignId][_requestId];

        if (r.state != RequestState.Approved) revert ThresholdNotMet();

        r.state = RequestState.Released;
        r.releasedAt = block.timestamp;
        uint256 duration = r.proofDeadline;
        r.proofDeadline = block.timestamp + duration;
        c.totalReleased += r.amount;
        c.activeRequestId = 0;
        c.lastActivityTimestamp = block.timestamp;

        (bool sent, ) = r.recipient.call{value: r.amount}("");
        if (!sent) revert TransferFailed();

        emit Released(_campaignId, _requestId, r.recipient, r.amount);
    }

    function closeExpiredRequest(uint256 _campaignId, uint256 _requestId) external {
        Campaign storage c = campaigns[_campaignId];
        Request storage r = requests[_campaignId][_requestId];

        if (r.state != RequestState.Pending) revert InvalidState();
        if (block.timestamp <= r.votingDeadline) revert InvalidState();

        r.state = RequestState.Closed;
        if (c.activeRequestId == _requestId) {
            c.activeRequestId = 0;
        }

        emit RequestClosed(_campaignId, _requestId, "Voting deadline expired without approval");
    }

    // ==========================================
    // 4. PROOF & AUDIT TRAIL (EXISTING — PRESERVED)
    // ==========================================

    function submitProof(
        uint256 _campaignId,
        uint256 _requestId,
        bytes32 _receiptHash
    ) external {
        Campaign storage c = campaigns[_campaignId];
        Request storage r = requests[_campaignId][_requestId];

        if (msg.sender != c.creator) revert Unauthorized();
        if (r.state != RequestState.Released) revert InvalidState();
        if (r.proofSubmitted) revert ProofAlreadySubmitted();

        bool isLate = block.timestamp > r.proofDeadline;
        r.receiptHash = _receiptHash;
        r.proofSubmitted = true;
        r.proofSubmittedAt = block.timestamp;
        r.timing = isLate ? ProofTiming.Late : ProofTiming.OnTime;
        c.lastActivityTimestamp = block.timestamp;

        emit ProofSubmitted(_campaignId, _requestId, _receiptHash, isLate, block.timestamp);
    }

    function checkProofHash(
        uint256 _campaignId,
        uint256 _requestId,
        bytes32 _candidateHash
    ) external view returns (bool matches, bool isSubmitted, ProofTiming timing) {
        Request storage r = requests[_campaignId][_requestId];
        if (!r.proofSubmitted) {
            return (false, false, ProofTiming.None);
        }
        return (r.receiptHash == _candidateHash, true, r.timing);
    }

    function hasOverdueProof(uint256 _campaignId) public view returns (bool) {
        Campaign storage c = campaigns[_campaignId];
        for (uint256 i = 1; i <= c.requestCount; i++) {
            Request storage r = requests[_campaignId][i];
            if (r.state == RequestState.Released && !r.proofSubmitted) {
                if (block.timestamp > r.proofDeadline) {
                    return true;
                }
            }
        }
        return false;
    }

    function confirmDelivery(uint256 _campaignId, uint256 _requestId) external {
        Campaign storage c = campaigns[_campaignId];
        Request storage r = requests[_campaignId][_requestId];

        if (c.beneficiary != address(0)) {
            if (msg.sender != c.beneficiary && msg.sender != c.verifier) revert Unauthorized();
        } else {
            if (msg.sender != c.verifier) revert Unauthorized();
        }

        if (r.state != RequestState.Released) revert InvalidState();
        if (r.deliveryConfirmed) revert InvalidState();

        r.deliveryConfirmed = true;
        r.deliveryConfirmedAt = block.timestamp;
        c.lastActivityTimestamp = block.timestamp;

        emit DeliveryConfirmed(_campaignId, _requestId, msg.sender, block.timestamp);
    }

    function hasUnconfirmedDelivery(uint256 _campaignId) public view returns (bool) {
        Campaign storage c = campaigns[_campaignId];
        if (c.beneficiary == address(0)) return false;
        for (uint256 i = 1; i <= c.requestCount; i++) {
            Request storage r = requests[_campaignId][i];
            if (r.state == RequestState.Released && !r.deliveryConfirmed) {
                return true;
            }
        }
        return false;
    }

    // ==========================================
    // 5. FAILURE & REFUND (EXISTING — PRESERVED)
    // ==========================================

    function checkAndUpdateCampaignFailure(uint256 _campaignId) public returns (bool) {
        Campaign storage c = campaigns[_campaignId];
        if (c.state == CampaignState.Verified && block.timestamp > c.deadline && c.totalDonated < c.goal) {
            c.state = CampaignState.Failed;
            emit CampaignFailed(_campaignId, c.totalDonated, c.goal);
            return true;
        }
        return c.state == CampaignState.Failed;
    }

    function refund(uint256 _campaignId) external nonReentrant {
        bool isFailed = checkAndUpdateCampaignFailure(_campaignId);
        if (!isFailed) revert InvalidState();

        uint256 amount = donations[_campaignId][msg.sender];
        if (amount == 0) revert InvalidAmount();

        donations[_campaignId][msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        if (!sent) revert TransferFailed();

        emit Refunded(_campaignId, msg.sender, amount);
    }

    function isCampaignDormant(uint256 _campaignId) public view returns (bool) {
        Campaign storage c = campaigns[_campaignId];
        if (c.state != CampaignState.FundingClosed) return false;
        if (c.totalDonated <= c.totalReleased) return false;
        if (c.activeRequestId != 0) {
            Request storage r = requests[_campaignId][c.activeRequestId];
            if (r.state == RequestState.Pending && block.timestamp <= r.votingDeadline) {
                return false;
            }
        }
        return block.timestamp > (c.lastActivityTimestamp + DORMANCY_TIMEOUT);
    }

    function claimDormancyRefund(uint256 _campaignId) external nonReentrant {
        if (!isCampaignDormant(_campaignId)) revert InvalidState();
        Campaign storage c = campaigns[_campaignId];

        uint256 donorDonation = donations[_campaignId][msg.sender];
        if (donorDonation == 0) revert InvalidAmount();

        if (c.dormancySnapshotEscrow == 0) {
            c.dormancySnapshotEscrow = c.totalDonated - c.totalReleased;
        }

        uint256 refundAmount = (donorDonation * c.dormancySnapshotEscrow) / c.totalDonated;
        if (refundAmount == 0) revert InvalidAmount();

        donations[_campaignId][msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        if (!sent) revert TransferFailed();

        emit DormancyRefundClaimed(_campaignId, msg.sender, refundAmount, address(this).balance);
    }

    // ==========================================
    // 6. NEW: QUOTATION SYSTEM
    // ==========================================

    /**
     * @notice Creator registers a new quotation (spending request) with a document hash.
     * @dev quotationHash = Keccak-256 of the uploaded quotation document in Supabase.
     *      NestJS computes this hash and calls this function via the frontend signer.
     */
    function registerQuotation(
        uint256 _campaignId,
        uint256 _requestedAmount,
        bytes32 _quotationHash
    ) external returns (uint256) {
        Campaign storage c = campaigns[_campaignId];
        if (msg.sender != c.creator) revert Unauthorized();
        if (c.state != CampaignState.FundingClosed) revert InvalidState();
        if (_requestedAmount == 0) revert InvalidAmount();
        if (_quotationHash == bytes32(0)) revert InvalidAmount();

        uint256 remainingUnsanctioned = c.totalAllocated > c.totalSanctioned ? c.totalAllocated - c.totalSanctioned : 0;
        if (_requestedAmount > remainingUnsanctioned) revert InsufficientCampaignBalance();

        c.quotationCount++;
        uint256 qId = c.quotationCount;

        Quotation storage q = quotations[_campaignId][qId];
        q.id = qId;
        q.campaignId = _campaignId;
        q.creator = msg.sender;
        q.requestedAmount = _requestedAmount;
        q.quotationHash = _quotationHash;
        q.submittedAt = block.timestamp;
        q.state = QuotationState.Pending;

        // Update creator profile
        CreatorProfile storage profile = creatorProfiles[msg.sender];
        profile.totalQuotations++;
        if (profile.lastUpdated == 0) {
            profile.score = 70; // Default starting score
        }
        profile.lastUpdated = block.timestamp;

        c.lastActivityTimestamp = block.timestamp;

        emit QuotationRegistered(_campaignId, qId, msg.sender, _requestedAmount, _quotationHash, block.timestamp);
        return qId;
    }

    /**
     * @notice NestJS backend records AI recommendation hash on-chain.
     * @dev Only the trusted relay (NestJS signer) or the verifier can call this.
     */
    function recordAIRecommendation(
        uint256 _campaignId,
        uint256 _quotationId,
        bytes32 _aiRecommendationHash
    ) external {
        Campaign storage c = campaigns[_campaignId];
        Quotation storage q = quotations[_campaignId][_quotationId];

        if (msg.sender != trustedRelayAddress && msg.sender != c.verifier) revert Unauthorized();
        if (q.state != QuotationState.Pending) revert InvalidState();

        q.aiRecommendationHash = _aiRecommendationHash;
        q.state = QuotationState.AIEvaluated;

        emit QuotationAIEvaluated(_campaignId, _quotationId, _aiRecommendationHash);
    }

    /**
     * @notice A donor who contributed to this campaign sanctions a quotation.
     * @param _allocatedAmount The amount actually approved (may be <= requestedAmount).
     */
    /**
     * @notice Sanctions a quotation, locking the allocation for the creator to claim.
     * @param _campaignId The campaign ID.
     * @param _quotationId The quotation ID.
     * @param _allocatedAmount Amount approved (may be <= requestedAmount).
     * @param _isAutomated True if called by the NestJS trusted relay acting on a donor's
     *        configured automation policy. The relay must pass the donor address it is
     *        acting on behalf of in _onBehalfOfDonor.
     * @param _onBehalfOfDonor In automated mode: the donor whose policy triggered this
     *        sanction. Must have donorAutomation[campaignId][_onBehalfOfDonor] = true.
     *        In manual mode: pass address(0) (ignored).
     */
    function sanctionQuotation(
        uint256 _campaignId,
        uint256 _quotationId,
        uint256 _allocatedAmount,
        bool _isAutomated,
        address _onBehalfOfDonor
    ) external {
        Campaign storage c = campaigns[_campaignId];
        Quotation storage q = quotations[_campaignId][_quotationId];

        if (_isAutomated) {
            // Automated mode: must be the trusted relay acting on a donor who has enabled automation
            if (msg.sender != trustedRelayAddress) revert Unauthorized();
            if (_onBehalfOfDonor == address(0)) revert InvalidAddress();
            if (!donorAutomation[_campaignId][_onBehalfOfDonor]) revert DonorAutomationNotEnabled();
            uint256 donorWeight = donations[_campaignId][_onBehalfOfDonor];
            if (donorWeight == 0) revert NotADonor();
        } else {
            // Manual mode: caller must be a donor who has contributed
            uint256 donorWeight = donations[_campaignId][msg.sender];
            if (donorWeight == 0) revert Unauthorized();
        }

        if (q.state != QuotationState.AIEvaluated && q.state != QuotationState.Pending) revert InvalidState();
        if (_allocatedAmount == 0 || _allocatedAmount > q.requestedAmount) revert InvalidAmount();

        uint256 remainingUnsanctioned = c.totalAllocated > c.totalSanctioned ? c.totalAllocated - c.totalSanctioned : 0;
        if (_allocatedAmount > remainingUnsanctioned) revert InsufficientCampaignBalance();

        q.allocatedAmount = _allocatedAmount;
        q.state = QuotationState.Claimable;
        q.sanctionedAt = block.timestamp;
        // Record who actually signed: relay address in auto mode (donor identity stored off-chain)
        q.sanctionedBy = _isAutomated ? _onBehalfOfDonor : msg.sender;

        c.totalSanctioned += _allocatedAmount;
        c.lastActivityTimestamp = block.timestamp;

        // Update creator profile
        CreatorProfile storage profile = creatorProfiles[q.creator];
        profile.approvedQuotations++;
        profile.lastUpdated = block.timestamp;

        address sanctionedByAddress = _isAutomated ? _onBehalfOfDonor : msg.sender;
        emit QuotationSanctioned(_campaignId, _quotationId, sanctionedByAddress, _allocatedAmount, _isAutomated);
    }

    /**
     * @notice A donor rejects a quotation.
     */
    function rejectQuotation(
        uint256 _campaignId,
        uint256 _quotationId,
        string calldata _reason
    ) external {
        Campaign storage c = campaigns[_campaignId];
        Quotation storage q = quotations[_campaignId][_quotationId];

        uint256 donorWeight = donations[_campaignId][msg.sender];
        if (donorWeight == 0 && msg.sender != trustedRelayAddress) revert Unauthorized();
        if (q.state != QuotationState.AIEvaluated && q.state != QuotationState.Pending) revert InvalidState();

        q.state = QuotationState.DonorRejected;
        c.lastActivityTimestamp = block.timestamp;

        emit QuotationRejected(_campaignId, _quotationId, msg.sender, _reason);
    }

    // ==========================================
    // 7. NEW: ALLOCATION CLAIM FLOW
    // ==========================================

    /**
     * @notice Creator claims their sanctioned allocation (or a portion of it).
     * @dev Enforces: claimedAmount <= allocatedAmount <= remainingBalance
     *      Creator receives FTU (ETH in prototype) directly to their wallet.
     */
    function claimAllocation(
        uint256 _campaignId,
        uint256 _quotationId,
        uint256 _claimAmount
    ) external nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        Quotation storage q = quotations[_campaignId][_quotationId];

        if (msg.sender != c.creator) revert Unauthorized();
        if (q.state != QuotationState.Claimable) revert InvalidState();
        if (_claimAmount == 0) revert InvalidAmount();

        uint256 remainingAllocation = q.allocatedAmount - q.claimedAmount;
        if (_claimAmount > remainingAllocation) revert ClaimExceedsAllocation();

        uint256 remainingBalance = address(this).balance;
        if (_claimAmount > remainingBalance) revert InsufficientCampaignBalance();

        q.claimedAmount += _claimAmount;
        q.claimedAt = block.timestamp;
        c.totalClaimed += _claimAmount;
        c.lastActivityTimestamp = block.timestamp;

        // If fully claimed, move to ProofPending
        if (q.claimedAmount >= q.allocatedAmount) {
            q.state = QuotationState.ProofPending;
        }

        // Update creator profile stats
        CreatorProfile storage profile = creatorProfiles[msg.sender];
        profile.claimedAmount += _claimAmount;
        profile.unresolvedRequests++;
        profile.lastUpdated = block.timestamp;

        (bool sent, ) = c.creator.call{value: _claimAmount}("");
        if (!sent) revert TransferFailed();

        emit AllocationClaimed(
            _campaignId,
            _quotationId,
            msg.sender,
            _claimAmount,
            q.allocatedAmount - q.claimedAmount
        );
    }

    // ==========================================
    // 8. NEW: QUOTATION PROOF SUBMISSION
    // ==========================================

    /**
     * @notice Creator submits proof of expenditure for a claimed quotation.
     * @param _proofHash Keccak-256 of the uploaded invoice/receipt in Supabase.
     */
    function submitQuotationProof(
        uint256 _campaignId,
        uint256 _quotationId,
        bytes32 _proofHash
    ) external {
        Campaign storage c = campaigns[_campaignId];
        Quotation storage q = quotations[_campaignId][_quotationId];

        if (msg.sender != c.creator) revert Unauthorized();
        if (q.state != QuotationState.ProofPending) revert InvalidState();
        if (q.proofSubmitted) revert ProofAlreadySubmittedForQuotation();

        // Proof deadline: 30 days from last claim
        uint256 proofDeadline = q.claimedAt + 30 days;
        bool isLate = block.timestamp > proofDeadline;

        q.proofHash = _proofHash;
        q.proofSubmitted = true;
        q.proofSubmittedAt = block.timestamp;
        q.proofTiming = isLate ? ProofTiming.Late : ProofTiming.OnTime;
        q.state = QuotationState.ProofSubmitted;

        c.lastActivityTimestamp = block.timestamp;

        // Update creator profile
        CreatorProfile storage profile = creatorProfiles[msg.sender];
        profile.proofSubmitted++;
        if (isLate) {
            profile.lateProofs++;
        } else {
            profile.onTimeProofs++;
        }
        if (profile.unresolvedRequests > 0) {
            profile.unresolvedRequests--;
        }
        profile.lastUpdated = block.timestamp;

        emit QuotationProofSubmitted(_campaignId, _quotationId, _proofHash, isLate, block.timestamp);
    }

    // ==========================================
    // 9. NEW: CREATOR RELIABILITY SCORE
    // ==========================================

    /**
     * @notice NestJS backend (trusted relay or verifier) updates creator score after evaluation.
     * @dev Score is deterministic: computed off-chain, recorded on-chain for transparency.
     *      Formula: base 70 + proof_completion_bonus(15) + on_time_bonus(10) - penalties(25)
     */
    function updateCreatorScore(
        address _creator,
        uint256 _newScore,
        string calldata _reason
    ) external {
        if (msg.sender != trustedRelayAddress) revert Unauthorized();
        if (_newScore > MAX_SCORE) revert InvalidAmount();

        CreatorProfile storage profile = creatorProfiles[_creator];
        uint256 oldScore = profile.score;
        profile.score = _newScore;
        profile.lastUpdated = block.timestamp;

        emit CreatorScoreUpdated(_creator, oldScore, _newScore, _reason);
    }

    /**
     * @notice Mark a quotation as completed (verifier/relay confirms proof validity).
     */
    function completeQuotation(uint256 _campaignId, uint256 _quotationId) external {
        Campaign storage c = campaigns[_campaignId];
        Quotation storage q = quotations[_campaignId][_quotationId];

        if (msg.sender != trustedRelayAddress && msg.sender != c.verifier) revert Unauthorized();
        if (q.state != QuotationState.ProofSubmitted) revert InvalidState();

        q.state = QuotationState.Completed;

        // Update creator completed campaigns counter
        CreatorProfile storage profile = creatorProfiles[q.creator];
        profile.completedCampaigns++;
        profile.lastUpdated = block.timestamp;

        c.lastActivityTimestamp = block.timestamp;
    }

    // ==========================================
    // 10. NEW: AUTOMATION CONTROLS
    // ==========================================

    /**
     * @notice Donor enables automated AI-driven sanction for this donor on a campaign.
     * @dev Per-donor: only affects msg.sender's automation preference, not other donors.
     *      The NestJS backend (trusted relay) will read donorAutomation[campaignId][donor]
     *      before auto-sanctioning on behalf of this donor.
     */
    function enableAutomation(uint256 _campaignId) external {
        uint256 donorWeight = donations[_campaignId][msg.sender];
        if (donorWeight == 0) revert Unauthorized();

        donorAutomation[_campaignId][msg.sender] = true;
        emit AutomationToggled(_campaignId, msg.sender, true);
    }

    /**
     * @notice Donor disables automated sanction for this donor on a campaign.
     * @dev Per-donor: only affects msg.sender's automation preference.
     */
    function disableAutomation(uint256 _campaignId) external {
        uint256 donorWeight = donations[_campaignId][msg.sender];
        if (donorWeight == 0) revert Unauthorized();

        donorAutomation[_campaignId][msg.sender] = false;
        emit AutomationToggled(_campaignId, msg.sender, false);
    }

    /**
     * @notice Check if a specific donor has enabled automation for a campaign.
     */
    function isDonorAutomationEnabled(uint256 _campaignId, address _donor) external view returns (bool) {
        return donorAutomation[_campaignId][_donor];
    }

    // ==========================================
    // 11. VIEW HELPERS (EXISTING + NEW)
    // ==========================================

    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    function getRequest(uint256 _campaignId, uint256 _requestId) external view returns (Request memory) {
        return requests[_campaignId][_requestId];
    }

    function getQuotation(uint256 _campaignId, uint256 _quotationId) external view returns (Quotation memory) {
        return quotations[_campaignId][_quotationId];
    }

    function getCreatorProfile(address _creator) external view returns (CreatorProfile memory) {
        return creatorProfiles[_creator];
    }

    function getCampaignFinancials(uint256 _campaignId) external view returns (
        uint256 totalRaised,
        uint256 totalAllocated,
        uint256 totalSanctioned,
        uint256 totalClaimed,
        uint256 proofBackedAmount,
        uint256 remainingAllocation
    ) {
        Campaign storage c = campaigns[_campaignId];
        totalRaised = c.totalDonated;
        totalAllocated = c.state == CampaignState.FundingClosed ? c.totalDonated : c.totalAllocated;
        totalSanctioned = c.totalSanctioned;
        totalClaimed = c.totalClaimed;

        // Count proof-backed amount from quotations
        uint256 backed = 0;
        for (uint256 i = 1; i <= c.quotationCount; i++) {
            Quotation storage q = quotations[_campaignId][i];
            if (q.proofSubmitted) {
                backed += q.claimedAmount;
            }
        }
        proofBackedAmount = backed;
        remainingAllocation = totalAllocated > totalClaimed ? totalAllocated - totalClaimed : 0;
    }
}
