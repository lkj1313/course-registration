import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class EnrollmentRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId!: number;
}
