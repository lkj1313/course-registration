import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class StudentIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId!: number;
}
