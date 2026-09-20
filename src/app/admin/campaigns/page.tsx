"use client";

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { formatFtu, CampaignState } from '@/types';
import Link from 'next/link';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  Eye, 
  ShieldAlert, 
  ShieldCheck, 
  ChevronRight, 
  Filter,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { getFundTraceContract } from '@/lib/contract';
import { ethers } from 'ethers';

function parseAmount(val: any): number {
  if (!val) return 0;
  const str = val.toString();
  if (str.length > 12) {
    try {
      return parseFloat(Number(ethers.formatEther(val)).toFixed(4));
    } catch {
      return Number(str);
    }
  }
  return Number(str);
}

export default function AdminCampaignsPage() {
  const [filter, setFilter] = useState<string>('ALL');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      // Fetch DB metadata from Supabase
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/campaigns`);
      const dbCampaigns = res.ok ? await res.json() : [];

      const contract = getFundTraceContract();
      let count = 0;
      try {
        count = Number(await contract.campaignCount());
      } catch {}

      const items: any[] = [];
      const seenOnChainIds = new Set<number>();

      for (let i = 1; i <= count; i++) {
        seenOnChainIds.add(i);
        try {
          const c = await contract.getCampaign(i);
          if (!c.creator || c.creator === ethers.ZeroAddress) continue;

          const meta = dbCampaigns.find((db: any) => Number(db.on_chain_id) === i);
          items.push({
            id: i,
            onChainId: i,
            title: meta?.title || `Campaign #${i}`,
            category: meta?.category || 'Community',
            creator: c.creator,
            verifier: c.verifier,
            goalFtu: parseAmount(c.goal),
            raisedFtu: parseAmount(c.totalDonated),
            state: Number(c.state) as CampaignState,
            coverImageUrl: meta?.cover_image_url || ''
          });
        } catch (err) {
          console.warn(`Error reading campaign #${i}:`, err);
        }
      }

      // Add any pending Supabase campaigns not yet on-chain
      for (const db of dbCampaigns) {
        const oId = Number(db.on_chain_id || 0);
        if (!seenOnChainIds.has(oId)) {
          items.push({
            id: db.id,
            onChainId: oId,
            title: db.title,
            category: db.category || 'Community',
            creator: db.creator_address || 'Pending',
            verifier: db.verifier_address || 'Pending',
            goalFtu: db.goal_ftu || 10000,
            raisedFtu: 0,
            state: CampaignState.PendingVerification,
            coverImageUrl: db.cover_image_url || ''
          });
        }
      }

      setCampaigns(items);
    } catch (err) {
      console.error('Failed to load campaigns for admin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(c.id).includes(searchQuery);
    if (!matchesSearch) return false;
    if (filter === 'PENDING') return c.state === CampaignState.PendingVerification;
    if (filter === 'ACTIVE') return c.state === CampaignState.Verified || c.state === CampaignState.FundingClosed;
    return true;
  });

  const getStatusBadge = (state: CampaignState) => {
    switch(state) {
      case CampaignState.PendingVerification:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full"><ShieldAlert className="w-3 h-3"/> Pending</span>;
      case CampaignState.Verified:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full"><ShieldCheck className="w-3 h-3"/> Verified</span>;
      case CampaignState.FundingClosed:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full"><CheckCircle2 className="w-3 h-3"/> Funded</span>;
      case CampaignState.Rejected:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full"><XCircle className="w-3 h-3"/> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-800 text-xs font-bold rounded-full">Unknown</span>;
    }
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/admin" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Admin</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Campaigns</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Campaign Verification</h1>
              <p className="text-stone-600 font-medium mt-2">
                Live campaign records fetched directly from Supabase and verified on-chain.
              </p>
            </div>
            <button
              onClick={loadCampaigns}
              disabled={isLoading}
              className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors shadow-sm flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} /> Refresh
            </button>
          </header>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-stone-50">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="Search Supabase campaigns..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <Filter className="w-4 h-4 text-stone-500" />
                <select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Campaigns ({campaigns.length})</option>
                  <option value="PENDING">Pending Verification</option>
                  <option value="ACTIVE">Verified / Funded</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-stone-900" />
                <p className="text-xs font-mono font-bold uppercase text-stone-400">Loading Supabase campaigns...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50/50 border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500 font-bold">
                      <th className="p-4 whitespace-nowrap">Campaign</th>
                      <th className="p-4 whitespace-nowrap">Creator</th>
                      <th className="p-4 whitespace-nowrap text-right">Goal</th>
                      <th className="p-4 whitespace-nowrap text-right">Raised</th>
                      <th className="p-4 whitespace-nowrap">Status</th>
                      <th className="p-4 whitespace-nowrap text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-stone-200 overflow-hidden flex-shrink-0">
                              {c.coverImageUrl ? (
                                <img src={c.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-indigo-100" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-stone-900 text-sm">{c.title}</p>
                              <p className="text-xs text-stone-500 font-mono mt-0.5">ID: #{c.id} · {c.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-mono text-stone-600 bg-stone-100 px-2 py-1 rounded-md">
                            {c.creator?.slice(0, 6)}...{c.creator?.slice(-4)}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black font-bebas text-stone-900 text-lg">
                          {formatFtu(c.goalFtu)}
                        </td>
                        <td className="p-4 text-right font-black font-bebas text-emerald-600 text-lg">
                          {formatFtu(c.raisedFtu)}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(c.state)}
                        </td>
                        <td className="p-4 text-center">
                          <Link 
                            href={`/campaigns/${c.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {filteredCampaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-stone-500 font-medium text-sm">
                          No matching campaigns found in Supabase.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
