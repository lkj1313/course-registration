import { Body, Controller, Delete, Post, ValidationPipe } from '@nestjs/common';
import { EnrollmentRequestDto } from './dto/enrollment-request.dto';
import { EnrollmentsService } from './enrollments.service';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  enroll(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    )
    body: EnrollmentRequestDto,
  ) {
    return this.enrollmentsService.enroll(body);
  }

  @Delete()
  cancel(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    )
    body: EnrollmentRequestDto,
  ) {
    return this.enrollmentsService.cancel(body);
  }
}
