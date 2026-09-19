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

      <main className="max-w-7xl mx-auto px-6 sm:px-12 pt-10">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold text-stone-500 mb-4 uppercase tracking-wider">
          <Link href="/campaigns" className="hover:text-[#FF5023]">Campaigns</Link>
          <span>/</span>
          <span className="text-stone-900">Campaign #{id}</span>
        </div>

        {/* OVERDUE LOCKOUT ALERT (For Campaign #3 or when overdue) */}
        {isOverdueCampaign && (
          <div className="mb-8 p-6 rounded-3xl bg-red-600 text-white shadow-xl flex items-start gap-4">
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
          <div className="mb-8 p-6 rounded-3xl bg-amber-500 text-stone-950 shadow-xl flex items-start gap-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 flex-shrink-0 mt-1 text-stone-950">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div className="space-y-1">
              <h4 className="font-black font-bebas text-2xl uppercase tracking-wide">
                CAMPAIGN LOCKED: AWAITING INSTITUTIONAL AUDITOR SIGNOFF
              </h4>
              <p className="text-xs text-stone-900 leading-relaxed">
                Smart Contract Rule Enforcement: Unverified campaigns cannot receive any donations. An institutional verifier must review credentials and call <code>verifyCampaign()</code> before public funding opens.
              </p>
            </div>
          </div>
        )}

        {/* Campaign Header Details */}
        <div className="bg-white rounded-3xl p-8 border border-stone-300 shadow-md space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-[10px] font-black uppercase tracking-wider">
                  {id === 1 ? "Education" : id === 2 ? "Sanitation" : "Healthcare"} · Campaign #{id}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  {isPendingCampaign ? "Pending Audit" : "✓ Verified by Auditor"}
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black font-bebas uppercase text-[#141414] leading-none">
                {id === 1 && "Build Rural STEM Lab & Robotics Center"}
                {id === 2 && "Clean Water Well & Community Filtration"}
                {id === 3 && "Solar Clinic Medical Refrigerators"}
              </h1>
            </div>

            <Link
              href={`/campaigns/${id}/ledger`}
              className="py-3 px-6 rounded-full bg-[#181816] hover:bg-black text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow self-start transition-all"
            >
              <span>Inspect Public Ledger</span>
              <span>→</span>
            </Link>
          </div>

          {/* Financial Metrics Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="text-[10px] uppercase font-bold text-stone-500">Target Goal</div>
              <div className="text-2xl font-black font-bebas text-stone-900 mt-1">{id === 1 ? "3.00 ETH" : id === 2 ? "5.00 ETH" : "1.00 ETH"}</div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="text-[10px] uppercase font-bold text-stone-500">Total Donated</div>
              <div className="text-2xl font-black font-bebas text-[#FF5023] mt-1">{id === 1 ? "3.20 ETH (107%)" : id === 2 ? "0.00 ETH" : "1.00 ETH"}</div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="text-[10px] uppercase font-bold text-stone-500">Released to Vendors</div>
              <div className="text-2xl font-black font-bebas text-stone-900 mt-1">{id === 1 ? "1.20 ETH" : id === 2 ? "0.00 ETH" : "0.80 ETH"}</div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="text-[10px] uppercase font-bold text-stone-500">Remaining in Escrow</div>
              <div className="text-2xl font-black font-bebas text-emerald-600 mt-1">{id === 1 ? "2.00 ETH" : id === 2 ? "0.00 ETH" : "0.20 ETH"}</div>
            </div>
          </div>
        </div>

        {/* SPENDING REQUESTS SECTION (P0 LIVE JUDGE DEMO) */}
        <div className="mt-12 space-y-6">
          <div className="flex items-end justify-between border-b border-stone-300 pb-4">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF5023]">
                MILESTONE GOVERNANCE
              </span>
              <h2 className="text-3xl sm:text-4xl font-black font-bebas uppercase text-[#141414]">
                SPENDING REQUESTS & SNAPSHOT VOTING
              </h2>
            </div>
            <span className="text-xs text-stone-500 font-semibold">
              Rule: Only one request open at a time · &gt;50% contribution weight required
            </span>
          </div>

          {/* Request #01: Completed Accountability Loop */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-300 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-stone-100 text-stone-800 text-[10px] font-black uppercase">
                    Request #01 · Milestone 1
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                    RELEASED & PROOF SUBMITTED
                  </span>
                </div>
                <h3 className="text-2xl font-black font-bebas uppercase text-stone-900 mt-1">
                  Procurement of 50 Arduino Robotics Kits & Sensors
                </h3>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black font-bebas text-stone-900">1.20 ETH</div>
                <div className="text-[11px] font-mono text-stone-500">Recipient: 0x976E...0aa9</div>
              </div>
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-stone-500">On-Chain Quote Hash:</span>
                <span className="text-stone-800">0x95df17be098c6cd657e3d3914518ab489eda837e4de234607d47b9d85f696024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">On-Chain Receipt Hash:</span>
                <span className="text-emerald-700 font-bold">0xb80dd0075275c63869fb31316e6d22a58911ec5896ed2c98bdaf0382ac4925fd (ON-TIME)</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/verify-proof"
                className="text-xs font-bold text-[#FF5023] hover:underline flex items-center gap-1"
              >
                Inspect Receipt File in Tamper Demo →
              </Link>
            </div>
          </div>

          {/* Request #02: Live Voting Card for Judges */}
          <div className="bg-[#181816] rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-[#FF5023] text-white text-[10px] font-black uppercase tracking-wider">
                    ACTIVE REQUEST #02 · VOTING OPEN
                  </span>
                  <span className="text-xs text-stone-400 font-mono">30-Min Window</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black font-bebas uppercase text-white mt-1">
                  Solar Battery Inverters & Laboratory Workbenches
                </h3>
              </div>

              <div className="text-right">
                <div className="text-3xl font-black font-bebas text-[#FF5023]">0.50 ETH</div>
                <div className="text-[11px] font-mono text-stone-400">Vendor: 0x14dC...9955</div>
              </div>
            </div>

            {/* Voting Bar & Threshold Meter */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-stone-400">Current Approval Weight:</span>
                <span className={isApproved ? "text-emerald-400" : "text-[#FF5023]"}>
                  {currentWeight.toFixed(1)}% / 50.0% Required Threshold
                </span>
              </div>

              <div className="w-full bg-stone-800 rounded-full h-4 relative overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${isApproved ? "bg-emerald-500" : "bg-[#FF5023]"}`}
                  style={{ width: `${Math.min(currentWeight, 100)}%` }}
                />
                {/* 50% marker line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/70 shadow" />
              </div>
            </div>

            {/* Live Voting Buttons for Alice & Bob */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white">Alice (Donor)</div>
                  <div className="text-xs text-purple-300">Donated 1.50 ETH · 46.9% Weight</div>
                </div>
                <button
                  onClick={() => setAliceVoted(!aliceVoted)}
                  disabled={requestReleased}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${aliceVoted ? "bg-emerald-600 text-white" : "bg-white text-stone-950 hover:bg-stone-200"}`}
                >
                  {aliceVoted ? "✓ Approved" : "Vote Alice"}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white">Bob (Donor)</div>
                  <div className="text-xs text-blue-300">Donated 1.00 ETH · 31.3% Weight</div>
                </div>
                <button
                  onClick={() => setBobVoted(!bobVoted)}
                  disabled={requestReleased}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${bobVoted ? "bg-emerald-600 text-white" : "bg-white text-stone-950 hover:bg-stone-200"}`}
                >
                  {bobVoted ? "✓ Approved" : "Vote Bob"}
                </button>
              </div>
            </div>

            {/* Controlled Release Execution Button */}
            <div className="pt-4 border-t border-stone-800">
              {requestReleased ? (
                <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-bold text-center">
                  ✓ 0.50 ETH TRANSFERRED DIRECTLY TO VENDOR WALLET (0x14dC...9955). PROOF WINDOW ACTIVATED.
                </div>
              ) : (
                <button
                  onClick={() => setRequestReleased(true)}
                  disabled={!isApproved}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isApproved ? "bg-[#FF5023] hover:bg-[#ff5d32] text-white shadow-xl cursor-pointer" : "bg-stone-800 text-stone-500 cursor-not-allowed"}`}
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
