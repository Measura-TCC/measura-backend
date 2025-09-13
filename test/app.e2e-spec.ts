import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@app/app.module';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
  message: string;
}

interface VersionResponse {
  version: string;
  nodeVersion: string;
  environment: string;
}

jest.setTimeout(60000); // Set global timeout to 60 seconds

describe('API Health Check (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    process.env.MONGODB_URI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/measura';
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'app.mongodb.uri') {
            return process.env.MONGODB_URI;
          }
          return process.env[key];
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    try {
      const connection = moduleFixture.get<Connection>(getConnectionToken());
      if (connection) {
        await connection.close();
      }
    } catch (error) {
      console.warn('Warning: Could not close MongoDB connection:', error);
    }

    if (app) {
      await app.close();
    }

    if (moduleFixture) {
      await moduleFixture.close();
    }

    if (global.gc) {
      global.gc();
    }
  });

  describe('Health Check', () => {
    it('should return 200 OK with health status', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const expectedResponse: HealthCheckResponse = {
            status: 'ok',
            timestamp: expect.any(String) as string,
            uptime: expect.any(Number) as number,
            message: 'Application is running',
          };
          expect(res.body).toEqual(expectedResponse);
        });
    });

    it('should return valid version information', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return request(app.getHttpServer())
        .get('/version')
        .expect(200)
        .expect((res) => {
          const expectedResponse: VersionResponse = {
            version: expect.any(String) as string,
            nodeVersion: expect.any(String) as string,
            environment: expect.any(String) as string,
          };
          expect(res.body).toEqual(expectedResponse);
        });
    });
  });
});
