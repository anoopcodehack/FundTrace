import { ethers } from "ethers";

export interface NetworkConfig {
  chainId: number;
  hexChainId: string;
  name: string;
  rpcUrl: string;
  symbol: string;
  decimals: number;
  blockExplorerUrl?: string;
}

export const NETWORKS: Record<number, NetworkConfig> = {
  31337: {
    chainId: 31337,
    hexChainId: "0x7a69",
    name: "Hardhat Local",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545",
    symbol: "FTC",
    decimals: 18,
  },
  11155111: {
    chainId: 11155111,
    hexChainId: "0xaa36a7",
    name: "Ethereum Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    symbol: "FTC",
    decimals: 18,
    blockExplorerUrl: "https://sepolia.etherscan.io",
  },
};

export const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

/**
 * Returns read-only JSON-RPC provider for inspecting blockchain state without wallet.
 */
export function getRpcProvider(chainId = DEFAULT_CHAIN_ID): ethers.JsonRpcProvider {
  const config = NETWORKS[chainId] || NETWORKS[31337];
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

/**
 * Requests MetaMask or browser wallet to switch to the specified network,
 * adding it if not yet configured.
 */
export async function switchOrAddNetwork(chainId = DEFAULT_CHAIN_ID): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No Web3 browser wallet detected");
  }

  const ethereum = (window as any).ethereum;
  const config = NETWORKS[chainId] || NETWORKS[31337];

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: config.hexChainId }],
    });
    return true;
  } catch (switchError: any) {
    // 4902 indicates chain has not been added to MetaMask yet
    if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: config.hexChainId,
              chainName: config.name,
              rpcUrls: [config.rpcUrl],
              nativeCurrency: {
                name: config.symbol,
                symbol: config.symbol,
                decimals: config.decimals,
              },
              blockExplorerUrls: config.blockExplorerUrl ? [config.blockExplorerUrl] : undefined,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add network to wallet:", addError);
        return false;
      }
    }
    console.error("Failed to switch network in wallet:", switchError);
    return false;
  }
}
