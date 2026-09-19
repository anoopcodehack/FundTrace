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

      <main className="max-w-7xl mx-auto px-6 sm:px-12 pt-14 sm:pt-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-stone-300">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF5023]">
              ON-CHAIN AUDITED DIRECTORY
            </span>
            <h1 className="text-4xl sm:text-6xl font-black font-bebas uppercase leading-none text-[#141414] mt-1">
              EXPLORE CAMPAIGNS
            </h1>
          </div>

          {/* Filter Control: Segmented Developer Tab Bar */}
          <div className="inline-flex p-1 rounded-xl bg-stone-200/70 border border-stone-300/80 gap-1">
            <button
              onClick={() => setFilter("all")}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                filter === "all"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All ({CAMPAIGNS_DATA.length})
            </button>
            <button
              onClick={() => setFilter("verified")}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                filter === "verified"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Verified
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                filter === "pending"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Pending Audit
            </button>
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

                {/* Financial Metrics (Clean Senior Developer Layout) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-bold tracking-tight text-stone-900 font-sans tabular-nums">
                        {campaign.raisedEth.toFixed(2)} ETH
                      </span>
                      <span className="text-xs text-stone-500 ml-1.5 font-normal">
                        raised of {campaign.goalEth.toFixed(2)} ETH
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-stone-700 tabular-nums font-mono">
                      {pct}%
                    </span>
                  </div>

                  {/* Sleek Minimal Progress Track */}
                  <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden border border-stone-200/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        campaign.status === "PROOF_OVERDUE" ? "bg-rose-500" : "bg-stone-900"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  {/* Accounting Escrow Breakdown */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/60">
                      <span className="text-[10px] uppercase font-medium tracking-wider text-stone-400 block">In Escrow</span>
                      <span className="font-semibold text-stone-800 tabular-nums">{campaign.balanceEth.toFixed(2)} ETH</span>
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/60">
                      <span className="text-[10px] uppercase font-medium tracking-wider text-stone-400 block">Released</span>
                      <span className="font-semibold text-stone-800 tabular-nums">{campaign.releasedEth.toFixed(2)} ETH</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-black text-white text-center font-semibold text-xs transition-colors shadow-xs"
                  >
                    View Campaign
                  </Link>
                  <Link
                    href={`/campaigns/${campaign.id}/ledger`}
                    className="py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-center font-mono font-semibold text-xs transition-colors border border-stone-200 shadow-xs"
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
