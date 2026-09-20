"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import RoleGuard from "@/components/RoleGuard";
import { getFundTraceContract } from "@/lib/contract";
import { getQuotationsByCampaign, sanctionQuotation, rejectQuotation, reviewQuotation } from "@/services/quotationService";
import { getDonorAutomationSetting, upsertDonorAutomationSetting } from "@/services/automationService";
import { formatFtu } from "@/types";
import { toast } from "sonner";
import { 
  Sparkles,
  Clock,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Link as LinkIcon,
  Loader2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  HeartHandshake,
  FileText,
  Lock
} from "lucide-react";
import { ethers } from "ethers";

interface CampaignSummary {
  id: number;
  title: string;
  totalDonatedFtu: number;
  totalReleasedFtu: number;
  remainingFtu: number;
  automationEnabled: boolean;
  donationFtu: number;
  state: number;
  isFundedByMe: boolean;
}

function parseContractFtu(val: any): number {
  if (!val) return 0;
  const str = val.toString();
  if (str.length > 12) {
    try {
      return Math.round(Number(ethers.formatEther(val)));
    } catch {
      return Number(str);
    }
  }
  return Number(str);
}

export default function DonorPortfolioPage() {
  const { wallet, signer } = useWallet();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingAutomation, setTogglingAutomation] = useState(false);
  const [sanctioningId, setSanctioningId] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<"ALL" | "MY_FUNDED">("ALL");

  useEffect(() => {
    loadDonorData();
  }, [wallet.address]);

  useEffect(() => {
    if (selectedCampaign !== null) {
      loadQuotations(selectedCampaign);
    }
  }, [selectedCampaign]);

  async function loadDonorData() {
    setIsLoading(true);
    try {
      // 1. Fetch Supabase DB campaigns first
      let dbCampaigns: any[] = [];
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/campaigns`);
        if (res.ok) {
          dbCampaigns = await res.json();
        }
      } catch (e) {
        console.warn("Could not fetch DB campaigns:", e);
      }

      // Initial instant render from Supabase data
      const initialCampaigns: CampaignSummary[] = dbCampaigns.map((db: any) => {
        const onChainId = Number(db.on_chain_id);
        const cId = onChainId > 0 ? onChainId : Number(db.id);
        return {
          id: cId,
          title: db.title || `Campaign #${cId}`,
          totalDonatedFtu: Number(db.raised_ftu || 0),
          totalReleasedFtu: 0,
          remainingFtu: Number(db.raised_ftu || 0),
          automationEnabled: false,
          donationFtu: 0,
          state: onChainId > 0 ? 1 : 0,
          isFundedByMe: false
        };
      });

      setCampaigns(initialCampaigns);
      if (initialCampaigns.length > 0 && selectedCampaign === null) {
        setSelectedCampaign(initialCampaigns[0].id);
      }
      setIsLoading(false);

      // 2. Query contract in background with quick timeout
      try {
        const contract = getFundTraceContract();
        const countPromise = contract.campaignCount();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
        const count = Number(await Promise.race([countPromise, timeoutPromise]));

        if (count > 0) {
          const updated = await Promise.all(initialCampaigns.map(async (camp) => {
            if (camp.id <= count) {
              try {
                const c = await contract.getCampaign(camp.id);
                let donationAmount = 0;
                let automation = false;
                if (wallet.address) {
                  try {
                    const d = await contract.donations(camp.id, wallet.address);
                    donationAmount = parseContractFtu(d);
                    // Per-donor: use isDonorAutomationEnabled instead of global automationEnabled
                    automation = await contract.isDonorAutomationEnabled(camp.id, wallet.address);
                  } catch {}
                }
                const totalDonated = parseContractFtu(c.totalDonated);
                const totalReleased = parseContractFtu(c.totalReleased);
                const totalClaimed = parseContractFtu(c.totalClaimed || 0n);

                return {
                  ...camp,
                  totalDonatedFtu: totalDonated,
                  totalReleasedFtu: totalReleased,
                  remainingFtu: Math.max(0, totalDonated - totalReleased - totalClaimed),
                  automationEnabled: automation,
                  donationFtu: donationAmount,
                  state: Number(c.state),
                  isFundedByMe: donationAmount > 0
                };
              } catch {
                return camp;
              }
            }
            return camp;
          }));
          setCampaigns(updated);
        }
      } catch {}
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
    if (!wallet.address) { toast.error("Connect wallet first"); return; }
    setTogglingAutomation(true);
    const toastId = toast.loading(currentlyEnabled ? "Disabling automation..." : "Enabling automation...");
    try {
      // 1. Save to NestJS API (primary — stores policy, no gas cost)
      await upsertDonorAutomationSetting({
        campaignId,
        donorAddress: wallet.address,
        isEnabled: !currentlyEnabled,
        maxAutoAmount: 10000,
        requireManualHighRisk: true,
        autoRejectFraud: true,
      });

      // 2. Toggle on-chain for audit trail
      if (signer) {
        try {
          const contract = getFundTraceContract(signer);
          const tx = currentlyEnabled
            ? await contract.disableAutomation(campaignId)
            : await contract.enableAutomation(campaignId);
          await tx.wait();
        } catch (chainErr: any) {
          console.warn('On-chain toggle failed:', chainErr.message);
        }
      }

      setCampaigns(prev => prev.map(c =>
        c.id === campaignId ? { ...c, automationEnabled: !currentlyEnabled } : c
      ));
      toast.success(currentlyEnabled ? "Automation disabled" : "Automation enabled — AI will auto-sanction future quotations", { id: toastId });
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

      // Manual sanction: donor calls directly. Pass ZeroAddress for _onBehalfOfDonor (not automated).
      const tx = await contract.sanctionQuotation(selectedCampaign!, quotationId, BigInt(quotationAmount), false, ethers.ZeroAddress);
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

  const displayedCampaigns = filterMode === "MY_FUNDED" 
    ? campaigns.filter(c => c.isFundedByMe) 
    : campaigns;

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign) || displayedCampaigns[0] || null;
  const pendingQuotations = quotations.filter(q => ["AIEvaluated", "Pending"].includes(q.state));
  const processedQuotations = quotations.filter(q => !["AIEvaluated", "Pending"].includes(q.state));

  return (
    <RoleGuard allowedRoles={["DONOR"]}>
      <div className="min-h-screen bg-[#F7F4ED] text-[#141414] pb-24">
        <main className="max-w-6xl mx-auto px-6 sm:px-12 pt-8 pb-16">

          {/* Header */}
          <div className="bg-[#161813] text-white rounded-[32px] p-8 sm:p-10 shadow-2xl border border-stone-800 mb-8 overflow-hidden relative">
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 60%)"
            }} />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 text-xs font-mono font-medium border border-white/10 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    Donor Governance Dashboard
                  </span>
                </div>
                <h1 className="text-5xl sm:text-6xl font-black font-bebas uppercase leading-tight tracking-tight">
                  Donor Portfolio
                </h1>
                <p className="text-sm text-stone-400 mt-2 max-w-xl leading-relaxed">
                  Review quotations, approve fund requests, manage automation settings, and track spending across all campaigns in FundTrace.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadDonorData}
                  disabled={isLoading}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold font-mono transition-colors flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50"
                  title="Refresh campaign data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <Link
                  href="/campaigns"
                  className="px-5 py-2.5 bg-[#FF5023] hover:bg-[#e0451d] text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-colors shadow-lg shadow-[#FF5023]/20 flex items-center gap-2"
                >
                  <HeartHandshake className="w-4 h-4" />
                  Explore Campaigns
                </Link>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-stone-600 font-bold">Fetching all campaigns for donor review...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
              <Coins className="w-12 h-12 text-stone-400 mx-auto mb-4" />
              <p className="text-stone-700 font-black text-xl mb-1">No campaigns registered</p>
              <p className="text-stone-500 text-sm mb-6">Create the first initiative to start tracking and funding.</p>
              <Link href="/campaigns" className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                Explore Campaigns <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Campaign Sidebar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">
                    Campaigns Directory
                  </h2>
                  <div className="flex gap-1 bg-stone-200 p-0.5 rounded-lg text-[11px] font-bold">
                    <button 
                      onClick={() => setFilterMode("ALL")}
                      className={`px-2.5 py-1 rounded-md transition-all ${filterMode === "ALL" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
                    >
                      All ({campaigns.length})
                    </button>
                    <button 
                      onClick={() => setFilterMode("MY_FUNDED")}
                      className={`px-2.5 py-1 rounded-md transition-all ${filterMode === "MY_FUNDED" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
                    >
                      Funded ({campaigns.filter(c => c.isFundedByMe).length})
                    </button>
                  </div>
                </div>

                {displayedCampaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCampaign(c.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedCampaign === c.id
                        ? "bg-[#181816] text-white border-[#181816] shadow-lg"
                        : "bg-white border-stone-200 hover:border-stone-300 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-mono font-bold opacity-60">#{c.id}</div>
                      {c.isFundedByMe ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Funded by You
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium opacity-50">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm leading-snug mb-2">{c.title}</div>
                    <div className="text-xs font-mono flex items-center justify-between">
                      {c.isFundedByMe ? (
                        <span className="text-emerald-400 font-bold">My Donation: ₹{c.donationFtu.toLocaleString()} FTU</span>
                      ) : (
                        <span className="opacity-70">Raised: ₹{c.totalDonatedFtu.toLocaleString()} FTU</span>
                      )}
                    </div>
                    {c.automationEnabled && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-400">
                        <Sparkles className="w-3 h-3 text-emerald-400" /> Auto-Sanction
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Campaign Detail Panel */}
              {selectedCampaignData && (
                <div className="lg:col-span-2 space-y-6">

                  {/* Explore mode banner if donor hasn't contributed to selected campaign */}
                  {!selectedCampaignData.isFundedByMe && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-amber-900 text-sm">Campaign Overview</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          You haven't contributed to this campaign yet. Back this initiative to gain contribution share and sanction allocations.
                        </p>
                      </div>
                      <Link
                        href={`/donor/campaigns/${selectedCampaignData.id}`}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        Contribute Now <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}

                  {/* Financial Overview */}
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">{selectedCampaignData.title}</h3>
                        <p className="text-xs text-stone-500">Live Financial Health & Escrow Balance</p>
                      </div>
                      <Link
                        href={`/donor/campaigns/${selectedCampaignData.id}`}
                        className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                      >
                        Campaign Details <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {[
                        { label: "Total Raised", value: selectedCampaignData.totalDonatedFtu },
                        { label: "Total Released", value: selectedCampaignData.totalReleasedFtu },
                        { label: "Remaining Escrow", value: selectedCampaignData.remainingFtu },
                      ].map((f) => (
                        <div key={f.label} className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                          <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">{f.label}</div>
                          <div className="text-xl font-black font-bebas tracking-wide text-stone-900 mt-1">
                            ₹{f.value.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Automation Toggle: ONLY appears when donor has funded/approved this campaign */}
                  {selectedCampaignData.isFundedByMe ? (
                    <div className={`rounded-2xl border p-6 ${selectedCampaignData.automationEnabled ? "bg-emerald-50 border-emerald-200" : "bg-white border-stone-200 shadow-sm"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-bold text-stone-900">Automated Approval Mode</h3>
                            {selectedCampaignData.automationEnabled && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">ENABLED</span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 leading-relaxed max-w-sm">
                            {selectedCampaignData.automationEnabled
                              ? "AI Policy is ACTIVE for this campaign. Valid milestone quotes will be auto-sanctioned, and risky quotes will be auto-rejected. You retain full override control."
                              : "Enable to allow AI to automatically sanction safe invoices and reject flagged ones for this campaign. You remain in control and can disable anytime."}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleAutomation(selectedCampaignData.id, selectedCampaignData.automationEnabled)}
                          disabled={togglingAutomation}
                          className={`ml-4 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                            selectedCampaignData.automationEnabled
                              ? "bg-stone-200 text-stone-700 hover:bg-stone-300"
                              : "bg-[#FF5023] text-white hover:bg-[#e8431a]"
                          } disabled:opacity-60`}
                        >
                          {togglingAutomation ? "..." : selectedCampaignData.automationEnabled ? "Disable" : "Enable Auto-Sanction"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-stone-300 p-4 bg-stone-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-500">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-stone-400 shrink-0" />
                        <span>AI Auto-Sanction (Approve & Reject) controls will unlock for this campaign once you back and fund it.</span>
                      </div>
                      <Link
                        href={`/donor/campaigns/${selectedCampaignData.id}`}
                        className="font-bold text-indigo-600 hover:text-indigo-800 shrink-0"
                      >
                        Back Campaign →
                      </Link>
                    </div>
                  )}

                  {/* Pending Quotations (Requires Action) */}
                  {pendingQuotations.length > 0 && (
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-stone-100 bg-amber-50 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-bold text-stone-900">Pending Review ({pendingQuotations.length})</h3>
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
                                      <Bot className="w-5 h-5 text-indigo-600" />
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
                                    <div className="space-y-4">
                                      <div>
                                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Financial Assessment</div>
                                        <div className="flex items-center gap-3 mb-2">
                                          <div className="bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-100">
                                            <div className="text-[10px] text-stone-500">Requested</div>
                                            <div className="text-sm font-black text-stone-800 font-bebas tracking-wide">₹{rec.requestedAmount} FTU</div>
                                          </div>
                                          <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
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
                                                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
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
                                  className="flex-1 py-3 px-4 rounded-xl bg-[#161813] hover:bg-black text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-60 shadow-sm cursor-pointer"
                                >
                                  {sanctioningId === q.id ? "Sanctioning..." : "Approve Allocation"}
                                </button>
                                <button
                                  onClick={() => handleReview(q.id)}
                                  className="flex-1 py-3 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs uppercase tracking-wider transition-colors border border-amber-200 cursor-pointer"
                                >
                                  Request Review
                                </button>
                                <button
                                  onClick={() => handleReject(q.id)}
                                  className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-red-50 text-red-600 font-bold text-xs uppercase tracking-wider transition-colors border border-stone-200 hover:border-red-200 cursor-pointer"
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
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
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
