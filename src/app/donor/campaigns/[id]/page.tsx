"use client";

import { ethers } from 'ethers';
import { toast } from 'sonner';
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { getFundTraceContract, parseContractError } from '@/lib/contract';
import { getQuotationsByCampaign } from '@/services/quotationService';
import { DEMO_PRESET_ACCOUNTS } from '@/lib/wallet';

// ─────────────────────────────────────────────────────────
// Contribution Modal
// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id || 1);
  const { wallet, signer, selectDemoRole } = useWallet();
  const { isConnected, appRole, address } = wallet;

  const [activeTab, setActiveTab] = useState<'STORY' | 'LEDGER'>('STORY');
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [onchain, setOnchain] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [campaignQuotations, setCampaignQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myContribution, setMyContribution] = useState(0);
  const [myVotingWeight, setMyVotingWeight] = useState(0);

  // Custom Contribution Modal State
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isContributing, setIsContributing] = useState(false);

  // Auto-Sanction State (Per-Campaign)
  const [isAutomationEnabled, setIsAutomationEnabled] = useState(false);
  const [isTogglingAutomation, setIsTogglingAutomation] = useState(false);
  const [autoEnableOnBacking, setAutoEnableOnBacking] = useState(false);

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
      let onchainData: any = null;

      try {
        const count = Number(await contract.campaignCount());
        if (effectiveOnChainId > 0 && effectiveOnChainId <= count) {
          const c = await contract.getCampaign(effectiveOnChainId);
          const hasValidCreator = c.creator && c.creator !== ethers.ZeroAddress;
          if (hasValidCreator) {
            onchainData = {
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
              existsOnChain: true,
            };
          }
        }
      } catch (err) {
        console.warn('Could not read contract campaign:', err);
      }

      if (!onchainData) {
        // Campaign not anchored on chain or unverified draft
        onchainData = {
          id: effectiveOnChainId,
          creator: dbMeta?.creator_address || ethers.ZeroAddress,
          verifier: dbMeta?.verifier_address || ethers.ZeroAddress,
          goalWei: "0",
          deadline: 0,
          totalDonatedWei: "0",
          totalReleasedWei: "0",
          metadataHash: dbMeta?.canonical_hash || "0x",
          state: CampaignState.PendingVerification,
          requestCount: 0,
          activeRequestId: 0,
          beneficiary: ethers.ZeroAddress,
          totalSanctionedWei: "0",
          totalAllocatedWei: "0",
          totalClaimedWei: "0",
          quotationCount: 0,
          existsOnChain: false,
        };
      }

      setOnchain(onchainData);

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
        fundingDeadline: dbMeta?.funding_deadline || (onchainData?.deadline ? new Date(Number(onchainData.deadline) * 1000).toISOString() : null),
        plannedBudget: Array.isArray(dbMeta?.planned_budget)
          ? dbMeta.planned_budget
          : Array.isArray(dbMeta?.plannedBudget) ? dbMeta.plannedBudget : [],
      });

      if (address && onchainData.existsOnChain) {
        try {
          const donated = await contract.donations(effectiveOnChainId, address);
          const isEth = BigInt(onchainData.goalWei) > 1_000_000_000_000n;
          let donatedNum = 0;
          if (isEth) {
            donatedNum = parseFloat(Number(ethers.formatEther(donated)).toFixed(4));
          } else {
            donatedNum = Number(donated.toString());
          }
          setMyContribution(donatedNum);

          let totalRaisedNum = 0;
          if (isEth) {
            totalRaisedNum = parseFloat(Number(ethers.formatEther(onchainData.totalDonatedWei)).toFixed(4));
          } else {
            totalRaisedNum = Number(onchainData.totalDonatedWei.toString());
          }

          if (totalRaisedNum > 0 && donatedNum > 0) {
            setMyVotingWeight(Math.min(100, Math.round((donatedNum / totalRaisedNum) * 100)));
          }

          // Read on-chain automation status for this particular campaign
          try {
            const isAuto = await contract.automationEnabled(effectiveOnChainId);
            setIsAutomationEnabled(isAuto);
          } catch {}
        } catch {}
      }

      try { const quotes = await getQuotationsByCampaign(effectiveOnChainId); setCampaignQuotations(quotes); } catch {}
    } catch (err) {
      console.error('Failed to load campaign:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, address]);

  async function handleAccept() {
    if (!signer) {
      toast.error('Please connect your wallet or select a Donor Demo role first!');
      return;
    }
    if (!onchain || !onchain.existsOnChain) {
      toast.error('This campaign has not been anchored to the blockchain yet.');
      return;
    }
    if (onchain.state !== CampaignState.Verified) {
      if (onchain.state === CampaignState.PendingVerification) {
        toast.error('This campaign is awaiting verifier approval before contributions can open.');
      } else if (onchain.state === CampaignState.FundingClosed) {
        toast.info('Campaign is already fully funded!');
      } else {
        toast.error('Campaign is not in an active funding state.');
      }
      return;
    }

    const goalBig = BigInt(onchain.goalWei || 0);
    const donatedBig = BigInt(onchain.totalDonatedWei || 0);
    const remainingWei = goalBig > donatedBig ? goalBig - donatedBig : 0n;

    if (remainingWei <= 0n) {
      toast.info('Campaign is already fully funded!');
      return;
    }

    setIsAccepting(true);
    setAcceptError(null);
    try {
      const contract = getFundTraceContract(signer);
      const tx = await contract.donate(onchain.id, { value: remainingWei });
      await tx.wait();

      if (autoEnableOnBacking) {
        try {
          const autoTx = await contract.enableAutomation(onchain.id);
          await autoTx.wait();
          setIsAutomationEnabled(true);
          toast.success('⚡ AI Auto-Sanction enabled for this campaign!');
        } catch (autoErr: any) {
          console.warn('Auto-enable automation failed:', autoErr);
        }
      }

      toast.success('Campaign Accepted & Fully Funded with requested target!');
      await loadCampaign();
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      setAcceptError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsAccepting(false);
    }
  }

  async function handleCustomContribute(amountToFund?: number) {
    if (!signer) {
      toast.error('Please connect your wallet or select a Donor Demo role first!');
      return;
    }
    if (!onchain || !onchain.existsOnChain) {
      toast.error('This campaign has not been anchored to the blockchain yet.');
      return;
    }
    if (onchain.state !== CampaignState.Verified) {
      if (onchain.state === CampaignState.PendingVerification) {
        toast.error('This campaign is awaiting verifier approval before contributions can open.');
      } else if (onchain.state === CampaignState.FundingClosed) {
        toast.info('Campaign has already reached its funding goal!');
      } else {
        toast.error('Campaign is not in an active funding state.');
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

      if (autoEnableOnBacking) {
        try {
          const autoTx = await contract.enableAutomation(onchain.id);
          await autoTx.wait();
          setIsAutomationEnabled(true);
          toast.success('⚡ AI Auto-Sanction enabled for this campaign!');
        } catch (autoErr: any) {
          console.warn('Auto-enable automation failed:', autoErr);
        }
      }

      toast.success(`Contributed ${formatFtu(amt)} successfully!`);
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

  async function handleToggleAutomation() {
    if (!signer || !address) {
      toast.error('Please connect your wallet or select a Donor Demo role first!');
      return;
    }
    if (!onchain || !onchain.existsOnChain) return;

    setIsTogglingAutomation(true);
    const toastId = toast.loading(
      isAutomationEnabled
        ? 'Disabling AI Auto-Sanction for this campaign...'
        : 'Enabling AI Auto-Sanction (Approve & Reject) on blockchain...'
    );

    try {
      const contract = getFundTraceContract(signer);
      const tx = isAutomationEnabled
        ? await contract.disableAutomation(onchain.id)
        : await contract.enableAutomation(onchain.id);
      await tx.wait();

      setIsAutomationEnabled(!isAutomationEnabled);
      toast.success(
        isAutomationEnabled
          ? 'Auto-Sanction disabled for this campaign. Manual donor review active.'
          : '⚡ AI Auto-Sanction enabled for this campaign! Invoices meeting AI policy will be automatically processed.',
        { id: toastId }
      );
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsTogglingAutomation(false);
    }
  }

  function handleReject() {
    toast.error('Campaign proposal rejected by donor.');
    router.push('/donor');
  }

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  function handleContributionSuccess(amount: number) {
    setMyContribution(prev => prev + amount);
    loadCampaign();
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
        <Link href="/donor" className="text-indigo-600 font-bold hover:underline">Return to Donor Portal</Link>
      </div>
    );
  }

  // ── Derived values ──
  const isEthScale = onchain ? BigInt(onchain.goalWei || 0) > 1_000_000_000_000n : false;
  const parseVal = (v: any) => {
    if (!v) return 0;
    try {
      const b = BigInt(v.toString());
      if (b > 1_000_000_000_000n) {
        return parseFloat(Number(ethers.formatEther(b)).toFixed(4));
      }
      return Number(b);
    } catch {
      return Number(v);
    }
  };

  const raised = parseVal(onchain.totalDonatedWei);
  const goal = parseVal(onchain.goalWei);
  const remaining = Math.max(0, parseFloat((goal - raised).toFixed(4)));
  const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const isFunding = onchain && onchain.existsOnChain && onchain.state === CampaignState.Verified;
  const allocated = parseVal(onchain.totalAllocatedWei);
  const claimed = parseVal(onchain.totalClaimedWei);
  const proofBacked = campaignQuotations
    .filter((q: any) => q.state === QuotationState.Completed || q.state === QuotationState.ProofSubmitted)
    .reduce((acc: number, q: any) => acc + (q.claimedAmountFtu || 0), 0);

  const enteredNum = Number(customAmount) || 0;
  const estimatedWeight = Math.min(
    100,
    Math.round(((myContribution + enteredNum) / (raised + enteredNum || 1)) * 100)
  );

  const quickPercentages = [
    { label: '25%', calc: (rem: number) => (rem * 0.25).toFixed(isEthScale ? 2 : 0) },
    { label: '50%', calc: (rem: number) => (rem * 0.50).toFixed(isEthScale ? 2 : 0) },
    { label: '75%', calc: (rem: number) => (rem * 0.75).toFixed(isEthScale ? 2 : 0) },
    { label: '100% Target', calc: (rem: number) => rem.toFixed(isEthScale ? 2 : 0) },
  ];

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
    // 1. Not deployed on-chain
    if (!onchain || !onchain.existsOnChain) {
      return (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black font-display text-amber-950 text-base">Campaign Not Anchored On-Chain</h3>
            <p className="text-xs text-amber-800 mt-1">
              This campaign (ID #{id}) is saved as an off-chain draft proposal and has not been confirmed on the smart contract yet. Contributions will open once it is deployed on-chain.
            </p>
          </div>
          <Link
            href="/donor"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
          >
            Browse Verified Campaigns <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      );
    }

    // 2. Pending Verification (State 0)
    if (onchain.state === CampaignState.PendingVerification) {
      return (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black font-display text-blue-950 text-base">Awaiting Verifier Audit</h3>
            <p className="text-xs text-blue-800 mt-1">
              This campaign has been anchored on-chain and is currently being audited by the institutional verifier. Contributions will open immediately once the verifier approves the campaign.
            </p>
          </div>
          <span className="inline-block px-3 py-1 bg-blue-200 text-blue-900 rounded-full text-xs font-mono font-bold">
            Status: Pending Verification
          </span>
        </div>
      );
    }

    // 3. Actively Funding (State 1 - Verified)
    if (isFunding) return (
      <div className="space-y-4">
        {acceptError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">
            {acceptError}
          </div>
        )}

        {/* Embedded In-Page Contribution Card */}
        <div id="contribute-card" className="bg-white rounded-3xl border-2 border-indigo-100 shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-black font-display text-stone-900 text-base flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-indigo-600" /> Contribute to Campaign
              </h3>
              <p className="text-xs text-stone-500">Back this initiative as per requested amount</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700">
              Goal: {formatFtu(goal)}
            </span>
          </div>

          {/* If already contributed, show current contribution badge */}
          {myContribution > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900">
                  Your Contribution: {formatFtu(myContribution)}
                </span>
              </div>
              <span className="text-xs font-black font-mono text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-100 shadow-xs">
                {myVotingWeight}% Contribution Share
              </span>
            </div>
          )}

          {/* If wallet not connected or not donor */}
          {(!signer || appRole !== 'DONOR') && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-900">Demo Contributor Mode</p>
                <p className="text-[11px] text-amber-700">Connect Alice to test on-chain contribution</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const alicePreset = DEMO_PRESET_ACCOUNTS.find(p => p.appRole === 'DONOR');
                  if (alicePreset) selectDemoRole(alicePreset);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              >
                Use Alice (Donor)
              </button>
            </div>
          )}

          {/* Funding Breakdown */}
          <div className="grid grid-cols-2 gap-3 bg-stone-50 rounded-2xl p-3 text-xs">
            <div>
              <span className="text-stone-400 block uppercase font-bold text-[10px]">Already Raised</span>
              <span className="font-black font-mono text-stone-900 text-sm">{formatFtu(raised)}</span>
            </div>
            <div>
              <span className="text-stone-400 block uppercase font-bold text-[10px]">Remaining Requested</span>
              <span className="font-black font-mono text-indigo-600 text-sm">{formatFtu(remaining)}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-stone-700 uppercase tracking-wider">
                Contribution Amount (as per requested)
              </label>
              <span className="text-[11px] font-mono text-stone-400">
                {isEthScale ? 'Unit: ETH / FTU' : 'Unit: ₹ FTU'}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-base">₹</span>
              <input
                id="contribute-input"
                type="number"
                min="0.001"
                step={isEthScale ? "0.1" : "100"}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={`Enter amount (e.g. ${remaining > 0 ? remaining : '500'})`}
                className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl font-bold font-mono text-stone-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {quickPercentages.map((pct) => (
                <button
                  key={pct.label}
                  type="button"
                  onClick={() => setCustomAmount(pct.calc(remaining))}
                  className="py-1.5 px-2 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-xs font-bold text-stone-700 transition-colors cursor-pointer text-center"
                >
                  {pct.label}
                </button>
              ))}
            </div>

            {/* Requested Quotation Presets if any exist */}
            {campaignQuotations.length > 0 && (
              <div className="pt-2 border-t border-stone-100">
                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1.5">
                  Or match requested quotation:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {campaignQuotations.slice(0, 3).map((q: any, idx: number) => (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => {
                        const val = parseVal(q.requestedAmountFtu);
                        setCustomAmount(String(val));
                        toast.info(`Pre-filled requested quote #${q.id || idx + 1}: ${formatFtu(q.requestedAmountFtu)}`);
                      }}
                      className="px-2.5 py-1 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 rounded-md text-[11px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3 text-indigo-500" />
                      Q#{q.id || idx + 1}: {formatFtu(q.requestedAmountFtu)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Real-time Contribution Share Preview */}
          <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-2xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-indigo-950 block">Estimated Contribution Share</span>
              <span className="text-[11px] text-stone-500">Backing share upon contribution</span>
            </div>
            <span className="font-black font-mono text-indigo-700 text-base">
              {estimatedWeight}%
            </span>
          </div>

          {/* Auto-Enable AI Sanction checkbox (only appears during approval/donation) */}
          <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-start gap-2 text-xs shadow-sm">
            <input
              type="checkbox"
              id="auto-enable-backing"
              checked={autoEnableOnBacking}
              onChange={(e) => setAutoEnableOnBacking(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="auto-enable-backing" className="cursor-pointer select-none text-stone-700">
              <span className="font-bold text-stone-900 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                Auto-enable AI Sanction (Approve & Reject)
              </span>
              <span className="text-[11px] text-stone-500 block mt-0.5">
                Automatically approve verified vendor invoices and reject flagged ones for this particular campaign.
              </span>
            </label>
          </div>

          {/* Primary Contribution CTA */}
          <button
            onClick={() => handleCustomContribute()}
            disabled={isContributing || !customAmount || Number(customAmount) <= 0}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black font-display text-base rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isContributing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Confirming on Blockchain...
              </>
            ) : (
              <>
                <Heart className="w-5 h-5" /> Contribute {customAmount ? formatFtu(Number(customAmount)) : ''} Now
              </>
            )}
          </button>

          {/* Full Target Acceptance & Reject Row */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Fund the entire remaining requested goal at once"
            >
              {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Fund Full ({formatFtu(remaining)})</>}
            </button>

            <button
              onClick={handleReject}
              className="py-2.5 px-3 border border-stone-200 text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
            >
              Reject Proposal
            </button>
          </div>
        </div>
      </div>
    );

    // 4. Funding Closed (State 3)
    if (onchain.state === CampaignState.FundingClosed) {
      return (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-stone-900">
                  {myContribution > 0 ? `CONTRIBUTED ${formatFtu(myContribution)}` : 'Campaign Accepted & Fully Funded'}
                </p>
                <p className="text-xs font-bold text-emerald-700">
                  {myContribution > 0 ? `Your Contribution Share: ${myVotingWeight}%` : 'Funding Goal Reached'}
                </p>
              </div>
            </div>
            {myContribution > 0 && (
              <p className="text-xs text-stone-600 mt-2 font-medium">
                You are an active governance contributor for this campaign. You can sanction milestone quotations and release funds.
              </p>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-center">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Funding Target Met</p>
            <p className="text-sm font-bold text-stone-800">
              This campaign has met 100% of its requested funding on-chain!
            </p>
            <p className="text-xs text-stone-500">
              The creator can now submit quotations for milestone disbursements, and donors sanction fund releases.
            </p>
          </div>

          <Link href="/donor/approvals"
            className="w-full py-3.5 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
            Review & Sanction Quotations ({campaignQuotations.length}) <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      );
    }

    // 5. Other States (e.g. Rejected or Failed)
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 text-center space-y-2">
        <X className="w-8 h-8 text-red-600 mx-auto" />
        <p className="font-bold text-red-900">Campaign Not Available for Funding</p>
        <p className="text-xs text-red-700">This campaign is not in an active funding state ({CampaignState[onchain.state] || 'Closed'}).</p>
      </div>
    );
  }

  // ── Donor-specific extra sections ──
  function renderDonorSections() {
    if (!isDonor && !hasContributed) return null;
    return (
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
          <h3 className="text-lg font-black font-display text-stone-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Fund Tracking
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Your Contribution', value: myContribution },
              { label: 'Campaign Raised', value: raised },
              { label: 'Allocated to Requests', value: allocated },
              { label: 'Claimed & Spent', value: claimed },
              { label: 'Proof Verified', value: proofBacked },
            ].map((item, idx) => {
              const colors = ['bg-indigo-500', 'bg-stone-900', 'bg-amber-500', 'bg-purple-500', 'bg-emerald-500'];
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-stone-500">{item.label}</span>
                    <span className="text-stone-900">{formatFtu(item.value)}</span>
                  </div>
                  <div className="w-full bg-stone-100 h-1.5 rounded-full">
                    <div className={`${colors[idx]} h-1.5 rounded-full`}
                      style={{ width: raised > 0 ? `${Math.min(100, (item.value / raised) * 100)}%` : '0%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
          <h3 className="text-lg font-black font-display text-stone-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" /> Your Governance Power
          </h3>
          <div className="text-center py-4">
            <div className="relative w-28 h-28 mx-auto mb-4">
              <svg viewBox="0 0 36 36" className="w-28 h-28 rotate-[-90deg]">
                <circle cx="18" cy="18" r="15.91" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.91" fill="none" stroke="#6366f1" strokeWidth="3"
                  strokeDasharray={`${myVotingWeight} ${100 - myVotingWeight}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black font-mono text-stone-900">{myVotingWeight}%</span>
              </div>
            </div>
            <p className="font-bold text-stone-700">Contribution Share</p>
            <p className="text-sm text-stone-400 mt-1">Your contribution of {formatFtu(myContribution)} gives you proportional governance over spending.</p>
          </div>
          <Link href="/donor/approvals"
            className="mt-4 w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
            Review & Sanction Quotations <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Campaign-Specific AI Auto-Sanction & Governance Card (Only appears when donor has contributed) */}
        <div className={`lg:col-span-2 rounded-3xl border p-6 transition-all ${
          isAutomationEnabled
            ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/50 border-emerald-300 shadow-sm'
            : 'bg-white border-stone-200 shadow-sm'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold uppercase text-stone-400">Campaign ID #{onchain.id}</span>
                <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isAutomationEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                }`}>
                  {isAutomationEnabled ? <><Zap className="w-3 h-3 text-emerald-600" /> AI Auto-Sanction Active</> : 'Manual Sanction Mode'}
                </span>
              </div>
              <h3 className="text-xl font-black font-display text-stone-900">
                AI Auto-Sanction & Governance Controls
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Scoped exclusively to this campaign. Controls appear because you are an active contributor with {myVotingWeight}% contribution share.
              </p>
            </div>

            <button
              onClick={handleToggleAutomation}
              disabled={isTogglingAutomation}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-sm ${
                isAutomationEnabled
                  ? 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
                  : 'bg-stone-900 text-white hover:bg-stone-800'
              } disabled:opacity-50`}
            >
              {isTogglingAutomation ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Updating On-Chain...</>
              ) : isAutomationEnabled ? (
                'Disable Auto-Sanction'
              ) : (
                <><Zap className="w-4 h-4 text-amber-300" /> Enable Auto-Sanction</>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-1">
            <div className="bg-white/80 p-4 rounded-2xl border border-stone-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-stone-800">Auto-Approve Policy</h4>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  {isAutomationEnabled 
                    ? 'Active: Valid milestone quotations meeting AI budget thresholds (confidence ≥ 85%) will be automatically sanctioned.'
                    : 'Inactive: All quotations require manual donor approval.'}
                </p>
              </div>
            </div>

            <div className="bg-white/80 p-4 rounded-2xl border border-stone-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-stone-800">Auto-Reject Policy</h4>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  {isAutomationEnabled 
                    ? 'Active: Flagged high-risk quotations, pricing mismatches, or anomalous claims will be automatically rejected or escalated.'
                    : 'Inactive: Rejections require manual donor review.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {campaignQuotations.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
            <h3 className="text-lg font-black font-display text-stone-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" /> Pending Quotations & Requests
            </h3>
            <div className="space-y-3">
              {campaignQuotations.slice(0, 5).map((q: any) => (
                <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-stone-800">{q.purpose}</p>
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {q.state === QuotationState.DonorApproved ? 'Approved' : 'Pending Review'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">Vendor: <span className="font-bold">{q.vendorName}</span></p>
                  </div>
                  <div className="flex sm:flex-col sm:items-end justify-between items-center gap-1">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Requested</span>
                      <p className="font-black font-mono text-stone-900 text-lg">{formatFtu(q.requestedAmountFtu)}</p>
                    </div>
                    {isFunding && (
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseVal(q.requestedAmountFtu);
                          setCustomAmount(String(val));
                          const el = document.getElementById('contribute-card');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                          else window.scrollTo({ top: 300, behavior: 'smooth' });
                          const input = document.getElementById('contribute-input');
                          if (input) input.focus();
                          toast.info(`Set contribution amount to requested quotation: ${formatFtu(q.requestedAmountFtu)}`);
                        }}
                        className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Heart className="w-3.5 h-3.5 text-indigo-500" /> Contribute This Requested Amount
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Link href="/donor/approvals"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline">
              View all quotations <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ── Creator extra sections ──
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
          <Link href="/donor" className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Donor Portal
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
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100 gap-2">
                          <div>
                            <span className="font-bold text-stone-800">{item.category}</span>
                            <span className="text-xs text-stone-500 block">Planned allocation</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black font-mono text-stone-900">{formatFtu(item.amountFtu || item.amount || 0)}</span>
                            {isFunding && (
                              <button
                                type="button"
                                onClick={() => {
                                  const val = parseVal(item.amountFtu || item.amount || 0);
                                  setCustomAmount(String(val));
                                  const el = document.getElementById('contribute-card');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                  else window.scrollTo({ top: 300, behavior: 'smooth' });
                                  const input = document.getElementById('contribute-input');
                                  if (input) input.focus();
                                  toast.info(`Set contribution amount to requested budget item (${item.category}): ${formatFtu(val)}`);
                                }}
                                className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                              >
                                <Heart className="w-3.5 h-3.5 text-indigo-500" /> Fund This Item
                              </button>
                            )}
                          </div>
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

          {renderDonorSections()}
        </div>
      </div>

      {/* Contribution Modal */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
              <div>
                <h3 className="text-xl font-black font-display text-stone-900">Contribute to Campaign</h3>
                <p className="text-xs text-stone-500 font-medium">Secure smart-contract contribution</p>
              </div>
              <button
                onClick={() => setShowContributeModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Campaign Summary */}
            <div className="bg-stone-50 rounded-2xl p-4 mb-5 border border-stone-100 space-y-2 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-stone-500">Campaign Goal:</span>
                <span className="text-stone-900 font-mono">{formatFtu(goal)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-stone-500">Current Raised:</span>
                <span className="text-stone-900 font-mono">{formatFtu(raised)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-stone-500">Remaining Target:</span>
                <span className="text-indigo-600 font-mono">{formatFtu(Math.max(0, goal - raised))}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-stone-200/60">
                <span className="text-stone-500">Your Current Contribution:</span>
                <span className="text-stone-900 font-mono">{formatFtu(myContribution)}</span>
              </div>
            </div>

            {/* Enter Amount */}
            <div className="space-y-3 mb-5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Contribution Amount (₹ / FTU)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-lg">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 500)"
                  className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl font-bold font-mono text-stone-900 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Quick Select Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[100, 500, 1000].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setCustomAmount(String((Number(customAmount) || 0) + quick))}
                    className="py-1.5 px-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold text-stone-700 transition-colors"
                  >
                    +₹{quick}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomAmount(String(Math.max(0, goal - raised)))}
                  className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-bold text-indigo-700 transition-colors"
                >
                  Full Target
                </button>
              </div>
            </div>

            {/* Estimated Contribution Share Preview */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-5">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-indigo-900">Estimated Contribution Share:</span>
                <span className="font-black font-mono text-indigo-700 text-sm">
                  {Math.min(
                    100,
                    Math.round(
                      ((myContribution + (Number(customAmount) || 0)) /
                        (raised + (Number(customAmount) || 0) || 1)) *
                        100
                    )
                  )}%
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Your proportional share over milestone quotation sanctions once confirmed.
              </p>
            </div>

            {/* Wallet Status */}
            <div className="flex items-center justify-between text-xs text-stone-500 mb-5 px-1">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isConnected ? `Wallet: ${wallet.displayAddress}` : 'No wallet connected'}
              </span>
              {wallet.balanceEth && <span className="font-mono">{wallet.balanceEth} FTC</span>}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => handleCustomContribute()}
                disabled={isContributing || !customAmount || Number(customAmount) <= 0}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black font-display text-base rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
              >
                {isContributing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Confirming on Blockchain...
                  </>
                ) : (
                  <>Confirm Contribution</>
                )}
              </button>
              <button
                onClick={() => setShowContributeModal(false)}
                disabled={isContributing}
                className="w-full py-2.5 border border-stone-200 text-stone-600 font-bold text-xs rounded-xl hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
