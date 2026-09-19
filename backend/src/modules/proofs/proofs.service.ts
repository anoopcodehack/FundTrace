import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

export interface FileUploadResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  hash: string;
  downloadUrl: string;
}

@Injectable()
export class ProofsService {
  private readonly logger = new Logger(ProofsService.name);
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.resolve(
      process.cwd(),
      this.configService.get<string>('UPLOAD_DIR') || './uploads'
    );
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public computeKeccak256(buffer: Buffer): string {
    return ethers.keccak256(new Uint8Array(buffer));
  }

  public async saveFile(file: Express.Multer.File, category: 'quote' | 'receipt'): Promise<FileUploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided or file buffer is empty');
    }

    const hash = this.computeKeccak256(file.buffer);
    const ext = path.extname(file.originalname) || '.pdf';
    const filename = `${category}-${Date.now()}-${hash.slice(2, 10)}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);
    this.logger.log(`Stored ${category} file: ${filename} (Hash: ${hash})`);

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      hash,
      downloadUrl: `/api/proofs/download/${filename}`,
    };
  }

  public verifyHash(calculatedHash: string, expectedHash: string): boolean {
    if (!calculatedHash || !expectedHash) return false;
    return calculatedHash.toLowerCase() === expectedHash.toLowerCase();
  }

  public getFilePath(filename: string): string {
    const filePath = path.join(this.uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      // Check demo-files fallback
      const demoCandidate = path.resolve(process.cwd(), '../demo-files', filename);
      if (fs.existsSync(demoCandidate)) {
        return demoCandidate;
      }
      throw new NotFoundException(`File ${filename} not found`);
    }
    return filePath;
  }
}
