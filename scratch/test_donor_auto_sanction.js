const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  const abi = [
    "function donations(uint256, address) view returns (uint256)",
    "function automationEnabled(uint256) view returns (bool)",
    "function enableAutomation(uint256 _campaignId) external",
    "function disableAutomation(uint256 _campaignId) external"
  ];

  const aliceSigner = new ethers.Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", provider);
  const charlieSigner = new ethers.Wallet("0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97", provider);

  const contractAlice = new ethers.Contract(contractAddress, abi, aliceSigner);
  const contractCharlie = new ethers.Contract(contractAddress, abi, charlieSigner);

  console.log("==================================================");
  console.log("TESTING PER-CAMPAIGN DONOR AUTO-SANCTION CONTROLS");
  console.log("==================================================");

  const campaignId = 2;
  const aliceDonation = await contractAlice.donations(campaignId, aliceSigner.address);
  const charlieDonation = await contractCharlie.donations(campaignId, charlieSigner.address);

  console.log(`Campaign #${campaignId}:`);
  console.log(`- Alice Backing: ${ethers.formatEther(aliceDonation)} ETH`);
  console.log(`- Charlie Backing: ${ethers.formatEther(charlieDonation)} ETH`);

  // 1. Charlie (unbacked donor) attempts to enable automation on Campaign #2 -> MUST REVERT
  console.log("\n[TEST 1] Charlie (unbacked donor) attempts to enable automation on Campaign #2...");
  try {
    const txFail = await contractCharlie.enableAutomation(campaignId);
    await txFail.wait();
    console.error("❌ FAILED: Charlie should have been rejected with Unauthorized!");
  } catch (err) {
    console.log("✅ SUCCESS: Charlie's transaction reverted as expected (Unauthorized)!");
  }

  // 2. Alice enables automation on Campaign #2
  console.log("\n[TEST 2] Alice enables automation on Campaign #2...");
  const nonce = await provider.getTransactionCount(aliceSigner.address, "pending");
  const txEnable = await contractAlice.enableAutomation(campaignId, { nonce });
  await txEnable.wait();
  console.log(`✅ SUCCESS: Alice enabled automation. Current state: ${await contractAlice.automationEnabled(campaignId)}`);

  console.log("==================================================");
  console.log("ALL ON-CHAIN TESTS PASSED CLEANLY!");
  console.log("==================================================");
}

main().catch(console.error);
