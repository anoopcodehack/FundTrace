"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/context/WalletContext";
import { computeCanonicalMetadataHash } from "@/lib/canonical";

export default function CreateCampaignPage() {
  const { wallet } = useWallet();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Education");
  const [goalEth, setGoalEth] = useState("3.0");
  const [durationDays, setDurationDays] = useState("30");
  const [story, setStory] = useState("");
  const [location, setLocation] = useState("Bengaluru, India");
  const [verifierAddress, setVerifierAddress] = useState("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  // Compute canonical metadata hash in real time
  const computedMetadataHash = title && story
    ? computeCanonicalMetadataHash({
        title,
        story,
        category,
        location,
      })
    : "0x7c21b8d862db1881c3edd13b662e0815f119004521083617159f709d45b52003";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedId(4);
    }, 800);
  }

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#141414] pb-24">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 sm:px-12 pt-8 pb-16">
        
        {/* Colorful Editorial Hero Banner (FinFLO Theme) */}
        <div className="bg-[#161813] text-white rounded-[32px] p-8 sm:p-12 shadow-2xl relative overflow-hidden mb-8 border border-stone-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 text-xs font-mono font-medium border border-white/10">
                  Campaign Genesis
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-stone-300 text-xs font-mono font-medium border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Verifier-Gated
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-bebas uppercase leading-[0.88] tracking-tight text-white">
                DEPLOY AUDITED CAMPAIGN
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed">
                Submit campaign metadata, target goal, and designated institutional verifier. Canonical story text is cryptographically hashed with Keccak-256 and committed on-chain.
              </p>
            </div>

            <div className="hidden lg:flex flex-col items-end border-l border-stone-800 pl-8 space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-400 font-bold tracking-widest">
                PROTOCOL RULE
              </span>
              <span className="text-3xl font-black font-bebas text-[#FF5023] tracking-wide">
                ZERO SELF-AUDIT
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                ● 3rd-Party Verified
              </span>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {submittedId && (
          <div className="mb-8 p-6 rounded-3xl bg-emerald-950/90 text-emerald-100 border-2 border-emerald-500 shadow-2xl flex items-start gap-4 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center shrink-0 mt-0.5 text-base font-black">
              ✓
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-black font-bebas text-2xl uppercase tracking-wide text-emerald-300">
                  Campaign #{submittedId} Registered On-Chain
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PENDING_VERIFICATION
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
                Designated institutional verifier <code className="font-mono text-emerald-300 bg-black/40 px-2 py-0.5 rounded text-[11px] font-bold">{verifierAddress.slice(0, 10)}...</code> has been assigned to audit credentials before public funding opens.
              </p>
            </div>
          </div>
        )}

        {/* Create Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-stone-300 shadow-sm space-y-6">
            
            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">
                  Campaign Title *
                </label>
                <span className="text-[10px] font-mono text-stone-400">Public Blockchain Record</span>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. Build Rural STEM Lab & Robotics Center"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
              />
            </div>

            {/* Category & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                >
                  <option value="Education">Education</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Environment">Environment</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                />
              </div>
            </div>

            {/* Target Goal & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">
                  Target Goal (ETH) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={goalEth}
                  onChange={(e) => setGoalEth(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">
                  Funding Duration (Days) *
                </label>
                <input
                  type="number"
                  required
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                />
              </div>
            </div>

            {/* Designated Verifier Address */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">
                  Designated Institutional Verifier Address *
                </label>
                <span className="text-[10px] font-mono text-[#FF5023] font-bold">Rule: Non-Creator</span>
              </div>
              <input
                type="text"
                required
                value={verifierAddress}
                onChange={(e) => setVerifierAddress(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-mono text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
              />
              <span className="text-[10px] text-stone-500 font-mono block">
                Rule: Designated auditor must sign off before campaign can accept donations.
              </span>
            </div>

            {/* Story & Objectives */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">
                Campaign Story &amp; Expenditure Objectives *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe project deliverables, milestone objectives, and procurement requirements..."
                value={story}
                onChange={(e) => setStory(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
              />
            </div>

            {/* Real-time Canonical Metadata Hash Preview in Charcoal Inspector */}
            <div className="p-5 rounded-2xl bg-[#141613] text-white border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-400">
                  DETERMINISTIC METADATA HASH (KECCAK-256)
                </span>
                <span className="text-[10px] font-mono text-stone-400">
                  Calculated Client-side
                </span>
              </div>
              <code className="font-mono text-xs text-emerald-400 break-all select-all tracking-tight leading-relaxed block bg-black/60 p-3 rounded-xl border border-stone-800">
                {computedMetadataHash}
              </code>
            </div>

            {/* Submit Button (FinFLO High-Energy Developer Button) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-8 rounded-2xl bg-[#181816] hover:bg-black text-white font-black font-bebas text-2xl tracking-wider uppercase transition-all shadow-xl hover:shadow-2xl hover:scale-[1.005] active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-3"
            >
              <span>{isSubmitting ? "Anchoring on Blockchain..." : "Register Campaign & Commit Hash"}</span>
              <span className="w-7 h-7 rounded-full bg-[#FF5023] text-white flex items-center justify-center text-sm font-bold">
                →
              </span>
            </button>

          </div>
        </form>

      </main>
    </div>
  );
}
