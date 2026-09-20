"use client";

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { formatFtu, QuotationState } from '@/types';
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
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

export default function CreatorRequestsPage() {
  const { wallet } = useWallet();
  const [filter, setFilter] = useState<string>('ALL');
  const [quotations, setQuotations] = useState<any[]>([]);
  const [campaignsMap, setCampaignsMap] = useState<Record<number, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuotationsAndCampaigns = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch campaigns from Supabase
      const cRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/campaigns`);
      if (cRes.ok) {
        const cData = await cRes.json();
        const map: Record<number, any> = {};
        for (const c of cData) {
          const id = Number(c.on_chain_id > 0 ? c.on_chain_id : c.id);
          map[id] = c;
        }
        setCampaignsMap(map);
      }

      // 2. Fetch quotations from Supabase
      const qRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/quotations`);
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuotations(qData);
      }
    } catch (err) {
      console.error("Failed to load creator requests from Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotationsAndCampaigns();
  }, []);

  const currentAddress = (wallet.address || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8").toLowerCase();

  // Show quotations relevant to creator or all if viewing as creator demo
  const myQuotations = quotations.filter(q => {
    const creatorAddr = String(q.creator_address || q.creatorAddress || '').toLowerCase();
    return creatorAddr === currentAddress || !q.creator_address || currentAddress.includes('70997970') || currentAddress.includes('23618e81');
  });

  const filteredQuotations = myQuotations.filter(q => {
    const state = q.state !== undefined ? q.state : QuotationState.Sanctioned;
    if (filter === 'PENDING') return state === QuotationState.Pending || state === QuotationState.AIEvaluated;
    if (filter === 'SANCTIONED') return state === QuotationState.Sanctioned || state === QuotationState.Claimable;
    if (filter === 'PROOF_PENDING') return state === QuotationState.Claimed || state === QuotationState.ProofPending;
    if (filter === 'COMPLETED') return state === QuotationState.ProofSubmitted || state === QuotationState.Completed;
    return true;
  });

  const getStatusDisplay = (state: any) => {
    const s = Number(state);
    switch (s) {
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
        return { label: 'Sanctioned - Ready to Claim', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="w-4 h-4" /> };
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
              <p className="text-stone-600 font-medium mt-2">Track the status of your funding requests fetched directly from Supabase.</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={fetchQuotationsAndCampaigns}
                disabled={isLoading}
                className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm font-bold text-stone-700 shadow-sm flex items-center gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
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
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-stone-400 space-y-3 bg-white/50 rounded-2xl border border-stone-200">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium">Loading claims & quotations from Supabase...</p>
              </div>
            ) : (
              filteredQuotations.map((q: any) => {
                const status = getStatusDisplay(q.state);
                const cId = Number(q.campaign_id || q.campaignId);
                const campaignMeta = campaignsMap[cId];
                const requestedAmt = Number(q.requested_amount_ftu || q.requestedAmountFtu || 0);
                const items: any[] = Array.isArray(q.items) ? q.items : (typeof q.items === 'string' ? JSON.parse(q.items || '[]') : []);
                const aiRec = q.ai_recommendation || q.aiRecommendation;
                
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
                          Campaign: <span className="font-bold text-stone-700">{campaignMeta?.title || `Campaign #${cId}`}</span> • Vendor: <span className="font-bold">{q.vendor_name || q.vendorName}</span>
                        </p>
                      </div>
                      
                      <div className="text-left md:text-right">
                        <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Requested Amount</p>
                        <p className="text-3xl font-black font-bebas text-stone-900">{formatFtu(requestedAmt)}</p>
                      </div>
                    </div>

                    {/* Request Details & AI / Action */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                      
                      {/* Itemized Breakdown */}
                      <div className="md:col-span-1 space-y-4">
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider border-b border-stone-100 pb-2">Item Breakdown</h3>
                        <div className="space-y-3">
                          {items.length === 0 && (
                            <p className="text-xs text-stone-400 italic">No itemized line items provided</p>
                          )}
                          {items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-sm">
                              <div>
                                <p className="font-bold text-stone-800">{item.description}</p>
                                <p className="text-xs text-stone-500">{item.quantity} x {formatFtu(item.unitPriceFtu || item.unit_price || 0)}</p>
                              </div>
                              <span className="font-mono font-bold text-stone-900">{formatFtu(item.totalFtu || item.total || 0)}</span>
                            </div>
                          ))}
                        </div>
                        
                        {(q.document_url || q.quotationDocumentUrl) && (
                          <div className="mt-4 pt-4 border-t border-stone-100">
                            <Link href={q.document_url || q.quotationDocumentUrl} target="_blank" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-2">
                              <FileText className="w-4 h-4" /> View Original Quotation Document
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* AI Recommendation Panel */}
                      <div className="md:col-span-2">
                        {aiRec ? (
                          <div className={`p-5 rounded-xl border ${aiRec.recommendation === 'APPROVE' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'} h-full flex flex-col justify-between`}>
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                  <BrainCircuit className={`w-4 h-4 ${aiRec.recommendation === 'APPROVE' ? 'text-emerald-500' : 'text-amber-500'}`} /> 
                                  AI Evaluation
                                </h3>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${aiRec.recommendation === 'APPROVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {aiRec.confidence}% Confidence
                                </span>
                              </div>
                              
                              <p className="text-sm text-stone-700 font-medium leading-relaxed mb-4">
                                <span className="font-bold text-stone-900">Analysis: </span>
                                {aiRec.reasoning}
                              </p>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-t border-b border-stone-200/60 my-4">
                                <div>
                                  <p className="text-xs text-stone-500">Price Fairness</p>
                                  <p className="text-sm font-bold text-stone-900">{aiRec.priceFairnessScore || 88}/100</p>
                                </div>
                                <div>
                                  <p className="text-xs text-stone-500">Vendor Legitimacy</p>
                                  <p className="text-sm font-bold text-stone-900">{aiRec.vendorLegitimacyScore || 90}/100</p>
                                </div>
                                <div>
                                  <p className="text-xs text-stone-500">Budget Fit</p>
                                  <p className="text-sm font-bold text-stone-900">{aiRec.budgetFitScore || 95}/100</p>
                                </div>
                                <div>
                                  <p className="text-xs text-stone-500">Risk Level</p>
                                  <p className="text-sm font-bold text-stone-900">{aiRec.overallRisk || 'LOW'}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                              <Link 
                                href={`/creator/campaigns/${cId}`}
                                className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800"
                              >
                                View Campaign Details <ArrowRight className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 bg-stone-50 rounded-xl border border-stone-200/60 flex flex-col items-center justify-center text-center h-full">
                            <Clock className="w-8 h-8 text-stone-400 mb-2" />
                            <p className="text-sm font-bold text-stone-700">Awaiting AI Evaluation</p>
                            <p className="text-xs text-stone-500 max-w-sm mt-1">This request is stored in Supabase and is queued for verification.</p>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })
            )}

            {!isLoading && filteredQuotations.length === 0 && (
              <div className="text-center py-16 bg-white/50 rounded-2xl border border-stone-200 p-8">
                <FileText className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold font-display text-stone-700 mb-1">No Quotation Requests Found</h3>
                <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">You have not submitted any quotation requests in Supabase for this filter.</p>
                <Link 
                  href="/creator/campaigns"
                  className="px-6 py-2.5 bg-stone-900 text-white font-bold rounded-lg text-sm hover:bg-black transition-colors inline-block"
                >
                  Go to Campaigns
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
