"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Coins,
  Lock,
  FileCheck2,
  ExternalLink,
  CheckCircle2,
  Clock,
  UserCheck,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react";

interface FlowNode {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  amount: string;
  statusBadge: string;
  statusType: "success" | "warning" | "neutral";
  details: string;
  txHash?: string;
  proofHash?: string;
  metrics: { label: string; value: string }[];
}

export default function MoneyFlowVisualizer({ campaignId = 1 }: { campaignId?: number }) {
  const [selectedId, setSelectedId] = useState<string>("m1");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);

  const nodes: FlowNode[] = [
    {
      id: "donors",
      step: "01",
      title: "Contributors",
      subtitle: "3 Verified Donors",
      amount: "3.20 FTC",
      statusBadge: "Deposited",
      statusType: "neutral",
      details: "Multi-donor contribution pool locked in non-custodial smart escrow. Alice (1.50 FTC · 46.9% voting weight), Bob (1.00 FTC · 31.3%), Charlie (0.70 FTC · 21.8%).",
      txHash: "0x4a19e83f72e9a2b5c018274d9e0129fbc81203",
      metrics: [
        { label: "Donor Count", value: "3 Contributors" },
        { label: "Governance Rule", value: ">50.0% Snapshot Quorum" },
        { label: "Escrow Deposit Block", value: "Block #19482710" },
      ],
    },
    {
      id: "contract",
      step: "02",
      title: "Fund Escrow",
      subtitle: "Smart Contract #31337",
      amount: "2.00 FTC",
      statusBadge: "In Escrow",
      statusType: "neutral",
      details: "Autonomous smart contract vault. Contributed funds remain locked in escrow until milestone requests pass contributor majority voting.",
      txHash: "0x8f3c71a04b12d59e44921074da918239049182",
      metrics: [
        { label: "Escrow Balance", value: "2.00 FTC Remaining" },
        { label: "Protection", value: "Dead-Man 30-Day Auto-Refund" },
        { label: "Release Gate", value: "Snapshot Contributor Approval" },
      ],
    },
    {
      id: "m1",
      step: "03",
      title: "Milestone 1",
      subtitle: "50 Robotics Kits",
      amount: "1.20 FTC",
      statusBadge: "Released",
      statusType: "success",
      details: "Spending Request #01 approved by 78.2% contributor consensus. Funds released on-chain to authorized vendor with on-time receipt delivery.",
      txHash: "0xd92a83ef60b7194c718293a102948201948201",
      proofHash: "0xb80dd0075275c63869fb31316e6d22a58911ec5896ed2c98bdaf0382ac4925fd",
      metrics: [
        { label: "Approval Quorum", value: "78.2% (Passed)" },
        { label: "Proof Submission", value: "On-Time (Before Deadline)" },
        { label: "Goods Status", value: "Physical Delivery Attested" },
      ],
    },
    {
      id: "vendor1",
      step: "04",
      title: "Beneficiary",
      subtitle: "Principal Sharma (STEM)",
      amount: "1.20 FTC",
      statusBadge: "Disbursed",
      statusType: "success",
      details: "Authorized recipient wallet received funds and signed delivery attestation for 50 student robotics lab kits. No intermediary deductions.",
      txHash: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
      metrics: [
        { label: "Recipient Role", value: "School Principal / Beneficiary" },
        { label: "Delivery Sign-Off", value: "Attested On-Chain" },
        { label: "Vendor Address", value: "0x976E...0aa9" },
      ],
    },
    {
      id: "proof1",
      step: "05",
      title: "Proof Anchor",
      subtitle: "SHA-256 On-Chain",
      amount: "Verified",
      statusBadge: "Anchored",
      statusType: "success",
      details: "Cryptographic SHA-256 invoice hash stored immutably in smart contract storage. Any alteration to the invoice file is immediately flagged.",
      proofHash: "0xb80dd0075275c63869fb31316e6d22a58911ec5896ed2c98bdaf0382ac4925fd",
      metrics: [
        { label: "Hash Digest", value: "SHA-256 (Tamper-Evident)" },
        { label: "Verification Status", value: "100% Exact Match" },
        { label: "Audit Trial", value: "Publicly Inspectable" },
      ],
    },
  ];

  const activeNode = nodes.find((n) => n.id === selectedId) || nodes[2];

  function handleSimulate() {
    setIsSimulating(true);
    setSimulationNotice("Tracing active fund flow across smart escrow contract...");
    setTimeout(() => {
      setSimulationNotice("Flow verified: 3.20 FTC deposited → 1.20 FTC disbursed for Milestone 1 → SHA-256 invoice anchored.");
      setIsSimulating(false);
      setTimeout(() => setSimulationNotice(null), 4500);
    }, 1200);
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-sm text-stone-900">
      
      {/* Header Section (Matching Home Page Typography) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-mono font-bold uppercase tracking-wider border border-stone-200">
              <span className="w-2 h-2 rounded-full bg-[#FF5023]" />
              Fund Flow Lineage
            </span>
            <span className="text-xs text-stone-500 font-mono">Real-time on-chain tracking</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black font-bebas uppercase tracking-wide text-stone-900 mt-2 leading-none">
            Visual Fund Trace &amp; Spending Flow
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-2xl mt-1 leading-relaxed">
            Track donated capital step-by-step from contributor deposits into the smart escrow contract, down to community milestone votes, vendor disbursement, and permanent receipt verification.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="py-2.5 px-5 rounded-full bg-[#FF5023] hover:bg-[#e0431a] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`} />
            {isSimulating ? "Tracing..." : "Trace Fund Flow"}
          </button>

          <Link
            href={`/campaigns/${campaignId}/ledger`}
            className="py-2.5 px-5 rounded-full border border-stone-300 hover:border-stone-900 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
            Audit Ledger
          </Link>
        </div>
      </div>

      {/* Simulation Feedback Alert */}
      {simulationNotice && (
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{simulationNotice}</span>
        </div>
      )}

      {/* 5 Clean Stage Cards */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {nodes.map((node) => {
          const isSelected = selectedId === node.id;

          return (
            <div
              key={node.id}
              onClick={() => setSelectedId(node.id)}
              className={`rounded-2xl p-5 border transition-all cursor-pointer select-none flex flex-col justify-between ${
                isSelected
                  ? "bg-stone-50 border-[#FF5023] ring-2 ring-[#FF5023]/20 shadow-md"
                  : "bg-white hover:bg-stone-50 border-stone-200 hover:border-stone-300 shadow-xs"
              }`}
            >
              {/* Step & Badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-mono font-bold text-stone-400">
                  Step {node.step}
                </span>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                    node.statusType === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : node.statusType === "warning"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-stone-100 text-stone-700 border-stone-200"
                  }`}
                >
                  {node.statusBadge}
                </span>
              </div>

              {/* Title & Amount */}
              <div>
                <div className="text-2xl sm:text-3xl font-black font-bebas text-stone-900 leading-none">
                  {node.amount}
                </div>
                <div className="text-sm font-bold text-stone-800 mt-1 leading-snug truncate">
                  {node.title}
                </div>
                <div className="text-xs text-stone-500 mt-0.5 truncate">
                  {node.subtitle}
                </div>
              </div>

              {/* Footer Indicator */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-mono">
                <span className={`text-[11px] font-semibold ${isSelected ? "text-[#FF5023]" : "text-stone-500"}`}>
                  {isSelected ? "Selected" : "Click to view"}
                </span>
                <span className="text-stone-400">→</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Step Inspector Panel (Clean Stone Card) */}
      <div className="mt-8 rounded-2xl bg-stone-50 border border-stone-200 p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                Step {activeNode.step} Details
              </span>
              <span className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Verified On-Chain
              </span>
            </div>
            <h3 className="text-xl font-bold text-stone-900 mt-1">
              {activeNode.title} · <span className="font-bebas text-2xl text-[#FF5023]">{activeNode.amount}</span>
            </h3>
          </div>

          <div className="text-xs font-mono text-stone-500">
            Status: <strong className="text-stone-800">{activeNode.statusBadge}</strong>
          </div>
        </div>

        {/* Narrative Description */}
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
          {activeNode.details}
        </p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {activeNode.metrics.map((metric, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-white border border-stone-200 space-y-0.5 font-mono">
              <div className="text-[10px] text-stone-400 uppercase tracking-wider">{metric.label}</div>
              <div className="text-xs font-bold text-stone-800 truncate">{metric.value}</div>
            </div>
          ))}
        </div>

        {/* On-Chain Hash References */}
        <div className="pt-3 border-t border-stone-200 font-mono text-xs space-y-2">
          {activeNode.txHash && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-stone-500 text-[11px]">Transaction / Account:</span>
              <span className="text-stone-800 text-[11px] break-all font-semibold select-all">
                {activeNode.txHash}
              </span>
            </div>
          )}
          {activeNode.proofHash && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-stone-500 text-[11px]">SHA-256 Invoice Hash:</span>
              <span className="text-emerald-700 text-[11px] break-all font-bold select-all">
                {activeNode.proofHash}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4 font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Released Funds
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-stone-400" /> Escrow Protected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF5023]" /> Active Selection
          </span>
        </div>

        <Link
          href="/verify-proof"
          className="text-[#FF5023] hover:underline font-bold flex items-center gap-1"
        >
          Inspect Receipt in Tamper Demo →
        </Link>
      </div>

    </div>
  );
}
