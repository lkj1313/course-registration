import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from './../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    if (prisma) {
      await prisma.enrollment.deleteMany();
      await prisma.course.updateMany({
        data: {
          enrolledCount: 0,
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          status: 'ok',
          timestamp: expect.any(String),
        });
      });
  });

  it('/students (GET)', () => {
    return request(app.getHttpServer())
      .get('/students')
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBeGreaterThanOrEqual(10000);
        expect(body.limit).toBe(50);
        expect(body.offset).toBe(0);
        expect(body.items).toHaveLength(50);
        expect(body.items[0]).toEqual({
          id: expect.any(Number),
          studentNumber: expect.any(String),
          name: expect.any(String),
          departmentId: expect.any(Number),
          departmentName: expect.any(String),
        });
      });
  });

  it('/professors (GET)', () => {
    return request(app.getHttpServer())
      .get('/professors')
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBeGreaterThanOrEqual(100);
        expect(body.limit).toBe(50);
        expect(body.offset).toBe(0);
        expect(body.items).toHaveLength(50);
        expect(body.items[0]).toEqual({
          id: expect.any(Number),
          name: expect.any(String),
          departmentId: expect.any(Number),
          departmentName: expect.any(String),
        });
      });
  });

  it('/students/:studentId/timetable (GET)', async () => {
    const student = await prisma.student.findFirstOrThrow({
      orderBy: { id: 'asc' },
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
    const semester = await prisma.semester.findFirstOrThrow({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
    });
    const courses = await prisma.course.findMany({
      where: {
        semesterId: semester.id,
      },
      orderBy: { id: 'asc' },
      take: 2,
      select: {
        id: true,
        credits: true,
        code: true,
        name: true,
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
    });

    await prisma.enrollment.createMany({
      data: courses.map((course) => ({
        studentId: student.id,
        courseId: course.id,
        semesterId: semester.id,
      })),
    });

    await request(app.getHttpServer())
      .get(`/students/${student.id}/timetable`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.student).toEqual({
          id: student.id,
          studentNumber: student.studentNumber,
          name: student.name,
          departmentId: student.departmentId,
          departmentName: student.department.name,
        });
        expect(body.semester).toBe(semester.name);
        expect(body.totalCredits).toBe(
          courses.reduce((sum, course) => sum + course.credits, 0),
        );
        expect(body.items).toHaveLength(2);
        expect(body.items[0]).toEqual({
          courseId: expect.any(Number),
          code: expect.any(String),
          name: expect.any(String),
          credits: expect.any(Number),
          professorName: expect.any(String),
          schedule: expect.any(String),
        });
      });
  });

  it('/enrollments (POST)', async () => {
    const student = await prisma.student.findFirstOrThrow({
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    const course = await prisma.course.findFirstOrThrow({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    await request(app.getHttpServer())
      .post('/enrollments')
      .send({
        studentId: student.id,
        courseId: course.id,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          id: expect.any(Number),
          studentId: student.id,
          courseId: course.id,
          semester: expect.any(String),
          createdAt: expect.any(String),
        });
      });

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId: course.id,
        },
      },
    });
    const updatedCourse = await prisma.course.findUniqueOrThrow({
      where: { id: course.id },
      select: { enrolledCount: true },
    });

    expect(enrollment).not.toBeNull();
    expect(updatedCourse.enrolledCount).toBe(1);
  });

  it('/enrollments (DELETE)', async () => {
    const student = await prisma.student.findFirstOrThrow({
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    const course = await prisma.course.findFirstOrThrow({
      orderBy: { id: 'asc' },
      select: { id: true, semesterId: true },
    });

    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id,
        semesterId: course.semesterId,
      },
    });
    await prisma.course.update({
      where: { id: course.id },
      data: {
        enrolledCount: 1,
      },
    });

    await request(app.getHttpServer())
      .delete('/enrollments')
      .send({
        studentId: student.id,
        courseId: course.id,
      })
      .expect(200)
      .expect({
        success: true,
      });

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId: course.id,
        },
      },
    });
    const updatedCourse = await prisma.course.findUniqueOrThrow({
      where: { id: course.id },
      select: { enrolledCount: true },
    });

    expect(enrollment).toBeNull();
    expect(updatedCourse.enrolledCount).toBe(0);
  });

  it('/enrollments handles concurrent requests without exceeding capacity', async () => {
    const students = await prisma.student.findMany({
      orderBy: { id: 'asc' },
      take: 100,
      select: { id: true },
    });
    const course = await prisma.course.findFirstOrThrow({
      orderBy: { id: 'asc' },
      select: { id: true, capacity: true },
    });

    await prisma.course.update({
      where: { id: course.id },
      data: {
        enrolledCount: course.capacity - 1,
      },
    });

    const responses = await Promise.all(
      students.map((student) =>
        request(app.getHttpServer()).post('/enrollments').send({
          studentId: student.id,
          courseId: course.id,
        }),
      ),
    );

    const successResponses = responses.filter((response) => response.status === 201);
    const fullResponses = responses.filter(
      (response) =>
        response.status === 409 && response.body.code === 'COURSE_FULL',
    );
    const finalCourse = await prisma.course.findUniqueOrThrow({
      where: { id: course.id },
      select: { enrolledCount: true, capacity: true },
    });

    expect(successResponses).toHaveLength(1);
    expect(fullResponses).toHaveLength(99);
    expect(finalCourse.enrolledCount).toBe(finalCourse.capacity);
  });
});
