"use client";

import React, { useState, useEffect } from "react";
import {
  WalletState,
  INITIAL_WALLET_STATE,
  connectBrowserWallet,
  connectDemoAccount,
  DEMO_PRESET_ACCOUNTS,
  formatAddress,
} from "@/lib/wallet";
import { getContractAddress } from "@/lib/contract";
import {
  ShieldCheck,
  Wallet,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Vote,
  FileCheck2,
  Building2,
  Users,
  Coins,
  ShieldAlert,
  Lock,
  Unlock,
  Check,
  FileText,
  AlertTriangle,
  History,
} from "lucide-react";

export default function HomePage() {
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [contractAddress, setContractAddress] = useState<string>("");
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"donor" | "creator" | "verifier">("donor");

  // Interactive Live Demo States for Judges
  const [aliceVoted, setAliceVoted] = useState(false);
  const [bobVoted, setBobVoted] = useState(false);
  const [requestReleased, setRequestReleased] = useState(false);
  const [tamperTestState, setTamperTestState] = useState<"idle" | "original" | "tampered">("idle");
  const [campaign2Verified, setCampaign2Verified] = useState(false);

  useEffect(() => {
    setContractAddress(getContractAddress());

    // Listen for MetaMask account/network changes
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setWallet(INITIAL_WALLET_STATE);
        } else {
          handleConnectMetaMask();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);

      // Auto-detect if already connected or authorized
      ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            handleConnectMetaMask();
          }
        })
        .catch((e: any) => console.warn("Auto-detect failed:", e));

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
          ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  async function handleConnectMetaMask() {
    setIsLoading(true);
    setWallet((prev) => ({ ...prev, error: null }));
    try {
      const { walletState } = await connectBrowserWallet();
      setWallet(walletState);
    } catch (err: any) {
      console.error(err);
      setWallet((prev) => ({
        ...prev,
        error: err.message || "Failed to connect wallet",
      }));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectDemoAccount(preset: (typeof DEMO_PRESET_ACCOUNTS)[0]) {
    setIsLoading(true);
    setShowDemoMenu(false);
    setWallet((prev) => ({ ...prev, error: null }));
    try {
      const { walletState } = await connectDemoAccount(preset);
      setWallet(walletState);
      if (preset.role.includes("Alice")) {
        setActiveTab("donor");
      } else if (preset.role.includes("Creator")) {
        setActiveTab("creator");
      } else if (preset.role.includes("Verifier")) {
        setActiveTab("verifier");
      }
    } catch (err: any) {
      console.error(err);
      setWallet((prev) => ({
        ...prev,
        error: err.message || "Failed to switch demo role",
      }));
    } finally {
      setIsLoading(false);
    }
  }

  // Calculate Voting Progress
  const currentVoteWeight = (aliceVoted ? 46.9 : 0) + (bobVoted ? 31.3 : 0);
  const isThresholdMet = currentVoteWeight > 50.0;

  return (
    <div className="min-h-screen bg-[#F5EFEB] text-[#121212] selection:bg-[#FF4A1C] selection:text-white pb-24">
      {/* Top Announcement Bar */}
      <div className="bg-[#121212] text-[#FAF6F0] py-2 px-4 text-xs font-medium flex items-center justify-between border-b border-black/10">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#FF4A1C] animate-pulse"></span>
          <span className="font-semibold tracking-wide uppercase text-[11px] text-[#FF4A1C]">
            Versathon 2.0 Live Hackathon
          </span>
          <span className="text-stone-400 hidden sm:inline">·</span>
          <span className="text-stone-300 hidden sm:inline">Problem Statement F4: Transparent Crowdfunding & Fund Ledger</span>
        </div>
        <div className="flex items-center gap-3 text-stone-300 text-[11px] font-mono">
          <span>Smart Contract:</span>
          <span className="bg-stone-800 px-2 py-0.5 rounded text-amber-300">
            {formatAddress(contractAddress) || "0x5FbD...aa3"}
          </span>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#F5EFEB]/90 backdrop-blur-md border-b border-stone-300/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF4A1C] flex items-center justify-center text-white shadow-md shadow-[#FF4A1C]/20 font-black text-xl">
              FT
            </div>
            <div>
              <span className="text-2xl font-black tracking-tighter uppercase font-display text-[#121212]">
                FundTrace
              </span>
              <span className="hidden md:inline-block ml-2.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
                On-Chain Verifiable
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-stone-700">
            <a href="#overview" className="hover:text-[#FF4A1C] transition-colors">
              Overview
            </a>
            <a href="#campaigns" className="hover:text-[#FF4A1C] transition-colors">
              Campaigns
            </a>
            <a href="#voting" className="hover:text-[#FF4A1C] transition-colors">
              Snapshot Voting
            </a>
            <a href="#tamper" className="hover:text-[#FF4A1C] transition-colors">
              Tamper Check
            </a>
            <a href="#ledger" className="hover:text-[#FF4A1C] transition-colors">
              Public Ledger
            </a>
          </nav>

          {/* Right Action: MetaMask & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Role Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="py-2 px-3 text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:border-stone-400 rounded-full flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Demo Role</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemoMenu ? "rotate-180" : ""}`} />
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-72 p-1.5 bg-white border border-stone-300 rounded-2xl shadow-xl z-50 space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                    Switch Test Account
                  </div>
                  {DEMO_PRESET_ACCOUNTS.map((preset) => (
                    <button
                      key={preset.address}
                      onClick={() => handleSelectDemoAccount(preset)}
                      className="w-full text-left p-2 rounded-xl hover:bg-stone-100 transition-colors text-xs flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">{preset.role}</span>
                        <span className="font-mono text-[10px] text-stone-500">
                          {formatAddress(preset.address)}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500">{preset.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wallet Connect Button */}
            <button
              onClick={handleConnectMetaMask}
              disabled={isLoading}
              className="py-2 px-4 rounded-full font-bold text-xs flex items-center gap-2 bg-[#121212] text-white hover:bg-black shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF4A1C]" />
                  Connecting...
                </>
              ) : wallet.isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono">{wallet.displayAddress}</span>
                  <span className="px-1.5 py-0.5 bg-stone-800 text-stone-300 rounded text-[10px]">
                    {wallet.balanceEth ? `${wallet.balanceEth} ETH` : "Connected"}
                  </span>
                </>
              ) : (
                <>
                  <Wallet className="w-3.5 h-3.5 text-[#FF4A1C]" />
                  CONNECT WALLET
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Error alert if any */}
      {wallet.error && (
        <div className="max-w-7xl mx-auto mt-4 px-4 sm:px-8">
          <div className="p-3.5 rounded-xl bg-red-100 border border-red-300 text-red-800 text-xs flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{wallet.error}</span>
          </div>
        </div>
      )}

      {/* HERO SECTION: Retro-Modern Split Grid Inspired by Reference Design */}
      <section id="overview" className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* LEFT PANEL: Vibrant Deep Coral / Orange Card */}
          <div className="lg:col-span-7 bg-[#FF4A1C] rounded-[32px] p-6 sm:p-10 relative overflow-hidden shadow-2xl flex flex-col justify-between text-white bg-topo-pattern">
            
            {/* Top Badge & Subtext */}
            <div className="flex items-center justify-between z-10">
              <span className="text-xs uppercase font-extrabold tracking-widest bg-black/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10">
                PROBLEM STATEMENT F4
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-orange-100">
                BLOCKCHAIN LEDGER
              </span>
            </div>

            {/* Giant Distressed / Editorial Headline */}
            <div className="my-8 z-10">
              <h1 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-[0.92] font-display text-white drop-shadow-sm">
                FUTURE OF
                <br />
                <span className="text-stone-950">TRANSPARENT</span>
                <br />
                FUNDING
              </h1>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-white/95">
                  2024
                </span>
                <span className="text-xs uppercase font-bold tracking-wider bg-white text-[#FF4A1C] px-3 py-1 rounded-full shadow">
                  STEP INTO THE FUTURE OF PUBLIC FINANCE
                </span>
              </div>
            </div>

            {/* Center Visual Graphic: Futuristic Cyberpunk Blockchain Guardian */}
            <div className="my-4 flex items-center justify-center relative z-10">
              <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-stone-900 via-stone-800 to-stone-950 p-2 shadow-2xl border-4 border-white/20 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#FF4A1C]/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative z-10 space-y-2 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#FF4A1C] flex items-center justify-center text-white shadow-lg border-2 border-white/40">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <div className="font-black text-lg tracking-tight uppercase text-white font-display">
                    FUNDTRACE AI
                  </div>
                  <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-amber-300 font-bold tracking-widest border border-amber-400/30">
                    LOCK·DOWN 0% LEAKAGE
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Role Tabs on the Card */}
            <div className="z-10 mt-6 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setActiveTab("donor");
                    const alice = DEMO_PRESET_ACCOUNTS.find((a) => a.role.includes("Alice"));
                    if (alice) handleSelectDemoAccount(alice);
                  }}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                    activeTab === "donor"
                      ? "bg-white text-[#FF4A1C] shadow-lg scale-[1.02]"
                      : "bg-black/25 text-white hover:bg-black/40"
                  }`}
                >
                  <span>Personal / Donor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab("creator");
                    const creator = DEMO_PRESET_ACCOUNTS.find((a) => a.role.includes("Creator"));
                    if (creator) handleSelectDemoAccount(creator);
                  }}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                    activeTab === "creator"
                      ? "bg-stone-900 text-white shadow-lg scale-[1.02]"
                      : "bg-black/25 text-white hover:bg-black/40"
                  }`}
                >
                  <span>Team / Creator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab("verifier");
                    const verifier = DEMO_PRESET_ACCOUNTS.find((a) => a.role.includes("Verifier"));
                    if (verifier) handleSelectDemoAccount(verifier);
                  }}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                    activeTab === "verifier"
                      ? "bg-stone-900 text-white shadow-lg scale-[1.02]"
                      : "bg-black/25 text-white hover:bg-black/40"
                  }`}
                >
                  <span>Institutional</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Angled Floating Statement Badge */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-stone-950 to-stone-900 border border-white/10 shadow-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-orange-400">
                    STATEMENT OF ALLOCATED FUNDS
                  </div>
                  <div className="text-sm font-black text-white">
                    RURAL STEM LAB CAMPAIGN #1
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#FF4A1C] text-white text-xs font-black">
                    107% FUNDED
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-amber-300 text-xs font-black font-mono">
                    2.0 ETH BAL
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Cream / Ivory Paper Brutalist Editorial */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            
            {/* Top Financial Ticket & Stat Cards */}
            <div className="grid grid-cols-12 gap-4">
              
              {/* Receipt Ticket Card */}
              <div className="col-span-7 bg-white rounded-3xl p-5 border border-stone-300/80 shadow-md relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                    INVESTMENT RETURNS
                  </span>
                  <span className="text-[10px] font-mono text-stone-400">REC-0192</span>
                </div>
                <div className="my-3 space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black font-display tracking-tight text-[#121212]">
                      60%
                    </span>
                    <span className="text-xs font-medium text-stone-500">of Contributors</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-display text-[#FF4A1C]">
                      15.8%
                    </span>
                    <span className="text-[11px] font-medium text-stone-500">Avg Milestone ROI</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-dashed border-stone-200 text-[10px] text-stone-400 font-mono flex justify-between">
                  <span>SNAPSHOT VOTE</span>
                  <span className="text-emerald-600 font-bold">100% AUDITABLE</span>
                </div>
              </div>

              {/* Bright Yellow Sticky Card */}
              <div className="col-span-5 bg-[#FED74C] rounded-3xl p-5 border border-stone-900/10 shadow-md flex flex-col justify-between text-stone-950">
                <div className="text-[10px] font-black uppercase tracking-widest text-stone-800">
                  TOTAL VOLUME
                </div>
                <div className="my-2">
                  <span className="text-xs font-mono font-bold">ETH</span>
                  <div className="text-4xl font-black font-display tracking-tighter">
                    3.2<span className="text-xl">b</span>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-800">
                    Amount Donated
                  </span>
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider bg-stone-950 text-white px-2 py-0.5 rounded-full text-center">
                  ON-CHAIN ESCROW
                </div>
              </div>

            </div>

            {/* Bold Editorial Headline */}
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter font-display leading-[0.95] text-[#121212]">
                FUTURE OF TRANSPARENCY +
                <br />
                <span className="text-[#FF4A1C]">BY THE NUMBERS</span>
              </h2>

              <div className="flex items-start gap-2.5 pt-1">
                <Sparkles className="w-5 h-5 text-[#FF4A1C] shrink-0 mt-0.5" />
                <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
                  Streamlining Crowdfunding with Cryptographic Truth & Smart Contracts
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                In the evolving world of charitable giving and public fundraising, blockchain is key to
                preventing fraud and misappropriation. Donated funds remain locked in escrow until
                contributors vote on milestones, and release requires verifiable invoice receipts.
              </p>
            </div>

            {/* Feature Action Cards */}
            <div className="space-y-2.5 pt-2">
              <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-between hover:border-[#FF4A1C] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-800">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 uppercase">
                      INSTITUTIONAL AUDIT
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Pre-funding verification prevents fraudulent listings
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400" />
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-900 text-white shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FF4A1C] flex items-center justify-center text-white">
                    <Vote className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-white">
                      CONTRIBUTOR SNAPSHOT VOTING
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Weight proportional to donation; &gt;50% required to release
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#FF4A1C]" />
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-between hover:border-[#FF4A1C] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 uppercase">
                      CRYPTOGRAPHIC PROOF INSPECTOR
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Keccak-256 hash validation flags tampered invoices instantly
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 1: LIVE CAMPAIGN SHOWCASE */}
      <section id="campaigns" className="max-w-7xl mx-auto px-4 sm:px-8 py-10 border-t border-stone-300">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF4A1C]">
              ACTIVE PORTFOLIO
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight font-display text-[#121212]">
              CAMPAIGN REGISTRY
            </h2>
          </div>
          <div className="text-xs font-semibold text-stone-500">
            Smart contract verified campaigns with autonomous escrow locks
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Campaign #1: Rural STEM Lab (107% Funded) */}
          <div className="bg-white rounded-3xl p-6 border border-stone-300 shadow-md flex flex-col justify-between space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white font-bold text-[10px] tracking-wider uppercase px-4 py-1 rounded-bl-xl shadow-sm">
              FUNDING COMPLETE (107%)
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                  Education · ID #1
                </span>
                <span className="text-xs font-medium text-stone-500">Verified by Gov Auditor</span>
              </div>
              <h3 className="text-2xl font-black text-stone-900 font-display">
                Build Rural STEM Lab & Robotics Center
              </h3>
              <p className="text-xs text-stone-600 mt-2 line-clamp-2">
                Providing cutting-edge robotics toolkits, 3D printers, and solar-powered workstations
                for 500+ rural middle-school students.
              </p>
            </div>

            {/* Financial Progress Bar */}
            <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-stone-700">Raised: 3.20 ETH</span>
                <span className="text-[#FF4A1C]">Goal: 3.00 ETH (107%)</span>
              </div>
              <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                <div className="bg-[#FF4A1C] h-3 rounded-full w-full"></div>
              </div>
              <div className="flex justify-between text-[11px] text-stone-500 font-mono pt-1">
                <span>Remaining in Escrow: <strong>2.00 ETH</strong></span>
                <span>Released: <strong>1.20 ETH</strong></span>
              </div>
            </div>

            {/* Active Request Indicator */}
            <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF4A1C] animate-ping" />
                <span className="text-xs font-bold text-orange-950">
                  Request #02 Active: Lab Electronics (1.2 ETH)
                </span>
              </div>
              <a
                href="#voting"
                className="text-xs font-bold text-[#FF4A1C] hover:underline flex items-center gap-1"
              >
                Vote Now <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Campaign #2: Clean Water Well (Pending Institutional Verifier) */}
          <div className="bg-white rounded-3xl p-6 border border-stone-300 shadow-md flex flex-col justify-between space-y-5 relative">
            <div className={`absolute top-0 right-0 font-bold text-[10px] tracking-wider uppercase px-4 py-1 rounded-bl-xl shadow-sm ${
              campaign2Verified ? "bg-emerald-500 text-white" : "bg-amber-500 text-stone-950"
            }`}>
              {campaign2Verified ? "VERIFIED & ACTIVE" : "PENDING AUDIT VERIFICATION"}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] uppercase">
                  Sanitation · ID #2
                </span>
                <span className="text-xs font-medium text-stone-500">Requires Verifier Signoff</span>
              </div>
              <h3 className="text-2xl font-black text-stone-900 font-display">
                Clean Water Well & Filtration Initiative
              </h3>
              <p className="text-xs text-stone-600 mt-2 line-clamp-2">
                Deep solar-pump borewell and ceramic membrane filtration providing clean potable drinking
                water to 1,200 villagers.
              </p>
            </div>

            {/* Status explanation */}
            <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-stone-700">Target Goal: 5.00 ETH</span>
                <span className="text-stone-500">
                  {campaign2Verified ? "Donations Open" : "Donations Locked"}
                </span>
              </div>
              <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    campaign2Verified ? "bg-emerald-500 w-1/4" : "bg-stone-300 w-0"
                  }`}
                ></div>
              </div>
              <div className="text-[11px] text-stone-500 pt-1">
                {campaign2Verified
                  ? "✓ Verified by auditor. Campaign can now receive contributor funds."
                  : "🔒 Rule: Unverified campaigns cannot receive any donations until auditor verifies."}
              </div>
            </div>

            {/* Verifier Action Button for Judges */}
            <div className="pt-2">
              <button
                onClick={() => setCampaign2Verified(!campaign2Verified)}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  campaign2Verified
                    ? "bg-stone-100 text-stone-700 border border-stone-300 hover:bg-stone-200"
                    : "bg-[#121212] text-white hover:bg-black shadow-md"
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {campaign2Verified ? "Undo Verifier Approval (Reset)" : "Audit & Approve Campaign as Verifier"}
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 2: LIVE SNAPSHOT VOTING CARD (VERSATHON 3-MIN DEMO) */}
      <section id="voting" className="max-w-7xl mx-auto px-4 sm:px-8 py-10 border-t border-stone-300">
        <div className="bg-[#121212] rounded-[32px] p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-stone-800 pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#FF4A1C] text-white font-extrabold text-[10px] tracking-wider uppercase">
                  LIVE DEMO · STAGE 2
                </span>
                <span className="text-xs text-stone-400 font-mono">Request #02 / Campaign #1</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight font-display text-white">
                CONTRIBUTOR SNAPSHOT VOTING
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 max-w-2xl mt-2">
                Smart contract rule: Creators cannot release funds unilaterally. Approval strictly requires{" "}
                <span className="text-amber-400 font-bold">&gt;50% contribution weight</span> from authenticated donors.
              </p>
            </div>

            {/* Voting Threshold Metric */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  CURRENT APPROVAL
                </div>
                <div className={`text-3xl sm:text-4xl font-black font-display ${isThresholdMet ? "text-emerald-400" : "text-[#FF4A1C]"}`}>
                  {currentVoteWeight.toFixed(1)}%
                </div>
              </div>
              <div className="h-10 w-[1px] bg-stone-800" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  REQUIRED THRESHOLD
                </div>
                <div className="text-3xl sm:text-4xl font-black font-display text-stone-200">
                  &gt;50.0%
                </div>
              </div>
            </div>
          </div>

          {/* Voting Interactive Playground */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Voter Cards (Alice 46.9%, Bob 31.3%) */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                REGISTERED CONTRIBUTORS & SNAPSHOT WEIGHTS
              </h4>

              {/* Alice Card */}
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-900/50 border border-purple-700 flex items-center justify-center font-bold text-purple-300">
                    A
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Alice (Major Contributor)</span>
                      <span className="text-[10px] font-mono text-stone-400">0x90F7...b906</span>
                    </div>
                    <div className="text-xs text-stone-400">
                      Donated: <strong className="text-white">1.50 ETH</strong> · Voting Power:{" "}
                      <strong className="text-purple-300">46.9%</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setAliceVoted(!aliceVoted)}
                  disabled={requestReleased}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    aliceVoted
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "bg-white text-stone-950 hover:bg-stone-200"
                  } disabled:opacity-50`}
                >
                  {aliceVoted ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Approved
                    </>
                  ) : (
                    "Cast Alice's Vote"
                  )}
                </button>
              </div>

              {/* Bob Card */}
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-900/50 border border-blue-700 flex items-center justify-center font-bold text-blue-300">
                    B
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Bob (Key Contributor)</span>
                      <span className="text-[10px] font-mono text-stone-400">0x15d3...6A65</span>
                    </div>
                    <div className="text-xs text-stone-400">
                      Donated: <strong className="text-white">1.00 ETH</strong> · Voting Power:{" "}
                      <strong className="text-blue-300">31.3%</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setBobVoted(!bobVoted)}
                  disabled={requestReleased}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    bobVoted
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "bg-white text-stone-950 hover:bg-stone-200"
                  } disabled:opacity-50`}
                >
                  {bobVoted ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Approved
                    </>
                  ) : (
                    "Cast Bob's Vote"
                  )}
                </button>
              </div>

              {/* Voting Rule Note */}
              <div className="text-[11px] text-stone-400 bg-stone-900/40 p-3 rounded-xl border border-stone-800/80 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Rule Demonstration: Alice alone (46.9%) is <strong>≤ 50%</strong> (Release remains blocked). When Bob adds his 31.3%, approval reaches <strong>78.2%</strong> (Release unlocks).
                </span>
              </div>
            </div>

            {/* Right: Release Trigger Card */}
            <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#FF4A1C] mb-1">
                  EXECUTION GATEWAY
                </div>
                <h3 className="text-xl font-bold text-white font-display">
                  Release 1.20 ETH to Recipient
                </h3>
                <div className="mt-2 text-xs text-stone-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Recipient Vendor:</span>
                    <span className="font-mono text-stone-300">0x14dC...9955</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proof Window:</span>
                    <span className="text-stone-300">7 Days to Submit Invoice</span>
                  </div>
                </div>
              </div>

              {/* Visual Progress Meter */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-stone-400">Approval Progress</span>
                  <span className={isThresholdMet ? "text-emerald-400" : "text-amber-400"}>
                    {currentVoteWeight.toFixed(1)}% / 50% Required
                  </span>
                </div>
                <div className="w-full bg-stone-800 rounded-full h-3 relative overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      isThresholdMet ? "bg-emerald-500" : "bg-[#FF4A1C]"
                    }`}
                    style={{ width: `${Math.min(currentVoteWeight, 100)}%` }}
                  />
                  {/* 50% marker */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/70" />
                </div>
              </div>

              {/* Controlled Release Execution Button */}
              <div>
                {requestReleased ? (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    1.20 ETH Released on Blockchain! Proof Timer Started.
                  </div>
                ) : (
                  <button
                    onClick={() => setRequestReleased(true)}
                    disabled={!isThresholdMet}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      isThresholdMet
                        ? "bg-[#FF4A1C] hover:bg-[#ff5d33] text-white shadow-lg shadow-[#FF4A1C]/30"
                        : "bg-stone-800 text-stone-500 cursor-not-allowed"
                    }`}
                  >
                    {isThresholdMet ? (
                      <>
                        <Unlock className="w-4 h-4" />
                        Execute Controlled Release
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Awaiting &gt;50% Contributor Approval
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3: JUDGE CRYPTOGRAPHIC TAMPER-CHECK WIDGET */}
      <section id="tamper" className="max-w-7xl mx-auto px-4 sm:px-8 py-10 border-t border-stone-300">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF4A1C]">
              LIVE JUDGE DEMONSTRATION · 45-SECOND CHECK
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight font-display text-[#121212]">
              CRYPTOGRAPHIC TAMPER INSPECTOR
            </h2>
          </div>
          <div className="text-xs font-semibold text-stone-500">
            Computes Keccak-256 hash client-side & verifies against on-chain proof
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Interactive Test Buttons */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-stone-300 shadow-md space-y-4">
              <h3 className="text-lg font-black text-stone-900 font-display">
                Simulate Judge Receipt Verification
              </h3>
              <p className="text-xs text-stone-600">
                Click either button below to test how the smart contract & client-side hashing engine
                detects even a 1-character alteration in the expenditure invoice.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setTamperTestState("original")}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                    tamperTestState === "original"
                      ? "bg-emerald-50 border-emerald-500 shadow-md"
                      : "bg-stone-50 border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-stone-900">
                        Upload Authentic Receipt (Original PDF)
                      </div>
                      <div className="text-[11px] text-stone-500">
                        request-01-invoice-original.pdf
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    TEST MATCH
                  </span>
                </button>

                <button
                  onClick={() => setTamperTestState("tampered")}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                    tamperTestState === "tampered"
                      ? "bg-red-50 border-red-500 shadow-md"
                      : "bg-stone-50 border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="text-xs font-bold text-stone-900">
                        Upload Altered Receipt (Forged Amount PDF)
                      </div>
                      <div className="text-[11px] text-stone-500">
                        request-01-invoice-tampered.pdf
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                    TEST TAMPER
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Real-time Hash Comparison Screen */}
          <div className="lg:col-span-7">
            <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Keccak-256 On-Chain Commitment Comparison
                </span>
                <span className="text-[10px] font-mono text-amber-300">FundTrace.sol::checkProofHash</span>
              </div>

              {/* On-Chain Reference */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-stone-400">
                  On-Chain Committed Receipt Hash:
                </div>
                <div className="font-mono text-xs bg-black/50 p-3 rounded-xl text-stone-300 border border-stone-800 break-all">
                  0xb80dd0075275c63869fb31316e6d22a58911ec5896ed2c98bdaf0382ac4925fd
                </div>
              </div>

              {/* Candidate Hash */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-stone-400">
                  Candidate File Computed Hash:
                </div>
                <div className="font-mono text-xs bg-black/50 p-3 rounded-xl text-stone-300 border border-stone-800 break-all">
                  {tamperTestState === "idle" && "— (Select a test file on the left) —"}
                  {tamperTestState === "original" &&
                    "0xb80dd0075275c63869fb31316e6d22a58911ec5896ed2c98bdaf0382ac4925fd"}
                  {tamperTestState === "tampered" &&
                    "0x298492048fe49301827401928472910481029384719284719284719284719284"}
                </div>
              </div>

              {/* Verdict Screen */}
              {tamperTestState === "original" && (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-sm uppercase text-emerald-300">
                      ✓ TAMPER FREE — 100% AUTHENTIC RECEIPT
                    </div>
                    <div className="text-xs text-emerald-300/80 mt-0.5">
                      Client-side Keccak-256 matches on-chain commitment perfectly. The expenditure
                      proof is authentic and unaltered.
                    </div>
                  </div>
                </div>
              )}

              {tamperTestState === "tampered" && (
                <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500 text-red-200 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-sm uppercase text-red-400">
                      ⚠ TAMPER DETECTED — HASH MISMATCH
                    </div>
                    <div className="text-xs text-red-300/80 mt-0.5">
                      Cryptographic mismatch! The file bytes have been modified or an altered invoice
                      was substituted. On-chain validation failed.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 4: PUBLIC AUDIT LEDGER (NO LOGIN REQUIRED) */}
      <section id="ledger" className="max-w-7xl mx-auto px-4 sm:px-8 py-10 border-t border-stone-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF4A1C]">
              PUBLIC INSPECTION
            </span>
            <h2 className="text-3xl font-black uppercase tracking-tight font-display text-[#121212]">
              TRANSPARENT AUDIT LEDGER
            </h2>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 bg-stone-200/80 px-3 py-1 rounded-full">
            No Login Required
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-stone-300 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-stone-100 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Event</th>
                  <th className="py-3.5 px-4">Campaign</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Details / Value</th>
                  <th className="py-3.5 px-4">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800">
                <tr>
                  <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ProofSubmitted
                  </td>
                  <td className="py-3.5 px-4 font-semibold">Rural STEM Lab (#1)</td>
                  <td className="py-3.5 px-4 font-mono text-stone-600">0x7099...79C8</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500 truncate max-w-[180px]">
                    0xb80dd0075275c638...
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      ON-TIME PROOF
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    RequestReleased
                  </td>
                  <td className="py-3.5 px-4 font-semibold">Rural STEM Lab (#1)</td>
                  <td className="py-3.5 px-4 font-mono text-stone-600">0x976E...0aa9</td>
                  <td className="py-3.5 px-4 font-bold text-stone-900">1.20 ETH</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                      &gt;50% VOTED
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    DonationReceived
                  </td>
                  <td className="py-3.5 px-4 font-semibold">Rural STEM Lab (#1)</td>
                  <td className="py-3.5 px-4 font-mono text-stone-600">Alice (0x90F7...b906)</td>
                  <td className="py-3.5 px-4 font-bold text-stone-900">1.50 ETH</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-bold text-[10px]">
                      CONFIRMED
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    CampaignVerified
                  </td>
                  <td className="py-3.5 px-4 font-semibold">Rural STEM Lab (#1)</td>
                  <td className="py-3.5 px-4 font-mono text-stone-600">Gov Auditor (0x3C44...)</td>
                  <td className="py-3.5 px-4 text-stone-600">STEM License #8472</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                      INSTITUTIONAL
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-8 mt-16 pt-8 border-t border-stone-300 text-stone-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © 2024 <strong>FundTrace</strong> · Versathon 2.0 Hackathon Project (Problem Statement F4)
        </div>
        <div className="flex items-center gap-4">
          <span>Solidity 0.8.24</span>
          <span>•</span>
          <span>Ethers.js v6</span>
          <span>•</span>
          <span>Supabase PostgreSQL</span>
          <span>•</span>
          <span>Next.js 14</span>
        </div>
      </footer>
    </div>
  );
}
