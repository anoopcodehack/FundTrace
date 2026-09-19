import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { Campaign, CampaignDocument } from './schemas/campaign.schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  // In-memory fallback if MongoDB connection is pending/disabled in dev
  private inMemoryCampaigns: Map<string, any> = new Map();

  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
    private blockchainService: BlockchainService
  ) {
    this.seedDefaultDemoCampaign();
  }

  private seedDefaultDemoCampaign() {
    const demoPayload = {
      title: 'Build Rural STEM Lab',
      description: 'Equipping 10 rural schools with robotics starter kits, sensors, and microcontrollers.',
      category: 'Education',
      location: 'Rural District',
    };
    const metadataHash = this.computeMetadataHash(demoPayload);
    const demoCampaign = {
      _id: 'demo-stem-lab-1',
      onChainId: 1,
      title: demoPayload.title,
      description: demoPayload.description,
      category: demoPayload.category,
      location: demoPayload.location,
      creatorAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      verifierAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      goal: '3.0',
      deadline: Math.floor(Date.now() / 1000) + 86400 * 30,
      metadataHash,
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80',
      status: 'FundingClosed',
      createdAt: new Date(),
    };
    this.inMemoryCampaigns.set('1', demoCampaign);
    this.inMemoryCampaigns.set('demo-stem-lab-1', demoCampaign);
  }

  public computeMetadataHash(data: {
    title: string;
    description: string;
    category: string;
    location: string;
  }): string {
    // Deterministic canonical key ordering
    const canonicalObj = {
      title: data.title,
      description: data.description,
      category: data.category,
      location: data.location,
    };
    const jsonStr = JSON.stringify(canonicalObj);
    return ethers.keccak256(ethers.toUtf8Bytes(jsonStr));
  }

  async create(createDto: CreateCampaignDto) {
    const metadataHash = this.computeMetadataHash({
      title: createDto.title,
      description: createDto.description,
      category: createDto.category,
      location: createDto.location,
    });

    const campaignData = {
      ...createDto,
      metadataHash,
      status: 'PendingVerification',
    };

    try {
      const created = new this.campaignModel(campaignData);
      const saved = await created.save();
      const idKey = saved.onChainId ? String(saved.onChainId) : saved._id.toString();
      this.inMemoryCampaigns.set(idKey, saved.toObject());
      return saved;
    } catch (err) {
      this.logger.warn(`MongoDB not accessible, using memory fallback: ${err.message}`);
      const fallbackId = 'mem_' + Date.now();
      const fallbackDoc = { _id: fallbackId, ...campaignData, createdAt: new Date() };
      this.inMemoryCampaigns.set(fallbackId, fallbackDoc);
      if (createDto.onChainId) {
        this.inMemoryCampaigns.set(String(createDto.onChainId), fallbackDoc);
      }
      return fallbackDoc;
    }
  }

  async findAll() {
    try {
      const docs = await this.campaignModel.find().exec();
      if (docs && docs.length > 0) return docs;
    } catch (err) {
      this.logger.debug('Fetching from in-memory fallback store');
    }
    return Array.from(new Set(this.inMemoryCampaigns.values()));
  }

  async findOne(idOrOnChainId: string) {
    let campaign = null;
    try {
      if (!isNaN(Number(idOrOnChainId))) {
        campaign = await this.campaignModel.findOne({ onChainId: Number(idOrOnChainId) }).exec();
      }
      if (!campaign) {
        campaign = await this.campaignModel.findById(idOrOnChainId).exec();
      }
    } catch {
      // ignore Mongo error and fallback to memory
    }

    if (!campaign) {
      campaign = this.inMemoryCampaigns.get(idOrOnChainId);
    }

    if (!campaign) {
      throw new NotFoundException(`Campaign ${idOrOnChainId} not found`);
    }

    // Check integrity against on-chain if onChainId is present
    let onChainData = null;
    let integrity = {
      isTampered: false,
      calculatedHash: this.computeMetadataHash({
        title: campaign.title,
        description: campaign.description,
        category: campaign.category,
        location: campaign.location,
      }),
      onChainHash: campaign.metadataHash,
    };

    if (campaign.onChainId) {
      onChainData = await this.blockchainService.getCampaignFromChain(Number(campaign.onChainId));
      if (onChainData && onChainData.metadataHash) {
        integrity.onChainHash = onChainData.metadataHash;
        integrity.isTampered = integrity.calculatedHash !== onChainData.metadataHash;
      }
    }

    return {
      metadata: campaign,
      onChain: onChainData,
      integrity,
    };
  }
}
