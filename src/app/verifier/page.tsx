"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/context/WalletContext";
import { DEMO_PRESET_ACCOUNTS } from "@/lib/wallet";

export default function VerifierPortalPage() {
  const { wallet, isVerifier, selectDemoRole } = useWallet();

  const [campaign2Status, setCampaign2Status] = useState<"PENDING" | "VERIFIED" | "REJECTED">("PENDING");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  function handleSwitchToVerifier() {
    const verifierPreset = DEMO_PRESET_ACCOUNTS.find((a) => a.role.includes("Verifier"));
    if (verifierPreset) {
      selectDemoRole(verifierPreset);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#141414] pb-24">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 sm:px-12 pt-8 pb-16">
        
        {/* Colorful Editorial Hero Banner (FinFLO Theme) */}
        <div className="bg-[#161813] text-white rounded-[32px] p-8 sm:p-12 shadow-2xl relative overflow-hidden mb-8 border border-stone-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-md bg-[#FF5023] text-white font-mono text-[10px] font-bold uppercase tracking-widest">
                  INSTITUTIONAL PORTAL
                </span>
                <span className="px-3 py-1 rounded-md bg-[#FED74C] text-stone-950 font-mono text-[10px] font-black uppercase tracking-wider">
                  AUDITOR SIGN-OFF
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-bebas uppercase leading-[0.88] tracking-tight text-white">
                VERIFIER DASHBOARD
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed">
                Independent institutional review. Verified campaigns are cryptographically unlocked to accept contributor donations.
              </p>
            </div>

            <div className="hidden lg:flex flex-col items-end border-l border-stone-800 pl-8 space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-400 font-bold tracking-widest">
                VERIFIER ROLE
              </span>
              <span className="text-3xl font-black font-bebas text-[#FF5023] tracking-wide">
                GATED AUTHORITY
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                ● 0x3C44...93BC
              </span>
            </div>
          </div>
        </div>

        {/* Warning if connected account is not verifier */}
        {!isVerifier && (
          <div className="mt-6 p-6 rounded-3xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 flex-shrink-0 text-amber-900 mt-0.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <div>
                <div className="font-bold text-sm">Verifier Access Only</div>
                <div className="text-xs text-amber-800 mt-0.5">
                  Your current wallet is not the designated auditor (<code>0x3C44...93BC</code>).
                </div>
              </div>
            </div>

            <button
              onClick={handleSwitchToVerifier}
              className="py-2 px-4 rounded-lg bg-[#181816] text-white text-xs font-semibold hover:bg-black transition-colors self-start sm:self-center shadow-xs"
            >
              Switch to Verifier Role
            </button>
          </div>
        )}

        {/* Pending Campaigns List */}
        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-stone-900">
              Pending Audit Queue
            </h3>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              1 Campaign
            </span>
          </div>

          {/* Campaign #2 Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono font-medium text-[10px] uppercase">
                    Sanitation · Campaign #2
                  </span>
                  <span className="text-xs font-mono text-stone-500">Creator: 0x15d3...6A65</span>
                </div>
                <h4 className="text-xl font-bold text-stone-900 leading-snug">
                  Clean Water Well &amp; Community Filtration
                </h4>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-500">
                  Target Goal
                </div>
                <div className="text-2xl sm:text-3xl font-black font-bebas text-stone-900 leading-none mt-0.5">
                  5.00 <span className="text-base font-bold text-stone-500">ETH</span>
                </div>
                <div className="text-xs font-mono text-stone-500 mt-1">Duration: 30 Days</div>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Drilling a 120-meter solar submersible pump borewell and installing a dual-stage ceramic filtration plant to serve 1,200 villagers in drought-affected Ramanagara district.
            </p>

            {/* Audit Details */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">On-Chain Metadata Hash:</span>
                <span className="text-stone-800">0x3b18c91827401928471928471928471928471928471928471928471928471928</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Designated Verifier:</span>
                <span className="text-stone-800">0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC</span>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs font-medium">
                Status:{" "}
                {campaign2Status === "PENDING" && (
                  <span className="text-amber-700 font-semibold">Pending Auditor Signoff</span>
                )}
                {campaign2Status === "VERIFIED" && (
                  <span className="text-emerald-700 font-semibold">✓ Verified &amp; Funding Open</span>
                )}
                {campaign2Status === "REJECTED" && (
                  <span className="text-rose-700 font-semibold">✗ Rejected ({rejectReason || "Unverified credentials"})</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={campaign2Status !== "PENDING" || !isVerifier}
                  className="py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Reject
                </button>

                <button
                  onClick={() => setCampaign2Status("VERIFIED")}
                  disabled={campaign2Status !== "PENDING" || !isVerifier}
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {campaign2Status === "VERIFIED" ? "✓ Verified" : "Verify & Unlock Funding"}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h4 className="font-black font-bebas text-2xl uppercase text-stone-900">
                Reject Campaign Audit
              </h4>
              <p className="text-xs text-stone-600">
                Provide a verifiable public reason. This audit decision is recorded permanently on the blockchain.
              </p>
              <textarea
                rows={3}
                required
                placeholder="e.g. Failure to provide municipal borewell permit license..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setCampaign2Status("REJECTED");
                    setShowRejectModal(false);
                  }}
                  className="py-2 px-4 rounded-xl bg-red-600 text-white text-xs font-bold"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
