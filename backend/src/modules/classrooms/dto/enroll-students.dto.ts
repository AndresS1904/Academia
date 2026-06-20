import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class EnrollStudentsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  studentIds: string[];
}
