"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/context/WalletContext";
import RoleGuard from "@/components/RoleGuard";
import { getCreatorScore, getScoreHistory } from "@/services/scoreService";
import { getQuotationsByCampaign } from "@/services/quotationService";
import { getFundTraceContract } from "@/lib/contract";
import { formatFtu } from "@/types";
import { QuotationState } from "@/types";

interface ScoreGaugeProps {
  score: number;
}

function ScoreGauge({ score }: ScoreGaugeProps) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="70" cy="70" r="54" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black text-stone-900 font-bebas leading-none tracking-wide">
          {score}
        </div>
        <div className="text-xs font-bold text-stone-500 mt-0.5">/100</div>
        <div className="text-xs font-bold mt-1" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}

const STATE_COLORS: Record<string, string> = {
  Pending: "amber",
  AIEvaluated: "blue",
  DonorApproved: "blue",
  Claimable: "emerald",
  ProofPending: "orange",
  ProofSubmitted: "teal",
  Completed: "green",
  DonorRejected: "red",
};

export default function CreatorPortfolioPage() {
  const { wallet } = useWallet();
  const [score, setScore] = useState<any>(null);
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creatorAddress, setCreatorAddress] = useState("");
  const [lookupAddress, setLookupAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "quotations" | "history">("overview");

  const addressToShow = lookupAddress || wallet.address || "";

  useEffect(() => {
    if (addressToShow) {
      loadData(addressToShow);
    } else {
      setIsLoading(false);
    }
  }, [addressToShow]);

  async function loadData(addr: string) {
    setIsLoading(true);
    try {
      const [scoreData, historyData] = await Promise.all([
        getCreatorScore(addr),
        getScoreHistory(addr),
      ]);
      setScore(scoreData);
      setScoreHistory(historyData);

      // Fetch quotations across all campaigns for this creator
      // In production, this would be a dedicated endpoint
      // For now, fetch from Supabase via the score data
    } catch (err) {
      console.error("Failed to load creator data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const scoreData = score?.supabase || score?.onChain || null;
  const currentScore = scoreData?.current_score ?? scoreData?.score ?? 70;

  const MOCK_QUOTATIONS = [
    {
      id: 1, purpose: "Purchase 50 STEM Lab Kits", vendor_name: "EduTech Supplies Pvt Ltd",
      requested_amount_ftu: 25000, allocated_amount_ftu: 22000, claimed_amount_ftu: 22000,
      state: "Completed", submitted_at: "2026-09-01T10:00:00Z",
      ai_recommendation: { recommendation: "APPROVE", confidence: 0.92, riskLevel: "LOW" },
    },
    {
      id: 2, purpose: "3D Printers & Filament Stock", vendor_name: "MakerSpace India",
      requested_amount_ftu: 18000, allocated_amount_ftu: 15000, claimed_amount_ftu: 15000,
      state: "ProofPending", submitted_at: "2026-09-12T14:30:00Z",
      ai_recommendation: { recommendation: "APPROVE", confidence: 0.87, riskLevel: "LOW" },
    },
    {
      id: 3, purpose: "IT Infrastructure Setup", vendor_name: "NetServ Solutions",
      requested_amount_ftu: 50000, allocated_amount_ftu: null, claimed_amount_ftu: 0,
      state: "AIEvaluated", submitted_at: "2026-09-19T09:00:00Z",
      ai_recommendation: { recommendation: "REVIEW", confidence: 0.61, riskLevel: "MEDIUM", flags: ["Requested amount exceeds 60% of remaining balance"] },
    },
  ];

  const displayQuotations = quotations.length > 0 ? quotations : MOCK_QUOTATIONS;

  return (
    <RoleGuard allowedRoles={["CREATOR"]}>
      <div className="min-h-screen bg-stone-50 text-stone-900 pb-24">
        <Navbar />
      <main className="max-w-6xl mx-auto px-6 sm:px-12 pt-8 pb-16">

        {/* Header */}
        <div className="bg-[#161813] text-white rounded-[32px] p-8 sm:p-10 shadow-2xl border border-stone-800 mb-8 overflow-hidden relative">
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: "radial-gradient(circle at 80% 50%, #FF5023 0%, transparent 60%)"
          }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 text-xs font-mono font-medium border border-white/10">
                Creator Portfolio
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-black font-bebas uppercase leading-tight tracking-tight">
              Creator Reliability
            </h1>
            <p className="text-sm text-stone-400 mt-2 max-w-xl leading-relaxed">
              Transparent, deterministic scoring of your funding history. Every score change is auditable and explainable.
            </p>
          </div>
        </div>

        {/* Address Lookup */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 mb-6 flex gap-3">
          <input
            value={creatorAddress}
            onChange={(e) => setCreatorAddress(e.target.value)}
            placeholder={wallet.address || "Enter creator wallet address..."}
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-mono text-stone-900 bg-stone-50 focus:outline-none focus:border-[#FF5023]"
          />
          <button
            onClick={() => setLookupAddress(creatorAddress || wallet.address || "")}
            className="px-5 py-2.5 bg-[#181816] text-white text-sm font-bold rounded-xl hover:bg-black transition-colors"
          >
            Load Profile
          </button>
          {wallet.isConnected && (
            <button
              onClick={() => { setLookupAddress(wallet.address || ""); setCreatorAddress(""); }}
              className="px-5 py-2.5 border border-stone-300 text-stone-700 text-sm font-bold rounded-xl hover:bg-stone-50 transition-colors"
            >
              My Profile
            </button>
          )}
        </div>

        {!addressToShow ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">👤</div>
            <p className="text-stone-500 font-medium">Connect your wallet or enter an address to view the creator profile</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin text-3xl mb-4">⚙️</div>
            <p className="text-stone-500">Loading creator profile...</p>
          </div>
        ) : (
          <>
            {/* Score Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

              {/* Score Gauge */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col items-center">
                <ScoreGauge score={currentScore} />
                <h3 className="mt-4 text-sm font-bold text-stone-900 text-center">Creator Reliability Score</h3>
                <p className="text-xs text-stone-500 text-center mt-1">
                  {addressToShow.slice(0, 6)}...{addressToShow.slice(-4)}
                </p>
                <div className="mt-4 w-full pt-4 border-t border-stone-100 text-center">
                  <p className="text-xs text-stone-400">
                    Score updates automatically after each proof submission and claim event.
                  </p>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">Score Breakdown</h3>
                <div className="space-y-4">
                  {[
                    { label: "Proof Completion", value: scoreData?.proof_completion_pct ?? 100, desc: "% of quotations with proof submitted" },
                    { label: "On-Time Proof", value: scoreData?.on_time_proof_pct ?? 100, desc: "% of proofs submitted before deadline" },
                    { label: "Budget Consistency", value: scoreData?.budget_consistency_pct ?? 100, desc: "% accuracy vs approved quotation amount" },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-stone-700">{metric.label}</span>
                        <span className="text-sm font-black font-bebas tracking-wide">{metric.value}%</span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${metric.value}%`,
                            backgroundColor: metric.value >= 80 ? "#10b981" : metric.value >= 60 ? "#f59e0b" : "#ef4444"
                          }}
                        />
                      </div>
                      <p className="text-xs text-stone-400 mt-1">{metric.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Quotations", value: scoreData?.total_quotations ?? MOCK_QUOTATIONS.length, icon: "📋" },
                { label: "Approved", value: scoreData?.approved_quotations ?? 2, icon: "✅" },
                { label: "Unresolved", value: scoreData?.unresolved_requests ?? 1, icon: "⏳", warn: true },
                { label: "Completed", value: scoreData?.completed_campaigns ?? 1, icon: "🏆" },
              ].map((stat) => (
                <div key={stat.label} className={`bg-white rounded-2xl border shadow-sm p-4 ${stat.warn && (scoreData?.unresolved_requests ?? 1) > 0 ? "border-amber-200 bg-amber-50" : "border-stone-200"}`}>
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-black font-bebas tracking-wide text-stone-900">{stat.value}</div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-white rounded-2xl border border-stone-200 p-2 shadow-sm w-fit">
              {(["overview", "quotations", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab ? "bg-[#FF5023] text-white shadow-md" : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "quotations" && (
              <div className="space-y-4">
                {displayQuotations.map((q: any) => {
                  const rec = q.ai_recommendation;
                  const recColor = rec?.recommendation === "APPROVE" ? "emerald" : rec?.recommendation === "REJECT" ? "red" : "amber";
                  return (
                    <div key={q.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-bold text-stone-900">{q.purpose}</h3>
                          <p className="text-xs text-stone-500 mt-0.5">Vendor: {q.vendor_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {rec && (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${recColor}-100 text-${recColor}-800`}>
                              AI: {rec.recommendation}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
                            {q.state}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">Requested</div>
                          <div className="text-lg font-black font-bebas tracking-wide text-stone-900">₹{q.requested_amount_ftu?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">Sanctioned</div>
                          <div className="text-lg font-black font-bebas tracking-wide text-stone-900">
                            {q.allocated_amount_ftu ? `₹${q.allocated_amount_ftu.toLocaleString()}` : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">Claimed</div>
                          <div className="text-lg font-black font-bebas tracking-wide text-stone-900">₹{(q.claimed_amount_ftu || 0).toLocaleString()}</div>
                        </div>
                      </div>
                      <p className="text-xs text-stone-400 mt-3">
                        Submitted: {new Date(q.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "history" && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100">
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Score Change History</h3>
                </div>
                {scoreHistory.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-stone-400 text-sm">No score history available yet. History is recorded as quotations are processed.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider text-stone-500">Date</th>
                        <th className="text-left px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider text-stone-500">Change</th>
                        <th className="text-left px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider text-stone-500">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {scoreHistory.map((h: any, i: number) => (
                        <tr key={i} className="hover:bg-stone-50">
                          <td className="px-6 py-3 text-stone-600 text-xs font-mono">
                            {new Date(h.changed_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`font-black font-bebas text-lg ${h.new_score > h.old_score ? "text-emerald-600" : "text-red-600"}`}>
                              {h.old_score} → {h.new_score}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-stone-500 text-xs">{h.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "overview" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">Proof Compliance</h3>
                  <div className="space-y-3">
                    {[
                      { label: "On-Time Proofs", value: scoreData?.on_time_proof_pct ?? 100, good: true },
                      { label: "Late Proofs", value: scoreData?.late_proofs ?? 0, good: false, raw: true },
                      { label: "Missing Proofs", value: scoreData?.missing_proofs ?? 0, good: false, raw: true },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className="text-xs text-stone-600">{s.label}</span>
                        <span className={`text-sm font-black font-bebas tracking-wide ${
                          s.good ? (s.value >= 80 ? "text-emerald-600" : "text-amber-600") : (s.value === 0 ? "text-emerald-600" : "text-red-600")
                        }`}>
                          {s.raw ? s.value : `${s.value}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">Scoring Formula</h3>
                  <div className="space-y-2 text-xs text-stone-600">
                    <div className="flex justify-between"><span>Base score</span><span className="font-mono font-bold">70</span></div>
                    <div className="flex justify-between text-emerald-600"><span>+ Proof completion (max 15)</span><span className="font-mono font-bold">+15</span></div>
                    <div className="flex justify-between text-emerald-600"><span>+ On-time proofs (max 10)</span><span className="font-mono font-bold">+10</span></div>
                    <div className="border-t border-stone-100 pt-2 flex justify-between text-red-500"><span>- Missing proofs (×8 each)</span><span className="font-mono font-bold">-8/each</span></div>
                    <div className="flex justify-between text-red-500"><span>- Late proofs (×2 each)</span><span className="font-mono font-bold">-2/each</span></div>
                    <div className="flex justify-between text-red-500"><span>- Unresolved requests (×10)</span><span className="font-mono font-bold">-10/each</span></div>
                    <div className="flex justify-between text-red-500"><span>- Budget variance penalty</span><span className="font-mono font-bold">max -10</span></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      </div>
    </RoleGuard>
  );
}
