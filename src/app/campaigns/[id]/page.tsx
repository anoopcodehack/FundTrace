"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/context/WalletContext";
import { formatAddress } from "@/lib/wallet";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = Number(params?.id || 1);
  const { wallet } = useWallet();

  // Campaign States
  const isOverdueCampaign = id === 3;
  const isPendingCampaign = id === 2;

  // Voting state for Request #02
  const [aliceVoted, setAliceVoted] = useState(false);
  const [bobVoted, setBobVoted] = useState(false);
  const [requestReleased, setRequestReleased] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);

  // Voting calculation
  const currentWeight = (aliceVoted ? 46.9 : 0) + (bobVoted ? 31.3 : 0);
  const isApproved = currentWeight > 50.0;

  // Connected role check
  const isCreator = wallet.address?.toLowerCase() === "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase();

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#141414] pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 sm:px-12 pt-8 pb-16">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-stone-500 mb-6 uppercase tracking-wider">
          <Link href="/campaigns" className="hover:text-[#FF5023]">Campaigns</Link>
          <span>/</span>
          <span className="text-stone-900 font-extrabold">Campaign #{id}</span>
        </div>

        {/* OVERDUE LOCKOUT ALERT (For Campaign #3 or when overdue) */}
        {isOverdueCampaign && (
          <div className="mb-8 p-6 rounded-3xl bg-red-600 text-white shadow-xl flex items-start gap-4 animate-fade-in">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 flex-shrink-0 mt-1 text-white">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="space-y-1">
              <h4 className="font-black font-bebas text-2xl uppercase tracking-wide">
                ACCOUNTABILITY LOCKOUT: PROOF OF EXPENDITURE OVERDUE
              </h4>
              <p className="text-xs text-red-100 leading-relaxed">
                Smart Contract Rule Enforcement: Request #01 funds were released, but the creator failed to submit the invoice hash before the proof deadline expired. The smart contract has automatically <strong>blocked creation of all subsequent spending requests</strong> until valid proof is submitted and verified.
              </p>
            </div>
          </div>
        )}

        {/* PENDING VERIFICATION ALERT (For Campaign #2) */}
        {isPendingCampaign && (
          <div className="mb-8 p-6 rounded-3xl bg-[#FED74C] text-stone-950 shadow-xl flex items-start gap-4 animate-fade-in border border-amber-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 flex-shrink-0 mt-1 text-stone-950">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div className="space-y-1">
              <h4 className="font-black font-bebas text-2xl uppercase tracking-wide">
                CAMPAIGN LOCKED: AWAITING INSTITUTIONAL AUDITOR SIGNOFF
              </h4>
              <p className="text-xs text-stone-900 leading-relaxed font-sans">
                Smart Contract Rule Enforcement: Unverified campaigns cannot receive any donations. An institutional verifier must review credentials and call <code>verifyCampaign()</code> before public funding opens.
              </p>
            </div>
          </div>
        )}

        {/* Colorful Editorial Campaign Hero Banner (FinFLO Theme) */}
        <div className="bg-[#161813] text-white rounded-[32px] p-8 sm:p-10 shadow-2xl border border-stone-800 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-stone-800">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-md bg-[#FF5023] text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                  {id === 1 ? "Education" : id === 2 ? "Sanitation" : "Healthcare"} · Campaign #{id}
                </span>
                <span className={`px-3 py-1 rounded-md text-[10px] font-mono font-black uppercase tracking-wider ${
                  isPendingCampaign ? "bg-[#FED74C] text-stone-950" : "bg-emerald-500 text-stone-950"
                }`}>
                  {isPendingCampaign ? "Pending Audit" : "✓ Verified by Auditor"}
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black font-bebas uppercase text-white leading-none tracking-tight">
                {id === 1 && "Build Rural STEM Lab & Robotics Center"}
                {id === 2 && "Clean Water Well & Community Filtration"}
                {id === 3 && "Solar Clinic Medical Refrigerators"}
              </h1>
            </div>

            <Link
              href={`/campaigns/${id}/ledger`}
              className="py-3 px-6 rounded-full bg-[#FED74C] hover:bg-[#ffe17d] text-stone-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg self-start transition-all cursor-pointer"
            >
              <span>Inspect Public Ledger</span>
              <span>→</span>
            </Link>
          </div>

          {/* Financial Metrics Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-black/60 border border-stone-800 space-y-1">
              <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-400">
                Target Goal
              </div>
              <div className="text-3xl sm:text-4xl font-black font-bebas text-white leading-none">
                {id === 1 ? "3.00" : id === 2 ? "5.00" : "1.00"}{" "}
                <span className="text-lg font-bold text-stone-400">ETH</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-black/60 border border-stone-800 space-y-1">
              <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-400">
                Total Donated
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl sm:text-4xl font-black font-bebas text-[#FF5023] leading-none">
                  {id === 1 ? "3.20" : id === 2 ? "0.00" : "1.00"}{" "}
                  <span className="text-lg font-bold text-stone-400">ETH</span>
                </div>
                {id === 1 && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                    107%
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-black/60 border border-stone-800 space-y-1">
              <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-400">
                Released to Vendors
              </div>
              <div className="text-3xl sm:text-4xl font-black font-bebas text-white leading-none">
                {id === 1 ? "1.20" : id === 2 ? "0.00" : "0.80"}{" "}
                <span className="text-lg font-bold text-stone-400">ETH</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-black/60 border border-stone-800 space-y-1">
              <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-400">
                Remaining in Escrow
              </div>
              <div className="text-3xl sm:text-4xl font-black font-bebas text-[#FED74C] leading-none">
                {id === 1 ? "2.00" : id === 2 ? "0.00" : "0.20"}{" "}
                <span className="text-lg font-bold text-stone-400">ETH</span>
              </div>
            </div>
          </div>
        </div>

        {/* SPENDING REQUESTS SECTION */}
        <div className="mt-12 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-300 pb-4 gap-2">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF5023]">
                MILESTONE GOVERNANCE
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-0.5">
                Spending Requests &amp; Snapshot Voting
              </h2>
            </div>
            <span className="text-xs text-stone-500 font-mono">
              Consensus Rule: &gt;50% contribution weight required
            </span>
          </div>

          {/* Request #01: Completed Accountability Loop */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] font-mono font-medium border border-stone-200">
                    Request #01 · Milestone 1
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Released &amp; Proof Verified
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900 mt-1.5 leading-snug">
                  Procurement of 50 Arduino Robotics Kits &amp; Sensors
                </h3>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-2xl sm:text-3xl font-black font-bebas text-stone-900 leading-none">
                  1.20 <span className="text-base font-bold text-stone-500">ETH</span>
                </div>
                <div className="text-[11px] font-mono text-stone-500 mt-1">Recipient: 0x976E...0aa9</div>
              </div>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs space-y-1.5 font-mono">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-stone-500">On-Chain Quote Hash:</span>
                <span className="text-stone-800 break-all">0x95df17be098c6cd657e3d3914518ab489eda837e4de234607d47b9d85f696024</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-stone-500">On-Chain Receipt Hash:</span>
                <span className="text-emerald-700 font-bold break-all">0xb80dd0075275c63869fb31316e6d22a58911ec5896ed2c98bdaf0382ac4925fd (ON-TIME)</span>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <Link
                href="/verify-proof"
                className="text-xs font-semibold text-[#FF5023] hover:underline flex items-center gap-1"
              >
                Inspect Receipt File in Tamper Demo →
              </Link>
            </div>
          </div>

          {/* Request #02: Live Voting Card (Clean Developer Card) */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 text-stone-900 shadow-sm space-y-6 border border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Active Request #02 · Voting Open
                  </span>
                  <span className="text-xs text-stone-500 font-mono">30-Min Window</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-2 leading-snug">
                  Solar Battery Inverters &amp; Laboratory Workbenches
                </h3>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-2xl sm:text-3xl font-black font-bebas text-stone-900 leading-none">
                  0.50 <span className="text-base font-bold text-stone-500">ETH</span>
                </div>
                <div className="text-xs font-mono text-stone-500 mt-1">Vendor: 0x14dC...9955</div>
              </div>
            </div>

            {/* Voting Bar & Threshold Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-stone-500">Current Approval Weight:</span>
                <span className="text-stone-700">
                  <strong className={isApproved ? "text-emerald-700 font-bold" : "text-stone-900 font-bold"}>
                    {currentWeight.toFixed(1)}%
                  </strong>{" "}
                  / 50.0% Required Threshold
                </span>
              </div>

              <div className="w-full bg-stone-100 rounded-full h-2 relative overflow-hidden border border-stone-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isApproved ? "bg-emerald-600" : "bg-[#FF5023]"
                  }`}
                  style={{ width: `${Math.min(currentWeight, 100)}%` }}
                />
                {/* 50% marker line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-stone-400" />
              </div>
            </div>

            {/* Live Voting Cards for Alice & Bob */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-stone-900">Alice (Donor)</div>
                  <div className="text-xs text-stone-500 mt-0.5">Donated 1.50 ETH · 46.9% Weight</div>
                </div>
                <button
                  onClick={() => setAliceVoted(!aliceVoted)}
                  disabled={requestReleased}
                  className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    aliceVoted
                      ? "bg-emerald-600 border border-emerald-600 text-white"
                      : "bg-white hover:bg-stone-100 border border-stone-300 text-stone-800"
                  }`}
                >
                  {aliceVoted ? "✓ Approved" : "Vote Alice"}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-stone-900">Bob (Donor)</div>
                  <div className="text-xs text-stone-500 mt-0.5">Donated 1.00 ETH · 31.3% Weight</div>
                </div>
                <button
                  onClick={() => setBobVoted(!bobVoted)}
                  disabled={requestReleased}
                  className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    bobVoted
                      ? "bg-emerald-600 border border-emerald-600 text-white"
                      : "bg-white hover:bg-stone-100 border border-stone-300 text-stone-800"
                  }`}
                >
                  {bobVoted ? "✓ Approved" : "Vote Bob"}
                </button>
              </div>
            </div>

            {/* Controlled Release Execution Button */}
            <div className="pt-4 border-t border-stone-200">
              {requestReleased ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium text-center">
                  ✓ 0.50 ETH Transferred Directly to Vendor (0x14dC...9955). Proof submission window activated.
                </div>
              ) : (
                <button
                  onClick={() => setRequestReleased(true)}
                  disabled={!isApproved}
                  className={`w-full py-3.5 px-6 rounded-xl font-semibold text-xs uppercase tracking-wider transition-colors ${
                    isApproved
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
                      : "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                  }`}
                >
                  {isApproved ? "Execute Controlled Release (0.50 ETH)" : "Locked: Requires >50% Contributor Approval"}
                </button>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
