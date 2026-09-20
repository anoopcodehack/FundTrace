"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_CREATOR_SCORE } from '@/lib/mock';
import Link from 'next/link';
import { 
  ChevronRight,
  CheckCircle2,
  Clock,
  PieChart,
  Award,
  ShieldCheck,
  History
} from 'lucide-react';
import { formatFtu } from '@/types';

export default function CreatorScorePage() {
  const score = MOCK_CREATOR_SCORE;


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
              <p className="text-stone-600 font-medium mt-2">A transparent metric of your trustworthiness based on on-chain proofs.</p>
            </div>
          </header>

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
                        <stop offset="0%" stopColor="#ef4444" /> {/* Red */}
                        <stop offset="30%" stopColor="#f97316" /> {/* Orange */}
                        <stop offset="60%" stopColor="#eab308" /> {/* Yellow */}
                        <stop offset="90%" stopColor="#22c55e" /> {/* Green */}
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    
                    {/* Background Arc */}
                    <path
                      d="M 20 120 A 100 100 0 0 1 220 120"
                      fill="none"
                      stroke="#f5f5f4"
                      strokeWidth="24"
                      strokeLinecap="round"
                    />
                    
                    {/* Foreground Gradient Arc */}
                    <path
                      d="M 20 120 A 100 100 0 0 1 220 120"
                      fill="none"
                      stroke="url(#cibilGradient)"
                      strokeWidth="24"
                      strokeLinecap="round"
                      strokeDasharray={Math.PI * 100}
                      strokeDashoffset={(Math.PI * 100) - ((score.currentScore / 100) * (Math.PI * 100))}
                      style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                      filter="url(#glow)"
                    />
                    
                    {/* Dial Indicator (Needle) */}
                    <g transform={`translate(120, 120) rotate(${180 + (score.currentScore / 100) * 180})`}>
                      <polygon points="-6,0 6,0 0,70" fill="#1c1917" className="opacity-90" />
                      <circle cx="0" cy="0" r="10" fill="#1c1917" />
                      <circle cx="0" cy="0" r="4" fill="#ffffff" />
                    </g>
                  </svg>
                  
                  {/* Score Text Overlay */}
                  <div className="absolute flex flex-col items-center justify-center bottom-[-30px]">
                     <span className="text-5xl font-black font-bebas tracking-tight text-stone-900">
                       {/* Map 0-100 to 300-900 CIBIL-like range just for display if desired, 
                           but to keep it clear it's the Creator Score, we'll show the actual score out of 900 */}
                       {300 + (score.currentScore * 6)}
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

          {/* History */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-xl font-bold font-display text-stone-900 mb-6 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" /> Score History (Last 30 Days)
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 border border-stone-100 rounded-xl bg-stone-50">
                <div>
                  <p className="font-bold text-stone-900">Score increased +2</p>
                  <p className="text-xs text-stone-500 mt-1">Successfully submitted on-time proof for 50,000 FTU claim.</p>
                </div>
                <span className="text-sm font-mono text-emerald-600 font-bold px-3 py-1 bg-emerald-100 rounded-full">92 &uarr;</span>
              </div>
              <div className="flex justify-between items-center p-4 border border-stone-100 rounded-xl bg-stone-50">
                <div>
                  <p className="font-bold text-stone-900">Score initialized</p>
                  <p className="text-xs text-stone-500 mt-1">Default starting reliability rating.</p>
                </div>
                <span className="text-sm font-mono text-stone-600 font-bold px-3 py-1 bg-stone-200 rounded-full">90</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
