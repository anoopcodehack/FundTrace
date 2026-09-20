"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_CAMPAIGNS_ONCHAIN, MOCK_LEDGER_EVENTS } from '@/lib/mock';
import { formatFtu, CampaignState } from '@/types';
import Link from 'next/link';
import { 
  BarChart3, 
  Activity, 
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Users
} from 'lucide-react';

export default function AdminDashboardPage() {
  const totalCampaigns = MOCK_CAMPAIGNS_ONCHAIN.length;
  const pendingVerification = MOCK_CAMPAIGNS_ONCHAIN.filter(c => c.state === CampaignState.PendingVerification).length;
  const activeCampaigns = MOCK_CAMPAIGNS_ONCHAIN.filter(c => c.state === CampaignState.Verified || c.state === CampaignState.FundingClosed).length;
  
  const totalRaised = MOCK_CAMPAIGNS_ONCHAIN.reduce((acc, c) => acc + Number(c.totalDonatedWei), 0);
  const totalAllocated = MOCK_CAMPAIGNS_ONCHAIN.reduce((acc, c) => acc + Number(c.totalAllocatedWei), 0);
  const totalClaimed = MOCK_CAMPAIGNS_ONCHAIN.reduce((acc, c) => acc + Number(c.totalClaimedWei), 0);

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Platform Overview</h1>
              <p className="text-stone-600 font-medium mt-2">Global administrative dashboard and metrics.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/campaigns" className="px-6 py-2.5 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-sm">
                Manage Campaigns
              </Link>
            </div>
          </header>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Activity className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Campaigns</span>
              </div>
              <div>
                <h3 className="text-4xl font-black font-bebas tracking-wide">{totalCampaigns}</h3>
                <p className="text-sm text-stone-500 font-medium mt-1">{activeCampaigns} Active</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Pending Verification</span>
              </div>
              <div>
                <h3 className="text-4xl font-black font-bebas tracking-wide">{pendingVerification}</h3>
                <p className="text-sm text-stone-500 font-medium mt-1">Requires admin review</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Raised</span>
              </div>
              <div>
                <h3 className="text-4xl font-black font-bebas tracking-wide text-emerald-700">{formatFtu(totalRaised)}</h3>
                <p className="text-sm text-stone-500 font-medium mt-1">Across all campaigns</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Claimed</span>
              </div>
              <div>
                <h3 className="text-4xl font-black font-bebas tracking-wide text-purple-700">{formatFtu(totalClaimed)}</h3>
                <p className="text-sm text-stone-500 font-medium mt-1">{formatFtu(totalAllocated)} Allocated</p>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* System Health / Alerts */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 p-6 shadow-sm">
                <h2 className="text-2xl font-black font-bebas uppercase flex items-center gap-2 mb-6 border-b border-stone-100 pb-4">
                  <Activity className="w-5 h-5 text-indigo-500" /> System Health
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-700 text-sm">Blockchain Node</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">ONLINE (Hardhat)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-700 text-sm">NestJS Backend</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">ONLINE</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-700 text-sm">AI Subsystem</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">READY</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-700 text-sm">Supabase Database</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">CONNECTED</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-100">
                  <Link href="/admin/system" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                    View Detailed Status &rarr;
                  </Link>
                </div>
              </div>

              {/* AI Risk Alerts Mock */}
              <div className="bg-red-50/50 backdrop-blur-sm rounded-2xl border border-red-100 p-6 shadow-sm">
                <h2 className="text-2xl font-black font-bebas text-red-900 uppercase flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600" /> Action Items
                </h2>
                <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-stone-800">1 Campaign Requires Verification</p>
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 animate-pulse"></span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">Review pending campaigns before they can accept funds.</p>
                  <Link href="/admin/campaigns" className="text-xs font-bold text-red-600 mt-3 inline-block hover:underline">Verify Now</Link>
                </div>
              </div>
            </div>

            {/* Recent Blockchain Activity */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 p-6 shadow-sm h-full">
                <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-4">
                  <h2 className="text-2xl font-black font-bebas uppercase flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-stone-600" /> Recent Blockchain Activity
                  </h2>
                  <Link href="/admin/ledger" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                    View Full Ledger
                  </Link>
                </div>

                <div className="space-y-4">
                  {MOCK_LEDGER_EVENTS.slice(0, 5).map((ev, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl border border-stone-100 hover:bg-stone-50 transition-colors group">
                      <div className="hidden sm:flex flex-col items-center justify-center bg-stone-100 w-12 h-12 rounded-lg text-stone-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-stone-900">{ev.eventName}</h4>
                          <span className="text-xs font-mono text-stone-400">Block {ev.blockNumber}</span>
                        </div>
                        <div className="text-xs text-stone-500 mt-1 truncate max-w-[200px] sm:max-w-md font-mono">
                          Tx: {ev.transactionHash}
                        </div>
                        <div className="text-xs text-stone-400 mt-2">
                          {new Date(ev.timestamp || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {MOCK_LEDGER_EVENTS.length === 0 && (
                    <p className="text-sm text-stone-500 text-center py-8">No recent activity detected on-chain.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
