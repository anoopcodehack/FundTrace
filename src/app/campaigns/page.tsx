"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface CampaignItem {
  id: number;
  title: string;
  category: string;
  creator: string;
  verifier: string;
  goalEth: number;
  raisedEth: number;
  releasedEth: number;
  balanceEth: number;
  status: "FUNDING_CLOSED" | "PENDING_VERIFICATION" | "ACTIVE" | "PROOF_OVERDUE";
  isVerified: boolean;
  description: string;
  activeRequestId?: number;
}

const CAMPAIGNS_DATA: CampaignItem[] = [
  {
    id: 1,
    title: "Build Rural STEM Lab & Robotics Center",
    category: "Education",
    creator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    verifier: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    goalEth: 3.0,
    raisedEth: 3.2,
    releasedEth: 1.2,
    balanceEth: 2.0,
    status: "FUNDING_CLOSED",
    isVerified: true,
    description: "Equipping 500+ rural students with robotics toolkits, solar computers, and 3D printing equipment.",
    activeRequestId: 2,
  },
  {
    id: 2,
    title: "Clean Water Well & Community Filtration",
    category: "Sanitation",
    creator: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    verifier: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    goalEth: 5.0,
    raisedEth: 0.0,
    releasedEth: 0.0,
    balanceEth: 0.0,
    status: "PENDING_VERIFICATION",
    isVerified: false,
    description: "Deep borewell and ceramic membrane purification delivering potable drinking water to 1,200 villagers.",
  },
  {
    id: 3,
    title: "Solar Clinic Medical Refrigerators",
    category: "Healthcare",
    creator: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    verifier: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    goalEth: 1.0,
    raisedEth: 1.0,
    releasedEth: 0.8,
    balanceEth: 0.2,
    status: "PROOF_OVERDUE",
    isVerified: true,
    description: "Solar battery units preserving pediatric vaccines. Request #01 was released but proof deadline expired.",
  },
];

export default function CampaignsPage() {
  const [filter, setFilter] = useState<"all" | "verified" | "pending">("all");

  const filteredCampaigns = CAMPAIGNS_DATA.filter((c) => {
    if (filter === "verified") return c.isVerified;
    if (filter === "pending") return !c.isVerified;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#141414] pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 sm:px-12 pt-8 pb-16">
        
        {/* Colorful Editorial Hero Banner (FinFLO Theme) */}
        <div className="bg-[#161813] text-white rounded-[32px] p-8 sm:p-12 shadow-2xl relative overflow-hidden mb-8 border border-stone-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 text-xs font-mono font-medium border border-white/10">
                  On-Chain Directory
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-stone-300 text-xs font-mono font-medium border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Verified Audits
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-bebas uppercase leading-[0.88] tracking-tight text-white">
                EXPLORE CAMPAIGNS
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed">
                Discover transparent fundraising initiatives with milestone-based escrow release and cryptographically verified expense receipts.
              </p>
            </div>

            {/* Filter Control: High-Contrast Segmented Bar */}
            <div className="inline-flex p-1.5 rounded-2xl bg-black/60 border border-stone-800 gap-1.5 self-start lg:self-center">
              <button
                onClick={() => setFilter("all")}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-[#FF5023] text-white shadow-md"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                All ({CAMPAIGNS_DATA.length})
              </button>
              <button
                onClick={() => setFilter("verified")}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === "verified"
                    ? "bg-[#FF5023] text-white shadow-md"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                Verified
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === "pending"
                    ? "bg-[#FF5023] text-white shadow-md"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                Pending Audit
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
          {filteredCampaigns.map((campaign) => {
            const pct = Math.round((campaign.raisedEth / campaign.goalEth) * 100);
            return (
              <div
                key={campaign.id}
                className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-5 relative"
              >
                {/* Header: Category & Status Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                    {campaign.category} <span className="text-stone-400">#{campaign.id}</span>
                  </span>

                  {campaign.status === "PROOF_OVERDUE" && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Proof Overdue
                    </span>
                  )}
                  {campaign.status === "PENDING_VERIFICATION" && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Pending Audit
                    </span>
                  )}
                  {campaign.status === "FUNDING_CLOSED" && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Funded ({pct}%)
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-snug tracking-tight hover:text-[#FF5023] transition-colors">
                    <Link href={`/campaigns/${campaign.id}`}>
                      {campaign.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-stone-600 mt-2 line-clamp-2 leading-relaxed">
                    {campaign.description}
                  </p>
                </div>

                {/* Financial Metrics (FinFLO Editorial Style) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-500">
                        TOTAL RAISED
                      </div>
                      <div className="text-3xl sm:text-4xl font-black font-bebas text-stone-900 leading-none tracking-wide mt-0.5">
                        {campaign.raisedEth.toFixed(2)} <span className="text-lg font-bold text-stone-500">ETH</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-stone-500">
                        TARGET GOAL
                      </div>
                      <div className="text-xl font-black font-bebas text-stone-700 leading-none tracking-wide mt-0.5">
                        {campaign.goalEth.toFixed(2)} ETH
                      </div>
                    </div>
                  </div>

                  {/* Sleek Minimal Progress Track */}
                  <div className="w-full bg-stone-200/70 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        campaign.status === "PROOF_OVERDUE" ? "bg-rose-500" : "bg-[#FF5023]"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  {/* Accounting Escrow Breakdown */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/70">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-stone-400 block">In Escrow</span>
                      <span className="text-base font-black font-bebas text-stone-800 tracking-wide">{campaign.balanceEth.toFixed(2)} ETH</span>
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/70">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-stone-400 block">Released</span>
                      <span className="text-base font-black font-bebas text-stone-800 tracking-wide">{campaign.releasedEth.toFixed(2)} ETH</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#181816] hover:bg-black text-white text-center font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                  >
                    View Campaign
                  </Link>
                  <Link
                    href={`/campaigns/${campaign.id}/ledger`}
                    className="py-3 px-4 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-center font-mono font-bold text-xs uppercase tracking-wider transition-colors border border-stone-300 shadow-xs"
                    title="Inspect Public Ledger"
                  >
                    Ledger
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
