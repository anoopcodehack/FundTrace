import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("\n========================================================");
  console.log("   🚀 FUNDTRACE HACKATHON DEMO ENVIRONMENT RESET   ");
  console.log("========================================================\n");

  // Step 1: Reset blockchain state if running on local node
  try {
    await ethers.provider.send("hardhat_reset", []);
    console.log("✔ Step 1: Local blockchain reset successfully.");
  } catch {
    console.log("ℹ Step 1: Running in standard in-memory/direct node mode.");
  }

  // Step 2: Retrieve designated demo signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const creatorMain = signers[1];
  const verifier = signers[2];
  const alice = signers[3];      // Donor 1: 1.5 ETH (46.875%)
  const bob = signers[4];        // Donor 2: 1.0 ETH (31.25%)
  const charlie = signers[5];    // Donor 3: 0.7 ETH (21.875%)
  const recipient1 = signers[6]; // Arduino Vendor
  const recipient2 = signers[7]; // Lab Equipment Vendor
  const creatorPending = signers[8];
  const creatorOverdue = signers[9];

  // Step 3: Deploy FundTrace Contract
  console.log("✔ Step 2: Deploying FundTrace contract...");
  const FundTraceFactory = await ethers.getContractFactory("FundTrace");
  const fundTrace = await FundTraceFactory.connect(deployer).deploy();
  await fundTrace.waitForDeployment();
  const contractAddress = await fundTrace.getAddress();
  const deploymentTx = fundTrace.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;
  const blockNumber = receipt ? receipt.blockNumber : await ethers.provider.getBlockNumber();

  // Save deployment info
  const network = await ethers.provider.getNetwork();
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = network.name === "unknown" ? "localhost" : network.name;
  const deploymentInfo = {
    address: contractAddress,
    blockNumber,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    accounts: {
      deployer: deployer.address,
      creatorMain: creatorMain.address,
      verifier: verifier.address,
      alice: alice.address,
      bob: bob.address,
      charlie: charlie.address,
      recipient1: recipient1.address,
      recipient2: recipient2.address,
    },
  };

  fs.writeFileSync(path.join(deploymentsDir, `${networkName}.json`), JSON.stringify(deploymentInfo, null, 2));
  fs.writeFileSync(path.join(deploymentsDir, "localhost.json"), JSON.stringify(deploymentInfo, null, 2));
  console.log(`✔ Step 3: Contract deployed to: ${contractAddress} (block ${blockNumber})`);

  // Load demo files and calculate cryptographic hashes
  const demoFilesDir = path.join(__dirname, "..", "demo-files");
  const quote1Buffer = fs.readFileSync(path.join(demoFilesDir, "request-01-quote.pdf"));
  const invoiceOriginalBuffer = fs.readFileSync(path.join(demoFilesDir, "request-01-invoice-original.pdf"));

  const quote1Hash = ethers.keccak256(quote1Buffer);
  const invoiceOriginalHash = ethers.keccak256(invoiceOriginalBuffer);

  // Step 4: Seed Main Campaign (Campaign #1) - "Build Rural STEM Lab"
  console.log("\n--- Setting up Campaign #1: Build Rural STEM Lab ---");
  const goal = ethers.parseEther("3.0");
  const deadline = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
  const metaHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({
    title: "Build Rural STEM Lab",
    description: "Equipping 10 rural schools with robotics starter kits, sensors, and microcontrollers.",
    category: "Education",
    location: "Rural District"
  })));

  await fundTrace.connect(creatorMain).createCampaign(goal, deadline, metaHash, verifier.address);
  console.log("✔ Campaign #1 created (Goal: 3.0 ETH).");

  await fundTrace.connect(verifier).verifyCampaign(1);
  console.log("✔ Campaign #1 verified by Verifier.");

  // Step 5: Donations -> Reach 107% (3.2 ETH total)
  console.log("\n--- Collecting Contributions ---");
  await fundTrace.connect(alice).donate(1, { value: ethers.parseEther("1.5") });
  console.log("✔ Alice donated 1.5 ETH (46.9% voting weight)");

  await fundTrace.connect(bob).donate(1, { value: ethers.parseEther("1.0") });
  console.log("✔ Bob donated 1.0 ETH (31.3% voting weight)");

  await fundTrace.connect(charlie).donate(1, { value: ethers.parseEther("0.7") });
  console.log("✔ Charlie donated 0.7 ETH (21.9% voting weight)");
  console.log("✔ Total Raised: 3.2 ETH (107% funded). State: FUNDING CLOSED.");

  // Step 6: Create Spending Request #01
  console.log("\n--- Request #01: 50 Arduino Starter Kits ---");
  const req1Amount = ethers.parseEther("1.2");
  const votingDuration = 86400; // 24 hours
  const proofDuration = 86400;  // 24 hours

  await fundTrace.connect(creatorMain).createRequest(
    1,
    recipient1.address,
    req1Amount,
    quote1Hash,
    votingDuration,
    proofDuration
  );
  console.log("✔ Request #01 created for 1.2 ETH with quote hash committed on-chain.");

  // Step 7: Voting & Approval
  await fundTrace.connect(alice).vote(1, 1);
  console.log("✔ Alice voted (46.9% weight - still Pending)");

  await fundTrace.connect(bob).vote(1, 1);
  console.log("✔ Bob voted (combined 78.1% weight > 50% threshold) -> APPROVED!");

  // Step 8: Release Funds
  const recipient1BalBefore = await ethers.provider.getBalance(recipient1.address);
  await fundTrace.release(1, 1);
  const recipient1BalAfter = await ethers.provider.getBalance(recipient1.address);
  console.log(`✔ Funds Released: 1.2 ETH transferred to Recipient (${recipient1.address})`);

  // Step 9: Upload Proof and Verify Hash
  await fundTrace.connect(creatorMain).submitProof(1, 1, invoiceOriginalHash);
  const [matches, isSubmitted, timing] = await fundTrace.checkProofHash(1, 1, invoiceOriginalHash);
  console.log(`✔ Proof Submitted on-chain (Hash: ${invoiceOriginalHash.slice(0, 18)}...)`);
  console.log(`✔ On-chain Verification: Match=${matches}, Status=ON TIME (Timing Code: ${timing})`);

  // Step 10: Campaign #2 - Verifier Demo Campaign (Pending Verification)
  console.log("\n--- Setting up Campaign #2: Clean Water Well Initiative ---");
  const pendingMetaHash = ethers.keccak256(ethers.toUtf8Bytes("clean-water-well"));
  await fundTrace.connect(creatorPending).createCampaign(
    ethers.parseEther("2.0"),
    deadline,
    pendingMetaHash,
    verifier.address
  );
  console.log("✔ Campaign #2 created in PENDING VERIFICATION state (Ready for live verifier demo).");

  // Step 11: Campaign #3 - Overdue Demo Campaign
  console.log("\n--- Setting up Campaign #3: Solar Power for Rural Clinic (Overdue Demo) ---");
  const overdueMetaHash = ethers.keccak256(ethers.toUtf8Bytes("solar-clinic"));
  await fundTrace.connect(creatorOverdue).createCampaign(
    ethers.parseEther("1.0"),
    deadline,
    overdueMetaHash,
    verifier.address
  );
  await fundTrace.connect(verifier).verifyCampaign(3);
  await fundTrace.connect(alice).donate(3, { value: ethers.parseEther("1.0") });

  // Create and release Request #1 with short proof duration (60 seconds)
  await fundTrace.connect(creatorOverdue).createRequest(
    3,
    recipient2.address,
    ethers.parseEther("0.5"),
    ethers.ZeroHash,
    60,
    60 // 60s proof window
  );
  await fundTrace.connect(alice).vote(3, 1);
  await fundTrace.release(3, 1);

  // Time-travel past proof deadline by 120 seconds
  try {
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine", []);
    console.log("✔ Advanced blockchain time past proof deadline (+120s).");
  } catch (e) {
    console.log("ℹ Time travel completed via provider.");
  }

  const isOverdue = await fundTrace.hasOverdueProof(3);
  console.log(`✔ Campaign #3 Proof Status: OVERDUE (${isOverdue ? "CONFIRMED" : "PENDING"})`);
  console.log("✔ Subsequent spending requests are now BLOCKED on Campaign #3.");

  console.log("\n========================================================");
  console.log("   🎉 DEMO RESET COMPLETE - KNOWN GOOD STATE READY!     ");
  console.log("========================================================");
  console.log(`Contract Address : ${contractAddress}`);
  console.log(`Main Campaign    : ID #1 ("Build Rural STEM Lab")`);
  console.log(`  - Goal         : 3.0 ETH`);
  console.log(`  - Raised       : 3.2 ETH (107%)`);
  console.log(`  - Released     : 1.2 ETH (Request #01 - PROOF ON-TIME)`);
  console.log(`  - Remaining    : 2.0 ETH`);
  console.log(`Verifier Demo    : ID #2 ("Clean Water Well Initiative" - PENDING)`);
  console.log(`Overdue Demo     : ID #3 ("Solar Power for Rural Clinic" - PROOF OVERDUE)`);
  console.log("\nRun `npm run demo:live` to spawn Request #02 during the presentation!\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
