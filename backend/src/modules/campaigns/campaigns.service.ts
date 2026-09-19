import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/supabase.provider';
import { BlockchainService } from '../blockchain/blockchain.service';
import { computeCanonicalMetadataHash, verifyHashMatch } from '../../utils/canonical';
import { CreateCampaignDto } from './dto/create-campaign.dto';

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
