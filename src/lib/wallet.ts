import { ethers } from "ethers";
import { NETWORKS, switchOrAddNetwork, DEFAULT_CHAIN_ID } from "./blockchain";

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  displayAddress: string | null;
  chainId: number | null;
  networkName: string | null;
  balanceEth: string | null;
  isMetaMask: boolean;
  error: string | null;
  appRole?: "ADMIN" | "CREATOR" | "DONOR" | null;
}

export const INITIAL_WALLET_STATE: WalletState = {
  isConnected: false,
  address: null,
  displayAddress: null,
  chainId: null,
  networkName: null,
  balanceEth: null,
  isMetaMask: false,
  error: null,
  appRole: null,
};

export interface DemoPresetAccount {
  role: string;
  appRole: "ADMIN" | "CREATOR" | "DONOR";
  address: string;
  privateKey: string;
  description: string;
}

// Known pre-funded local Hardhat accounts for instant hackathon demo role switching
export const DEMO_PRESET_ACCOUNTS: DemoPresetAccount[] = [
  {
    role: "Deployer / Admin",
    appRole: "ADMIN" as const,
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    description: "Contract deployer & system administrator",
  },
  {
    role: "Campaign Creator",
    appRole: "CREATOR" as const,
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    description: "Rural STEM Lab campaign owner & spending requester",
  },
  {
    role: "Clean Water Creator",
    appRole: "CREATOR" as const,
    address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    privateKey: "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    description: "Clean Water Well Initiative creator (Campaign #2)",
  },
  {
    role: "Alice (Major Contributor)",
    appRole: "DONOR" as const,
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    description: "Donated 1.5 FTC (46.9% voting weight)",
  },
  {
    role: "Bob (Key Contributor)",
    appRole: "DONOR" as const,
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey: "0x47e179ec19401f8cb852cd80709033108c4e0906231eb9615553e19871783582",
    description: "Donated 1.0 FTC (31.3% voting weight, triggers >50% approval)",
  },
  {
    role: "Charlie (Community Donor)",
    appRole: "DONOR" as const,
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    privateKey: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    description: "Donated 0.7 FTC (21.9% voting weight)",
  },
];

/**
 * Truncates an Ethereum address to 0x123...abc format
 */
export function formatAddress(address?: string | null): string {
  if (!address) return "";
  if (address.length <= 10) return address;
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

/**
 * Formats a BigNumber / wei balance to readable FTC with specified decimals
 */
export function formatEthBalance(balanceWei: bigint, decimals = 4): string {
  const ethStr = ethers.formatEther(balanceWei);
  const num = parseFloat(ethStr);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Connects to MetaMask or any window.ethereum browser provider
 */
/**
 * Connects to MetaMask or any window.ethereum browser provider
 */
export async function connectBrowserWallet(): Promise<{
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  walletState: WalletState;
}> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No Web3 wallet found. Please install or open MetaMask.");
  }

  const ethereum = (window as any).ethereum;
  const provider = new ethers.BrowserProvider(ethereum);

  // 1. Check if already authorized
  let accounts: string[] = [];
  try {
    accounts = (await ethereum.request({ method: "eth_accounts" })) || [];
  } catch (err) {
    console.warn("eth_accounts check failed, will request accounts:", err);
  }

  // 2. If not already authorized, request user authorization
  if (!accounts || accounts.length === 0) {
    try {
      accounts = await ethereum.request({ method: "eth_requestAccounts" });
    } catch (reqErr: any) {
      if (reqErr.code === -32002) {
        throw new Error("MetaMask is already waiting for your approval! Click on the MetaMask icon in your browser toolbar to approve.");
      }
      if (reqErr.code === 4001) {
        throw new Error("Connection request was rejected in MetaMask.");
      }
      throw reqErr;
    }
  }

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts selected in wallet. Please select an account in MetaMask.");
  }

  const address = accounts[0];
  const signer = await provider.getSigner().catch(() => null as any);

  let chainId = 31337;
  let networkName = "Hardhat Local";
  try {
    const network = await provider.getNetwork();
    chainId = Number(network.chainId);
    const networkConfig = NETWORKS[chainId];
    networkName = networkConfig ? networkConfig.name : `Chain ${chainId}`;
  } catch (netErr) {
    console.warn("Could not retrieve network from provider:", netErr);
  }

  // Auto-switch to Hardhat local if on different chain
  if (chainId !== DEFAULT_CHAIN_ID && NETWORKS[DEFAULT_CHAIN_ID]) {
    try {
      await switchOrAddNetwork(DEFAULT_CHAIN_ID);
      const updatedNet = await provider.getNetwork().catch(() => null);
      if (updatedNet) {
        chainId = Number(updatedNet.chainId);
        networkName = NETWORKS[chainId]?.name || `Chain ${chainId}`;
      }
    } catch (e) {
      console.warn("Could not auto-switch network:", e);
    }
  }

  let balanceEth = "0.0";
  try {
    const balance = await provider.getBalance(address);
    balanceEth = formatEthBalance(balance);
  } catch (balErr) {
    console.warn("Could not fetch balance via provider:", balErr);
    try {
      const hexBal = await ethereum.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      if (hexBal) {
        balanceEth = formatEthBalance(BigInt(hexBal));
      }
    } catch {
      balanceEth = "0.0";
    }
  }

  // Resolve appRole based on address matching known presets
  const matchedPreset = DEMO_PRESET_ACCOUNTS.find(
    (p) => p.address.toLowerCase() === address.toLowerCase()
  );

  const walletState: WalletState = {
    isConnected: true,
    address,
    displayAddress: formatAddress(address),
    chainId,
    networkName,
    balanceEth,
    isMetaMask: Boolean(ethereum.isMetaMask),
    error: null,
    appRole: matchedPreset ? matchedPreset.appRole : null,
  };

  return { provider, signer, walletState };
}

/**
 * Connects using a pre-funded local demo account via direct RPC provider
 * Ideal for rapid hackathon role demonstrations without MetaMask prompts.
 */
export async function connectDemoAccount(
  preset: typeof DEMO_PRESET_ACCOUNTS[0]
): Promise<{
  provider: ethers.JsonRpcProvider;
  signer: ethers.Wallet;
  walletState: WalletState;
}> {
  const rpcUrl = NETWORKS[31337].rpcUrl;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(preset.privateKey, provider);

  const balance = await provider.getBalance(preset.address);
  const walletState: WalletState = {
    isConnected: true,
    address: preset.address,
    displayAddress: formatAddress(preset.address),
    chainId: 31337,
    networkName: "Hardhat Local",
    balanceEth: formatEthBalance(balance),
    isMetaMask: false,
    error: null,
    appRole: preset.appRole,
  };

  return { provider, signer, walletState };
}
