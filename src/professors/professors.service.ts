import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetProfessorsQueryDto } from './dto/get-professors-query.dto';

@Injectable()
export class ProfessorsService {
  private readonly defaultLimit = 50;
  private readonly defaultOffset = 0;

  constructor(private readonly prisma: PrismaService) {}

  async getProfessors(query: GetProfessorsQueryDto) {
    const departmentId = query.departmentId;
    const limit = query.limit ?? this.defaultLimit;
    const offset = query.offset ?? this.defaultOffset;

    const where: Prisma.ProfessorWhereInput = departmentId
      ? { departmentId }
      : {};

    const [professors, total] = await Promise.all([
      this.prisma.professor.findMany({
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
      this.prisma.professor.count({ where }),
    ]);

    return {
      items: professors.map((professor) => ({
        id: professor.id,
        name: professor.name,
        departmentId: professor.departmentId,
        departmentName: professor.department.name,
      })),
      total,
      limit,
      offset,
    };
  }
}
