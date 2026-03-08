import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { GetCoursesQueryDto } from './dto/get-courses-query.dto';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  getCourses(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    )
    query: GetCoursesQueryDto,
  ) {
    return this.coursesService.getCourses(query);
  }
}
