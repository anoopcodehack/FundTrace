"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_CAMPAIGNS_ONCHAIN, MOCK_CAMPAIGNS_METADATA } from '@/lib/mock';
import { formatFtu, CampaignState } from '@/types';
import Link from 'next/link';
import { 
  ChevronRight,
  TrendingUp,
  Heart,
  BarChart3,
  ArrowUpRight,
  PieChart
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

export default function DonorContributionsPage() {
  const { wallet } = useWallet();
  const address = wallet.address;
  // Assume Alice is 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  const activeAddress = address || "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  
  // For demo, assume Alice contributed 155000 FTU to campaign 1
  const myContributions = [
    { campaignId: 1, amountFtu: 155000 }
  ];

  const totalContributed = myContributions.reduce((acc, c) => acc + c.amountFtu, 0);

  const getStatusBadge = (state: CampaignState) => {
    switch(state) {
      case CampaignState.Verified:
        return <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">Funding Active</span>;
      case CampaignState.FundingClosed:
        return <span className="inline-flex px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Executing / Funded</span>;
      default:
        return <span className="inline-flex px-2.5 py-1 bg-stone-100 text-stone-800 text-xs font-bold rounded-full">Unknown</span>;
    }
  };

  return (
    <RoleGuard allowedRoles={["DONOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/portfolio/donor" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Donor Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">My Contributions</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Impact Portfolio</h1>
              <p className="text-stone-600 font-medium mt-2">Track the campaigns you've funded and monitor your voting weight.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/campaigns" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
                <Heart className="w-4 h-4" /> Explore Campaigns
              </Link>
            </div>
          </header>

          {/* Aggregate Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 p-6 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Total Contributed</h3>
                <span className="text-3xl font-black font-bebas text-stone-900">{formatFtu(totalContributed)}</span>
                <p className="text-xs text-stone-500 mt-2">Across all time.</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 p-6 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Campaigns Funded</h3>
                <span className="text-3xl font-black font-bebas text-stone-900">{myContributions.length}</span>
                <p className="text-xs text-stone-500 mt-2">Active initiatives.</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 p-6 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Avg Voting Weight</h3>
                <span className="text-3xl font-black font-bebas text-stone-900">46.9%</span>
                <p className="text-xs text-stone-500 mt-2">High influence in active campaigns.</p>
              </div>
            </div>
          </div>

          {/* Campaign List */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black font-bebas uppercase flex items-center gap-2 text-stone-800">
              <BarChart3 className="w-5 h-5 text-indigo-500" /> Active Investments
            </h2>
            
            {myContributions.map((contrib, idx) => {
              const onchain = MOCK_CAMPAIGNS_ONCHAIN.find(c => c.id === contrib.campaignId);
              const meta = MOCK_CAMPAIGNS_METADATA[contrib.campaignId];
              
              if (!onchain) return null;

              const totalRaised = Number(onchain.totalDonatedWei);
              const weight = totalRaised > 0 ? ((contrib.amountFtu / totalRaised) * 100).toFixed(1) : "0.0";

              return (
                <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
                  
                  {/* Campaign Image/Info */}
                  <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-stone-100 flex flex-col">
                    <div className="h-40 bg-stone-200 relative overflow-hidden">
                      {meta?.coverImageUrl ? (
                        <img src={meta.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">No Image</div>
                      )}
                      <div className="absolute top-4 right-4 shadow-sm">
                        {getStatusBadge(onchain.state)}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold font-display text-stone-900 leading-tight mb-2">{meta?.title}</h3>
                        <p className="text-sm text-stone-500 font-medium line-clamp-2">{meta?.tagline}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contribution Stats */}
                  <div className="md:w-2/3 p-6 flex flex-col justify-between">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Your Contribution</p>
                        <p className="text-2xl font-black font-mono text-emerald-700">{formatFtu(contrib.amountFtu)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Your Voting Weight</p>
                        <p className="text-2xl font-black font-mono text-stone-900">{weight}%</p>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Campaign Raised</p>
                        <p className="text-2xl font-black font-mono text-stone-500">{formatFtu(totalRaised)}</p>
                      </div>
                    </div>

                    <div className="border-t border-stone-100 pt-6 flex flex-wrap gap-4">
                      <Link href={`/portfolio/donor/tracking?campaignId=${contrib.campaignId}`} className="px-5 py-2.5 bg-stone-900 text-white text-sm font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Track Fund Flow
                      </Link>
                      <Link href={`/portfolio/donor/approvals`} className="px-5 py-2.5 bg-white border border-stone-200 text-stone-700 text-sm font-bold rounded-lg hover:bg-stone-50 transition-colors shadow-sm flex items-center gap-2">
                        View Pending Requests
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
