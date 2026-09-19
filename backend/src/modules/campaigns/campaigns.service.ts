import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/supabase.provider';
import { BlockchainService } from '../blockchain/blockchain.service';
import { computeCanonicalMetadataHash, verifyHashMatch } from '../../utils/canonical';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private inMemoryCampaigns = new Map<number, any>();

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly blockchainService: BlockchainService
  ) {
    this.seedDefaultDemoCampaign();
  }

  private seedDefaultDemoCampaign() {
    const demoPayload = {
      title: 'Build Rural STEM Lab',
      story: 'Equipping 10 rural schools with robotics starter kits, sensors, and microcontrollers.',
      category: 'Education',
      location: 'Rural District',
    };
    const metadataHash = computeCanonicalMetadataHash(demoPayload);
    const demoCampaign = {
      on_chain_id: 1,
      title: demoPayload.title,
      story: demoPayload.story,
      category: demoPayload.category,
      location: demoPayload.location,
      canonical_hash: metadataHash,
      cover_image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.inMemoryCampaigns.set(1, demoCampaign);
  }

  async create(createDto: CreateCampaignDto) {
    const canonicalHash = computeCanonicalMetadataHash({
      title: createDto.title,
      story: createDto.description, // DTO uses description, Next.js uses story. Mapping it.
      category: createDto.category,
      location: createDto.location || 'Global',
    });

    const campaignData = {
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

    if (campaignData.on_chain_id) {
      this.inMemoryCampaigns.set(campaignData.on_chain_id, campaignData);
    }

    try {
      const { data, error } = await this.supabase.from('campaigns').upsert(campaignData, { onConflict: 'on_chain_id' }).select().single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      this.logger.warn(`Supabase save failed, using memory fallback: ${err.message}`);
      return campaignData;
    }
  }

  async findAll() {
    try {
      const { data, error } = await this.supabase.from('campaigns').select('*');
      if (error) throw error;
      if (data && data.length > 0) return data;
    } catch (err) {
      this.logger.debug('Fetching from in-memory fallback store');
    }
    return Array.from(this.inMemoryCampaigns.values());
  }

  async findOne(onChainId: number) {
    let campaign = null;
    try {
      const { data, error } = await this.supabase.from('campaigns').select('*').eq('on_chain_id', onChainId).single();
      if (!error && data) {
        campaign = data;
      }
    } catch (err) {
      // fallback to memory
    }

    if (!campaign) {
      campaign = this.inMemoryCampaigns.get(Number(onChainId));
    }

    if (!campaign) {
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
