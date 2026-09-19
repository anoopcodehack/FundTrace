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

      <main className="max-w-5xl mx-auto px-6 sm:px-12 pt-10">
        
        {/* Header */}
        <div className="pb-8 border-b border-stone-300">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF5023]">
            INSTITUTIONAL AUDIT PORTAL
          </span>
          <h1 className="text-4xl sm:text-6xl font-black font-bebas uppercase leading-none text-[#141414] mt-1">
            VERIFIER DASHBOARD
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-2">
            Independent institutional review. Verified campaigns are cryptographically unlocked to accept contributor donations.
          </p>
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
              className="py-2.5 px-5 rounded-full bg-[#181816] text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-all self-start sm:self-center"
            >
              Switch to Verifier Role
            </button>
          </div>
        )}

        {/* Pending Campaigns List */}
        <div className="mt-8 space-y-6">
          <h3 className="text-2xl font-black font-bebas uppercase text-stone-900">
            PENDING AUDIT QUEUE (1 CAMPAIGN)
          </h3>

          {/* Campaign #2 Card */}
          <div className="bg-white rounded-3xl p-8 border border-stone-300 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] uppercase">
                    Sanitation · Campaign #2
                  </span>
                  <span className="text-xs font-mono text-stone-500">Creator: 0x15d3...6A65</span>
                </div>
                <h4 className="text-3xl font-black font-bebas uppercase text-stone-900">
                  Clean Water Well & Community Filtration
                </h4>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black font-bebas text-stone-900">Target: 5.00 ETH</div>
                <div className="text-[11px] font-mono text-stone-500">Duration: 30 Days</div>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Drilling a 120-meter solar submersible pump borewell and installing a dual-stage ceramic filtration plant to serve 1,200 villagers in drought-affected Ramanagara district.
            </p>

            {/* Audit Details */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-mono space-y-1">
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
              <div className="text-xs">
                Status:{" "}
                {campaign2Status === "PENDING" && (
                  <strong className="text-amber-600">Pending Auditor Signoff</strong>
                )}
                {campaign2Status === "VERIFIED" && (
                  <strong className="text-emerald-600">✓ Verified & Funding Open</strong>
                )}
                {campaign2Status === "REJECTED" && (
                  <strong className="text-red-600">✗ Rejected ({rejectReason || "Unverified credentials"})</strong>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={campaign2Status !== "PENDING" || !isVerifier}
                  className="py-3 px-5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-red-600 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40"
                >
                  Reject
                </button>

                <button
                  onClick={() => setCampaign2Status("VERIFIED")}
                  disabled={campaign2Status !== "PENDING" || !isVerifier}
                  className="py-3 px-6 rounded-2xl bg-[#FF5023] hover:bg-[#ff5d32] text-white text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-40"
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
