"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  WalletState,
  INITIAL_WALLET_STATE,
  connectBrowserWallet,
  connectDemoAccount,
  DEMO_PRESET_ACCOUNTS,
} from "@/lib/wallet";
import { getContractAddress } from "@/lib/contract";

// Known Institutional Verifier address from Hardhat deployment
export const VERIFIER_ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase();

interface WalletContextType {
  wallet: WalletState;
  isLoading: boolean;
  contractAddress: string;
  isVerifier: boolean;
  connectMetaMask: () => Promise<void>;
  selectDemoRole: (preset: (typeof DEMO_PRESET_ACCOUNTS)[0]) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [contractAddress, setContractAddress] = useState<string>("");

  useEffect(() => {
    setContractAddress(getContractAddress());

    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setWallet(INITIAL_WALLET_STATE);
        } else {
          connectMetaMask();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);

      // Auto-detect existing authorization
      ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            connectMetaMask();
          }
        })
        .catch(console.warn);

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
          ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  async function connectMetaMask() {
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

  async function selectDemoRole(preset: (typeof DEMO_PRESET_ACCOUNTS)[0]) {
    setIsLoading(true);
    setWallet((prev) => ({ ...prev, error: null }));
    try {
      const { walletState } = await connectDemoAccount(preset);
      setWallet(walletState);
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

  function disconnect() {
    setWallet(INITIAL_WALLET_STATE);
  }

  const isVerifier = Boolean(
    wallet.address && wallet.address.toLowerCase() === VERIFIER_ADDRESS
  );

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isLoading,
        contractAddress,
        isVerifier,
        connectMetaMask,
        selectDemoRole,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
