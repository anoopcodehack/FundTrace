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

      <main className="max-w-7xl mx-auto px-6 sm:px-12 pt-12">
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

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`py-2 px-4 rounded-full text-xs font-bold transition-all ${filter === "all" ? "bg-[#181816] text-white shadow" : "bg-white text-stone-700 border border-stone-300"}`}
            >
              All ({CAMPAIGNS_DATA.length})
            </button>
            <button
              onClick={() => setFilter("verified")}
              className={`py-2 px-4 rounded-full text-xs font-bold transition-all ${filter === "verified" ? "bg-[#181816] text-white shadow" : "bg-white text-stone-700 border border-stone-300"}`}
            >
              Verified
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`py-2 px-4 rounded-full text-xs font-bold transition-all ${filter === "pending" ? "bg-[#181816] text-white shadow" : "bg-white text-stone-700 border border-stone-300"}`}
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
                className="bg-white rounded-3xl p-6 border border-stone-300 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                {/* Status Badges */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-100 text-stone-800">
                    {campaign.category} · #{campaign.id}
                  </span>

                  {campaign.status === "PROOF_OVERDUE" && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-red-600 text-white animate-pulse">
                      PROOF OVERDUE
                    </span>
                  )}
                  {campaign.status === "PENDING_VERIFICATION" && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500 text-stone-950">
                      PENDING AUDIT
                    </span>
                  )}
                  {campaign.status === "FUNDING_CLOSED" && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-600 text-white">
                      107% FUNDED
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-2xl font-black font-bebas uppercase text-[#141414] leading-tight hover:text-[#FF5023] transition-colors">
                    <Link href={`/campaigns/${campaign.id}`}>
                      {campaign.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-stone-600 mt-2 line-clamp-2">
                    {campaign.description}
                  </p>
                </div>

                {/* Progress Bar & Balances */}
                <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-stone-800">Raised: {campaign.raisedEth.toFixed(2)} ETH</span>
                    <span className="text-[#FF5023]">Goal: {campaign.goalEth.toFixed(2)} ETH ({pct}%)</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full ${campaign.status === "PROOF_OVERDUE" ? "bg-red-500" : pct >= 100 ? "bg-[#FF5023]" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500 pt-1 font-mono">
                    <span>In Escrow: <strong>{campaign.balanceEth.toFixed(2)} ETH</strong></span>
                    <span>Released: <strong>{campaign.releasedEth.toFixed(2)} ETH</strong></span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="flex-1 py-3 px-4 rounded-2xl bg-[#181816] hover:bg-black text-white text-center font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    View Campaign
                  </Link>
                  <Link
                    href={`/campaigns/${campaign.id}/ledger`}
                    className="py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-center font-bold text-xs uppercase tracking-wider transition-all"
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
