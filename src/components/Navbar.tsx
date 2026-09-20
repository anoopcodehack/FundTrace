"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { DEMO_PRESET_ACCOUNTS, formatAddress } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { ChevronDown, User, Check } from "lucide-react";

type NavLink = { name: string; href: string };

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { wallet, isLoading, userRole, connectMetaMask, selectDemoRole, disconnect } = useWallet();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      { name: "My Campaigns", href: "/creator/campaigns" },
      { name: "Create Campaign", href: "/creator/create" },
      { name: "Requests", href: "/creator/requests" },
      { name: "Claims", href: "/creator/claims" },
      { name: "Proof", href: "/creator/proof" },
      { name: "Score", href: "/creator/score" },
      { name: "Audit", href: "/creator/audit" },
    ];
  } else if (userRole === "DONOR") {
    links = [
      { name: "My Contributions", href: "/donor/contributions" },
      { name: "Explore", href: "/donor/campaigns" },
      { name: "Approvals", href: "/donor/approvals" },
      { name: "Fund Tracking", href: "/donor/tracking" },
      { name: "Settings", href: "/donor/settings" },
      { name: "Audit Ledger", href: "/donor/ledger" },
    ];
  } else {
    // Public unauthenticated
    links = [
      { name: "Explore", href: "/campaigns" },
      { name: "How it works", href: "/#why-it-matters" },
      { name: "Verify Proof", href: "/verify-proof" },
      { name: "Create Campaign", href: "/creator/create" },
    ];
  }

  const { isVerifier } = useWallet();
  if (isVerifier) {
    links.push({ name: "Verifier Panel", href: "/verifier" });
  }

  const handleRoleSwitch = (preset: any) => {
    selectDemoRole(preset);
    const roleStr = preset.role.toUpperCase();
    if (roleStr === "VERIFIER" || roleStr === "ADMIN") {
      router.push("/admin");
    } else if (roleStr.includes("DONOR") || preset.appRole === "DONOR") {
      router.push("/donor");
    } else if (roleStr.includes("CREATOR") || preset.appRole === "CREATOR") {
      router.push("/creator");
    }
  };

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
        
        {/* Native Responsive Role Switcher Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            id="demo-role-trigger"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 text-xs font-bold text-stone-900 shadow-sm transition-all hover:bg-stone-100 hover:border-stone-300 focus:outline-none cursor-pointer"
          >
            Demo Role <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${showRoleMenu ? 'rotate-180' : ''}`} />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-stone-200 p-2 shadow-2xl z-50">
              <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                Switch Role (Instant Local Persona)
              </div>
              <div className="py-1 space-y-1 max-h-80 overflow-y-auto">
                {DEMO_PRESET_ACCOUNTS.map((preset) => {
                  const isCurrent = preset.address.toLowerCase() === wallet.address?.toLowerCase();
                  const roleSlug = preset.appRole ? preset.appRole.toLowerCase() : preset.role.toLowerCase().replace(/[^a-z0-9]/g, '-');
                  return (
                    <button
                      id={`demo-role-${roleSlug}`}
                      key={preset.address}
                      onClick={() => {
                        handleRoleSwitch(preset);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-colors flex flex-col gap-0.5 cursor-pointer ${
                        isCurrent ? 'bg-stone-100 border border-stone-200' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                          {preset.role}
                          {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        </span>
                        <span className="font-mono text-[10px] text-stone-400">{formatAddress(preset.address)}</span>
                      </div>
                      <span className="text-[11px] text-stone-500 leading-tight">{preset.description}</span>
                    </button>
                  );
                })}
              </div>

              {wallet.isConnected && (
                <div className="pt-1 mt-1 border-t border-stone-100">
                  <button
                    onClick={() => {
                      disconnect();
                      setShowRoleMenu(false);
                    }}
                    className="w-full py-2 px-3 text-center text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <Button
          id="connect-wallet-button"
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
              userRole === "CREATOR" ? "/creator/campaigns" :
              "/donor/contributions"
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
