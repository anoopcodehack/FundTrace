import { Controller, Get, Put, Body, Query, Param, ParseIntPipe } from '@nestjs/common';
import { AutomationService, DonorAutomationSetting } from './automation.service';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  /**
   * GET /automation/settings?donorAddress=0x...&campaignId=1
   * Fetch automation setting for a specific donor + campaign pair.
   */
  @Get('settings')
  async getSetting(
    @Query('campaignId') campaignId: string,
    @Query('donorAddress') donorAddress: string,
  ) {
    return this.automationService.getSetting(Number(campaignId), donorAddress);
  }

  /**
   * GET /automation/settings/campaign/:campaignId
   * List all donor automation settings for a campaign (admin view).
   */
  @Get('settings/campaign/:campaignId')
  async getCampaignSettings(@Param('campaignId', ParseIntPipe) campaignId: number) {
    return this.automationService.getCampaignSettings(campaignId);
  }

  /**
   * PUT /automation/settings
   * Create or update a donor's automation setting.
   * Body: { campaignId, donorAddress, isEnabled, maxAutoAmount, requireManualHighRisk, autoRejectFraud }
   */
  @Put('settings')
  async upsertSetting(@Body() body: DonorAutomationSetting) {
    return this.automationService.upsertSetting(body);
  }
}
