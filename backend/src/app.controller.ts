import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockchainService } from './modules/blockchain/blockchain.service';

@ApiTags('Health & System')
@Controller()
export class AppController {
  constructor(private readonly blockchainService: BlockchainService) {}

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
}
