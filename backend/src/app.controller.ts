import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockchainService } from './modules/blockchain/blockchain.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './modules/database/supabase.provider';

@ApiTags('Health & System')
@Controller()
export class AppController {
  constructor(
    private readonly blockchainService: BlockchainService,
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient
  ) {}

  @Get()
  @ApiOperation({ summary: 'Backend service status and connected smart contract overview' })
  getStatus() {
    const deployment = this.blockchainService.getDeploymentInfo();
    return {
      status: 'ok',
      service: 'FundTrace NestJS Backend API',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      network: {
        chainId: deployment?.chainId || 31337,
        contractAddress: deployment?.address || 'Not Deployed',
        blockNumber: deployment?.blockNumber || 0,
      },
      docsUrl: '/api/docs',
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all seeded users and roles from Supabase' })
  async getUsers() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('wallet_address, name, role, avatar_url, bio, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      return [];
    }
  }
}
