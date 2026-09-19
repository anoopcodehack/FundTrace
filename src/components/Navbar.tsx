"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { DEMO_PRESET_ACCOUNTS, formatAddress } from "@/lib/wallet";

export default function Navbar() {
  const pathname = usePathname();
  const { wallet, isLoading, isVerifier, connectMetaMask, selectDemoRole, disconnect } = useWallet();
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const isHome = pathname === "/";
  const navBg = isHome ? "bg-[#FF5023] text-white border-orange-600/30" : "bg-[#181A14] text-white border-stone-800";

  return (
    <header className={`w-full ${navBg} px-6 sm:px-12 py-4 flex items-center justify-between border-b transition-colors relative z-40 sticky top-0 backdrop-blur-md`}>
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl sm:text-3xl font-black tracking-tight font-display text-white group-hover:opacity-90 transition-opacity">
            FundTrace
          </span>
        </Link>
        <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-black/20 text-orange-100">
          Versathon 2.0
        </span>
      </div>

      {/* Nav Links */}
      <nav className="hidden md:flex items-center gap-7 text-xs font-semibold">
        <Link
          href="/campaigns"
          className={`transition-colors hover:text-white ${pathname === "/campaigns" ? "text-white font-bold underline underline-offset-4 decoration-[#FF5023]" : "text-stone-300"}`}
        >
          Explore
        </Link>

        <Link
          href="/#why-it-matters"
          className="text-stone-300 hover:text-white transition-colors"
        >
          How it works
        </Link>

        <Link
          href="/verify-proof"
          className={`transition-colors hover:text-white ${pathname === "/verify-proof" ? "text-white font-bold underline underline-offset-4 decoration-[#FF5023]" : "text-stone-300"}`}
        >
          Verify Proof
        </Link>

        <Link
          href="/create"
          className={`transition-colors hover:text-white ${pathname === "/create" ? "text-white font-bold underline underline-offset-4 decoration-[#FF5023]" : "text-stone-300"}`}
        >
          Create Campaign
        </Link>

        {/* Verifier Link: Shown only when connected as Verifier address or if demo mode enables it */}
        {isVerifier && (
          <Link
            href="/verifier"
            className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-600/50 animate-pulse"
          >
            <span>Verifier Panel</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </Link>
        )}
      </nav>

      {/* Right Actions: Demo Role Switcher & Connect Wallet Button */}
      <div className="flex items-center gap-3">
        {/* Demo Account Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowDemoMenu(!showDemoMenu)}
            className="py-2 px-3 text-xs font-bold text-white bg-black/25 hover:bg-black/35 rounded-full flex items-center gap-1.5 transition-all border border-white/10"
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

              {wallet.isConnected && (
                <button
                  onClick={() => {
                    disconnect();
                    setShowDemoMenu(false);
                  }}
                  className="w-full text-center p-2 rounded-xl hover:bg-red-50 text-red-600 text-xs font-bold border-t border-stone-100 mt-1"
                >
                  Disconnect Wallet
                </button>
              )}
            </div>
          )}
        </div>

        {/* Connect Wallet Button */}
        <button
          onClick={connectMetaMask}
          disabled={isLoading}
          className="py-2.5 px-5 rounded-full font-black text-xs uppercase tracking-wider bg-white text-[#141414] hover:bg-stone-100 shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            "CONNECTING..."
          ) : wallet.isConnected ? (
            <span className="flex items-center gap-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{wallet.displayAddress}</span>
              {wallet.balanceEth && (
                <span className="text-[10px] bg-stone-200 px-1.5 py-0.5 rounded text-stone-800 hidden sm:inline">
                  {wallet.balanceEth} ETH
                </span>
              )}
            </span>
          ) : (
            "CONNECT WALLET"
          )}
        </button>
      </div>
    </header>
  );
}
