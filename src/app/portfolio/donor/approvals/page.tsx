"use client";

import React, { useState } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_QUOTATIONS, MOCK_CAMPAIGNS_METADATA } from '@/lib/mock';
import { formatFtu, QuotationState, QuotationMetadata } from '@/types';
import Link from 'next/link';
import { 
  ChevronRight,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

export default function DonorApprovalsPage() {
  const { wallet } = useWallet();
  const address = wallet.address;
  // Assume Alice is 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  // In demo, we will just show Quotation #2 which is AIEvaluated
  const pendingApprovals = MOCK_QUOTATIONS.filter(q => q.state === QuotationState.AIEvaluated);
  const [approvals, setApprovals] = useState<QuotationMetadata[]>(pendingApprovals);

  const handleAction = (id: number, action: 'APPROVE' | 'REJECT' | 'REVIEW') => {
    // Optimistic UI update
    setApprovals(prev => prev.filter(q => q.id !== id));
    // In a real app, this would call the NestJS backend
    alert(`Request ${id} marked as ${action}`);
  };

  return (
    <RoleGuard allowedRoles={["DONOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/portfolio/donor" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Donor Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Approvals</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Quotation Approvals</h1>
              <p className="text-stone-600 font-medium mt-2">Review spending requests from campaigns you fund, assisted by AI analysis.</p>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-8">
            {approvals.map(q => {
              const meta = MOCK_CAMPAIGNS_METADATA[q.campaignId];
              const ai = q.aiRecommendation;
              
              if (!ai) return null; // Only showing AIEvaluated

              return (
                <div key={q.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col xl:flex-row hover:shadow-md transition-shadow">
                  
                  {/* Left Column: Request Details */}
                  <div className="xl:w-1/3 p-6 xl:p-8 border-b xl:border-b-0 xl:border-r border-stone-100 flex flex-col justify-between bg-stone-50/50">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Awaiting Sanction
                        </span>
                      </div>
                      <h2 className="text-2xl font-black font-display text-stone-900 leading-tight mb-2">{q.purpose}</h2>
                      <p className="text-sm text-stone-500 font-medium mb-6">
                        Campaign: <span className="font-bold text-stone-700">{meta?.title}</span>
                      </p>
                      
                      <div className="mb-6">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Requested Amount</p>
                        <p className="text-4xl font-black font-bebas text-stone-900">{formatFtu(q.requestedAmountFtu)}</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Creator</p>
                          <p className="text-sm font-mono font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded inline-block">{q.creatorAddress.slice(0, 8)}...{q.creatorAddress.slice(-6)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Vendor</p>
                          <p className="text-sm font-bold text-stone-800">{q.vendorName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-stone-200">
                      <Link href={q.quotationDocumentUrl || "#"} target="_blank" className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-stone-300 text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition-colors shadow-sm text-sm">
                        <FileText className="w-4 h-4" /> View Original Invoice PDF
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: AI Analysis & Actions */}
                  <div className="xl:w-2/3 flex flex-col bg-white">
                    <div className="p-6 xl:p-8 flex-1">
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-stone-100">
                        <h3 className="text-xl font-bold font-display text-stone-900 flex items-center gap-2">
                          <BrainCircuit className="w-6 h-6 text-indigo-500" /> AI Risk Assessment
                        </h3>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-md">
                            {ai.confidence}% Confidence
                          </span>
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-md">
                            {ai.riskLevel} Risk
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-6">
                          <div>
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Creator Reliability
                            </p>
                            <p className="text-sm font-bold text-stone-900">{ai.creatorReliabilityScore}</p>
                            <p className="text-xs text-stone-500 mt-1">{ai.proofHistory}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Campaign Relevance</p>
                            <p className="text-sm text-stone-700 font-medium">{ai.campaignRelevance}</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Price Assessment</p>
                            <p className="text-sm text-stone-700 font-medium">{ai.priceAssessment}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Budget Impact</p>
                            <p className="text-sm text-stone-700 font-medium">{ai.budgetImpact}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-stone-50 rounded-xl p-5 border border-stone-100">
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">AI Recommendation Reasons</p>
                        <ul className="space-y-2">
                          {ai.reasons.map((reason, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-stone-700 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {ai.riskFlags && ai.riskFlags.length > 0 && (
                        <div className="mt-4 bg-red-50 rounded-xl p-5 border border-red-100">
                          <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-3">Risk Flags</p>
                          <ul className="space-y-2">
                            {ai.riskFlags.map((flag, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-red-900 font-medium">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>

                    {/* Action Bar */}
                    <div className="p-6 bg-stone-50/50 border-t border-stone-200 flex flex-col sm:flex-row justify-end items-center gap-4">
                      <button 
                        onClick={() => handleAction(q.id, 'REJECT')}
                        className="w-full sm:w-auto px-6 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" /> Reject
                      </button>
                      <button 
                        onClick={() => handleAction(q.id, 'REVIEW')}
                        className="w-full sm:w-auto px-6 py-3 bg-white border border-amber-200 text-amber-600 font-bold rounded-xl hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <AlertTriangle className="w-5 h-5" /> Flag for Review
                      </button>
                      <button 
                        onClick={() => handleAction(q.id, 'APPROVE')}
                        className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Sanction {formatFtu(q.requestedAmountFtu)}
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}

            {approvals.length === 0 && (
              <div className="bg-white rounded-3xl border border-stone-200 p-16 text-center shadow-sm">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-black font-display text-stone-900 mb-2">All Caught Up!</h3>
                <p className="text-stone-500 max-w-md mx-auto mb-8 text-lg">There are no pending quotation requests requiring your sanction.</p>
                <Link href="/portfolio/donor/contributions" className="inline-flex px-6 py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors">
                  Back to Portfolio
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
