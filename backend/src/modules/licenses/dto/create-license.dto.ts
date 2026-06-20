import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateLicenseDto {
  @IsString()
  schoolId: string;

  @IsString()
  productId: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsNumber()
  pricePaid?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  paymentRef?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
