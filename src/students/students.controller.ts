import { Controller, Get, Query } from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  getStudents(
    @Query('departmentId') departmentId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.studentsService.getStudents({
      departmentId,
      limit,
      offset,
    });
  }
}
