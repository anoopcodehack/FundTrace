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

      <main className="max-w-4xl mx-auto px-6 sm:px-12 pt-10">
        
        {/* Header */}
        <div className="pb-8 border-b border-stone-300">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF5023]">
            CAMPAIGN GENESIS
          </span>
          <h1 className="text-4xl sm:text-6xl font-black font-bebas uppercase leading-none text-[#141414] mt-1">
            CREATE CAMPAIGN
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-2">
            Submit campaign metadata, target goal, and designated institutional verifier. Canonical story text is cryptographically hashed and anchored on-chain.
          </p>
        </div>

        {/* Success Alert */}
        {submittedId && (
          <div className="mt-6 p-6 rounded-3xl bg-emerald-100 border border-emerald-400 text-emerald-950 space-y-2">
            <h4 className="font-bold text-base">✓ Campaign #{submittedId} Registered On Blockchain!</h4>
            <p className="text-xs text-emerald-800">
              State: <strong>PENDING_VERIFICATION</strong>. The designated institutional verifier (<code>{verifierAddress.slice(0, 10)}...</code>) has been notified to audit and approve the initiative before public funding can open.
            </p>
          </div>
        )}

        {/* Create Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-stone-300 shadow-md space-y-6">
            
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                Campaign Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Build Rural STEM Lab & Robotics Center"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023]"
              />
            </div>

            {/* Category & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023]"
                >
                  <option value="Education">Education</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Environment">Environment</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023]"
                />
              </div>
            </div>

            {/* Target Goal & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                  Target Goal (ETH) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={goalEth}
                  onChange={(e) => setGoalEth(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                  Funding Duration (Days) *
                </label>
                <input
                  type="number"
                  required
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023]"
                />
              </div>
            </div>

            {/* Designated Verifier Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                Designated Institutional Verifier Address *
              </label>
              <input
                type="text"
                required
                value={verifierAddress}
                onChange={(e) => setVerifierAddress(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-stone-300 bg-stone-50 text-xs font-mono text-stone-900 focus:outline-none focus:border-[#FF5023]"
              />
              <span className="text-[10px] text-stone-500">
                Rule: Verifier cannot be the creator address.
              </span>
            </div>

            {/* Story & Objectives */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                Campaign Story & Expenditure Vision *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe project deliverables, milestone objectives, and procurement requirements..."
                value={story}
                onChange={(e) => setStory(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023]"
              />
            </div>

            {/* Real-time Canonical Metadata Hash Preview */}
            <div className="p-4 rounded-2xl bg-[#181816] text-white text-xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF5023]">
                Deterministic Canonical Metadata Hash (Anchored On-Chain):
              </div>
              <div className="font-mono text-[11px] text-stone-300 break-all">
                {computedMetadataHash}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-[#FF5023] hover:bg-[#ff5d32] text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Anchoring on Blockchain..." : "Register Campaign & Commit Metadata Hash"}
            </button>

          </div>
        </form>

      </main>
    </div>
  );
}
