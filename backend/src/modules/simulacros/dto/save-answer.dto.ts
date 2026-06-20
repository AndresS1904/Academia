import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SaveAnswerDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsString()
  selectedOptionId?: string;

  @IsOptional()
  @IsBoolean()
  isFlagged?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSeconds?: number;
}
