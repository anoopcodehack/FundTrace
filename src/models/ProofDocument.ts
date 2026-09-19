import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProofDocumentDoc extends Document {
  campaignId: number;
  requestId: number;
  documentType: "quote" | "invoice_original" | "invoice_tampered" | "receipt";
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileHash: string;
  fileContentBase64: string;
  uploadedAt: Date;
}

const ProofDocumentSchema = new Schema<IProofDocumentDoc>(
  {
    campaignId: { type: Number, required: true, index: true },
    requestId: { type: Number, required: true, index: true },
    documentType: {
      type: String,
      required: true,
      enum: ["quote", "invoice_original", "invoice_tampered", "receipt"],
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true, default: "application/pdf" },
    fileSizeBytes: { type: Number, required: true, default: 0 },
    fileHash: { type: String, required: true, index: true },
    fileContentBase64: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const ProofDocumentModel: Model<IProofDocumentDoc> =
  mongoose.models.ProofDocument ||
  mongoose.model<IProofDocumentDoc>("ProofDocument", ProofDocumentSchema);
