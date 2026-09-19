import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex } from "@noble/hashes/utils";

/**
 * Produces a deterministic canonical representation of an object with sorted keys.
 * This guarantees that differences in whitespace, key insertion order, or formatting
 * do not alter the cryptographic hash.
 */
export function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalStringify(item)).join(",")}]`;
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`
  );
  return `{${pairs.join(",")}}`;
}

/**
 * Computes the Keccak-256 hash of canonical metadata.
 * Committed on-chain at campaign creation and locked upon verification.
 */
export function computeCanonicalMetadataHash(metadata: {
  title: string;
  description?: string;
  story: string;
  category: string;
  location: string;
}): string {
  const canonicalData = {
    category: metadata.category.trim(),
    location: metadata.location.trim(),
    story: metadata.story.trim(),
    title: metadata.title.trim(),
  };
  const serialized = canonicalStringify(canonicalData);
  const bytes = new TextEncoder().encode(serialized);
  return "0x" + bytesToHex(keccak_256(bytes));
}

/**
 * Computes the Keccak-256 hash of a file buffer (PDF quote, invoice, etc.).
 */
export function computeFileKeccak256(buffer: Uint8Array): string {
  return "0x" + bytesToHex(keccak_256(buffer));
}

/**
 * Compares an off-chain hash against an on-chain commitment.
 */
export function verifyHashMatch(
  onChainHash: string,
  candidateHash: string
): { isMatch: boolean; status: "MATCH" | "TAMPER_DETECTED" } {
  const normalizedOnChain = onChainHash.toLowerCase();
  const normalizedCandidate = candidateHash.toLowerCase();
  const isMatch = normalizedOnChain === normalizedCandidate;
  return {
    isMatch,
    status: isMatch ? "MATCH" : "TAMPER_DETECTED",
  };
}
