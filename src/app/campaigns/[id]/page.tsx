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

  // Beneficiary Physical Delivery Attestation (The Phantom Delivery Solution)
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  // Project Dormancy & Dead-Man's Auto-Refund (The Abandoned Student Project Solution)
  const [isDormantSimulated, setIsDormantSimulated] = useState(false);
  const [dormancyRefundClaimed, setDormancyRefundClaimed] = useState(false);

  // Shareable Audit Link state
  const [copiedAuditLink, setCopiedAuditLink] = useState(false);

  function handleCopyAuditLink() {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/campaigns/${id}/ledger`;
      navigator.clipboard.writeText(url);
      setCopiedAuditLink(true);
      setTimeout(() => setCopiedAuditLink(false), 2500);
    }
  }

  // Voting calculation
  const currentWeight = (aliceVoted ? 46.9 : 0) + (bobVoted ? 31.3 : 0);
  const isApproved = currentWeight > 50.0;

  // Connected role check
  const isCreator = wallet.address?.toLowerCase() === "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase();
  const isBeneficiary = wallet.address?.toLowerCase() === "0x976EA74026E726554dB657fA54763abd0C3a0aa9".toLowerCase();

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
          <div className="mb-8 p-6 rounded-3xl bg-amber-950/40 border border-amber-500/30 text-amber-100 shadow-xl flex items-start gap-4 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="font-black font-bebas text-2xl uppercase tracking-wide text-amber-300">
                CAMPAIGN LOCKED: AWAITING INSTITUTIONAL AUDITOR SIGNOFF
              </h4>
              <p className="text-xs text-amber-200/80 leading-relaxed font-sans">
                Smart Contract Rule Enforcement: Unverified campaigns cannot receive any donations. An institutional verifier must review credentials and call <code className="font-mono bg-black/40 text-amber-300 px-1.5 py-0.5 rounded">verifyCampaign()</code> before public funding opens.
              </p>
            </div>
          </div>
        )}

        {/* Clean Editorial Campaign Hero Banner (FinFLO Theme) */}
        <div className="bg-[#161813] text-white rounded-[32px] p-8 sm:p-10 shadow-2xl border border-stone-800 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-stone-800">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 text-xs font-mono font-medium border border-white/10">
                  {id === 1 ? "Education" : id === 2 ? "Sanitation" : "Healthcare"} · Campaign #{id}
                </span>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
                  isPendingCampaign
                    ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                    : "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isPendingCampaign ? "bg-amber-400" : "bg-emerald-400"}`} />
                  {isPendingCampaign ? "Pending Audit" : "Verified by Auditor"}
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-stone-300 text-xs font-mono font-medium border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  Beneficiary: Principal Sharma (0x976E...0aa9)
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black font-bebas uppercase text-white leading-none tracking-tight">
                {id === 1 && "Build Rural STEM Lab & Robotics Center"}
                {id === 2 && "Clean Water Well & Community Filtration"}
                {id === 3 && "Solar Clinic Medical Refrigerators"}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start">
              <button
                onClick={handleCopyAuditLink}
                className="py-2.5 px-4 rounded-full bg-white/10 hover:bg-white/20 text-stone-200 border border-white/20 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                {copiedAuditLink ? (
                  <>
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-emerald-300">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-stone-300">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy Audit Link</span>
                  </>
                )}
              </button>

              <Link
                href={`/campaigns/${id}/ledger`}
                className="py-2.5 px-5 rounded-full bg-white hover:bg-stone-100 text-stone-950 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>Inspect Public Ledger</span>
                <span>→</span>
              </Link>
            </div>
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
                <div className="text-3xl sm:text-4xl font-black font-bebas text-amber-400 leading-none">
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
              <div className="text-3xl sm:text-4xl font-black font-bebas text-emerald-400 leading-none">
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] font-mono font-medium border border-stone-200">
                    Request #01 · Milestone 1
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Released &amp; Proof Verified
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Physical Delivery Confirmed
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
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-stone-500">Physical Goods Sign-off:</span>
                <span className="text-stone-800 font-semibold break-all">Attested On-Chain by Principal Sharma (0x976E...0aa9) · 50 Kits Inspected</span>
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
                    Active Request #02 · {requestReleased ? "Funds Released" : "Voting Open"}
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
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium text-center">
                    ✓ 0.50 ETH Transferred Directly to Vendor (0x14dC...9955).
                  </div>

                  {/* Anti-Phantom Delivery Beneficiary Attestation Box */}
                  <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-stone-900 text-stone-100 text-[10px] font-mono font-medium tracking-wide">
                            Phantom Delivery Prevention
                          </span>
                          <span className="text-xs font-bold text-stone-900">
                            Beneficiary Physical Delivery Attestation
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed font-sans">
                          School Principal Sharma must physically confirm receipt of hardware before Request #03 can be created by the organizer.
                        </p>
                      </div>

                      <div>
                        {deliveryConfirmed ? (
                          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center gap-2 shadow-sm whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Physical Goods Received</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirmingDelivery(true);
                              setTimeout(() => {
                                setDeliveryConfirmed(true);
                                setConfirmingDelivery(false);
                              }, 600);
                            }}
                            disabled={confirmingDelivery}
                            className="py-2.5 px-4 rounded-xl bg-[#161813] hover:bg-black text-white text-xs font-medium tracking-wide shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                          >
                            <span>{confirmingDelivery ? "Attesting..." : "Confirm Physical Receipt"}</span>
                            <span className="text-[10px] text-stone-400 font-mono">(Principal Sharma)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
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

          {/* 30-Day Project Dormancy & Dead-Man's Auto-Refund Shield */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-mono font-medium border border-stone-200 uppercase tracking-wider">
                    Dead-Man's Switch
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-mono font-medium border border-stone-200 uppercase tracking-wider">
                    30-Day Timeout
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-bebas text-stone-900 tracking-wide uppercase mt-1">
                  Abandoned Student Project Protection (Auto-Refund Shield)
                </h3>
                <p className="text-xs text-stone-600 max-w-3xl leading-relaxed font-sans">
                  <strong>The Real-World Student Problem:</strong> Student teams often raise 3.20 ETH, spend 1.20 ETH on Phase 1, graduate, and disappear. The remaining 2.00 ETH sits locked in smart contracts forever. FundTrace enforces a 30-day inactivity timeout allowing contributors to withdraw their exact proportional share of unspent escrow.
                </p>
              </div>

              <button
                onClick={() => setIsDormantSimulated(!isDormantSimulated)}
                className={`py-2 px-4 rounded-xl text-xs font-mono font-medium tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  isDormantSimulated
                    ? "bg-[#161813] text-white shadow-sm"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-300"
                }`}
              >
                {isDormantSimulated ? "✓ 31 Days Inactive (Dormant)" : "Simulate 31-Day Silence"}
              </button>
            </div>

            {/* Dormancy Math Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-[10px] font-mono uppercase font-bold text-stone-500">Unspent Escrow In Contract</div>
                <div className="text-2xl font-black font-bebas text-stone-900">2.00 ETH</div>
                <div className="text-[11px] text-stone-500">Out of 3.20 ETH initial total</div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-[10px] font-mono uppercase font-bold text-stone-500">Your Donation Weight</div>
                <div className="text-2xl font-black font-bebas text-stone-900">1.50 ETH</div>
                <div className="text-[11px] text-stone-500">Alice (46.875% of total pool)</div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-[10px] font-mono uppercase font-bold text-stone-500">Calculated Refund Share</div>
                <div className="text-2xl font-black font-bebas text-emerald-700">0.9375 ETH</div>
                <div className="text-[11px] font-mono text-stone-500">(1.50 × 2.00) ÷ 3.20 ETH</div>
              </div>
            </div>

            {/* Claim Execution Banner */}
            {isDormantSimulated ? (
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Campaign Inactive (31 Days Without On-Chain Activity)</span>
                  </div>
                  <div className="text-xs text-stone-600 mt-0.5 font-sans">
                    Dead-Man's Auto-Refund unlocked. Claiming returns your 0.9375 ETH proportional share directly to your wallet.
                  </div>
                </div>

                {dormancyRefundClaimed ? (
                  <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Refund Claimed (0.9375 ETH)</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setDormancyRefundClaimed(true)}
                    className="py-2.5 px-5 rounded-xl bg-[#FF5023] hover:bg-[#e0441b] text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    Claim Proportional Refund (0.9375 ETH)
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-500 font-mono pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Dormancy Status: <strong className="text-stone-800 font-semibold">Active &amp; Healthy (Last activity 12m ago)</strong></span>
                </span>
                <span>Rule: DORMANCY_TIMEOUT = 30 days</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
