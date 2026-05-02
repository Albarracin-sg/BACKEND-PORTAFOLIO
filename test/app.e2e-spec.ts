import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let AppModule: any;

  beforeAll(async () => {
    process.env.SPOTIFY_CLIENT_ID ??= 'test-spotify-client-id';
    process.env.SPOTIFY_CLIENT_SECRET ??= 'test-spotify-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN ??= 'test-spotify-refresh-token';

    ({ AppModule } = require('../src/app.module'));
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200);
  });
});
