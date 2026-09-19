import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CampaignDocument = Campaign & Document;

@Schema({ timestamps: true })
export class Campaign {
  @Prop({ unique: true, sparse: true })
  onChainId?: number;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  creatorAddress: string;

  @Prop({ required: true })
  verifierAddress: string;

  @Prop({ required: true })
  goal: string;

  @Prop({ required: true })
  deadline: number;

  @Prop({ required: true })
  metadataHash: string;

  @Prop()
  imageUrl?: string;

  @Prop({ default: 'PendingVerification' })
  status: string;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
