import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { ProofsService } from './proofs.service';

@ApiTags('Proofs & Quotes')
@Controller('proofs')
export class ProofsController {
  constructor(private readonly proofsService: ProofsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload document proof to Supabase Storage and PostgreSQL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        campaignId: { type: 'number' },
        requestId: { type: 'number' },
        documentType: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('campaignId') campaignId: string,
    @Body('requestId') requestId: string,
    @Body('documentType') documentType: 'quote' | 'invoice_original' | 'invoice_tampered' | 'receipt'
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!campaignId || !requestId || !documentType) {
      throw new BadRequestException('campaignId, requestId, and documentType are required');
    }

    return this.proofsService.saveFile(
      file,
      Number(campaignId),
      Number(requestId),
      documentType
    );
  }

  @Post('verify')
  @ApiOperation({ summary: 'Upload document and verify its Keccak-256 hash against expected on-chain hash' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        expectedHash: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async verifyDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('expectedHash') expectedHash: string
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!expectedHash) throw new BadRequestException('expectedHash is required');

    return this.proofsService.verifyCandidateFileHash(file.buffer, expectedHash);
  }

  @Get(':campaignId/:requestId/:documentType')
  @ApiOperation({ summary: 'Get stored proof document metadata' })
  async getDocument(
    @Param('campaignId') campaignId: string,
    @Param('requestId') requestId: string,
    @Param('documentType') documentType: string
  ) {
    return this.proofsService.getProofDocument(Number(campaignId), Number(requestId), documentType);
  }
}
