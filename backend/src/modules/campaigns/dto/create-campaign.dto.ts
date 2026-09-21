import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Build Rural STEM Lab' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Equipping 10 rural schools with robotics starter kits, sensors, and microcontrollers.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Education' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Rural District' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({ example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' })
  @IsOptional()
  @IsString()
  creatorAddress?: string;

  @ApiPropertyOptional({ example: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' })
  @IsOptional()
  @IsString()
  verifierAddress?: string;

  @ApiProperty({ example: '3.0' })
  @IsString()
  @IsNotEmpty()
  goal: string;

  @ApiProperty({ example: 1735689600 })
  @IsNumber()
  deadline: number;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  onChainId?: number;
}

export class PrepareCampaignDto {
  @ApiProperty({ example: 'Build Rural STEM Lab' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Education' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Rural District' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 'A brief summary of your campaign' })
  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @ApiProperty({ example: 'Equipping 10 rural schools with robotics starter kits.' })
  @IsString()
  @IsNotEmpty()
  story: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ example: 'https://drive.google.com/...' })
  @IsOptional()
  @IsString()
  supportingDocs?: string;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  goalFtu: number;

  @ApiProperty({ example: '2026-12-31' })
  @IsString()
  @IsNotEmpty()
  deadline: string;

  @ApiProperty({ example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' })
  @IsString()
  @IsNotEmpty()
  creatorAddress: string;
}

export class ConfirmCampaignDto {
  @ApiProperty({ example: '0x123abc...' })
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  onChainId?: number;
}
