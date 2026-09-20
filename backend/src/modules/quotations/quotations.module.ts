import { Module } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { DatabaseModule } from '../database/database.module';
import { AiModule } from '../ai/ai.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { ScoresModule } from '../scores/scores.module';

@Module({
  imports: [DatabaseModule, AiModule, BlockchainModule, ScoresModule],
  providers: [QuotationsService],
  controllers: [QuotationsController],
  exports: [QuotationsService],
})
export class QuotationsModule {}
