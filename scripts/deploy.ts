import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("--------------------------------------------------");
  console.log("Deploying FundTrace with account:", deployer.address);

  const signers = await ethers.getSigners();
  const trustedRelay = signers[1].address; // Account #1 = NestJS backend relay signer
  console.log("Trusted Relay (NestJS Backend):", trustedRelay);

  const FundTrace = await ethers.getContractFactory("FundTrace");
  const fundTrace = await FundTrace.deploy(trustedRelay);
  await fundTrace.waitForDeployment();

  const address = await fundTrace.getAddress();
  const deploymentTx = fundTrace.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;
  const blockNumber = receipt ? receipt.blockNumber : await ethers.provider.getBlockNumber();

  console.log(`FundTrace deployed successfully!`);
  console.log(`Address: ${address}`);
  console.log(`Block Number: ${blockNumber}`);

  const network = await ethers.provider.getNetwork();
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = network.name === "unknown" ? "localhost" : network.name;
  const deploymentData = {
    address,
    blockNumber,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(deploymentsDir, `${networkName}.json`),
    JSON.stringify(deploymentData, null, 2)
  );
  // Also write to localhost.json if on hardhat network for convenience
  if (networkName === "hardhat") {
    fs.writeFileSync(
      path.join(deploymentsDir, `localhost.json`),
      JSON.stringify(deploymentData, null, 2)
    );
  }

  console.log(`Saved deployment record to: deployments/${networkName}.json`);
  console.log("--------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
