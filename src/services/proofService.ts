import { getSupabaseClient, isSupabaseConfigured, STORAGE_BUCKET } from "../lib/supabase";
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
  const storagePath = `${params.campaignId}/${params.requestId}/${params.fileName}`;

  const record: ProofDocumentRecord = {
    campaignId: params.campaignId,
    requestId: params.requestId,
    documentType: params.documentType,
    fileName: params.fileName,
    mimeType: params.mimeType || "application/pdf",
    fileSizeBytes: params.fileBuffer.length,
    fileHash,
    fileContentBase64: base64Content,
    storagePath,
    uploadedAt: new Date().toISOString(),
    isTamperedDemo: params.isTamperedDemo || false,
  };

  const key = getDocKey(params.campaignId, params.requestId, params.documentType);
  memoryDocuments.set(key, record);

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();

      // 1. Upload untouched bytes to Supabase Storage
      await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, params.fileBuffer, {
          contentType: params.mimeType || "application/pdf",
          upsert: true,
        });

      // 2. Upsert metadata record in Supabase PostgreSQL
      await supabase.from("proof_documents").upsert(
        {
          campaign_id: params.campaignId,
          request_id: params.requestId,
          document_type: params.documentType,
          file_name: params.fileName,
          mime_type: params.mimeType || "application/pdf",
          file_size_bytes: params.fileBuffer.length,
          file_hash: fileHash,
          storage_path: storagePath,
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: "campaign_id,request_id,document_type" }
      );
    } catch (e) {
      console.warn("Supabase document save fallback:", e);
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

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("proof_documents")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("request_id", requestId)
        .eq("document_type", documentType)
        .single();

      if (data && !error) {
        return {
          campaignId: data.campaign_id,
          requestId: data.request_id,
          documentType: data.document_type as any,
          fileName: data.file_name,
          mimeType: data.mime_type,
          fileSizeBytes: data.file_size_bytes,
          fileHash: data.file_hash,
          storagePath: data.storage_path,
          uploadedAt: data.uploaded_at,
        };
      }
    } catch (e) {
      console.warn("Supabase document get fallback:", e);
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
