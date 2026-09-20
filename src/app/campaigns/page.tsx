"use client";

import React, { useState } from 'react';
import { MOCK_CAMPAIGNS_ONCHAIN, MOCK_CAMPAIGNS_METADATA } from '@/lib/mock';
import { formatFtu, CampaignState } from '@/types';
import Link from 'next/link';
import { 
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Clock
} from 'lucide-react';
import Navbar from '@/components/Navbar'; // Assuming we have a standard layout, but let's just make sure it's self contained or uses the app layout.
// Note: If Navbar is globally in layout.tsx we don't need to import it here. Let's assume layout.tsx handles Nav.

export default function PublicCampaignsPage() {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Only show public facing campaigns (Verified or higher)
  const publicCampaigns = MOCK_CAMPAIGNS_ONCHAIN.filter(c => 
    c.state === CampaignState.Verified || c.state === CampaignState.FundingClosed
  );

  const filteredCampaigns = publicCampaigns.filter(c => {
    const meta = MOCK_CAMPAIGNS_METADATA[c.id];
    if (filter === 'FUNDING' && c.state !== CampaignState.Verified) return false;
    if (filter === 'EXECUTING' && c.state !== CampaignState.FundingClosed) return false;
    
    if (search && meta) {
      return meta.title.toLowerCase().includes(search.toLowerCase()) || 
             meta.tagline.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

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
              <h3 className="text-4xl font-black font-bebas text-white">450K+</h3>
              <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mt-1">FTU Raised</p>
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
                placeholder="Search campaigns..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              <button 
                onClick={() => setFilter('ALL')}
                className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors ${filter === 'ALL' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                All Campaigns
              </button>
              <button 
                onClick={() => setFilter('FUNDING')}
                className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors ${filter === 'FUNDING' ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                Actively Funding
              </button>
              <button 
                onClick={() => setFilter('EXECUTING')}
                className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors ${filter === 'EXECUTING' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                Fully Funded
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCampaigns.map(c => {
              const meta = MOCK_CAMPAIGNS_METADATA[c.id];
              const raised = Number(c.totalDonatedWei);
              const goal = Number(c.goalWei);
              const progress = Math.min(100, Math.round((raised / goal) * 100));
              const isFunding = c.state === CampaignState.Verified;

              return (
                <Link href={`/campaigns/${c.id}`} key={c.id} className="group bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full hover:-translate-y-1">
                  
                  {/* Image */}
                  <div className="h-56 bg-stone-200 relative overflow-hidden">
                    {meta?.coverImageUrl ? (
                      <img src={meta.coverImageUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">No Image</div>
                    )}
                    
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-stone-900 text-xs font-black rounded-lg shadow-sm">
                        <MapPin className="w-3 h-3 text-indigo-500" /> {meta?.location}
                      </span>
                    </div>
                    
                    <div className="absolute top-4 right-4">
                      {isFunding ? (
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
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-1 rounded">
                          {meta?.category}
                        </span>
                        {Number(c.totalSanctionedWei) > 0 && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-1 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Executing
                          </span>
                        )}
                      </div>
                      
                      <h2 className="text-2xl font-black font-display text-stone-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">{meta?.title}</h2>
                      <p className="text-sm text-stone-500 font-medium line-clamp-2">{meta?.tagline}</p>
                    </div>

                    {/* Progress */}
                    <div className="mt-6 pt-6 border-t border-stone-100">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <span className="text-2xl font-black font-bebas text-stone-900">{formatFtu(raised)}</span>
                          <span className="text-xs font-bold text-stone-500 ml-1 uppercase">Raised</span>
                        </div>
                        <span className="text-lg font-black font-bebas text-indigo-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2 mb-2 overflow-hidden">
                        <div className={`h-2 rounded-full transition-all duration-1000 ${isFunding ? 'bg-indigo-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                        <span>Goal: {formatFtu(goal)}</span>
                        {isFunding && meta?.fundingDeadline && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.ceil((new Date(meta.fundingDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Days Left</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredCampaigns.length === 0 && (
            <div className="bg-white rounded-3xl border border-stone-200 p-16 text-center shadow-sm">
              <h3 className="text-3xl font-black font-display text-stone-900 mb-2">No Campaigns Found</h3>
              <p className="text-stone-500 max-w-md mx-auto text-lg">Try adjusting your filters or search query to find more initiatives.</p>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
