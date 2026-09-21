import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/supabase.provider';
import { BlockchainService } from '../blockchain/blockchain.service';
import { computeCanonicalMetadataHash, verifyHashMatch } from '../../utils/canonical';
import { CreateCampaignDto, PrepareCampaignDto } from './dto/create-campaign.dto';
import { ethers } from 'ethers';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly blockchainService: BlockchainService
  ) {}

  async create(createDto: CreateCampaignDto) {
    const canonicalHash = computeCanonicalMetadataHash({
      title: createDto.title,
      story: createDto.description, // DTO uses description, Next.js uses story. Mapping it.
      category: createDto.category,
      location: createDto.location || 'Global',
    });

    const campaignData: any = {
      on_chain_id: createDto.onChainId,
      title: createDto.title,
      tagline: '', // Next.js payload sometimes includes this
      category: createDto.category,
      story: createDto.description, // Next.js payload uses story
      location: createDto.location || 'Global',
      cover_image_url: createDto.imageUrl || '',
      canonical_hash: canonicalHash,
      updated_at: new Date().toISOString(),
    };

    if (createDto.creatorAddress) campaignData.creator_address = createDto.creatorAddress;
    if (createDto.verifierAddress) campaignData.verifier_address = createDto.verifierAddress;

    try {
      // Upsert Creator User
      if (createDto.creatorAddress) {
        await this.supabase.from('users').upsert({
          wallet_address: createDto.creatorAddress,
          role: 'CREATOR'
        }, { onConflict: 'wallet_address' });
      }

      // Upsert Verifier User
      if (createDto.verifierAddress) {
        await this.supabase.from('users').upsert({
          wallet_address: createDto.verifierAddress,
          role: 'VERIFIER'
        }, { onConflict: 'wallet_address' });
      }

      const { data, error } = await this.supabase.from('campaigns').upsert(campaignData, { onConflict: 'on_chain_id' }).select().single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      this.logger.error(`Supabase save failed: ${err.message}`);
      return campaignData;
    }
  }

  async prepareCampaign(dto: PrepareCampaignDto) {
    try {
      const deadlineTimestamp = Math.floor(new Date(dto.deadline).getTime() / 1000);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (deadlineTimestamp <= currentTimestamp) {
        throw new Error("Deadline must be in the future");
      }

      const canonicalHash = computeCanonicalMetadataHash({
        title: dto.title,
        story: dto.story,
        category: dto.category,
        location: dto.location
      });

      // Generate a temporary negative on_chain_id to satisfy the DB NOT NULL constraint
      // It will be updated to the real positive on_chain_id during the confirm step
      const tempOnChainId = -Math.floor(Math.random() * 1000000) - 1;

      const campaignData: any = {
        on_chain_id: tempOnChainId,
        title: dto.title,
        tagline: dto.shortDescription,
        category: dto.category,
        story: dto.story,
        location: dto.location,
        cover_image_url: dto.coverImage || '',
        canonical_hash: canonicalHash,
        creator_address: dto.creatorAddress,
        updated_at: new Date().toISOString(),
      };

      // Ensure creator exists in the users table to satisfy foreign key constraint
      if (dto.creatorAddress) {
        await this.supabase.from('users').upsert({
          wallet_address: dto.creatorAddress,
          role: 'CREATOR'
        }, { onConflict: 'wallet_address' });
      }

      // Store pending campaign to get an offChainId
      const { data: inserted, error } = await this.supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to insert pending campaign: ${error.message}`);
        throw new Error(`DB Error: ${error.message}`);
      }

      const contract = this.blockchainService.getContract();
      if (!contract) throw new Error("Contract not connected");

      const deadline = deadlineTimestamp;
      
      // Default verifier is the system admin (MVP role unification)
      const defaultVerifier = process.env.ADMIN_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; 
      // FTU model: 1 FTU = 1 wei integer in prototype accounting layer
      const goalWei = BigInt(dto.goalFtu);

      const txData = await contract.createCampaign.populateTransaction(
        goalWei,
        deadline,
        canonicalHash,
        defaultVerifier
      );

      return {
        transactionData: {
          to: txData.to,
          data: txData.data,
        },
        metadataHash: canonicalHash,
        offChainId: inserted.id
      };
    } catch (err: any) {
      console.error("PREPARE CAMPAIGN ERROR:", err);
      throw err;
    }
  }

  async confirmCampaign(id: string, txHash: string, explicitOnChainId?: number) {
    let onChainId = explicitOnChainId ? Number(explicitOnChainId) : null;

    if (!onChainId) {
      try {
        const provider = this.blockchainService.getProvider();
        const contract = this.blockchainService.getContract();
        if (contract && provider && txHash && txHash.startsWith('0x')) {
          const receipt = await provider.getTransactionReceipt(txHash);
          if (receipt) {
            for (const log of receipt.logs) {
              try {
                const parsed = contract.interface.parseLog({
                  topics: [...log.topics],
                  data: log.data
                });
                if (parsed && parsed.name === 'CampaignCreated') {
                  onChainId = Number(parsed.args[0]);
                  break;
                }
              } catch (e) {}
            }
          }
        }
      } catch (chainErr) {
        this.logger.warn(`Could not parse on-chain ID from tx receipt: ${chainErr}`);
      }
    }

    if (onChainId === null) {
      await this.supabase.from('campaigns').update({ tx_hash: txHash }).eq('id', id);
      return { status: 'pending_confirmation', txHash };
    }

    const numericId = !isNaN(Number(id)) ? Number(id) : id;
    const { error: updateError } = await this.supabase.from('campaigns').update({ 
      on_chain_id: onChainId,
      tx_hash: txHash 
    }).eq('id', numericId);

    if (updateError) {
      this.logger.error(`Failed to update campaign ${id} with onChainId ${onChainId}: ${updateError.message}`);
    }

    return { status: 'confirmed', onChainId };
  }


  async findAll() {
    const { data, error } = await this.supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (error) {
      this.logger.error(`Failed to fetch campaigns: ${error.message}`);
      throw error;
    }
    return data || [];
  }

  async findOne(idOrOnChainId: number) {
    const { data: campaign, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .or(`on_chain_id.eq.${idOrOnChainId},id.eq.${idOrOnChainId}`)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !campaign) {
      this.logger.error(`Campaign ${idOrOnChainId} not found in Supabase: ${error?.message}`);
      throw new NotFoundException(`Campaign ${idOrOnChainId} not found`);
    }

    // Check integrity against on-chain
    let onChainData = null;
    const computedHash = computeCanonicalMetadataHash({
      title: campaign.title,
      story: campaign.story,
      category: campaign.category,
      location: campaign.location,
    });

    let integrity = {
      isTampered: false,
      calculatedHash: computedHash,
      onChainHash: campaign.canonical_hash,
      status: 'TAMPER_FREE',
      details: 'Off-chain data matches computed hash.'
    };

    if (campaign.on_chain_id && Number(campaign.on_chain_id) > 0) {
      try {
        onChainData = await this.blockchainService.getCampaignFromChain(Number(campaign.on_chain_id));
        if (onChainData && onChainData.metadataHash) {
          const matchResult = verifyHashMatch(onChainData.metadataHash, computedHash);
          integrity = {
            isTampered: !matchResult.isMatch,
            calculatedHash: computedHash,
            onChainHash: onChainData.metadataHash,
            status: matchResult.status,
            details: matchResult.isMatch ? 'Hash matches immutable on-chain record.' : 'CRITICAL TAMPER DETECTED',
          };
        }
      } catch (chainErr) {
        this.logger.warn(`Could not read on-chain data for campaign ${campaign.on_chain_id}: ${chainErr}`);
      }
    }


    return {
      metadata: campaign,
      onChain: onChainData,
      integrity,
    };
  }

  async delete(id: number) {
    this.logger.log(`Admin requested deletion of campaign #${id}`);

    // Retrieve campaign first to find on_chain_id
    const { data: campaign } = await this.supabase
      .from('campaigns')
      .select('id, on_chain_id, title')
      .or(`id.eq.${id},on_chain_id.eq.${id}`)
      .maybeSingle();

    const targetIds = new Set<number>();
    targetIds.add(id);
    if (campaign?.id) targetIds.add(Number(campaign.id));
    if (campaign?.on_chain_id && Number(campaign.on_chain_id) > 0) {
      targetIds.add(Number(campaign.on_chain_id));
    }

    const idsList = Array.from(targetIds);

    // 1. Delete associated child records
    for (const cId of idsList) {
      try {
        await this.supabase.from('quotations').delete().eq('campaign_id', cId);
        await this.supabase.from('audit_events').delete().eq('campaign_id', cId);
        await this.supabase.from('spending_requests').delete().eq('on_chain_campaign_id', cId);
        await this.supabase.from('proof_documents').delete().eq('campaign_id', cId);
        await this.supabase.from('campaign_updates').delete().eq('campaign_id', cId);
        await this.supabase.from('automation_settings').delete().eq('campaign_id', cId);
      } catch (childErr: any) {
        this.logger.warn(`Non-fatal warning deleting child rows for campaign #${cId}: ${childErr.message}`);
      }
    }

    // 2. Delete the campaign row itself
    for (const cId of idsList) {
      const { error } = await this.supabase
        .from('campaigns')
        .delete()
        .or(`id.eq.${cId},on_chain_id.eq.${cId}`);
      if (error) {
        this.logger.error(`Error deleting campaign row ${cId}: ${error.message}`);
      }
    }

    this.logger.log(`✔ Successfully deleted campaign #${id} (${campaign?.title || ''})`);
    return {
      success: true,
      deletedId: id,
      title: campaign?.title || `Campaign #${id}`,
      message: `Campaign #${id} and associated records successfully deleted from database.`
    };
  }
}
