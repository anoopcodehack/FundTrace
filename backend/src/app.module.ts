import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './modules/database/database.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ProofsModule } from './modules/proofs/proofs.module';
import { LedgerModule } from './modules/ledger/ledger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    BlockchainModule,
    CampaignsModule,
    ProofsModule,
    LedgerModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
