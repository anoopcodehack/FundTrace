import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create campaign metadata and compute on-chain metadataHash' })
  @ApiResponse({ status: 201, description: 'Campaign metadata stored and hash calculated' })
  async create(@Body() createDto: CreateCampaignDto) {
    return this.campaignsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all campaigns' })
  async findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details by ID or on-chain ID, including tamper-check' })
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(Number(id));
  }
}
