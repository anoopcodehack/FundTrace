"use client";

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { useWallet } from '@/context/WalletContext';
import { ethers } from 'ethers';
import { 
  getFundTraceContract,
  getStoredAnchoredMap,
  saveStoredAnchoredId,
  saveStoredAllottedId,
  isCampaignAllotted
} from '@/lib/contract';
import { formatFtu, CampaignState } from '@/types';
import Link from 'next/link';
import { 
  Plus,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Clock,
  UploadCloud
} from 'lucide-react';

interface CreatorCampaign {
  id: number | string;
  onChainId?: number | null;
  creator: string;
  state: CampaignState;
  goalFtu: number;
  raisedFtu: number;
  sanctionedFtu: number;
  allocatedFtu: number;
  claimedFtu: number;
  title: string;
  tagline: string;
  coverImageUrl?: string;
  isPendingVerification?: boolean;
}

function parseFtuAmount(val: any): number {
  if (!val) return 0;
  const str = val.toString();
  if (str.length > 12) {
    try {
      const ethNum = parseFloat(ethers.formatEther(val));
      return Math.round(ethNum * 100000); // 1 ETH = 100,000 FTU
    } catch {
      return Number(str);
    }
  }
  return Number(str);
}

export default function CreatorCampaignsPage() {
  const { wallet } = useWallet();
  const [campaigns, setCampaigns] = useState<CreatorCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const DEMO_CREATOR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const currentAddress = (wallet.address || DEMO_CREATOR).toLowerCase();

  const loadCreatorCampaigns = async () => {
    setIsLoading(true);
    try {
      const items: CreatorCampaign[] = [];
      const seenItemIds = new Set<string | number>();
      const usedOnChainIds = new Set<number>();

      // 1. Fetch campaigns from DB (includes all created campaigns)
      let dbCampaigns: any[] = [];
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/campaigns`);
        if (res.ok) {
          dbCampaigns = await res.json();
        }
      } catch (e) {
        console.warn("Could not fetch DB campaigns:", e);
      }

      // 2. Fetch quotations to know exact allocated/sanctioned/claimed figures
      let dbQuotations: any[] = [];
      try {
        const qRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/quotations`);
        if (qRes.ok) dbQuotations = await qRes.json();
      } catch {}

      // 3. Fetch contract instance with timeout
      let contract: any = null;
      let count = 0;
      try {
        contract = getFundTraceContract();
        const countPromise = contract.campaignCount();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
        count = Number(await Promise.race([countPromise, timeoutPromise]));
      } catch (chainErr) {
        console.warn("Could not read contract campaigns (using Supabase records):", chainErr);
      }

      // If database and on-chain state are empty, purge obsolete localStorage cache
      if (dbCampaigns.length === 0 && count === 0 && typeof window !== "undefined") {
        try {
          localStorage.removeItem('fundtrace_created_campaigns');
          localStorage.removeItem('fundtrace_allotted_campaign_ids');
          localStorage.removeItem('fundtrace_anchored_campaign_map');
        } catch {}
      }

      // 4. Map DB campaigns first
      if (dbCampaigns.length > 0) {
        for (const db of dbCampaigns) {
          let onChainId = Number(db.on_chain_id);
          const storedAnchoredMap = getStoredAnchoredMap();
          if ((!onChainId || onChainId <= 0) && storedAnchoredMap[db.id?.toString()]) {
            onChainId = Number(storedAnchoredMap[db.id.toString()]);
          }

          // If onChainId has already been claimed by another campaign, don't duplicate
          if (onChainId > 0 && usedOnChainIds.has(onChainId)) {
            onChainId = 0;
          }

          let state = CampaignState.PendingVerification;
          const plannedBudgetSum = Array.isArray(db.planned_budget) 
            ? db.planned_budget.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0)
            : 0;
          let goalFtu = plannedBudgetSum > 0 ? plannedBudgetSum : (Number(db.goal_ftu) || 100000);
          let raisedFtu = Number(db.raised_ftu || 0);
          let sanctionedFtu = 0;
          let allocatedFtu = 0;
          let claimedFtu = 0;

          // If confirmed on-chain, read live financials
          if (onChainId > 0 && contract && onChainId <= count) {
            try {
              const c = await contract.getCampaign(onChainId);
              state = Number(c.state) as CampaignState;
              const contractGoal = parseFtuAmount(c.goal);
              if (contractGoal > 0) goalFtu = contractGoal;

              const contractRaised = parseFtuAmount(c.totalDonated);
              if (contractRaised > 0) raisedFtu = contractRaised;

              sanctionedFtu = parseFtuAmount(c.totalSanctioned);
              allocatedFtu = parseFtuAmount(c.totalAllocated);
              claimedFtu = parseFtuAmount(c.totalClaimed);
              usedOnChainIds.add(onChainId);
            } catch (err) {
              console.warn(`Could not read on-chain data for campaign ${onChainId}`, err);
            }
          }

          // Merge quotation financials from Supabase
          const campaignQuotes = dbQuotations.filter((q: any) => 
            Number(q.campaign_id) === Number(db.id) || 
            (onChainId > 0 && Number(q.campaign_id) === onChainId)
          );

          if (campaignQuotes.length > 0) {
            let qAllocated = 0;
            let qSanctioned = 0;
            let qClaimed = 0;

            for (const q of campaignQuotes) {
              const reqAmt = Number(q.requested_amount_ftu) || 0;
              const allocAmt = Number(q.allocated_amount_ftu) || (q.state !== 'DonorRejected' && q.state !== 'Pending' ? reqAmt : 0);
              const claimAmt = Number(q.claimed_amount_ftu) || (q.state === 'Claimed' || q.state === 'Completed' ? allocAmt : 0);

              qAllocated += allocAmt;
              if (['Claimable', 'Claimed', 'Completed', 'ProofPending', 'ProofSubmitted', 'DonorApproved', 'Sanctioned'].includes(q.state)) {
                qSanctioned += allocAmt;
              }
              qClaimed += claimAmt;
            }

            allocatedFtu = Math.max(allocatedFtu, qAllocated);
            sanctionedFtu = Math.max(sanctionedFtu, qSanctioned);
            claimedFtu = Math.max(claimedFtu, qClaimed);
          }

          const isAllotted = isCampaignAllotted(db.id) || (onChainId > 0 && isCampaignAllotted(onChainId)) || state === CampaignState.FundingClosed;
          if (isAllotted && state === CampaignState.PendingVerification) {
            state = CampaignState.FundingClosed;
            if (raisedFtu === 0) {
              raisedFtu = goalFtu;
            }
            // Note: allocatedFtu stays whatever has actually been requested in quotations (starts at 0)
          }

          const isPending = !isAllotted && (onChainId <= 0 || state === CampaignState.PendingVerification);
          const campaignKey = db.id;
          
          if (!seenItemIds.has(campaignKey)) {
            seenItemIds.add(campaignKey);
            items.push({
              id: campaignKey,
              onChainId: onChainId > 0 ? onChainId : null,
              creator: db.creator_address || currentAddress,
              state,
              goalFtu,
              raisedFtu,
              sanctionedFtu,
              allocatedFtu,
              claimedFtu,
              title: db.title || `Campaign #${campaignKey}`,
              tagline: db.tagline || db.story || "Decentralized audited fund initiative",
              coverImageUrl: db.cover_image_url || "",
              isPendingVerification: isPending
            });
          }
        }
      }

      // 5. Done processing campaigns (only display campaigns with verified database records)

      // 6. Clean up any obsolete local cache so state always reflects database
      try {
        localStorage.removeItem("fundtrace_created_campaigns");
      } catch {}

      setCampaigns(items);
    } catch (err) {
      console.error("Failed to load creator campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCreatorCampaigns();
  }, [currentAddress]);

  const getStatusBadge = (state: CampaignState, isPending?: boolean) => {
    if (state === CampaignState.FundingClosed) {
      return <span className="inline-flex px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">Funding Goal Met</span>;
    }
    if (isPending || state === CampaignState.PendingVerification) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300 shadow-sm">
          <Clock className="w-3 h-3 text-amber-600" /> Pending Verification
        </span>
      );
    }
    switch(state) {
      case CampaignState.Verified:
        return <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">Verified - Funding</span>;
      default:
        return <span className="inline-flex px-2.5 py-1 bg-stone-100 text-stone-800 text-xs font-bold rounded-full">Active</span>;
    }
  };

  return (
    <RoleGuard allowedRoles={["CREATOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/creator" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Creator Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">My Campaigns</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">My Campaigns</h1>
              <p className="text-stone-600 font-medium mt-2">Manage your campaigns, track funding progress, and request funds.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={loadCreatorCampaigns}
                disabled={isLoading}
                className="px-4 py-2.5 border border-stone-300 bg-white text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition-colors shadow-sm flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                title="Refresh campaigns"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link href="/creator/proof" className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2 text-sm">
                <UploadCloud className="w-4 h-4" /> Upload Proof
              </Link>
              <Link href="/creator/create" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> New Campaign
              </Link>
            </div>
          </header>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border border-stone-200">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-bold text-stone-500">Loading your campaigns...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {campaigns.map((c, index) => {
                const raised = Number(c.raisedFtu ?? (c as any).totalDonatedWei ?? 0) || 0;
                const goal = Number(c.goalFtu ?? (c as any).goalWei ?? 100000) || 100000;
                const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
                
                // Financials
                const allocated = Number(c.allocatedFtu ?? (c as any).totalAllocatedWei ?? 0) || 0;
                const sanctioned = Number(c.sanctionedFtu ?? (c as any).totalSanctionedWei ?? 0) || 0;
                const claimed = Number(c.claimedFtu ?? (c as any).totalClaimedWei ?? 0) || 0;
                const remainingToClaim = Math.max(0, sanctioned - claimed);
                const remainingToAllocate = Math.max(0, raised - allocated);

                return (
                  <div key={`creator-campaign-${c.id}-${index}`} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
                    
                    {/* Campaign Image/Info */}
                    <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-stone-100 flex flex-col">
                      <div className="h-48 bg-stone-200 relative overflow-hidden">
                        {c.coverImageUrl ? (
                          <img src={c.coverImageUrl} alt={c.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 font-medium">No Image</div>
                        )}
                        <div className="absolute top-4 right-4 shadow-sm">
                          {getStatusBadge(c.state, c.isPendingVerification)}
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <Link href={`/creator/campaigns/${c.id}`}>
                            <h2 className="text-xl font-black font-display text-stone-900 leading-tight mb-2 hover:text-indigo-600 transition-colors">{c.title}</h2>
                          </Link>
                          <p className="text-sm text-stone-500 font-medium line-clamp-2">{c.tagline}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap gap-2">
                          <Link href={`/creator/campaigns/${c.id}`} className="flex-1 min-w-[100px] flex justify-center items-center gap-1.5 text-xs font-bold text-stone-700 bg-stone-100 px-3 py-2 rounded-lg hover:bg-stone-200 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Manage
                          </Link>
                          {c.state === CampaignState.FundingClosed && (
                            <Link href={`/creator/campaigns/${c.id}/quotation`} className="flex-1 min-w-[100px] flex justify-center items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                              <FileText className="w-3.5 h-3.5" /> Quotation
                            </Link>
                          )}
                          <Link href={`/creator/proof`} className="flex-1 min-w-[110px] flex justify-center items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-lg transition-colors" title="Upload official vendor invoice proof">
                            <UploadCloud className="w-3.5 h-3.5 text-emerald-600" /> Upload Proof
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="md:w-2/3 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-bold text-stone-500 uppercase tracking-wider">Funding Progress</span>
                          <span className="text-2xl font-black font-bebas text-stone-900">{progress}%</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-3 mb-2 overflow-hidden">
                          <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-emerald-700 font-bold">{formatFtu(raised)} Raised</span>
                          <span className="text-stone-500">Goal: {formatFtu(goal)}</span>
                        </div>
                      </div>

                      <div className="mt-8">
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Fund Flow Distribution</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          
                          <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 min-w-0 overflow-hidden">
                            <p className="text-xs font-bold text-stone-500 mb-1 truncate">Allocated</p>
                            <p className="text-lg font-black font-mono text-stone-900 truncate" title={formatFtu(allocated)}>{formatFtu(allocated)}</p>
                            <p className="text-[10px] text-stone-400 uppercase mt-1 font-bold tracking-wide truncate">In Quotations</p>
                          </div>
                          
                          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 min-w-0 overflow-hidden">
                            <p className="text-xs font-bold text-blue-600 mb-1 truncate">Sanctioned</p>
                            <p className="text-lg font-black font-mono text-blue-900 truncate" title={formatFtu(sanctioned)}>{formatFtu(sanctioned)}</p>
                            <p className="text-[10px] text-blue-500/70 uppercase mt-1 font-bold tracking-wide truncate">Approved by Donors</p>
                          </div>

                          <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100 min-w-0 overflow-hidden">
                            <p className="text-xs font-bold text-purple-600 mb-1 truncate">Claimed</p>
                            <p className="text-lg font-black font-mono text-purple-900 truncate" title={formatFtu(claimed)}>{formatFtu(claimed)}</p>
                            <p className="text-[10px] text-purple-500/70 uppercase mt-1 font-bold tracking-wide truncate">Transferred to Wallet</p>
                          </div>

                          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 min-w-0 overflow-hidden">
                            <p className="text-xs font-bold text-emerald-600 mb-1 truncate">Available</p>
                            <p className="text-lg font-black font-mono text-emerald-900 truncate" title={formatFtu(remainingToAllocate)}>{formatFtu(remainingToAllocate)}</p>
                            <p className="text-[10px] text-emerald-500/70 uppercase mt-1 font-bold tracking-wide truncate">To be Requested</p>
                          </div>

                        </div>
                      </div>

                    </div>

                  </div>
                );
              })}
              
              {campaigns.length === 0 && (
                <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                    <Activity className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black font-display text-stone-900 mb-2">No Campaigns Found</h3>
                  <p className="text-stone-500 max-w-md mx-auto mb-6">You haven't created any campaigns yet. Start your first funding initiative.</p>
                  <Link href="/creator/create" className="inline-flex px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                    Create Campaign
                  </Link>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </RoleGuard>
  );
}
