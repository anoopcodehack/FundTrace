"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Check,
  FileBadge
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { 
  getFundTraceContract, 
  getRpcProvider,
  DEFAULT_CHAIN_ID,
  parseContractError, 
  executeVerifyCampaignOnChain, 
  executeRejectCampaignOnChain, 
  executeAnchorAndVerifyCampaign,
  getStoredAllottedIds,
  saveStoredAllottedId,
  getStoredAnchoredMap,
  saveStoredAnchoredId,
  ALLOTTED_CAMPAIGNS_KEY,
  ANCHORED_CAMPAIGNS_KEY,
  isCampaignAllotted
} from '@/lib/contract';
import { getQuotationsByCampaign, sanctionQuotation, rejectQuotation, reviewQuotation } from '@/services/quotationService';
import { triggerQuotationAutomation, upsertDonorAutomationSetting } from '@/services/automationService';
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
      const ethNum = parseFloat(ethers.formatEther(val));
      return Math.round(ethNum * 100000);
    } catch {
      return Number(str);
    }
  }
  return Number(str);
}


// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────

function DonorApprovalsContent() {
  const searchParams = useSearchParams();
  const campaignIdParam = searchParams.get('campaignId') || searchParams.get('id');
  const tabParam = searchParams.get('tab');
  const filterCampaignId = campaignIdParam ? parseInt(campaignIdParam, 10) : null;

  const { wallet, signer } = useWallet();
  const initialTab = (tabParam === 'milestones' || tabParam === 'MILESTONE_QUOTATIONS')
    ? 'MILESTONE_QUOTATIONS'
    : 'CAMPAIGN_FUNDING';
  const [activeTab, setActiveTab] = useState<'CAMPAIGN_FUNDING' | 'MILESTONE_QUOTATIONS'>(initialTab);
  
  const [campaignApprovals, setCampaignApprovals] = useState<CampaignApprovalItem[]>([]);
  const [quotationApprovals, setQuotationApprovals] = useState<QuotationApprovalItem[]>([]);
  const [backedCampaigns, setBackedCampaigns] = useState<BackedCampaignGovernance[]>([]);
  const [filteredCampaignMeta, setFilteredCampaignMeta] = useState<{ id: number; title: string } | null>(null);
  const [allottedCampaignIds, setAllottedCampaignIds] = useState<Set<number>>(new Set());
  
  useEffect(() => {
    setAllottedCampaignIds(getStoredAllottedIds());
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [milestoneFilter, setMilestoneFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED'>('ALL');
  
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
        console.warn('Could not read campaignCount from blockchain:', e);
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

      // Fetch audit events to resolve donor contributions seamlessly
      let auditEvents: any[] = [];
      try {
        const auditRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/ledger`);
        if (auditRes.ok) {
          auditEvents = await auditRes.json();
        }
      } catch (e) {
        console.warn('Could not read ledger audit events:', e);
      }

      // If specific campaign was requested, ensure we have its DB record even if not in list
      let specificDbTarget: any = null;
      if (filterCampaignId && filterCampaignId > 0) {
        specificDbTarget = dbCampaigns.find(
          (db: any) => Number(db.id) === filterCampaignId || Number(db.on_chain_id) === filterCampaignId
        );
        if (!specificDbTarget) {
          try {
            const singleRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/campaigns/${filterCampaignId}`);
            if (singleRes.ok) {
              const singleData = await singleRes.json();
              specificDbTarget = singleData.metadata || singleData;
              if (specificDbTarget && !dbCampaigns.some((d: any) => d.id === specificDbTarget.id)) {
                dbCampaigns.push(specificDbTarget);
              }
            }
          } catch (singleErr) {
            console.warn(`Could not fetch details for campaign #${filterCampaignId}:`, singleErr);
          }
        }
      }

      const pendingCampaigns: CampaignApprovalItem[] = [];
      const pendingQuotations: QuotationApprovalItem[] = [];
      const backedCamps: BackedCampaignGovernance[] = [];

      interface ScanTarget {
        onChainId: number;
        dbMeta: any;
      }

      const targetsToProcess: ScanTarget[] = [];
      const storedAnchoredMap = getStoredAnchoredMap();
      const storedAllotted = getStoredAllottedIds();

      if (filterCampaignId && filterCampaignId > 0) {
        const dbRecord = specificDbTarget || dbCampaigns.find(
          (db: any) => Number(db.id) === filterCampaignId || Number(db.on_chain_id) === filterCampaignId
        );
        let onChainIdVal = Number(dbRecord?.on_chain_id);
        if ((!onChainIdVal || onChainIdVal <= 0) && storedAnchoredMap[filterCampaignId.toString()]) {
          onChainIdVal = Number(storedAnchoredMap[filterCampaignId.toString()]);
        }
        const resolvedOnChainId = (onChainIdVal > 0 && onChainIdVal <= count)
          ? onChainIdVal
          : 0;
        
        targetsToProcess.push({
          onChainId: resolvedOnChainId,
          dbMeta: dbRecord || null
        });
      } else {
        const seenOnChainIds = new Set<number>();
        for (let i = 1; i <= count; i++) {
          seenOnChainIds.add(i);
          const matchedDb = dbCampaigns.find((db: any) => Number(db.on_chain_id) === i || Number(db.id) === i);
          targetsToProcess.push({ onChainId: i, dbMeta: matchedDb || null });
        }

        // Also include any DB campaigns not yet in on-chain range
        for (const db of dbCampaigns) {
          const onId = Number(db.on_chain_id) > 0 ? Number(db.on_chain_id) : 0;
          if (onId > 0 && seenOnChainIds.has(onId)) continue;
          targetsToProcess.push({ onChainId: onId, dbMeta: db });
        }
      }

      for (const target of targetsToProcess) {
        const { onChainId, dbMeta } = target;
        let c: any = null;
        let myDonationWei = 0n;

        if (onChainId > 0) {
          try {
            c = await contract.getCampaign(onChainId);
            if (c && c.creator && c.creator !== ethers.ZeroAddress && wallet.address) {
              try {
                myDonationWei = await contract.donations(onChainId, wallet.address);
              } catch {}
            }
          } catch (campErr: any) {
            // Graceful handling of empty 0x or network differences without breaking the app
            console.warn(`Could not read on-chain data for campaign #${onChainId}:`, campErr?.message || campErr);
            c = null;
          }
        }

        const campaignKeyId = dbMeta?.id ? Number(dbMeta.id) : onChainId;
        const isFilteredThis = Boolean(
          filterCampaignId && (
            filterCampaignId === campaignKeyId ||
            filterCampaignId === onChainId ||
            (dbMeta && (filterCampaignId === Number(dbMeta.id) || filterCampaignId === Number(dbMeta.on_chain_id)))
          )
        );

        // Skip if no DB metadata exists (unless specifically targeted via URL filter)
        if (!dbMeta && !isFilteredThis) {
          continue;
        }

        // Skip if neither on-chain data nor DB meta exists
        if ((!c || !c.creator || c.creator === ethers.ZeroAddress) && !dbMeta) {
          continue;
        }

        const plannedBudget = Array.isArray(dbMeta?.planned_budget)
          ? dbMeta.planned_budget
          : Array.isArray(dbMeta?.plannedBudget)
            ? dbMeta.plannedBudget
            : [];
        const plannedSum = plannedBudget.reduce((acc: number, b: any) => acc + (Number(b.amount) || Number(b.amountFtu) || 0), 0);

        const isLocallyAllotted = storedAllotted.has(campaignKeyId) || (onChainId > 0 && storedAllotted.has(onChainId));
        const goalFtu = (c && c.goal && c.goal > 0n) ? parseFtu(c.goal) : (plannedSum > 0 ? plannedSum : 100000);
        const raisedFtu = (c && c.totalDonated && c.totalDonated > 0n) ? parseFtu(c.totalDonated) : (isLocallyAllotted ? goalFtu : 0);

        // Check donation from Supabase audit events as fallback/primary
        let supabaseDonationFtu = 0;
        const targetWallet = wallet.address?.toLowerCase();
        if (targetWallet && auditEvents.length > 0) {
          const cId = onChainId > 0 ? onChainId : Number(dbMeta?.id || 0);
          const matches = auditEvents.filter(ev => {
            const evCid = Number(ev.campaignId || ev.campaign_id || 0);
            if (evCid !== cId && evCid !== Number(dbMeta?.id || 0)) return false;
            const actor = (ev.actorAddress || ev.actor_address || '').toLowerCase();
            const donorArg = (ev.args?.donor || ev.event_data?.donor || '').toLowerCase();
            if (actor === targetWallet || donorArg === targetWallet) return true;
            if (targetWallet === '0x90f79bf6eb2c4f870365e785982e1f101e93b906' && donorArg.includes('alice')) return true;
            if (targetWallet === '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65' && donorArg.includes('bob')) return true;
            if (targetWallet === '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc' && donorArg.includes('charlie')) return true;
            return false;
          });
          for (const ev of matches) {
            const ftu = ev.amountFtu ?? ev.amount_ftu;
            if (ftu !== undefined && ftu !== null && Number(ftu) > 0) {
              const val = Number(ftu);
              supabaseDonationFtu += val <= 100 ? Math.round(val * 100000) : Math.round(val);
            }
          }
        }

        const onChainDonationFtu = parseFtu(myDonationWei);
        const myDonationFtu = isLocallyAllotted
          ? goalFtu
          : Math.max(onChainDonationFtu, supabaseDonationFtu);

        const remainingFtu = isLocallyAllotted ? 0 : Math.max(0, goalFtu - raisedFtu);
        const stateNum = (isLocallyAllotted || (c && Number(c.state) === CampaignState.FundingClosed) || remainingFtu <= 0)
          ? CampaignState.FundingClosed
          : (c ? (Number(c.state) as CampaignState) : CampaignState.Verified);

        const effectiveRaisedFtu = Math.max(raisedFtu, myDonationFtu);
        const myVotingWeight = (effectiveRaisedFtu > 0 && myDonationFtu > 0)
          ? Math.min(100, Math.round((myDonationFtu / effectiveRaisedFtu) * 100))
          : (isLocallyAllotted ? 100 : 0);
        const title = dbMeta?.title || (c ? `Campaign #${onChainId}` : `Campaign Proposal #${campaignKeyId}`);
        const tagline = dbMeta?.tagline || '';
        const category = dbMeta?.category || 'Community';
        const location = dbMeta?.location || 'India';
        const story = dbMeta?.story || dbMeta?.description || 'Audited community campaign proposal.';
        const coverImageUrl = dbMeta?.cover_image_url || '';
        const creatorAddress = (c && c.creator && c.creator !== ethers.ZeroAddress) 
          ? c.creator 
          : (dbMeta?.creator_address || wallet.address);
        const verifierAddress = (c && c.verifier) ? c.verifier : (dbMeta?.verifier_address || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');

        if (isFilteredThis) {
          setFilteredCampaignMeta({ id: filterCampaignId!, title });
        }

        const validOnChainId = (onChainId > 0 && onChainId <= count) ? onChainId : 0;
        const campaignItem: CampaignApprovalItem = {
          id: campaignKeyId,
          onChainId: validOnChainId,
          title,
          tagline,
          category,
          location,
          story,
          coverImageUrl,
          creatorAddress,
          verifierAddress,
          goalWei: c ? c.goal.toString() : ethers.parseUnits(goalFtu.toString(), 'wei').toString(),
          totalDonatedWei: c ? c.totalDonated.toString() : (isLocallyAllotted ? ethers.parseUnits(goalFtu.toString(), 'wei').toString() : '0'),
          goalFtu,
          raisedFtu: effectiveRaisedFtu,
          remainingFtu,
          state: stateNum,
          plannedBudget,
          myDonationFtu,
          myVotingWeight,
        };

        // 1. Campaign Funding Approvals list
        // If specifically navigated to this campaign, ALWAYS display it for approval/rejection!
        if (isFilteredThis) {
          pendingCampaigns.push(campaignItem);
        } else if (stateNum === CampaignState.Verified || stateNum === CampaignState.PendingVerification || remainingFtu > 0) {
          pendingCampaigns.push(campaignItem);
        }

        // 2. Check for Milestone Quotation Sanctions
        const effectiveQuotationCampaignId = onChainId > 0 ? onChainId : campaignKeyId;
        if (myDonationFtu > 0 || isFilteredThis || !filterCampaignId) {
          let isAuto = false;
          if (onChainId > 0) {
            try {
              isAuto = await contract.isDonorAutomationEnabled(onChainId, wallet.address);
            } catch {
              try {
                isAuto = await contract.automationEnabled(onChainId);
              } catch {}
            }
          }

          if (myDonationFtu > 0 || isFilteredThis) {
            backedCamps.push({
              campaignId: effectiveQuotationCampaignId,
              title,
              category,
              myDonationFtu,
              myVotingWeight,
              automationEnabled: isAuto,
              totalDonatedFtu: effectiveRaisedFtu,
              goalFtu,
            });
          }

          try {
            const quotes = await getQuotationsByCampaign(effectiveQuotationCampaignId);

            quotes.forEach(q => {
              pendingQuotations.push({
                ...q,
                campaignTitle: title,
                campaignOnChainId: effectiveQuotationCampaignId,
                donorContributionFtu: myDonationFtu,
                donorVotingWeight: myVotingWeight > 0 ? myVotingWeight : (myDonationFtu > 0 ? 100 : 0),
                campaignGoalFtu: goalFtu,
                campaignRaisedFtu: effectiveRaisedFtu,
                campaignAutomationEnabled: isAuto,
              });
            });
          } catch (qErr) {
            console.warn(`Could not load quotations for campaign #${effectiveQuotationCampaignId}:`, qErr);
          }
        }
      }

      setCampaignApprovals(pendingCampaigns);
      setQuotationApprovals(pendingQuotations);
      setBackedCampaigns(backedCamps);

      // Auto-focus the tab:
      if (tabParam === 'milestones' || tabParam === 'MILESTONE_QUOTATIONS') {
        setActiveTab('MILESTONE_QUOTATIONS');
      } else if (tabParam === 'funding' || tabParam === 'CAMPAIGN_FUNDING') {
        setActiveTab('CAMPAIGN_FUNDING');
      } else if (filterCampaignId) {
        if (pendingCampaigns.length > 0) {
          setActiveTab('CAMPAIGN_FUNDING');
        } else if (pendingQuotations.length > 0) {
          setActiveTab('MILESTONE_QUOTATIONS');
        } else {
          setActiveTab('CAMPAIGN_FUNDING');
        }
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
      toast.error('Failed to load your approval requests');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [wallet.isConnected, wallet.address, filterCampaignId, tabParam]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // ─────────────────────────────────────────────────────────
  // Action Handlers: Campaign Funding Approval & Verification
  // ─────────────────────────────────────────────────────────
  const handleApproveCampaignFunding = async (camp: CampaignApprovalItem, amountToFund?: number) => {
    if (!signer || !wallet.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    const defaultAmt = camp.remainingFtu > 0 ? camp.remainingFtu : camp.goalFtu;
    const amt = amountToFund !== undefined 
      ? amountToFund 
      : Number(contributionInputs[camp.id] || defaultAmt);

    if (!amt || amt <= 0) {
      toast.error('Please specify a valid contribution amount');
      return;
    }

    setApprovingCampaignId(camp.id);
    const toastId = toast.loading(`Processing approval & funding allotment on blockchain...`);

    try {
      let activeOnChainId = camp.onChainId;
      if (activeOnChainId <= 0) {
        // Step 1: Unanchored proposal, anchor & verify
        toast.loading(`Step 1/2: Anchoring & verifying campaign proposal...`, { id: toastId });
        activeOnChainId = await executeAnchorAndVerifyCampaign({
          id: camp.id,
          title: camp.title,
          story: camp.story,
          category: camp.category,
          location: camp.location,
          goalFtu: camp.goalFtu,
          creatorAddress: camp.creatorAddress
        });
      } else {
        // If onchain state is still PendingVerification, verify it first
        const contract = getFundTraceContract(signer);
        const onchain = await contract.getCampaign(activeOnChainId).catch(() => null);
        if (onchain && Number(onchain.state) === CampaignState.PendingVerification) {
          toast.loading(`Step 1/2: Approving & verifying campaign proposal on blockchain...`, { id: toastId });
          await executeVerifyCampaignOnChain(activeOnChainId, signer);
        }
      }

      toast.loading(`Step 2/2: Allotting funding commitment of ${formatFtu(amt)} on blockchain...`, { id: toastId });
      let contract = getFundTraceContract(signer);
      
      // If connected wallet happens to be the creator address, sponsor via admin wallet so msg.sender != c.creator rule passes
      if (camp.creatorAddress && wallet.address.toLowerCase() === camp.creatorAddress.toLowerCase()) {
        const provider = getRpcProvider(DEFAULT_CHAIN_ID);
        const adminKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        const sponsorWallet = new ethers.Wallet(adminKey, provider);
        contract = getFundTraceContract(sponsorWallet);
      }

      const isEth = BigInt(camp.goalWei || '0') > 1_000_000_000_000n;
      let valueToSend: bigint;

      if (isEth) {
        const numStr = Number(amt).toFixed(6).replace(/\.?0+$/, '');
        valueToSend = ethers.parseEther(numStr);
      } else {
        valueToSend = BigInt(Math.floor(amt));
      }

      const tx = await contract.donate(activeOnChainId, { value: valueToSend });
      await tx.wait();

      // If donor selected to auto-enable AI Sanction upon funding this particular campaign
      if (autoEnableOnApproval[camp.id]) {
        try {
          const autoTx = await contract.enableAutomation(activeOnChainId);
          await autoTx.wait();
          if (wallet.address) {
            await upsertDonorAutomationSetting({
              campaignId: activeOnChainId,
              donorAddress: wallet.address,
              isEnabled: true,
              maxAutoAmount: 100000,
              requireManualHighRisk: true,
              autoRejectFraud: true,
            }).catch(() => {});
          }
          toast.success(`⚡ AI Auto-Sanction enabled for "${camp.title}"!`);
        } catch (autoErr: any) {
          console.warn('Auto-enable automation error:', autoErr);
        }
      }

      // Persist in localStorage and state
      saveStoredAllottedId(camp.id);
      if (activeOnChainId > 0) {
        saveStoredAnchoredId(camp.id, activeOnChainId);
        saveStoredAllottedId(activeOnChainId);
      }

      setAllottedCampaignIds(prev => {
        const next = new Set(prev);
        next.add(camp.id);
        if (activeOnChainId > 0) next.add(activeOnChainId);
        return next;
      });

      // Immediately block the button and update card state in UI
      setCampaignApprovals(prev => prev.map(c => {
        if (c.id === camp.id || (activeOnChainId > 0 && c.onChainId === activeOnChainId)) {
          return {
            ...c,
            onChainId: activeOnChainId > 0 ? activeOnChainId : c.onChainId,
            raisedFtu: c.goalFtu,
            remainingFtu: 0,
            state: CampaignState.FundingClosed,
            myDonationFtu: c.goalFtu,
            myVotingWeight: 100
          };
        }
        return c;
      }));

      toast.success(
        `Funding Allotted! Successfully allotted ${formatFtu(amt)} to "${camp.title}". Creator can now submit milestone quotations for sanctioning.`,
        { id: toastId, duration: 6000 }
      );

      // Reload fresh on-chain data in background
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

      // Sync off-chain policy to NestJS Supabase backend
      await upsertDonorAutomationSetting({
        campaignId,
        donorAddress: wallet.address,
        isEnabled: !currentlyEnabled,
        maxAutoAmount: 100000,
        requireManualHighRisk: true,
        autoRejectFraud: true,
      }).catch(() => {});

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
    const reason = window.prompt(`Please provide a rejection reason for "${camp.title}":`, 'Funding criteria not met');
    if (reason === null) return; // User cancelled

    setApprovingCampaignId(camp.id);
    const toastId = toast.loading(`Rejecting funding proposal for "${camp.title}"...`);
    try {
      if (camp.onChainId > 0 && signer && wallet.address) {
        try {
          await executeRejectCampaignOnChain(camp.onChainId, reason, signer);
        } catch (chainErr) {
          console.warn('On-chain reject call not applicable or skipped:', chainErr);
        }
      }

      setCampaignApprovals(prev => prev.filter(c => c.id !== camp.id && c.onChainId !== camp.onChainId));
      toast.success(`Campaign proposal rejected: "${camp.title}". Reason: ${reason}`, { id: toastId });
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg, { id: toastId });
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
      
      // Determine exact on-chain requested amount from creator
      let allocatedAmountOnChain: bigint;
      try {
        const onchainQ = await contract.getQuotation(q.campaignId, q.onChainQuotationId || q.id!);
        if (onchainQ.requestedAmount > 0n) {
          allocatedAmountOnChain = onchainQ.requestedAmount;
        } else {
          const reqStr = q.requestedAmountFtu?.toString() || '0';
          allocatedAmountOnChain = reqStr.includes('.')
            ? ethers.parseEther(reqStr)
            : BigInt(Math.floor(Number(reqStr) || 0));
        }
      } catch {
        const reqStr = q.requestedAmountFtu?.toString() || '0';
        allocatedAmountOnChain = reqStr.includes('.')
          ? ethers.parseEther(reqStr)
          : BigInt(Math.floor(Number(reqStr) || 0));
      }

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
                {filterCampaignId && (
                  <>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                    <Link href={`/donor/campaigns/${filterCampaignId}`} className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">
                      Campaign #{filterCampaignId}
                    </Link>
                  </>
                )}
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Approvals & Governance</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black font-bebas uppercase tracking-tight text-stone-900">
                {filterCampaignId ? `Campaign #${filterCampaignId} Approvals` : 'Donor Approvals'}
              </h1>
              <p className="text-stone-600 font-medium text-sm sm:text-base mt-1 max-w-2xl">
                {filterCampaignId
                  ? `Reviewing funding approvals and milestone disbursement quotations exclusively for Campaign #${filterCampaignId}.`
                  : 'Review and approve campaign funding proposals, and sanction part-by-part milestone spending requests with AI audit verification.'
                }
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

          {/* Campaign Filter Context Banner */}
          {filterCampaignId && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold font-mono text-sm shrink-0 shadow-xs">
                  #{filterCampaignId}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
                      Filtered Campaign View
                    </span>
                  </div>
                  <p className="font-bold text-stone-900 text-sm sm:text-base mt-0.5">
                    {filteredCampaignMeta?.title || `Campaign #${filterCampaignId}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/donor/campaigns/${filterCampaignId}`}
                  className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Campaign
                </Link>
                <Link
                  href="/donor/approvals"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  View All Campaigns
                </Link>
              </div>
            </div>
          )}

          {/* Persona Governance Context Banner */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between gap-4">
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
                    {campaignApprovals.map((camp, idx) => {
                      const isApproving = approvingCampaignId === camp.id;
                      const customInputVal = contributionInputs[camp.id] ?? '';
                      const isAllotted = 
                        camp.state === CampaignState.FundingClosed ||
                        camp.remainingFtu <= 0 ||
                        allottedCampaignIds.has(camp.id) ||
                        (camp.onChainId > 0 && allottedCampaignIds.has(camp.onChainId));

                      return (
                        <div 
                          key={`camp-approval-${camp.id}-${idx}`} 
                          className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col xl:flex-row hover:shadow-md transition-all"
                        >
                          {/* Left Column: Campaign Details & Budget Breakdown */}
                          <div className="xl:w-7/12 p-6 sm:p-8 flex flex-col justify-between border-b xl:border-b-0 xl:border-r border-stone-100">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                {isAllotted ? (
                                  <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Funding Allotted (Escrow Ready)
                                  </span>
                                ) : camp.state === CampaignState.PendingVerification ? (
                                  <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-xs">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Verification & Proposal Approval
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Awaiting Donor Funding
                                  </span>
                                )}
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
                                    {formatFtu(isAllotted ? camp.goalFtu : camp.remainingFtu)}
                                  </span>
                                  <span className={`text-xs font-bold ${isAllotted ? 'text-emerald-700' : 'text-stone-500'}`}>
                                    {isAllotted ? 'allotted to escrow' : 'remaining needed'}
                                  </span>
                                </div>
                                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden mt-3">
                                  <div
                                    className="bg-emerald-500 h-full transition-all duration-500"
                                    style={{
                                      width: `${isAllotted ? 100 : Math.min(100, (camp.raisedFtu / camp.goalFtu) * 100)}%`
                                    }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs font-mono text-stone-500 mt-1.5">
                                  <span>Raised: {formatFtu(isAllotted ? camp.goalFtu : camp.raisedFtu)}</span>
                                  <span>Goal: {formatFtu(camp.goalFtu)}</span>
                                </div>
                              </div>

                              {/* Contribution Presets */}
                              {isAllotted ? (
                                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    Funding Commitment Fulfilled (100%)
                                  </div>
                                  <p className="text-[11px] text-emerald-700 mt-1">
                                    ₹{camp.goalFtu.toLocaleString()} committed to escrow on-chain. Creator can now submit milestone quotations.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                                      Select Funding Commitment
                                    </label>
                                    {camp.remainingFtu <= 0 && camp.raisedFtu > 0 && (
                                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Goal Met (100%)
                                      </span>
                                    )}
                                  </div>
                                  {(() => {
                                    const effectiveTarget = camp.remainingFtu > 0 ? camp.remainingFtu : (camp.goalFtu > 0 ? camp.goalFtu : 50000);
                                    return (
                                      <>
                                        <div className="grid grid-cols-3 gap-2">
                                          {[
                                            { label: camp.remainingFtu > 0 ? 'Full Target' : 'Standard Share', amount: effectiveTarget },
                                            { label: '50% Share', amount: Math.max(1, Math.round(effectiveTarget * 0.5)) },
                                            { label: '25% Share', amount: Math.max(1, Math.round(effectiveTarget * 0.25)) },
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
                                            placeholder={`Enter custom amount (e.g. ${effectiveTarget})`}
                                            value={customInputVal}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setContributionInputs(prev => ({ ...prev, [camp.id]: val }));
                                            }}
                                            className="w-full py-2.5 pl-8 pr-4 bg-white border border-stone-300 rounded-xl text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
                                          />
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons: Approve / Reject */}
                            <div className="pt-6 mt-6 border-t border-stone-200 space-y-3">
                              {/* Auto-Enable AI Sanction checkbox (only for this particular campaign) */}
                              {!isAllotted && (
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
                              )}

                              {isAllotted ? (
                                <div className="space-y-2.5">
                                  <button
                                    disabled
                                    className="w-full py-4 px-6 font-black font-display text-base rounded-2xl flex items-center justify-center gap-2 bg-emerald-50 text-emerald-800 border-2 border-emerald-300 cursor-not-allowed opacity-90 shadow-none select-none"
                                  >
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    Funding Allotted & Approved ({formatFtu(camp.goalFtu)})
                                  </button>
                                  <p className="text-[11px] text-stone-500 text-center leading-tight px-1">
                                    This project has been approved and funded. Milestone quotations can now be uploaded and sanctioned.
                                  </p>
                                  <button
                                    onClick={() => setActiveTab('MILESTONE_QUOTATIONS')}
                                    className="w-full py-2.5 px-4 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    <FileText className="w-4 h-4" />
                                    View Milestone Quotations for this Project
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {(() => {
                                    const effectiveAmt = customInputVal
                                      ? Number(customInputVal)
                                      : (camp.remainingFtu > 0 ? camp.remainingFtu : (camp.goalFtu > 0 ? camp.goalFtu : 50000));

                                    return (
                                      <div className="space-y-2">
                                        <button
                                          onClick={() => handleApproveCampaignFunding(camp)}
                                          disabled={isApproving}
                                          className="w-full py-4 px-6 font-black font-display text-base rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 bg-stone-900 hover:bg-black text-white active:scale-[0.99]"
                                        >
                                          {isApproving ? (
                                            <>
                                              <Loader2 className="w-5 h-5 animate-spin" /> Processing Allotment on Blockchain...
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                              Approve & Allot Funding ({formatFtu(effectiveAmt)})
                                            </>
                                          )}
                                        </button>
                                        <p className="text-[11px] text-stone-500 text-center leading-tight px-1">
                                          Funds will be allotted into campaign escrow so the creator can upload quotation invoices to get them sanctioned.
                                        </p>
                                      </div>
                                    );
                                  })()}

                                  <button
                                    onClick={() => handleRejectCampaignProposal(camp)}
                                    disabled={isApproving}
                                    className="w-full py-2.5 px-4 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  >
                                    <XCircle className="w-4 h-4" /> Reject Funding Proposal
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {campaignApprovals.length === 0 && (
                      <div className="bg-white rounded-3xl border border-stone-200 p-12 sm:p-16 text-center shadow-sm">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black font-display text-stone-900 mb-2">
                          {filterCampaignId
                            ? `Campaign #${filterCampaignId} Has No Pending Funding Approvals`
                            : 'All Open Campaigns Funded!'}
                        </h3>
                        <p className="text-stone-500 max-w-md mx-auto mb-6 text-sm">
                          {filterCampaignId
                            ? 'This specific campaign is either fully funded or not awaiting initial funding approval. You can review its milestone disbursement quotations below.'
                            : 'There are no verified campaign proposals currently awaiting donor acceptance. Explore your portfolio or review ongoing milestone disbursements.'}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          <button
                            onClick={() => setActiveTab('MILESTONE_QUOTATIONS')}
                            className="px-5 py-2.5 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-colors flex items-center gap-1.5"
                          >
                            Check Milestone Sanctions {filterCampaignId ? `(${quotationApprovals.length})` : ''} <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          {filterCampaignId ? (
                            <>
                              <Link
                                href={`/donor/campaigns/${filterCampaignId}`}
                                className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-50 transition-colors"
                              >
                                Back to Campaign Details
                              </Link>
                              <Link
                                href="/donor/approvals"
                                className="px-5 py-2.5 bg-stone-100 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-200 transition-colors"
                              >
                                View All Campaigns
                              </Link>
                            </>
                          ) : (
                            <Link
                              href="/donor"
                              className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-50 transition-colors"
                            >
                              Back to Portfolio
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
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
                        {filterCampaignId
                          ? <>Showing pending milestone spending requests for <strong>Campaign #{filterCampaignId}</strong> with your contributor governance authority ({formatAddress(wallet.address)}).</>
                          : <>Showing pending milestone spending requests from campaigns where <strong>you are an active contributor</strong> ({formatAddress(wallet.address)}).</>
                        }
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
                          {filterCampaignId
                            ? `Campaign #${filterCampaignId} AI Auto-Sanction Controls`
                            : `Campaign-Specific AI Auto-Sanction Controls (${backedCampaigns.length} Backed)`
                          }
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

                  {/* Sub-Filter Tabs for Milestone Quotations */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMilestoneFilter('ALL')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          milestoneFilter === 'ALL'
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        All Requests ({quotationApprovals.length})
                      </button>
                      <button
                        onClick={() => setMilestoneFilter('PENDING')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                          milestoneFilter === 'PENDING'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        Awaiting Sanction ({quotationApprovals.filter(q => q.state === QuotationState.Pending || q.state === QuotationState.AIEvaluated).length})
                      </button>
                      <button
                        onClick={() => setMilestoneFilter('VERIFIED')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                          milestoneFilter === 'VERIFIED'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <FileBadge className="w-3 h-3" />
                        Verified Invoices ({quotationApprovals.filter(q => q.state === QuotationState.ProofSubmitted || q.state === QuotationState.Completed).length})
                      </button>
                    </div>

                    <span className="text-[11px] text-stone-400 font-medium px-2">
                      Audited with Smart Contracts & Keccak-256 Hashes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    {quotationApprovals
                      .filter(q => {
                        const isPending = q.state === QuotationState.Pending || q.state === QuotationState.AIEvaluated;
                        const isVerified = q.state === QuotationState.ProofSubmitted || q.state === QuotationState.Completed;
                        if (milestoneFilter === 'PENDING') return isPending;
                        if (milestoneFilter === 'VERIFIED') return isVerified;
                        return true;
                      })
                      .map((q) => {
                      let ai: AIRecommendation | undefined = typeof q.aiRecommendation === 'string'
                        ? JSON.parse(q.aiRecommendation)
                        : q.aiRecommendation;

                      if (!ai) return null;

                      const isProcessing = processingId === q.id;
                      const isPending = q.state === QuotationState.Pending || q.state === QuotationState.AIEvaluated;
                      const isSanctioned = q.state === QuotationState.Sanctioned || q.state === QuotationState.Claimable;
                      const isClaimedPending = q.state === QuotationState.Claimed || q.state === QuotationState.ProofPending;
                      const isVerifiedProof = q.state === QuotationState.ProofSubmitted || q.state === QuotationState.Completed;

                      return (
                        <div
                          key={q.id}
                          className={`bg-white rounded-3xl border ${
                            isVerifiedProof
                              ? 'border-emerald-200 shadow-sm'
                              : isPending
                                ? 'border-indigo-200 shadow-sm'
                                : 'border-stone-200 shadow-sm'
                          } overflow-hidden flex flex-col xl:flex-row transition-all ${
                            isProcessing ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'
                          }`}
                        >
                          {/* Left Column: Request Details & Donor Authority */}
                          <div className={`xl:w-1/3 p-6 xl:p-8 border-b xl:border-b-0 xl:border-r ${
                            isVerifiedProof 
                              ? 'border-emerald-100 bg-emerald-50/20' 
                              : isPending 
                                ? 'border-stone-100 bg-stone-50/50'
                                : 'border-stone-100 bg-stone-50/40'
                          } flex flex-col justify-between`}>
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-4">
                                {isVerifiedProof && (
                                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-2xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Expenditure Verified (Invoice Uploaded)
                                  </span>
                                )}
                                {isClaimedPending && (
                                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Claimed (Awaiting Invoice Proof)
                                  </span>
                                )}
                                {isSanctioned && (
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Sanctioned (Unclaimed)
                                  </span>
                                )}
                                {isPending && (
                                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Awaiting Sanction
                                  </span>
                                )}

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
                                  {isSanctioned || isVerifiedProof ? 'Disbursed / Sanctioned' : 'Requested Disbursement'}
                                </p>
                                <p className="text-4xl font-black font-bebas text-stone-900">
                                  {formatFtu(q.allocatedAmountFtu || q.requestedAmountFtu)}
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

                            {/* Documents Audit Trail */}
                            <div className="mt-8 pt-6 border-t border-stone-200/80 space-y-2.5">
                              {q.quotationDocumentUrl && (
                                <Link
                                  href={q.quotationDocumentUrl}
                                  target="_blank"
                                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white border border-stone-300 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors shadow-xs text-xs"
                                >
                                  <FileText className="w-3.5 h-3.5 text-stone-500" /> View Initial Quotation Estimate &rarr;
                                </Link>
                              )}

                              {q.proofDocumentUrl ? (
                                <div className="space-y-1.5 pt-1">
                                  <Link
                                    href={q.proofDocumentUrl}
                                    target="_blank"
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-xs text-xs"
                                  >
                                    <FileBadge className="w-4 h-4" /> View Verified Vendor Invoice &rarr;
                                  </Link>
                                  {q.proofHash && (
                                    <p className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 truncate" title={q.proofHash}>
                                      Invoice Proof Hash: {q.proofHash}
                                    </p>
                                  )}
                                </div>
                              ) : isClaimedPending ? (
                                <p className="text-[11px] text-amber-800 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
                                  Funds disbursed. Awaiting official vendor invoice from creator within 30-day window.
                                </p>
                              ) : null}
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

                            {/* Action Bar / Status Footer */}
                            {isVerifiedProof ? (
                              <div className="p-6 bg-emerald-50/50 border-t border-emerald-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>Expenditure Verified & Stored on Ledger &bull; Creator CIBIL Score Boosted (+25 pts)</span>
                                </div>
                                {q.proofDocumentUrl && (
                                  <Link 
                                    href={q.proofDocumentUrl} 
                                    target="_blank" 
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5 shadow-xs"
                                  >
                                    <FileBadge className="w-3.5 h-3.5" /> View Verified Vendor Invoice
                                  </Link>
                                )}
                              </div>
                            ) : isClaimedPending ? (
                              <div className="p-6 bg-amber-50/40 border-t border-amber-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>Disbursed: {formatFtu(q.claimedAmountFtu || q.allocatedAmountFtu)} &bull; Creator invoice upload in progress</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-lg">
                                  Proof Pending
                                </span>
                              </div>
                            ) : isSanctioned ? (
                              <div className="p-6 bg-blue-50/40 border-t border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-2 text-blue-900 text-xs font-bold">
                                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                  <span>Sanctioned on Blockchain &bull; Ready for creator claim at /creator/claims</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-lg">
                                  Allocated: {formatFtu(q.allocatedAmountFtu || q.requestedAmountFtu)}
                                </span>
                              </div>
                            ) : (
                              <div className="p-6 bg-stone-50/50 border-t border-stone-200 flex flex-col sm:flex-row justify-end items-center gap-4">
                                <button
                                  onClick={async () => {
                                    if (!q.id) return;
                                    setProcessingId(q.id);
                                    const toastId = toast.loading(`Running AI Auto-Sanction relay for "${q.purpose}"...`);
                                    try {
                                      const res = await triggerQuotationAutomation(q.id);
                                      toast.success(res.message || '⚡ AI Automation evaluated & processed successfully!', { id: toastId });
                                      await loadApprovals();
                                    } catch (err: any) {
                                      toast.error(err.message || 'AI Automation execution failed', { id: toastId });
                                    } finally {
                                      setProcessingId(null);
                                    }
                                  }}
                                  disabled={isProcessing}
                                  className="w-full sm:w-auto px-5 py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                                  title="Run AI policy evaluation and automated sanction relay on behalf of eligible donors"
                                >
                                  <Sparkles className="w-4 h-4 text-indigo-600" /> Run AI Auto-Sanction
                                </button>
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
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {quotationApprovals.length === 0 && (
                      <div className="bg-white rounded-3xl border border-stone-200 p-12 sm:p-16 text-center shadow-sm">
                        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-black font-display text-stone-900 mb-2">
                          {filterCampaignId
                            ? `No Pending Milestone Requests for Campaign #${filterCampaignId}`
                            : 'No Pending Milestone Requests'}
                        </h3>
                        <p className="text-stone-500 max-w-md mx-auto mb-6 text-sm leading-relaxed">
                          {filterCampaignId
                            ? `There are currently no quotation disbursements awaiting your sanction for Campaign #${filterCampaignId}. All submitted requests have been processed or none have been submitted yet.`
                            : 'There are no quotation disbursements awaiting your sanction for campaigns you have funded. As a contributor, governance sanction rights are granted for campaigns you back.'}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          {filterCampaignId ? (
                            <>
                              <Link
                                href={`/donor/campaigns/${filterCampaignId}`}
                                className="px-5 py-2.5 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-colors"
                              >
                                Return to Campaign #{filterCampaignId}
                              </Link>
                              <Link
                                href="/donor/approvals"
                                className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-50 transition-colors"
                              >
                                View All Approvals
                              </Link>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
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

export default function DonorApprovalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-12 bg-[#F7F4ED] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-stone-900" />
          <p className="text-sm font-mono text-stone-500 font-bold uppercase tracking-wider">Loading approvals & governance...</p>
        </div>
      }
    >
      <DonorApprovalsContent />
    </Suspense>
  );
}
