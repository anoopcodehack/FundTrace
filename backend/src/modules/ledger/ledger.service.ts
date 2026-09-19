import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from '../blockchain/blockchain.service';

export interface LedgerEvent {
  eventName: string;
  campaignId?: number;
  blockNumber: number;
  transactionHash: string;
  timestamp?: number;
  args: Record<string, any>;
  summary: string;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly blockchainService: BlockchainService) {}

  async getEvents(campaignIdFilter?: number): Promise<LedgerEvent[]> {
    const contract = this.blockchainService.getContract();
    const deployment = this.blockchainService.getDeploymentInfo();

    if (!contract || !deployment) {
      this.logger.warn('Contract not ready for ledger querying');
      return this.getMockLedgerEvents(campaignIdFilter);
    }

    try {
      const fromBlock = deployment.blockNumber || 0;
      const logs = await contract.queryFilter('*', fromBlock, 'latest');
      const events: LedgerEvent[] = [];

      for (const log of logs) {
        if ('fragment' in log && log.fragment) {
          const parsedArgs: Record<string, any> = {};
          log.fragment.inputs.forEach((input, index) => {
            const val = log.args[index];
            if (typeof val === 'bigint') {
              // Format WEI to ETH for known amount fields
              if (['amount', 'goal', 'totalDonated', 'totalRaised', 'weight', 'currentApprovalWeight', 'totalApprovalWeight'].includes(input.name)) {
                parsedArgs[input.name] = ethers.formatEther(val) + ' ETH';
              } else {
                parsedArgs[input.name] = val.toString();
              }
            } else {
              parsedArgs[input.name] = val;
            }
          });

          const cid = parsedArgs.campaignId ? Number(parsedArgs.campaignId) : undefined;
          if (campaignIdFilter !== undefined && cid !== undefined && cid !== campaignIdFilter) {
            continue;
          }

          events.push({
            eventName: log.fragment.name,
            campaignId: cid,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            args: parsedArgs,
            summary: this.generateSummary(log.fragment.name, parsedArgs),
          });
        }
      }

      return events.reverse(); // Newest first
    } catch (err) {
      this.logger.error('Error fetching on-chain events from RPC', err);
      return this.getMockLedgerEvents(campaignIdFilter);
    }
  }

  private generateSummary(eventName: string, args: Record<string, any>): string {
    switch (eventName) {
      case 'CampaignCreated':
        return `Campaign #${args.campaignId} created with goal ${args.goal}`;
      case 'CampaignVerified':
        return `Campaign #${args.campaignId} verified by verifier ${args.verifier?.slice(0, 8)}...`;
      case 'Donated':
        return `Donation of ${args.amount} by ${args.donor?.slice(0, 8)}... (Total: ${args.totalDonated})`;
      case 'FundingClosed':
        return `Funding closed for Campaign #${args.campaignId} with total ${args.totalRaised}`;
      case 'RequestCreated':
        return `Spending Request #${args.requestId} created for ${args.amount} to ${args.recipient?.slice(0, 8)}...`;
      case 'Approved':
        return `Vote cast for Request #${args.requestId} with weight ${args.weight}`;
      case 'RequestApproved':
        return `Request #${args.requestId} reached consensus approval (Total Weight: ${args.totalApprovalWeight})`;
      case 'Released':
        return `Funds released: ${args.amount} transferred to ${args.recipient?.slice(0, 8)}...`;
      case 'ProofSubmitted':
        return `Expenditure proof receipt submitted on-chain (Hash: ${args.receiptHash?.slice(0, 10)}...)`;
      case 'Refunded':
        return `Refund of ${args.amount} withdrawn by donor ${args.donor?.slice(0, 8)}...`;
      default:
        return `${eventName} triggered`;
    }
  }

  private getMockLedgerEvents(campaignIdFilter?: number): LedgerEvent[] {
    const demoEvents: LedgerEvent[] = [
      {
        eventName: 'ProofSubmitted',
        campaignId: 1,
        blockNumber: 7,
        transactionHash: '0xabc1...demo',
        args: { campaignId: '1', requestId: '1', receiptHash: '0x7e5b...f12' },
        summary: 'Expenditure proof receipt submitted on-chain (Hash: 0x7e5b...)',
      },
      {
        eventName: 'Released',
        campaignId: 1,
        blockNumber: 6,
        transactionHash: '0xabc2...demo',
        args: { campaignId: '1', requestId: '1', recipient: '0x976EA74026E726554dB657fA54763abd0C3a0aa9', amount: '1.2 ETH' },
        summary: 'Funds released: 1.2 ETH transferred to 0x976EA7...',
      },
      {
        eventName: 'RequestApproved',
        campaignId: 1,
        blockNumber: 5,
        transactionHash: '0xabc3...demo',
        args: { campaignId: '1', requestId: '1', totalApprovalWeight: '2.5 ETH' },
        summary: 'Request #1 reached consensus approval (Total Weight: 2.5 ETH)',
      },
      {
        eventName: 'FundingClosed',
        campaignId: 1,
        blockNumber: 4,
        transactionHash: '0xabc4...demo',
        args: { campaignId: '1', totalRaised: '3.2 ETH' },
        summary: 'Funding closed for Campaign #1 with total 3.2 ETH',
      },
      {
        eventName: 'CampaignVerified',
        campaignId: 1,
        blockNumber: 2,
        transactionHash: '0xabc5...demo',
        args: { campaignId: '1', verifier: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' },
        summary: 'Campaign #1 verified by verifier 0x3C44Cd...',
      },
      {
        eventName: 'CampaignCreated',
        campaignId: 1,
        blockNumber: 1,
        transactionHash: '0xabc6...demo',
        args: { campaignId: '1', goal: '3.0 ETH' },
        summary: 'Campaign #1 created with goal 3.0 ETH',
      },
    ];

    if (campaignIdFilter !== undefined) {
      return demoEvents.filter((e) => e.campaignId === campaignIdFilter);
    }
    return demoEvents;
  }
}
