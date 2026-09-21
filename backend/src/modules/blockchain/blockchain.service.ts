import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

export interface DeploymentInfo {
  address: string;
  blockNumber: number;
  chainId: number;
  deployedAt?: string;
  accounts?: Record<string, string>;
}

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract | null = null;
  private deploymentInfo: DeploymentInfo | null = null;
  private contractAbi: any[] | null = null;
  private relaySigner: ethers.Wallet | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.initialize();
  }

  public initialize() {
    const rpcUrl = this.configService.get<string>('RPC_URL') || 'http://127.0.0.1:8545';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    try {
      this.loadDeploymentInfo();
      this.loadContractAbi();

      if (this.deploymentInfo?.address && this.contractAbi) {
        this.contract = new ethers.Contract(
          this.deploymentInfo.address,
          this.contractAbi,
          this.provider
        );
        this.logger.log(
          `Connected to FundTrace at ${this.deploymentInfo.address} (Chain ID: ${this.deploymentInfo.chainId})`
        );
      } else {
        this.logger.warn('Contract deployment not loaded. Ensure Hardhat deployment has run.');
      }

      // Load relay signer for automated sanctions
      const relayPrivateKey =
        this.configService.get<string>('RELAY_PRIVATE_KEY') ||
        process.env.RELAY_PRIVATE_KEY ||
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
      if (relayPrivateKey && this.provider) {
        this.relaySigner = new ethers.Wallet(relayPrivateKey, this.provider);
        this.logger.log(`Relay signer loaded: ${this.relaySigner.address}`);
      } else {
        this.logger.warn('RELAY_PRIVATE_KEY not set — automated sanctions will be unavailable.');
      }
    } catch (error) {
      this.logger.error('Failed to initialize contract bindings', error);
    }
  }

  private loadDeploymentInfo() {
    const candidates = [
      path.resolve(process.cwd(), '../deployments/localhost.json'),
      path.resolve(__dirname, '../../../../deployments/localhost.json'),
      path.resolve(process.cwd(), 'deployments/localhost.json'),
    ];

    for (const file of candidates) {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        this.deploymentInfo = JSON.parse(raw);
        return;
      }
    }
    this.logger.warn('No deployment file found at searched locations.');
  }

  private loadContractAbi() {
    const candidates = [
      path.resolve(process.cwd(), '../artifacts/contracts/FundTrace.sol/FundTrace.json'),
      path.resolve(__dirname, '../../../../artifacts/contracts/FundTrace.sol/FundTrace.json'),
      path.resolve(process.cwd(), 'artifacts/contracts/FundTrace.sol/FundTrace.json'),
    ];

    for (const file of candidates) {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        const parsed = JSON.parse(raw);
        this.contractAbi = parsed.abi;
        return;
      }
    }
    this.logger.warn('No contract artifact found at searched locations.');
  }

  public getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  public getContract(): ethers.Contract | null {
    return this.contract;
  }

  public getDeploymentInfo(): DeploymentInfo | null {
    return this.deploymentInfo;
  }

  /**
   * Returns the relay signer wallet (NestJS backend signer).
   * Used for automated sanctions triggered by donor policy.
   */
  public getSigner(): ethers.Wallet | null {
    return this.relaySigner;
  }

  /**
   * Returns the contract connected to the relay signer for write operations.
   * Use this for automated sanction transactions.
   */
  public getSignedContract(): ethers.Contract | null {
    if (!this.relaySigner && this.provider) {
      const relayPrivateKey =
        this.configService.get<string>('RELAY_PRIVATE_KEY') ||
        process.env.RELAY_PRIVATE_KEY ||
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
      if (relayPrivateKey) {
        this.relaySigner = new ethers.Wallet(relayPrivateKey, this.provider);
      }
    }
    if (!this.contract && this.deploymentInfo?.address && this.contractAbi && this.provider) {
      this.contract = new ethers.Contract(this.deploymentInfo.address, this.contractAbi, this.provider);
    }
    if (!this.relaySigner || !this.contract) return null;
    return this.contract.connect(this.relaySigner) as ethers.Contract;
  }

  public async getBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch {
      return 0;
    }
  }

  public async getCampaignFromChain(campaignId: number) {
    if (!this.contract) return null;
    try {
      const c = await this.contract.campaigns(campaignId);
      return {
        id: Number(c.id),
        creator: c.creator,
        verifier: c.verifier,
        // FTU model: 1 FTU = 1 wei (raw integer). Do NOT use formatEther() here.
        goal: c.goal.toString(),
        deadline: Number(c.deadline),
        totalDonated: c.totalDonated.toString(),
        totalReleased: c.totalReleased.toString(),
        totalClaimed: c.totalClaimed?.toString() ?? '0',
        totalAllocated: c.totalAllocated?.toString() ?? '0',
        totalSanctioned: c.totalSanctioned?.toString() ?? '0',
        quotationCount: Number(c.quotationCount ?? 0),
        metadataHash: c.metadataHash,
        state: Number(c.state),
        requestCount: Number(c.requestCount),
        activeRequestId: Number(c.activeRequestId),
      };
    } catch (err) {
      this.logger.error(`Error querying campaign ${campaignId} on-chain`, err);
      return null;
    }
  }
}
