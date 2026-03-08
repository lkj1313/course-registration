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
    await prisma.enrollment.deleteMany();
    await prisma.course.updateMany({
      data: {
        enrolledCount: 0,
      },
    });
    await app.close();
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
});
