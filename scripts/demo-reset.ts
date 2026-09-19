import { ethers } from "hardhat";

async function main() {
  console.log("Resetting demo environment and deploying fresh contracts...");
  const [deployer, creator, verifier, donor1, donor2, recipient] = await ethers.getSigners();

  const FundTrace = await ethers.getContractFactory("FundTrace");
  const fundTrace = await FundTrace.deploy();
  await fundTrace.waitForDeployment();
  const address = await fundTrace.getAddress();

  console.log("FundTrace deployed at:", address);
  console.log("Seeding demo campaigns, donations, and initial requests...");

  // Seed demo data
  const goal = ethers.parseEther("3.0");
  const deadline = Math.floor(Date.now() / 1000) + 86400 * 7;
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("demo-stem-lab"));

  await fundTrace.connect(creator).createCampaign(goal, deadline, metadataHash, verifier.address);
  await fundTrace.connect(verifier).verifyCampaign(1);
  await fundTrace.connect(donor1).donate(1, { value: ethers.parseEther("1.5") });
  await fundTrace.connect(donor2).donate(1, { value: ethers.parseEther("1.7") });

  console.log("Demo environment reset complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
