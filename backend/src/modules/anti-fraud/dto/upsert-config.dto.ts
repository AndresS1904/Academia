import { IsBoolean, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpsertSecurityConfigDto {
  @IsString()
  evaluationType: string;

  @IsString()
  evaluationId: string;

  @IsOptional() @IsBoolean() fullscreenRequired?: boolean;
  @IsOptional() @IsBoolean() tabSwitchDetection?: boolean;
  @IsOptional() @IsBoolean() antiCopyEnabled?: boolean;
  @IsOptional() @IsBoolean() webcamRequired?: boolean;
  @IsOptional() @IsBoolean() webcamSnapshots?: boolean;
  @IsOptional() @IsInt() @Min(10) @Max(300) snapshotIntervalSec?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) maxViolations?: number;
  @IsOptional() @IsBoolean() autoSubmitOnFraud?: boolean;
}
