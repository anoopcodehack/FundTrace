import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISpendingRequestDoc extends Document {
  onChainCampaignId: number;
  onChainRequestId: number;
  title: string;
  description: string;
  vendorName: string;
  vendorWebsite?: string;
  quoteFileName: string;
  quoteFileHash: string;
  createdAt: Date;
}

const SpendingRequestSchema = new Schema<ISpendingRequestDoc>(
  {
    onChainCampaignId: { type: Number, required: true, index: true },
    onChainRequestId: { type: Number, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    vendorName: { type: String, required: true },
    vendorWebsite: { type: String, default: "" },
    quoteFileName: { type: String, required: true },
    quoteFileHash: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

SpendingRequestSchema.index({ onChainCampaignId: 1, onChainRequestId: 1 }, { unique: true });

export const SpendingRequestModel: Model<ISpendingRequestDoc> =
  mongoose.models.SpendingRequest ||
  mongoose.model<ISpendingRequestDoc>("SpendingRequest", SpendingRequestSchema);
