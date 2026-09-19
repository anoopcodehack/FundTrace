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
        goal: ethers.formatEther(c.goal),
        deadline: Number(c.deadline),
        totalDonated: ethers.formatEther(c.totalDonated),
        totalReleased: ethers.formatEther(c.totalReleased),
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
