import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Factory de mock de modelos de Prisma.
 * Cada modelo expone los métodos usados por servicios que se ejecutan en onModuleInit.
 */
function prismaModelMock() {
  return {
    upsert: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue({}),
  };
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SPOTIFY_CLIENT_ID ??= 'test-spotify-client-id';
    process.env.SPOTIFY_CLIENT_SECRET ??= 'test-spotify-client-secret';
    process.env.SPOTIFY_REFRESH_TOKEN ??= 'test-spotify-refresh-token';
  });

  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      // Modelos usados por servicios en onModuleInit
      serverMetric: prismaModelMock(),
      requestLog: prismaModelMock(),
      persona: prismaModelMock(),
      aIThread: prismaModelMock(),
      aIMessage: prismaModelMock(),
      project: prismaModelMock(),
      contactMessage: prismaModelMock(),
      onBoardingStatus: prismaModelMock(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
  });
});