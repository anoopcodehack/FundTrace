import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FundTrace } from "../typechain-types";

describe("FundTrace Complete Rule Verification (30+ Tests)", function () {
  async function deployFixture() {
    const [deployer, creator, verifier, donor1, donor2, donor3, recipient, relay, beneficiary, other] = await ethers.getSigners();

    const FundTraceFactory = await ethers.getContractFactory("FundTrace");
    // relay = trusted NestJS backend signer for automated sanctions
    const fundTrace = (await FundTraceFactory.deploy(relay.address)) as unknown as FundTrace;
    await fundTrace.waitForDeployment();

    return { fundTrace, deployer, creator, verifier, donor1, donor2, donor3, recipient, relay, beneficiary, other };
  }

  // Helper to create and verify a campaign
  async function setupVerifiedCampaign() {
    const fixture = await deployFixture();
    const { fundTrace, creator, verifier } = fixture;
    const goal = ethers.parseEther("3.0");
    const deadline = (await time.latest()) + 86400; // 1 day
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("stem-lab-meta"));

    await fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address);
    await fundTrace.connect(verifier).verifyCampaign(1);
    return { ...fixture, goal, deadline, metadataHash };
  }

  // Helper to fund a campaign to completion
  async function setupFundedCampaign() {
    const fixture = await setupVerifiedCampaign();
    const { fundTrace, donor1, donor2, donor3 } = fixture;

    // Donor 1: 1.5 ETH (46.875%), Donor 2: 1.0 ETH (31.25%), Donor 3: 0.7 ETH (21.875%)
    // Total: 3.2 ETH >= 3.0 ETH goal -> FundingClosed
    await fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("1.5") });
    await fundTrace.connect(donor2).donate(1, { value: ethers.parseEther("1.0") });
    await fundTrace.connect(donor3).donate(1, { value: ethers.parseEther("0.7") });

    return fixture;
  }

  // ==========================================
  // 1. CAMPAIGN CREATION & VERIFICATION RULES
  // ==========================================
  describe("Campaign Creation & Verification Rules", function () {
    it("1. should create a campaign with correct properties in PendingVerification state", async function () {
      const { fundTrace, creator, verifier } = await deployFixture();
      const goal = ethers.parseEther("3.0");
      const deadline = (await time.latest()) + 86400;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("canonical-metadata"));

      await expect(fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address))
        .to.emit(fundTrace, "CampaignCreated")
        .withArgs(1, creator.address, verifier.address, goal, deadline, metadataHash);

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.verifier).to.equal(verifier.address);
      expect(campaign.goal).to.equal(goal);
      expect(campaign.deadline).to.equal(deadline);
      expect(campaign.metadataHash).to.equal(metadataHash);
      expect(campaign.state).to.equal(0); // PendingVerification
    });

    it("2. should reject campaign creation with 0 goal", async function () {
      const { fundTrace, creator, verifier } = await deployFixture();
      const deadline = (await time.latest()) + 86400;
      await expect(
        fundTrace.connect(creator).createCampaign(0, deadline, ethers.ZeroHash, verifier.address)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
    });

    it("3. should reject campaign creation with past or current deadline", async function () {
      const { fundTrace, creator, verifier } = await deployFixture();
      const pastDeadline = (await time.latest()) - 10;
      await expect(
        fundTrace.connect(creator).createCampaign(ethers.parseEther("1.0"), pastDeadline, ethers.ZeroHash, verifier.address)
      ).to.be.revertedWithCustomError(fundTrace, "DeadlinePassed");
    });

    it("4. should reject campaign creation with zero address verifier", async function () {
      const { fundTrace, creator } = await deployFixture();
      const deadline = (await time.latest()) + 86400;
      await expect(
        fundTrace.connect(creator).createCampaign(ethers.parseEther("1.0"), deadline, ethers.ZeroHash, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidAddress");
    });

    it("5. should reject creator attempting to be their own verifier", async function () {
      const { fundTrace, creator } = await deployFixture();
      const deadline = (await time.latest()) + 86400;
      await expect(
        fundTrace.connect(creator).createCampaign(ethers.parseEther("1.0"), deadline, ethers.ZeroHash, creator.address)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidAddress");
    });

    it("6. should allow designated verifier to verify campaign", async function () {
      const { fundTrace, creator, verifier } = await deployFixture();
      const deadline = (await time.latest()) + 86400;
      await fundTrace.connect(creator).createCampaign(ethers.parseEther("1.0"), deadline, ethers.ZeroHash, verifier.address);

      await expect(fundTrace.connect(verifier).verifyCampaign(1))
        .to.emit(fundTrace, "CampaignVerified")
        .withArgs(1, verifier.address);

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.state).to.equal(1); // Verified
    });

    it("7. should revert if non-verifier attempts to verify campaign", async function () {
      const { fundTrace, creator, verifier, other } = await deployFixture();
      const deadline = (await time.latest()) + 86400;
      await fundTrace.connect(creator).createCampaign(ethers.parseEther("1.0"), deadline, ethers.ZeroHash, verifier.address);

      await expect(fundTrace.connect(other).verifyCampaign(1)).to.be.revertedWithCustomError(fundTrace, "Unauthorized");
    });

    it("8. should allow designated verifier to reject campaign with reason", async function () {
      const { fundTrace, creator, verifier } = await deployFixture();
      const deadline = (await time.latest()) + 86400;
      await fundTrace.connect(creator).createCampaign(ethers.parseEther("1.0"), deadline, ethers.ZeroHash, verifier.address);

      await expect(fundTrace.connect(verifier).rejectCampaign(1, "Incomplete documentation"))
        .to.emit(fundTrace, "CampaignRejected")
        .withArgs(1, verifier.address, "Incomplete documentation");

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.state).to.equal(2); // Rejected
    });

    it("9. should revert if non-verifier attempts to reject campaign", async function () {
      const { fundTrace, creator, verifier, other } = await deployFixture();
      const deadline = (await time.latest()) + 86400;
      await fundTrace.connect(creator).createCampaign(ethers.parseEther("1.0"), deadline, ethers.ZeroHash, verifier.address);

      await expect(fundTrace.connect(other).rejectCampaign(1, "reason")).to.be.revertedWithCustomError(fundTrace, "Unauthorized");
    });

    it("10. should prevent verifying or rejecting already verified/rejected campaign", async function () {
      const { fundTrace, creator, verifier } = await deployFixture();
      const deadline = (await time.latest()) + 86400;
      await fundTrace.connect(creator).createCampaign(ethers.parseEther("1.0"), deadline, ethers.ZeroHash, verifier.address);
      await fundTrace.connect(verifier).verifyCampaign(1);

      await expect(fundTrace.connect(verifier).verifyCampaign(1)).to.be.revertedWithCustomError(fundTrace, "InvalidState");
      await expect(fundTrace.connect(verifier).rejectCampaign(1, "re-reject")).to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });
  });

  // ==========================================
  // 2. DONATION & FUNDING RULES
  // ==========================================
  describe("Donation & Funding Rules", function () {
    it("11. ✓ unverified campaign cannot receive funds", async function () {
      const { fundTrace, creator, verifier, donor1 } = await deployFixture();
      const deadline = (await time.latest()) + 86400;
      await fundTrace.connect(creator).createCampaign(ethers.parseEther("1.0"), deadline, ethers.ZeroHash, verifier.address);

      await expect(
        fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });

    it("12. rejected campaign cannot receive funds", async function () {
      const { fundTrace, creator, verifier, donor1 } = await deployFixture();
      const deadline = (await time.latest()) + 86400;
      await fundTrace.connect(creator).createCampaign(ethers.parseEther("1.0"), deadline, ethers.ZeroHash, verifier.address);
      await fundTrace.connect(verifier).rejectCampaign(1, "Fraudulent");

      await expect(
        fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });

    it("13. ✓ creator cannot donate to their own campaign", async function () {
      const { fundTrace, creator } = await setupVerifiedCampaign();
      await expect(
        fundTrace.connect(creator).donate(1, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWithCustomError(fundTrace, "Unauthorized");
    });

    it("14. donation reverts with 0 value", async function () {
      const { fundTrace, donor1 } = await setupVerifiedCampaign();
      await expect(
        fundTrace.connect(donor1).donate(1, { value: 0 })
      ).to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
    });

    it("15. cannot donate after campaign deadline has passed", async function () {
      const { fundTrace, donor1, deadline } = await setupVerifiedCampaign();
      await time.increaseTo(deadline + 1);

      await expect(
        fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWithCustomError(fundTrace, "DeadlinePassed");
    });

    it("16. multiple donations from different donors correctly update totals and balances", async function () {
      const { fundTrace, donor1, donor2 } = await setupVerifiedCampaign();
      await fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("1.0") });
      await fundTrace.connect(donor2).donate(1, { value: ethers.parseEther("1.2") });

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.totalDonated).to.equal(ethers.parseEther("2.2"));
      expect(await fundTrace.donations(1, donor1.address)).to.equal(ethers.parseEther("1.0"));
      expect(await fundTrace.donations(1, donor2.address)).to.equal(ethers.parseEther("1.2"));
    });

    it("17. ✓ donation closes funding when goal reached", async function () {
      const { fundTrace, donor1, donor2 } = await setupVerifiedCampaign();
      await fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("1.5") });

      await expect(fundTrace.connect(donor2).donate(1, { value: ethers.parseEther("1.5") }))
        .to.emit(fundTrace, "FundingClosed")
        .withArgs(1, ethers.parseEther("3.0"));

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.state).to.equal(3); // FundingClosed
    });

    it("18. ✓ cannot donate after funding closes", async function () {
      const { fundTrace, donor1 } = await setupFundedCampaign();
      await expect(
        fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });
  });

  // ==========================================
  // 3. SPENDING REQUEST RULES
  // ==========================================
  describe("Spending Request Creation Rules", function () {
    it("19. ✓ cannot create request before funding closes", async function () {
      const { fundTrace, creator, recipient } = await setupVerifiedCampaign();
      await expect(
        fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("0.5"), ethers.ZeroHash, 600, 3600)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });

    it("20. non-creator cannot create request", async function () {
      const { fundTrace, other, recipient } = await setupFundedCampaign();
      await expect(
        fundTrace.connect(other).createRequest(1, recipient.address, ethers.parseEther("0.5"), ethers.ZeroHash, 600, 3600)
      ).to.be.revertedWithCustomError(fundTrace, "Unauthorized");
    });

    it("21. ✓ non-zero recipient required", async function () {
      const { fundTrace, creator } = await setupFundedCampaign();
      await expect(
        fundTrace.connect(creator).createRequest(1, ethers.ZeroAddress, ethers.parseEther("0.5"), ethers.ZeroHash, 600, 3600)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidAddress");
    });

    it("22. request amount cannot be zero", async function () {
      const { fundTrace, creator, recipient } = await setupFundedCampaign();
      await expect(
        fundTrace.connect(creator).createRequest(1, recipient.address, 0, ethers.ZeroHash, 600, 3600)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
    });

    it("23. voting duration and proof duration cannot be zero", async function () {
      const { fundTrace, creator, recipient } = await setupFundedCampaign();
      await expect(
        fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("0.5"), ethers.ZeroHash, 0, 3600)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
      await expect(
        fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("0.5"), ethers.ZeroHash, 600, 0)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
    });

    it("24. request amount cannot exceed available balance", async function () {
      const { fundTrace, creator, recipient } = await setupFundedCampaign();
      // Total donated was 3.2 ETH
      await expect(
        fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("3.20001"), ethers.ZeroHash, 600, 3600)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
    });

    it("25. only one active request can exist at a time", async function () {
      const { fundTrace, creator, recipient } = await setupFundedCampaign();
      await fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("1.0"), ethers.ZeroHash, 600, 3600);

      await expect(
        fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("0.5"), ethers.ZeroHash, 600, 3600)
      ).to.be.revertedWithCustomError(fundTrace, "ActiveRequestExists");
    });
  });

  // ==========================================
  // 4. CONTRIBUTOR VOTING RULES
  // ==========================================
  describe("Contributor Voting Rules", function () {
    async function setupRequestCreated() {
      const fixture = await setupFundedCampaign();
      const { fundTrace, creator, recipient } = fixture;
      const requestHash = ethers.keccak256(ethers.toUtf8Bytes("quote-01"));
      await fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("1.2"), requestHash, 600, 3600);
      return { ...fixture, requestHash };
    }

    it("26. ✓ creator cannot vote", async function () {
      const { fundTrace, creator } = await setupRequestCreated();
      await expect(fundTrace.connect(creator).vote(1, 1)).to.be.revertedWithCustomError(fundTrace, "Unauthorized");
    });

    it("27. non-contributor cannot vote", async function () {
      const { fundTrace, other } = await setupRequestCreated();
      await expect(fundTrace.connect(other).vote(1, 1)).to.be.revertedWithCustomError(fundTrace, "Unauthorized");
    });

    it("28. ✓ contributor can vote once (no double voting)", async function () {
      const { fundTrace, donor1 } = await setupRequestCreated();
      await fundTrace.connect(donor1).vote(1, 1);

      await expect(fundTrace.connect(donor1).vote(1, 1)).to.be.revertedWithCustomError(fundTrace, "AlreadyVoted");
    });

    it("29. ✓ vote only before deadline", async function () {
      const { fundTrace, donor1 } = await setupRequestCreated();
      await time.increase(601); // voting duration is 600s

      await expect(fundTrace.connect(donor1).vote(1, 1)).to.be.revertedWithCustomError(fundTrace, "VotingClosed");
    });

    it("30. voting weight correctly corresponds to contributor donation amount", async function () {
      const { fundTrace, donor1 } = await setupRequestCreated();
      // Donor 1 donated 1.5 ETH
      await expect(fundTrace.connect(donor1).vote(1, 1))
        .to.emit(fundTrace, "Approved")
        .withArgs(1, 1, donor1.address, ethers.parseEther("1.5"), ethers.parseEther("1.5"));

      const req = await fundTrace.getRequest(1, 1);
      expect(req.approvalWeight).to.equal(ethers.parseEther("1.5"));
    });

    it("31. ✓ approval requires >50% contribution weight (fails at <= 50%)", async function () {
      const { fundTrace, donor1 } = await setupRequestCreated();
      // Donor 1 = 1.5 ETH. Total raised = 3.2 ETH. 1.5 * 2 = 3.0 <= 3.2 -> NOT approved yet
      await fundTrace.connect(donor1).vote(1, 1);
      let req = await fundTrace.getRequest(1, 1);
      expect(req.state).to.equal(0); // Still Pending

      // Donor 3 donated 0.7 ETH (total voted = 2.2 ETH > 1.6 ETH threshold) -> Approved
      const { donor3 } = await setupRequestCreated(); // New fresh fixture to test crossing threshold
    });

    it("32. crossing >50% threshold transitions request to Approved and emits RequestApproved", async function () {
      const { fundTrace, donor1, donor2 } = await setupRequestCreated();
      await fundTrace.connect(donor1).vote(1, 1); // 1.5 ETH

      // Donor 2 has 1.0 ETH -> 2.5 ETH total > 1.6 ETH (>50% of 3.2 ETH)
      await expect(fundTrace.connect(donor2).vote(1, 1))
        .to.emit(fundTrace, "RequestApproved")
        .withArgs(1, 1, ethers.parseEther("2.5"));

      const req = await fundTrace.getRequest(1, 1);
      expect(req.state).to.equal(1); // Approved
    });

    it("33. approveRequest works as an alias to vote()", async function () {
      const { fundTrace, donor1 } = await setupRequestCreated();
      await expect(fundTrace.connect(donor1).approveRequest(1, 1))
        .to.emit(fundTrace, "Approved");
    });
  });

  // ==========================================
  // 5. RELEASE & EXPIRY RULES
  // ==========================================
  describe("Release & Expiry Rules", function () {
    async function setupApprovedRequest() {
      const fixture = await setupFundedCampaign();
      const { fundTrace, creator, donor1, donor2, recipient } = fixture;
      const amount = ethers.parseEther("1.2");
      await fundTrace.connect(creator).createRequest(1, recipient.address, amount, ethers.ZeroHash, 600, 3600);
      await fundTrace.connect(donor1).vote(1, 1);
      await fundTrace.connect(donor2).vote(1, 1); // Approved
      return { ...fixture, amount };
    }

    it("34. unapproved request cannot release funds", async function () {
      const fixture = await setupFundedCampaign();
      const { fundTrace, creator, donor1, recipient } = fixture;
      await fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("1.0"), ethers.ZeroHash, 600, 3600);
      await fundTrace.connect(donor1).vote(1, 1); // only 1.5 ETH out of 3.2 ETH -> Pending

      await expect(fundTrace.release(1, 1)).to.be.revertedWithCustomError(fundTrace, "ThresholdNotMet");
    });

    it("35. ✓ approved request can release and transfers funds to recipient", async function () {
      const { fundTrace, recipient, amount } = await setupApprovedRequest();
      const balBefore = await ethers.provider.getBalance(recipient.address);

      await expect(fundTrace.release(1, 1))
        .to.emit(fundTrace, "Released")
        .withArgs(1, 1, recipient.address, amount);

      const balAfter = await ethers.provider.getBalance(recipient.address);
      expect(balAfter - balBefore).to.equal(amount);

      const req = await fundTrace.getRequest(1, 1);
      expect(req.state).to.equal(2); // Released
      expect(req.releasedAt).to.be.greaterThan(0);
    });

    it("36. release frees activeRequestId allowing subsequent request", async function () {
      const { fundTrace, creator, recipient } = await setupApprovedRequest();
      await fundTrace.release(1, 1);

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.activeRequestId).to.equal(0);

      // Now creator can create Request 2 (as long as proof is not overdue)
      await expect(
        fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("0.5"), ethers.ZeroHash, 600, 3600)
      ).to.emit(fundTrace, "RequestCreated");
    });

    it("37. cannot release an already released request", async function () {
      const { fundTrace } = await setupApprovedRequest();
      await fundTrace.release(1, 1);

      await expect(fundTrace.release(1, 1)).to.be.revertedWithCustomError(fundTrace, "ThresholdNotMet");
    });

    it("38. cannot close request before voting deadline has expired", async function () {
      const fixture = await setupFundedCampaign();
      const { fundTrace, creator, recipient } = fixture;
      await fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("1.0"), ethers.ZeroHash, 600, 3600);

      await expect(fundTrace.closeExpiredRequest(1, 1)).to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });

    it("39. closeExpiredRequest closes expired request and clears active request slot", async function () {
      const fixture = await setupFundedCampaign();
      const { fundTrace, creator, recipient } = fixture;
      await fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("1.0"), ethers.ZeroHash, 600, 3600);

      await time.increase(601);

      await expect(fundTrace.closeExpiredRequest(1, 1))
        .to.emit(fundTrace, "RequestClosed");

      const req = await fundTrace.getRequest(1, 1);
      expect(req.state).to.equal(3); // Closed

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.activeRequestId).to.equal(0);
    });
  });

  // ==========================================
  // 6. PROOF OF EXPENDITURE RULES
  // ==========================================
  describe("Proof of Expenditure & Accountability Rules", function () {
    async function setupReleasedRequest() {
      const fixture = await setupFundedCampaign();
      const { fundTrace, creator, donor1, donor2, recipient } = fixture;
      await fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("1.0"), ethers.ZeroHash, 600, 3600);
      await fundTrace.connect(donor1).vote(1, 1);
      await fundTrace.connect(donor2).vote(1, 1);
      await fundTrace.release(1, 1);
      return fixture;
    }

    it("40. non-creator cannot submit proof", async function () {
      const { fundTrace, other } = await setupReleasedRequest();
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("receipt"));

      await expect(
        fundTrace.connect(other).submitProof(1, 1, proofHash)
      ).to.be.revertedWithCustomError(fundTrace, "Unauthorized");
    });

    it("41. cannot submit proof for unreleased request", async function () {
      const fixture = await setupFundedCampaign();
      const { fundTrace, creator, recipient } = fixture;
      await fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("1.0"), ethers.ZeroHash, 600, 3600);

      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("receipt"));
      await expect(
        fundTrace.connect(creator).submitProof(1, 1, proofHash)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });

    it("42. ✓ proof hash stored and marked OnTime when submitted before proof deadline", async function () {
      const { fundTrace, creator } = await setupReleasedRequest();
      const receiptHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-original-pdf"));

      await expect(fundTrace.connect(creator).submitProof(1, 1, receiptHash))
        .to.emit(fundTrace, "ProofSubmitted")
        .withArgs(1, 1, receiptHash, false, await time.latest() + 1);

      const req = await fundTrace.getRequest(1, 1);
      expect(req.proofSubmitted).to.be.true;
      expect(req.receiptHash).to.equal(receiptHash);
      expect(req.timing).to.equal(1); // OnTime
    });

    it("43. cannot submit proof multiple times for same request", async function () {
      const { fundTrace, creator } = await setupReleasedRequest();
      const receiptHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-original-pdf"));
      await fundTrace.connect(creator).submitProof(1, 1, receiptHash);

      await expect(
        fundTrace.connect(creator).submitProof(1, 1, receiptHash)
      ).to.be.revertedWithCustomError(fundTrace, "ProofAlreadySubmitted");
    });

    it("44. ✓ late proof accepted and marked late when submitted after proof deadline", async function () {
      const { fundTrace, creator } = await setupReleasedRequest();
      const receiptHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-original-pdf"));

      // Advance past 1 hour proof duration
      await time.increase(3605);

      await expect(fundTrace.connect(creator).submitProof(1, 1, receiptHash))
        .to.emit(fundTrace, "ProofSubmitted")
        .withArgs(1, 1, receiptHash, true, await time.latest() + 1);

      const req = await fundTrace.getRequest(1, 1);
      expect(req.timing).to.equal(2); // Late
    });

    it("45. checkProofHash verifies candidate file matches or detects tampering", async function () {
      const { fundTrace, creator } = await setupReleasedRequest();
      const receiptHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-original-pdf"));
      const tamperedHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-tampered-pdf"));

      await fundTrace.connect(creator).submitProof(1, 1, receiptHash);

      const [matches, isSubmitted, timing] = await fundTrace.checkProofHash(1, 1, receiptHash);
      expect(matches).to.be.true;
      expect(isSubmitted).to.be.true;
      expect(timing).to.equal(1); // OnTime

      const [tamperedMatches] = await fundTrace.checkProofHash(1, 1, tamperedHash);
      expect(tamperedMatches).to.be.false;
    });

    it("46. hasOverdueProof flags campaign when proof deadline passes without submission", async function () {
      const { fundTrace } = await setupReleasedRequest();
      expect(await fundTrace.hasOverdueProof(1)).to.be.false;

      await time.increase(3605);
      expect(await fundTrace.hasOverdueProof(1)).to.be.true;
    });

    it("47. overdue proof blocks creator from creating subsequent requests", async function () {
      const { fundTrace, creator, recipient } = await setupReleasedRequest();
      await time.increase(3605);

      await expect(
        fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("0.5"), ethers.ZeroHash, 600, 3600)
      ).to.be.revertedWithCustomError(fundTrace, "OverdueProofPending");
    });
  });

  // ==========================================
  // 7. FAILURE & REFUND RULES
  // ==========================================
  describe("Failure & Refund Rules", function () {
    async function setupFailedCampaign() {
      const fixture = await deployFixture();
      const { fundTrace, creator, verifier, donor1, donor2 } = fixture;
      const goal = ethers.parseEther("5.0");
      const duration = 86400;
      const deadline = (await time.latest()) + duration;

      await fundTrace.connect(creator).createCampaign(goal, deadline, ethers.ZeroHash, verifier.address);
      await fundTrace.connect(verifier).verifyCampaign(1);

      // Donate only 2.0 ETH out of 5.0 ETH
      await fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("1.2") });
      await fundTrace.connect(donor2).donate(1, { value: ethers.parseEther("0.8") });

      return { ...fixture, duration, goal, deadline };
    }

    it("48. refund reverts on active campaign before deadline", async function () {
      const { fundTrace, donor1 } = await setupFailedCampaign();
      await expect(fundTrace.connect(donor1).refund(1)).to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });

    it("49. ✓ failed campaign allows refund after deadline passes without reaching goal", async function () {
      const { fundTrace, donor1, duration } = await setupFailedCampaign();
      await time.increase(duration + 1);

      const balBefore = await ethers.provider.getBalance(donor1.address);
      const tx = await fundTrace.connect(donor1).refund(1);
      const receipt = await tx.wait();
      const gas = BigInt(receipt!.gasUsed) * BigInt(receipt!.gasPrice ?? 0n);

      const balAfter = await ethers.provider.getBalance(donor1.address);
      expect(balAfter + gas - balBefore).to.equal(ethers.parseEther("1.2"));
    });

    it("50. non-contributor cannot claim refund from failed campaign", async function () {
      const { fundTrace, other, duration } = await setupFailedCampaign();
      await time.increase(duration + 1);

      await expect(fundTrace.connect(other).refund(1)).to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
    });

    it("51. double refund is prevented", async function () {
      const { fundTrace, donor1, duration } = await setupFailedCampaign();
      await time.increase(duration + 1);
      await fundTrace.connect(donor1).refund(1);

      await expect(fundTrace.connect(donor1).refund(1)).to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
    });

    it("52. ✓ successful campaign cannot refund", async function () {
      const { fundTrace, donor1 } = await setupFundedCampaign();
      await expect(fundTrace.connect(donor1).refund(1)).to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });
  });

  // ==========================================
  // 7. BENEFICIARY DELIVERY ATTESTATION RULES (THE PHANTOM DELIVERY SOLUTION)
  // ==========================================
  describe("Beneficiary Physical Delivery Attestation Rules", function () {
    async function setupWithBeneficiary() {
      const fixture = await setupFundedCampaign();
      const { fundTrace, creator, beneficiary } = fixture;
      await fundTrace.connect(creator).setBeneficiary(1, beneficiary.address);
      return { ...fixture, beneficiary };
    }

    it("53. creator or verifier can assign a ground-truth beneficiary and emit BeneficiarySet", async function () {
      const { fundTrace, creator, verifier, beneficiary, other } = await setupFundedCampaign();
      
      await expect(fundTrace.connect(creator).setBeneficiary(1, beneficiary.address))
        .to.emit(fundTrace, "BeneficiarySet")
        .withArgs(1, beneficiary.address);

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.beneficiary).to.equal(beneficiary.address);

      // Verifier can also update
      await expect(fundTrace.connect(verifier).setBeneficiary(1, other.address))
        .to.emit(fundTrace, "BeneficiarySet")
        .withArgs(1, other.address);
    });

    it("54. unauthorized party cannot assign beneficiary or set zero address", async function () {
      const { fundTrace, other, creator } = await setupFundedCampaign();
      await expect(fundTrace.connect(other).setBeneficiary(1, other.address))
        .to.be.revertedWithCustomError(fundTrace, "Unauthorized");

      await expect(fundTrace.connect(creator).setBeneficiary(1, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(fundTrace, "InvalidAddress");
    });

    it("55. ground-truth beneficiary can confirm physical delivery after release", async function () {
      const { fundTrace, creator, beneficiary, recipient, donor1, donor2 } = await setupWithBeneficiary();

      // Create, vote, and release request 1
      await fundTrace.connect(creator).createRequest(
        1,
        recipient.address,
        ethers.parseEther("1.0"),
        ethers.keccak256(ethers.toUtf8Bytes("req1")),
        3600,
        3600
      );
      await fundTrace.connect(donor1).vote(1, 1);
      await fundTrace.connect(donor2).vote(1, 1);
      await fundTrace.connect(creator).release(1, 1);

      // Confirm physical delivery
      await expect(fundTrace.connect(beneficiary).confirmDelivery(1, 1))
        .to.emit(fundTrace, "DeliveryConfirmed");

      const req = await fundTrace.getRequest(1, 1);
      expect(req.deliveryConfirmed).to.be.true;
      expect(req.deliveryConfirmedAt).to.be.gt(0);
    });

    it("56. unauthorized user cannot confirm physical delivery", async function () {
      const { fundTrace, creator, recipient, donor1, donor2, other } = await setupWithBeneficiary();

      await fundTrace.connect(creator).createRequest(
        1,
        recipient.address,
        ethers.parseEther("1.0"),
        ethers.keccak256(ethers.toUtf8Bytes("req1")),
        3600,
        3600
      );
      await fundTrace.connect(donor1).vote(1, 1);
      await fundTrace.connect(donor2).vote(1, 1);
      await fundTrace.connect(creator).release(1, 1);

      await expect(fundTrace.connect(other).confirmDelivery(1, 1))
        .to.be.revertedWithCustomError(fundTrace, "Unauthorized");
    });

    it("57. cannot confirm delivery for unreleased request or double confirm", async function () {
      const { fundTrace, creator, beneficiary, recipient, donor1, donor2 } = await setupWithBeneficiary();

      await fundTrace.connect(creator).createRequest(
        1,
        recipient.address,
        ethers.parseEther("1.0"),
        ethers.keccak256(ethers.toUtf8Bytes("req1")),
        3600,
        3600
      );

      // Cannot confirm before release
      await expect(fundTrace.connect(beneficiary).confirmDelivery(1, 1))
        .to.be.revertedWithCustomError(fundTrace, "InvalidState");

      // Approve & release
      await fundTrace.connect(donor1).vote(1, 1);
      await fundTrace.connect(donor2).vote(1, 1);
      await fundTrace.connect(creator).release(1, 1);

      await fundTrace.connect(beneficiary).confirmDelivery(1, 1);

      // Cannot double confirm
      await expect(fundTrace.connect(beneficiary).confirmDelivery(1, 1))
        .to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });

    it("58. ✓ PHANTOM DELIVERY BLOCK: subsequent spending request is blocked until beneficiary confirms physical receipt", async function () {
      const { fundTrace, creator, beneficiary, recipient, donor1, donor2 } = await setupWithBeneficiary();

      // Release Request 1
      await fundTrace.connect(creator).createRequest(
        1,
        recipient.address,
        ethers.parseEther("1.0"),
        ethers.keccak256(ethers.toUtf8Bytes("req1")),
        3600,
        3600
      );
      await fundTrace.connect(donor1).vote(1, 1);
      await fundTrace.connect(donor2).vote(1, 1);
      await fundTrace.connect(creator).release(1, 1);

      // Creator submits invoice PDF
      await fundTrace.connect(creator).submitProof(1, 1, ethers.keccak256(ethers.toUtf8Bytes("invoice.pdf")));

      // Attempt to create Request 2 WITHOUT beneficiary physical attestation -> REVERTS
      await expect(
        fundTrace.connect(creator).createRequest(
          1,
          recipient.address,
          ethers.parseEther("0.5"),
          ethers.keccak256(ethers.toUtf8Bytes("req2")),
          3600,
          3600
        )
      ).to.be.revertedWithCustomError(fundTrace, "BeneficiaryDeliveryPending");

      // Now Headmaster signs off on physical delivery of 50 kits
      await fundTrace.connect(beneficiary).confirmDelivery(1, 1);

      // Creator can now successfully create Request 2!
      await expect(
        fundTrace.connect(creator).createRequest(
          1,
          recipient.address,
          ethers.parseEther("0.5"),
          ethers.keccak256(ethers.toUtf8Bytes("req2")),
          3600,
          3600
        )
      ).to.emit(fundTrace, "RequestCreated");
    });
  });

  // ==========================================
  // 8. PROJECT DORMANCY & DEAD-MAN'S AUTO-REFUND RULES (ABANDONED STUDENT PROJECT)
  // ==========================================
  describe("Project Dormancy & Dead-Man's Auto-Refund Rules", function () {
    it("59. isCampaignDormant returns false while active or within 30 days", async function () {
      const { fundTrace } = await setupFundedCampaign();
      expect(await fundTrace.isCampaignDormant(1)).to.be.false;

      // Advance time by 20 days
      await time.increase(20 * 86400);
      expect(await fundTrace.isCampaignDormant(1)).to.be.false;
    });

    it("60. isCampaignDormant returns true after 30 days of inactivity with unspent escrow", async function () {
      const { fundTrace } = await setupFundedCampaign();
      
      // Advance past 30-day dormancy timeout (31 days)
      await time.increase(31 * 86400);
      expect(await fundTrace.isCampaignDormant(1)).to.be.true;
    });

    it("61. ✓ contributors can claim exact proportional refund when project is abandoned", async function () {
      const { fundTrace, creator, recipient, donor1, donor2, donor3 } = await setupFundedCampaign();
      // Total donated: 3.2 ETH (donor1: 1.5 ETH, donor2: 1.0 ETH, donor3: 0.7 ETH)

      // Spend 1.2 ETH on Phase 1
      await fundTrace.connect(creator).createRequest(
        1,
        recipient.address,
        ethers.parseEther("1.2"),
        ethers.keccak256(ethers.toUtf8Bytes("phase1")),
        3600,
        3600
      );
      await fundTrace.connect(donor1).vote(1, 1);
      await fundTrace.connect(donor2).vote(1, 1);
      await fundTrace.connect(creator).release(1, 1);

      // Remaining unspent escrow = 3.2 - 1.2 = 2.0 ETH
      // Students graduate and abandon project for 35 days
      await time.increase(35 * 86400);
      expect(await fundTrace.isCampaignDormant(1)).to.be.true;

      // Donor 1 donated 1.5 ETH out of 3.2 ETH total.
      // Expected refund = (1.5 * 2.0) / 3.2 = 0.9375 ETH
      const expectedRefund1 = (ethers.parseEther("1.5") * ethers.parseEther("2.0")) / ethers.parseEther("3.2");

      const balBefore = await ethers.provider.getBalance(donor1.address);
      const tx = await fundTrace.connect(donor1).claimDormancyRefund(1);
      const receipt = await tx.wait();
      const gas = BigInt(receipt!.gasUsed) * BigInt(receipt!.gasPrice ?? 0n);
      const balAfter = await ethers.provider.getBalance(donor1.address);

      expect(balAfter + gas - balBefore).to.equal(expectedRefund1);
    });

    it("62. double dormancy refund claim is prevented", async function () {
      const { fundTrace, donor1 } = await setupFundedCampaign();
      await time.increase(31 * 86400);

      await fundTrace.connect(donor1).claimDormancyRefund(1);
      await expect(fundTrace.connect(donor1).claimDormancyRefund(1))
        .to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
    });

    it("63. non-contributor cannot claim dormancy refund", async function () {
      const { fundTrace, other } = await setupFundedCampaign();
      await time.increase(31 * 86400);

      await expect(fundTrace.connect(other).claimDormancyRefund(1))
        .to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
    });
  });

  // ==========================================
  // 9. FINAL FUND-FLOW: QUOTATION, SANCTION, CLAIM & PROOF
  // ==========================================
  describe("Final Fund-Flow: Quotation, Sanction, Claim & Proof", function () {
    it("64. admin can verify campaign even if not designated verifier", async function () {
      const { fundTrace, deployer, creator, verifier } = await deployFixture();
      const goal = ethers.parseEther("1.0");
      const deadline = (await time.latest()) + 86400;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("admin-verify-test"));

      await fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address);
      // deployer is admin
      await expect(fundTrace.connect(deployer).verifyCampaign(1))
        .to.emit(fundTrace, "CampaignVerified")
        .withArgs(1, deployer.address);

      const c = await fundTrace.getCampaign(1);
      expect(c.state).to.equal(1); // Verified
    });

    it("65. full raised amount becomes allocated balance upon reaching goal", async function () {
      const { fundTrace } = await setupFundedCampaign();
      const financials = await fundTrace.getCampaignFinancials(1);

      // Total donated = 3.2 ETH
      expect(financials.totalRaised).to.equal(ethers.parseEther("3.2"));
      expect(financials.totalAllocated).to.equal(ethers.parseEther("3.2"));
      expect(financials.totalSanctioned).to.equal(0);
      expect(financials.totalClaimed).to.equal(0);
      expect(financials.proofBackedAmount).to.equal(0);
      expect(financials.remainingAllocation).to.equal(ethers.parseEther("3.2"));
    });

    it("66. creator can register quotation within allocated balance", async function () {
      const { fundTrace, creator } = await setupFundedCampaign();
      const qAmount = ethers.parseEther("1.0");
      const qHash = ethers.keccak256(ethers.toUtf8Bytes("quotation-doc-1"));

      await expect(fundTrace.connect(creator).registerQuotation(1, qAmount, qHash))
        .to.emit(fundTrace, "QuotationRegistered")
        .withArgs(1, 1, creator.address, qAmount, qHash, await time.latest() + 1);

      const q = await fundTrace.getQuotation(1, 1);
      expect(q.requestedAmount).to.equal(qAmount);
      expect(q.state).to.equal(0); // Pending
    });

    it("67. donor can manually sanction quotation and creator can claim", async function () {
      const { fundTrace, creator, donor1 } = await setupFundedCampaign();
      const qAmount = ethers.parseEther("1.0");
      const qHash = ethers.keccak256(ethers.toUtf8Bytes("quotation-doc-2"));

      await fundTrace.connect(creator).registerQuotation(1, qAmount, qHash);

      // Donor 1 manually sanctions
      await expect(fundTrace.connect(donor1).sanctionQuotation(1, 1, qAmount, false, ethers.ZeroAddress))
        .to.emit(fundTrace, "QuotationSanctioned")
        .withArgs(1, 1, donor1.address, qAmount, false);

      const qAfter = await fundTrace.getQuotation(1, 1);
      expect(qAfter.state).to.equal(5); // Claimable
      expect(qAfter.allocatedAmount).to.equal(qAmount);

      // Creator claims 0.6 ETH
      const claimAmount = ethers.parseEther("0.6");
      const creatorBalBefore = await ethers.provider.getBalance(creator.address);
      const tx = await fundTrace.connect(creator).claimAllocation(1, 1, claimAmount);
      const receipt = await tx.wait();
      const gas = BigInt(receipt!.gasUsed) * BigInt(receipt!.gasPrice ?? 0n);
      const creatorBalAfter = await ethers.provider.getBalance(creator.address);

      expect(creatorBalAfter + gas - creatorBalBefore).to.equal(claimAmount);

      // Check remaining allocation
      const financials = await fundTrace.getCampaignFinancials(1);
      expect(financials.totalClaimed).to.equal(claimAmount);
      expect(financials.remainingAllocation).to.equal(ethers.parseEther("3.2") - claimAmount);
    });

    it("68. per-donor automation enables trusted relay to auto-sanction", async function () {
      const { fundTrace, creator, donor2, relay, other } = await setupFundedCampaign();
      const qAmount = ethers.parseEther("0.8");
      const qHash = ethers.keccak256(ethers.toUtf8Bytes("quotation-doc-3"));

      await fundTrace.connect(creator).registerQuotation(1, qAmount, qHash);

      // Donor 2 has NOT enabled automation yet -> auto-sanction fails
      await expect(
        fundTrace.connect(relay).sanctionQuotation(1, 1, qAmount, true, donor2.address)
      ).to.be.revertedWithCustomError(fundTrace, "DonorAutomationNotEnabled");

      // Donor 2 enables automation
      await expect(fundTrace.connect(donor2).enableAutomation(1))
        .to.emit(fundTrace, "AutomationToggled")
        .withArgs(1, donor2.address, true);

      expect(await fundTrace.isDonorAutomationEnabled(1, donor2.address)).to.be.true;

      // Now relay can auto-sanction on behalf of donor 2
      await expect(
        fundTrace.connect(relay).sanctionQuotation(1, 1, qAmount, true, donor2.address)
      ).to.emit(fundTrace, "QuotationSanctioned")
       .withArgs(1, 1, donor2.address, qAmount, true);

      // Non-relay cannot call with isAutomated=true
      await expect(
        fundTrace.connect(other).sanctionQuotation(1, 1, qAmount, true, donor2.address)
      ).to.be.revertedWithCustomError(fundTrace, "Unauthorized");
    });

    it("69. proof submission updates proofBackedAmount in getCampaignFinancials", async function () {
      const { fundTrace, creator, donor1 } = await setupFundedCampaign();
      const qAmount = ethers.parseEther("1.0");
      const qHash = ethers.keccak256(ethers.toUtf8Bytes("quotation-doc-4"));

      await fundTrace.connect(creator).registerQuotation(1, qAmount, qHash);
      await fundTrace.connect(donor1).sanctionQuotation(1, 1, qAmount, false, ethers.ZeroAddress);
      await fundTrace.connect(creator).claimAllocation(1, 1, qAmount);

      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-receipt-1"));
      await expect(fundTrace.connect(creator).submitQuotationProof(1, 1, proofHash))
        .to.emit(fundTrace, "QuotationProofSubmitted")
        .withArgs(1, 1, proofHash, false, await time.latest() + 1);

      const financials = await fundTrace.getCampaignFinancials(1);
      expect(financials.proofBackedAmount).to.equal(qAmount);
    });
  });
});
