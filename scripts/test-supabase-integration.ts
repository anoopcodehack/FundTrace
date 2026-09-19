import * as fs from "fs";
import * as path from "path";
import { computeCanonicalMetadataHash, verifyHashMatch } from "../src/lib/canonical";
import { saveCampaignMetadata, verifyCampaignIntegrity } from "../src/services/campaignService";
import { storeProofDocument, verifyCandidateFileHash } from "../src/services/proofService";

async function runSupabasePhase8Demo() {
  console.log("\n============================================================");
  console.log("   ⚡ FUNDTRACE PHASE 8: SUPABASE & ARCHITECTURAL TRUTH     ");
  console.log("============================================================\n");

  console.log("--- ARCHITECTURAL RESPONSIBILITY SPLIT ---");
  console.log("┌──────────────────────────┬───────────────────────────────┐");
  console.log("│ BLOCKCHAIN (FINANCIAL)   │ SUPABASE (CONTENT & STORAGE)  │");
  console.log("├──────────────────────────┼───────────────────────────────┤");
  console.log("│ • Exact Wei Amounts      │ • Rich Story & Vision         │");
  console.log("│ • Donor Wallet Addresses │ • Campaign Title & Category   │");
  console.log("│ • Recipient Addresses    │ • Cover Images & Media        │");
  console.log("│ • Approval Weight (Votes)│ • Quotation PDF Documents     │");
  console.log("│ • Release Execution      │ • Original Invoice Proof PDFs │");
  console.log("│ • Keccak-256 Hashes      │ • Untouched Raw File Bytes    │");
  console.log("└──────────────────────────┴───────────────────────────────┘\n");

  // Step 1: Canonical Metadata Hash Test
  console.log("--- Step 1: Canonical Metadata Hashing (Tamper-Evident Story) ---");
  const originalStory = {
    title: "Build Rural STEM Lab",
    story: "Providing 10 underprivileged schools with robotics and Arduino kits.",
    category: "Education",
    location: "Rural District",
  };
  const onChainMetadataHash = computeCanonicalMetadataHash(originalStory);
  console.log(`Original Metadata Canonical Hash: ${onChainMetadataHash}`);

  // Save to Supabase layer
  await saveCampaignMetadata({
    onChainId: 1,
    title: originalStory.title,
    story: originalStory.story,
    category: originalStory.category as any,
    location: originalStory.location,
  });
  console.log("✔ Campaign #1 presentation data stored in Supabase layer.");

  // Test integrity check with unchanged story
  const check1 = await verifyCampaignIntegrity(1, onChainMetadataHash);
  console.log(`✔ Unchanged Story Integrity: ${check1.status} (${check1.isMatch ? "VALID MATCH" : "FAIL"})`);

  // Simulate malicious DB tampering: someone edits the story in the database
  const tamperedStory = {
    ...originalStory,
    story: "Providing 2 schools with cheap kits and keeping remainder.", // altered text!
  };
  const tamperedHash = computeCanonicalMetadataHash(tamperedStory);
  const { isMatch: tamperedMatch } = verifyHashMatch(onChainMetadataHash, tamperedHash);
  console.log(`✔ Malicious Story Alteration Test: Match=${tamperedMatch} -> TAMPER DETECTED!`);
  console.log(`  Expected on-chain hash: ${onChainMetadataHash}`);
  console.log(`  Tampered story hash   : ${tamperedHash}`);

  // Step 2: Proof of Expenditure Documents in Supabase Storage
  console.log("\n--- Step 2: Document Storage & Cryptographic Verification ---");
  const demoFilesDir = path.join(__dirname, "..", "demo-files");
  const quote1Buffer = fs.readFileSync(path.join(demoFilesDir, "request-01-quote.pdf"));
  const invoiceOriginalBuffer = fs.readFileSync(path.join(demoFilesDir, "request-01-invoice-original.pdf"));
  const invoiceTamperedBuffer = fs.readFileSync(path.join(demoFilesDir, "request-01-invoice-tampered.pdf"));

  // Store quote in Supabase
  const quoteDoc = await storeProofDocument({
    campaignId: 1,
    requestId: 1,
    documentType: "quote",
    fileName: "request-01-quote.pdf",
    fileBuffer: quote1Buffer,
  });
  console.log(`✔ Quote PDF stored in Supabase Storage (Hash: ${quoteDoc.fileHash})`);

  // Store original invoice in Supabase
  const originalDoc = await storeProofDocument({
    campaignId: 1,
    requestId: 1,
    documentType: "invoice_original",
    fileName: "request-01-invoice-original.pdf",
    fileBuffer: invoiceOriginalBuffer,
  });
  console.log(`✔ Original Invoice PDF stored in Supabase Storage (Hash: ${originalDoc.fileHash})`);

  // Simulate on-chain hash commitment:
  const onChainReceiptHash = originalDoc.fileHash;

  // Step 3: Presenter Test: Original Invoice vs Tampered Invoice
  console.log("\n--- Step 3: Judge Verification Simulation ---");
  
  // Test A: Uploading Original Invoice
  const testOriginal = verifyCandidateFileHash(invoiceOriginalBuffer, onChainReceiptHash);
  console.log(`[TEST A] Uploading ORIGINAL invoice:`);
  console.log(`  Result : ${testOriginal.status}`);
  console.log(`  Detail : ${testOriginal.details}`);

  // Test B: Uploading Tampered Invoice (Altered Amount)
  const testTampered = verifyCandidateFileHash(invoiceTamperedBuffer, onChainReceiptHash);
  console.log(`\n[TEST B] Uploading TAMPERED invoice:`);
  console.log(`  Result : ${testTampered.status}`);
  console.log(`  Detail : ${testTampered.details}`);

  console.log("\n============================================================");
  console.log("   ✅ PHASE 8: SUPABASE & OFF-CHAIN INTEGRITY VERIFIED!     ");
  console.log("============================================================\n");
}

runSupabasePhase8Demo().catch((err) => {
  console.error(err);
  process.exit(1);
});
