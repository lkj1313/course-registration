import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { PrismaModule } from './prisma/prisma.module';
import { StudentsModule } from './students/students.module';

@Module({
  imports: [PrismaModule, DatabaseModule, StudentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
