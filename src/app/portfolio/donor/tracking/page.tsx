"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_CAMPAIGNS_ONCHAIN, MOCK_CAMPAIGNS_METADATA, MOCK_QUOTATIONS } from '@/lib/mock';
import { formatFtu, QuotationState, QuotationMetadata } from '@/types';
import Link from 'next/link';
import { 
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowRight,
  CheckCircle2,
  FileBadge,
  Clock,
  Link as LinkIcon
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function DonorTrackingPage() {
  const searchParams = useSearchParams();
  const campaignIdParam = searchParams?.get('campaignId');
  const campaignId = campaignIdParam ? Number(campaignIdParam) : 1;

  const onchain = MOCK_CAMPAIGNS_ONCHAIN.find(c => c.id === campaignId);
  const meta = MOCK_CAMPAIGNS_METADATA[campaignId];
  const campaignQuotations = MOCK_QUOTATIONS.filter(q => q.campaignId === campaignId);

  if (!onchain) {
    return (
      <RoleGuard allowedRoles={["DONOR"]}>
        <div className="min-h-screen p-12 bg-[#F7F4ED] flex flex-col items-center justify-center">
          <p>Campaign not found.</p>
        </div>
      </RoleGuard>
    );
  }

  const raised = Number(onchain.totalDonatedWei);
  const allocated = Number(onchain.totalAllocatedWei);
  const sanctioned = Number(onchain.totalSanctionedWei);
  const claimed = Number(onchain.totalClaimedWei);
  // Simplify proof-backed as claimed amount for quotations with proof
  const proofBacked = campaignQuotations.filter(q => q.state === QuotationState.ProofSubmitted || q.state === QuotationState.Completed).reduce((acc, q) => acc + (q.claimedAmountFtu || 0), 0);
  const remaining = raised - allocated;

  const steps = [
    { label: "Raised", value: raised, color: "bg-emerald-500", text: "text-emerald-700" },
    { label: "Allocated", value: allocated, color: "bg-indigo-500", text: "text-indigo-700" },
    { label: "Sanctioned", value: sanctioned, color: "bg-blue-500", text: "text-blue-700" },
    { label: "Claimed", value: claimed, color: "bg-purple-500", text: "text-purple-700" },
    { label: "Proof-backed", value: proofBacked, color: "bg-emerald-600", text: "text-emerald-800" },
    { label: "Remaining", value: remaining, color: "bg-stone-300", text: "text-stone-600" },
  ];

  return (
    <RoleGuard allowedRoles={["DONOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/portfolio/donor" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Donor Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <Link href="/portfolio/donor/contributions" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Contributions</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Track Fund Flow</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Fund Flow Tracking</h1>
              <p className="text-stone-600 font-medium mt-2">End-to-end trace of capital deployment for: <span className="font-bold text-stone-900">{meta?.title}</span></p>
            </div>
          </header>

          {/* Visualization */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 lg:p-12">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-12 text-center">Capital Lifecycle</h2>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative">
              {/* Connection Lines (Desktop) */}
              <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-1 bg-stone-100 -z-10"></div>
              
              {steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center relative group w-full md:w-auto">
                  <div className="hidden md:block w-3 h-3 rounded-full bg-white border-2 border-stone-200 mb-4 z-10 group-hover:border-indigo-500 transition-colors"></div>
                  <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm text-center w-full min-w-[120px] transition-transform group-hover:-translate-y-1">
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{step.label}</p>
                    <p className={`text-xl font-black font-mono ${step.text}`}>{formatFtu(step.value)}</p>
                    {i > 0 && i < steps.length - 1 && (
                      <div className="mt-2 text-[10px] text-stone-400 font-medium">
                        {Math.round((step.value / raised) * 100)}% of Raised
                      </div>
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="md:hidden py-2 text-stone-300">
                      <ArrowRight className="w-5 h-5 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Spending Requests History */}
          <div>
            <h2 className="text-2xl font-black font-display text-stone-900 mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-500" /> Spending Requests Breakdown
            </h2>
            
            <div className="space-y-6">
              {campaignQuotations.map(q => {
                const getRequestStatus = (state: QuotationState) => {
                  if (state === QuotationState.Completed || state === QuotationState.ProofSubmitted) return <span className="text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FileBadge className="w-3 h-3"/> Proof Verified</span>;
                  if (state === QuotationState.Claimed || state === QuotationState.ProofPending) return <span className="text-purple-600 bg-purple-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Claimed (Awaiting Proof)</span>;
                  if (state === QuotationState.Sanctioned || state === QuotationState.Claimable) return <span className="text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Sanctioned (Unclaimed)</span>;
                  return <span className="text-stone-600 bg-stone-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> In Progress</span>;
                };

                return (
                  <div key={q.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
                    
                    <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-stone-100 bg-stone-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-bold font-display text-stone-900">{q.purpose}</h3>
                        </div>
                        <p className="text-sm text-stone-500 font-medium mb-4">Vendor: <span className="font-bold text-stone-800">{q.vendorName}</span></p>
                      </div>
                      <div>{getRequestStatus(q.state)}</div>
                    </div>

                    <div className="md:w-2/3 p-6 flex flex-col justify-between gap-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Requested</p>
                          <p className="text-lg font-black font-mono text-stone-700">{formatFtu(q.requestedAmountFtu)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Sanctioned</p>
                          <p className="text-lg font-black font-mono text-blue-800">{formatFtu(q.allocatedAmountFtu || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-1">Claimed</p>
                          <p className="text-lg font-black font-mono text-purple-800">{formatFtu(q.claimedAmountFtu || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Proof-Backed</p>
                          <p className="text-lg font-black font-mono text-emerald-800">
                            {q.state === QuotationState.Completed || q.state === QuotationState.ProofSubmitted ? formatFtu(q.claimedAmountFtu || 0) : '₹0'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="border-t border-stone-100 pt-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Blockchain Trace</span>
                          {q.proofHash ? (
                            <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-1 rounded flex items-center gap-1 max-w-[200px] truncate">
                              <LinkIcon className="w-3 h-3 flex-shrink-0" /> {q.proofHash}
                            </span>
                          ) : (
                            <span className="text-xs italic text-stone-400">Proof hash pending</span>
                          )}
                        </div>
                        {q.proofDocumentUrl && (
                          <Link href={q.proofDocumentUrl} target="_blank" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                            View Receipt &rarr;
                          </Link>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

              {campaignQuotations.length === 0 && (
                <div className="text-center py-12 border border-stone-200 border-dashed rounded-2xl bg-white text-stone-500 font-medium">
                  No spending requests have been made for this campaign yet.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
