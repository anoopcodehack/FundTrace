"use client";

import React, { useState, useEffect, useCallback } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { formatFtu, QuotationState, QuotationMetadata } from '@/types';
import Link from 'next/link';
import { 
  ChevronRight,
  Wallet,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { getFundTraceContract, parseContractError } from '@/lib/contract';
import { recordClaim } from '@/services/quotationService';
import { formatAddress } from '@/lib/wallet';
import { ethers } from 'ethers';
import { toast } from 'sonner';

interface ClaimItem extends QuotationMetadata {
  campaignTitle: string;
}

export default function CreatorClaimsPage() {
  const { wallet, signer } = useWallet();
  const address = wallet.address;

  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimingId, setIsClaimingId] = useState<number | null>(null);

  const loadClaims = useCallback(async () => {
    if (!wallet.isConnected || !address) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const contract = getFundTraceContract();
      let count = 0;
      try {
        count = Number(await contract.campaignCount());
      } catch {}

      let dbCampaigns: any[] = [];
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/campaigns`);
        if (res.ok) {
          dbCampaigns = await res.json();
        }
      } catch {}

      const allClaimable: ClaimItem[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const c = await contract.getCampaign(i);
          // Only inspect campaigns created by the connected creator
          if (c.creator.toLowerCase() !== address.toLowerCase()) continue;

          const dbMeta = dbCampaigns.find((db: any) => Number(db.on_chain_id) === i);
          const title = dbMeta?.title || `Campaign #${i}`;

          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/quotations/campaign/${i}`);
          if (!res.ok) continue;
          const quotes: QuotationMetadata[] = await res.json();

          quotes
            .filter(q => [
              QuotationState.Sanctioned,
              QuotationState.Claimable,
              QuotationState.Claimed,
              QuotationState.ProofPending,
              QuotationState.ProofSubmitted,
              QuotationState.Completed
            ].includes(q.state))
            .forEach(q => {
              allClaimable.push({
                ...q,
                campaignTitle: title,
              });
            });
        } catch (e) {
          console.warn(`Error loading claims for campaign ${i}:`, e);
        }
      }

      setClaims(allClaimable);
    } catch (err) {
      console.error('Failed to load creator claims:', err);
      toast.error('Failed to load claimable allocations');
    } finally {
      setIsLoading(false);
    }
  }, [wallet.isConnected, address]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  async function handleExecuteClaim(q: ClaimItem) {
    if (!signer || !address) {
      toast.error('Connect your wallet first');
      return;
    }

    setIsClaimingId(q.id!);
    const toastId = toast.loading(`Claiming allocation of ${formatFtu(q.allocatedAmountFtu || q.requestedAmountFtu)} to wallet...`);

    try {
      const contract = getFundTraceContract(signer);
      const c = await contract.getCampaign(q.campaignId);
      const isEth = BigInt(c.goal) > 1_000_000_000_000n;

      const amtToClaim = q.allocatedAmountFtu || q.requestedAmountFtu;
      let claimWei: bigint;

      if (isEth) {
        try {
          const onchainQ = await contract.getQuotation(q.campaignId, q.onChainQuotationId || q.id!);
          const remainingAlloc = BigInt(onchainQ.allocatedAmount) - BigInt(onchainQ.claimedAmount);
          claimWei = remainingAlloc > 0n ? remainingAlloc : ethers.parseEther(amtToClaim.toString());
        } catch {
          claimWei = ethers.parseEther(amtToClaim.toString());
        }
      } else {
        claimWei = BigInt(Math.floor(amtToClaim));
      }

      const tx = await contract.claimAllocation(
        q.campaignId,
        q.onChainQuotationId || q.id!,
        claimWei
      );
      const receipt = await tx.wait();

      // Sync backend
      try {
        await recordClaim(q.id!, amtToClaim, receipt?.hash || tx.hash);
      } catch (syncErr) {
        console.warn('Backend claim sync note:', syncErr);
      }

      toast.success(
        `Successfully claimed ${formatFtu(amtToClaim)}! Funds transferred directly to your wallet.`,
        { id: toastId }
      );

      await loadClaims();
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      toast.error(errorMsg || 'Claim execution failed', { id: toastId });
    } finally {
      setIsClaimingId(null);
    }
  }

  return (
    <RoleGuard allowedRoles={["CREATOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/creator" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Creator Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Claims</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Execute Claims</h1>
              <p className="text-stone-600 font-medium mt-2">Withdraw sanctioned quotation funds directly to your connected creator wallet.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadClaims}
                disabled={isLoading}
                className="px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <div className="bg-white px-4 py-2 border border-stone-200 rounded-xl flex items-center gap-3 shadow-sm">
                <Wallet className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Creator Wallet</p>
                  <p className="text-xs font-mono text-stone-900 font-bold">{formatAddress(address)}</p>
                </div>
              </div>
            </div>
          </header>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-stone-900" />
              <p className="text-xs font-mono font-bold text-stone-500 uppercase tracking-wider">Loading creator claims...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {claims.map(q => {
                const isClaimable = q.state === QuotationState.Sanctioned || q.state === QuotationState.Claimable;
                const isClaimed = !isClaimable;
                const isProcessing = isClaimingId === q.id;

                return (
                  <div key={q.id} className={`bg-white rounded-3xl border ${isClaimable ? 'border-indigo-200 shadow-md ring-1 ring-indigo-100' : 'border-stone-200 shadow-sm'} overflow-hidden flex flex-col`}>
                    
                    <div className={`p-6 border-b ${isClaimable ? 'border-indigo-100 bg-indigo-50/30' : 'border-stone-100 bg-stone-50/50'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h2 className="text-xl font-bold font-display text-stone-900 pr-4">{q.purpose}</h2>
                        {isClaimable ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full whitespace-nowrap">
                            <Clock className="w-3 h-3" /> Ready to Claim
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3" /> Claimed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 font-medium">
                        Campaign: <span className="font-bold text-stone-800">{q.campaignTitle}</span>
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        Vendor: <span className="font-bold text-stone-700">{q.vendorName}</span>
                      </p>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Sanctioned By Donor</p>
                          <p className="text-3xl font-black font-bebas text-stone-900">
                            {formatFtu(q.allocatedAmountFtu || q.requestedAmountFtu)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Status</p>
                          <p className={`text-sm font-bold mt-2 ${isClaimable ? 'text-indigo-600' : 'text-emerald-700'}`}>
                            {isClaimable ? 'Unlocked on Blockchain' : 'Transferred to Wallet'}
                          </p>
                        </div>
                      </div>

                      {isClaimable ? (
                        <button 
                          onClick={() => handleExecuteClaim(q)}
                          disabled={isProcessing}
                          className="w-full py-4 bg-indigo-600 text-white font-black font-display text-base rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" /> Transferring via Smart Contract...
                            </>
                          ) : (
                            <>
                              <ArrowDownToLine className="w-5 h-5" /> Execute Claim to Wallet
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-xs text-stone-600 space-y-1">
                            <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Funds Disbursed to Creator
                            </p>
                            <p className="text-[11px] text-stone-500">
                              Please upload vendor invoice & delivery proof to maintain your reliability score.
                            </p>
                          </div>
                          <Link
                            href="/creator/proof"
                            className="w-full py-2.5 px-4 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <FileCheck className="w-4 h-4" /> Upload Expenditure Proof
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {claims.length === 0 && (
                <div className="col-span-full bg-white rounded-3xl border border-stone-200 p-16 text-center shadow-sm">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                    <ArrowDownToLine className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black font-display text-stone-900 mb-2">No Claims Available</h3>
                  <p className="text-stone-500 max-w-md mx-auto mb-6 text-sm">
                    Once a donor allots funding to your campaign, you can submit milestone quotations. When the donor sanctions your quotation at /donor/approvals, your claim will appear here ready to withdraw.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Link href="/creator/campaigns" className="px-5 py-2.5 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-colors">
                      View My Campaigns
                    </Link>
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
