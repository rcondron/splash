import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { VoyageStatus } from '@prisma/client';

export class CreateVoyageDto {
  @IsString()
  @IsNotEmpty()
  voyageName!: string;

  @IsString()
  @IsNotEmpty()
  internalReference!: string;

  @IsOptional()
  @IsString()
  vesselName?: string;

  @IsOptional()
  @IsString()
  imoNumber?: string;

  @IsOptional()
  @IsString()
  ownerCompanyName?: string;

  @IsOptional()
  @IsString()
  chartererCompanyName?: string;

  @IsOptional()
  @IsString()
  brokerCompanyName?: string;

  @IsOptional()
  @IsString()
  cargoType?: string;

  @IsOptional()
  @IsString()
  cargoQuantity?: string;

  @IsOptional()
  @IsString()
  loadPort?: string;

  @IsOptional()
  @IsString()
  dischargePort?: string;

  @IsOptional()
  @IsDateString()
  laycanStart?: string;

  @IsOptional()
  @IsDateString()
  laycanEnd?: string;

  @IsOptional()
  @IsString()
  freightRate?: string;

  @IsOptional()
  @IsString()
  freightCurrency?: string;

  @IsOptional()
  @IsString()
  rateBasis?: string;

  @IsOptional()
  @IsEnum(VoyageStatus)
  status?: VoyageStatus;
}
