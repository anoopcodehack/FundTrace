import {
  Controller, Post, Get, Patch, Param, Body, UploadedFile,
  UseInterceptors, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuotationsService } from './quotations.service';

@Controller('api/quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
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

  @Get('campaign/:campaignId')
  async findByCampaign(@Param('campaignId', ParseIntPipe) campaignId: number) {
    return this.quotationsService.findByCampaign(campaignId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id/sanction')
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
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rejectedBy: string; reason: string },
  ) {
    return this.quotationsService.rejectQuotation(id, body.rejectedBy, body.reason);
  }

  @Patch(':id/claim')
  async recordClaim(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { claimAmountFtu: number; txHash: string },
  ) {
    return this.quotationsService.recordClaim(id, body.claimAmountFtu, body.txHash);
  }

  @Post(':id/proof')
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
