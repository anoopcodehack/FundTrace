"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { DEMO_PRESET_ACCOUNTS, formatAddress } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { wallet, isLoading, isVerifier, connectMetaMask, selectDemoRole, disconnect } = useWallet();

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
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full bg-black/25 text-white border-white/10 hover:bg-black/35 hover:text-white">
              Demo Role <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-stone-500">
              Switch Role (No MetaMask Needed)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEMO_PRESET_ACCOUNTS.map((preset) => (
              <DropdownMenuItem
                key={preset.address}
                onClick={() => selectDemoRole(preset)}
                className="cursor-pointer flex flex-col items-start gap-1 p-2"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-bold">{preset.role}</span>
                  <span className="font-mono text-[10px] text-stone-500">{formatAddress(preset.address)}</span>
                </div>
                <span className="text-[11px] text-stone-500 leading-tight">{preset.description}</span>
              </DropdownMenuItem>
            ))}
            
            {wallet.isConnected && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={disconnect} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 font-bold justify-center">
                  Disconnect Wallet
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          onClick={connectMetaMask}
          disabled={isLoading}
          variant="secondary"
          className="rounded-full font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all"
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
        </Button>
      </div>
    </header>
  );
}
