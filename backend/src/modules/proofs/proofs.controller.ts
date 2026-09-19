import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ProofsService } from './proofs.service';

@ApiTags('Proofs & Quotes')
@Controller('proofs')
export class ProofsController {
  constructor(private readonly proofsService: ProofsService) {}

  @Post('upload-quote')
  @ApiOperation({ summary: 'Upload spending estimate quote PDF and return requestHash' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadQuote(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return this.proofsService.saveFile(file, 'quote');
  }

  @Post('upload-receipt')
  @ApiOperation({ summary: 'Upload expenditure invoice/receipt PDF and return receiptHash' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadReceipt(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return this.proofsService.saveFile(file, 'receipt');
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

    const calculatedHash = this.proofsService.computeKeccak256(file.buffer);
    const matches = this.proofsService.verifyHash(calculatedHash, expectedHash);

    return {
      matches,
      calculatedHash,
      expectedHash,
      status: matches ? 'MATCH - Document is untampered' : 'MISMATCH - Document does not match on-chain record',
    };
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Download stored quote or receipt document' })
  downloadFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.proofsService.getFilePath(filename);
    res.sendFile(filePath);
  }
}
