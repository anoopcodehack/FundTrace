"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  TrendingDown,
  CheckCircle2,
  ChevronDown,
  Check,
  ReceiptText,
} from "lucide-react";

export default function AiReceiptFraudDetector() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"pricing" | "ocr" | "duplicates">("pricing");

  return (
    <div className="rounded-2xl bg-[#FFF9F6] border border-[#FF5023]/30 p-5 sm:p-6 text-stone-900 shadow-xs transition-all">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF5023] text-white text-[11px] font-mono font-bold uppercase tracking-wider shadow-xs">
              <ReceiptText className="w-3 h-3" /> Pre-Vote Invoice Audit
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-mono font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 98.4% Legit · Low Risk
            </span>
          </div>
          
          <h4 className="text-base sm:text-lg font-bold text-stone-900 mt-2">
            Expenditure &amp; Price-Inflation Verification
          </h4>
          <p className="text-xs text-stone-500 mt-0.5">
            Automated market benchmark and duplicate check before donors cast their votes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 font-bold">
            0% Inflation
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="py-1.5 px-3.5 rounded-full bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <span>{isExpanded ? "Hide Details" : "View Breakdown"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* 3 Clean White Cards with Punch Orange Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs font-mono">
        
        {/* Metric 1 */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-xs space-y-1">
          <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
            Market Price Delta
          </div>
          <div className="text-emerald-700 font-bold flex items-center gap-1 text-sm">
            <TrendingDown className="w-4 h-4 text-emerald-600" /> -1.3% vs Regional Avg
          </div>
          <div className="text-[10px] text-stone-500">Fair market corridor verified</div>
        </div>

        {/* Metric 2 */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-xs space-y-1">
          <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
            Invoice OCR Match
          </div>
          <div className="text-stone-900 font-bold flex items-center gap-1 text-sm truncate">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Apex Solar Labs Ltd.
          </div>
          <div className="text-[10px] text-stone-500">Tax ID active &amp; verified</div>
        </div>

        {/* Metric 3 */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-xs space-y-1">
          <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
            Duplicate Check
          </div>
          <div className="text-emerald-700 font-bold flex items-center gap-1 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> 0 Matches (Unique)
          </div>
          <div className="text-[10px] text-stone-500">Zero re-used receipt hashes</div>
        </div>

      </div>

      {/* Expandable Breakdown Drawer */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#FF5023]/20 space-y-3 animate-fade-in">
          
          {/* Subtabs */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setActiveTab("pricing")}
              className={`py-1.5 px-3.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pricing"
                  ? "bg-[#FF5023] border-[#FF5023] text-white shadow-xs"
                  : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
              }`}
            >
              Itemized Price Benchmark
            </button>
            <button
              onClick={() => setActiveTab("ocr")}
              className={`py-1.5 px-3.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                activeTab === "ocr"
                  ? "bg-[#FF5023] border-[#FF5023] text-white shadow-xs"
                  : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
              }`}
            >
              Vendor &amp; Invoice OCR
            </button>
            <button
              onClick={() => setActiveTab("duplicates")}
              className={`py-1.5 px-3.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                activeTab === "duplicates"
                  ? "bg-[#FF5023] border-[#FF5023] text-white shadow-xs"
                  : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
              }`}
            >
              Duplicate Hash Scan
            </button>
          </div>

          {/* Tab 1: Itemized Price Benchmark */}
          {activeTab === "pricing" && (
            <div className="bg-white rounded-xl p-4 border border-stone-200 text-xs font-mono space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-stone-400 border-b border-stone-100 pb-2">
                <span>LINE ITEM</span>
                <div className="flex items-center gap-8">
                  <span>CLAIMED</span>
                  <span>MARKET BENCHMARK</span>
                  <span>VARIANCE</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-stone-900 font-bold block">Solar Battery Inverters (x2)</span>
                  <span className="text-[10px] text-stone-500">Model: SunPower Pro 5kVA</span>
                </div>
                <div className="flex items-center gap-10 font-mono">
                  <span className="text-stone-800 font-bold">0.30 FTC</span>
                  <span className="text-stone-500">0.29 FTC</span>
                  <span className="text-emerald-700 font-bold">+3.4% (Fair)</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-stone-100">
                <div>
                  <span className="text-stone-900 font-bold block">Laboratory Workbenches (x4)</span>
                  <span className="text-[10px] text-stone-500">ESD-Safe Steel Frame Tables</span>
                </div>
                <div className="flex items-center gap-10 font-mono">
                  <span className="text-stone-800 font-bold">0.20 FTC</span>
                  <span className="text-stone-500">0.21 FTC</span>
                  <span className="text-emerald-700 font-bold">-4.7% (Under Budget)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between text-stone-500 text-[11px] gap-1">
                <span>Total Milestone Request: <strong className="text-stone-900">0.50 FTC</strong></span>
                <span className="text-emerald-700 font-bold flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Within acceptable ±10% fair market corridor</span>
              </div>
            </div>
          )}

          {/* Tab 2: Vendor & Invoice OCR */}
          {activeTab === "ocr" && (
            <div className="bg-white rounded-xl p-4 border border-stone-200 text-xs font-mono space-y-2 shadow-xs">
              <div className="flex justify-between py-1">
                <span className="text-stone-500">Extracted Merchant:</span>
                <span className="text-stone-900 font-bold">Apex Solar Labs Ltd.</span>
              </div>
              <div className="flex justify-between py-1 border-t border-stone-100">
                <span className="text-stone-500">Tax / Business ID:</span>
                <span className="text-emerald-700 font-bold">07AABCA1234F1Z8 (Active &amp; Verified)</span>
              </div>
              <div className="flex justify-between py-1 border-t border-stone-100">
                <span className="text-stone-500">Invoice Date:</span>
                <span className="text-stone-800">2026-09-18 (Post-Milestone Creation)</span>
              </div>
              <div className="flex justify-between py-1 border-t border-stone-100">
                <span className="text-stone-500">Digital Document Integrity:</span>
                <span className="text-emerald-700 font-bold">No Alteration Detected (Font &amp; Metadata Intact)</span>
              </div>
            </div>
          )}

          {/* Tab 3: Duplicate Hash Scan */}
          {activeTab === "duplicates" && (
            <div className="bg-white rounded-xl p-4 border border-stone-200 text-xs font-mono space-y-2 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
                <span className="text-stone-500">Invoice Keccak-256 Digest:</span>
                <span className="text-stone-800 font-semibold break-all">0x7f2a89c1048b29e018a38b4c09d182749a029481</span>
              </div>
              <div className="flex justify-between py-1 border-t border-stone-100">
                <span className="text-stone-500">Protocol Registry History:</span>
                <span className="text-emerald-700 font-bold">0 Reused Instances (Unique Hash)</span>
              </div>
              <div className="flex justify-between py-1 border-t border-stone-100">
                <span className="text-stone-500">Duplicate Submission Risk:</span>
                <span className="text-emerald-700 font-bold">0.00% (Unique submission)</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Advisory Bottom Line */}
      <div className="mt-4 pt-3 border-t border-[#FF5023]/20 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-stone-500 gap-2">
        <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Pre-Vote Audit Status: Verified safe for contributor release vote
        </span>
        <span className="text-stone-400">FundTrace Verified</span>
      </div>

    </div>
  );
}
