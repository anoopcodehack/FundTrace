"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_LEDGER_EVENTS } from '@/lib/mock';
import Link from 'next/link';
import { 
  ChevronRight, 
  Activity, 
  Box,
  Link as LinkIcon
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

export default function DonorLedgerPage() {
  const { wallet } = useWallet();
  const address = wallet.address;
  // Assume Alice is 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  const DONOR_ADDRESS = address || "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  
  // Filter events related to campaigns funded by the donor (e.g. campaignId 1)
  // Also specific events where donor is involved (e.g. Donated, QuotationSanctioned by donor)
  const donorEvents = MOCK_LEDGER_EVENTS.filter(ev => 
    ev.args.campaignId === 1 || 
    ev.args.donor === DONOR_ADDRESS || 
    ev.args.sanctionedBy === DONOR_ADDRESS
  );

  return (
    <RoleGuard allowedRoles={["DONOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/donor" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Donor Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Audit Ledger</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Donor Audit Trail</h1>
              <p className="text-stone-600 font-medium mt-2">Immutable cryptographic log of your donations and sanctioning actions.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-2.5 bg-white border border-stone-200 text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition-colors shadow-sm flex items-center gap-2">
                <Box className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </header>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold font-display text-stone-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" /> Event Stream
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {donorEvents.map((ev, idx) => (
                <div key={idx} className="relative pl-8 md:pl-0">
                  <div className="md:grid md:grid-cols-12 md:gap-4 items-start">
                    
                    <div className="hidden md:block col-span-2 text-right pt-1">
                      <div className="text-sm font-bold text-stone-900">{new Date(ev.timestamp || 0).toLocaleDateString()}</div>
                      <div className="text-xs text-stone-500">{new Date(ev.timestamp || 0).toLocaleTimeString()}</div>
                    </div>
                    
                    <div className="md:col-span-1 relative flex justify-center mt-1">
                      <div className="absolute top-0 bottom-0 w-px bg-stone-200 -z-10 h-full" style={{ left: '50%', transform: 'translateX(-50%)' }}></div>
                      <div className="w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm z-10"></div>
                    </div>
                    
                    <div className="md:col-span-9 bg-white border border-stone-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
                        <div>
                          <h4 className="text-lg font-black font-display text-stone-900">{ev.eventName}</h4>
                          <div className="text-xs font-mono text-stone-500 flex items-center gap-1 mt-1">
                            <Box className="w-3 h-3" /> Block {ev.blockNumber}
                          </div>
                        </div>
                        <div className="text-xs font-mono bg-stone-100 text-stone-600 px-2 py-1 rounded-md flex items-center gap-1 max-w-full truncate overflow-hidden" title={ev.transactionHash}>
                          <LinkIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate w-32 sm:w-auto">{ev.transactionHash}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 bg-stone-50 rounded-lg p-3 text-sm font-mono text-stone-700">
                        <pre className="whitespace-pre-wrap break-words text-xs">
                          {JSON.stringify(ev.args, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {donorEvents.length === 0 && (
                <div className="text-center py-12 text-stone-500 font-medium">
                  No on-chain events found for your portfolio.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
