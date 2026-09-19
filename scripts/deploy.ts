import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying FundTrace with account:", deployer.address);

  const FundTrace = await ethers.getContractFactory("FundTrace");
  const fundTrace = await FundTrace.deploy();
  await fundTrace.waitForDeployment();

  const address = await fundTrace.getAddress();
  const deploymentTx = fundTrace.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;
  const blockNumber = receipt ? receipt.blockNumber : await ethers.provider.getBlockNumber();

  console.log(`FundTrace deployed to: ${address} at block: ${blockNumber}`);

  const network = await ethers.provider.getNetwork();
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = network.name === "unknown" ? "localhost" : network.name;
  fs.writeFileSync(
    path.join(deploymentsDir, `${networkName}.json`),
    JSON.stringify({ address, blockNumber, chainId: Number(network.chainId) }, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
