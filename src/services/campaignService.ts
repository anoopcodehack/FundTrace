import { CampaignMetadata, IntegrityVerificationResult } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function saveCampaignMetadata(data: {
  onChainId: number;
  title: string;
  tagline?: string;
  category: "Education" | "Health" | "Environment" | "Community" | "Emergency";
  story: string;
  location?: string;
  coverImageUrl?: string;
  creatorAddress?: string;
  verifierAddress?: string;
}): Promise<CampaignMetadata> {
  const response = await fetch(`${API_URL}/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      onChainId: data.onChainId,
      title: data.title,
      tagline: data.tagline,
      category: data.category,
      description: data.story, // Backend DTO expects description
      location: data.location,
      imageUrl: data.coverImageUrl, // Backend DTO expects imageUrl
      creatorAddress: data.creatorAddress,
      verifierAddress: data.verifierAddress,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save campaign metadata');
  }

  const result = await response.json();
  
  // Map backend response back to frontend interface
  return {
    onChainId: result.on_chain_id,
    title: result.title,
    tagline: result.tagline,
    category: result.category,
    story: result.story,
    location: result.location,
    coverImageUrl: result.cover_image_url,
    canonicalHash: result.canonical_hash,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

export async function getCampaignMetadata(onChainId: number): Promise<CampaignMetadata | null> {
  try {
    const response = await fetch(`${API_URL}/campaigns/${onChainId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch campaign metadata');
    }

    const { metadata } = await response.json();
    return {
      onChainId: metadata.on_chain_id,
      title: metadata.title,
      tagline: metadata.tagline,
      category: metadata.category,
      story: metadata.story,
      location: metadata.location,
      coverImageUrl: metadata.cover_image_url,
      canonicalHash: metadata.canonical_hash,
      createdAt: metadata.created_at,
      updatedAt: metadata.updated_at,
    };
  } catch (error) {
    console.error("Error fetching campaign metadata:", error);
    return null;
  }
}

export async function getAllCampaignsMetadata(): Promise<CampaignMetadata[]> {
  try {
    const response = await fetch(`${API_URL}/campaigns`);
    if (!response.ok) {
      throw new Error('Failed to fetch all campaigns metadata');
    }

    const results = await response.json();
    return results.map((result: any) => ({
      onChainId: result.on_chain_id,
      title: result.title,
      tagline: result.tagline,
      category: result.category,
      story: result.story,
      location: result.location,
      coverImageUrl: result.cover_image_url,
      canonicalHash: result.canonical_hash,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    }));
  } catch (error) {
    console.error("Error fetching all campaigns:", error);
    return [];
  }
}

/**
 * Validates off-chain Supabase PostgreSQL campaign story against immutable on-chain metadataHash.
 */
export async function verifyCampaignIntegrity(
  onChainId: number,
  onChainHash: string
): Promise<IntegrityVerificationResult> {
  try {
    const response = await fetch(`${API_URL}/campaigns/${onChainId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch campaign integrity data');
    }

    const { integrity } = await response.json();
    return {
      target: "campaign_metadata",
      onChainHash: integrity.onChainHash,
      computedHash: integrity.calculatedHash,
      isMatch: !integrity.isTampered,
      status: integrity.status || (integrity.isTampered ? "TAMPER_DETECTED" : "TAMPER_FREE"),
      details: integrity.details,
    };
  } catch (error) {
    return {
      target: "campaign_metadata",
      onChainHash,
      computedHash: "",
      isMatch: false,
      status: "TAMPER_DETECTED",
      details: "Failed to verify integrity with backend.",
    };
  }
}
