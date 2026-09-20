import { Injectable, Logger, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/supabase.provider';
import { ethers } from 'ethers';
import { BlockchainService } from '../blockchain/blockchain.service';

export interface LedgerEvent {
  id?: number;
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

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly blockchainService: BlockchainService
  ) {}

  async getEvents(campaignIdFilter?: number): Promise<LedgerEvent[]> {
    // 1. Primary: Fetch all transparency audit events from Supabase
    try {
      let query = this.supabase
        .from('audit_events')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (campaignIdFilter !== undefined) {
        query = query.eq('campaign_id', campaignIdFilter);
      }

      const { data: dbEvents, error } = await query;
      if (!error && dbEvents && dbEvents.length > 0) {
        return dbEvents.map((ev) => {
          const args = ev.event_data || {};
          return {
            id: ev.id,
            eventName: ev.event_name,
            campaignId: ev.campaign_id ? Number(ev.campaign_id) : undefined,
            blockNumber: Number(ev.block_number || 0),
            transactionHash: ev.tx_hash || '0x',
            timestamp: ev.recorded_at ? new Date(ev.recorded_at).getTime() : Date.now(),
            args,
            summary: this.generateSummary(ev.event_name, args),
          };
        });
      }
    } catch (dbErr) {
      this.logger.warn('Could not query audit_events from Supabase, attempting on-chain query:', dbErr);
    }

    // 2. Secondary fallback: Query on-chain RPC logs
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
              if (['amount', 'goal', 'totalDonated', 'totalRaised', 'weight', 'currentApprovalWeight', 'totalApprovalWeight', 'allocatedAmount', 'claimedAmount'].includes(input.name)) {
                parsedArgs[input.name] = `${val.toString()} FTU`;
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

      return events.reverse();
    } catch (err) {
      this.logger.error('Error fetching on-chain events from RPC', err);
      return [];
    }
  }

  private generateSummary(eventName: string, args: Record<string, any>): string {
    switch (eventName) {
      case 'CampaignCreated':
        return `Campaign #${args.campaignId || ''} created with goal ${args.goal || ''}`;
      case 'CampaignVerified':
        return `Campaign #${args.campaignId || ''} verified by verifier ${args.verifier?.slice(0, 8) || 'Auditor'}...`;
      case 'Donated':
        return `Donation of ${args.amount || ''} by ${args.donor?.slice(0, 8) || 'Donor'}... (Total: ${args.totalDonated || ''})`;
      case 'FundingClosed':
        return `Funding closed for Campaign #${args.campaignId || ''} with total ${args.totalRaised || ''}`;
      case 'QuotationRegistered':
        return `Quotation #${args.quotationId || ''} registered for Campaign #${args.campaignId || ''}: ${args.purpose || ''}`;
      case 'QuotationSanctioned':
        return `Quotation #${args.quotationId || ''} sanctioned for ${args.allocatedAmount || ''}`;
      case 'AutomationToggled':
        return `AI Auto-Sanction ${args.enabled ? 'ENABLED' : 'DISABLED'} for Campaign #${args.campaignId || ''}`;
      case 'RequestCreated':
        return `Spending Request #${args.requestId || ''} created for ${args.amount || ''} to ${args.recipient?.slice(0, 8) || ''}...`;
      case 'Approved':
        return `Vote cast for Request #${args.requestId || ''} with weight ${args.weight || ''}`;
      case 'RequestApproved':
        return `Request #${args.requestId || ''} reached consensus approval (Total Weight: ${args.totalApprovalWeight || ''})`;
      case 'Released':
        return `Funds released: ${args.amount || ''} transferred to ${args.recipient?.slice(0, 8) || ''}...`;
      case 'ProofSubmitted':
        return `Expenditure proof receipt submitted on-chain (Hash: ${args.receiptHash?.slice(0, 10) || ''}...)`;
      case 'Refunded':
        return `Refund of ${args.amount || ''} withdrawn by donor ${args.donor?.slice(0, 8) || ''}...`;
      default:
        return `${eventName} recorded on ledger`;
    }
  }
}
