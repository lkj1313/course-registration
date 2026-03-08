import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { GetProfessorsQueryDto } from './dto/get-professors-query.dto';
import { ProfessorsService } from './professors.service';

@Controller('professors')
export class ProfessorsController {
  constructor(private readonly professorsService: ProfessorsService) {}

  @Get()
  getProfessors(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    )
    query: GetProfessorsQueryDto,
  ) {
    return this.professorsService.getProfessors(query);
  }
}
