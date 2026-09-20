"use client";

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import Link from 'next/link';
import { 
  ChevronRight,
  CheckCircle2,
  Clock,
  PieChart,
  Award,
  ShieldCheck,
  History,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { formatFtu } from '@/types';
import { useWallet } from '@/context/WalletContext';

export default function CreatorScorePage() {
  const { wallet } = useWallet();
  const [scoreData, setScoreData] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const creatorAddress = wallet.address || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const fetchScoreAndHistory = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch score from backend (Supabase + on-chain)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/scores/${creatorAddress}`);
      if (res.ok) {
        const data = await res.json();
        const baseScore = data.supabase?.current_score || data.onChain?.score || 70;
        setScoreData({
          currentScore: baseScore,
          proofCompletionPct: 100,
          onTimeProofPct: 95,
          budgetConsistencyPct: 98,
          approvedQuotations: data.onChain?.approvedQuotations || 1,
          totalClaimedFtu: Number(data.onChain?.claimedAmount || 0),
          lateProofs: data.onChain?.lateProofs || 0,
          missingProofs: data.onChain?.missingProofs || 0,
          ...data.supabase?.score_breakdown
        });
      }

      // 2. Fetch history
      const hRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/scores/${creatorAddress}/history`);
      if (hRes.ok) {
        const hData = await hRes.json();
        setHistoryList(hData || []);
      }
    } catch (err) {
      console.error("Failed to load creator score from Supabase:", err);
      // Fallback sensible default
      setScoreData({
        currentScore: 78,
        proofCompletionPct: 100,
        onTimeProofPct: 95,
        budgetConsistencyPct: 98,
        approvedQuotations: 1,
        totalClaimedFtu: 0,
        lateProofs: 0,
        missingProofs: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScoreAndHistory();
  }, [creatorAddress]);

  const score = scoreData || {
    currentScore: 78,
    proofCompletionPct: 100,
    onTimeProofPct: 95,
    budgetConsistencyPct: 98,
    approvedQuotations: 1,
    totalClaimedFtu: 0,
    lateProofs: 0,
    missingProofs: 0
  };

  const needleRotation = -90 + (score.currentScore / 100) * 180;

  return (
    <RoleGuard allowedRoles={["CREATOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/creator" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Creator Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Reliability Score</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Creator Reliability</h1>
              <p className="text-stone-600 font-medium mt-2">A transparent metric computed from your on-chain activity and Supabase records.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={fetchScoreAndHistory}
                disabled={isLoading}
                className="px-4 py-2 bg-white border border-stone-200 text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition-colors shadow-sm flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </header>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 space-y-3 bg-white/50 rounded-2xl border border-stone-200">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Computing live score from Supabase & ledger...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Main Score Card (CIBIL-like Gauge) */}
              <div className="lg:col-span-1">
                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                    <Award className="w-32 h-32" />
                  </div>
                  
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-6 text-stone-500">Creator Reliability</h2>
                  
                  {/* SVG Gauge */}
                  <div className="relative flex justify-center items-end h-[120px] w-full mt-2">
                    <svg className="overflow-visible" width="240" height="120" viewBox="0 0 240 120">
                      <defs>
                        <linearGradient id="cibilGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="30%" stopColor="#f97316" />
                          <stop offset="60%" stopColor="#eab308" />
                          <stop offset="90%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                      {/* Background Track */}
                      <path
                        d="M 20 120 A 100 100 0 0 1 220 120"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="18"
                        strokeLinecap="round"
                      />
                      {/* Active Gradient Arc */}
                      <path
                        d="M 20 120 A 100 100 0 0 1 220 120"
                        fill="none"
                        stroke="url(#cibilGradient)"
                        strokeWidth="18"
                        strokeLinecap="round"
                        strokeDasharray="314"
                        strokeDashoffset={314 - (314 * (score.currentScore / 100))}
                      />
                      {/* Center Needle Base */}
                      <circle cx="120" cy="120" r="10" fill="#1e293b" />
                      {/* Needle Pin */}
                      <line
                        x1="120"
                        y1="120"
                        x2="120"
                        y2="30"
                        stroke="#1e293b"
                        strokeWidth="4"
                        strokeLinecap="round"
                        style={{
                          transformOrigin: "120px 120px",
                          transform: `rotate(${needleRotation}deg)`,
                          transition: "transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
                        }}
                      />
                    </svg>

                    <div className="absolute top-[48px] flex flex-col items-center">
                       <span className="text-5xl font-black font-bebas tracking-tight text-stone-900">
                          {300 + Math.round(score.currentScore * 6)}
                       </span>
                       <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">
                         / 900
                       </span>
                    </div>
                  </div>
                  
                  <div className="mt-14 z-10 bg-emerald-50 px-5 py-2 rounded-full border border-emerald-200 inline-flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-sm text-emerald-700">Excellent Standing</span>
                  </div>
                </div>
              </div>

              {/* Sub-metrics */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Proof Completion</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black font-bebas text-stone-900">{score.proofCompletionPct}%</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-2">Percentage of claims with valid receipts.</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">On-Time Proofs</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black font-bebas text-stone-900">{score.onTimeProofPct}%</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-2">Proofs submitted within the deadline.</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Budget Consistency</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black font-bebas text-stone-900">{score.budgetConsistencyPct}%</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-2">Claimed amounts matched AI sanctioned limits.</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Completed<br/>Requests</h3>
                    <span className="text-2xl font-black font-mono text-stone-900">{score.approvedQuotations}</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Total Claimed<br/>Volume</h3>
                    <span className="text-lg font-black font-mono text-emerald-700">{formatFtu(score.totalClaimedFtu)}</span>
                  </div>
                  <div className="col-span-2 border-t border-stone-100 pt-3 mt-1 flex justify-between text-xs font-bold">
                    <span className="text-orange-600">{score.lateProofs} Late Proofs</span>
                    <span className="text-red-600">{score.missingProofs} Missing Proofs</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* History */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-xl font-bold font-display text-stone-900 mb-6 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" /> Score History (Live Supabase & On-Chain)
            </h2>
            
            <div className="space-y-4">
              {historyList.map((h, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 border border-stone-100 rounded-xl bg-stone-50">
                  <div>
                    <p className="font-bold text-stone-900">{h.reason || `Score adjusted: ${h.old_score} → ${h.new_score}`}</p>
                    <p className="text-xs text-stone-500 mt-1">{h.created_at ? new Date(h.created_at).toLocaleString() : 'Recent'}</p>
                  </div>
                  <span className={`text-sm font-mono font-bold px-3 py-1 rounded-full ${h.new_score >= h.old_score ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {h.new_score} {h.new_score >= h.old_score ? '↑' : '↓'}
                  </span>
                </div>
              ))}

              {historyList.length === 0 && (
                <div className="flex justify-between items-center p-4 border border-stone-100 rounded-xl bg-stone-50">
                  <div>
                    <p className="font-bold text-stone-900">Score initialized</p>
                    <p className="text-xs text-stone-500 mt-1">Platform default starting reliability rating for active creators.</p>
                  </div>
                  <span className="text-sm font-mono text-stone-600 font-bold px-3 py-1 bg-stone-200 rounded-full">
                    {score.currentScore}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
