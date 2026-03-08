import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type GetStudentsQuery = {
  departmentId?: string;
  limit?: string;
  offset?: string;
};

@Injectable()
export class StudentsService {
  private readonly defaultLimit = 50;
  private readonly defaultOffset = 0;

  constructor(private readonly prisma: PrismaService) {}

  async getStudents(query: GetStudentsQuery) {
    const departmentId = this.parseOptionalInt(query.departmentId, 'departmentId', {
      min: 1,
    });
    const limit = this.parseOptionalInt(query.limit, 'limit', { min: 1 }) ?? this.defaultLimit;
    const offset =
      this.parseOptionalInt(query.offset, 'offset', { min: 0 }) ?? this.defaultOffset;

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

  private parseOptionalInt(
    value: string | undefined,
    fieldName: string,
    options: { min: number },
  ) {
    if (value === undefined) {
      return undefined;
    }

    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`${fieldName} must be a valid integer.`);
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed < options.min) {
      throw new BadRequestException(
        `${fieldName} must be an integer greater than or equal to ${options.min}.`,
      );
    }

    return parsed;
  }
}
