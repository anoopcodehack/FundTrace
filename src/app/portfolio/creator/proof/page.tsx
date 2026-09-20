"use client";

import React, { useState } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_QUOTATIONS, MOCK_CAMPAIGNS_METADATA } from '@/lib/mock';
import { formatFtu, QuotationState, ProofTiming } from '@/types';
import Link from 'next/link';
import { 
  ChevronRight,
  UploadCloud,
  FileBadge,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';

export default function CreatorProofPage() {
  const CREATOR_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  const proofPending = MOCK_QUOTATIONS.filter(q => 
    q.creatorAddress.toLowerCase() === CREATOR_ADDRESS.toLowerCase() &&
    (q.state === QuotationState.Claimed || q.state === QuotationState.ProofPending)
  );

  const proofSubmitted = MOCK_QUOTATIONS.filter(q => 
    q.creatorAddress.toLowerCase() === CREATOR_ADDRESS.toLowerCase() &&
    (q.state === QuotationState.ProofSubmitted || q.state === QuotationState.Completed)
  );

  return (
    <RoleGuard allowedRoles={["CREATOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/portfolio/creator" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Creator Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Proof of Expenditure</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Upload Invoices</h1>
              <p className="text-stone-600 font-medium mt-2">Submit receipts for claimed funds to maintain your reliability score.</p>
            </div>
          </header>

          <div className="space-y-8">
            {/* Requires Action */}
            <section>
              <h2 className="text-2xl font-black font-bebas uppercase mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> Action Required
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {proofPending.map(q => {
                  const meta = MOCK_CAMPAIGNS_METADATA[q.campaignId];
                  return (
                    <div key={q.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-200 shadow-md ring-1 ring-orange-100 overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-orange-100 bg-orange-50/50">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold font-display text-stone-900">{q.purpose}</h3>
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full">
                            <Clock className="w-3 h-3" /> Due Soon
                          </span>
                        </div>
                        <p className="text-sm text-stone-500 font-medium">Campaign: <span className="font-bold text-stone-700">{meta?.title}</span></p>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                        <div>
                          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Claimed Amount to Verify</p>
                          <p className="text-3xl font-black font-bebas text-stone-900">{formatFtu(q.claimedAmountFtu || 0)}</p>
                        </div>
                        <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer group">
                          <UploadCloud className="w-8 h-8 text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
                          <p className="font-bold text-stone-700 mb-1">Upload Receipt / Invoice</p>
                          <p className="text-xs text-stone-500">PDF, JPG, or PNG up to 10MB</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {proofPending.length === 0 && (
                  <div className="col-span-full bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
                    <p className="text-stone-500 font-medium">You have no pending proofs of expenditure to submit.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Submitted Proofs */}
            <section>
              <h2 className="text-2xl font-black font-bebas uppercase mb-4 flex items-center gap-2 text-stone-700 mt-12">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Submitted Proofs
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {proofSubmitted.map(q => {
                  return (
                    <div key={q.id} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-stone-900 line-clamp-1">{q.purpose}</h3>
                        <FileBadge className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-stone-500 mb-1">Verified Amount</p>
                          <p className="font-bold font-mono text-stone-800">{formatFtu(q.claimedAmountFtu || 0)}</p>
                        </div>
                        {q.proofTiming === ProofTiming.Late ? (
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Submitted Late</span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">On Time</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
