import { ethers } from "ethers";

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
  return ethers.keccak256(ethers.toUtf8Bytes(serialized));
}

/**
 * Computes the Keccak-256 hash of a file buffer (PDF quote, invoice, etc.).
 */
export function computeFileKeccak256(buffer: Buffer | Uint8Array): string {
  return ethers.keccak256(buffer);
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
