import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/supabase.provider';
import { computeFileKeccak256, verifyHashMatch } from '../../utils/canonical';

export interface FileUploadResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  hash: string;
  storagePath: string;
}

@Injectable()
export class ProofsService {
  private readonly logger = new Logger(ProofsService.name);
  private bucket: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private configService: ConfigService
  ) {
    this.bucket = this.configService.get<string>('SUPABASE_STORAGE_BUCKET') || 'receipts';
  }

  public async saveFile(
    file: Express.Multer.File, 
    campaignId: number, 
    requestId: number, 
    documentType: 'quote' | 'invoice_original' | 'invoice_tampered' | 'receipt',
    isTamperedDemo: boolean = false
  ): Promise<FileUploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided or file buffer is empty');
    }

    const hash = computeFileKeccak256(file.buffer);
    const storagePath = `${campaignId}/${requestId}/${file.originalname}`;

    try {
      // 1. Upload to Supabase Storage
      const { error: storageError } = await this.supabase.storage
        .from(this.bucket)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (storageError) {
        this.logger.error(`Storage upload failed: ${storageError.message}`);
        throw new Error('Failed to upload file to Supabase Storage');
      }

      // 2. Save metadata to PostgreSQL
      const { error: dbError } = await this.supabase.from('proof_documents').upsert(
        {
          campaign_id: campaignId,
          request_id: requestId,
          document_type: documentType,
          file_name: file.originalname,
          mime_type: file.mimetype,
          file_size_bytes: file.size,
          file_hash: hash,
          storage_path: storagePath,
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: 'campaign_id,request_id,document_type' }
      );

      if (dbError) {
        this.logger.warn(`Failed to insert metadata to Supabase DB: ${dbError.message}`);
      }

      this.logger.log(`Stored ${documentType} file: ${file.originalname} (Hash: ${hash})`);

      return {
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        hash,
        storagePath,
      };
    } catch (err: any) {
      this.logger.error(`saveFile error: ${err.message}`);
      throw new BadRequestException('Failed to process file upload');
    }
  }

  public async getProofDocument(campaignId: number, requestId: number, documentType: string) {
    const { data, error } = await this.supabase
      .from('proof_documents')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('request_id', requestId)
      .eq('document_type', documentType)
      .single();

    if (error || !data) {
      throw new NotFoundException('Proof document not found');
    }

    return data;
  }

  public async verifyCandidateFileHash(candidateBuffer: Buffer, onChainHash: string) {
    const computedHash = computeFileKeccak256(candidateBuffer);
    const { isMatch, status } = verifyHashMatch(onChainHash, computedHash);

    return {
      target: "receipt_proof",
      onChainHash,
      computedHash,
      isMatch,
      status,
      details: isMatch
        ? "MATCH: File is authentic."
        : "VERIFICATION FAILED: Hash mismatch.",
    };
  }
}
