import { Module } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { ScoresController } from './scores.controller';
import { DatabaseModule } from '../database/database.module';
import { AiModule } from '../ai/ai.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [DatabaseModule, AiModule, BlockchainModule],
  providers: [ScoresService],
  controllers: [ScoresController],
  exports: [ScoresService],
})
export class ScoresModule {}
