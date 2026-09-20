/**
 * Frontend service for per-donor automation settings.
 *
 * Automation preference is stored off-chain in Supabase (via NestJS API).
 * The on-chain enableAutomation/disableAutomation functions are called separately
 * for blockchain audit trail, but the policy details (maxAutoAmount, etc.) live here.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface DonorAutomationSetting {
  campaignId: number;
  donorAddress: string;
  isEnabled: boolean;
  maxAutoAmount: number;          // FTU ceiling for auto-sanction
  requireManualHighRisk: boolean; // Force manual for HIGH risk AI output
  autoRejectFraud: boolean;       // Auto-reject HIGH risk + REJECT recommendation
  updatedAt?: string;
}

/**
 * Fetch automation setting for a donor + campaign pair.
 * Returns defaults (isEnabled=false) if no setting exists yet.
 */
export async function getDonorAutomationSetting(
  campaignId: number,
  donorAddress: string
): Promise<DonorAutomationSetting> {
  try {
    const res = await fetch(
      `${API_URL}/automation/settings?campaignId=${campaignId}&donorAddress=${donorAddress}`
    );
    if (!res.ok) {
      return defaultSetting(campaignId, donorAddress);
    }
    return await res.json();
  } catch {
    return defaultSetting(campaignId, donorAddress);
  }
}

/**
 * Save (upsert) a donor's automation setting for a campaign.
 */
export async function upsertDonorAutomationSetting(
  setting: DonorAutomationSetting
): Promise<DonorAutomationSetting> {
  const res = await fetch(`${API_URL}/automation/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': setting.donorAddress,
    },
    body: JSON.stringify(setting),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to save automation setting' }));
    throw new Error(err.message || 'Failed to save automation setting');
  }

  return res.json();
}

/**
 * Fetch all donor automation settings for a campaign (admin/creator view).
 */
export async function getCampaignDonorSettings(
  campaignId: number
): Promise<DonorAutomationSetting[]> {
  try {
    const res = await fetch(`${API_URL}/automation/settings/campaign/${campaignId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function defaultSetting(campaignId: number, donorAddress: string): DonorAutomationSetting {
  return {
    campaignId,
    donorAddress,
    isEnabled: false,
    maxAutoAmount: 10000,
    requireManualHighRisk: true,
    autoRejectFraud: true,
  };
}
