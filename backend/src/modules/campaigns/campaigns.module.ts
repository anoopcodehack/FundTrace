import { Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { Campaign, CampaignSchema } from './schemas/campaign.schema';
import { DATABASE_CONNECTION } from '../database/database.provider';

@Module({
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    {
      provide: getModelToken(Campaign.name),
      useFactory: () => {
        return (
          mongoose.models[Campaign.name] ||
          mongoose.model(Campaign.name, CampaignSchema)
        );
      },
      inject: [DATABASE_CONNECTION],
    },
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
