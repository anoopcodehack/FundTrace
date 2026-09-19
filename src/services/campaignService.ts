import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";
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

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.from("campaigns").upsert(
        {
          on_chain_id: data.onChainId,
          title: data.title,
          tagline: data.tagline || "",
          category: data.category,
          story: data.story,
          location: data.location || "Global",
          cover_image_url: data.coverImageUrl || "",
          canonical_hash: canonicalHash,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "on_chain_id" }
      );
    } catch (e) {
      console.warn("Supabase campaign save fallback:", e);
    }
  }

  return record;
}

export async function getCampaignMetadata(onChainId: number): Promise<CampaignMetadata | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("on_chain_id", onChainId)
        .single();

      if (data && !error) {
        return {
          onChainId: data.on_chain_id,
          title: data.title,
          tagline: data.tagline,
          category: data.category,
          story: data.story,
          location: data.location,
          coverImageUrl: data.cover_image_url,
          canonicalHash: data.canonical_hash,
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn("Supabase campaign get fallback:", e);
    }
  }

  return memoryCampaigns.get(onChainId) || null;
}

export async function getAllCampaignsMetadata(): Promise<CampaignMetadata[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from("campaigns").select("*");
      if (data && !error && data.length > 0) {
        return data.map((d: any) => ({
          onChainId: d.on_chain_id,
          title: d.title,
          tagline: d.tagline,
          category: d.category,
          story: d.story,
          location: d.location,
          coverImageUrl: d.cover_image_url,
          canonicalHash: d.canonical_hash,
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn("Supabase get all campaigns fallback:", e);
    }
  }

  return Array.from(memoryCampaigns.values());
}

/**
 * Validates off-chain Supabase PostgreSQL campaign story against immutable on-chain metadataHash.
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
      details: "Metadata record missing from Supabase database",
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
