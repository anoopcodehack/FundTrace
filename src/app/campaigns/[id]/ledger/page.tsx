"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";

interface LedgerEvent {
  id: string;
  eventName: "CampaignCreated" | "CampaignVerified" | "Donated" | "FundingClosed" | "RequestCreated" | "Approved" | "RequestApproved" | "Released" | "ProofSubmitted";
  blockNumber: number;
  txHash: string;
  timestamp: string;
  actor: string;
  details: string;
  badge: string;
}

const SAMPLE_EVENTS: LedgerEvent[] = [
  {
    id: "1",
    eventName: "ProofSubmitted",
    blockNumber: 14,
    txHash: "0x8f23c91e4827d018471928472910481029384719284719284719284719284712",
    timestamp: "12 mins ago",
    actor: "0x7099...79C8 (Creator)",
    details: "Receipt Hash: 0xb80dd0075275c63869fb31316e6d22a58911ec5896ed2c98bdaf0382ac4925fd",
    badge: "ON-TIME PROOF",
  },
  {
    id: "2",
    eventName: "Released",
    blockNumber: 11,
    txHash: "0x71a2b84729104810293847192847192847192847192847128f23c91e4827d018",
    timestamp: "45 mins ago",
    actor: "0x976E...0aa9 (Vendor)",
    details: "Transferred 1.20 ETH to Recipient for Request #01",
    badge: "1.20 ETH RELEASED",
  },
  {
    id: "3",
    eventName: "RequestApproved",
    blockNumber: 10,
    txHash: "0x604810293847192847192847192847128f23c91e4827d01871a2b84729104810",
    timestamp: "50 mins ago",
    actor: "0x15d3...6A65 (Bob)",
    details: "Crossed >50% Approval Threshold (78.2% Total Weight)",
    badge: "THRESHOLD MET",
  },
  {
    id: "4",
    eventName: "Approved",
    blockNumber: 9,
    txHash: "0x5847192847192847128f23c91e4827d01871a2b8472910481029384719284710",
    timestamp: "52 mins ago",
    actor: "0x90F7...b906 (Alice)",
    details: "Cast 1.50 ETH Contribution Weight (46.9%)",
    badge: "VOTE RECORDED",
  },
  {
    id: "5",
    eventName: "FundingClosed",
    blockNumber: 6,
    txHash: "0x4810293847192847192847128f23c91e4827d01871a2b8472910481029384719",
    timestamp: "1 hour ago",
    actor: "0x9965...A4dc (Charlie)",
    details: "Goal Reached: 3.20 ETH Total Raised (107% Funded)",
    badge: "CLOSED FOR SPENDING",
  },
  {
    id: "6",
    eventName: "Donated",
    blockNumber: 4,
    txHash: "0x392847192847128f23c91e4827d01871a2b84729104810293847192847192847",
    timestamp: "1 hour ago",
    actor: "0x90F7...b906 (Alice)",
    details: "Donated 1.50 ETH to Escrow Pool",
    badge: "DONATION RECEIVED",
  },
  {
    id: "7",
    eventName: "CampaignVerified",
    blockNumber: 2,
    txHash: "0x2847128f23c91e4827d01871a2b8472910481029384719284719284719284719",
    timestamp: "2 hours ago",
    actor: "0x3C44...93BC (Auditor)",
    details: "Audited & Verified Credentials (STEM License #8472)",
    badge: "INSTITUTIONAL AUDIT",
  },
  {
    id: "8",
    eventName: "CampaignCreated",
    blockNumber: 1,
    txHash: "0x128f23c91e4827d01871a2b84729104810293847192847192847192847192847",
    timestamp: "2 hours ago",
    actor: "0x7099...79C8 (Creator)",
    details: "Metadata Hash: 0x7c21b8d862db1881c3edd13b662e0815f119004521083617159f709d45b52003",
    badge: "GENESIS EVENT",
  },
];

export default function CampaignLedgerPage() {
  const params = useParams();
  const id = Number(params?.id || 1);

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#141414] pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 sm:px-12 pt-10">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-stone-500 mb-4 uppercase tracking-wider">
          <Link href="/campaigns" className="hover:text-[#FF5023]">Campaigns</Link>
          <span>/</span>
          <Link href={`/campaigns/${id}`} className="hover:text-[#FF5023]">Campaign #{id}</Link>
          <span>/</span>
          <span className="text-stone-900">Public Audit Ledger</span>
        </div>

        {/* Ledger Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-stone-300">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF5023]">
              PUBLIC VERIFIABILITY · ZERO LOGIN REQUIRED
            </span>
            <h1 className="text-4xl sm:text-6xl font-black font-bebas uppercase leading-none text-[#141414] mt-1">
              CAMPAIGN #{id} EVENT LEDGER
            </h1>
          </div>

          <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
            Direct Contract Event Feed (Chain ID: 31337)
          </span>
        </div>

        {/* Immutable Audit Ledger Table */}
        <div className="mt-8 bg-white rounded-3xl border border-stone-300 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#181816] text-stone-300 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-4 px-5">Block</th>
                  <th className="py-4 px-5">Event</th>
                  <th className="py-4 px-5">Actor Address</th>
                  <th className="py-4 px-5">Details / Hash Commitment</th>
                  <th className="py-4 px-5">Transaction</th>
                  <th className="py-4 px-5">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800">
                {SAMPLE_EVENTS.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-4 px-5 font-mono text-stone-500">
                      #{item.blockNumber}
                    </td>

                    <td className="py-4 px-5 font-bold text-stone-900">
                      {item.eventName}
                    </td>

                    <td className="py-4 px-5 font-mono text-xs text-stone-600">
                      {item.actor}
                    </td>

                    <td className="py-4 px-5 font-mono text-[11px] text-stone-600 max-w-xs truncate">
                      {item.details}
                    </td>

                    <td className="py-4 px-5 font-mono text-[11px] text-blue-600 truncate max-w-[140px]">
                      {item.txHash.slice(0, 10)}...{item.txHash.slice(-6)}
                    </td>

                    <td className="py-4 px-5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-800">
                        {item.badge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
