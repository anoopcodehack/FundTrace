"use client";

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { useWallet } from '@/context/WalletContext';
import { getFundTraceContract } from '@/lib/contract';
import { MOCK_CAMPAIGNS_ONCHAIN, MOCK_CAMPAIGNS_METADATA } from '@/lib/mock';
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
  Clock
} from 'lucide-react';

interface CreatorCampaign {
  id: number | string;
  onChainId?: number | null;
  creator: string;
  state: CampaignState;
  goalWei: string | number;
  totalDonatedWei: string | number;
  totalSanctionedWei: string | number;
  totalAllocatedWei: string | number;
  totalClaimedWei: string | number;
  title: string;
  tagline: string;
  coverImageUrl?: string;
  isPendingVerification?: boolean;
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
      const seenIds = new Set<string | number>();

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

      // 2. Fetch contract instance
      let contract: any = null;
      let count = 0;
      try {
        contract = getFundTraceContract();
        count = Number(await contract.campaignCount());
      } catch (chainErr) {
        console.warn("Could not read contract campaigns:", chainErr);
      }

      // Process DB campaigns matching creator
      for (const db of dbCampaigns) {
        const dbCreator = (db.creator_address || "").toLowerCase();
        const isMatch = dbCreator === currentAddress || 
          (currentAddress === DEMO_CREATOR.toLowerCase() && (!dbCreator || dbCreator === DEMO_CREATOR.toLowerCase()));

        if (isMatch) {
          const onChainId = Number(db.on_chain_id);
          let state = CampaignState.PendingVerification;
          let goalWei: string | number = "10000000000000000000000"; // default 10k FTU
          let totalDonatedWei: string | number = "0";
          let totalSanctionedWei: string | number = "0";
          let totalAllocatedWei: string | number = "0";
          let totalClaimedWei: string | number = "0";

          // If confirmed on-chain, read live financials
          if (onChainId > 0 && contract && onChainId <= count) {
            try {
              const c = await contract.getCampaign(onChainId);
              state = Number(c.state) as CampaignState;
              goalWei = c.goal.toString();
              totalDonatedWei = c.totalDonated.toString();
              totalSanctionedWei = c.totalSanctioned.toString();
              totalAllocatedWei = c.totalAllocated.toString();
              totalClaimedWei = c.totalClaimed.toString();
            } catch (err) {
              console.warn(`Could not read on-chain data for campaign ${onChainId}`, err);
            }
          }

          const campaignId = onChainId > 0 ? onChainId : db.id;
          seenIds.add(campaignId);
          seenIds.add(db.id);
          if (onChainId > 0) seenIds.add(onChainId);

          items.push({
            id: campaignId,
            onChainId: onChainId > 0 ? onChainId : null,
            creator: db.creator_address || currentAddress,
            state,
            goalWei,
            totalDonatedWei,
            totalSanctionedWei,
            totalAllocatedWei,
            totalClaimedWei,
            title: db.title || `Campaign #${campaignId}`,
            tagline: db.tagline || db.story || "Decentralized audited fund initiative",
            coverImageUrl: db.cover_image_url || "",
            isPendingVerification: onChainId <= 0 || state === CampaignState.PendingVerification
          });
        }
      }

      // 3. Process additional on-chain campaigns if any
      if (contract && count > 0) {
        for (let i = 1; i <= count; i++) {
          if (!seenIds.has(i)) {
            try {
              const c = await contract.getCampaign(i);
              if (c.creator.toLowerCase() === currentAddress) {
                const mockMeta = MOCK_CAMPAIGNS_METADATA[i];
                seenIds.add(i);
                items.push({
                  id: i,
                  onChainId: i,
                  creator: c.creator,
                  state: Number(c.state) as CampaignState,
                  goalWei: c.goal.toString(),
                  totalDonatedWei: c.totalDonated.toString(),
                  totalSanctionedWei: c.totalSanctioned.toString(),
                  totalAllocatedWei: c.totalAllocated.toString(),
                  totalClaimedWei: c.totalClaimed.toString(),
                  title: mockMeta?.title || `Campaign #${i}`,
                  tagline: mockMeta?.tagline || "Decentralized audited fund initiative",
                  coverImageUrl: mockMeta?.coverImageUrl || "",
                  isPendingVerification: Number(c.state) === CampaignState.PendingVerification
                });
              }
            } catch (e) {
              console.error(`Error reading campaign #${i}:`, e);
            }
          }
        }
      }

      // 4. Merge recently created campaigns from localStorage (in case backend is caching)
      try {
        const localSaved = JSON.parse(localStorage.getItem("fundtrace_created_campaigns") || "[]");
        for (const local of localSaved) {
          if (!seenIds.has(local.id) && !items.some(it => it.title.toLowerCase() === local.title?.toLowerCase())) {
            items.unshift({
              id: local.id,
              onChainId: null,
              creator: local.creator || currentAddress,
              state: CampaignState.PendingVerification,
              goalWei: local.goalWei || "10000000000000000000000",
              totalDonatedWei: "0",
              totalSanctionedWei: "0",
              totalAllocatedWei: "0",
              totalClaimedWei: "0",
              title: local.title,
              tagline: local.tagline || "",
              coverImageUrl: local.coverImageUrl || "",
              isPendingVerification: true
            });
            seenIds.add(local.id);
          }
        }
      } catch (localErr) {
        console.warn("Could not read local campaigns:", localErr);
      }

      // 5. If user is in demo mode or default creator, also append the demo mock campaigns so they are always accessible
      if (currentAddress === DEMO_CREATOR.toLowerCase() || !wallet.address) {
        const demoMocks = MOCK_CAMPAIGNS_ONCHAIN
          .filter(c => c.creator.toLowerCase() === DEMO_CREATOR.toLowerCase() && !seenIds.has(c.id))
          .map(c => {
            const meta = MOCK_CAMPAIGNS_METADATA[c.id];
            return {
              id: c.id,
              onChainId: c.id,
              creator: c.creator,
              state: c.state,
              goalWei: c.goalWei,
              totalDonatedWei: c.totalDonatedWei,
              totalSanctionedWei: c.totalSanctionedWei,
              totalAllocatedWei: c.totalAllocatedWei,
              totalClaimedWei: c.totalClaimedWei,
              title: meta?.title || `Campaign #${c.id}`,
              tagline: meta?.tagline || "",
              coverImageUrl: meta?.coverImageUrl || "",
              isPendingVerification: c.state === CampaignState.PendingVerification
            };
          });
        items.push(...demoMocks);
      }

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
      case CampaignState.FundingClosed:
        return <span className="inline-flex px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Funding Goal Met</span>;
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
            <div className="flex gap-3">
              <button
                onClick={loadCreatorCampaigns}
                disabled={isLoading}
                className="px-4 py-2.5 border border-stone-300 bg-white text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition-colors shadow-sm flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                title="Refresh campaigns"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link href="/creator/create" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 text-sm">
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
              {campaigns.map(c => {
                const raised = Number(c.totalDonatedWei);
                const goal = Number(c.goalWei);
                const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
                
                // Financials
                const allocated = Number(c.totalAllocatedWei);
                const sanctioned = Number(c.totalSanctionedWei);
                const claimed = Number(c.totalClaimedWei);
                const remainingToClaim = sanctioned - claimed;
                const remainingToAllocate = Math.max(0, raised - allocated);

                return (
                  <div key={c.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
                    
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
                        <div className="mt-4 pt-4 border-t border-stone-100 flex gap-2">
                          <Link href={`/creator/campaigns/${c.id}`} className="flex-1 flex justify-center items-center gap-2 text-xs font-bold text-stone-700 bg-stone-100 px-4 py-2 rounded-lg hover:bg-stone-200 transition-colors">
                            <Eye className="w-4 h-4" /> Manage Campaign
                          </Link>
                          {c.state === CampaignState.FundingClosed && (
                            <Link href={`/creator/campaigns/${c.id}/quotation`} className="flex-1 flex justify-center items-center gap-2 text-xs font-bold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                              <FileText className="w-4 h-4" /> Submit Quotation
                            </Link>
                          )}
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
                          
                          <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                            <p className="text-xs font-bold text-stone-500 mb-1">Allocated</p>
                            <p className="text-lg font-black font-mono text-stone-900">{formatFtu(allocated)}</p>
                            <p className="text-[10px] text-stone-400 uppercase mt-1 font-bold tracking-wide">In Quotations</p>
                          </div>
                          
                          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                            <p className="text-xs font-bold text-blue-600 mb-1">Sanctioned</p>
                            <p className="text-lg font-black font-mono text-blue-900">{formatFtu(sanctioned)}</p>
                            <p className="text-[10px] text-blue-500/70 uppercase mt-1 font-bold tracking-wide">Approved by Donors</p>
                          </div>

                          <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                            <p className="text-xs font-bold text-purple-600 mb-1">Claimed</p>
                            <p className="text-lg font-black font-mono text-purple-900">{formatFtu(claimed)}</p>
                            <p className="text-[10px] text-purple-500/70 uppercase mt-1 font-bold tracking-wide">Transferred to Wallet</p>
                          </div>

                          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                            <p className="text-xs font-bold text-emerald-600 mb-1">Available</p>
                            <p className="text-lg font-black font-mono text-emerald-900">{formatFtu(remainingToAllocate)}</p>
                            <p className="text-[10px] text-emerald-500/70 uppercase mt-1 font-bold tracking-wide">To be Requested</p>
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
