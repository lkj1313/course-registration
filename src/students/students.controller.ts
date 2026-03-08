import { Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common';
import { GetStudentsQueryDto } from './dto/get-students-query.dto';
import { StudentIdParamDto } from './dto/student-id-param.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  getStudents(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    )
    query: GetStudentsQueryDto,
  ) {
    return this.studentsService.getStudents(query);
  }

  @Get(':studentId/timetable')
  getTimetable(
    @Param(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    )
    params: StudentIdParamDto,
  ) {
    return this.studentsService.getTimetable(params.studentId);
  }
}
