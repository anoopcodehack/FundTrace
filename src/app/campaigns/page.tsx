"use client";

import React, { useState, useEffect } from 'react';
import { getFundTraceContract } from '@/lib/contract';
import { formatFtu, CampaignState } from '@/types';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { 
  Search,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ethers } from 'ethers';

interface PublicCampaign {
  id: number;
  title: string;
  tagline: string;
  category: string;
  location: string;
  coverImageUrl?: string;
  fundingDeadline?: string | null;
  raisedFtu: number;
  goalFtu: number;
  state: CampaignState;
}

function parseContractFtu(val: any): number {
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

export default function PublicCampaignsPage() {
  const [filter, setFilter] = useState<'ALL' | 'FUNDING' | 'EXECUTING'>('ALL');
  const [search, setSearch] = useState('');
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAllCampaigns() {
      setIsLoading(true);
      try {
        const loaded: PublicCampaign[] = [];
        const seenIds = new Set<number>();

        // 1. Fetch DB campaigns directly from Supabase API (via Next.js proxy or direct backend)
        let dbCampaigns: any[] = [];
        try {
          const res = await fetch("/api/campaigns");
          if (res.ok) {
            dbCampaigns = await res.json();
          } else {
            const fallback = await fetch("http://localhost:3001/api/campaigns");
            if (fallback.ok) dbCampaigns = await fallback.json();
          }
        } catch (e) {
          try {
            const fallback = await fetch("http://localhost:3001/api/campaigns");
            if (fallback.ok) dbCampaigns = await fallback.json();
          } catch (err) {
            console.warn("Could not fetch DB campaigns:", err);
          }
        }

        // Render Supabase data immediately so there's zero UI loading delay
        const initialLoaded: PublicCampaign[] = dbCampaigns.map((db: any) => {
          const onChainId = Number(db.on_chain_id);
          const cId = onChainId > 0 ? onChainId : Number(db.id);
          return {
            id: cId,
            title: db.title || `Campaign #${cId}`,
            tagline: db.tagline || db.story || "Decentralized audited fund initiative",
            category: db.category || "Community",
            location: db.location || "Global",
            coverImageUrl: db.cover_image_url || "",
            fundingDeadline: db.funding_deadline || null,
            raisedFtu: Number(db.raised_ftu || 0),
            goalFtu: Number(db.goal_ftu || 10000),
            state: onChainId > 0 ? CampaignState.Verified : CampaignState.PendingVerification
          };
        });

        setCampaigns(initialLoaded);
        setIsLoading(false);

        // 2. Optionally augment with live contract state if local node is available (with quick timeout)
        try {
          const contract = getFundTraceContract();
          const countPromise = contract.campaignCount();
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
          const count = Number(await Promise.race([countPromise, timeoutPromise]));

          if (count > 0) {
            const updated = await Promise.all(initialLoaded.map(async (camp) => {
              if (camp.id <= count) {
                try {
                  const c = await contract.getCampaign(camp.id);
                  return {
                    ...camp,
                    raisedFtu: parseContractFtu(c.totalDonated),
                    goalFtu: parseContractFtu(c.goal),
                    state: Number(c.state) as CampaignState
                  };
                } catch {
                  return camp;
                }
              }
              return camp;
            }));
            setCampaigns(updated);
          }
        } catch {
          // Node not responding or timeout; Supabase data remains authoritative
        }
      } catch (err) {
        console.error("Failed to load campaigns:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllCampaigns();
  }, []);

  const { wallet } = useWallet();
  const getCampaignLink = (id: number) => {
    if (wallet.appRole === 'DONOR') return `/donor/campaigns/${id}`;
    if (wallet.appRole === 'CREATOR') return `/creator/campaigns/${id}`;
    return `/campaigns/${id}`;
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === 'FUNDING' && c.state !== CampaignState.Verified) return false;
    if (filter === 'EXECUTING' && c.state !== CampaignState.FundingClosed) return false;
    
    if (search) {
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.tagline.toLowerCase().includes(q);
    }
    return true;
  });

  const totalRaisedAll = campaigns.reduce((acc, c) => acc + c.raisedFtu, 0);

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#141414]">
      {/* Hero Section */}
      <section className="bg-stone-900 text-[#F7F4ED] pt-24 pb-16 px-8 lg:px-12 rounded-b-[40px]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="md:w-1/2">
            <h1 className="text-6xl md:text-8xl font-black font-bebas uppercase leading-[0.85] tracking-tight mb-6">
              Discover <br />
              <span className="text-indigo-400">Impact</span>
            </h1>
            <p className="text-stone-400 text-lg md:text-xl font-medium max-w-lg mb-8 leading-relaxed">
              Explore verified campaigns leveraging on-chain transparency and AI to guarantee your funds reach their intended destination.
            </p>
          </div>
          <div className="md:w-1/2 w-full grid grid-cols-2 gap-4">
            <div className="bg-stone-800 p-6 rounded-2xl border border-stone-700">
              <h3 className="text-4xl font-black font-bebas text-white">{formatFtu(totalRaisedAll || 450000)}</h3>
              <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mt-1">Total FTU Raised</p>
            </div>
            <div className="bg-stone-800 p-6 rounded-2xl border border-stone-700">
              <h3 className="text-4xl font-black font-bebas text-white">100%</h3>
              <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mt-1">On-Chain Audit</p>
            </div>
          </div>
        </div>
      </section>

      {/* Discovery Feed */}
      <section className="py-16 px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-stone-200 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input 
                type="text" 
                placeholder="Search all campaigns..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              <button 
                onClick={() => setFilter('ALL')}
                className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${filter === 'ALL' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                All Campaigns ({campaigns.length})
              </button>
              <button 
                onClick={() => setFilter('FUNDING')}
                className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${filter === 'FUNDING' ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                Actively Funding
              </button>
              <button 
                onClick={() => setFilter('EXECUTING')}
                className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${filter === 'EXECUTING' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                Fully Funded
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-stone-200 shadow-sm">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-stone-600 font-bold">Fetching all campaigns...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCampaigns.map(c => {
                const raised = c.raisedFtu;
                const goal = c.goalFtu;
                const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
                const isFunding = c.state === CampaignState.Verified;
                const isPending = c.state === CampaignState.PendingVerification;

                return (
                  <Link href={getCampaignLink(c.id)} key={c.id} className="group bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full hover:-translate-y-1">
                    
                    {/* Image */}
                    <div className="h-56 bg-stone-200 relative overflow-hidden">
                      {c.coverImageUrl ? (
                        <img src={c.coverImageUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400 font-medium">No Image</div>
                      )}
                      
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-stone-900 text-xs font-black rounded-lg shadow-sm">
                          <MapPin className="w-3 h-3 text-indigo-500" /> {c.location}
                        </span>
                      </div>
                      
                      <div className="absolute top-4 right-4">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-black rounded-lg shadow-sm">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        ) : isFunding ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-xs font-black rounded-lg shadow-sm">
                            <TrendingUp className="w-3 h-3" /> Funding
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-black rounded-lg shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> Funded
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-md mb-3 inline-block">
                          {c.category}
                        </span>
                        
                        <h3 className="text-2xl font-black font-display text-stone-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                          {c.title}
                        </h3>
                        
                        <p className="text-sm text-stone-500 font-medium line-clamp-2 mb-6">
                          {c.tagline}
                        </p>
                      </div>

                      {/* Progress Bar & Stats */}
                      <div className="space-y-4 pt-4 border-t border-stone-100">
                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-2xl font-black font-bebas text-stone-900">{formatFtu(raised)}</span>
                            <span className="text-sm font-bold text-stone-400">of {formatFtu(goal)}</span>
                          </div>
                          
                          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs font-bold text-stone-400">
                          <span>{progress}% funded</span>
                          {c.fundingDeadline && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.max(0, Math.ceil((new Date(c.fundingDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} Days Left
                            </span>
                          )}
                        </div>
                      </div>

                    </div>

                  </Link>
                );
              })}

              {filteredCampaigns.length === 0 && (
                <div className="col-span-full py-16 bg-white rounded-3xl border border-stone-200 text-center">
                  <AlertCircle className="w-10 h-10 text-stone-400 mx-auto mb-3" />
                  <p className="text-lg font-bold text-stone-900 mb-1">No campaigns matched your search</p>
                  <p className="text-sm text-stone-500">Try adjusting your filters or search keywords.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
