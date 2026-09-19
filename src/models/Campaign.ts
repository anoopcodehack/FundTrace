import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICampaignDoc extends Document {
  onChainId: number;
  title: string;
  tagline: string;
  category: string;
  story: string;
  location: string;
  coverImageUrl: string;
  canonicalHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaignDoc>(
  {
    onChainId: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    tagline: { type: String, default: "" },
    category: { type: String, required: true, default: "Community" },
    story: { type: String, required: true },
    location: { type: String, default: "Global" },
    coverImageUrl: { type: String, default: "" },
    canonicalHash: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

export const CampaignModel: Model<ICampaignDoc> =
  mongoose.models.Campaign || mongoose.model<ICampaignDoc>("Campaign", CampaignSchema);
