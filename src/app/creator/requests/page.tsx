"use client";

import React, { useState } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_QUOTATIONS, MOCK_CAMPAIGNS_METADATA } from '@/lib/mock';
import { formatFtu, QuotationState, QuotationMetadata } from '@/types';
import Link from 'next/link';
import { 
  ChevronRight,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  BrainCircuit,
  FileBadge,
  ArrowRight
} from 'lucide-react';

export default function CreatorRequestsPage() {
  const [filter, setFilter] = useState<string>('ALL');
  
  // Only show quotations belonging to the creator role in the demo (address 0x709...)
  const CREATOR_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  const myQuotations = MOCK_QUOTATIONS.filter(q => q.creatorAddress.toLowerCase() === CREATOR_ADDRESS.toLowerCase());
  
  const filteredQuotations = myQuotations.filter(q => {
    if (filter === 'PENDING') return q.state === QuotationState.Pending || q.state === QuotationState.AIEvaluated;
    if (filter === 'SANCTIONED') return q.state === QuotationState.Sanctioned || q.state === QuotationState.Claimable;
    if (filter === 'PROOF_PENDING') return q.state === QuotationState.Claimed || q.state === QuotationState.ProofPending;
    if (filter === 'COMPLETED') return q.state === QuotationState.ProofSubmitted || q.state === QuotationState.Completed;
    return true;
  });

  const getStatusDisplay = (state: QuotationState) => {
    switch (state) {
      case QuotationState.Pending:
        return { label: 'Pending AI Review', color: 'bg-stone-100 text-stone-700', icon: <Clock className="w-4 h-4" /> };
      case QuotationState.AIEvaluated:
        return { label: 'Awaiting Donor Approval', color: 'bg-amber-100 text-amber-800', icon: <AlertCircle className="w-4 h-4" /> };
      case QuotationState.Sanctioned:
      case QuotationState.Claimable:
        return { label: 'Sanctioned - Ready to Claim', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="w-4 h-4" /> };
      case QuotationState.Claimed:
      case QuotationState.ProofPending:
        return { label: 'Proof Pending', color: 'bg-orange-100 text-orange-800', icon: <FileBadge className="w-4 h-4" /> };
      case QuotationState.ProofSubmitted:
      case QuotationState.Completed:
        return { label: 'Completed', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle2 className="w-4 h-4" /> };
      case QuotationState.DonorRejected:
        return { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> };
      default:
        return { label: 'Unknown', color: 'bg-stone-100 text-stone-700', icon: <Clock className="w-4 h-4" /> };
    }
  };

  return (
    <RoleGuard allowedRoles={["CREATOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/creator" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Creator Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Spending Requests</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Quotation Requests</h1>
              <p className="text-stone-600 font-medium mt-2">Track the status of your funding requests, AI evaluations, and donor sanctions.</p>
            </div>
            
            <div className="flex gap-2">
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-bold text-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Requests</option>
                <option value="PENDING">Pending Approval</option>
                <option value="SANCTIONED">Sanctioned</option>
                <option value="PROOF_PENDING">Proof Pending</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6">
            {filteredQuotations.map((q: QuotationMetadata) => {
              const status = getStatusDisplay(q.state);
              const campaignMeta = MOCK_CAMPAIGNS_METADATA[q.campaignId];
              
              return (
                <div key={q.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  
                  {/* Request Header */}
                  <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-stone-50/50">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-bold font-display text-stone-900">{q.purpose}</h2>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500 font-medium">
                        Campaign: <span className="font-bold text-stone-700">{campaignMeta?.title}</span> • Vendor: <span className="font-bold">{q.vendorName}</span>
                      </p>
                    </div>
                    
                    <div className="text-left md:text-right">
                      <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Requested Amount</p>
                      <p className="text-3xl font-black font-bebas text-stone-900">{formatFtu(q.requestedAmountFtu)}</p>
                    </div>
                  </div>

                  {/* Request Details & AI / Action */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* Itemized Breakdown */}
                    <div className="md:col-span-1 space-y-4">
                      <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider border-b border-stone-100 pb-2">Item Breakdown</h3>
                      <div className="space-y-3">
                        {q.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start text-sm">
                            <div>
                              <p className="font-bold text-stone-800">{item.description}</p>
                              <p className="text-xs text-stone-500">{item.quantity} x {formatFtu(item.unitPriceFtu)}</p>
                            </div>
                            <span className="font-mono font-bold text-stone-900">{formatFtu(item.totalFtu)}</span>
                          </div>
                        ))}
                      </div>
                      
                      {q.quotationDocumentUrl && (
                        <div className="mt-4 pt-4 border-t border-stone-100">
                          <Link href={q.quotationDocumentUrl} target="_blank" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> View Original Quotation PDF
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* AI Recommendation Panel */}
                    <div className="md:col-span-2">
                      {q.aiRecommendation ? (
                        <div className={`p-5 rounded-xl border ${q.aiRecommendation.recommendation === 'APPROVE' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'} h-full flex flex-col justify-between`}>
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                <BrainCircuit className={`w-4 h-4 ${q.aiRecommendation.recommendation === 'APPROVE' ? 'text-emerald-500' : 'text-amber-500'}`} /> 
                                AI Evaluation
                              </h3>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${q.aiRecommendation.recommendation === 'APPROVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {q.aiRecommendation.confidence}% Confidence
                              </span>
                            </div>
                            
                            <p className="text-sm text-stone-700 font-medium leading-relaxed mb-4">
                              <span className="font-bold text-stone-900">Analysis: </span>
                              {q.aiRecommendation.campaignRelevance} {q.aiRecommendation.priceAssessment}
                            </p>
                            
                            <div className="bg-white/60 p-3 rounded-lg border border-stone-200/50">
                              <p className="text-xs font-bold text-stone-500 mb-2">Key Reasons:</p>
                              <ul className="text-xs text-stone-700 space-y-1 list-disc list-inside">
                                {q.aiRecommendation.reasons.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          
                          {/* Action Buttons based on state */}
                          <div className="mt-6 pt-4 border-t border-black/5 flex justify-end">
                            {(q.state === QuotationState.Sanctioned || q.state === QuotationState.Claimable) && (
                              <Link href="/creator/claims" className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                                Claim {formatFtu(q.allocatedAmountFtu || 0)} Now <ArrowRight className="w-4 h-4" />
                              </Link>
                            )}
                            {(q.state === QuotationState.Claimed || q.state === QuotationState.ProofPending) && (
                              <Link href="/creator/proof" className="px-5 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition-colors shadow-sm flex items-center gap-2">
                                Submit Proof of Expenditure <ArrowRight className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 rounded-xl border border-stone-100 bg-stone-50 h-full flex flex-col items-center justify-center text-center">
                          <BrainCircuit className="w-8 h-8 text-stone-300 mb-3 animate-pulse" />
                          <h3 className="text-stone-900 font-bold mb-1">AI Analysis Pending</h3>
                          <p className="text-sm text-stone-500 max-w-xs">Our AI is currently evaluating the quotation against market rates and campaign goals.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}

            {filteredQuotations.length === 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black font-display text-stone-900 mb-2">No Requests Found</h3>
                <p className="text-stone-500 max-w-md mx-auto mb-6">You don't have any spending requests matching the selected filter.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
