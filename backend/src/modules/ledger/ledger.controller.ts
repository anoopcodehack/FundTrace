import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';

@ApiTags('Audit Ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all transparency audit events from the smart contract' })
  @ApiQuery({ name: 'campaignId', required: false, type: Number })
  async getEvents(@Query('campaignId') campaignId?: string) {
    const cid = campaignId ? parseInt(campaignId, 10) : undefined;
    return this.ledgerService.getEvents(cid);
  }

  @Get(':campaignId')
  @ApiOperation({ summary: 'Get transparency events for a specific campaign ID' })
  async getCampaignEvents(@Param('campaignId', ParseIntPipe) campaignId: number) {
    return this.ledgerService.getEvents(campaignId);
  }
}
