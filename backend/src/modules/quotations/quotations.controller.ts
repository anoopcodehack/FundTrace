import {
  Controller, Post, Get, Patch, Param, Body, UploadedFile,
  UseInterceptors, ParseIntPipe, UseGuards, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuotationsService } from './quotations.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('quotations')
@UseGuards(RolesGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @Roles('CREATOR')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const dto = {
      campaignId: Number(body.campaignId),
      creatorAddress: body.creatorAddress,
      purpose: body.purpose,
      vendorName: body.vendorName,
      vendorContact: body.vendorContact,
      requestedAmountFtu: Number(body.requestedAmountFtu),
      items: typeof body.items === 'string' ? JSON.parse(body.items) : body.items || [],
    };
    return this.quotationsService.createQuotation(dto, file);
  }

  @Get()
  async findAll(@Query('creator') creator?: string) {
    return this.quotationsService.findAll(creator);
  }

  @Get('campaign/:campaignId')
  async findByCampaign(@Param('campaignId', ParseIntPipe) campaignId: number) {
    return this.quotationsService.findByCampaign(campaignId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id/sanction')
  @Roles('DONOR')
  async sanction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { sanctionedBy: string; allocatedAmountFtu: number; isAutomated?: boolean },
  ) {
    return this.quotationsService.sanctionQuotation(
      id,
      body.sanctionedBy,
      body.allocatedAmountFtu,
      body.isAutomated || false,
    );
  }

  @Patch(':id/reject')
  @Roles('DONOR')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rejectedBy: string; reason: string },
  ) {
    return this.quotationsService.rejectQuotation(id, body.rejectedBy, body.reason);
  }

  @Patch(':id/review')
  @Roles('DONOR')
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reviewedBy: string; reason: string },
  ) {
    return this.quotationsService.markForReview(id, body.reviewedBy, body.reason);
  }

  @Patch(':id/claim')
  @Roles('CREATOR')
  async recordClaim(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { claimAmountFtu: number; txHash: string },
  ) {
    return this.quotationsService.recordClaim(id, body.claimAmountFtu, body.txHash);
  }

  @Patch(':id/onchain-id')
  async updateOnChainId(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { onChainQuotationId: number },
  ) {
    return this.quotationsService.updateOnChainId(id, Number(body.onChainQuotationId));
  }

  @Post(':id/proof')
  @Roles('CREATOR')
  @UseInterceptors(FileInterceptor('file'))
  async submitProof(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { proofHash?: string; proofDocumentUrl?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.quotationsService.submitProof(
      id,
      body.proofHash || '',
      body.proofDocumentUrl || null,
      file,
    );
  }
}
