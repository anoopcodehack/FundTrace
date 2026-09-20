"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';
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
  FileText
} from 'lucide-react';

export default function CreatorCampaignsPage() {
  // Only show campaigns belonging to the creator role in the demo (address 0x709...)
  const CREATOR_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const myCampaigns = MOCK_CAMPAIGNS_ONCHAIN.filter(c => c.creator.toLowerCase() === CREATOR_ADDRESS.toLowerCase());

  const getStatusBadge = (state: CampaignState) => {
    switch(state) {
      case CampaignState.PendingVerification:
        return <span className="inline-flex px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">Pending Verification</span>;
      case CampaignState.Verified:
        return <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">Verified - Funding</span>;
      case CampaignState.FundingClosed:
        return <span className="inline-flex px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Funding Goal Met</span>;
      default:
        return <span className="inline-flex px-2.5 py-1 bg-stone-100 text-stone-800 text-xs font-bold rounded-full">Unknown</span>;
    }
  };

  return (
    <RoleGuard allowedRoles={["CREATOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/portfolio/creator" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Creator Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">My Campaigns</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">My Campaigns</h1>
              <p className="text-stone-600 font-medium mt-2">Manage your campaigns, track funding progress, and request funds.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/create" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Campaign
              </Link>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6">
            {myCampaigns.map(c => {
              const meta = MOCK_CAMPAIGNS_METADATA[c.id];
              const raised = Number(c.totalDonatedWei);
              const goal = Number(c.goalWei);
              const progress = Math.min(100, Math.round((raised / goal) * 100));
              
              // Financials
              const allocated = Number(c.totalAllocatedWei);
              const sanctioned = Number(c.totalSanctionedWei);
              const claimed = Number(c.totalClaimedWei);
              const remainingToClaim = sanctioned - claimed;
              const remainingToAllocate = raised - allocated;

              return (
                <div key={c.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
                  
                  {/* Campaign Image/Info */}
                  <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-stone-100 flex flex-col">
                    <div className="h-48 bg-stone-200 relative overflow-hidden">
                      {meta?.coverImageUrl ? (
                        <img src={meta.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">No Image</div>
                      )}
                      <div className="absolute top-4 right-4 shadow-sm">
                        {getStatusBadge(c.state)}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h2 className="text-xl font-black font-display text-stone-900 leading-tight mb-2">{meta?.title || `Campaign #${c.id}`}</h2>
                        <p className="text-sm text-stone-500 font-medium line-clamp-2">{meta?.tagline}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-stone-100 flex gap-2">
                        <Link href={`/campaigns/${c.id}`} className="flex-1 flex justify-center items-center gap-2 text-xs font-bold text-stone-600 bg-stone-100 px-4 py-2 rounded-lg hover:bg-stone-200 transition-colors">
                          <Eye className="w-4 h-4" /> View Public
                        </Link>
                        {c.state === CampaignState.FundingClosed && (
                          <Link href="/portfolio/creator/requests" className="flex-1 flex justify-center items-center gap-2 text-xs font-bold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                            <FileText className="w-4 h-4" /> Request Funds
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
            
            {myCampaigns.length === 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                  <Activity className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black font-display text-stone-900 mb-2">No Campaigns Found</h3>
                <p className="text-stone-500 max-w-md mx-auto mb-6">You haven't created any campaigns yet. Start your first funding initiative.</p>
                <Link href="/create" className="inline-flex px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                  Create Campaign
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
