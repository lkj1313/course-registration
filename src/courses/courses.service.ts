import { Injectable } from '@nestjs/common';
import { DayOfWeek, Prisma, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetCoursesQueryDto } from './dto/get-courses-query.dto';

const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
};

const PERIOD_TIMES = [
  '',
  '09:00',
  '10:30',
  '13:00',
  '14:30',
  '16:00',
  '17:30',
  '19:00',
  '20:30',
] as const;

@Injectable()
export class CoursesService {
  private readonly defaultLimit = 50;
  private readonly defaultOffset = 0;

  constructor(private readonly prisma: PrismaService) {}

  async getCourses(query: GetCoursesQueryDto) {
    const departmentId = query.departmentId;
    const limit = query.limit ?? this.defaultLimit;
    const offset = query.offset ?? this.defaultOffset;

    const where: Prisma.CourseWhereInput = {
      semester: {
        status: SemesterStatus.ACTIVE,
      },
      ...(departmentId ? { departmentId } : {}),
    };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
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
          professor: {
            select: {
              name: true,
            },
          },
          semester: {
            select: {
              name: true,
            },
          },
          schedules: {
            orderBy: [{ dayOfWeek: 'asc' }, { startPeriod: 'asc' }],
            select: {
              dayOfWeek: true,
              startPeriod: true,
              endPeriod: true,
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      items: courses.map((course) => ({
        id: course.id,
        code: course.code,
        name: course.name,
        departmentId: course.departmentId,
        departmentName: course.department.name,
        professorId: course.professorId,
        professorName: course.professor.name,
        credits: course.credits,
        capacity: course.capacity,
        enrolled: course.enrolledCount,
        schedule: this.formatSchedule(course.schedules),
        semester: course.semester.name,
      })),
      total,
      limit,
      offset,
    };
  }

  private formatSchedule(
    schedules: Array<{
      dayOfWeek: DayOfWeek;
      startPeriod: number;
      endPeriod: number;
    }>,
  ) {
    return schedules
      .map((schedule) => {
        const start = PERIOD_TIMES[schedule.startPeriod];
        const end = PERIOD_TIMES[schedule.endPeriod];

        return `${DAY_LABELS[schedule.dayOfWeek]} ${start}-${end}`;
      })
      .join(', ');
  }
}
