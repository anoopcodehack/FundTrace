"use client";

import React, { useState } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_CAMPAIGNS_ONCHAIN, MOCK_CAMPAIGNS_METADATA } from '@/lib/mock';
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
  Filter
} from 'lucide-react';

export default function AdminCampaignsPage() {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredCampaigns = MOCK_CAMPAIGNS_ONCHAIN.filter(c => {
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
              <p className="text-stone-600 font-medium mt-2">Verify, reject, or audit campaigns submitted by creators.</p>
            </div>
          </header>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-stone-50">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="Search campaigns..." 
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-stone-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <Filter className="w-4 h-4 text-stone-500" />
                <select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Campaigns</option>
                  <option value="PENDING">Pending Verification</option>
                  <option value="ACTIVE">Verified / Funded</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/50 border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500 font-bold">
                    <th className="p-4 whitespace-nowrap">Campaign</th>
                    <th className="p-4 whitespace-nowrap">Creator</th>
                    <th className="p-4 whitespace-nowrap text-right">Goal (FTU)</th>
                    <th className="p-4 whitespace-nowrap text-right">Raised</th>
                    <th className="p-4 whitespace-nowrap">Status</th>
                    <th className="p-4 whitespace-nowrap text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCampaigns.map(c => {
                    const meta = MOCK_CAMPAIGNS_METADATA[c.id];
                    return (
                      <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-stone-200 overflow-hidden flex-shrink-0">
                              {meta?.coverImageUrl ? (
                                <img src={meta.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-indigo-100" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-stone-900 text-sm">{meta?.title || `Campaign #${c.id}`}</p>
                              <p className="text-xs text-stone-500 font-mono mt-0.5">ID: {c.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-mono text-stone-600 bg-stone-100 px-2 py-1 rounded">
                            {c.creator.slice(0, 6)}...{c.creator.slice(-4)}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-stone-900">
                          {formatFtu(c.goalWei)}
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-bold text-emerald-700">{formatFtu(c.totalDonatedWei)}</span>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(c.state)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Link 
                              href={`/campaigns/${c.id}`} 
                              target="_blank"
                              className="p-1.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="View Public Page"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            
                            {c.state === CampaignState.PendingVerification ? (
                              <button className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
                                Review
                              </button>
                            ) : (
                              <button className="text-xs font-bold bg-stone-100 text-stone-600 px-3 py-1.5 rounded-md hover:bg-stone-200 transition-colors">
                                Audit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCampaigns.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-500 font-medium">
                        No campaigns found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
