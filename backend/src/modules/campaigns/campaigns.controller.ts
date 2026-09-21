import { Body, Controller, Get, Param, Post, Delete, HttpException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, PrepareCampaignDto, ConfirmCampaignDto } from './dto/create-campaign.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(RolesGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles('CREATOR')
  @ApiOperation({ summary: 'Create campaign metadata and compute on-chain metadataHash' })
  @ApiResponse({ status: 201, description: 'Campaign metadata stored and hash calculated' })
  async create(@Body() createDto: CreateCampaignDto) {
    return this.campaignsService.create(createDto);
  }

  @Post('prepare')
  @Roles('CREATOR')
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
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Confirm a campaign creation transaction' })
  @ApiResponse({ status: 201, description: 'Campaign confirmed' })
  async confirm(@Param('id') id: string, @Body() confirmDto: ConfirmCampaignDto) {
    return this.campaignsService.confirmCampaign(id, confirmDto.txHash, confirmDto.onChainId);
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

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a campaign and associated records from database' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  async delete(@Param('id') id: string) {
    return this.campaignsService.delete(Number(id));
  }
}
