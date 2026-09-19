import { connectToDatabase } from "../lib/mongodb";
import { ProofDocumentModel, IProofDocumentDoc } from "../models/ProofDocument";
import { computeFileKeccak256, verifyHashMatch } from "../lib/canonical";
import { ProofDocumentRecord, IntegrityVerificationResult } from "../types";

// In-memory document fallback store for hackathon resilience
const memoryDocuments = new Map<string, ProofDocumentRecord>();

function getDocKey(campaignId: number, requestId: number, docType: string): string {
  return `${campaignId}-${requestId}-${docType}`;
}

export async function storeProofDocument(params: {
  campaignId: number;
  requestId: number;
  documentType: "quote" | "invoice_original" | "invoice_tampered" | "receipt";
  fileName: string;
  mimeType?: string;
  fileBuffer: Buffer | Uint8Array;
  isTamperedDemo?: boolean;
}): Promise<ProofDocumentRecord> {
  const fileHash = computeFileKeccak256(params.fileBuffer);
  const base64Content = Buffer.from(params.fileBuffer).toString("base64");

  const record: ProofDocumentRecord = {
    campaignId: params.campaignId,
    requestId: params.requestId,
    documentType: params.documentType,
    fileName: params.fileName,
    mimeType: params.mimeType || "application/pdf",
    fileSizeBytes: params.fileBuffer.length,
    fileHash,
    fileContentBase64: base64Content,
    uploadedAt: new Date().toISOString(),
    isTamperedDemo: params.isTamperedDemo || false,
  };

  const key = getDocKey(params.campaignId, params.requestId, params.documentType);
  memoryDocuments.set(key, record);

  const { isConnected } = await connectToDatabase();
  if (isConnected) {
    try {
      await ProofDocumentModel.findOneAndUpdate(
        {
          campaignId: params.campaignId,
          requestId: params.requestId,
          documentType: params.documentType,
        },
        {
          ...record,
          uploadedAt: new Date(record.uploadedAt),
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("MongoDB document save fallback:", e);
    }
  }

  return record;
}

export async function getProofDocument(
  campaignId: number,
  requestId: number,
  documentType: "quote" | "invoice_original" | "invoice_tampered" | "receipt"
): Promise<ProofDocumentRecord | null> {
  const key = getDocKey(campaignId, requestId, documentType);

  const { isConnected } = await connectToDatabase();
  if (isConnected) {
    try {
      const doc = await ProofDocumentModel.findOne({
        campaignId,
        requestId,
        documentType,
      }).lean();

      if (doc) {
        return {
          campaignId: doc.campaignId,
          requestId: doc.requestId,
          documentType: doc.documentType as any,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          fileSizeBytes: doc.fileSizeBytes,
          fileHash: doc.fileHash,
          fileContentBase64: doc.fileContentBase64,
          uploadedAt: doc.uploadedAt.toISOString(),
        };
      }
    } catch (e) {
      console.warn("MongoDB document get fallback:", e);
    }
  }

  return memoryDocuments.get(key) || null;
}

/**
 * Validates a candidate uploaded file against an on-chain committed receipt hash.
 */
export function verifyCandidateFileHash(
  candidateBuffer: Buffer | Uint8Array,
  onChainHash: string
): IntegrityVerificationResult {
  const computedHash = computeFileKeccak256(candidateBuffer);
  const { isMatch } = verifyHashMatch(onChainHash, computedHash);

  return {
    target: "receipt_proof",
    onChainHash,
    computedHash,
    isMatch,
    status: isMatch ? "TAMPER_FREE" : "TAMPER_DETECTED",
    details: isMatch
      ? "MATCH: File is 100% authentic and unaltered from the receipt committed on-chain."
      : "VERIFICATION FAILED: Cryptographic hash mismatch. Document has been modified, tampered with, or replaced!",
  };
}
