"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { DEMO_PRESET_ACCOUNTS, formatAddress } from "@/lib/wallet";
import { Check } from "lucide-react";
import IntroLoader from "@/components/IntroLoader";

// Clean Verification & Cryptographic Shield Icon
function ShieldCheckIcon({ className = "w-10 h-10 text-[#FF5023]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
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

// Signature 4-Pointed Concave Star Diamond (from FinFLO Figma reference)
function StarDiamondIcon({ className = "w-20 h-20 text-[#FF5023]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
      <path d="M50 0 C50 32 68 50 100 50 C68 50 50 68 50 100 C50 68 32 50 0 50 C32 50 50 32 50 0 Z" />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { wallet, isLoading, isVerifier, connectMetaMask, selectDemoRole } = useWallet();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "team" | "business">("team");

  useEffect(() => {
    if (wallet.isConnected && wallet.appRole) {
      if (wallet.appRole === "ADMIN") router.push("/admin");
      else if (wallet.appRole === "DONOR") router.push("/donor");
      else if (wallet.appRole === "CREATOR") router.push("/creator");
    }
  }, [wallet.isConnected, wallet.appRole, router]);

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
      
      {/* Intro Brand Logo Drop Physics Loader */}
      <IntroLoader />



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
                activeTab === "personal" ? "bg-black/10" : "hover:bg-black/10"
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
                activeTab === "team" ? "bg-black/10" : "hover:bg-black/10"
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
                activeTab === "business" ? "bg-black/10" : "hover:bg-black/10"
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
      {/* 3. SECTION: WHY ON-CHAIN ACCOUNTABILITY MATTERS!             */}
      {/* ============================================================ */}
      <section id="why-it-matters" className="max-w-7xl mx-auto px-6 sm:px-12 py-16 sm:py-24 relative reveal-init">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left: Giant Title + 3 Items */}
          <div className="lg:col-span-6 space-y-8">
            <h2 className="text-5xl sm:text-7xl font-black font-bebas uppercase leading-[0.88] tracking-tight text-[#141414]">
              WHY ON-CHAIN <span className="text-[#FF5023]">ACCOUNTABILITY</span>
              <br />
              &amp; ESCROW INTEGRITY
              <br />
              MATTERS!
            </h2>

            <div className="space-y-4 pt-2">
              
              {/* Item 1: Independent Auditor Verification */}
              <div className="border-b border-stone-300 pb-3">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 0 ? -1 : 0)}
                  className="w-full flex items-center justify-between text-left text-sm sm:text-base font-black uppercase text-[#141414] hover:text-[#FF5023] transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[#FF5023] font-mono text-lg font-bold">
                      {openAccordion === 0 ? "−" : "+"}
                    </span>
                    Independent Auditor Verification
                  </span>
                </button>
                {openAccordion === 0 && (
                  <p className="text-xs sm:text-sm text-stone-600 mt-2 pl-6 leading-relaxed">
                    Registered third-party auditors audit credentials and call <code>verifyCampaign()</code> before public funding can open. Creators are strictly barred from verifying their own campaigns.
                  </p>
                )}
              </div>

              {/* Item 2: Democratic Contributor Governance */}
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
                      Democratic Contributor Governance
                    </span>
                  </div>
                  {openAccordion === 1 && (
                    <p className="text-xs text-stone-300 mt-2.5 pl-6 leading-relaxed">
                      Donors vote with their exact contribution weight. Smart contracts strictly require &gt;50% contributor approval weight before any milestone funds leave escrow.
                    </p>
                  )}
                </button>
              </div>

              {/* Item 3: Immutable Keccak-256 Proofs */}
              <div className="border-b border-stone-300 pb-3 pt-2">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 2 ? -1 : 2)}
                  className="w-full flex items-center justify-between text-left text-sm sm:text-base font-black uppercase text-[#141414] hover:text-[#FF5023] transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[#FF5023] font-mono text-lg font-bold">
                      {openAccordion === 2 ? "−" : "+"}
                    </span>
                    Immutable Keccak-256 Receipts
                  </span>
                </button>
                {openAccordion === 2 && (
                  <p className="text-xs sm:text-sm text-stone-600 mt-2 pl-6 leading-relaxed">
                    Raw invoice bytes are hashed with Keccak-256 and committed on-chain. Overdue receipts automatically lock future spending requests, preventing phantom withdrawals.
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Right: Watermark "ESCROW" + Precision Vector Tilted Statement Card */}
          <div className="lg:col-span-6 relative pt-6 sm:pt-0">
            
            {/* Watermark "ESCROW" */}
            <div className="absolute -top-12 right-6 text-[150px] sm:text-[220px] font-black text-stone-200/50 select-none pointer-events-none font-bebas z-0">
              ESCROW
            </div>

            {/* Crisp Vector Tilted Card (100% Sharp, Zero Cut-Offs) */}
            <div className="relative z-10 w-full max-w-md mx-auto sm:mr-0 animate-float-tilt">
              <div className="bg-gradient-to-br from-[#FF5023] to-[#E63E10] rounded-3xl p-7 sm:p-9 text-white shadow-2xl border-2 border-white/25 bg-topo-pattern">
                
                {/* Title */}
                <div className="font-bebas text-2xl sm:text-3xl tracking-wide uppercase text-white drop-shadow">
                  ON-CHAIN MILESTONE ESCROW
                </div>

                {/* Pill Badges */}
                <div className="mt-6 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="px-3.5 py-1.5 rounded-lg bg-black/40 text-white font-bold text-xs">
                      GOAL FUNDED
                    </span>
                    <span className="px-3 py-1 rounded-md bg-[#FED74C] text-stone-950 font-black text-xs">
                      107%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="px-3.5 py-1.5 rounded-lg bg-black/40 text-white font-bold text-xs">
                      VOTING THRESHOLD
                    </span>
                    <span className="px-3 py-1 rounded-md bg-white text-[#FF5023] font-black text-xs">
                      &gt; 50.0%
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
              Traditional crowdfunding platforms suffer from lack of transparency and phantom disbursements. FundTrace introduces cryptographic guarantees: donor contributions remain locked in autonomous smart contracts until spending milestones are approved by democratic consensus, and verified by immutable hash commitments.
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. SECTION: MILESTONE ACCOUNTABILITY (RAZOR-SHARP VECTOR)    */}
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
                      78%
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      Donor Consensus Weight
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 pt-2 border-t border-dashed border-stone-200">
                    <span className="text-4xl sm:text-5xl font-black font-bebas text-[#FF5023]">
                      100%
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      Receipt Proofs Verified
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
                  ESCROW TOTAL
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-5xl font-black font-bebas">4.2</span>
                  <span className="text-xs font-bold text-stone-800">FTC Protected</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Side: Editorial Narrative Text + Controls */}
          <div className="w-full lg:w-1/2 space-y-6 lg:pl-4">
            <h3 className="text-3xl sm:text-5xl font-black uppercase font-bebas tracking-wide text-white">
              MILESTONE ACCOUNTABILITY
            </h3>

            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Unlike conventional crowdfunding platforms where organizers withdraw all capital upfront with zero accountability, FundTrace locks raised capital in autonomous smart contracts. Funds are disbursed strictly in tranches upon democratic majority approval (&gt;50% donor weight). Every expenditure requires verifiable vendor invoices and Keccak-256 cryptographic proof commitments.
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
      {/* 5. SECTION: CROWDFUNDING GOVERNANCE BY THE NUMBERS           */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-6 sm:px-14 py-20 sm:py-28 reveal-init">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-12 border-b border-stone-300">
          <h2 className="text-5xl sm:text-7xl font-black font-bebas uppercase leading-[0.88] tracking-tight text-[#141414]">
            ON-CHAIN CROWDFUNDING +
            <br />
            INTEGRITY <span className="text-[#FF5023]">BY THE NUMBERS.</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md leading-relaxed">
            Transparent Web3 crowdfunding replaces centralized trust with smart contracts. Discover the metrics powering trustless fundraising and verifiable accountability.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-10 h-10 text-[#FF5023]" />
              <h3 className="text-3xl sm:text-4xl font-black font-bebas uppercase text-[#141414] tracking-wide">
                Streamlining Investments with Cryptographic Transparency
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              In decentralized crowdfunding, cryptographic integrity guarantees that donor funds are spent precisely as promised. Through deterministic Keccak-256 byte hashing and on-chain milestones, spending proofs are permanently verifiable. Donors retain democratic voting power before escrow releases, completely eliminating phantom disbursements.
            </p>
          </div>

          {/* Telemetry Stat Cards */}
          <div className="lg:col-span-6 flex flex-col items-center sm:items-end">
            <div className="space-y-4 text-center sm:text-right w-full max-w-md">
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm">
                  <div className="text-[10px] font-mono uppercase text-stone-500">Hash Algorithm</div>
                  <div className="text-sm font-mono font-bold text-stone-900 mt-0.5">Keccak-256</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm">
                  <div className="text-[10px] font-mono uppercase text-stone-500">Consensus Rule</div>
                  <div className="text-sm font-mono font-bold text-stone-900 mt-0.5">&gt;50% Donor Vote</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm">
                  <div className="text-[10px] font-mono uppercase text-stone-500">Smart Contracts</div>
                  <div className="text-sm font-mono font-bold text-emerald-600 mt-0.5">Audited &amp; Locked</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm">
                  <div className="text-[10px] font-mono uppercase text-stone-500">Receipt Verification</div>
                  <div className="text-sm font-mono font-bold text-[#FF5023] mt-0.5">Byte-for-Byte</div>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-6xl sm:text-7xl font-black font-bebas tracking-tight text-[#141414]">
                  516<span className="text-4xl text-[#FF5023]">K</span>
                </div>
                <div className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-500">
                  Data Delivered &amp; Audited On-Chain
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
        
        {/* Row 1: INSTITUTIONAL AUDIT VERIFICATION */}
        <div className="p-7 rounded-3xl bg-white border border-stone-300 shadow-sm card-hover-effect flex flex-col sm:flex-row sm:items-center justify-between gap-4 reveal-init">
          <div>
            <div className="text-xl sm:text-2xl font-black font-bebas uppercase text-[#141414]">
              INSTITUTIONAL AUDIT &amp; CREDENTIAL VERIFICATION
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Accredited verifiers review licenses on-chain before public funding opens.
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
        <div className="p-7 sm:p-9 rounded-2xl bg-[#141613] text-white shadow-sm border border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 reveal-init delay-100">
          <div className="space-y-2">
            <div className="text-xl sm:text-2xl font-bold font-sans text-white">
              Democratized Governance &amp; Voting Sandbox
            </div>
            <p className="text-xs text-stone-300 max-w-lg leading-relaxed">
              Experience decentralized milestone voting. Smart contracts enforce &gt;50% contribution approval before funds unlock. Currently at{" "}
              <strong className={isThresholdMet ? "text-emerald-400" : "text-[#FF5023]"}>
                {currentVoteWeight.toFixed(1)}% / 50%
              </strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setAliceVoted(!aliceVoted)}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  aliceVoted
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-stone-800/80 hover:bg-stone-800 border-stone-700 text-stone-200"
                }`}
              >
                {aliceVoted ? <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Alice Voted (46.9%)</span> : "+ Cast Alice (46.9%)"}
              </button>

              <button
                onClick={() => setBobVoted(!bobVoted)}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  bobVoted
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-stone-800/80 hover:bg-stone-800 border-stone-700 text-stone-200"
                }`}
              >
                {bobVoted ? <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Bob Voted (31.3%)</span> : "+ Cast Bob (31.3%)"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {requestReleased ? (
              <span className="px-4 py-2 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-semibold text-xs flex items-center gap-1.5">
                <Check className="w-4 h-4" /> 1.20 FTC Released
              </span>
            ) : (
              <button
                onClick={() => setRequestReleased(true)}
                disabled={!isThresholdMet}
                className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
                  isThresholdMet
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
                    : "bg-stone-800 text-stone-600 border border-stone-800 cursor-not-allowed"
                }`}
              >
                <ArrowIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. SLANTED ORANGE CALL-TO-ACTION BANNER (MATCHING IMAGE 1)   */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-10 py-12 reveal-init">
        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-8">
          
          {/* Big Orange Heroic Banner Block */}
          <div className="flex-1 bg-[#FF5023] rounded-[32px] p-8 sm:p-14 text-[#141414] shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black font-bebas uppercase leading-[0.86] tracking-tight text-[#141414]">
                READY TO LAUNCH
                <br />
                YOUR CAMPAIGN?
              </h2>
            </div>

            <div className="pt-10 sm:pt-16 space-y-4">
              <div className="flex flex-wrap gap-8 text-[11px] font-mono font-bold tracking-widest uppercase text-black/70">
                <div>ON-CHAIN ESCROW</div>
                <div>PUBLIC MERKLE AUDITS</div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/creator/create"
                  className="py-3 px-6 rounded-xl bg-[#141414] hover:bg-black text-white text-xs font-bold font-mono tracking-wider transition-all shadow-md"
                >
                  contracts/FundTrace.sol
                </Link>
                <Link
                  href="/campaigns"
                  className="py-3 px-6 rounded-xl bg-[#141414] hover:bg-black text-white text-xs font-bold font-mono tracking-wider transition-all shadow-md"
                >
                  protocol.fundtrace.ftc
                </Link>
              </div>
            </div>
          </div>

          {/* Right Side On Warm Cream (Matching Image 1) */}
          <div className="lg:w-80 flex flex-col justify-between py-2 sm:py-6 text-left lg:text-right">
            <div>
              <span className="font-bebas text-3xl font-black tracking-wider text-[#FF5023]">
                FundTrace
              </span>
            </div>
            <div className="pt-6 sm:pt-12">
              <h3 className="text-5xl sm:text-6xl font-black font-bebas uppercase text-[#FF5023] leading-[0.9] tracking-tight">
                VERIFIED
                <br />
                TRANSPARENCY!
              </h3>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. EXACT NEWSLETTER ROW (MATCHING IMAGE 2)                   */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-6 sm:px-14 py-10 border-t border-stone-300 reveal-init">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <h3 className="text-3xl sm:text-4xl font-black font-bebas uppercase tracking-wide text-[#141414]">
              NEWSLETTER
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Subscribe to receive the latest transparent campaign disbursements and milestone verification updates directly to your inbox.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <Link
              href="/verify-proof"
              className="py-2.5 px-5 rounded-full border border-stone-300 hover:border-stone-900 bg-white hover:bg-stone-50 text-stone-900 text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              Verify Receipt Proofs
            </Link>
            <Link
              href="/campaigns"
              className="w-10 h-10 rounded-full border border-stone-400 hover:border-stone-900 flex items-center justify-center text-stone-800 hover:text-black transition-colors cursor-pointer bg-white shrink-0 shadow-xs"
              title="Explore Campaigns"
            >
              <ArrowIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. EXACT MASSIVE DARK FOOTER (MATCHING IMAGE 2 DOWN TO PIXEL) */}
      {/* ============================================================ */}
      <footer className="w-full bg-[#12140E] text-[#F9EFE6] px-6 sm:px-14 pt-20 pb-14 mt-8 border-t border-stone-800 reveal-init">
        <div className="max-w-7xl mx-auto space-y-16">
          
          {/* Top Row: Massive Title & Orange Star Diamond */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <h2 className="text-6xl sm:text-8xl lg:text-9xl font-black uppercase font-bebas leading-[0.85] tracking-tight text-[#F9EFE6]">
              ON-CHAIN TRANSPARENCY
              <br />
              IMMUTABLE ACCOUNTABILITY
            </h2>
            <div className="self-start lg:self-center">
              <StarDiamondIcon className="w-20 h-20 sm:w-28 sm:h-28 text-[#FF5023]" />
            </div>
          </div>

          {/* Bottom Row: Socials/Copyright, Protocol Metrics, Legal Links */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-10 border-t border-stone-800/80 items-end">
            
            {/* Left: Socials & Copyright */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-5 text-stone-300 font-bold text-xs uppercase tracking-wider">
                <a href="#" className="hover:text-[#FF5023] transition-colors">in</a>
                <a href="#" className="hover:text-[#FF5023] transition-colors">f</a>
                <a href="#" className="hover:text-[#FF5023] transition-colors">X</a>
                <a href="#" className="hover:text-[#FF5023] transition-colors">M</a>
              </div>
              <div className="text-xs text-stone-400">
                Copyright &copy;2026 <strong className="text-white font-bold">FundTrace</strong>. All Rights Reserved
              </div>
            </div>

            {/* Center: Real Protocol Metrics (Matching Image 2 Number Style) */}
            <div className="md:col-span-4 flex items-end gap-10">
              <div>
                <div className="text-xs text-stone-400 font-sans">Smart Contract Tests</div>
                <div className="text-3xl sm:text-4xl font-black font-bebas text-[#FF5023] tracking-wide mt-0.5">
                  52 / 52 PASS
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-400 font-sans">Consensus Quorum</div>
                <div className="text-3xl sm:text-4xl font-black font-bebas text-[#FF5023] tracking-wide mt-0.5">
                  &gt; 50.0%
                </div>
              </div>
            </div>

            {/* Right: Legal Links */}
            <div className="md:col-span-3 flex flex-col md:items-end gap-2 text-xs text-stone-400 font-medium">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
              <a href="#" className="hover:text-white transition-colors">Disclaimer</a>
            </div>

          </div>

        </div>
      </footer>

    </div>
  );
}
