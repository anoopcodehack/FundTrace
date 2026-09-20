"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_QUOTATIONS, MOCK_CAMPAIGNS_METADATA } from '@/lib/mock';
import { formatFtu, QuotationState } from '@/types';
import Link from 'next/link';
import { 
  ChevronRight,
  Wallet,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Link as LinkIcon
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { formatAddress } from '@/lib/wallet';

export default function CreatorClaimsPage() {
  const { wallet } = useWallet();
  const address = wallet.address;
  const CREATOR_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Fallback demo address
  const activeAddress = address || CREATOR_ADDRESS;

  // Filter quotations that are either claimable or already claimed
  const claimableOrClaimed = MOCK_QUOTATIONS.filter(q => 
    q.creatorAddress.toLowerCase() === activeAddress.toLowerCase() &&
    [QuotationState.Claimable, QuotationState.Sanctioned, QuotationState.Claimed, QuotationState.ProofPending, QuotationState.ProofSubmitted, QuotationState.Completed].includes(q.state)
  );

  return (
    <RoleGuard allowedRoles={["CREATOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/portfolio/creator" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Creator Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Claims</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Execute Claims</h1>
              <p className="text-stone-600 font-medium mt-2">Withdraw sanctioned funds to your connected wallet.</p>
            </div>
            <div className="bg-white px-4 py-2 border border-stone-200 rounded-lg flex items-center gap-3 shadow-sm">
              <Wallet className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Connected Wallet</p>
                <p className="text-sm font-mono text-stone-900 font-bold">{formatAddress(activeAddress)}</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {claimableOrClaimed.map(q => {
              const meta = MOCK_CAMPAIGNS_METADATA[q.campaignId];
              const isClaimable = q.state === QuotationState.Sanctioned || q.state === QuotationState.Claimable;
              const isClaimed = !isClaimable;
              
              return (
                <div key={q.id} className={`bg-white/80 backdrop-blur-sm rounded-2xl border ${isClaimable ? 'border-blue-200 shadow-md ring-1 ring-blue-100' : 'border-stone-200 shadow-sm'} overflow-hidden flex flex-col`}>
                  
                  <div className={`p-6 border-b ${isClaimable ? 'border-blue-100 bg-blue-50/30' : 'border-stone-100 bg-stone-50/50'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-xl font-bold font-display text-stone-900 pr-4">{q.purpose}</h2>
                      {isClaimable ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full whitespace-nowrap">
                          <Clock className="w-3 h-3" /> Ready to Claim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" /> Claimed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 font-medium">
                      Campaign: <span className="font-bold text-stone-700">{meta?.title}</span>
                    </p>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Sanctioned</p>
                        <p className="text-2xl font-black font-bebas text-stone-900">{formatFtu(q.allocatedAmountFtu || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Claimed</p>
                        <p className={`text-2xl font-black font-bebas ${isClaimed ? 'text-emerald-700' : 'text-stone-300'}`}>
                          {formatFtu(q.claimedAmountFtu || 0)}
                        </p>
                      </div>
                    </div>

                    {isClaimable ? (
                      <button className="w-full py-4 bg-blue-600 text-white font-black font-display text-lg rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                        <ArrowDownToLine className="w-5 h-5" /> Execute Claim to Wallet
                      </button>
                    ) : (
                      <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" /> Transaction Receipt
                        </p>
                        <div className="text-sm font-mono text-stone-600 truncate" title="0x5555555555555555555555555555555555555555555555555555555555555555">
                          0x55555555555555555555...
                        </div>
                        <p className="text-xs text-stone-400 mt-2">Claimed on {new Date(q.claimedAt || '').toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {claimableOrClaimed.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                  <ArrowDownToLine className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black font-display text-stone-900 mb-2">No Claims Available</h3>
                <p className="text-stone-500 max-w-md mx-auto mb-6">You don't have any sanctioned quotations ready to claim.</p>
                <Link href="/portfolio/creator/requests" className="inline-flex px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                  View Spending Requests
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
