import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetStudentsQueryDto } from './dto/get-students-query.dto';

@Injectable()
export class StudentsService {
  private readonly defaultLimit = 50;
  private readonly defaultOffset = 0;

  constructor(private readonly prisma: PrismaService) {}

  async getStudents(query: GetStudentsQueryDto) {
    const departmentId = query.departmentId;
    const limit = query.limit ?? this.defaultLimit;
    const offset = query.offset ?? this.defaultOffset;

    const where: Prisma.StudentWhereInput = departmentId
      ? { departmentId }
      : {};

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: offset,
        take: limit,
        include: {
          department: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      items: students.map((student) => ({
        id: student.id,
        studentNumber: student.studentNumber,
        name: student.name,
        departmentId: student.departmentId,
        departmentName: student.department.name,
      })),
      total,
      limit,
      offset,
    };
  }
}
