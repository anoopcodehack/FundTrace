// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FundTrace
 * @dev Transparent funding and verifiable spending platform with contributor-approved releases.
 */
contract FundTrace is ReentrancyGuard {
    enum CampaignState { Pending, Verified, Rejected, FundingClosed, Failed }
    enum RequestState { Pending, Approved, Released, Closed }

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
    }

    // Storage
    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public donations; // campaignId => donor => amount
    mapping(uint256 => mapping(uint256 => Request)) public requests; // campaignId => requestId => Request
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasVoted; // campaignId => requestId => donor => voted

    // Events
    event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 goal, uint256 deadline, bytes32 metadataHash);
    event CampaignVerified(uint256 indexed campaignId, address indexed verifier);
    event CampaignRejected(uint256 indexed campaignId, address indexed verifier, string reason);
    event Donated(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event FundingClosed(uint256 indexed campaignId, uint256 totalRaised);
    event RequestCreated(uint256 indexed campaignId, uint256 indexed requestId, address recipient, uint256 amount, bytes32 requestHash);
    event Approved(uint256 indexed campaignId, uint256 indexed requestId, address indexed donor, uint256 weight);
    event RequestApproved(uint256 indexed campaignId, uint256 indexed requestId, uint256 totalApprovalWeight);
    event Released(uint256 indexed campaignId, uint256 indexed requestId, address recipient, uint256 amount);
    event RequestClosed(uint256 indexed campaignId, uint256 indexed requestId, string reason);
    event ProofSubmitted(uint256 indexed campaignId, uint256 indexed requestId, bytes32 receiptHash);
    event Refunded(uint256 indexed campaignId, address indexed donor, uint256 amount);

    // Custom errors
    error Unauthorized();
    error InvalidState();
    error DeadlinePassed();
    error GoalAlreadyReached();
    error InvalidAmount();
    error ActiveRequestExists();
    error RequestNotFound();
    error AlreadyVoted();
    error VotingClosed();
    error ThresholdNotMet();
    error AlreadyReleased();

    function createCampaign(uint256 _goal, uint256 _deadline, bytes32 _metadataHash, address _verifier) external returns (uint256) {
        require(_goal > 0, "Goal must be > 0");
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(_verifier != msg.sender, "Creator cannot verify");

        campaignCount++;
        Campaign storage c = campaigns[campaignCount];
        c.id = campaignCount;
        c.creator = payable(msg.sender);
        c.verifier = _verifier;
        c.goal = _goal;
        c.deadline = _deadline;
        c.metadataHash = _metadataHash;
        c.state = CampaignState.Pending;

        emit CampaignCreated(campaignCount, msg.sender, _goal, _deadline, _metadataHash);
        return campaignCount;
    }

    function verifyCampaign(uint256 _campaignId) external {
        Campaign storage c = campaigns[_campaignId];
        if (msg.sender != c.verifier) revert Unauthorized();
        if (c.state != CampaignState.Pending) revert InvalidState();

        c.state = CampaignState.Verified;
        emit CampaignVerified(_campaignId, msg.sender);
    }

    function rejectCampaign(uint256 _campaignId, string calldata _reason) external {
        Campaign storage c = campaigns[_campaignId];
        if (msg.sender != c.verifier) revert Unauthorized();
        if (c.state != CampaignState.Pending) revert InvalidState();

        c.state = CampaignState.Rejected;
        emit CampaignRejected(_campaignId, msg.sender, _reason);
    }

    function donate(uint256 _campaignId) external payable nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        if (c.state != CampaignState.Verified) revert InvalidState();
        if (block.timestamp > c.deadline) revert DeadlinePassed();
        if (msg.sender == c.creator) revert Unauthorized();
        if (msg.value == 0) revert InvalidAmount();

        donations[_campaignId][msg.sender] += msg.value;
        c.totalDonated += msg.value;

        emit Donated(_campaignId, msg.sender, msg.value);

        if (c.totalDonated >= c.goal) {
            c.state = CampaignState.FundingClosed;
            emit FundingClosed(_campaignId, c.totalDonated);
        }
    }

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
        if (_amount > (c.totalDonated - c.totalReleased)) revert InvalidAmount();

        c.requestCount++;
        uint256 reqId = c.requestCount;
        c.activeRequestId = reqId;

        Request storage r = requests[_campaignId][reqId];
        r.id = reqId;
        r.recipient = _recipient;
        r.amount = _amount;
        r.requestHash = _requestHash;
        r.votingDeadline = block.timestamp + _votingDuration;
        r.proofDeadline = block.timestamp + _votingDuration + _proofDuration;
        r.state = RequestState.Pending;

        emit RequestCreated(_campaignId, reqId, _recipient, _amount, _requestHash);
        return reqId;
    }

    function approveRequest(uint256 _campaignId, uint256 _requestId) external {
        Campaign storage c = campaigns[_campaignId];
        Request storage r = requests[_campaignId][_requestId];

        if (msg.sender == c.creator) revert Unauthorized();
        if (r.state != RequestState.Pending) revert InvalidState();
        if (block.timestamp > r.votingDeadline) revert VotingClosed();
        if (hasVoted[_campaignId][_requestId][msg.sender]) revert AlreadyVoted();

        uint256 donorWeight = donations[_campaignId][msg.sender];
        if (donorWeight == 0) revert Unauthorized();

        hasVoted[_campaignId][_requestId][msg.sender] = true;
        r.approvalWeight += donorWeight;

        emit Approved(_campaignId, _requestId, msg.sender, donorWeight);

        // Check > 50% threshold of total raised
        if (r.approvalWeight * 2 > c.totalDonated) {
            r.state = RequestState.Approved;
            emit RequestApproved(_campaignId, _requestId, r.approvalWeight);
        }
    }

    function release(uint256 _campaignId, uint256 _requestId) external nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        Request storage r = requests[_campaignId][_requestId];

        if (r.state != RequestState.Approved) revert ThresholdNotMet();

        r.state = RequestState.Released;
        c.totalReleased += r.amount;
        c.activeRequestId = 0; // Release active request slot

        (bool sent, ) = r.recipient.call{value: r.amount}("");
        require(sent, "Transfer failed");

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

        emit RequestClosed(_campaignId, _requestId, "Voting deadline expired");
    }

    function submitProof(uint256 _campaignId, uint256 _requestId, bytes32 _receiptHash) external {
        Campaign storage c = campaigns[_campaignId];
        Request storage r = requests[_campaignId][_requestId];

        if (msg.sender != c.creator) revert Unauthorized();
        if (r.state != RequestState.Released) revert InvalidState();

        r.receiptHash = _receiptHash;
        r.proofSubmitted = true;

        emit ProofSubmitted(_campaignId, _requestId, _receiptHash);
    }

    function refund(uint256 _campaignId) external nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        if (c.state != CampaignState.Failed && !(c.state == CampaignState.Verified && block.timestamp > c.deadline && c.totalDonated < c.goal)) {
            revert InvalidState();
        }

        uint256 donatedAmt = donations[_campaignId][msg.sender];
        if (donatedAmt == 0) revert InvalidAmount();

        donations[_campaignId][msg.sender] = 0;
        (bool sent, ) = payable(msg.sender).call{value: donatedAmt}("");
        require(sent, "Refund failed");

        emit Refunded(_campaignId, msg.sender, donatedAmt);
    }
}
