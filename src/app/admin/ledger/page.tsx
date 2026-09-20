"use client";

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import Link from 'next/link';
import { 
  ChevronRight, 
  Activity, 
  Box, 
  Link as LinkIcon,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { formatFtu } from '@/types';

export default function AdminLedgerPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      let res = await fetch("/api/ledger");
      if (!res.ok) {
        res = await fetch("http://localhost:3001/api/ledger");
      }
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to load ledger events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/admin" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Admin</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Ledger</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Global Audit Timeline</h1>
              <p className="text-stone-600 font-medium mt-2">Immutable audit events fetched live from Supabase & Blockchain.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={loadEvents}
                className="px-5 py-2.5 bg-white border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors shadow-sm flex items-center gap-2 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} /> Refresh
              </button>
            </div>
          </header>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold font-display text-stone-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" /> Event Stream ({events.length})
              </h2>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">Supabase Live</span>
            </div>
            
            <div className="p-6 space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-stone-900" />
                  <p className="text-xs font-mono font-bold uppercase text-stone-400">Loading audit trail from Supabase...</p>
                </div>
              ) : (
                <>
                  {events.map((ev, idx) => (
                    <div key={idx} className="relative pl-8 md:pl-0">
                      <div className="md:grid md:grid-cols-12 md:gap-4 items-start">
                        
                        <div className="hidden md:block col-span-2 text-right pt-1">
                          <div className="text-sm font-bold text-stone-900">{new Date(ev.timestamp || Date.now()).toLocaleDateString()}</div>
                          <div className="text-xs text-stone-500">{new Date(ev.timestamp || Date.now()).toLocaleTimeString()}</div>
                        </div>
                        
                        <div className="md:col-span-1 relative flex justify-center mt-1">
                          <div className="absolute top-0 bottom-0 w-px bg-stone-200 -z-10 h-full" style={{ left: '50%', transform: 'translateX(-50%)' }}></div>
                          <div className="w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm z-10"></div>
                        </div>
                        
                        <div className="md:col-span-9 bg-white border border-stone-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-black font-display text-stone-900">{ev.eventName}</h4>
                                {ev.campaignId && (
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                                    Campaign #{ev.campaignId}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-600 font-medium mt-0.5">{ev.summary}</p>
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

                  {events.length === 0 && (
                    <div className="text-center py-12 text-stone-500 font-medium">
                      No audit events found in Supabase.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
