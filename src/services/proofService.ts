import { ProofDocumentRecord, IntegrityVerificationResult } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function storeProofDocument(params: {
  campaignId: number;
  requestId: number;
  documentType: "quote" | "invoice_original" | "invoice_tampered" | "receipt";
  fileName: string;
  mimeType?: string;
  fileBuffer: Buffer | Uint8Array;
  isTamperedDemo?: boolean;
}): Promise<ProofDocumentRecord> {
  const formData = new FormData();
  
  // Convert buffer to Blob for FormData
  const blob = new Blob([params.fileBuffer], { type: params.mimeType || "application/pdf" });
  formData.append('file', blob, params.fileName);
  formData.append('campaignId', params.campaignId.toString());
  formData.append('requestId', params.requestId.toString());
  formData.append('documentType', params.documentType);

  const response = await fetch(`${API_URL}/proofs/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload proof document');
  }

  const result = await response.json();
  
  return {
    campaignId: params.campaignId,
    requestId: params.requestId,
    documentType: params.documentType,
    fileName: result.filename,
    mimeType: result.mimeType,
    fileSizeBytes: result.size,
    fileHash: result.hash,
    storagePath: result.storagePath,
    uploadedAt: new Date().toISOString(),
    isTamperedDemo: params.isTamperedDemo || false,
  };
}

export async function getProofDocument(
  campaignId: number,
  requestId: number,
  documentType: "quote" | "invoice_original" | "invoice_tampered" | "receipt"
): Promise<ProofDocumentRecord | null> {
  try {
    const response = await fetch(`${API_URL}/proofs/${campaignId}/${requestId}/${documentType}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch proof document metadata');
    }

    const data = await response.json();
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
  } catch (error) {
    console.error("Error fetching proof document:", error);
    return null;
  }
}

/**
 * Validates a candidate uploaded file against an on-chain committed receipt hash.
 */
export async function verifyCandidateFileHash(
  candidateBuffer: Buffer | Uint8Array,
  onChainHash: string
): Promise<IntegrityVerificationResult> {
  try {
    const formData = new FormData();
    const blob = new Blob([candidateBuffer]);
    formData.append('file', blob, 'candidate');
    formData.append('expectedHash', onChainHash);

    const response = await fetch(`${API_URL}/proofs/verify`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to verify document hash');
    }

    const result = await response.json();

    return {
      target: "receipt_proof",
      onChainHash,
      computedHash: result.computedHash,
      isMatch: result.isMatch,
      status: result.status,
      details: result.details,
    };
  } catch (error) {
    return {
      target: "receipt_proof",
      onChainHash,
      computedHash: "",
      isMatch: false,
      status: "TAMPER_DETECTED",
      details: "Verification failed to communicate with backend.",
    };
  }
}
