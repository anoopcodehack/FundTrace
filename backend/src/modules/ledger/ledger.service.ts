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
      return [];
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
      return [];
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


}
