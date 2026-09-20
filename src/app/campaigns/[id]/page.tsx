"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { formatFtu, CampaignState, QuotationState } from '@/types';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin,
  Calendar,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  User,
  Activity,
  FileText,
  Clock,
  ArrowRight,
  ChevronLeft,
  Loader2,
  X,
  Wallet,
  Heart,
  BarChart3,
  Settings,
  AlertCircle,
  Zap,
  RefreshCw,
  ExternalLink,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { getFundTraceContract, parseContractError } from '@/lib/contract';
import { getQuotationsByCampaign } from '@/services/quotationService';

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id || 1);
  const { wallet, signer } = useWallet();
  const { isConnected, appRole, address } = wallet;

  const [activeTab, setActiveTab] = useState<'STORY' | 'LEDGER'>('STORY');
  
  const [onchain, setOnchain] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [campaignQuotations, setCampaignQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myContribution, setMyContribution] = useState(0);
  const [myContributionShare, setMyContributionShare] = useState(0);

  // Custom Contribution Modal State
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isContributing, setIsContributing] = useState(false);

  function parseAmount(val: any): number {
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

  const loadCampaign = useCallback(async () => {
    setIsLoading(true);
    try {
      let dbMeta: any = null;
      let effectiveOnChainId = id;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/campaigns/${id}`);
        if (res.ok) {
          const data = await res.json();
          dbMeta = data.metadata || data;
          if (dbMeta?.on_chain_id && Number(dbMeta.on_chain_id) > 0) {
            effectiveOnChainId = Number(dbMeta.on_chain_id);
          }
        }
      } catch (e) { console.warn('Could not fetch campaign metadata from DB:', e); }

      const contract = getFundTraceContract();
      const c = await contract.getCampaign(effectiveOnChainId);

      setOnchain({
        id: effectiveOnChainId,
        creator: c.creator,
        verifier: c.verifier,
        goalWei: c.goal.toString(),
        deadline: Number(c.deadline),
        totalDonatedWei: c.totalDonated.toString(),
        totalReleasedWei: c.totalReleased.toString(),
        metadataHash: c.metadataHash,
        state: Number(c.state) as CampaignState,
        requestCount: Number(c.requestCount),
        activeRequestId: Number(c.activeRequestId),
        beneficiary: c.beneficiary,
        totalSanctionedWei: c.totalSanctioned.toString(),
        totalAllocatedWei: c.totalAllocated.toString(),
        totalClaimedWei: c.totalClaimed.toString(),
        quotationCount: Number(c.quotationCount),
      });

      setMeta({
        title: dbMeta?.title || `Campaign #${id}`,
        tagline: dbMeta?.tagline || 'Audited decentralized campaign',
        story: dbMeta?.story || dbMeta?.description || 'Decentralized audited initiative on FundTrace.',
        category: dbMeta?.category || 'Community',
        location: dbMeta?.location || 'Global',
        coverImageUrl: dbMeta?.cover_image_url || '',
        creatorName: dbMeta?.creator_address
          ? `${dbMeta.creator_address.slice(0, 6)}...${dbMeta.creator_address.slice(-4)}`
          : 'Creator',
        fundingDeadline: dbMeta?.funding_deadline || (c?.deadline ? new Date(Number(c.deadline) * 1000).toISOString() : null),
        plannedBudget: Array.isArray(dbMeta?.planned_budget)
          ? dbMeta.planned_budget
          : Array.isArray(dbMeta?.plannedBudget) ? dbMeta.plannedBudget : [],
      });

      if (address) {
        try {
          const donated = await contract.donations(effectiveOnChainId, address);
          const donatedNum = parseAmount(donated);
          setMyContribution(donatedNum);
          const totalRaised = parseAmount(c.totalDonated);
          if (totalRaised > 0 && donatedNum > 0) {
            setMyContributionShare(Math.min(100, Math.round((donatedNum / totalRaised) * 100)));
          }
        } catch {}
      }

      try { 
        const quotes = await getQuotationsByCampaign(effectiveOnChainId); 
        setCampaignQuotations(quotes); 
      } catch {}
    } catch (err) {
      console.error('Failed to load on-chain campaign:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, address]);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  async function handleContribute(amountToFund?: number) {
    if (!signer) {
      toast.error('Please connect your wallet or select a demo role from the navbar to contribute.');
      return;
    }
    if (!onchain) {
      toast.error('Campaign data not loaded yet.');
      return;
    }
    if (onchain.state !== CampaignState.Verified) {
      if (onchain.state === CampaignState.FundingClosed) {
        toast.info('This campaign has reached its funding goal and is fully allocated!');
      } else {
        toast.error('Campaign is not currently open for contributions.');
      }
      return;
    }

    const amt = amountToFund !== undefined ? amountToFund : Number(customAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid contribution amount');
      return;
    }

    const goalBig = BigInt(onchain.goalWei || 0);
    let valueToSend: bigint;
    if (goalBig > 1_000_000_000_000n) {
      try {
        const numStr = Number(amt).toFixed(6).replace(/\.?0+$/, '');
        valueToSend = ethers.parseEther(numStr);
      } catch {
        valueToSend = ethers.parseEther(amt.toString());
      }
    } else {
      valueToSend = BigInt(Math.floor(amt));
    }

    if (valueToSend <= 0n) {
      toast.error('Contribution amount is too small');
      return;
    }

    setIsContributing(true);
    try {
      const contract = getFundTraceContract(signer);
      const tx = await contract.donate(onchain.id, { value: valueToSend });
      await tx.wait();

      toast.success(`Contributed ${formatFtu(amt)} successfully! Allotted to campaign pool.`);
      setShowContributeModal(false);
      setCustomAmount('');
      await loadCampaign();
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg);
    } finally {
      setIsContributing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F4ED] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-stone-600 font-bold">Loading campaign details...</p>
      </div>
    );
  }

  if (!onchain || !meta) {
    return (
      <div className="min-h-screen bg-[#F7F4ED] flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-black font-bebas mb-4">Campaign Not Found</h1>
        <Link href="/campaigns" className="text-indigo-600 font-bold hover:underline">Return to Discovery</Link>
      </div>
    );
  }

  // ── Derived values ──
  const raised = parseAmount(onchain.totalDonatedWei);
  const goal = parseAmount(onchain.goalWei);
  const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const isFunding = onchain.state === CampaignState.Verified;
  const allocated = parseAmount(onchain.totalAllocatedWei);
  const claimed = parseAmount(onchain.totalClaimedWei);
  const remainingNeeded = goal > raised ? goal - raised : 0;
  const proofBacked = campaignQuotations
    .filter((q: any) => q.state === QuotationState.Completed || q.state === QuotationState.ProofSubmitted)
    .reduce((acc: number, q: any) => acc + (q.claimedAmountFtu || 0), 0);

  // ── Role determination ──
  const isCreator = !!(address && onchain.creator && address.toLowerCase() === onchain.creator.toLowerCase());
  const isAdmin = appRole === 'ADMIN';
  const isDonor = appRole === 'DONOR';
  const hasContributed = myContribution > 0;

  type EffectiveRole = 'CREATOR' | 'ADMIN' | 'DONOR_CONTRIBUTED' | 'DONOR' | 'PUBLIC';
  let effectiveRole: EffectiveRole;
  if (isAdmin) effectiveRole = 'ADMIN';
  else if (isCreator) effectiveRole = 'CREATOR';
  else if (isDonor && hasContributed) effectiveRole = 'DONOR_CONTRIBUTED';
  else if (isDonor) effectiveRole = 'DONOR';
  else effectiveRole = 'PUBLIC';

  const daysLeft = meta.fundingDeadline
    ? Math.ceil((new Date(meta.fundingDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // ── CTA Panel ──
  function renderCTAPanel() { 
    if (effectiveRole === 'ADMIN') return (
      <div className="space-y-3">
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Admin View
          </p>
          <p className="text-sm font-bold text-purple-900">Full management access</p>
        </div>
        <Link href="/admin/campaigns"
          className="w-full py-4 bg-purple-700 text-white font-black font-display text-base rounded-xl hover:bg-purple-800 transition-colors flex items-center justify-center gap-2 group">
          <Settings className="w-5 h-5" /> Admin Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    );

    if (effectiveRole === 'CREATOR') return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <User className="w-3 h-3" /> Creator Portal
          </p>
          <p className="text-sm font-bold text-amber-950">You are the creator of this initiative.</p>
        </div>
        <Link href={`/creator/campaigns/${id}`}
          className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-black font-display text-base rounded-xl transition-colors flex items-center justify-center gap-2 group">
          Manage Campaign & Claims <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    );

    return (
      <div className="bg-white border-2 border-indigo-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black font-display text-stone-900 text-base">Back This Initiative</h3>
            <p className="text-xs text-stone-500">
              {isFunding ? 'All contributed funds are locked in smart escrow and allotted to campaign milestones.' : 'Campaign is funded and locked in milestone escrow.'}
            </p>
          </div>
        </div>

        {isFunding ? (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setShowContributeModal(true)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black font-display text-base rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              <Heart className="w-5 h-5" /> Contribute to Campaign <ArrowRight className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-3 gap-2">
              {[500, 1000, 5000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleContribute(preset)}
                  disabled={isContributing}
                  className="py-2.5 px-3 bg-stone-50 hover:bg-indigo-50 border border-stone-200 hover:border-indigo-300 text-stone-800 hover:text-indigo-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  +{formatFtu(preset)}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-stone-400 text-center font-medium">
              🔒 100% of contribution is allotted to the campaign & protected by milestone sanctions
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              ✓ Funding Goal Met ({formatFtu(raised)})
            </span>
            <p className="text-xs text-emerald-700 font-medium">
              100% of funds are allocated to the campaign and governed by donor quotation sanctions.
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
          <Link
            href={`/donor/campaigns/${id}`}
            className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1"
          >
            <Wallet className="w-3.5 h-3.5" /> Full Donor Portal View <ArrowRight className="w-3 h-3" />
          </Link>
          {hasContributed && (
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full text-[11px]">
              You backed {formatFtu(myContribution)} ({myContributionShare}%)
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Donor-specific extra sections ──
  function renderAdminSections() {
    if (effectiveRole !== 'ADMIN') return null;
    return (
      <div className="mt-12 bg-purple-50 border border-purple-200 rounded-3xl p-6">
        <h3 className="font-black font-display text-purple-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-600" /> Admin Controls — Campaign #{id}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Status', value: CampaignState[onchain.state] },
            { label: 'Requests', value: String(onchain.requestCount) },
            { label: 'Quotations', value: String(onchain.quotationCount) },
            { label: 'Raised', value: formatFtu(raised) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl p-4 text-center border border-purple-100">
              <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">{label}</p>
              <p className="font-black text-purple-900">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Link href="/admin/campaigns" className="px-5 py-2.5 bg-purple-700 text-white font-bold text-sm rounded-xl hover:bg-purple-800 transition-colors flex items-center gap-2">
            <Settings className="w-4 h-4" /> Campaign Admin Panel
          </Link>
          <Link href="/admin/ledger" className="px-5 py-2.5 border border-purple-200 text-purple-700 font-bold text-sm rounded-xl hover:bg-purple-100 transition-colors flex items-center gap-2">
            <Activity className="w-4 h-4" /> View Audit Ledger
          </Link>
          <p className="text-xs font-mono text-purple-400">
            Creator: {onchain.creator?.slice(0, 8)}...{onchain.creator?.slice(-6)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>

      <div className="min-h-screen bg-[#F7F4ED] text-[#141414] pb-24">

        {/* Back Nav */}
        <div className="max-w-7xl mx-auto px-8 lg:px-12 pt-8 pb-4">
          <Link href="/campaigns" className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Discover
          </Link>
        </div>

        {/* Hero */}
        <div className="max-w-7xl mx-auto px-8 lg:px-12 mb-12">
          <div className="bg-white rounded-[40px] border border-stone-200 shadow-sm overflow-hidden flex flex-col lg:flex-row">

            {/* Left: Image */}
            <div className="lg:w-7/12 relative">
              <div className="h-64 lg:h-full min-h-[400px] bg-stone-200 relative">
                {meta.coverImageUrl ? (
                  <img src={meta.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm font-bold">No Cover Image</div>
                )}
                <div className="absolute top-6 left-6 flex gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-stone-900 text-xs font-black rounded-lg shadow-sm">
                    <MapPin className="w-3 h-3 text-indigo-500" /> {meta.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-stone-900 text-xs font-black uppercase tracking-wider rounded-lg shadow-sm">
                    {meta.category}
                  </span>
                </div>
                {/* Role badge */}
                {effectiveRole !== 'PUBLIC' && (
                  <div className="absolute bottom-6 left-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg shadow-sm ${
                      effectiveRole === 'ADMIN' ? 'bg-purple-600 text-white' :
                      effectiveRole === 'CREATOR' ? 'bg-amber-500 text-white' :
                      effectiveRole === 'DONOR_CONTRIBUTED' ? 'bg-indigo-600 text-white' :
                      'bg-white/90 text-stone-800'
                    }`}>
                      {effectiveRole === 'ADMIN' && <><ShieldCheck className="w-3 h-3" /> Admin View</>}
                      {effectiveRole === 'CREATOR' && <><User className="w-3 h-3" /> Your Campaign</>}
                      {effectiveRole === 'DONOR_CONTRIBUTED' && <><Heart className="w-3 h-3" /> You Contributed</>}
                      {effectiveRole === 'DONOR' && <><Wallet className="w-3 h-3" /> Donor</>}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Funding & CTA */}
            <div className="lg:w-5/12 p-8 lg:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-4">
                {isFunding ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full">
                    <TrendingUp className="w-3 h-3" /> Actively Funding
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Funding Met
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-700 text-xs font-bold rounded-full font-mono">
                  ID: {onchain.id}
                </span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-black font-display text-stone-900 leading-tight mb-4">{meta.title}</h1>
              <p className="text-stone-500 font-medium mb-8">{meta.tagline}</p>

              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100 mb-8">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="text-4xl font-black font-bebas text-stone-900">{formatFtu(raised)}</span>
                    <span className="text-sm font-bold text-stone-500 ml-1 uppercase">Raised</span>
                  </div>
                  <span className="text-2xl font-black font-bebas text-indigo-600">{progress}%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-3 mb-4 overflow-hidden">
                  <div className={`h-3 rounded-full transition-all duration-1000 ${isFunding ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                    style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
                  <span>Goal: {formatFtu(goal)}</span>
                  {isFunding && daysLeft !== null && daysLeft > 0 && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {daysLeft} Days Left</span>
                  )}
                  {isFunding && daysLeft !== null && daysLeft <= 0 && (
                    <span className="flex items-center gap-1 text-red-400"><Clock className="w-3 h-3" /> Deadline Passed</span>
                  )}
                </div>
              </div>

              {renderCTAPanel()}
            </div>
          </div>
        </div>

        {/* Tabs & Content */}
        <div className="max-w-7xl mx-auto px-8 lg:px-12">
          <div className="flex border-b border-stone-200 mb-8">
            <button onClick={() => setActiveTab('STORY')}
              className={`px-8 py-4 font-black font-display text-lg border-b-4 transition-colors ${activeTab === 'STORY' ? 'border-indigo-600 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
              The Story
            </button>
            <button onClick={() => setActiveTab('LEDGER')}
              className={`px-8 py-4 font-black font-display text-lg border-b-4 transition-colors flex items-center gap-2 ${activeTab === 'LEDGER' ? 'border-indigo-600 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
              Public Ledger <span className="bg-stone-100 text-stone-500 text-xs px-2 py-0.5 rounded-full font-bold">{campaignQuotations.length}</span>
            </button>
          </div>

          {activeTab === 'STORY' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 prose prose-stone max-w-none prose-p:text-stone-600 prose-headings:font-display prose-headings:font-black">
                {(meta?.story || '').split('\n').map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                ))}
                {meta?.plannedBudget && meta.plannedBudget.length > 0 && (
                  <div className="mt-12 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm not-prose">
                    <h3 className="text-xl font-black font-display text-stone-900 mb-6">Planned Budget</h3>
                    <div className="space-y-4">
                      {meta.plannedBudget.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                          <span className="font-bold text-stone-700">{item.category}</span>
                          <span className="font-black font-mono text-stone-900">{formatFtu(item.amountFtu || item.amount || 0)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center p-4 border-t border-stone-200 mt-2">
                        <span className="font-bold text-stone-500 uppercase tracking-wider">Total Planned</span>
                        <span className="font-black font-mono text-indigo-600 text-xl">
                          {formatFtu(meta.plannedBudget.reduce((acc: number, curr: any) => acc + (curr.amountFtu || curr.amount || 0), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Creator</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">{meta?.creatorName || 'Creator'}</p>
                      {onchain?.creator && (
                        <p className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded mt-1 inline-block">
                          {onchain.creator.slice(0, 6)}...{onchain.creator.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Capital Health</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Raised', value: raised, color: 'bg-stone-900', width: '100%' },
                      { label: 'Allocated to Requests', value: allocated, color: 'bg-indigo-500', width: raised > 0 ? `${(allocated/raised)*100}%` : '0%' },
                      { label: 'Claimed & Spent', value: claimed, color: 'bg-purple-500', width: raised > 0 ? `${(claimed/raised)*100}%` : '0%' },
                      { label: 'Proof Verified', value: proofBacked, color: 'bg-emerald-500', width: raised > 0 ? `${(proofBacked/raised)*100}%` : '0%' },
                    ].map(({ label, value, color, width }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-stone-500">{label}</span>
                          <span className="text-stone-900">{formatFtu(value)}</span>
                        </div>
                        <div className="w-full bg-stone-100 h-1.5 rounded-full">
                          <div className={`${color} h-1.5 rounded-full`} style={{ width }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-600 font-medium">
                        {meta.fundingDeadline
                          ? new Date(meta.fundingDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'No deadline set'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-600 font-medium">{onchain.quotationCount} Quotations filed</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-stone-600 font-medium">Smart contract secured</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'LEDGER' && (
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-black font-display text-stone-900 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-indigo-500" /> Public Spend Log
                  </h3>
                  <p className="text-sm text-stone-500 font-medium mt-1">Complete transparency into how funds are being requested and spent.</p>
                </div>
              </div>
              <div className="p-8">
                {campaignQuotations.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-500 font-medium">No spending requests have been made yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {campaignQuotations.map((q: any) => {
                      const getStatusColor = (state: QuotationState) => {
                        if (state === QuotationState.Completed || state === QuotationState.ProofSubmitted) return 'border-emerald-200 bg-emerald-50/30';
                        if (state === QuotationState.Claimed || state === QuotationState.ProofPending) return 'border-purple-200 bg-purple-50/30';
                        if (state === QuotationState.Sanctioned || state === QuotationState.Claimable) return 'border-blue-200 bg-blue-50/30';
                        return 'border-stone-200 bg-white';
                      };
                      const getStatusBadge = (state: QuotationState) => {
                        if (state === QuotationState.Completed || state === QuotationState.ProofSubmitted) return <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">Proof Verified</span>;
                        if (state === QuotationState.Claimed || state === QuotationState.ProofPending) return <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">Funds Claimed</span>;
                        if (state === QuotationState.Sanctioned || state === QuotationState.Claimable) return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">Sanctioned</span>;
                        return <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-bold">Pending Review</span>;
                      };
                      return (
                        <div key={q.id} className={`rounded-2xl border ${getStatusColor(q.state)} p-6`}>
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-lg font-bold font-display text-stone-900">{q.purpose}</h4>
                                {getStatusBadge(q.state)}
                              </div>
                              <p className="text-sm text-stone-500">Vendor: <span className="font-bold text-stone-700">{q.vendorName}</span></p>
                            </div>
                            <div className="text-left md:text-right">
                              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Amount Requested</p>
                              <p className="text-2xl font-black font-mono text-stone-900">{formatFtu(q.requestedAmountFtu)}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-stone-200/60">
                            <div>
                              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <ShieldCheck className={`w-3 h-3 ${q.aiRecommendation ? 'text-indigo-500' : 'text-stone-400'}`} /> AI Audit Note
                              </p>
                              {q.aiRecommendation ? (
                                <p className="text-sm text-stone-700 bg-white/60 p-3 rounded-xl border border-stone-200/50">{q.aiRecommendation.priceAssessment}</p>
                              ) : (
                                <p className="text-sm text-stone-400 italic">Pending AI review.</p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Cryptographic Proof</p>
                              {q.proofDocumentUrl ? (
                                <Link href={q.proofDocumentUrl} target="_blank" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100">
                                  <FileText className="w-4 h-4" /> View Verified Receipt
                                </Link>
                              ) : (
                                <div className="inline-flex items-center gap-2 text-sm font-bold text-stone-400 bg-stone-100/50 px-4 py-2 rounded-lg border border-stone-200/50 cursor-not-allowed">
                                  <Clock className="w-4 h-4" /> Receipt Pending
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          
          
          {renderAdminSections()}
        </div>
      </div>

      {/* Contribution Modal */}
      {showContributeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-display text-stone-900">Contribute to Campaign</h3>
                  <p className="text-xs text-stone-500">1 FTU = ₹1 · Fully allotted to campaign escrow</p>
                </div>
              </div>
              <button
                onClick={() => { setShowContributeModal(false); setCustomAmount(''); }}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Select Preset Amount
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomAmount(preset.toString())}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                        customAmount === preset.toString()
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-stone-50 hover:bg-indigo-50/50 border-stone-200 text-stone-700'
                      }`}
                    >
                      {formatFtu(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Custom Contribution Amount (FTU / ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-stone-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 5000"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-3.5 bg-stone-50 border-2 border-stone-200 focus:border-indigo-600 rounded-2xl text-stone-900 font-bold font-mono text-lg outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Security & Allocation Banner */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs space-y-2 text-indigo-950">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" /> 100% Escrow Protection
                </div>
                <p className="text-stone-600 leading-relaxed">
                  Your contributed funds are directly deposited into the smart contract and allotted to this campaign. The creator can only claim funds after submitting verified vendor quotations and receiving donor sanction.
                </p>
                {remainingNeeded > 0 && (
                  <p className="text-stone-500 font-medium">
                    Remaining needed to reach goal: <strong className="text-stone-800">{formatFtu(remainingNeeded)}</strong>
                  </p>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowContributeModal(false); setCustomAmount(''); }}
                  disabled={isContributing}
                  className="w-1/3 py-3.5 border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleContribute()}
                  disabled={isContributing || !customAmount || Number(customAmount) <= 0}
                  className="w-2/3 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black font-display text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isContributing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Allotting Funds...
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4" /> Confirm & Allot {customAmount ? formatFtu(Number(customAmount)) : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
