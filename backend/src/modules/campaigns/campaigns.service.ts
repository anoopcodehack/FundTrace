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
      if (dto.durationDays <= 0) throw new Error("Invalid duration");

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

      const deadline = Math.floor(Date.now() / 1000) + dto.durationDays * 86400;
      
      // Default institutional verifier
      const defaultVerifier = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'; 
      const goalWei = ethers.parseEther(dto.goalFtu.toString());

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

  async confirmCampaign(id: string, txHash: string) {
    const provider = this.blockchainService.getProvider();
    const contract = this.blockchainService.getContract();
    if (!contract || !provider) throw new Error("Blockchain not connected");

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) throw new Error("Transaction receipt not found");

    let onChainId = null;
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
      } catch (e) {
        // Not all logs will parse with our contract interface, ignore errors
      }
    }

    if (onChainId === null) {
      // Just save the txHash for now if we can't parse it
      await this.supabase.from('campaigns').update({ tx_hash: txHash }).eq('id', id);
      return { status: 'pending_confirmation', txHash };
    }

    // Update with the confirmed on_chain_id
    await this.supabase.from('campaigns').update({ 
      on_chain_id: onChainId,
      tx_hash: txHash 
    }).eq('id', id);

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

  async findOne(onChainId: number) {
    const { data: campaign, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('on_chain_id', onChainId)
      .single();

    if (error || !campaign) {
      this.logger.error(`Campaign ${onChainId} not found in Supabase: ${error?.message}`);
      throw new NotFoundException(`Campaign ${onChainId} not found`);
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

    if (campaign.on_chain_id) {
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
    }

    return {
      metadata: campaign,
      onChain: onChainData,
      integrity,
    };
  }
}
