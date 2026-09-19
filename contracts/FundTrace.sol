// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FundTrace
 * @notice Transparent crowdfunding & fund ledger with milestone spending governance and cryptographic proof of expenditure.
 * @dev Problem Statement F4: Transparent Crowdfunding & Fund Ledger
 */
contract FundTrace is ReentrancyGuard {
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

    uint256 public constant DORMANCY_TIMEOUT = 30 days;

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
    }

    // --- State Variables ---
    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public donations;
    mapping(uint256 => mapping(uint256 => Request)) public requests;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasVoted;

    // --- Events (Public Ledger Source) ---
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

    // --- Custom Errors ---
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
    // 1. CAMPAIGN LIFECYCLE
    // ==========================================

    /**
     * @notice Creates a new campaign with a goal, deadline, and canonical metadata hash.
     * @param _goal Target amount in wei.
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

    /**
     * @notice Institutional verifier approves the campaign for public donation.
     */
    function verifyCampaign(uint256 _campaignId) external {
        Campaign storage c = campaigns[_campaignId];
        if (msg.sender != c.verifier) revert Unauthorized();
        if (c.state != CampaignState.PendingVerification) revert InvalidState();

        c.state = CampaignState.Verified;
        c.lastActivityTimestamp = block.timestamp;
        emit CampaignVerified(_campaignId, msg.sender);
    }

    /**
     * @notice Institutional verifier rejects the campaign.
     */
    function rejectCampaign(uint256 _campaignId, string calldata _reason) external {
        Campaign storage c = campaigns[_campaignId];
        if (msg.sender != c.verifier) revert Unauthorized();
        if (c.state != CampaignState.PendingVerification) revert InvalidState();

        c.state = CampaignState.Rejected;
        emit CampaignRejected(_campaignId, msg.sender, _reason);
    }

    /**
     * @notice Assigns or updates the physical beneficiary (e.g., school headmaster or hospital director).
     * @dev Callable by campaign creator or institutional verifier.
     */
    function setBeneficiary(uint256 _campaignId, address _beneficiary) external {
        Campaign storage c = campaigns[_campaignId];
        if (msg.sender != c.creator && msg.sender != c.verifier) revert Unauthorized();
        if (_beneficiary == address(0)) revert InvalidAddress();

        c.beneficiary = _beneficiary;
        c.lastActivityTimestamp = block.timestamp;
        emit BeneficiarySet(_campaignId, _beneficiary);
    }

    // ==========================================
    // 2. DONATION & FUNDING
    // ==========================================

    /**
     * @notice Donate to a verified campaign before the deadline.
     */
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
            emit FundingClosed(_campaignId, c.totalDonated);
        }
    }

    // ==========================================
    // 3. SPENDING & GOVERNANCE
    // ==========================================

    /**
     * @notice Creator creates a spending request.
     * @dev Creator cannot create if another request is active or if proof is overdue on a previous release.
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

        // Block if previous released request has an unsubmitted overdue proof
        if (hasOverdueProof(_campaignId)) revert OverdueProofPending();

        // Block if previous released request has unconfirmed beneficiary physical delivery
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
        // Proof deadline is relative to release time, but initialized as default duration window
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
     * @notice Contributor casts a contribution-weighted vote for a request.
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

        // Snapshot threshold: strictly > 50% of total raised
        if (r.approvalWeight * 2 > c.totalDonated) {
            r.state = RequestState.Approved;
            emit RequestApproved(_campaignId, _requestId, r.approvalWeight);
        }
    }

    /**
     * @notice Alias for vote() to match README interface approveRequest.
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
     * @notice Releases funds to the recipient once approved. Can be triggered by anyone.
     */
    function release(uint256 _campaignId, uint256 _requestId) external nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        Request storage r = requests[_campaignId][_requestId];

        if (r.state != RequestState.Approved) revert ThresholdNotMet();

        r.state = RequestState.Released;
        r.releasedAt = block.timestamp;
        // Proof window is fixed from release timestamp
        uint256 duration = r.proofDeadline;
        r.proofDeadline = block.timestamp + duration;
        c.totalReleased += r.amount;
        c.activeRequestId = 0; // Release active slot
        c.lastActivityTimestamp = block.timestamp;

        (bool sent, ) = r.recipient.call{value: r.amount}("");
        if (!sent) revert TransferFailed();

        emit Released(_campaignId, _requestId, r.recipient, r.amount);
    }

    /**
     * @notice Closes a request whose voting window expired without reaching the threshold.
     */
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
    // 4. PROOF & AUDIT TRAIL
    // ==========================================

    /**
     * @notice Creator records proof of expenditure (invoice/receipt hash).
     * @dev Checks if submission is ON TIME or LATE against proof deadline.
     */
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

    /**
     * @notice Verifies if an uploaded file's hash matches the on-chain recorded receipt hash.
     */
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

    /**
     * @notice Checks whether a campaign has any released request with an overdue unsubmitted proof.
     */
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

    /**
     * @notice Ground-truth beneficiary (e.g. school headmaster) or verifier confirms physical delivery of goods/services.
     * @dev Solves Phantom Delivery: creator cannot create subsequent requests until physical arrival is verified.
     */
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

    /**
     * @notice Checks whether a campaign has any released request awaiting beneficiary physical delivery attestation.
     */
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
    // 5. FAILURE & REFUND
    // ==========================================

    /**
     * @notice Evaluates campaign failure when deadline passes without reaching the goal.
     */
    function checkAndUpdateCampaignFailure(uint256 _campaignId) public returns (bool) {
        Campaign storage c = campaigns[_campaignId];
        if (c.state == CampaignState.Verified && block.timestamp > c.deadline && c.totalDonated < c.goal) {
            c.state = CampaignState.Failed;
            emit CampaignFailed(_campaignId, c.totalDonated, c.goal);
            return true;
        }
        return c.state == CampaignState.Failed;
    }

    /**
     * @notice Donors can pull their refund if campaign has failed.
     */
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

    /**
     * @notice Returns true if campaign has unspent funds and has been abandoned/silent for over DORMANCY_TIMEOUT (30 days).
     * @dev Solves the Abandoned Student Project problem where teams graduate and leave remaining escrow locked forever.
     */
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

    /**
     * @notice Contributors can pull back their proportional share of unspent escrow when a project is abandoned.
     */
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
    // 6. VIEW HELPERS
    // ==========================================

    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    function getRequest(uint256 _campaignId, uint256 _requestId) external view returns (Request memory) {
        return requests[_campaignId][_requestId];
    }
}
