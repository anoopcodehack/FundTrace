"use client";

import React, { useState } from 'react';
import { MOCK_CAMPAIGNS_ONCHAIN, MOCK_CAMPAIGNS_METADATA, MOCK_QUOTATIONS } from '@/lib/mock';
import { formatFtu, CampaignState, QuotationState } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  ChevronLeft
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

export default function PublicCampaignDetailPage() {
  const params = useParams();
  const id = Number(params?.id || 1);
  const { wallet } = useWallet();
  const { isConnected, appRole } = wallet;

  const [donationAmount, setDonationAmount] = useState('1000');
  const [activeTab, setActiveTab] = useState<'STORY' | 'LEDGER'>('STORY');

  const onchain = MOCK_CAMPAIGNS_ONCHAIN.find(c => c.id === id);
  const meta = MOCK_CAMPAIGNS_METADATA[id];
  const campaignQuotations = MOCK_QUOTATIONS.filter(q => q.campaignId === id);

  if (!onchain || !meta) {
    return (
      <div className="min-h-screen bg-[#F7F4ED] flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-black font-bebas mb-4">Campaign Not Found</h1>
        <Link href="/campaigns" className="text-indigo-600 font-bold hover:underline">Return to Discovery</Link>
      </div>
    );
  }

  const raised = Number(onchain.totalDonatedWei);
  const goal = Number(onchain.goalWei);
  const progress = Math.min(100, Math.round((raised / goal) * 100));
  const isFunding = onchain.state === CampaignState.Verified;

  const allocated = Number(onchain.totalAllocatedWei);
  const sanctioned = Number(onchain.totalSanctionedWei);
  const claimed = Number(onchain.totalClaimedWei);
  const proofBacked = campaignQuotations.filter(q => q.state === QuotationState.Completed || q.state === QuotationState.ProofSubmitted).reduce((acc, q) => acc + (q.claimedAmountFtu || 0), 0);

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#141414] pb-24">
      
      {/* Back Nav */}
      <div className="max-w-7xl mx-auto px-8 lg:px-12 pt-8 pb-4">
        <Link href="/campaigns" className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Discover
        </Link>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-8 lg:px-12 mb-12">
        <div className="bg-white rounded-[40px] border border-stone-200 shadow-sm overflow-hidden flex flex-col lg:flex-row">
          
          {/* Left: Image & Quick Info */}
          <div className="lg:w-7/12 relative">
            <div className="h-64 lg:h-full min-h-[400px] bg-stone-200 relative">
              {meta.coverImageUrl ? (
                <img src={meta.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400">No Image</div>
              )}
              
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-stone-900 text-xs font-black rounded-lg shadow-sm">
                  <MapPin className="w-3 h-3 text-indigo-500" /> {meta.location}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-stone-900 text-xs font-black uppercase tracking-wider rounded-lg shadow-sm">
                  {meta.category}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Funding & Action */}
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
                <div className={`h-3 rounded-full transition-all duration-1000 ${isFunding ? 'bg-indigo-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }}></div>
              </div>
              
              <div className="flex justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
                <span>Goal: {formatFtu(goal)}</span>
                {isFunding && meta.fundingDeadline && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.ceil((new Date(meta.fundingDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Days Left</span>
                )}
              </div>
            </div>

            {/* Donation Controls */}
            {isFunding ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {['500', '1000', '5000'].map(amt => (
                    <button 
                      key={amt}
                      onClick={() => setDonationAmount(amt)}
                      className={`flex-1 py-2 rounded-xl font-bold font-mono transition-colors ${donationAmount === amt ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">₹</span>
                    <input 
                      type="number" 
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      className="w-full pl-8 pr-2 py-2 bg-white border border-stone-200 rounded-xl font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                {!isConnected ? (
                  <button className="w-full py-4 bg-stone-300 text-stone-600 font-black font-display text-lg rounded-xl cursor-not-allowed">
                    Connect Wallet to Donate
                  </button>
                ) : appRole !== 'DONOR' ? (
                  <button className="w-full py-4 bg-stone-300 text-stone-600 font-black font-display text-lg rounded-xl cursor-not-allowed">
                    Only Donors can contribute
                  </button>
                ) : (
                  <button className="w-full py-4 bg-indigo-600 text-white font-black font-display text-lg rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2 group">
                    Fund this Campaign <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                
                <p className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> Smart Contract Secured
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h3 className="font-bold text-emerald-900 mb-1">Funding Successful</h3>
                <p className="text-sm text-emerald-700">This campaign has reached its goal and is now in the execution phase.</p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Tabs & Main Content */}
      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        
        <div className="flex border-b border-stone-200 mb-8">
          <button 
            onClick={() => setActiveTab('STORY')}
            className={`px-8 py-4 font-black font-display text-lg border-b-4 transition-colors ${activeTab === 'STORY' ? 'border-indigo-600 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            The Story
          </button>
          <button 
            onClick={() => setActiveTab('LEDGER')}
            className={`px-8 py-4 font-black font-display text-lg border-b-4 transition-colors flex items-center gap-2 ${activeTab === 'LEDGER' ? 'border-indigo-600 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            Public Ledger <span className="bg-stone-100 text-stone-500 text-xs px-2 py-0.5 rounded-full font-bold">{campaignQuotations.length}</span>
          </button>
        </div>

        {activeTab === 'STORY' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            <div className="lg:col-span-2 prose prose-stone max-w-none prose-p:text-stone-600 prose-headings:font-display prose-headings:font-black">
              {meta.story.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              
              <div className="mt-12 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm not-prose">
                <h3 className="text-xl font-black font-display text-stone-900 mb-6">Planned Budget</h3>
                <div className="space-y-4">
                  {meta.plannedBudget.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                      <span className="font-bold text-stone-700">{item.category}</span>
                      <span className="font-black font-mono text-stone-900">{formatFtu(item.amountFtu)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-4 border-t border-stone-200 mt-2">
                    <span className="font-bold text-stone-500 uppercase tracking-wider">Total Planned</span>
                    <span className="font-black font-mono text-indigo-600 text-xl">{formatFtu(meta.plannedBudget.reduce((acc, curr) => acc + curr.amountFtu, 0))}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Creator</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{meta.creatorName}</p>
                    <p className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded mt-1 inline-block">
                      {onchain.creator.slice(0, 6)}...{onchain.creator.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Capital Health</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-stone-500">Raised</span>
                      <span className="text-stone-900">{formatFtu(raised)}</span>
                    </div>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full"><div className="bg-stone-900 h-1.5 rounded-full w-full"></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-indigo-600">Allocated to Requests</span>
                      <span className="text-stone-900">{formatFtu(allocated)}</span>
                    </div>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: raised > 0 ? `${(allocated/raised)*100}%` : '0%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-purple-600">Claimed & Spent</span>
                      <span className="text-stone-900">{formatFtu(claimed)}</span>
                    </div>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: raised > 0 ? `${(claimed/raised)*100}%` : '0%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-emerald-600">Proof Verified</span>
                      <span className="text-stone-900">{formatFtu(proofBacked)}</span>
                    </div>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: raised > 0 ? `${(proofBacked/raised)*100}%` : '0%' }}></div>
                    </div>
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
                  {campaignQuotations.map(q => {
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
                          {q.aiRecommendation ? (
                            <div>
                              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-indigo-500" /> AI Audit Note
                              </p>
                              <p className="text-sm text-stone-700 bg-white/60 p-3 rounded-xl border border-stone-200/50">
                                {q.aiRecommendation.priceAssessment}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-stone-400" /> AI Audit Note
                              </p>
                              <p className="text-sm text-stone-400 italic">Pending AI review.</p>
                            </div>
                          )}
                          
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

      </div>
    </div>
  );
}
