"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";

interface LedgerEvent {
  id: string;
  eventName:
    | "CampaignCreated"
    | "CampaignVerified"
    | "Donated"
    | "FundingClosed"
    | "RequestCreated"
    | "Approved"
    | "RequestApproved"
    | "Released"
    | "ProofSubmitted"
    | "BeneficiarySet"
    | "DeliveryConfirmed"
    | "DormancyRefundClaimed";
  blockNumber: number;
  txHash: string;
  timestamp: string;
  actor: string;
  details: string;
  badge: string;
}

const SAMPLE_EVENTS: LedgerEvent[] = [
  {
    id: "0",
    eventName: "DeliveryConfirmed",
    blockNumber: 15,
    txHash: "0x9f1827d01847192847291048102938471928471928471928471928471928478a",
    timestamp: "8 mins ago",
    actor: "0x976E...0aa9 (Principal Sharma)",
    details: "Attested Physical Receipt: 50 Arduino Robotics Kits & Sensors arrived at School",
    badge: "PHYSICAL DELIVERY CONFIRMED",
  },
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
    details: "Transferred 1.20 FTC to Recipient for Request #01",
    badge: "1.20 FTC RELEASED",
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
    details: "Cast 1.50 FTC Contribution Weight (46.9%)",
    badge: "VOTE RECORDED",
  },
  {
    id: "5",
    eventName: "FundingClosed",
    blockNumber: 6,
    txHash: "0x4810293847192847192847128f23c91e4827d01871a2b8472910481029384719",
    timestamp: "1 hour ago",
    actor: "0x9965...A4dc (Charlie)",
    details: "Goal Reached: 3.20 FTC Total Raised (107% Funded)",
    badge: "CLOSED FOR SPENDING",
  },
  {
    id: "6",
    eventName: "Donated",
    blockNumber: 4,
    txHash: "0x392847192847128f23c91e4827d01871a2b84729104810293847192847192847",
    timestamp: "1 hour ago",
    actor: "0x90F7...b906 (Alice)",
    details: "Donated 1.50 FTC to Escrow Pool",
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
  const [exportToast, setExportToast] = React.useState<string | null>(null);

  function handleExportCSV() {
    const headers = ["Block Number", "Event Name", "Timestamp", "Actor Address", "Details", "Transaction Hash", "Audit Status"];
    const rows = SAMPLE_EVENTS.map((e) => [
      e.blockNumber,
      `"${e.eventName}"`,
      `"${e.timestamp}"`,
      `"${e.actor}"`,
      `"${e.details.replace(/"/g, '""')}"`,
      `"${e.txHash}"`,
      `"${e.badge}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fundtrace-campaign-${id}-audit-ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportToast("CSV Exported");
    setTimeout(() => setExportToast(null), 2500);
  }

  function handleExportJSON() {
    const jsonContent = JSON.stringify(
      {
        campaignId: id,
        network: "FundTrace Local Node (Chain ID 31337)",
        exportedAt: new Date().toISOString(),
        totalEvents: SAMPLE_EVENTS.length,
        events: SAMPLE_EVENTS,
      },
      null,
      2
    );
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fundtrace-campaign-${id}-audit-ledger.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportToast("JSON Exported");
    setTimeout(() => setExportToast(null), 2500);
  }

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

        {/* Clean Editorial Hero Banner (FinFLO Theme) */}
        <div className="bg-[#161813] text-white rounded-[32px] p-8 sm:p-12 shadow-2xl relative overflow-hidden mb-8 border border-stone-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 text-xs font-mono font-medium border border-white/10">
                  Public Verifiability
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-stone-300 text-xs font-mono font-medium border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Zero Login Required
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-bebas uppercase leading-[0.88] tracking-tight text-white">
                CAMPAIGN #{id} EVENT LEDGER
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed">
                Immutable chronological event log emitted by the FundTrace smart contract on FundTrace node.
              </p>
            </div>

            <div className="hidden lg:flex flex-col items-end border-l border-stone-800 pl-8 space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-400 font-bold tracking-widest">
                CHAIN NETWORK
              </span>
              <span className="text-3xl font-black font-bebas text-amber-400 tracking-wide">
                CHAIN ID 31337
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                ● Live Contract Feed
              </span>
            </div>
          </div>
        </div>

        {/* Table Controls & Export Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-stone-800">
              Audit Event Log ({SAMPLE_EVENTS.length} Verified Entries)
            </h3>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-mono font-bold transition-all shadow-xs cursor-pointer hover:border-stone-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-stone-600">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-mono font-bold transition-all shadow-xs cursor-pointer hover:border-stone-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-stone-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Export JSON</span>
            </button>

            {exportToast && (
              <span className="text-xs font-mono font-bold text-emerald-600 animate-fade-in">
                ✓ {exportToast}
              </span>
            )}
          </div>
        </div>

        {/* Immutable Audit Ledger Table */}
        <div className="mt-8 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
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
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-stone-100 text-stone-700 border border-stone-200">
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
