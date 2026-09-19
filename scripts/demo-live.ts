import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("\n========================================================");
  console.log("   ⚡ FUNDTRACE LIVE DEMO: CREATING REQUEST #02         ");
  console.log("========================================================\n");

  const deploymentsPath = path.join(__dirname, "..", "deployments", "localhost.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("No deployments/localhost.json found! Please run 'npm run demo:reset' first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const contractAddress = deployment.address;
  console.log(`Connecting to FundTrace at: ${contractAddress}`);

  const signers = await ethers.getSigners();
  const creatorMain = signers[1];
  const recipient2 = signers[7];

  const FundTraceFactory = await ethers.getContractFactory("FundTrace");
  const fundTrace = FundTraceFactory.attach(contractAddress) as any;

  // Read Request #02 Quote PDF
  const demoFilesDir = path.join(__dirname, "..", "demo-files");
  const quote2Buffer = fs.readFileSync(path.join(demoFilesDir, "request-02-quote.pdf"));
  const quote2Hash = ethers.keccak256(quote2Buffer);

  const amount = ethers.parseEther("0.5");
  const votingDuration = 1800; // 30 minutes fresh window for live pitch
  const proofDuration = 86400; // 24 hours

  console.log("Submitting transaction for Request #02 from Campaign Creator...");
  const tx = await fundTrace.connect(creatorMain).createRequest(
    1,
    recipient2.address,
    amount,
    quote2Hash,
    votingDuration,
    proofDuration
  );
  const receipt = await tx.wait();

  console.log("✔ Request #02 successfully created on-chain!");
  console.log(`  - Transaction Hash : ${receipt.hash}`);
  console.log(`  - Campaign         : #1 "Build Rural STEM Lab"`);
  console.log(`  - Item             : Laboratory Equipment, Multimeters & Sensors`);
  console.log(`  - Amount           : 0.5 ETH`);
  console.log(`  - Recipient        : ${recipient2.address}`);
  console.log(`  - Quote Hash       : ${quote2Hash}`);
  console.log(`  - Voting Window    : 30 minutes active`);

  console.log("\n========================================================");
  console.log("   🎯 PRESENTER NEXT STEPS FOR LIVE JUDGING DEMO:       ");
  console.log("========================================================");
  console.log("1. Open Campaign #1 in UI -> Request #02 is now visible as PENDING.");
  console.log("2. Connect as Alice -> Vote -> Approval reaches 46.9% (below 50% threshold).");
  console.log("3. Connect as Bob   -> Vote -> Approval reaches 78.1% -> FLIPS TO APPROVED!");
  console.log("4. Click 'Release'  -> 0.5 ETH transferred directly to Recipient.");
  console.log("5. Upload tampered invoice to Request #01 -> Show 'VERIFICATION FAILED'.");
  console.log("6. Upload original invoice to Request #01 -> Show 'MATCH: FILE UNCHANGED'.");
  console.log("7. View Campaign #3 -> Show red 'PROOF OVERDUE' & blocked spending.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
