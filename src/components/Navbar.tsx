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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User } from "lucide-react";

type NavLink = { name: string; href: string };

export default function Navbar() {
  const pathname = usePathname();
  const { wallet, isLoading, userRole, connectMetaMask, selectDemoRole, disconnect } = useWallet();

  // The landing page uses a light theme
  const navBg = "bg-white/80 border-stone-200 text-stone-900";

  let links: NavLink[] = [];

  if (userRole === "ADMIN") {
    links = [
      { name: "Dashboard", href: "/admin" },
      { name: "Campaigns", href: "/admin/campaigns" },
      { name: "Users", href: "/admin/users" },
      { name: "Audit Ledger", href: "/admin/ledger" },
      { name: "System", href: "/admin/system" },
    ];
  } else if (userRole === "CREATOR") {
    links = [
      { name: "My Campaigns", href: "/portfolio/creator/campaigns" },
      { name: "Create Campaign", href: "/create" },
      { name: "Requests", href: "/portfolio/creator/requests" },
      { name: "Claims", href: "/portfolio/creator/claims" },
      { name: "Proof", href: "/portfolio/creator/proof" },
      { name: "Score", href: "/portfolio/creator/score" },
      { name: "Audit", href: "/portfolio/creator/audit" },
    ];
  } else if (userRole === "DONOR") {
    links = [
      { name: "My Contributions", href: "/portfolio/donor/contributions" },
      { name: "Approvals", href: "/portfolio/donor/approvals" },
      { name: "Fund Tracking", href: "/portfolio/donor/tracking" },
      { name: "Settings", href: "/portfolio/donor/settings" },
      { name: "Audit Ledger", href: "/portfolio/donor/ledger" },
    ];
  } else {
    // Public unauthenticated
    links = [
      { name: "Explore", href: "/campaigns" },
      { name: "How it works", href: "/#why-it-matters" },
      { name: "Verify Proof", href: "/verify-proof" },
      { name: "Create Campaign", href: "/create" },
    ];
  }

  const { isVerifier } = useWallet();
  if (isVerifier) {
    links.push({ name: "Verifier Panel", href: "/verifier" });
  }

  return (
    <header className={`w-full ${navBg} px-6 sm:px-12 py-4 flex items-center justify-between border-b transition-colors relative z-50 backdrop-blur-xl`}>
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl sm:text-3xl font-black tracking-tight font-display text-stone-900 group-hover:opacity-90 transition-opacity">
            FundTrace
          </span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-xs font-semibold overflow-x-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`transition-colors whitespace-nowrap hover:text-stone-900 ${
              pathname === link.href
                ? "text-stone-900 font-bold underline underline-offset-4 decoration-[#FF5023]"
                : "text-stone-500"
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      {/* Right Actions: Demo Role Switcher & Connect Wallet Button */}
      <div className="flex items-center gap-3">
        
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-stone-200 bg-white px-3 text-xs font-medium text-stone-900 shadow-sm transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-950 cursor-pointer">
            Demo Role <ChevronDown className="w-4 h-4 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-stone-500">
              Switch Role (No MetaMask Needed)
            </div>
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
                  {wallet.balanceEth} FTC
                </span>
              )}
            </span>
          ) : (
            "CONNECT WALLET"
          )}
        </Button>

        {wallet.isConnected && userRole && (
          <Link
            href={
              userRole === "ADMIN" ? "/admin" :
              userRole === "CREATOR" ? "/portfolio/creator/campaigns" :
              "/portfolio/donor/contributions"
            }
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200 shadow-sm"
            title="My Profile"
          >
            <User className="w-4 h-4" />
          </Link>
        )}
      </div>
    </header>
  );
}
