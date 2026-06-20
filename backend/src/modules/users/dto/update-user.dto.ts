import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
