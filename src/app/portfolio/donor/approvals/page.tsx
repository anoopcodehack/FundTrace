"use client";

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { formatFtu, QuotationState, QuotationMetadata, AIRecommendation } from '@/types';
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
import { getFundTraceContract } from '@/lib/contract';
import { getQuotationsByCampaign, sanctionQuotation, rejectQuotation, reviewQuotation } from '@/services/quotationService';
import { toast } from 'sonner';

interface ApprovalItem extends QuotationMetadata {
  campaignTitle: string;
}

export default function DonorApprovalsPage() {
  const { wallet, signer } = useWallet();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      loadApprovals();
    } else {
      setIsLoading(false);
    }
  }, [wallet.address]);

  async function loadApprovals() {
    setIsLoading(true);
    try {
      const contract = getFundTraceContract();
      const count = Number(await contract.campaignCount());
      const pendingItems: ApprovalItem[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const donation = await contract.donations(i, wallet.address!);
          if (BigInt(donation) > 0n) {
            // User donated to this campaign, fetch title
            let title = `Campaign #${i}`;
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/campaigns/${i}`);
              if (res.ok) {
                const data = await res.json();
                title = data.metadata?.title || title;
              }
            } catch {}

            // Fetch quotations for this campaign
            const campaignQuotations = await getQuotationsByCampaign(i);
            const aiEvaluated = campaignQuotations.filter(q => q.state === QuotationState.AIEvaluated || q.state === "AIEvaluated");
            
            aiEvaluated.forEach(q => {
              pendingItems.push({ ...q, campaignTitle: title });
            });
          }
        } catch (e) {
          console.error(`Error loading data for campaign ${i}`, e);
        }
      }
      setApprovals(pendingItems);
    } catch (err) {
      console.error("Failed to load approvals:", err);
      toast.error("Failed to load your approval requests");
    } finally {
      setIsLoading(false);
    }
  }

  const handleSanction = async (q: ApprovalItem) => {
    if (!signer || !wallet.address) {
      toast.error("Please connect your wallet first");
      return;
    }
    setProcessingId(q.id);
    const toastId = toast.loading("Sanctioning on blockchain...");
    try {
      const contract = getFundTraceContract(signer);
      const tx = await contract.sanctionQuotation(q.campaignId, q.id, BigInt(q.requestedAmountFtu), false);
      await tx.wait();

      await sanctionQuotation(q.id, wallet.address, q.requestedAmountFtu, false);
      setApprovals(prev => prev.filter(a => a.id !== q.id));
      toast.success(`Sanctioned ₹${q.requestedAmountFtu.toLocaleString()} FTU`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Sanction failed", { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (q: ApprovalItem) => {
    if (!signer || !wallet.address) return;
    const reason = window.prompt("Rejection reason:");
    if (!reason) return;
    setProcessingId(q.id);
    try {
      const contract = getFundTraceContract(signer);
      const tx = await contract.rejectQuotation(q.campaignId, q.id, reason);
      await tx.wait();
      
      await rejectQuotation(q.id, wallet.address, reason);
      setApprovals(prev => prev.filter(a => a.id !== q.id));
      toast.success("Quotation rejected");
    } catch (err: any) {
      toast.error(err.message || "Rejection failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReview = async (q: ApprovalItem) => {
    if (!wallet.address) return;
    const reason = window.prompt("Reason for manual review:");
    if (!reason) return;
    setProcessingId(q.id);
    try {
      await reviewQuotation(q.id, wallet.address, reason);
      setApprovals(prev => prev.filter(a => a.id !== q.id));
      toast.success("Quotation flagged for review");
    } catch (err: any) {
      toast.error(err.message || "Failed to flag quotation");
    } finally {
      setProcessingId(null);
    }
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

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {approvals.map(q => {
                // Determine AI Recommendation, which can be stored as JSON from the DB
                let ai: AIRecommendation | undefined = typeof q.aiRecommendation === 'string' 
                  ? JSON.parse(q.aiRecommendation) 
                  : q.aiRecommendation;

                if (!ai) return null; // Only show if AI evaluation data exists

                const isProcessing = processingId === q.id;

                return (
                  <div key={q.id} className={`bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col xl:flex-row transition-all ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'}`}>
                    
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
                          Campaign: <span className="font-bold text-stone-700">{q.campaignTitle}</span>
                        </p>
                        
                        <div className="mb-6">
                          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Requested Amount</p>
                          <p className="text-4xl font-black font-bebas text-stone-900">{formatFtu(q.requestedAmountFtu)}</p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Creator</p>
                            <p className="text-sm font-mono font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded inline-block">
                              {q.creatorAddress.slice(0, 8)}...{q.creatorAddress.slice(-6)}
                            </p>
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
                              {Math.round((ai.confidence || 0) * 100)}% Confidence
                            </span>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-md">
                              {ai.riskLevel || 'Low'} Risk
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          <div className="space-y-6">
                            <div>
                              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Creator Reliability
                              </p>
                              <p className="text-sm font-bold text-stone-900">{ai.creatorReliabilityScore || 'High'}</p>
                              <p className="text-xs text-stone-500 mt-1">{ai.proofHistory || 'Good track record of valid proofs'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Campaign Relevance</p>
                              <p className="text-sm text-stone-700 font-medium">{ai.campaignRelevance || 'Relevant to campaign goals'}</p>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div>
                              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Price Assessment</p>
                              <p className="text-sm text-stone-700 font-medium">{ai.priceAssessment || 'Aligned with fair market value'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Budget Impact</p>
                              <p className="text-sm text-stone-700 font-medium">{ai.budgetImpact || 'Within expected budget'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-stone-50 rounded-xl p-5 border border-stone-100">
                          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">AI Recommendation Reasons</p>
                          <ul className="space-y-2">
                            {(ai.reasons || []).map((reason, i) => (
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
                          onClick={() => handleReject(q)}
                          disabled={isProcessing}
                          className="w-full sm:w-auto px-6 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <XCircle className="w-5 h-5" /> Reject
                        </button>
                        <button 
                          onClick={() => handleReview(q)}
                          disabled={isProcessing}
                          className="w-full sm:w-auto px-6 py-3 bg-white border border-amber-200 text-amber-600 font-bold rounded-xl hover:bg-amber-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <AlertTriangle className="w-5 h-5" /> Flag for Review
                        </button>
                        <button 
                          onClick={() => handleSanction(q)}
                          disabled={isProcessing}
                          className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
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
                  <Link href="/portfolio/donor" className="inline-flex px-6 py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors">
                    Back to Portfolio
                  </Link>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </RoleGuard>
  );
}
