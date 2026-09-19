import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FundTrace", function () {
  async function deployFixture() {
    const [deployer, creator, verifier, donor1, donor2, recipient] = await ethers.getSigners();

    const FundTraceFactory = await ethers.getContractFactory("FundTrace");
    const fundTrace = await FundTraceFactory.deploy();
    await fundTrace.waitForDeployment();

    return { fundTrace, deployer, creator, verifier, donor1, donor2, recipient };
  }

  it("should create and verify a campaign", async function () {
    const { fundTrace, creator, verifier } = await deployFixture();
    const goal = ethers.parseEther("3.0");
    const deadline = (await time.latest()) + 86400;
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("campaign-metadata"));

    await expect(fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address))
      .to.emit(fundTrace, "CampaignCreated")
      .withArgs(1, creator.address, verifier.address, goal, deadline, metadataHash);

    await expect(fundTrace.connect(verifier).verifyCampaign(1))
      .to.emit(fundTrace, "CampaignVerified")
      .withArgs(1, verifier.address);
  });

  it("should accept donations and close funding on reaching goal", async function () {
    const { fundTrace, creator, verifier, donor1, donor2 } = await deployFixture();
    const goal = ethers.parseEther("3.0");
    const deadline = (await time.latest()) + 86400;
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("campaign-metadata"));

    await fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address);
    await fundTrace.connect(verifier).verifyCampaign(1);

    await fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("1.5") });
    await expect(fundTrace.connect(donor2).donate(1, { value: ethers.parseEther("1.7") }))
      .to.emit(fundTrace, "FundingClosed");
  });
});
