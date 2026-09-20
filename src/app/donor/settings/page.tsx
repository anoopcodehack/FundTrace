"use client";

import React, { useState, useEffect, useCallback } from 'react';
import RoleGuard from '@/components/RoleGuard';
import Link from 'next/link';
import { 
  ChevronRight,
  Settings,
  BrainCircuit,
  ShieldAlert,
  Save,
  ToggleLeft,
  ToggleRight,
  Bot,
  Box,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Sparkles,
  ArrowRight,
  Layers
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { getFundTraceContract, parseContractError } from '@/lib/contract';
import { formatFtu } from '@/types';
import { ethers } from 'ethers';
import { toast } from 'sonner';

interface BackedCampaignSetting {
  id: number;
  title: string;
  category: string;
  myDonationFtu: number;
  myVotingWeight: number;
  automationEnabled: boolean;
  totalDonatedFtu: number;
  goalFtu: number;
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

export default function DonorSettingsPage() {
  const { wallet, signer } = useWallet();
  const address = wallet.address;

  const [backedCampaigns, setBackedCampaigns] = useState<BackedCampaignSetting[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingOnChain, setIsTogglingOnChain] = useState(false);

  // Policy Settings for selected campaign
  const [maxAutoAmount, setMaxAutoAmount] = useState('10000');
  const [requireManualHighRisk, setRequireManualHighRisk] = useState(true);
  const [autoRejectFraud, setAutoRejectFraud] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const loadBackedCampaigns = useCallback(async () => {
    if (!wallet.isConnected || !address) {
      setIsLoading(false);
      return;
    }

    try {
      const contract = getFundTraceContract();
      let count = 0;
      try {
        count = Number(await contract.campaignCount());
      } catch (e) {
        console.warn('Could not read campaign count:', e);
      }

      let dbCampaigns: any[] = [];
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/campaigns`);
        if (res.ok) dbCampaigns = await res.json();
      } catch {}

      const backed: BackedCampaignSetting[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const c = await contract.getCampaign(i);
          if (!c.creator || c.creator === ethers.ZeroAddress) continue;

          let myDonationWei = 0n;
          let isAuto = false;
          try {
            myDonationWei = await contract.donations(i, address);
            isAuto = await contract.automationEnabled(i);
          } catch {}

          const goalFtu = parseFtu(c.goal);
          const raisedFtu = parseFtu(c.totalDonated);
          const myDonationFtu = parseFtu(myDonationWei);

          // "ONLY APPEAR WHEN DONOR APPROVES/DONATES TO THE CAMPAIGN"
          if (myDonationFtu > 0) {
            const dbMeta = dbCampaigns.find((db: any) => Number(db.on_chain_id) === i);
            const title = dbMeta?.title || `Campaign #${i}`;
            const category = dbMeta?.category || 'Community';
            const myVotingWeight = (raisedFtu > 0 && myDonationFtu > 0)
              ? Math.min(100, Math.round((myDonationFtu / raisedFtu) * 100))
              : 0;

            backed.push({
              id: i,
              title,
              category,
              myDonationFtu,
              myVotingWeight,
              automationEnabled: isAuto,
              totalDonatedFtu: raisedFtu,
              goalFtu,
            });
          }
        } catch (err) {
          console.warn(`Error reading campaign #${i}:`, err);
        }
      }

      setBackedCampaigns(backed);
      if (backed.length > 0 && selectedCampaignId === null) {
        setSelectedCampaignId(backed[0].id);
      }
    } catch (err) {
      console.error('Failed to load backed campaigns for settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [wallet.isConnected, address, selectedCampaignId]);

  useEffect(() => {
    loadBackedCampaigns();
  }, [loadBackedCampaigns]);

  const selectedCampaign = backedCampaigns.find(c => c.id === selectedCampaignId) || backedCampaigns[0];

  const handleToggleAutomation = async () => {
    if (!signer || !selectedCampaign) {
      toast.error('Connect wallet first');
      return;
    }

    setIsTogglingOnChain(true);
    const currentlyEnabled = selectedCampaign.automationEnabled;
    const toastId = toast.loading(
      currentlyEnabled
        ? `Disabling AI Auto-Sanction for Campaign #${selectedCampaign.id}...`
        : `Enabling AI Auto-Sanction (Approve & Reject) for Campaign #${selectedCampaign.id}...`
    );

    try {
      const contract = getFundTraceContract(signer);
      const tx = currentlyEnabled
        ? await contract.disableAutomation(selectedCampaign.id)
        : await contract.enableAutomation(selectedCampaign.id);
      await tx.wait();

      setBackedCampaigns(prev => prev.map(c => 
        c.id === selectedCampaign.id ? { ...c, automationEnabled: !currentlyEnabled } : c
      ));

      toast.success(
        currentlyEnabled
          ? `Auto-Sanction disabled for Campaign #${selectedCampaign.id}. Manual review active.`
          : `⚡ AI Auto-Sanction enabled for Campaign #${selectedCampaign.id}!`,
        { id: toastId }
      );
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsTogglingOnChain(false);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    toast.success(`Policy rules saved for Campaign #${selectedCampaign?.id}`);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <RoleGuard allowedRoles={["DONOR"]}>
      <div className="min-h-screen p-6 sm:p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/donor" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Donor Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Automation Settings</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Per-Campaign Approval Controls</h1>
              <p className="text-stone-600 font-medium mt-1">
                Manage AI-driven automated sanction and rejection policies exclusively for campaigns you have approved and funded.
              </p>
            </div>
          </header>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-stone-900" />
              <p className="text-sm font-mono text-stone-500 font-bold uppercase tracking-wider">Loading your backed campaigns...</p>
            </div>
          ) : backedCampaigns.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-16 text-center shadow-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black font-display text-stone-900 mb-2">
                No Backed Campaigns Yet
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">
                Auto-enable sanction approve and reject controls appear for a particular campaign <strong>only when you approve and donate to it</strong>. Once you fund a campaign, its dedicated governance automation controls will activate here.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/donor/approvals"
                  className="px-5 py-2.5 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-colors flex items-center gap-2"
                >
                  Review Open Campaigns to Approve <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/donor"
                  className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-50 transition-colors"
                >
                  Back to Portfolio
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
              
              {/* Left Column: Backed Campaigns Selector */}
              <div className="md:w-1/3 bg-stone-50 border-b md:border-b-0 md:border-r border-stone-200 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black font-display uppercase tracking-wide text-stone-900 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-500" /> Your Backed Campaigns
                  </h2>
                  <span className="text-xs font-mono font-bold text-stone-400 bg-stone-200 px-2 py-0.5 rounded-full">
                    {backedCampaigns.length}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mb-6">
                  Select a campaign to configure its specific AI Auto-Sanction approve/reject policies:
                </p>
                
                <div className="space-y-3">
                  {backedCampaigns.map((camp) => {
                    const isSelected = camp.id === selectedCampaign?.id;
                    return (
                      <div 
                        key={camp.id}
                        onClick={() => setSelectedCampaignId(camp.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-white border-stone-900 shadow-md ring-1 ring-stone-900' 
                            : 'bg-white/60 border-stone-200 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold uppercase text-stone-400">Campaign #{camp.id}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            camp.automationEnabled 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-stone-200 text-stone-600'
                          }`}>
                            {camp.automationEnabled ? '⚡ Auto-Sanction ON' : 'Manual Review'}
                          </span>
                        </div>
                        <h3 className="font-bold text-stone-900 text-sm line-clamp-1">{camp.title}</h3>
                        <p className="text-xs text-stone-500 mt-1 font-medium">
                          Contribution: <strong className="text-stone-700">{formatFtu(camp.myDonationFtu)}</strong> ({camp.myVotingWeight}% voting weight)
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Per-Campaign Auto-Sanction Configuration */}
              {selectedCampaign && (
                <div className="md:w-2/3 p-6 sm:p-8 lg:p-12">
                  <div className="max-w-2xl space-y-8">
                    
                    {/* Header with On-Chain Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-stone-400 uppercase">
                            Configuring Campaign #{selectedCampaign.id}
                          </span>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {selectedCampaign.category}
                          </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black font-display text-stone-900">
                          {selectedCampaign.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-stone-500 font-medium mt-1">
                          Configure automated approval and rejection policies for this particular campaign.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-stone-600 uppercase">
                          {selectedCampaign.automationEnabled ? 'Auto-Sanction' : 'Manual'}
                        </span>
                        <button 
                          onClick={handleToggleAutomation} 
                          disabled={isTogglingOnChain}
                          className="text-indigo-600 focus:outline-none disabled:opacity-50 cursor-pointer"
                          title="Toggle On-Chain Automation"
                        >
                          {isTogglingOnChain ? (
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                          ) : selectedCampaign.automationEnabled ? (
                            <ToggleRight className="w-12 h-12 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-12 h-12 text-stone-300" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Status Badge Banner */}
                    <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                      selectedCampaign.automationEnabled 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-stone-100 border-stone-200 text-stone-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {selectedCampaign.automationEnabled 
                            ? 'On-Chain Automation is ACTIVE for this campaign. Quotations meeting policy are processed automatically.' 
                            : 'On-Chain Automation is DISABLED. All invoices require manual sanctioning by you.'}
                        </span>
                      </div>
                    </div>

                    {/* Policy Settings */}
                    <div className={`space-y-6 transition-opacity duration-300 ${!selectedCampaign.automationEnabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                      
                      {/* Setting 1: Auto-Approve Limit */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
                        <div>
                          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Auto-Approve Ceiling Limit
                          </h3>
                          <p className="text-xs text-stone-500 font-medium mt-1 max-w-sm">
                            Any quotation requesting more than this limit will fall back to manual donor review.
                          </p>
                        </div>
                        <div className="relative w-full sm:w-44">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-sm">₹</span>
                          <input 
                            type="number" 
                            value={maxAutoAmount}
                            onChange={(e) => setMaxAutoAmount(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-stone-300 rounded-xl font-mono font-bold text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Setting 2: Auto-Reject High Risk */}
                      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
                        <div>
                          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" /> Auto-Reject High Risk & Fraud
                          </h3>
                          <p className="text-xs text-stone-500 font-medium mt-1 max-w-sm">
                            If the AI marks a quotation with HIGH risk (price mismatch, unverified vendor, or missing receipts), automatically reject it.
                          </p>
                        </div>
                        <button 
                          onClick={() => setAutoRejectFraud(!autoRejectFraud)} 
                          className="text-indigo-600 focus:outline-none flex-shrink-0 cursor-pointer"
                        >
                          {autoRejectFraud ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-stone-300" />}
                        </button>
                      </div>

                      {/* Setting 3: Require Manual Review for Uncertain Quotes */}
                      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
                        <div>
                          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-500" /> Escalate REVIEW Recommendations
                          </h3>
                          <p className="text-xs text-stone-500 font-medium mt-1 max-w-sm">
                            When AI is uncertain (confidence &lt; 85%), keep the invoice in manual review for donor review.
                          </p>
                        </div>
                        <button 
                          onClick={() => setRequireManualHighRisk(!requireManualHighRisk)} 
                          className="text-indigo-600 focus:outline-none flex-shrink-0 cursor-pointer"
                        >
                          {requireManualHighRisk ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-stone-300" />}
                        </button>
                      </div>
                    </div>

                    {/* Save Footer */}
                    <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="text-xs text-stone-500 font-medium">
                        Policy parameters apply exclusively to Campaign #{selectedCampaign.id}.
                      </p>
                      <button 
                        onClick={handleSave}
                        className={`px-6 py-2.5 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
                          isSaved ? 'bg-emerald-500 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'
                        }`}
                      >
                        {isSaved ? <><CheckCircle2 className="w-4 h-4" /> Saved Successfully</> : <><Save className="w-4 h-4" /> Save Policy Rules</>}
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </RoleGuard>
  );
}
