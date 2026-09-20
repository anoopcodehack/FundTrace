"use client";

import React, { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useWallet } from "@/context/WalletContext";
import { computeCanonicalMetadataHash } from "@/lib/canonical";
import { ethers } from "ethers";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreateCampaignPage() {
  const { wallet, signer } = useWallet();
  const router = useRouter();

  // Wizard State
  const [step, setStep] = useState(1);

  // Step 1 State: Campaign Details
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Education");
  const [location, setLocation] = useState("Bengaluru, India");
  const [shortDescription, setShortDescription] = useState("");
  const [story, setStory] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [supportingDocs, setSupportingDocs] = useState("");

  // Step 2 State: Funding Setup
  const [goalFtu, setGoalFtu] = useState("100000"); // 1 FTU = ₹1
  const [deadline, setDeadline] = useState("");
  
  const [plannedBudget, setPlannedBudget] = useState<{ category: string; amount: number }[]>([
    { category: "Equipment", amount: 0 },
    { category: "Materials", amount: 0 },
    { category: "Operations", amount: 0 },
    { category: "Services", amount: 0 },
    { category: "Other", amount: 0 },
  ]);

  const totalPlanned = plannedBudget.reduce((sum, item) => sum + item.amount, 0);
  const remainingBudget = Number(goalFtu) - totalPlanned;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  // Compute canonical metadata hash in real time
  const computedMetadataHash = title && story
    ? computeCanonicalMetadataHash({
        title,
        story,
        category,
        location
      })
    : "0x7c21b8d862db1881c3edd13b662e0815f119004521083617159f709d45b52003";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.isConnected || !signer) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setIsSubmitting(true);
    
    if (totalPlanned > Number(goalFtu)) {
      toast.error("Planned budget cannot exceed funding goal.");
      setIsSubmitting(false);
      return;
    }

    const toastId = toast.loading("Validating campaign via NestJS API...");

    try {
      // Flow: Next.js -> NestJS API -> Validate -> Supabase -> Generate Hash -> Prepare TX -> Next.js -> MetaMask -> Sign -> Solidity
      
      const payload = {
        title,
        category,
        location,
        shortDescription,
        story,
        coverImage,
        supportingDocs,
        goalFtu: Number(goalFtu),
        deadline,
        plannedBudget,
        creatorAddress: wallet.address
      };

      // 1. Send to NestJS API to validate and prepare the transaction
      // Mocking the backend API call here. In reality this calls the NestJS backend.
      const apiResponse = await fetch("http://localhost:3001/api/campaigns/prepare", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-wallet-address": wallet.address || "" 
        },
        body: JSON.stringify(payload)
      });

      const responseText = await apiResponse.text();
      if (!apiResponse.ok) {
        console.error("API Error Response:", responseText);
        throw new Error(`Failed to prepare campaign via API: ${responseText}`);
      }
      
      const { transactionData, metadataHash, offChainId } = JSON.parse(responseText);

      toast.loading("Please sign the transaction in MetaMask...", { id: toastId });

      // 2. MetaMask signing
      const tx = await signer.sendTransaction({
        to: transactionData.to,
        data: transactionData.data,
      });

      toast.loading("Anchoring on blockchain...", { id: toastId });
      const receipt = await tx.wait();

      // Assuming the backend has a webhook or we notify the backend it succeeded
      await fetch(`http://localhost:3001/api/campaigns/${offChainId}/confirm`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-wallet-address": wallet.address || ""
        },
        body: JSON.stringify({ txHash: receipt?.hash })
      });

      toast.success(`Campaign successfully registered!`, { id: toastId });
      setSubmittedId(offChainId);
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create campaign", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RoleGuard allowedRoles={["CREATOR"]}>
      <div className="min-h-screen bg-[#F7F4ED] text-[#141414] pb-24">
        <main className="max-w-5xl mx-auto px-6 sm:px-12 pt-8 pb-16">
        
        {/* Colorful Editorial Hero Banner (FinFLO Theme) */}
        <div className="bg-[#161813] text-white rounded-[32px] p-8 sm:p-12 shadow-2xl relative overflow-hidden mb-8 border border-stone-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 text-xs font-mono font-medium border border-white/10">
                  Campaign Genesis
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-medium border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  FTU Model
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-bebas uppercase leading-[0.88] tracking-tight text-white">
                DEPLOY AUDITED CAMPAIGN
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed">
                Submit campaign details and funding goal in FTU. The quotation, AI analysis, donor sanction, and allocation process happens after the campaign is created.
              </p>
            </div>

            <div className="hidden lg:flex flex-col items-end border-l border-stone-800 pl-8 space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-400 font-bold tracking-widest">
                FUNDING UNIT
              </span>
              <span className="text-3xl font-black font-bebas text-[#FF5023] tracking-wide">
                1 FTU = ₹1
              </span>
              <span className="text-xs font-mono text-stone-400 font-semibold">
                Fixed-Value Accounting
              </span>
            </div>
          </div>
        </div>

        {/* Wizard Steps Header */}
        <div className="flex items-center justify-between mb-8 px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2 relative z-10 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all ${
                step === s ? "bg-[#FF5023] border-[#FF5023] text-white" :
                step > s ? "bg-[#141414] border-[#141414] text-white" :
                "bg-white border-stone-300 text-stone-400"
              }`}>
                {step > s ? "âœ“" : s}
              </div>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                step === s ? "text-[#FF5023]" : step > s ? "text-[#141414]" : "text-stone-400"
              }`}>
                {s === 1 ? "Details" : s === 2 ? "Funding" : "Review"}
              </span>
            </div>
          ))}
          <div className="absolute left-0 right-0 h-0.5 bg-stone-300 -z-10 top-5 mx-12 md:mx-32" />
        </div>

        {/* Wizard Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-stone-300 shadow-sm space-y-6 min-h-[400px]">
            
            {/* STEP 1: CAMPAIGN DETAILS */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-black font-bebas tracking-wide uppercase text-[#141414] border-b border-stone-200 pb-3">
                  Step 1: Campaign Details
                </h2>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">Campaign Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Build Rural STEM Lab & Robotics Center"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">Category *</label>
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
                    <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">Location *</label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">Short Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="A brief summary of your campaign..."
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">Campaign Story & Objectives *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe project deliverables, milestone objectives, and procurement requirements..."
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">Cover Image URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">Supporting Documents URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="Google Drive link etc..."
                      value={supportingDocs}
                      onChange={(e) => setSupportingDocs(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* STEP 2: FUNDING SETUP */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-black font-bebas tracking-wide uppercase text-[#141414] border-b border-stone-200 pb-3">
                  Step 2: Funding Setup
                </h2>

                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold shrink-0">i</div>
                  <p className="text-xs text-amber-900 leading-relaxed pt-1">
                    <strong>FundTrace Unit: 1 FTU = ₹1.</strong> <br/>
                    FTU is the fixed-value accounting unit used by FundTrace for the prototype. It avoids campaign-value changes caused by volatile crypto prices. Do not consider FTU as real cryptocurrency.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">Funding Goal (₹ / FTU) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-stone-500 font-bold">₹</span>
                      <input
                        type="number"
                        required
                        value={goalFtu}
                        onChange={(e) => setGoalFtu(e.target.value)}
                        className="w-full p-3.5 pl-8 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-stone-600">Campaign Funding Deadline *</label>
                    <input
                      type="date"
                      required
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023] focus:ring-1 focus:ring-[#FF5023]"
                    />
                    <p className="text-[10px] text-stone-500 mt-1">This defines how long the campaign accepts contributions. It does NOT represent when funds will be claimed.</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-stone-200">
                  <div>
                    <h3 className="text-lg font-bold font-bebas tracking-wide uppercase text-[#141414]">Planned Fund Usage</h3>
                    <p className="text-[11px] text-stone-500">Optionally define expected spending categories to provide context for the AI quotation analysis system.</p>
                  </div>
                  
                  <div className="space-y-3">
                    {plannedBudget.map((item, index) => (
                      <div key={item.category} className="flex items-center gap-4">
                        <div className="w-1/3">
                          <span className="text-xs font-semibold text-stone-700">{item.category}</span>
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-stone-500 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={item.amount || ""}
                            onChange={(e) => {
                              const newBudget = [...plannedBudget];
                              newBudget[index].amount = Number(e.target.value);
                              setPlannedBudget(newBudget);
                            }}
                            className="w-full p-2 pl-7 rounded-lg border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#FF5023]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-4 flex items-center justify-between text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-stone-500 font-bold">PLANNED</span>
                      <span className="text-stone-900 font-black text-sm">₹{totalPlanned}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-stone-500 font-bold">REMAINING / UNASSIGNED</span>
                      <span className={`font-black text-sm ${remainingBudget < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        ₹{remainingBudget}
                      </span>
                    </div>
                  </div>
                  {remainingBudget < 0 && (
                    <p className="text-xs text-red-500 font-bold">Planned budget cannot exceed the funding goal.</p>
                  )}
                </div>

              </div>
            )}

            {/* STEP 3: REVIEW & CREATE */}
            {step === 3 && (
              <div className="space-y-8 animate-fade-in">
                <h2 className="text-2xl font-black font-bebas tracking-wide uppercase text-[#141414] border-b border-stone-200 pb-3">
                  Step 3: Review & Create
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Summary Details */}
                  <div className="space-y-4 text-sm">
                    <div className="flex flex-col border-b border-stone-100 pb-2">
                      <span className="text-[10px] font-mono uppercase text-stone-500">Campaign Title</span>
                      <strong className="text-[#141414] text-base">{title || "Untitled"}</strong>
                    </div>
                    <div className="flex flex-col border-b border-stone-100 pb-2">
                      <span className="text-[10px] font-mono uppercase text-stone-500">Category & Location</span>
                      <strong className="text-[#141414]">{category} &middot; {location}</strong>
                    </div>
                    <div className="flex flex-col border-b border-stone-100 pb-2">
                      <span className="text-[10px] font-mono uppercase text-stone-500">Goal</span>
                      <strong className="text-[#FF5023] text-lg font-bebas tracking-wide">{goalFtu} FTU / ₹{goalFtu}</strong>
                    </div>
                    <div className="flex flex-col border-b border-stone-100 pb-2">
                      <span className="text-[10px] font-mono uppercase text-stone-500">Creator Wallet</span>
                      <code className="text-xs text-stone-600 bg-stone-100 px-2 py-1 rounded inline-block mt-1">{wallet.address || "Not connected"}</code>
                    </div>
                  </div>

                  {/* Visual Flow Representation */}
                  <div className="bg-[#141613] rounded-2xl p-6 text-white border border-stone-800">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-stone-400 mb-4 text-center">FundTrace Protocol Flow</h3>
                    
                    <div className="flex flex-col items-center gap-1 font-mono text-[10px] sm:text-xs">
                      <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">DONATIONS</div>
                      <div className="text-stone-500">â†“</div>
                      <div className="bg-[#FF5023]/20 text-[#FF5023] font-bold px-3 py-1.5 rounded-lg border border-[#FF5023]/30">FUNDS LOCKED</div>
                      <div className="text-stone-500">â†“</div>
                      <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">QUOTATION</div>
                      <div className="text-stone-500">â†“</div>
                      <div className="bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30">AI ANALYSIS</div>
                      <div className="text-stone-500">â†“</div>
                      <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">DONOR SANCTION</div>
                      <div className="text-stone-500">â†“</div>
                      <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">ALLOCATION</div>
                      <div className="text-stone-500">â†“</div>
                      <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">CREATOR CLAIM</div>
                      <div className="text-stone-500">â†“</div>
                      <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">INVOICE / PROOF</div>
                      <div className="text-stone-500">â†“</div>
                      <div className="bg-amber-500/20 text-amber-400 font-bold px-3 py-1.5 rounded-lg border border-amber-500/30">AUDIT</div>
                    </div>
                  </div>
                </div>

                {/* Real-time Canonical Metadata Hash Preview in Charcoal Inspector */}
                <div className="p-5 rounded-2xl bg-stone-100 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-500">
                      DETERMINISTIC METADATA HASH
                    </span>
                  </div>
                  <code className="font-mono text-xs text-stone-800 break-all select-all tracking-tight leading-relaxed block bg-white p-3 rounded-xl border border-stone-300">
                    {computedMetadataHash}
                  </code>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !wallet.isConnected}
                  className="w-full py-4 px-8 rounded-2xl bg-[#181816] hover:bg-black text-white font-black font-bebas text-2xl tracking-wider uppercase transition-all shadow-xl hover:shadow-2xl hover:scale-[1.005] active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-3"
                >
                  <span>{isSubmitting ? "Processing via NestJS API..." : "Register Campaign & Commit Hash"}</span>
                  <span className="w-7 h-7 rounded-full bg-[#FF5023] text-white flex items-center justify-center text-sm font-bold">
                    â†’
                  </span>
                </button>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-stone-200">
              {step > 1 ? (
                <button 
                  type="button" 
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2.5 rounded-full font-bold text-xs uppercase bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                >
                  â† Back
                </button>
              ) : <div/>}

              {step < 3 ? (
                <button 
                  type="button" 
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2.5 rounded-full font-bold text-xs uppercase bg-[#FF5023] hover:bg-[#ff5d32] text-white transition-colors"
                >
                  Next Step â†’
                </button>
              ) : <div/>}
            </div>

          </div>
        </form>

      </main>
      </div>
    </RoleGuard>
  );
}
