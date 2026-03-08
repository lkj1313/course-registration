import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
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
});
