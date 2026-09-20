import { Body, Controller, Get, Param, Post, HttpException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, PrepareCampaignDto, ConfirmCampaignDto } from './dto/create-campaign.dto';

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

  @Post('prepare')
  @ApiOperation({ summary: 'Prepare campaign transaction and store off-chain metadata' })
  @ApiResponse({ status: 201, description: 'Transaction data generated' })
  async prepare(@Body() prepareDto: PrepareCampaignDto) {
    try {
      return await this.campaignsService.prepareCampaign(prepareDto);
    } catch (err: any) {
      throw new HttpException(err.message || 'Error', 400);
    }
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a campaign creation transaction' })
  @ApiResponse({ status: 201, description: 'Campaign confirmed' })
  async confirm(@Param('id') id: string, @Body() confirmDto: ConfirmCampaignDto) {
    return this.campaignsService.confirmCampaign(id, confirmDto.txHash);
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
