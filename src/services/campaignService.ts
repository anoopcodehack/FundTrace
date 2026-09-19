import { connectToDatabase } from "../lib/mongodb";
import { CampaignModel, ICampaignDoc } from "../models/Campaign";
import { computeCanonicalMetadataHash, verifyHashMatch } from "../lib/canonical";
import { CampaignMetadata, IntegrityVerificationResult } from "../types";

// In-memory cache fallback for resilience during hackathon demos
const memoryCampaigns = new Map<number, CampaignMetadata>();

export async function saveCampaignMetadata(data: {
  onChainId: number;
  title: string;
  tagline?: string;
  category: "Education" | "Health" | "Environment" | "Community" | "Emergency";
  story: string;
  location?: string;
  coverImageUrl?: string;
}): Promise<CampaignMetadata> {
  const canonicalHash = computeCanonicalMetadataHash({
    title: data.title,
    story: data.story,
    category: data.category,
    location: data.location || "Global",
  });

  const record: CampaignMetadata = {
    onChainId: data.onChainId,
    title: data.title,
    tagline: data.tagline || "",
    category: data.category,
    story: data.story,
    location: data.location || "Global",
    coverImageUrl: data.coverImageUrl || "",
    canonicalHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryCampaigns.set(data.onChainId, record);

  const { isConnected } = await connectToDatabase();
  if (isConnected) {
    try {
      await CampaignModel.findOneAndUpdate(
        { onChainId: data.onChainId },
        { ...record },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("MongoDB write fallback:", e);
    }
  }

  return record;
}

export async function getCampaignMetadata(onChainId: number): Promise<CampaignMetadata | null> {
  const { isConnected } = await connectToDatabase();
  if (isConnected) {
    try {
      const doc = await CampaignModel.findOne({ onChainId }).lean();
      if (doc) {
        return {
          onChainId: doc.onChainId,
          title: doc.title,
          tagline: doc.tagline,
          category: doc.category as any,
          story: doc.story,
          location: doc.location,
          coverImageUrl: doc.coverImageUrl,
          canonicalHash: doc.canonicalHash,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        };
      }
    } catch (e) {
      console.warn("MongoDB read fallback:", e);
    }
  }

  return memoryCampaigns.get(onChainId) || null;
}

export async function getAllCampaignsMetadata(): Promise<CampaignMetadata[]> {
  const { isConnected } = await connectToDatabase();
  if (isConnected) {
    try {
      const docs = await CampaignModel.find().lean();
      if (docs && docs.length > 0) {
        return docs.map((doc: any) => ({
          onChainId: doc.onChainId,
          title: doc.title,
          tagline: doc.tagline,
          category: doc.category,
          story: doc.story,
          location: doc.location,
          coverImageUrl: doc.coverImageUrl,
          canonicalHash: doc.canonicalHash,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        }));
      }
    } catch (e) {
      console.warn("MongoDB read all fallback:", e);
    }
  }

  return Array.from(memoryCampaigns.values());
}

/**
 * Validates off-chain MongoDB campaign story against the immutable on-chain metadataHash.
 */
export async function verifyCampaignIntegrity(
  onChainId: number,
  onChainHash: string
): Promise<IntegrityVerificationResult> {
  const metadata = await getCampaignMetadata(onChainId);
  if (!metadata) {
    return {
      target: "campaign_metadata",
      onChainHash,
      computedHash: "",
      isMatch: false,
      status: "TAMPER_DETECTED",
      details: "Metadata record missing from off-chain database",
    };
  }

  const computedHash = computeCanonicalMetadataHash({
    title: metadata.title,
    story: metadata.story,
    category: metadata.category,
    location: metadata.location,
  });

  const { isMatch } = verifyHashMatch(onChainHash, computedHash);

  return {
    target: "campaign_metadata",
    onChainHash,
    computedHash,
    isMatch,
    status: isMatch ? "TAMPER_FREE" : "TAMPER_DETECTED",
    details: isMatch
      ? "Canonical Keccak-256 hash matches immutable on-chain record exactly."
      : "CRITICAL: Off-chain story or metadata has been altered after campaign verification!",
  };
}
