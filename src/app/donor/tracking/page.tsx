"use client";

import React, { useState, useEffect, Suspense } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { getFundTraceContract } from '@/lib/contract';
import { getQuotationsByCampaign } from '@/services/quotationService';
import { formatFtu, QuotationState } from '@/types';
import Link from 'next/link';
import { 
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowRight,
  CheckCircle2,
  FileBadge,
  Clock,
  Link as LinkIcon,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ethers } from 'ethers';

interface CampaignOption {
  id: number;
  title: string;
  category: string;
  totalDonatedFtu: number;
  goalFtu: number;
}

function parseFtu(val: any): number {
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

function DonorTrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignIdParam = searchParams?.get('campaignId');
  const [selectedId, setSelectedId] = useState<number>(campaignIdParam ? Number(campaignIdParam) : 1);
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load list of all available campaigns
  useEffect(() => {
    async function loadCampaignsList() {
      const options: CampaignOption[] = [];
      const seen = new Set<number>();

      try {
        const contract = getFundTraceContract();
        let count = 0;
        try {
          count = Number(await contract.campaignCount());
        } catch {}

        let dbCampaigns: any[] = [];
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/campaigns`);
          if (res.ok) {
            dbCampaigns = await res.json();
          }
        } catch {}

        for (const db of dbCampaigns) {
          const cId = Number(db.on_chain_id > 0 ? db.on_chain_id : db.id);
          if (!seen.has(cId)) {
            seen.add(cId);
            options.push({
              id: cId,
              title: db.title || `Campaign #${cId}`,
              category: db.category || 'General',
              totalDonatedFtu: Number(db.raised_ftu || 0),
              goalFtu: Number(db.goal_ftu || 10000)
            });
          }
        }
      } catch (err) {
        console.error("Failed to load campaign list:", err);
      }

      setCampaignOptions(options);
    }
    loadCampaignsList();
  }, []);

  // Load details for selected campaign
  useEffect(() => {
    async function loadCampaignDetails() {
      setIsLoading(true);
      try {
        let meta: any = null;
        let onchain: any = null;

        // Try DB fetch
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/campaigns/${selectedId}`);
          if (res.ok) {
            const dbData = await res.json();
            meta = dbData.metadata || dbData;
            onchain = {
              id: selectedId,
              totalDonatedWei: Number(dbData.raised_ftu || 0),
              totalAllocatedWei: 0,
              totalSanctionedWei: 0,
              totalClaimedWei: 0,
              goalWei: Number(dbData.goal_ftu || 10000),
              state: Number(dbData.on_chain_id > 0 ? 1 : 0)
            };
          }
        } catch {}

        // Try contract fetch
        try {
          const contract = getFundTraceContract();
          const c = await contract.getCampaign(selectedId);
          onchain = {
            id: selectedId,
            totalDonatedWei: parseFtu(c.totalDonated),
            totalAllocatedWei: parseFtu(c.totalAllocated),
            totalSanctionedWei: parseFtu(c.totalSanctioned),
            totalClaimedWei: parseFtu(c.totalClaimed),
            goalWei: parseFtu(c.goal),
            state: Number(c.state)
          };
        } catch {}

        // Try quotations fetch directly from Supabase API
        let quotes: any[] = [];
        try {
          quotes = await getQuotationsByCampaign(selectedId);
        } catch {}

        setCampaignData({
          meta: meta || { title: `Campaign #${selectedId}` },
          onchain: onchain || {
            totalDonatedWei: 0,
            totalAllocatedWei: 0,
            totalSanctionedWei: 0,
            totalClaimedWei: 0,
            goalWei: 0,
            state: 0
          }
        });
        setQuotations(quotes);
      } catch (err) {
        console.error("Failed to load tracking data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCampaignDetails();
  }, [selectedId]);

  const handleSelectCampaign = (id: number) => {
    setSelectedId(id);
    router.push(`/donor/tracking?campaignId=${id}`);
  };

  const raised = Number(campaignData?.onchain?.totalDonatedWei || 0);
  const allocated = Number(campaignData?.onchain?.totalAllocatedWei || 0);
  const sanctioned = Number(campaignData?.onchain?.totalSanctionedWei || 0);
  const claimed = Number(campaignData?.onchain?.totalClaimedWei || 0);
  const proofBacked = quotations
    .filter(q => q.state === QuotationState.ProofSubmitted || q.state === QuotationState.Completed || q.state === "Completed")
    .reduce((acc, q) => acc + (q.claimedAmountFtu || q.claimed_amount_ftu || 0), 0);
  const remaining = Math.max(0, allocated - claimed);

  const steps = [
    { label: "Raised", value: raised, color: "bg-emerald-500", text: "text-emerald-700" },
    { label: "Allocated", value: allocated, color: "bg-indigo-500", text: "text-indigo-700" },
    { label: "Sanctioned", value: sanctioned, color: "bg-blue-500", text: "text-blue-700" },
    { label: "Claimed", value: claimed, color: "bg-purple-500", text: "text-purple-700" },
    { label: "Proof-backed", value: proofBacked, color: "bg-emerald-600", text: "text-emerald-800" },
    { label: "Remaining Allocation", value: remaining, color: "bg-stone-300", text: "text-stone-600" },
  ];

  return (
    <RoleGuard allowedRoles={["DONOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/donor" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Donor Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <Link href="/donor/contributions" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Contributions</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Track Fund Flow</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Fund Flow Tracking</h1>
              <p className="text-stone-600 font-medium mt-2">End-to-end trace of capital deployment for: <span className="font-bold text-stone-900">{campaignData?.meta?.title || `Campaign #${selectedId}`}</span></p>
            </div>

            {/* Campaign Selector Dropdown */}
            {campaignOptions.length > 0 && (
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Select Campaign:</span>
                <select
                  value={selectedId}
                  onChange={(e) => handleSelectCampaign(Number(e.target.value))}
                  className="bg-transparent text-sm font-bold text-stone-900 outline-none cursor-pointer"
                >
                  {campaignOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      #{opt.id} - {opt.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </header>

          {isLoading ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-stone-600 font-bold">Loading fund flow metrics...</p>
            </div>
          ) : (
            <>
              {/* Visualization */}
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 lg:p-12">
                <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-12 text-center">Capital Lifecycle & Multi-Sig Pipeline</h2>
                
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
                            {raised > 0 ? `${Math.round((step.value / raised) * 100)}% of Raised` : "0%"}
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
                  <Activity className="w-6 h-6 text-indigo-500" /> Spending Requests Breakdown ({quotations.length})
                </h2>
                
                <div className="space-y-6">
                  {quotations.map(q => {
                    const getRequestStatus = (state: any) => {
                      if (state === QuotationState.Completed || state === "Completed" || state === QuotationState.ProofSubmitted || state === "ProofSubmitted") {
                        return <span className="text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FileBadge className="w-3 h-3"/> Proof Verified</span>;
                      }
                      if (state === QuotationState.Claimed || state === "Claimed" || state === QuotationState.ProofPending || state === "ProofPending") {
                        return <span className="text-purple-600 bg-purple-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Claimed (Awaiting Proof)</span>;
                      }
                      if (state === QuotationState.Sanctioned || state === "Sanctioned" || state === QuotationState.Claimable || state === "Claimable") {
                        return <span className="text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Sanctioned (Unclaimed)</span>;
                      }
                      return <span className="text-stone-600 bg-stone-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> In Progress</span>;
                    };

                    const reqAmount = q.requestedAmountFtu || q.requested_amount_ftu || 0;
                    const allocAmount = q.allocatedAmountFtu || q.allocated_amount_ftu || 0;
                    const claimAmount = q.claimedAmountFtu || q.claimed_amount_ftu || 0;

                    return (
                      <div key={q.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
                        
                        <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-stone-100 bg-stone-50/50 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="text-lg font-bold font-display text-stone-900">{q.purpose}</h3>
                            </div>
                            <p className="text-sm text-stone-500 font-medium mb-4">Vendor: <span className="font-bold text-stone-800">{q.vendorName || q.vendor_name}</span></p>
                          </div>
                          <div>{getRequestStatus(q.state)}</div>
                        </div>

                        <div className="md:w-2/3 p-6 flex flex-col justify-between gap-6">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Requested</p>
                              <p className="text-lg font-black font-mono text-stone-700">{formatFtu(reqAmount)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Sanctioned</p>
                              <p className="text-lg font-black font-mono text-blue-800">{formatFtu(allocAmount)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-1">Claimed</p>
                              <p className="text-lg font-black font-mono text-purple-800">{formatFtu(claimAmount)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Proof-Backed</p>
                              <p className="text-lg font-black font-mono text-emerald-800">
                                {q.state === QuotationState.Completed || q.state === "Completed" || q.state === QuotationState.ProofSubmitted || q.state === "ProofSubmitted" ? formatFtu(claimAmount) : '₹0'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="border-t border-stone-100 pt-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Blockchain Trace</span>
                              {q.proofHash || q.proof_hash ? (
                                <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-1 rounded flex items-center gap-1 max-w-[200px] truncate">
                                  <LinkIcon className="w-3 h-3 flex-shrink-0" /> {q.proofHash || q.proof_hash}
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

                  {quotations.length === 0 && (
                    <div className="text-center py-12 border border-stone-200 border-dashed rounded-2xl bg-white text-stone-500 font-medium">
                      No spending requests have been made for this campaign yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </RoleGuard>
  );
}

export default function DonorTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-12 bg-[#F7F4ED] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-stone-900" />
          <p className="text-sm font-mono text-stone-500 font-bold uppercase tracking-wider">Loading fund tracking...</p>
        </div>
      }
    >
      <DonorTrackingContent />
    </Suspense>
  );
}
