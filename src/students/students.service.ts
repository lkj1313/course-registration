import { Injectable, NotFoundException } from '@nestjs/common';
import { DayOfWeek, Prisma, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetStudentsQueryDto } from './dto/get-students-query.dto';

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

  async getTimetable(studentId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentNumber: true,
        name: true,
        departmentId: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        code: 'STUDENT_NOT_FOUND',
        message: 'Student not found.',
      });
    }

    const semester = await this.prisma.semester.findFirstOrThrow({
      where: { status: SemesterStatus.ACTIVE },
      select: {
        id: true,
        name: true,
      },
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        semesterId: semester.id,
      },
      orderBy: {
        courseId: 'asc',
      },
      select: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            professor: {
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
        },
      },
    });

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        name: student.name,
        departmentId: student.departmentId,
        departmentName: student.department.name,
      },
      semester: semester.name,
      totalCredits: enrollments.reduce(
        (sum, enrollment) => sum + enrollment.course.credits,
        0,
      ),
      items: enrollments.map((enrollment) => ({
        courseId: enrollment.course.id,
        code: enrollment.course.code,
        name: enrollment.course.name,
        credits: enrollment.course.credits,
        professorName: enrollment.course.professor.name,
        schedule: this.formatSchedule(enrollment.course.schedules),
      })),
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
