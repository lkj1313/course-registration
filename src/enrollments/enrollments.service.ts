import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentRequestDto } from './dto/enrollment-request.dto';

type ScheduleSlot = {
  dayOfWeek: string;
  startPeriod: number;
  endPeriod: number;
};

@Injectable()
export class EnrollmentsService {
  private readonly maxCredits = 18;

  constructor(private readonly prisma: PrismaService) {}

  async enroll(request: EnrollmentRequestDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockStudent(tx, request.studentId);

      const course = await this.lockAndGetCourse(tx, request.courseId);

      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: request.studentId,
            courseId: request.courseId,
          },
        },
        select: { id: true },
      });

      if (existingEnrollment) {
        throw this.conflict(
          'ALREADY_ENROLLED',
          'The student is already enrolled in this course.',
        );
      }

      if (course.enrolledCount >= course.capacity) {
        throw this.conflict(
          'COURSE_FULL',
          'The course capacity has been reached.',
        );
      }

      const currentEnrollments = await tx.enrollment.findMany({
        where: {
          studentId: request.studentId,
          semesterId: course.semesterId,
        },
        select: {
          course: {
            select: {
              credits: true,
              schedules: {
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

      const totalCredits =
        currentEnrollments.reduce(
          (sum, enrollment) => sum + enrollment.course.credits,
          0,
        ) + course.credits;

      if (totalCredits > this.maxCredits) {
        throw this.conflict(
          'CREDIT_LIMIT_EXCEEDED',
          'The student cannot exceed 18 credits.',
        );
      }

      const hasScheduleConflict = currentEnrollments.some((enrollment) =>
        this.hasScheduleConflict(enrollment.course.schedules, course.schedules),
      );

      if (hasScheduleConflict) {
        throw this.conflict(
          'SCHEDULE_CONFLICT',
          'The student has a schedule conflict with the selected course.',
        );
      }

      const enrollment = await tx.enrollment.create({
        data: {
          studentId: request.studentId,
          courseId: request.courseId,
          semesterId: course.semesterId,
        },
        select: {
          id: true,
          studentId: true,
          courseId: true,
          createdAt: true,
        },
      });

      await tx.course.update({
        where: { id: request.courseId },
        data: {
          enrolledCount: {
            increment: 1,
          },
        },
      });

      return {
        id: enrollment.id,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        semester: course.semester.name,
        createdAt: enrollment.createdAt.toISOString(),
      };
    });
  }

  async cancel(request: EnrollmentRequestDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockStudent(tx, request.studentId);
      await this.lockAndGetCourse(tx, request.courseId);

      const enrollment = await tx.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: request.studentId,
            courseId: request.courseId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!enrollment) {
        throw this.notFound(
          'ENROLLMENT_NOT_FOUND',
          'Enrollment not found.',
        );
      }

      await tx.enrollment.delete({
        where: { id: enrollment.id },
      });

      await tx.course.update({
        where: { id: request.courseId },
        data: {
          enrolledCount: {
            decrement: 1,
          },
        },
      });

      return {
        success: true,
      };
    });
  }

  private async lockStudent(
    tx: Prisma.TransactionClient,
    studentId: number,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT "id"
      FROM "Student"
      WHERE "id" = ${studentId}
      FOR UPDATE
    `);

    if (rows.length === 0) {
      throw this.notFound('STUDENT_NOT_FOUND', 'Student not found.');
    }
  }

  private async lockAndGetCourse(
    tx: Prisma.TransactionClient,
    courseId: number,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT "id"
      FROM "Course"
      WHERE "id" = ${courseId}
      FOR UPDATE
    `);

    if (rows.length === 0) {
      throw this.notFound('COURSE_NOT_FOUND', 'Course not found.');
    }

    return tx.course.findUniqueOrThrow({
      where: { id: courseId },
      select: {
        id: true,
        credits: true,
        capacity: true,
        enrolledCount: true,
        semesterId: true,
        semester: {
          select: {
            name: true,
          },
        },
        schedules: {
          select: {
            dayOfWeek: true,
            startPeriod: true,
            endPeriod: true,
          },
        },
      },
    });
  }

  private hasScheduleConflict(
    enrolledSchedules: ScheduleSlot[],
    targetSchedules: ScheduleSlot[],
  ) {
    return enrolledSchedules.some((enrolled) =>
      targetSchedules.some(
        (target) =>
          enrolled.dayOfWeek === target.dayOfWeek &&
          enrolled.startPeriod < target.endPeriod &&
          target.startPeriod < enrolled.endPeriod,
      ),
    );
  }

  private notFound(code: string, message: string) {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      code,
      message,
    });
  }

  private conflict(code: string, message: string) {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      code,
      message,
    });
  }
}
