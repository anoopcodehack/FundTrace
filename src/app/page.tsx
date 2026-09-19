"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { DEMO_PRESET_ACCOUNTS, formatAddress } from "@/lib/wallet";

// Precision Mathematical 4-Pointed Curved Star (Astroid)
function StarIcon({ className = "w-10 h-10 text-[#FF5023]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
      <path d="M50 0 C50 27.614 27.614 50 0 50 C27.614 50 50 72.386 50 100 C50 72.386 72.386 50 100 50 C72.386 50 50 27.614 50 0 Z" />
    </svg>
  );
}

// Clean Minimal Developer Arrow
function ArrowIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function HomePage() {
  const { wallet, isLoading, isVerifier, connectMetaMask, selectDemoRole } = useWallet();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "team" | "business">("team");

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState<number>(1);

  // Live Hackathon Judge Interactive States
  const [aliceVoted, setAliceVoted] = useState(false);
  const [bobVoted, setBobVoted] = useState(false);
  const [requestReleased, setRequestReleased] = useState(false);
  const [tamperTestState, setTamperTestState] = useState<"idle" | "original" | "tampered">("idle");
  const [campaign2Verified, setCampaign2Verified] = useState(false);

  // Scroll reveal animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".reveal-init");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const currentVoteWeight = (aliceVoted ? 46.9 : 0) + (bobVoted ? 31.3 : 0);
  const isThresholdMet = currentVoteWeight > 50.0;

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#141414] selection:bg-[#FF5023] selection:text-white antialiased">
      
      {/* ============================================================ */}
      {/* 1. TOP HEADER & DIRECT ROUTE ACCESS                          */}
      {/* ============================================================ */}
      <header className="w-full bg-[#161813] text-white px-6 sm:px-12 py-3.5 flex items-center justify-between border-b border-stone-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl sm:text-3xl font-black tracking-tight font-display text-white hover:opacity-90 transition-opacity">
            FundTrace
          </Link>
          <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#FF5023] text-white">
            Versathon 2026
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-stone-300">
          <Link href="/campaigns" className="hover:text-[#FF5023] transition-colors">Explore</Link>
          <a href="#why-it-matters" className="hover:text-[#FF5023] transition-colors">How it works</a>
          <Link href="/verify-proof" className="hover:text-[#FF5023] transition-colors">Verify Proof</Link>
          <Link href="/create" className="hover:text-[#FF5023] transition-colors">Create Campaign</Link>
          {isVerifier && (
            <Link href="/verifier" className="text-amber-300 hover:text-amber-200 font-bold px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40">
              Verifier Panel
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {/* Demo Account Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="py-2 px-3 text-xs font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-full flex items-center gap-1.5 transition-all border border-stone-700"
            >
              <span>Demo Role</span>
              <svg className={`w-3 h-3 transition-transform ${showDemoMenu ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-72 p-2 bg-white border border-stone-200 rounded-2xl shadow-2xl z-50 text-stone-900 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  Switch Role (No MetaMask Needed)
                </div>
                {DEMO_PRESET_ACCOUNTS.map((preset) => (
                  <button
                    key={preset.address}
                    onClick={() => {
                      selectDemoRole(preset);
                      setShowDemoMenu(false);
                    }}
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

          {/* Connect Wallet Button */}
          <button
            onClick={connectMetaMask}
            disabled={isLoading}
            className="py-2 px-5 rounded-full font-black text-xs uppercase tracking-wider bg-white text-[#141414] hover:bg-stone-100 shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              "CONNECTING..."
            ) : wallet.isConnected ? (
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{wallet.displayAddress}</span>
              </span>
            ) : (
              "CONNECT WALLET"
            )}
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. HERO SECTION: FULL UNCUT ARTWORK WITH 2026 NOTE           */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12">
        <div className="relative w-full aspect-[802/502] rounded-[28px] sm:rounded-[44px] overflow-hidden shadow-2xl border border-stone-300 bg-[#FF5023]">
          
          {/* Authentic High-Res Hero Banner Image (802x502 Full Laptop Screen) */}
          <Image
            src="/images/hero-card.png"
            alt="FundTrace - Future of Transparent Crowdfunding"
            fill
            priority
            className="object-cover object-center w-full h-full"
            sizes="(max-width: 1280px) 100vw, 1280px"
          />

          {/* Brand Name Overlay in top-left over FinFLO */}
          <div className="absolute top-3 sm:top-5 left-4 sm:left-8 z-10 flex items-center gap-2">
            <Link href="/" className="inline-flex items-center gap-2 bg-[#FF5023] px-3.5 py-1 rounded-xl shadow-md border border-white/20">
              <span className="text-xl sm:text-3xl font-black tracking-tight font-display text-white drop-shadow">
                FundTrace
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-black/25 text-white hidden sm:inline-block">
                2026 EDITION
              </span>
            </Link>
          </div>

          {/* Interactive Connect Wallet Overlay in top-right over ADD MONEY */}
          <div className="absolute top-3 sm:top-5 right-4 sm:right-8 z-10">
            <button
              onClick={connectMetaMask}
              className="py-1.5 sm:py-2.5 px-3.5 sm:px-6 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-wider bg-white text-[#141414] hover:bg-stone-100 shadow-xl transition-all active:scale-95 cursor-pointer"
            >
              {wallet.isConnected ? `● ${wallet.displayAddress}` : "CONNECT WALLET"}
            </button>
          </div>

          {/* Interactive Click Hotspots for Tabs (Personal, Team, Business) */}
          {/* Positioned accurately over the bottom-left pill card without duplicate text */}
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 z-10 w-[35%] h-[48%] flex flex-col justify-between py-1 sm:py-2 px-1">
            <button
              onClick={() => {
                setActiveTab("personal");
                const alice = DEMO_PRESET_ACCOUNTS.find((a) => a.role.includes("Alice"));
                if (alice) selectDemoRole(alice);
              }}
              className={`w-full h-[30%] rounded-xl transition-all cursor-pointer ${
                activeTab === "personal" ? "ring-2 ring-white/80 bg-white/10" : "hover:bg-black/10"
              }`}
              title="Personal Tab: Switch to Alice Donor (46.9%)"
            />
            <button
              onClick={() => {
                setActiveTab("team");
                const creator = DEMO_PRESET_ACCOUNTS.find((a) => a.role.includes("Creator"));
                if (creator) selectDemoRole(creator);
              }}
              className={`w-full h-[30%] rounded-xl transition-all cursor-pointer ${
                activeTab === "team" ? "ring-2 ring-white/80 bg-white/10" : "hover:bg-black/10"
              }`}
              title="Team Tab: Switch to Campaign Creator"
            />
            <button
              onClick={() => {
                setActiveTab("business");
                const verifier = DEMO_PRESET_ACCOUNTS.find((a) => a.role.includes("Verifier"));
                if (verifier) selectDemoRole(verifier);
              }}
              className={`w-full h-[30%] rounded-xl transition-all cursor-pointer ${
                activeTab === "business" ? "ring-2 ring-white/80 bg-white/10" : "hover:bg-black/10"
              }`}
              title="Business Tab: Switch to Auditor Verifier"
            />
          </div>

        </div>

        {/* Quick Route Shortcuts Bar with Card Hover & Scroll Reveal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <Link
            href="/campaigns"
            className="p-4 rounded-2xl bg-white border border-stone-300 shadow-sm card-hover-effect flex items-center justify-between group reveal-init"
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">P1 · EXPLORE</div>
              <div className="text-sm font-bold text-stone-900 group-hover:text-[#FF5023] transition-colors">All Campaigns</div>
            </div>
            <span className="text-stone-400 group-hover:text-[#FF5023] font-bold group-hover:translate-x-1 transition-all">→</span>
          </Link>

          <Link
            href="/campaigns/1"
            className="p-4 rounded-2xl bg-white border border-stone-300 shadow-sm card-hover-effect flex items-center justify-between group reveal-init delay-100"
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">P0 · CAMPAIGN HUB</div>
              <div className="text-sm font-bold text-stone-900 group-hover:text-[#FF5023] transition-colors">STEM Lab (107%)</div>
            </div>
            <span className="text-stone-400 group-hover:text-[#FF5023] font-bold group-hover:translate-x-1 transition-all">→</span>
          </Link>

          <Link
            href="/verify-proof"
            className="p-4 rounded-2xl bg-[#161813] text-white shadow-sm card-hover-effect hover:bg-black flex items-center justify-between group reveal-init delay-200"
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[#FF5023]">P0 · TAMPER DEMO</div>
              <div className="text-sm font-bold text-white">Verify Proof</div>
            </div>
            <span className="text-[#FF5023] font-bold group-hover:translate-x-1 transition-all">→</span>
          </Link>

          <Link
            href="/campaigns/1/ledger"
            className="p-4 rounded-2xl bg-white border border-stone-300 shadow-sm card-hover-effect flex items-center justify-between group reveal-init delay-300"
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">P0 · PUBLIC LEDGER</div>
              <div className="text-sm font-bold text-stone-900 group-hover:text-[#FF5023] transition-colors">Audit Timeline</div>
            </div>
            <span className="text-stone-400 group-hover:text-[#FF5023] font-bold group-hover:translate-x-1 transition-all">→</span>
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. SECTION: WHY THE FUTURE OF PRIVATE EQUITY MATTERS!        */}
      {/* ============================================================ */}
      <section id="why-it-matters" className="max-w-7xl mx-auto px-6 sm:px-12 py-16 sm:py-24 relative reveal-init">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left: Giant Title + 3 Items */}
          <div className="lg:col-span-6 space-y-8">
            <h2 className="text-5xl sm:text-7xl font-black font-bebas uppercase leading-[0.88] tracking-tight text-[#141414]">
              WHY THE <span className="text-[#FF5023]">FUTURE</span>
              <br />
              OF PRIVATE EQUITY
              <br />
              MATTERS!
            </h2>

            <div className="space-y-4 pt-2">
              
              {/* Item 1: Emerging Markets */}
              <div className="border-b border-stone-300 pb-3">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 0 ? -1 : 0)}
                  className="w-full flex items-center justify-between text-left text-sm sm:text-base font-black uppercase text-[#141414] hover:text-[#FF5023] transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[#FF5023] font-mono text-lg font-bold">
                      {openAccordion === 0 ? "−" : "+"}
                    </span>
                    Emerging Markets & Verification
                  </span>
                </button>
                {openAccordion === 0 && (
                  <p className="text-xs sm:text-sm text-stone-600 mt-2 pl-6 leading-relaxed">
                    Independent registered auditors verify campaign credentials before public donations open. Creators are strictly barred from approving their own initiatives.
                  </p>
                )}
              </div>

              {/* Item 2: Technological Innovation (Active Dark Card in Reference) */}
              <div className="pt-1">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 1 ? -1 : 1)}
                  className={`w-full p-5 rounded-2xl text-left transition-all cursor-pointer ${
                    openAccordion === 1
                      ? "bg-[#161813] text-white shadow-xl"
                      : "bg-white text-[#141414] border border-stone-300 hover:border-stone-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-black uppercase flex items-center gap-2.5">
                      <span className="text-[#FF5023] font-mono text-lg font-bold">
                        {openAccordion === 1 ? "−" : "+"}
                      </span>
                      Technological Innovation
                    </span>
                  </div>
                  {openAccordion === 1 && (
                    <p className="text-xs text-stone-300 mt-2.5 pl-6 leading-relaxed">
                      Understand how AI, blockchain, and data analytics are revolutionizing private equity. Donors vote with their exact contribution weight. Spending requires strictly &gt;50% donor approval before any fund leaves escrow.
                    </p>
                  )}
                </button>
              </div>

              {/* Item 3: Sustainable Investing */}
              <div className="border-b border-stone-300 pb-3 pt-2">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 2 ? -1 : 2)}
                  className="w-full flex items-center justify-between text-left text-sm sm:text-base font-black uppercase text-[#141414] hover:text-[#FF5023] transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[#FF5023] font-mono text-lg font-bold">
                      {openAccordion === 2 ? "−" : "+"}
                    </span>
                    Sustainable Investing
                  </span>
                </button>
                {openAccordion === 2 && (
                  <p className="text-xs sm:text-sm text-stone-600 mt-2 pl-6 leading-relaxed">
                    Raw invoice bytes are hashed with Keccak-256 and committed on-chain. Overdue receipts automatically lock future spending requests, eliminating phantom expenses.
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Right: Watermark "VALUE" + Precision Vector Tilted Statement Card */}
          <div className="lg:col-span-6 relative pt-6 sm:pt-0">
            
            {/* Watermark "VALUE" */}
            <div className="absolute -top-12 right-6 text-[150px] sm:text-[220px] font-black text-stone-200/50 select-none pointer-events-none font-bebas z-0">
              VALUE
            </div>

            {/* Crisp Vector Tilted Card (100% Sharp, Zero Cut-Offs) */}
            <div className="relative z-10 w-full max-w-md mx-auto sm:mr-0 animate-float-tilt">
              <div className="bg-gradient-to-br from-[#FF5023] to-[#E63E10] rounded-3xl p-7 sm:p-9 text-white shadow-2xl border-2 border-white/25 bg-topo-pattern">
                
                {/* Title */}
                <div className="font-bebas text-2xl sm:text-3xl tracking-wide uppercase text-white drop-shadow">
                  STATEMENT OF CHANGES IN EQUITY
                </div>

                {/* Pill Badges */}
                <div className="mt-6 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="px-3.5 py-1.5 rounded-lg bg-black/40 text-white font-bold text-xs">
                      CLAIM WITH US
                    </span>
                    <span className="px-3 py-1 rounded-md bg-[#FED74C] text-stone-950 font-black text-xs">
                      107%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="px-3.5 py-1.5 rounded-lg bg-black/40 text-white font-bold text-xs">
                      INDIVIDUAL CLAIM
                    </span>
                    <span className="px-3 py-1 rounded-md bg-white text-[#FF5023] font-black text-xs">
                      46.9%
                    </span>
                  </div>

                  {/* Connected Vector Nodes */}
                  <div className="pt-4 flex items-center justify-between px-2">
                    <div className="w-4 h-4 rounded-full bg-white border-4 border-[#FF5023] shadow-md" />
                    <div className="flex-1 h-[2px] bg-white/40 mx-2" />
                    <div className="w-4 h-4 rounded-full bg-[#FED74C] border-4 border-[#FF5023] shadow-md" />
                  </div>
                </div>

              </div>
            </div>

            {/* Clean Complete Editorial Narrative */}
            <div className="mt-8 text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl">
              The world of private equity is undergoing significant changes, driven by technological advancements, regulatory shifts, and new market opportunities. The traditional models are being disrupted, and those who adapt will reap the benefits. Explore how these changes can impact your investment strategies and what you need to know to thrive in this dynamic environment.
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. SECTION: INVESTMENT RETURNS (RAZOR-SHARP VECTOR CARD)     */}
      {/* ============================================================ */}
      <section id="metrics" className="max-w-7xl mx-auto px-4 sm:px-10 py-10 reveal-init">
        <div className="bg-[#161813] rounded-[36px] sm:rounded-[44px] p-6 sm:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center gap-10">
          
          {/* Left Side: Razor-Sharp Vector Ticket & Yellow Card */}
          <div className="w-full lg:w-1/2 flex items-center justify-center relative">
            <div className="relative w-full max-w-md">
              
              {/* White Receipt Ticket Card */}
              <div className="bg-white rounded-3xl p-7 text-[#141414] shadow-2xl w-5/6 relative z-10 card-hover-effect">
                {/* Barcode Ticks */}
                <div className="flex gap-1 mb-4">
                  {[...Array(14)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-4 rounded-full ${i % 3 === 0 ? "w-1.5 bg-[#FF5023]" : "w-1 bg-stone-300"}`}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl sm:text-7xl font-black font-bebas tracking-tight text-[#141414]">
                      60%
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      of Investors Voted
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 pt-2 border-t border-dashed border-stone-200">
                    <span className="text-4xl sm:text-5xl font-black font-bebas text-[#FF5023]">
                      15.8%
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      Average Annual Return
                    </span>
                  </div>
                </div>
              </div>

              {/* Overlapping Canary Yellow Sticky Card */}
              <div className="absolute -bottom-6 -right-2 sm:right-2 bg-[#FED74C] rounded-2xl p-5 text-stone-950 shadow-2xl z-20 w-44 sm:w-52 border border-stone-900/10 rotate-2 card-hover-effect">
                <div className="flex gap-1 mb-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-1 w-3 bg-stone-900/40 rounded-full" />
                  ))}
                </div>
                <div className="text-[10px] uppercase font-bold text-stone-800">
                  USD
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-5xl font-black font-bebas">4b</span>
                  <span className="text-xs font-bold text-stone-800">Amount Invested</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Side: Editorial Narrative Text + Controls */}
          <div className="w-full lg:w-1/2 space-y-6 lg:pl-4">
            <h3 className="text-3xl sm:text-5xl font-black uppercase font-bebas tracking-wide text-white">
              INVESTMENT RETURNS
            </h3>

            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Despite the challenges of an increasingly complex global economy, private equity continues to deliver strong returns. Over the past five years, the average annual return on private equity investments has outperformed traditional asset classes. Looking forward, the focus on value creation through operational improvements, coupled with strategic exits, is likely to sustain attractive returns for investors.
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-stone-800">
              <div className="flex items-center gap-3">
                <button className="w-10 h-10 rounded-full border border-stone-700 hover:border-white text-stone-400 hover:text-white flex items-center justify-center transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <button className="w-10 h-10 rounded-full bg-[#FF5023] hover:bg-[#ff5d32] text-white flex items-center justify-center shadow-lg transition-colors">
                  <ArrowIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="w-20 h-12 rounded-2xl bg-[#FF5023] bg-topo-pattern border border-white/20 shadow" />
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. SECTION: FUTURE OF PRIVATE EQUITY BY THE NUMBERS          */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-6 sm:px-14 py-20 sm:py-28 reveal-init">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-12 border-b border-stone-300">
          <h2 className="text-5xl sm:text-7xl font-black font-bebas uppercase leading-[0.88] tracking-tight text-[#141414]">
            FUTURE OF PRIVATE +
            <br />
            EQUITY <span className="text-[#FF5023]">BY THE NUMBERS.</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md leading-relaxed">
            Private equity is rapidly evolving, and understanding the key figures behind this growth is essential for anyone looking to stay ahead in the industry.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              <StarIcon className="w-12 h-12 text-[#FF5023]" />
              <h3 className="text-3xl sm:text-4xl font-black font-bebas uppercase text-[#141414] tracking-wide">
                Streamlining Investments with Cutting-Edge Technology
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              In the evolving world of private equity, technology is key to speeding up and simplifying investment processes. Through AI and advanced data analytics, we quickly identify the best opportunities with unmatched precision. Blockchain and smart contracts enhance security and transparency, reducing costs and eliminating barriers.
            </p>
          </div>

          {/* Layered 3D Isometric Cards Graphic with Continuous Floating Wave */}
          <div className="lg:col-span-6 flex flex-col items-center sm:items-end">
            <div className="space-y-4 text-center sm:text-right">
              <div className="flex items-center justify-center sm:justify-end gap-2.5">
                <div className="w-14 sm:w-16 h-28 rounded-2xl bg-[#FF5023] shadow-xl animate-deck-1 cursor-pointer transition-transform" />
                <div className="w-14 sm:w-16 h-28 rounded-2xl bg-[#FF7043] shadow-xl animate-deck-2 cursor-pointer transition-transform" />
                <div className="w-14 sm:w-16 h-28 rounded-2xl bg-[#161813] shadow-xl animate-deck-3 cursor-pointer transition-transform" />
                <div className="w-14 sm:w-16 h-28 rounded-2xl bg-stone-300 shadow-xl animate-deck-4 cursor-pointer transition-transform" />
                <div className="w-14 sm:w-16 h-28 rounded-2xl bg-[#FED74C] shadow-xl animate-deck-5 cursor-pointer transition-transform" />
              </div>

              <div className="pt-4">
                <div className="text-7xl sm:text-8xl font-black font-bebas tracking-tight text-[#141414]">
                  516<span className="text-5xl text-[#FF5023]">K</span>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Data Delivered & Audited
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. SECTION: EXACT INTERACTIVE FEATURE ROWS (ANIMATED BOXES)  */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-6 sm:px-14 py-10 space-y-4">
        
        {/* Row 1: NETWORKING OPPORTUNITIES */}
        <div className="p-7 rounded-3xl bg-white border border-stone-300 shadow-sm card-hover-effect flex flex-col sm:flex-row sm:items-center justify-between gap-4 reveal-init">
          <div>
            <div className="text-xl sm:text-2xl font-black font-bebas uppercase text-[#141414]">
              NETWORKING OPPORTUNITIES
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Connect with industry peers and verified auditors.
            </p>
          </div>
          <button
            onClick={() => setCampaign2Verified(!campaign2Verified)}
            className="w-10 h-10 rounded-full border border-stone-300 hover:border-[#FF5023] flex items-center justify-center text-stone-800 hover:text-[#FF5023] transition-colors self-start sm:self-center cursor-pointer"
          >
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: WEBINARS AND EVENTS (Snapshot Voting Sandbox) */}
        <div className="p-7 sm:p-9 rounded-3xl bg-[#161813] text-white shadow-xl card-hover-effect flex flex-col lg:flex-row lg:items-center justify-between gap-6 reveal-init delay-100">
          <div className="space-y-2">
            <div className="text-2xl sm:text-4xl font-black font-bebas uppercase text-white">
              WEBINARS AND EVENTS
            </div>
            <p className="text-xs text-stone-300 max-w-lg leading-relaxed">
              Participate in live snapshot voting. Approval weight requires &gt;50% contribution. Currently at{" "}
              <strong className={isThresholdMet ? "text-emerald-400" : "text-[#FF5023]"}>
                {currentVoteWeight.toFixed(1)}% / 50%
              </strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setAliceVoted(!aliceVoted)}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  aliceVoted ? "bg-emerald-500 text-white shadow" : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                }`}
              >
                {aliceVoted ? "✓ Alice Voted (46.9%)" : "+ Cast Alice (46.9%)"}
              </button>

              <button
                onClick={() => setBobVoted(!bobVoted)}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bobVoted ? "bg-emerald-500 text-white shadow" : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                }`}
              >
                {bobVoted ? "✓ Bob Voted (31.3%)" : "+ Cast Bob (31.3%)"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {requestReleased ? (
              <span className="px-5 py-2.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold text-xs">
                ✓ 1.2 ETH Released
              </span>
            ) : (
              <button
                onClick={() => setRequestReleased(true)}
                disabled={!isThresholdMet}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isThresholdMet
                    ? "bg-[#FF5023] hover:bg-[#ff5d32] text-white shadow-lg cursor-pointer"
                    : "bg-stone-800 text-stone-600 cursor-not-allowed"
                }`}
              >
                <ArrowIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 3: NEWSLETTER (Instant Cryptographic Tamper Check) */}
        <div className="p-7 rounded-3xl bg-white border border-stone-300 shadow-sm card-hover-effect flex flex-col sm:flex-row sm:items-center justify-between gap-4 reveal-init delay-200">
          <div>
            <div className="text-xl sm:text-2xl font-black font-bebas uppercase text-[#141414]">
              NEWSLETTER · CRYPTOGRAPHIC AUDIT DEMO
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Subscribe to receive updates, or test client-side Keccak-256 tamper verification instantly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTamperTestState("original")}
              className={`py-2 px-4 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                tamperTestState === "original"
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-stone-100 hover:bg-stone-200 text-stone-800"
              }`}
            >
              Test Original (Match)
            </button>
            <button
              onClick={() => setTamperTestState("tampered")}
              className={`py-2 px-4 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                tamperTestState === "tampered"
                  ? "bg-red-600 text-white shadow"
                  : "bg-stone-100 hover:bg-stone-200 text-stone-800"
              }`}
            >
              Test Tampered (Mismatch)
            </button>
          </div>
        </div>

        {tamperTestState === "original" && (
          <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>TAMPER FREE: Keccak-256 hash matches the on-chain commitment (0xb80dd...25fd). File is 100% authentic!</span>
          </div>
        )}
        {tamperTestState === "tampered" && (
          <div className="p-4 rounded-2xl bg-red-100 border border-red-400 text-red-900 text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>TAMPER DETECTED: Hash mismatch! The document has been modified or altered. Verification failed.</span>
          </div>
        )}

      </section>

      {/* ============================================================ */}
      {/* 7. MASSIVE DARK FOOTER (2026 NOTE & SENIOR DEVELOPER POLISH) */}
      {/* ============================================================ */}
      <footer className="w-full bg-[#12140E] text-[#F9EFE6] px-6 sm:px-14 pt-20 pb-14 mt-16 border-t border-stone-800 reveal-init">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <h2 className="text-6xl sm:text-8xl lg:text-9xl font-black uppercase font-bebas leading-[0.85] tracking-tight text-[#F9EFE6]">
              THE TIME IS NOW
              <br />
              THE PATH IS FORWARD
            </h2>
            <div className="self-start lg:self-center">
              <StarIcon className="w-16 h-16 sm:w-20 sm:h-20 text-[#FF5023]" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-stone-800 text-xs text-stone-400 font-medium">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            <a href="#" className="hover:text-white transition-colors">Disclaimer</a>
          </div>

          <div className="pt-8 border-t border-stone-800/80 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-stone-500">
            {/* Social Links */}
            <div className="flex items-center gap-5 text-stone-400 font-bold text-xs uppercase tracking-wider">
              <a href="#" className="hover:text-white transition-colors">in</a>
              <a href="#" className="hover:text-white transition-colors">fb</a>
              <a href="#" className="hover:text-white transition-colors">x</a>
              <a href="#" className="hover:text-white transition-colors">md</a>
            </div>

            {/* Coordinates / Chain Details in Orange */}
            <div className="flex flex-wrap items-center gap-6 font-mono text-[11px]">
              <div>
                <span className="text-stone-400">Latitude</span>{" "}
                <span className="text-[#FF5023] font-bold">37.7749</span>
              </div>
              <div>
                <span className="text-stone-400">Longitude</span>{" "}
                <span className="text-[#FF5023] font-bold">-122.4194</span>
              </div>
              <div>
                <span className="text-stone-400">Chain ID</span>{" "}
                <span className="text-amber-400 font-bold">31337</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800/40 text-center sm:text-left text-xs text-stone-400">
            Copyright © <strong className="text-white font-bold">2026</strong> <strong className="text-white font-bold">FundTrace</strong>. All Rights Reserved. Built for Versathon 2.0.
          </div>

        </div>
      </footer>

    </div>
  );
}
