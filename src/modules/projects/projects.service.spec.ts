import { Logger } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { GithubService } from '../github/github.service';

type PublicProject = {
  id: string;
  title: string;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type PrismaProjectMock = {
  count: jest.Mock<Promise<number>, []>;
  findMany: jest.Mock<Promise<PublicProject[]>, [Record<string, unknown>]>;
};

type PrismaMock = {
  project: PrismaProjectMock;
};

type GithubMock = {
  listRepos: jest.Mock;
};

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const createPrismaMock = (): PrismaMock => ({
  project: {
    count: jest.fn<Promise<number>, []>(),
    findMany: jest.fn<Promise<PublicProject[]>, [Record<string, unknown>]>(),
  },
});

const createGithubMock = (): GithubMock => ({
  listRepos: jest.fn(),
});

describe('ProjectsService.listPublicProjects', () => {
  let prisma: PrismaMock;
  let githubService: GithubMock;
  let service: ProjectsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    githubService = createGithubMock();
    service = new ProjectsService(
      prisma as unknown as PrismaService,
      githubService as unknown as GithubService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('attempts auto-sync on empty DB and returns refreshed projects', async () => {
    const projects: PublicProject[] = [{ id: '1', title: 'Repo 1' }];

    prisma.project.count.mockResolvedValue(0);
    prisma.project.findMany.mockResolvedValue(projects);

    const syncSpy = jest
      .spyOn(service, 'syncGithubProjects')
      .mockResolvedValue({ total: 1, created: 1, updated: 0 });

    await expect(service.listPublicProjects({})).resolves.toEqual(projects);
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(prisma.project.findMany).toHaveBeenCalledTimes(1);
  });

  it('degrades gracefully when auto-sync fails and still returns the DB query result', async () => {
    const fallbackProjects: PublicProject[] = [];
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    prisma.project.count.mockResolvedValue(0);
    prisma.project.findMany.mockResolvedValue(fallbackProjects);

    const syncSpy = jest
      .spyOn(service, 'syncGithubProjects')
      .mockRejectedValue(new Error('GitHub unavailable'));

    await expect(service.listPublicProjects({})).resolves.toEqual(fallbackProjects);
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'Automatic GitHub project sync skipped: GitHub unavailable',
    );
  });

  it('reuses the same in-flight auto-sync for concurrent empty-DB requests', async () => {
    const projects: PublicProject[] = [{ id: '1', title: 'Repo 1' }];
    const syncDeferred = createDeferred<{ total: number; created: number; updated: number }>();

    prisma.project.count.mockResolvedValue(0);
    prisma.project.findMany.mockResolvedValue(projects);

    const syncSpy = jest.spyOn(service, 'syncGithubProjects').mockImplementation(() => syncDeferred.promise);

    const firstRequest = service.listPublicProjects({});
    const secondRequest = service.listPublicProjects({});

    await Promise.resolve();

    expect(syncSpy).toHaveBeenCalledTimes(1);

    syncDeferred.resolve({ total: 1, created: 1, updated: 0 });

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([projects, projects]);
    expect(prisma.project.findMany).toHaveBeenCalledTimes(2);
  });
});
