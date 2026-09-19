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
import { NETWORKS } from "@/lib/blockchain";
import { ShieldCheck, Wallet, AlertCircle, RefreshCw, CheckCircle2, ChevronDown, ExternalLink } from "lucide-react";

export default function HomePage() {
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [contractAddress, setContractAddress] = useState<string>("");
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  useEffect(() => {
    setContractAddress(getContractAddress());

    // Listen for MetaMask account/network changes
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setWallet(INITIAL_WALLET_STATE);
        } else {
          // Re-connect to fetch updated balance
          handleConnectMetaMask();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);

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

  async function handleSelectDemoAccount(preset: typeof DEMO_PRESET_ACCOUNTS[0]) {
    setIsLoading(true);
    setShowDemoMenu(false);
    setWallet((prev) => ({ ...prev, error: null }));
    try {
      const { walletState } = await connectDemoAccount(preset);
      setWallet(walletState);
    } catch (err: any) {
      console.error(err);
      setWallet((prev) => ({
        ...prev,
        error: err.message || "Failed to connect demo account",
      }));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-2 shadow-lg shadow-blue-500/5">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            FundTrace
          </h1>
          <p className="text-sm text-slate-400">
            Transparent funding. Verifiable spending.
          </p>
        </div>

        {/* Phase 9 Test Card */}
        <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 shadow-2xl shadow-black/40 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Phase 9 — Blockchain Configuration Test
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 font-mono">
              Ethers.js v6
            </span>
          </div>

          {/* Action Button & Demo Dropdown */}
          <div className="space-y-3">
            <button
              onClick={handleConnectMetaMask}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  {wallet.isConnected ? "Reconnect MetaMask" : "Connect Wallet"}
                </>
              )}
            </button>

            {/* Quick Demo Pre-Funded Accounts Option */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="w-full py-2 px-3 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-between transition-colors bg-slate-950/40"
              >
                <span>Switch to Pre-Funded Demo Role</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemoMenu ? "rotate-180" : ""}`} />
              </button>

              {showDemoMenu && (
                <div className="absolute z-20 left-0 right-0 mt-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl space-y-1">
                  {DEMO_PRESET_ACCOUNTS.map((preset) => (
                    <button
                      key={preset.address}
                      onClick={() => handleSelectDemoAccount(preset)}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-800 transition-colors text-xs flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{preset.role}</span>
                        <span className="font-mono text-[10px] text-slate-500">{formatAddress(preset.address)}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{preset.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Connection Error Banner */}
          {wallet.error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <span>{wallet.error}</span>
            </div>
          )}

          {/* Connection Details Display */}
          <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 space-y-3.5 font-mono text-xs">
            <div>
              <div className="text-slate-500 uppercase text-[10px] tracking-wider mb-1 font-sans font-semibold">
                Connected:
              </div>
              <div className="text-slate-200 font-semibold truncate flex items-center justify-between">
                <span>{wallet.isConnected ? wallet.displayAddress : "Not Connected"}</span>
                {wallet.isConnected && (
                  <span className="text-[10px] text-emerald-400 font-sans font-normal px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
              {wallet.address && (
                <div className="text-[10px] text-slate-500 truncate mt-0.5" title={wallet.address}>
                  {wallet.address}
                </div>
              )}
            </div>

            <div className="border-t border-slate-900 pt-2.5">
              <div className="text-slate-500 uppercase text-[10px] tracking-wider mb-1 font-sans font-semibold">
                Network:
              </div>
              <div className="text-slate-200 font-semibold">
                {wallet.networkName || "—"}
              </div>
            </div>

            <div className="border-t border-slate-900 pt-2.5">
              <div className="text-slate-500 uppercase text-[10px] tracking-wider mb-1 font-sans font-semibold">
                Balance:
              </div>
              <div className="text-xl font-bold text-emerald-400">
                {wallet.balanceEth !== null ? `${wallet.balanceEth} ETH` : "—"}
              </div>
            </div>
          </div>

          {/* Deployed Contract Reference */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>FundTrace Contract:</span>
            <span className="font-mono text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-900/50">
              {formatAddress(contractAddress) || "0x5FbD...aa3"}
            </span>
          </div>

          {/* Phase 9 Test Success Status */}
          {wallet.isConnected && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs flex items-center justify-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>✅ PHASE 9 COMPLETE</span>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
