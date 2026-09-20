"use client";

import React, { useState, useEffect, useCallback } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { formatFtu, CampaignState, QuotationState, QuotationMetadata, AIRecommendation } from '@/types';
import Link from 'next/link';
import { 
  ChevronRight,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Heart,
  Loader2,
  Coins,
  TrendingUp,
  UserCheck,
  RefreshCw,
  Sparkles,
  MapPin,
  Building2,
  ArrowRight,
  Shield,
  Layers,
  Check
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { getFundTraceContract, parseContractError } from '@/lib/contract';
import { getQuotationsByCampaign, sanctionQuotation, rejectQuotation, reviewQuotation } from '@/services/quotationService';
import { DEMO_PRESET_ACCOUNTS, formatAddress } from '@/lib/wallet';
import { ethers } from 'ethers';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────

interface CampaignApprovalItem {
  id: number;
  onChainId: number;
  title: string;
  tagline?: string;
  category: string;
  location: string;
  story: string;
  coverImageUrl?: string;
  creatorAddress: string;
  verifierAddress?: string;
  goalWei: string;
  totalDonatedWei: string;
  goalFtu: number;
  raisedFtu: number;
  remainingFtu: number;
  state: CampaignState;
  plannedBudget?: Array<{ category: string; amount: number }>;
  myDonationFtu: number;
  myVotingWeight: number;
}

export interface BackedCampaignGovernance {
  campaignId: number;
  title: string;
  category: string;
  myDonationFtu: number;
  myVotingWeight: number;
  automationEnabled: boolean;
  totalDonatedFtu: number;
  goalFtu: number;
}

interface QuotationApprovalItem extends QuotationMetadata {
  campaignTitle: string;
  campaignOnChainId: number;
  donorContributionFtu: number;
  donorVotingWeight: number;
  campaignGoalFtu: number;
  campaignRaisedFtu: number;
  campaignAutomationEnabled: boolean;
}

function parseFtu(val: any): number {
  if (!val) return 0;
  const str = val.toString();
  if (str.length > 12) {
    try {
      return parseFloat(Number(ethers.formatEther(val)).toFixed(4));
    } catch {
      return Number(str);
    }
  }
  return Number(str);
}

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────

export default function DonorApprovalsPage() {
  const { wallet, signer, selectDemoRole } = useWallet();
  const [activeTab, setActiveTab] = useState<'CAMPAIGN_FUNDING' | 'MILESTONE_QUOTATIONS'>('CAMPAIGN_FUNDING');
  
  const [campaignApprovals, setCampaignApprovals] = useState<CampaignApprovalItem[]>([]);
  const [quotationApprovals, setQuotationApprovals] = useState<QuotationApprovalItem[]>([]);
  const [backedCampaigns, setBackedCampaigns] = useState<BackedCampaignGovernance[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Action processing state
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [approvingCampaignId, setApprovingCampaignId] = useState<number | null>(null);
  const [togglingAutomationCampId, setTogglingAutomationCampId] = useState<number | null>(null);
  const [contributionInputs, setContributionInputs] = useState<{ [id: number]: string }>({});
  const [autoEnableOnApproval, setAutoEnableOnApproval] = useState<{ [id: number]: boolean }>({});

  const donorPresets = DEMO_PRESET_ACCOUNTS.filter(p => p.appRole === 'DONOR');

  // ─────────────────────────────────────────────────────────
  // Data Loader
  // ─────────────────────────────────────────────────────────
  const loadApprovals = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) {
      setIsLoading(false);
      return;
    }

    try {
      const contract = getFundTraceContract();
      let count = 0;
      try {
        count = Number(await contract.campaignCount());
      } catch (e) {
        console.warn('Could not read campaignCount:', e);
      }

      // Fetch DB metadata for campaigns
      let dbCampaigns: any[] = [];
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/campaigns`);
        if (res.ok) {
          dbCampaigns = await res.json();
        }
      } catch (e) {
        console.warn('Could not read DB campaigns:', e);
      }

      const pendingCampaigns: CampaignApprovalItem[] = [];
      const pendingQuotations: QuotationApprovalItem[] = [];
      const backedCamps: BackedCampaignGovernance[] = [];
      const seenCampaignIds = new Set<number>();

      for (let i = 1; i <= count; i++) {
        seenCampaignIds.add(i);
        try {
          const c = await contract.getCampaign(i);
          if (!c.creator || c.creator === ethers.ZeroAddress) continue;

          // Donor contribution for governance authority
          let myDonationWei = 0n;
          try {
            myDonationWei = await contract.donations(i, wallet.address);
          } catch {}

          const goalFtu = parseFtu(c.goal);
          const raisedFtu = parseFtu(c.totalDonated);
          const myDonationFtu = parseFtu(myDonationWei);
          const remainingFtu = Math.max(0, goalFtu - raisedFtu);
          const stateNum = Number(c.state) as CampaignState;

          const myVotingWeight = (raisedFtu > 0 && myDonationFtu > 0)
            ? Math.min(100, Math.round((myDonationFtu / raisedFtu) * 100))
            : 0;

          const dbMeta = dbCampaigns.find((db: any) => Number(db.on_chain_id) === i);
          const title = dbMeta?.title || `Campaign #${i}`;
          const tagline = dbMeta?.tagline || '';
          const category = dbMeta?.category || 'Community';
          const location = dbMeta?.location || 'India';
          const story = dbMeta?.story || dbMeta?.description || 'Audited community campaign';
          const coverImageUrl = dbMeta?.cover_image_url || '';
          const plannedBudget = Array.isArray(dbMeta?.planned_budget)
            ? dbMeta.planned_budget
            : Array.isArray(dbMeta?.plannedBudget)
              ? dbMeta.plannedBudget
              : [];

          // 1. Check if campaign requires Donor Funding Approval
          // Verified campaigns that have not yet met their full funding goal
          if (stateNum === CampaignState.Verified && remainingFtu > 0) {
            pendingCampaigns.push({
              id: i,
              onChainId: i,
              title,
              tagline,
              category,
              location,
              story,
              coverImageUrl,
              creatorAddress: c.creator,
              verifierAddress: c.verifier,
              goalWei: c.goal.toString(),
              totalDonatedWei: c.totalDonated.toString(),
              goalFtu,
              raisedFtu,
              remainingFtu,
              state: stateNum,
              plannedBudget,
              myDonationFtu,
              myVotingWeight,
            });
          }

          // 2. Check for Milestone Quotation Sanctions
          // "ONLY FOR CERTAIN DONOR": Only show quotation sanction requests & auto-sanction for campaigns THIS donor has backed
          if (myDonationFtu > 0) {
            let isAuto = false;
            try {
              isAuto = await contract.automationEnabled(i);
            } catch (aErr) {
              console.warn(`Could not fetch automationEnabled for campaign #${i}:`, aErr);
            }

            backedCamps.push({
              campaignId: i,
              title,
              category,
              myDonationFtu,
              myVotingWeight,
              automationEnabled: isAuto,
              totalDonatedFtu: raisedFtu,
              goalFtu,
            });

            try {
              const quotes = await getQuotationsByCampaign(i);
              const needsDonorAction = quotes.filter(
                q => q.state === QuotationState.AIEvaluated || q.state === QuotationState.Pending
              );

              needsDonorAction.forEach(q => {
                pendingQuotations.push({
                  ...q,
                  campaignTitle: title,
                  campaignOnChainId: i,
                  donorContributionFtu: myDonationFtu,
                  donorVotingWeight: myVotingWeight,
                  campaignGoalFtu: goalFtu,
                  campaignRaisedFtu: raisedFtu,
                  campaignAutomationEnabled: isAuto,
                });
              });
            } catch (qErr) {
              console.warn(`Could not load quotations for campaign #${i}:`, qErr);
            }
          }
        } catch (campErr) {
          console.error(`Error loading campaign #${i}:`, campErr);
        }
      }

      setCampaignApprovals(pendingCampaigns);
      setQuotationApprovals(pendingQuotations);
      setBackedCampaigns(backedCamps);

      // Auto-focus the tab with active pending approvals if one is empty
      if (pendingCampaigns.length === 0 && pendingQuotations.length > 0) {
        setActiveTab('MILESTONE_QUOTATIONS');
      } else if (pendingCampaigns.length > 0 && pendingQuotations.length === 0) {
        setActiveTab('CAMPAIGN_FUNDING');
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
      toast.error('Failed to load your approval requests');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [wallet.isConnected, wallet.address]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // ─────────────────────────────────────────────────────────
  // Action Handlers: Campaign Funding Approval
  // ─────────────────────────────────────────────────────────
  const handleApproveCampaignFunding = async (camp: CampaignApprovalItem, amountToFund?: number) => {
    if (!signer || !wallet.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    const amt = amountToFund !== undefined 
      ? amountToFund 
      : Number(contributionInputs[camp.id] || camp.remainingFtu);

    if (!amt || amt <= 0) {
      toast.error('Please specify a valid contribution amount');
      return;
    }

    setApprovingCampaignId(camp.id);
    const toastId = toast.loading(`Approving & funding ${formatFtu(amt)} on blockchain...`);

    try {
      const contract = getFundTraceContract(signer);
      const isEth = BigInt(camp.goalWei) > 1_000_000_000_000n;
      let valueToSend: bigint;

      if (isEth) {
        const numStr = Number(amt).toFixed(6).replace(/\.?0+$/, '');
        valueToSend = ethers.parseEther(numStr);
      } else {
        valueToSend = BigInt(Math.floor(amt));
      }

      const tx = await contract.donate(camp.onChainId, { value: valueToSend });
      await tx.wait();

      // If donor selected to auto-enable AI Sanction upon funding this particular campaign
      if (autoEnableOnApproval[camp.id]) {
        try {
          const autoTx = await contract.enableAutomation(camp.onChainId);
          await autoTx.wait();
          toast.success(`⚡ AI Auto-Sanction (Approve & Reject) enabled for "${camp.title}"!`);
        } catch (autoErr: any) {
          console.warn('Auto-enable automation error:', autoErr);
        }
      }

      toast.success(
        `Campaign Funding Approved! Successfully backed ${camp.title} with ${formatFtu(amt)}.`,
        { id: toastId }
      );

      // Reload fresh on-chain data
      await loadApprovals();
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setApprovingCampaignId(null);
    }
  };

  const handleToggleCampaignAutomation = async (campaignId: number, currentlyEnabled: boolean) => {
    if (!signer || !wallet.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setTogglingAutomationCampId(campaignId);
    const toastId = toast.loading(
      currentlyEnabled 
        ? `Disabling AI Auto-Sanction for Campaign #${campaignId}...` 
        : `Enabling AI Auto-Sanction (Approve & Reject) for Campaign #${campaignId}...`
    );

    try {
      const contract = getFundTraceContract(signer);
      const tx = currentlyEnabled
        ? await contract.disableAutomation(campaignId)
        : await contract.enableAutomation(campaignId);
      await tx.wait();

      setBackedCampaigns(prev => prev.map(c => 
        c.campaignId === campaignId ? { ...c, automationEnabled: !currentlyEnabled } : c
      ));
      setQuotationApprovals(prev => prev.map(q => 
        q.campaignOnChainId === campaignId ? { ...q, campaignAutomationEnabled: !currentlyEnabled } : q
      ));

      toast.success(
        currentlyEnabled
          ? `Auto-Sanction disabled for Campaign #${campaignId}. Manual donor review active.`
          : `⚡ AI Auto-Sanction enabled for Campaign #${campaignId}! Invoices meeting AI policy will be automatically processed.`,
        { id: toastId }
      );
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setTogglingAutomationCampId(null);
    }
  };

  const handleRejectCampaignProposal = async (camp: CampaignApprovalItem) => {
    const reason = window.prompt(`Please provide a rejection reason for "${camp.title}":`);
    if (reason === null) return; // User cancelled

    setApprovingCampaignId(camp.id);
    try {
      setCampaignApprovals(prev => prev.filter(c => c.id !== camp.id));
      toast.info(`Campaign proposal rejected. Reason: ${reason || 'Funding requirements not met'}`);
    } finally {
      setApprovingCampaignId(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Action Handlers: Milestone Quotation Sanction
  // ─────────────────────────────────────────────────────────
  const handleSanctionQuotation = async (q: QuotationApprovalItem) => {
    if (!signer || !wallet.address) {
      toast.error('Please connect your wallet first');
      return;
    }
    setProcessingId(q.id!);
    const toastId = toast.loading('Sanctioning quotation on blockchain...');

    try {
      const contract = getFundTraceContract(signer);
      
      // Determine exact on-chain unit for quotation
      let allocatedAmountOnChain = BigInt(q.requestedAmountFtu);
      try {
        const onchainQ = await contract.getQuotation(q.campaignId, q.onChainQuotationId || q.id!);
        if (onchainQ.requestedAmount > 0n) {
          allocatedAmountOnChain = onchainQ.requestedAmount;
        }
      } catch {}

      const tx = await contract.sanctionQuotation(
        q.campaignId,
        q.onChainQuotationId || q.id!,
        allocatedAmountOnChain,
        false,
        ethers.ZeroAddress  // Manual mode: donor is the caller, not a relay
      );
      await tx.wait();

      // Sync backend state
      try {
        await sanctionQuotation(q.id!, wallet.address, q.requestedAmountFtu, false);
      } catch (syncErr) {
        console.warn('Backend sanction sync note:', syncErr);
      }

      setQuotationApprovals(prev => prev.filter(a => a.id !== q.id));
      toast.success(`Sanctioned ${formatFtu(q.requestedAmountFtu)} milestone disbursement!`, { id: toastId });
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectQuotation = async (q: QuotationApprovalItem) => {
    if (!signer || !wallet.address) return;
    const reason = window.prompt('Provide rejection reason:');
    if (!reason) return;

    setProcessingId(q.id!);
    const toastId = toast.loading('Rejecting quotation on blockchain...');
    try {
      const contract = getFundTraceContract(signer);
      const tx = await contract.rejectQuotation(q.campaignId, q.onChainQuotationId || q.id!, reason);
      await tx.wait();

      try {
        await rejectQuotation(q.id!, wallet.address, reason);
      } catch {}

      setQuotationApprovals(prev => prev.filter(a => a.id !== q.id));
      toast.success('Quotation rejected on blockchain', { id: toastId });
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReviewQuotation = async (q: QuotationApprovalItem) => {
    if (!wallet.address) return;
    const reason = window.prompt('Reason for flagging manual review:');
    if (!reason) return;

    setProcessingId(q.id!);
    try {
      await reviewQuotation(q.id!, wallet.address, reason);
      setQuotationApprovals(prev => prev.filter(a => a.id !== q.id));
      toast.success('Quotation flagged for manual review');
    } catch (err: any) {
      toast.error(err.message || 'Failed to flag quotation');
    } finally {
      setProcessingId(null);
    }
  };

  // Find active preset metadata for the persona banner
  const activeDonorPreset = donorPresets.find(
    p => p.address.toLowerCase() === wallet.address?.toLowerCase()
  );

  return (
    <RoleGuard allowedRoles={['DONOR']}>
      <div className="min-h-screen p-6 sm:p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header & Breadcrumb */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/donor" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">
                  Donor Portfolio
                </Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Approvals & Governance</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black font-bebas uppercase tracking-tight text-stone-900">
                Donor Approvals
              </h1>
              <p className="text-stone-600 font-medium text-sm sm:text-base mt-1 max-w-2xl">
                Review and approve campaign funding proposals, and sanction part-by-part milestone spending requests with AI audit verification.
              </p>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                setIsRefreshing(true);
                loadApprovals();
              }}
              disabled={isRefreshing || isLoading}
              className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 font-bold rounded-xl hover:bg-stone-50 text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all self-start md:self-end"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              Refresh Approvals
            </button>
          </header>

          {/* Persona Governance Context Banner */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-stone-400">Connected Donor</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-md">
                    {activeDonorPreset ? activeDonorPreset.role : 'Authorized Donor'}
                  </span>
                </div>
                <p className="text-sm font-bold font-mono text-stone-800">
                  {wallet.address}
                </p>
              </div>
            </div>

            {/* Quick Demo Donor Switcher for rapid multi-donor approval testing */}
            <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 w-full md:w-auto">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Switch Donor Demo:</span>
              {donorPresets.map((preset) => {
                const isCurrent = preset.address.toLowerCase() === wallet.address?.toLowerCase();
                const firstName = preset.role.split(' ')[0];
                return (
                  <button
                    key={preset.address}
                    onClick={() => selectDemoRole(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-stone-900 text-white shadow-sm ring-2 ring-stone-900'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                    }`}
                  >
                    {firstName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Tab Bar */}
          <div className="flex border-b border-stone-300 gap-4 sm:gap-8">
            <button
              onClick={() => setActiveTab('CAMPAIGN_FUNDING')}
              className={`pb-4 text-sm sm:text-base font-black font-display tracking-wide uppercase transition-all relative flex items-center gap-2.5 ${
                activeTab === 'CAMPAIGN_FUNDING'
                  ? 'text-stone-900 border-b-2 border-stone-900'
                  : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              <Heart className="w-4 h-4" />
              Campaign Funding Approvals
              <span className={`px-2 py-0.5 text-xs rounded-full font-mono font-bold ${
                activeTab === 'CAMPAIGN_FUNDING' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {campaignApprovals.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('MILESTONE_QUOTATIONS')}
              className={`pb-4 text-sm sm:text-base font-black font-display tracking-wide uppercase transition-all relative flex items-center gap-2.5 ${
                activeTab === 'MILESTONE_QUOTATIONS'
                  ? 'text-stone-900 border-b-2 border-stone-900'
                  : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              Milestone Quotation Sanctions
              <span className={`px-2 py-0.5 text-xs rounded-full font-mono font-bold ${
                activeTab === 'MILESTONE_QUOTATIONS' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {quotationApprovals.length}
              </span>
            </button>
          </div>

          {/* Loading Indicator */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-stone-900" />
              <p className="text-sm font-mono text-stone-500 font-bold uppercase tracking-wider">Loading governance records...</p>
            </div>
          ) : (
            <>
              {/* ─────────────────────────────────────────────────── */}
              {/* TAB 1: CAMPAIGN FUNDING APPROVALS                   */}
              {/* ─────────────────────────────────────────────────── */}
              {activeTab === 'CAMPAIGN_FUNDING' && (
                <div className="space-y-6">
                  <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-amber-900">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-xs sm:text-sm font-medium">
                        These campaigns have verified project proposals and are awaiting donor approval & initial backing to activate milestone disbursements.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    {campaignApprovals.map((camp) => {
                      const isApproving = approvingCampaignId === camp.id;
                      const customInputVal = contributionInputs[camp.id] ?? '';

                      return (
                        <div 
                          key={camp.id} 
                          className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col xl:flex-row hover:shadow-md transition-all"
                        >
                          {/* Left Column: Campaign Details & Budget Breakdown */}
                          <div className="xl:w-7/12 p-6 sm:p-8 flex flex-col justify-between border-b xl:border-b-0 xl:border-r border-stone-100">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> Awaiting Donor Funding
                                </span>
                                <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-bold rounded-full flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-stone-400" /> {camp.location}
                                </span>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
                                  {camp.category}
                                </span>
                              </div>

                              <h2 className="text-2xl sm:text-3xl font-black font-display text-stone-900 leading-tight mb-2">
                                {camp.title}
                              </h2>
                              <p className="text-sm text-stone-600 leading-relaxed mb-6 font-medium line-clamp-3">
                                {camp.story}
                              </p>

                              {/* Planned Fund Usage / Budget Breakdown */}
                              {camp.plannedBudget && camp.plannedBudget.length > 0 && (
                                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 mb-6">
                                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-stone-400" /> Planned Budget Usage
                                  </p>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {camp.plannedBudget.map((b, idx) => (
                                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-stone-200 text-xs">
                                        <p className="text-stone-400 font-bold truncate">{b.category}</p>
                                        <p className="font-black font-mono text-stone-800 text-sm mt-0.5">₹{Number(b.amount).toLocaleString()}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Creator Info */}
                              <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
                                <span>Creator:</span>
                                <span className="bg-stone-100 px-2.5 py-1 rounded-md text-stone-800 font-bold">
                                  {camp.creatorAddress}
                                </span>
                              </div>
                            </div>

                            <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between">
                              <Link
                                href={`/donor/campaigns/${camp.id}`}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group transition-colors"
                              >
                                View full campaign story & documentation
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </Link>
                              {camp.myDonationFtu > 0 && (
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                  You contributed {formatFtu(camp.myDonationFtu)} ({camp.myVotingWeight}% share)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Funding Approval & Rejection Actions */}
                          <div className="xl:w-5/12 p-6 sm:p-8 bg-stone-50/60 flex flex-col justify-between">
                            <div className="space-y-6">
                              <div>
                                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                                  Requested Funding Target
                                </span>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-4xl sm:text-5xl font-black font-bebas text-stone-900 tracking-tight">
                                    {formatFtu(camp.remainingFtu)}
                                  </span>
                                  <span className="text-xs font-bold text-stone-500">remaining needed</span>
                                </div>
                                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden mt-3">
                                  <div
                                    className="bg-emerald-500 h-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(100, (camp.raisedFtu / camp.goalFtu) * 100)}%`
                                    }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs font-mono text-stone-500 mt-1.5">
                                  <span>Raised: {formatFtu(camp.raisedFtu)}</span>
                                  <span>Goal: {formatFtu(camp.goalFtu)}</span>
                                </div>
                              </div>

                              {/* Contribution Presets */}
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                                  Select Funding Commitment
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    { label: 'Full Target', amount: camp.remainingFtu },
                                    { label: '50% Target', amount: Math.round(camp.remainingFtu * 0.5) },
                                    { label: '25% Target', amount: Math.round(camp.remainingFtu * 0.25) },
                                  ].map((preset) => (
                                    <button
                                      key={preset.label}
                                      onClick={() => {
                                        setContributionInputs(prev => ({
                                          ...prev,
                                          [camp.id]: preset.amount.toString()
                                        }));
                                      }}
                                      className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                                        customInputVal === preset.amount.toString()
                                          ? 'bg-stone-900 text-white border-stone-900'
                                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                                      }`}
                                    >
                                      <span className="block text-[10px] text-stone-400 font-normal">{preset.label}</span>
                                      {formatFtu(preset.amount)}
                                    </button>
                                  ))}
                                </div>

                                {/* Custom Amount Input */}
                                <div className="relative mt-2">
                                  <span className="absolute left-3.5 top-3 text-stone-400 font-bold text-sm">₹</span>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder={`Enter custom amount (Max ${camp.remainingFtu})`}
                                    value={customInputVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setContributionInputs(prev => ({ ...prev, [camp.id]: val }));
                                    }}
                                    className="w-full py-2.5 pl-8 pr-4 bg-white border border-stone-300 rounded-xl text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons: Approve / Reject */}
                            <div className="pt-6 mt-6 border-t border-stone-200 space-y-3">
                              {/* Auto-Enable AI Sanction checkbox (only for this particular campaign) */}
                              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 flex items-start gap-2.5 shadow-sm">
                                <input
                                  type="checkbox"
                                  id={`auto-enable-${camp.id}`}
                                  checked={!!autoEnableOnApproval[camp.id]}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setAutoEnableOnApproval(prev => ({ ...prev, [camp.id]: checked }));
                                  }}
                                  className="mt-1 h-4 w-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <label htmlFor={`auto-enable-${camp.id}`} className="text-xs text-stone-700 leading-snug cursor-pointer select-none">
                                  <span className="font-bold text-stone-900 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    Auto-enable AI Sanctions (Approve & Reject) for this campaign
                                  </span>
                                  <span className="text-stone-500 text-[11px] block mt-0.5">
                                    When you fund this campaign, automatically allow AI to sanction verified milestone invoices and reject flagged ones.
                                  </span>
                                </label>
                              </div>

                              <button
                                onClick={() => handleApproveCampaignFunding(camp)}
                                disabled={isApproving}
                                className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black font-display text-base rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                {isApproving ? (
                                  <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Sanctioning on Blockchain...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Approve & Fund {customInputVal ? formatFtu(Number(customInputVal)) : formatFtu(camp.remainingFtu)}
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleRejectCampaignProposal(camp)}
                                disabled={isApproving}
                                className="w-full py-2.5 px-4 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" /> Reject Funding Proposal
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {campaignApprovals.length === 0 && (
                      <div className="bg-white rounded-3xl border border-stone-200 p-16 text-center shadow-sm">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black font-display text-stone-900 mb-2">
                          All Open Campaigns Funded!
                        </h3>
                        <p className="text-stone-500 max-w-md mx-auto mb-6 text-sm">
                          There are no verified campaign proposals currently awaiting donor acceptance. Explore your portfolio or review ongoing milestone disbursements.
                        </p>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => setActiveTab('MILESTONE_QUOTATIONS')}
                            className="px-5 py-2.5 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-colors"
                          >
                            Check Milestone Sanctions
                          </button>
                          <Link
                            href="/donor"
                            className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-50 transition-colors"
                          >
                            Back to Portfolio
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────── */}
              {/* TAB 2: MILESTONE QUOTATION SANCTIONS                */}
              {/* ─────────────────────────────────────────────────── */}
              {activeTab === 'MILESTONE_QUOTATIONS' && (
                <div className="space-y-6">
                  <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-indigo-900">
                      <BrainCircuit className="w-4 h-4 text-indigo-600 shrink-0" />
                      <p className="text-xs sm:text-sm font-medium">
                        Showing pending milestone spending requests from campaigns where <strong>you are an active contributor</strong> ({formatAddress(wallet.address)}).
                      </p>
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────── */}
                  {/* Per-Campaign Auto-Sanction Controls (Only for Backed Camps)  */}
                  {/* ─────────────────────────────────────────────────────────── */}
                  {backedCampaigns.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-500" />
                          Campaign-Specific AI Auto-Sanction Controls ({backedCampaigns.length} Backed)
                        </h3>
                        <span className="text-[11px] text-stone-400 font-medium">
                          Auto-sanction approve/reject policies are scoped to each campaign you backed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {backedCampaigns.map((camp) => (
                          <div 
                            key={camp.campaignId}
                            className={`p-5 rounded-2xl border transition-all ${
                              camp.automationEnabled 
                                ? 'bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border-emerald-300 shadow-sm' 
                                : 'bg-white border-stone-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                                    Campaign #{camp.campaignId}
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    camp.automationEnabled 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-stone-100 text-stone-600'
                                  }`}>
                                    {camp.automationEnabled ? (
                                      <>
                                        <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-Sanction ON
                                      </>
                                    ) : (
                                      'Manual Sanction'
                                    )}
                                  </span>
                                </div>
                                <h4 className="font-black font-display text-stone-900 text-base line-clamp-1">{camp.title}</h4>
                                <p className="text-xs text-stone-600 font-medium mt-1">
                                  Your Backing: <strong className="text-stone-900">{formatFtu(camp.myDonationFtu)}</strong> ({camp.myVotingWeight}% contribution share)
                                </p>
                              </div>

                              <button
                                onClick={() => handleToggleCampaignAutomation(camp.campaignId, camp.automationEnabled)}
                                disabled={togglingAutomationCampId === camp.campaignId}
                                className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 shadow-sm ${
                                  camp.automationEnabled
                                    ? 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
                                    : 'bg-stone-900 text-white hover:bg-stone-800'
                                } disabled:opacity-50`}
                              >
                                {togglingAutomationCampId === camp.campaignId ? (
                                  <span className="flex items-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                                  </span>
                                ) : camp.automationEnabled ? (
                                  'Disable Auto-Sanction'
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Enable Auto-Sanction
                                  </span>
                                )}
                              </button>
                            </div>

                            <div className="mt-3.5 pt-3 border-t border-stone-200/60 text-[11px] text-stone-600 flex flex-wrap items-center justify-between gap-2">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className={`w-3.5 h-3.5 ${camp.automationEnabled ? 'text-emerald-600' : 'text-stone-300'}`} />
                                Auto-Approve: Safe invoices (confidence ≥ 85%)
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle className={`w-3.5 h-3.5 ${camp.automationEnabled ? 'text-red-500' : 'text-stone-300'}`} />
                                Auto-Reject: High risk invoices
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-8">
                    {quotationApprovals.map((q) => {
                      let ai: AIRecommendation | undefined = typeof q.aiRecommendation === 'string'
                        ? JSON.parse(q.aiRecommendation)
                        : q.aiRecommendation;

                      if (!ai) return null;

                      const isProcessing = processingId === q.id;

                      return (
                        <div
                          key={q.id}
                          className={`bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col xl:flex-row transition-all ${
                            isProcessing ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'
                          }`}
                        >
                          {/* Left Column: Request Details & Donor Authority */}
                          <div className="xl:w-1/3 p-6 xl:p-8 border-b xl:border-b-0 xl:border-r border-stone-100 flex flex-col justify-between bg-stone-50/50">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Awaiting Sanction
                                </span>
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full flex items-center gap-1">
                                  Your Share: {q.donorVotingWeight}%
                                </span>
                                {q.campaignAutomationEnabled && (
                                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-Sanction Enabled
                                  </span>
                                )}
                              </div>

                              <h2 className="text-2xl font-black font-display text-stone-900 leading-tight mb-2">
                                {q.purpose}
                              </h2>
                              <p className="text-sm text-stone-500 font-medium mb-6">
                                Campaign: <span className="font-bold text-stone-800">{q.campaignTitle}</span>
                              </p>

                              <div className="mb-6">
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                                  Requested Disbursement
                                </p>
                                <p className="text-4xl font-black font-bebas text-stone-900">
                                  {formatFtu(q.requestedAmountFtu)}
                                </p>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Creator</p>
                                  <p className="text-xs font-mono font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded inline-block">
                                    {q.creatorAddress}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Vendor</p>
                                  <p className="text-sm font-bold text-stone-800">{q.vendorName}</p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-stone-200">
                              <Link
                                href={q.quotationDocumentUrl || '#'}
                                target="_blank"
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-stone-300 text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition-colors shadow-sm text-sm"
                              >
                                <FileText className="w-4 h-4" /> View Original Invoice PDF
                              </Link>
                            </div>
                          </div>

                          {/* Right Column: AI Risk Analysis & Governance Actions */}
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
                                    <p className="text-xs text-stone-500 mt-1">{ai.proofHistory || 'Good track record of verified proofs'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Campaign Relevance</p>
                                    <p className="text-sm text-stone-700 font-medium">{ai.campaignRelevance || 'Directly aligns with milestone deliverables'}</p>
                                  </div>
                                </div>

                                <div className="space-y-6">
                                  <div>
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Price Assessment</p>
                                    <p className="text-sm text-stone-700 font-medium">{ai.priceAssessment || 'Aligned with fair market benchmarks'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Budget Impact</p>
                                    <p className="text-sm text-stone-700 font-medium">{ai.budgetImpact || 'Within expected budget allocation'}</p>
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
                                onClick={() => handleRejectQuotation(q)}
                                disabled={isProcessing}
                                className="w-full sm:w-auto px-6 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                              >
                                <XCircle className="w-5 h-5" /> Reject
                              </button>
                              <button
                                onClick={() => handleReviewQuotation(q)}
                                disabled={isProcessing}
                                className="w-full sm:w-auto px-6 py-3 bg-white border border-amber-200 text-amber-600 font-bold rounded-xl hover:bg-amber-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                              >
                                <AlertTriangle className="w-5 h-5" /> Flag for Review
                              </button>
                              <button
                                onClick={() => handleSanctionQuotation(q)}
                                disabled={isProcessing}
                                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                              >
                                <CheckCircle2 className="w-5 h-5" /> Sanction {formatFtu(q.requestedAmountFtu)}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {quotationApprovals.length === 0 && (
                      <div className="bg-white rounded-3xl border border-stone-200 p-16 text-center shadow-sm">
                        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-black font-display text-stone-900 mb-2">
                          No Pending Milestone Requests
                        </h3>
                        <p className="text-stone-500 max-w-md mx-auto mb-6 text-sm leading-relaxed">
                          There are no quotation disbursements awaiting your sanction for campaigns you have funded. As a contributor, governance sanction rights are granted for campaigns you back.
                        </p>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => setActiveTab('CAMPAIGN_FUNDING')}
                            className="px-5 py-2.5 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-colors"
                          >
                            Explore Campaign Proposals
                          </button>
                          <Link
                            href="/donor"
                            className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-50 transition-colors"
                          >
                            Back to Portfolio
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </RoleGuard>
  );
}
