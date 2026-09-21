"use client";

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { formatFtu, CampaignState } from '@/types';
import { isCampaignAllotted } from '@/lib/contract';
import Link from 'next/link';
import { 
  BarChart3, 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Loader2, 
  RefreshCw, 
  Sparkles,
  Trash2
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [usersCount, setUsersCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const api = '/api';
      
      const [cRes, eRes, uRes] = await Promise.allSettled([
        fetch(`${api}/campaigns`).then(r => r.ok ? r : fetch('http://localhost:3001/api/campaigns')),
        fetch(`${api}/ledger`).then(r => r.ok ? r : fetch('http://localhost:3001/api/ledger')),
        fetch(`${api}/users`).then(r => r.ok ? r : fetch('http://localhost:3001/api/users'))
      ]);

      if (cRes.status === 'fulfilled' && cRes.value.ok) {
        const cData = await cRes.value.json();
        setCampaigns(cData);
      }

      if (eRes.status === 'fulfilled' && eRes.value.ok) {
        const eData = await eRes.value.json();
        setEvents(eData);
      }

      if (uRes.status === 'fulfilled' && uRes.value.ok) {
        const uData = await uRes.value.json();
        setUsersCount(uData.length || 0);
      }
    } catch (err) {
      console.error('Failed to load admin data from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCampaigns = campaigns.length;
  const pendingVerification = campaigns.filter(c => {
    const isAllotted = isCampaignAllotted(c.id) || (c.on_chain_id && isCampaignAllotted(c.on_chain_id));
    if (isAllotted) return false;
    return Number(c.state) === CampaignState.PendingVerification || !c.on_chain_id;
  }).length;
  const activeCampaigns = campaigns.filter(c => Number(c.state) === CampaignState.Verified || Number(c.state) === CampaignState.FundingClosed).length;
  
  const totalRaised = campaigns.reduce((acc, c) => acc + Number(c.total_donated || c.totalDonatedFtu || 0), 0);
  const totalAllocated = campaigns.reduce((acc, c) => acc + Number(c.total_allocated || c.totalAllocatedFtu || 0), 0);
  const totalClaimed = campaigns.reduce((acc, c) => acc + Number(c.total_claimed || c.totalClaimedFtu || 0), 0);

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Platform Overview</h1>
              <p className="text-stone-600 font-medium mt-2">
                Live metrics and audit events fetched strictly from Supabase & Smart Contract.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors shadow-sm flex items-center gap-2 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} /> Refresh
              </button>
              <Link href="/admin/campaigns" className="px-6 py-2.5 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors shadow-sm text-sm flex items-center gap-2">
                Manage Campaigns
              </Link>
            </div>
          </header>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-stone-900" />
              <p className="text-xs font-mono font-bold uppercase text-stone-400">Loading Supabase records...</p>
            </div>
          ) : (
            <>
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
                    <p className="text-sm text-stone-500 font-medium mt-1">{activeCampaigns} Active in Supabase</p>
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
                    <p className="text-sm text-stone-500 font-medium mt-1">Requires verifier review</p>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Seeded Users</span>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black font-bebas tracking-wide">{usersCount}</h3>
                    <p className="text-sm text-emerald-700 font-medium mt-1">Active personas in Supabase</p>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Audit Events</span>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black font-bebas tracking-wide">{events.length}</h3>
                    <p className="text-sm text-purple-700 font-medium mt-1">Verified on-chain records</p>
                  </div>
                </div>

              </div>

              {/* Main Grid: Management and Events */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 p-6 shadow-sm">
                    <h2 className="text-2xl font-black font-bebas uppercase mb-4">Quick Management</h2>
                    <div className="space-y-3">
                      <Link href="/admin/campaigns" className="w-full flex justify-between items-center p-3 rounded-xl border border-stone-100 hover:bg-stone-50 font-bold text-sm text-stone-800 transition-colors">
                        <span>Review Campaigns</span>
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">{campaigns.length}</span>
                      </Link>
                      <Link href="/admin/ledger" className="w-full flex justify-between items-center p-3 rounded-xl border border-stone-100 hover:bg-stone-50 font-bold text-sm text-stone-800 transition-colors">
                        <span>Audit Event Log</span>
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">{events.length}</span>
                      </Link>
                      <Link href="/admin/system" className="w-full flex justify-between items-center p-3 rounded-xl border border-rose-100 hover:bg-rose-50 font-bold text-sm text-rose-700 transition-colors">
                        <span className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-rose-500" /> Database Reset & Purge</span>
                        <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-xs font-mono font-bold">DANGER</span>
                      </Link>
                    </div>
                  </div>

                  <div className="bg-indigo-50/60 backdrop-blur-sm rounded-2xl border border-indigo-100 p-6 shadow-sm">
                    <h2 className="text-xl font-black font-bebas text-indigo-950 uppercase flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" /> Supabase Synchronized
                    </h2>
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      All campaigns, users, audit events, and quotations are dynamically fetched from the remote Supabase database.
                    </p>
                  </div>
                </div>

                {/* Recent Blockchain Activity */}
                <div className="lg:col-span-2">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 p-6 shadow-sm h-full">
                    <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-4">
                      <h2 className="text-2xl font-black font-bebas uppercase flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-stone-600" /> Recent Supabase Audit Events
                      </h2>
                      <Link href="/admin/ledger" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                        View Full Ledger →
                      </Link>
                    </div>

                    <div className="space-y-4">
                      {events.slice(0, 5).map((ev, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-xl border border-stone-100 hover:bg-stone-50 transition-colors group">
                          <div className="hidden sm:flex flex-col items-center justify-center bg-stone-100 w-12 h-12 rounded-lg text-stone-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-stone-900">{ev.eventName}</h4>
                              <span className="text-xs font-mono text-stone-400">Block {ev.blockNumber}</span>
                            </div>
                            <p className="text-xs text-stone-600 mt-0.5">{ev.summary}</p>
                            <div className="text-xs text-stone-500 mt-1 truncate max-w-[200px] sm:max-w-md font-mono">
                              Tx: {ev.transactionHash}
                            </div>
                            <div className="text-xs text-stone-400 mt-1">
                              {new Date(ev.timestamp || Date.now()).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      {events.length === 0 && (
                        <p className="text-sm text-stone-500 text-center py-8">No audit events found in Supabase.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </RoleGuard>
  );
}
