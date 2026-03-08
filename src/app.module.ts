import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';
import { DatabaseModule } from './database/database.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { PrismaModule } from './prisma/prisma.module';
import { StudentsModule } from './students/students.module';

@Module({
  imports: [PrismaModule, DatabaseModule, StudentsModule, EnrollmentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
