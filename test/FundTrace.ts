import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FundTrace Complete Test Suite", function () {
  async function deployFixture() {
    const [deployer, creator, verifier, donor1, donor2, donor3, recipient] = await ethers.getSigners();

    const FundTraceFactory = await ethers.getContractFactory("FundTrace");
    const fundTrace = await FundTraceFactory.deploy();
    await fundTrace.waitForDeployment();

    return { fundTrace, deployer, creator, verifier, donor1, donor2, donor3, recipient };
  }

  describe("1. Campaign Creation & Verification", function () {
    it("should create a campaign in PendingVerification state", async function () {
      const { fundTrace, creator, verifier } = await deployFixture();
      const goal = ethers.parseEther("3.0");
      const deadline = (await time.latest()) + 86400;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("stem-lab"));

      await expect(fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address))
        .to.emit(fundTrace, "CampaignCreated")
        .withArgs(1, creator.address, verifier.address, goal, deadline, metadataHash);

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.state).to.equal(0); // PendingVerification
    });

    it("should reject creator attempting to verify", async function () {
      const { fundTrace, creator } = await deployFixture();
      const goal = ethers.parseEther("3.0");
      const deadline = (await time.latest()) + 86400;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("stem-lab"));

      await expect(
        fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, creator.address)
      ).to.be.revertedWithCustomError(fundTrace, "InvalidAddress");
    });

    it("should allow verifier to verify or reject", async function () {
      const { fundTrace, creator, verifier, donor1 } = await deployFixture();
      const goal = ethers.parseEther("3.0");
      const deadline = (await time.latest()) + 86400;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("stem-lab"));

      await fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address);

      // Non-verifier cannot verify
      await expect(fundTrace.connect(donor1).verifyCampaign(1)).to.be.revertedWithCustomError(fundTrace, "Unauthorized");

      // Verifier verifies
      await expect(fundTrace.connect(verifier).verifyCampaign(1))
        .to.emit(fundTrace, "CampaignVerified")
        .withArgs(1, verifier.address);

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.state).to.equal(1); // Verified
    });
  });

  describe("2. Donations & Funding Lock", function () {
    it("should block donations to unverified campaigns", async function () {
      const { fundTrace, creator, verifier, donor1 } = await deployFixture();
      const goal = ethers.parseEther("3.0");
      const deadline = (await time.latest()) + 86400;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address);
      await expect(
        fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWithCustomError(fundTrace, "InvalidState");
    });

    it("should prevent creator from donating to own campaign", async function () {
      const { fundTrace, creator, verifier } = await deployFixture();
      const goal = ethers.parseEther("3.0");
      const deadline = (await time.latest()) + 86400;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address);
      await fundTrace.connect(verifier).verifyCampaign(1);

      await expect(
        fundTrace.connect(creator).donate(1, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWithCustomError(fundTrace, "Unauthorized");
    });

    it("should close funding once the goal is reached", async function () {
      const { fundTrace, creator, verifier, donor1, donor2 } = await deployFixture();
      const goal = ethers.parseEther("3.0");
      const deadline = (await time.latest()) + 86400;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address);
      await fundTrace.connect(verifier).verifyCampaign(1);

      await fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("1.5") });
      await expect(fundTrace.connect(donor2).donate(1, { value: ethers.parseEther("1.7") }))
        .to.emit(fundTrace, "FundingClosed")
        .withArgs(1, ethers.parseEther("3.2"));

      const campaign = await fundTrace.getCampaign(1);
      expect(campaign.state).to.equal(3); // FundingClosed
      expect(campaign.totalDonated).to.equal(ethers.parseEther("3.2"));
    });
  });

  describe("3. Spending Governance, Voting & Release", function () {
    async function setupFundedCampaign() {
      const fixture = await deployFixture();
      const { fundTrace, creator, verifier, donor1, donor2, donor3 } = fixture;
      const goal = ethers.parseEther("3.0");
      const deadline = (await time.latest()) + 86400;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address);
      await fundTrace.connect(verifier).verifyCampaign(1);

      // Donor 1 contributes 1.5 ETH (46.875%), Donor 2 contributes 1.0 ETH (31.25%), Donor 3 contributes 0.7 ETH (21.875%)
      // Total raised: 3.2 ETH. >50% threshold requires > 1.6 ETH.
      await fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("1.5") });
      await fundTrace.connect(donor2).donate(1, { value: ethers.parseEther("1.0") });
      await fundTrace.connect(donor3).donate(1, { value: ethers.parseEther("0.7") });

      return fixture;
    }

    it("should allow creator to open spending request and enforce snapshot threshold", async function () {
      const { fundTrace, creator, donor1, donor2, recipient } = await setupFundedCampaign();

      const amount = ethers.parseEther("1.2");
      const requestHash = ethers.keccak256(ethers.toUtf8Bytes("req-01-quote"));
      const votingDuration = 600; // 10 minutes
      const proofDuration = 3600; // 1 hour

      await expect(
        fundTrace.connect(creator).createRequest(1, recipient.address, amount, requestHash, votingDuration, proofDuration)
      ).to.emit(fundTrace, "RequestCreated");

      // Creator cannot vote
      await expect(fundTrace.connect(creator).vote(1, 1)).to.be.revertedWithCustomError(fundTrace, "Unauthorized");

      // Donor 1 votes (1.5 ETH <= 1.6 ETH threshold) -> still Pending
      await fundTrace.connect(donor1).vote(1, 1);
      let req = await fundTrace.getRequest(1, 1);
      expect(req.state).to.equal(0); // Pending

      // Double vote not allowed
      await expect(fundTrace.connect(donor1).vote(1, 1)).to.be.revertedWithCustomError(fundTrace, "AlreadyVoted");

      // Donor 2 votes (adds 1.0 ETH -> total 2.5 ETH > 1.6 ETH threshold) -> flips to Approved
      await expect(fundTrace.connect(donor2).vote(1, 1))
        .to.emit(fundTrace, "RequestApproved")
        .withArgs(1, 1, ethers.parseEther("2.5"));

      req = await fundTrace.getRequest(1, 1);
      expect(req.state).to.equal(1); // Approved
    });

    it("should release funds to recipient and update balance", async function () {
      const { fundTrace, creator, donor1, donor2, recipient } = await setupFundedCampaign();
      const amount = ethers.parseEther("1.2");
      const requestHash = ethers.keccak256(ethers.toUtf8Bytes("req-01-quote"));

      await fundTrace.connect(creator).createRequest(1, recipient.address, amount, requestHash, 600, 3600);
      await fundTrace.connect(donor1).vote(1, 1);
      await fundTrace.connect(donor2).vote(1, 1);

      const recipientBalBefore = await ethers.provider.getBalance(recipient.address);

      // Anyone can trigger release
      await expect(fundTrace.release(1, 1))
        .to.emit(fundTrace, "Released")
        .withArgs(1, 1, recipient.address, amount);

      const recipientBalAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalAfter - recipientBalBefore).to.equal(amount);
    });

    it("should close expired request if threshold not reached within deadline", async function () {
      const { fundTrace, creator, donor1, recipient } = await setupFundedCampaign();
      const amount = ethers.parseEther("1.0");
      const requestHash = ethers.keccak256(ethers.toUtf8Bytes("req-01-quote"));

      await fundTrace.connect(creator).createRequest(1, recipient.address, amount, requestHash, 600, 3600);
      await fundTrace.connect(donor1).vote(1, 1); // 1.5 ETH not enough

      // Advance time beyond voting deadline
      await time.increase(601);

      await expect(fundTrace.closeExpiredRequest(1, 1))
        .to.emit(fundTrace, "RequestClosed");

      const req = await fundTrace.getRequest(1, 1);
      expect(req.state).to.equal(3); // Closed
    });
  });

  describe("4. Proof of Expenditure & Overdue Blocking", function () {
    async function setupReleasedRequest() {
      const [deployer, creator, verifier, donor1, donor2, recipient] = await ethers.getSigners();
      const FundTraceFactory = await ethers.getContractFactory("FundTrace");
      const fundTrace = await FundTraceFactory.deploy();

      const goal = ethers.parseEther("3.0");
      const deadline = (await time.latest()) + 86400;
      await fundTrace.connect(creator).createCampaign(goal, deadline, ethers.ZeroHash, verifier.address);
      await fundTrace.connect(verifier).verifyCampaign(1);
      await fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("2.0") });
      await fundTrace.connect(donor2).donate(1, { value: ethers.parseEther("1.2") });

      // Request 1: 1.0 ETH, 10 min voting, 1 hour proof duration
      await fundTrace.connect(creator).createRequest(1, recipient.address, ethers.parseEther("1.0"), ethers.ZeroHash, 600, 3600);
      await fundTrace.connect(donor1).vote(1, 1);
      await fundTrace.release(1, 1);

      return { fundTrace, creator, verifier, donor1, donor2, recipient };
    }

    it("should submit proof on time and allow hash checking", async function () {
      const { fundTrace, creator } = await setupReleasedRequest();
      const receiptHash = ethers.keccak256(ethers.toUtf8Bytes("valid-invoice-pdf"));

      await expect(fundTrace.connect(creator).submitProof(1, 1, receiptHash))
        .to.emit(fundTrace, "ProofSubmitted")
        .withArgs(1, 1, receiptHash, false, await time.latest() + 1);

      const [matches, isSubmitted, timing] = await fundTrace.checkProofHash(1, 1, receiptHash);
      expect(matches).to.be.true;
      expect(isSubmitted).to.be.true;
      expect(timing).to.equal(1); // OnTime

      // Candidate mismatch test
      const tamperedHash = ethers.keccak256(ethers.toUtf8Bytes("tampered-invoice-pdf"));
      const [tamperedMatches] = await fundTrace.checkProofHash(1, 1, tamperedHash);
      expect(tamperedMatches).to.be.false;
    });

    it("should submit proof as LATE if past proof deadline", async function () {
      const { fundTrace, creator } = await setupReleasedRequest();
      const receiptHash = ethers.keccak256(ethers.toUtf8Bytes("late-invoice-pdf"));

      // Advance past the 1 hour proof duration
      await time.increase(3605);

      expect(await fundTrace.hasOverdueProof(1)).to.be.true;

      await expect(fundTrace.connect(creator).submitProof(1, 1, receiptHash))
        .to.emit(fundTrace, "ProofSubmitted")
        .withArgs(1, 1, receiptHash, true, await time.latest() + 1);

      const [, , timing] = await fundTrace.checkProofHash(1, 1, receiptHash);
      expect(timing).to.equal(2); // Late
    });

    it("should BLOCK creating a new request if previous request proof is overdue", async function () {
      const { fundTrace, creator, recipient } = await setupReleasedRequest();

      // Advance past proof deadline without submitting proof
      await time.increase(3605);
      expect(await fundTrace.hasOverdueProof(1)).to.be.true;

      // Attempting to create Request 2 must revert with OverdueProofPending
      await expect(
        fundTrace.connect(creator).createRequest(
          1,
          recipient.address,
          ethers.parseEther("0.5"),
          ethers.ZeroHash,
          600,
          3600
        )
      ).to.be.revertedWithCustomError(fundTrace, "OverdueProofPending");
    });
  });

  describe("5. Campaign Failure & Refunds", function () {
    it("should allow donors to pull refunds if campaign failed to reach goal", async function () {
      const [deployer, creator, verifier, donor1, donor2] = await ethers.getSigners();
      const FundTraceFactory = await ethers.getContractFactory("FundTrace");
      const fundTrace = await FundTraceFactory.deploy();

      const goal = ethers.parseEther("5.0");
      const duration = 86400;
      const deadline = (await time.latest()) + duration;

      await fundTrace.connect(creator).createCampaign(goal, deadline, ethers.ZeroHash, verifier.address);
      await fundTrace.connect(verifier).verifyCampaign(1);

      // Only 2.0 ETH donated (out of 5.0 ETH)
      await fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("1.2") });
      await fundTrace.connect(donor2).donate(1, { value: ethers.parseEther("0.8") });

      // Before deadline, refund should revert
      await expect(fundTrace.connect(donor1).refund(1)).to.be.revertedWithCustomError(fundTrace, "InvalidState");

      // Advance past campaign deadline
      await time.increase(duration + 1);

      const donor1BalBefore = await ethers.provider.getBalance(donor1.address);
      const tx = await fundTrace.connect(donor1).refund(1);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      const donor1BalAfter = await ethers.provider.getBalance(donor1.address);
      expect(donor1BalAfter + gasCost - donor1BalBefore).to.equal(ethers.parseEther("1.2"));

      // Double refund prevented
      await expect(fundTrace.connect(donor1).refund(1)).to.be.revertedWithCustomError(fundTrace, "InvalidAmount");
    });
  });
});
