"use client";

import React, { useState } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { MOCK_CAMPAIGNS_METADATA } from '@/lib/mock';
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
  CheckCircle2
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

export default function DonorSettingsPage() {
  const { wallet } = useWallet();
  const address = wallet.address;
  // Assume Alice is 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  
  // For demo, assume Alice contributed to campaign 1
  const activeCampaignId = 1;
  const meta = MOCK_CAMPAIGNS_METADATA[activeCampaignId];

  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [maxAutoAmount, setMaxAutoAmount] = useState('10000');
  const [requireManualHighRisk, setRequireManualHighRisk] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <RoleGuard allowedRoles={["DONOR"]}>
      <div className="min-h-screen p-8 lg:p-12 bg-[#F7F4ED] text-[#141414]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/donor" className="text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">Donor Portfolio</Link>
                <ChevronRight className="w-4 h-4 text-stone-400" />
                <span className="text-stone-900 text-sm font-bold">Automation Settings</span>
              </div>
              <h1 className="text-5xl font-black font-bebas uppercase tracking-tight text-stone-900">Approval Controls</h1>
              <p className="text-stone-600 font-medium mt-2">Manage AI-driven automated sanctioning for your funded campaigns.</p>
            </div>
          </header>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
            
            <div className="md:w-1/3 bg-stone-50 border-b md:border-b-0 md:border-r border-stone-200 p-8">
              <h2 className="text-xl font-bold font-display text-stone-900 mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" /> Active Campaigns
              </h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-white border border-indigo-200 shadow-sm rounded-xl cursor-pointer">
                  <h3 className="font-bold text-stone-900 line-clamp-1">{meta?.title}</h3>
                  <p className="text-xs text-stone-500 mt-1">Delegated Voting Weight: 46.9%</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    {automationEnabled ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Auto-Sanction ON</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-200 text-stone-600 px-2 py-0.5 rounded">Manual Review</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-2/3 p-8 lg:p-12">
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-stone-100">
                  <div>
                    <h2 className="text-2xl font-black font-display text-stone-900">AI Automation Settings</h2>
                    <p className="text-sm text-stone-500 font-medium mt-1">Configure parameters for automated spending approvals.</p>
                  </div>
                  <button onClick={() => setAutomationEnabled(!automationEnabled)} className="text-indigo-600 focus:outline-none">
                    {automationEnabled ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12 text-stone-300" />}
                  </button>
                </div>

                <div className={`space-y-8 transition-opacity duration-300 ${!automationEnabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  
                  {/* Setting 1 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-indigo-500" /> Maximum Auto-Sanction Amount
                      </h3>
                      <p className="text-sm text-stone-500 font-medium mt-1 max-w-sm">
                        Any quotation requesting more than this limit will automatically fall back to manual review.
                      </p>
                    </div>
                    <div className="relative w-full sm:w-48">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">₹</span>
                      <input 
                        type="number" 
                        value={maxAutoAmount}
                        onChange={(e) => setMaxAutoAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-white border border-stone-300 rounded-xl font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Setting 2 */}
                  <div className="flex items-center justify-between gap-4 pt-6 border-t border-stone-100">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-500" /> Require Manual Review for High Risk
                      </h3>
                      <p className="text-sm text-stone-500 font-medium mt-1 max-w-sm">
                        If the AI marks a quotation with a HIGH risk level (e.g. price mismatch, low creator reliability), bypass automation.
                      </p>
                    </div>
                    <button onClick={() => setRequireManualHighRisk(!requireManualHighRisk)} className="text-indigo-600 focus:outline-none flex-shrink-0">
                      {requireManualHighRisk ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12 text-stone-300" />}
                    </button>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-stone-200 flex items-center justify-between">
                  <p className="text-sm text-stone-500 font-medium">
                    Changes take effect immediately for new quotations.
                  </p>
                  <button 
                    onClick={handleSave}
                    className={`px-8 py-3 font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm ${
                      isSaved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isSaved ? <><CheckCircle2 className="w-5 h-5" /> Saved</> : <><Save className="w-5 h-5" /> Save Changes</>}
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
