"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import RoleGuard from "@/components/RoleGuard";
import { getFundTraceContract } from "@/lib/contract";
import { getQuotationsByCampaign, sanctionQuotation, rejectQuotation, reviewQuotation } from "@/services/quotationService";
import { formatFtu } from "@/types";
import { toast } from "sonner";

interface CampaignSummary {
  id: number;
  title: string;
  totalDonatedFtu: number;
  totalReleasedFtu: number;
  remainingFtu: number;
  automationEnabled: boolean;
  donationFtu: number;
  state: number;
}

export default function DonorPortfolioPage() {
  const { wallet, signer } = useWallet();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingAutomation, setTogglingAutomation] = useState(false);
  const [sanctioningId, setSanctioningId] = useState<number | null>(null);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      loadDonorData();
    } else {
      setIsLoading(false);
    }
  }, [wallet.address]);

  useEffect(() => {
    if (selectedCampaign !== null) {
      loadQuotations(selectedCampaign);
    }
  }, [selectedCampaign]);

  async function loadDonorData() {
    setIsLoading(true);
    try {
      const contract = getFundTraceContract();
      const count = Number(await contract.campaignCount());

      const campaignList: CampaignSummary[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          const donation = await contract.donations(i, wallet.address!);
          if (BigInt(donation) > 0n) {
            const c = await contract.getCampaign(i);
            const automation = await contract.automationEnabled(i);

            // Fetch title from Supabase via campaign metadata
            let title = `Campaign #${i}`;
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/campaigns/${i}`);
              if (res.ok) {
                const data = await res.json();
                title = data.metadata?.title || title;
              }
            } catch {}

            campaignList.push({
              id: i,
              title,
              totalDonatedFtu: Number(c.totalDonated),
              totalReleasedFtu: Number(c.totalReleased),
              remainingFtu: Number(c.totalDonated) - Number(c.totalReleased) - Number(c.totalClaimed || 0n),
              automationEnabled: automation,
              donationFtu: Number(donation),
              state: Number(c.state),
            });
          }
        } catch {}
      }

      setCampaigns(campaignList);
      if (campaignList.length > 0) setSelectedCampaign(campaignList[0].id);
    } catch (err: any) {
      console.error("Failed to load donor data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadQuotations(campaignId: number) {
    try {
      const data = await getQuotationsByCampaign(campaignId);
      setQuotations(data);
    } catch (err) {
      console.error("Failed to load quotations:", err);
    }
  }

  async function toggleAutomation(campaignId: number, currentlyEnabled: boolean) {
    if (!signer) { toast.error("Connect wallet first"); return; }
    setTogglingAutomation(true);
    const toastId = toast.loading(currentlyEnabled ? "Disabling automation..." : "Enabling automation...");
    try {
      const contract = getFundTraceContract(signer);
      const tx = currentlyEnabled
        ? await contract.disableAutomation(campaignId)
        : await contract.enableAutomation(campaignId);
      await tx.wait();

      setCampaigns(prev => prev.map(c =>
        c.id === campaignId ? { ...c, automationEnabled: !currentlyEnabled } : c
      ));
      toast.success(currentlyEnabled ? "Automation disabled" : "Automation enabled â€” AI will auto-sanction future quotations", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle automation", { id: toastId });
    } finally {
      setTogglingAutomation(false);
    }
  }

  async function handleSanction(quotationId: number, quotationAmount: number) {
    if (!signer || !wallet.address) { toast.error("Connect wallet first"); return; }
    setSanctioningId(quotationId);
    const toastId = toast.loading("Sanctioning allocation on blockchain...");
    try {
      const contract = getFundTraceContract(signer);
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      if (!campaign) throw new Error("Campaign not found");

      const tx = await contract.sanctionQuotation(selectedCampaign!, quotationId, BigInt(quotationAmount), false);
      await tx.wait();

      await sanctionQuotation(quotationId, wallet.address, quotationAmount, false);
      await loadQuotations(selectedCampaign!);
      toast.success(`Sanctioned ₹${quotationAmount.toLocaleString()} FTU`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Sanction failed", { id: toastId });
    } finally {
      setSanctioningId(null);
    }
  }

  async function handleReject(quotationId: number) {
    if (!wallet.address) return;
    const reason = window.prompt("Rejection reason:");
    if (!reason) return;
    try {
      const contract = getFundTraceContract(signer!);
      const tx = await contract.rejectQuotation(selectedCampaign!, quotationId, reason);
      await tx.wait();
      await rejectQuotation(quotationId, wallet.address, reason);
      await loadQuotations(selectedCampaign!);
      toast.success("Quotation rejected");
    } catch (err: any) {
      toast.error(err.message || "Rejection failed");
    }
  }

  async function handleReview(quotationId: number) {
    if (!wallet.address) return;
    const reason = window.prompt("Reason for manual review:");
    if (!reason) return;
    try {
      await reviewQuotation(quotationId, wallet.address, reason);
      await loadQuotations(selectedCampaign!);
      toast.success("Quotation flagged for review");
    } catch (err: any) {
      toast.error(err.message || "Failed to flag quotation");
    }
  }

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);
  const pendingQuotations = quotations.filter(q => ["AIEvaluated", "Pending"].includes(q.state));
  const processedQuotations = quotations.filter(q => !["AIEvaluated", "Pending"].includes(q.state));

  return (
    <RoleGuard allowedRoles={["DONOR"]}>
      <div className="min-h-screen bg-[#F7F4ED] text-[#141414] pb-24">      <main className="max-w-6xl mx-auto px-6 sm:px-12 pt-8 pb-16">

        {/* Header */}
        <div className="bg-[#161813] text-white rounded-[32px] p-8 sm:p-10 shadow-2xl border border-stone-800 mb-8 overflow-hidden relative">
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 60%)"
          }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 text-xs font-mono font-medium border border-white/10">
                Donor Dashboard
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-black font-bebas uppercase leading-tight tracking-tight">
              Donor Portfolio
            </h1>
            <p className="text-sm text-stone-400 mt-2 max-w-xl leading-relaxed">
              Review quotations, approve fund requests, manage automation settings, and track spending across your funded campaigns.
            </p>
          </div>
        </div>

        {!wallet.isConnected ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
            <div className="text-4xl mb-4">ðŸ”—</div>
            <p className="text-stone-600 font-bold mb-2">Connect Your Wallet</p>
            <p className="text-stone-400 text-sm">Connect MetaMask to view campaigns you've funded</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin text-3xl mb-4">âš™ï¸</div>
            <p className="text-stone-500">Loading your funded campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
            <div className="text-4xl mb-4">ðŸ’¸</div>
            <p className="text-stone-600 font-bold mb-2">No funded campaigns yet</p>
            <Link href="/campaigns" className="text-sm text-[#FF5023] font-bold hover:underline">
              Browse campaigns to donate â†’
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Campaign Sidebar */}
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-2">Funded Campaigns</h2>
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCampaign(c.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedCampaign === c.id
                      ? "bg-[#181816] text-white border-[#181816] shadow-lg"
                      : "bg-white border-stone-200 hover:border-stone-300 shadow-sm"
                  }`}
                >
                  <div className="text-xs font-mono font-bold opacity-60 mb-1">#{c.id}</div>
                  <div className="font-bold text-sm leading-snug mb-2">{c.title}</div>
                  <div className="text-xs font-mono">
                    My Donation: ₹{c.donationFtu.toLocaleString()} FTU
                  </div>
                  {c.automationEnabled && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-400">
                      âš¡ Auto
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Campaign Detail Panel */}
            {selectedCampaignData && (
              <div className="lg:col-span-2 space-y-6">

                {/* Financial Overview */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Campaign Financials</h3>
                    <Link
                      href={`/campaigns/${selectedCampaignData.id}`}
                      className="text-xs text-[#FF5023] font-bold hover:underline"
                    >
                      View Full Campaign â†’
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: "Total Raised", value: selectedCampaignData.totalDonatedFtu },
                      { label: "Total Released", value: selectedCampaignData.totalReleasedFtu },
                      { label: "Remaining", value: selectedCampaignData.remainingFtu },
                    ].map((f) => (
                      <div key={f.label} className="bg-stone-50 rounded-xl p-3">
                        <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">{f.label}</div>
                        <div className="text-xl font-black font-bebas tracking-wide text-stone-900 mt-1">
                          ₹{f.value.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Automation Toggle */}
                <div className={`rounded-2xl border p-6 ${selectedCampaignData.automationEnabled ? "bg-emerald-50 border-emerald-200" : "bg-white border-stone-200 shadow-sm"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">âš¡</span>
                        <h3 className="font-bold text-stone-900">Automated Approval Mode</h3>
                        {selectedCampaignData.automationEnabled && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">ENABLED</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed max-w-sm">
                        {selectedCampaignData.automationEnabled
                          ? "AI Policy is ACTIVE. Future quotations will be automatically sanctioned based on AI evaluation. You can still override individual quotations."
                          : "Enable to allow AI to automatically sanction quotations that pass evaluation. You remain in control and can disable at any time."}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleAutomation(selectedCampaignData.id, selectedCampaignData.automationEnabled)}
                      disabled={togglingAutomation}
                      className={`ml-4 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        selectedCampaignData.automationEnabled
                          ? "bg-stone-200 text-stone-700 hover:bg-stone-300"
                          : "bg-[#FF5023] text-white hover:bg-[#e8431a]"
                      } disabled:opacity-60`}
                    >
                      {togglingAutomation ? "..." : selectedCampaignData.automationEnabled ? "Disable" : "Enable âš¡"}
                    </button>
                  </div>
                </div>

                {/* Pending Quotations (Requires Action) */}
                {pendingQuotations.length > 0 && (
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-stone-100 bg-amber-50 flex items-center gap-2">
                      <span className="text-amber-500">â³</span>
                      <h3 className="text-sm font-bold text-stone-900">Pending Your Review ({pendingQuotations.length})</h3>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {pendingQuotations.map((q: any) => {
                        const rec = q.ai_recommendation || q.aiRecommendation;
                        const recColor = rec?.recommendation === "APPROVE" ? "emerald" : rec?.recommendation === "REJECT" ? "red" : "amber";
                        return (
                          <div key={q.id} className="p-6">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div>
                                <h4 className="font-bold text-stone-900">{q.purpose}</h4>
                                <p className="text-xs text-stone-500 mt-0.5">Vendor: {q.vendor_name || q.vendorName}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black font-bebas tracking-wide text-stone-900">
                                  ₹{(q.requested_amount_ftu || q.requestedAmountFtu || 0).toLocaleString()}
                                </div>
                                <div className="text-xs text-stone-400 font-mono">FTU requested</div>
                              </div>
                            </div>

                            {rec && (
                              <div className="mb-5 bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                                {/* Header */}
                                <div className={`px-5 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  recColor === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                                  recColor === 'red' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xl">ðŸ¤–</span>
                                    <div>
                                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">AI Recommendation</div>
                                      <div className={`text-base font-black tracking-wide ${
                                        recColor === 'emerald' ? 'text-emerald-700' :
                                        recColor === 'red' ? 'text-red-700' : 'text-amber-700'
                                      }`}>
                                        {rec.recommendation} ({Math.round(rec.confidence)}% CONFIDENCE)
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-stone-500">Risk Level:</span>
                                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${
                                      rec.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                                      rec.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {rec.riskLevel}
                                    </span>
                                  </div>
                                </div>

                                {/* Body */}
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Left Col */}
                                  <div className="space-y-4">
                                    <div>
                                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Financial Assessment</div>
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-100">
                                          <div className="text-[10px] text-stone-500">Requested</div>
                                          <div className="text-sm font-black text-stone-800 font-bebas tracking-wide">₹{rec.requestedAmount} FTU</div>
                                        </div>
                                        <div className="text-stone-300">â†’</div>
                                        <div className={`px-3 py-1.5 rounded-lg border ${rec.suggestedSanctionAmount < rec.requestedAmount ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                          <div className="text-[10px] text-stone-500">Suggested Sanction</div>
                                          <div className="text-sm font-black text-stone-800 font-bebas tracking-wide">₹{rec.suggestedSanctionAmount} FTU</div>
                                        </div>
                                      </div>
                                      <p className="text-[11px] text-stone-600 leading-relaxed"><strong className="text-stone-800">Budget Impact:</strong> {rec.budgetImpact}</p>
                                      <p className="text-[11px] text-stone-600 leading-relaxed mt-1"><strong className="text-stone-800">Pricing:</strong> {rec.priceAssessment}</p>
                                    </div>

                                    <div>
                                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Campaign Relevance</div>
                                      <p className="text-[11px] text-stone-600 leading-relaxed">{rec.campaignRelevance}</p>
                                    </div>
                                  </div>

                                  {/* Right Col */}
                                  <div className="space-y-4">
                                    <div>
                                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Creator & Proof History</div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[11px] text-stone-600">Reliability Score:</span>
                                        <span className="px-1.5 py-0.5 bg-stone-100 text-stone-800 text-[10px] font-mono font-bold rounded">{rec.creatorReliabilityScore}</span>
                                      </div>
                                      <p className="text-[11px] text-stone-600 leading-relaxed">{rec.proofHistory}</p>
                                    </div>

                                    <div>
                                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">AI Reasoning & Flags</div>
                                      <ul className="list-disc pl-4 space-y-1">
                                        {rec.reasons?.map((r: string, i: number) => (
                                          <li key={i} className="text-[11px] text-stone-600">{r}</li>
                                        ))}
                                      </ul>
                                      {rec.riskFlags && rec.riskFlags.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {rec.riskFlags.map((f: string, i: number) => (
                                            <div key={i} className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 px-2 py-1.5 rounded border border-red-100">
                                              <span>âš </span>
                                              <span>{f}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="px-5 py-2.5 bg-stone-50 border-t border-stone-100 text-[10px] text-stone-400 italic text-center">
                                  AI suggests recommendations based on historical data and deterministic rules. You hold the final approval authority.
                                </div>
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={() => handleSanction(q.id, q.requested_amount_ftu || q.requestedAmountFtu)}
                                disabled={sanctioningId === q.id}
                                className="flex-1 py-3 px-4 rounded-xl bg-[#161813] hover:bg-black text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-60 shadow-sm"
                              >
                                {sanctioningId === q.id ? "Sanctioning..." : "Approve"}
                              </button>
                              <button
                                onClick={() => handleReview(q.id)}
                                className="flex-1 py-3 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs uppercase tracking-wider transition-colors border border-amber-200"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => handleReject(q.id)}
                                className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-red-50 text-red-600 font-bold text-xs uppercase tracking-wider transition-colors border border-stone-200 hover:border-red-200"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Processed Quotations History */}
                {processedQuotations.length > 0 && (
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-stone-100">
                      <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Sanction History</h3>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {processedQuotations.map((q: any) => (
                        <div key={q.id} className="px-6 py-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-stone-900">{q.purpose}</p>
                            <p className="text-xs text-stone-500">{q.vendor_name || q.vendorName}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black font-bebas tracking-wide text-stone-900">
                              ₹{(q.allocated_amount_ftu || q.allocatedAmountFtu || 0).toLocaleString()}
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              q.state === "Completed" ? "bg-emerald-100 text-emerald-700"
                              : q.state === "DonorRejected" ? "bg-red-100 text-red-700"
                              : "bg-stone-100 text-stone-600"
                            }`}>
                              {q.state}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {quotations.length === 0 && (
                  <div className="text-center py-10 bg-white rounded-2xl border border-stone-200 text-stone-400">
                    <div className="text-3xl mb-2">ðŸ“‹</div>
                    <p className="text-sm">No quotations submitted for this campaign yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      </div>
    </RoleGuard>
  );
}
