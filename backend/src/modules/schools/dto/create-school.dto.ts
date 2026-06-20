import { IsString, IsOptional, IsEmail, IsObject } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsObject()
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    dark?: string;
  };

  @IsOptional()
  @IsObject()
  pageContent?: Record<string, unknown>;
}
