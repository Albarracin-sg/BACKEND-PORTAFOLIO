import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  private?: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  archived: boolean;
  fork: boolean;
  homepage: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  owner: { login: string };
};

type GitHubUser = {
  login: string;
  public_repos: number;
  total_private_repos?: number;
  owned_private_repos?: number;
  followers: number;
  following: number;
};

type GitHubCommit = {
  commit?: {
    author?: {
      date?: string;
    } | null;
  };
};

type RepoCache = {
  value: GitHubRepo[];
  expiresAt: number;
};

type StatsCache = {
  value: GithubStats;
  expiresAt: number;
};

export type GithubStats = {
  username: string;
  totalRepos: number;
  publicRepos: number;
  privateRepos: number;
  pullRequests: number;
  followers: number;
  following: number;
  stars: number;
  forks: number;
  languageData: Array<{ name: string; value: number; color: string }>;
  projectsData: Array<{ month: string; projects: number }>;
  githubActivity: Array<{ day: string; commits: number }>;
};

@Injectable()
export class GithubService {
  private repoCache: RepoCache | null = null;
  private statsCache: StatsCache | null = null;
  private inFlightRequest: Promise<GithubStats> | null = null;
  private lastError: string | null = null;

  constructor(private readonly config: ConfigService) {}

  async listRepos(options?: { includePrivate?: boolean }) {
    const repos = await this.fetchRepos();
    return repos.filter((repo) => !repo.fork && (options?.includePrivate ? true : !repo.private));
  }

  async getStats(): Promise<GithubStats> {
    // Cache válido
    if (this.statsCache && this.statsCache.expiresAt > Date.now()) {
      this.logger?.log('📦 GitHub stats cache hit');
      return this.statsCache.value;
    }

    // Request en progreso - esperar esa misma promesa
    if (this.inFlightRequest) {
      this.logger?.log('⏳ GitHub waiting for in-flight request');
      return this.inFlightRequest;
    }

    // Crear nueva request
    this.inFlightRequest = this.fetchStatsWithFallback();
    
    try {
      return await this.inFlightRequest;
    } finally {
      this.inFlightRequest = null;
    }
  }

  private async fetchStatsWithFallback(): Promise<GithubStats> {
    try {
      const startTime = Date.now();
      const stats = await this.fetchStats();
      this.logger?.log(`🌐 GitHub external request: ${Date.now() - startTime}ms`);
      this.lastError = null;
      return stats;
    } catch (error) {
      const sanitizedError = this.sanitizeError(error);
      this.logger?.warn(`⚠️ GitHub error: ${sanitizedError}`);
      this.lastError = sanitizedError;

      // Devolver stale cache si existe
      if (this.statsCache) {
        this.logger?.log('♻️ Fallback to stale cache');
        return this.statsCache.value;
      }

      throw error;
    }
  }

  private sanitizeError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('status 403')) return 'Rate limited';
      if (error.message.includes('status 401')) return 'Unauthorized';
      if (error.message.includes('status 5')) return 'GitHub server error';
      return 'GitHub API error';
    }
    return 'Unknown error';
  }

  private get logger() {
    // Logger lazy para evitar problemas de inicialización
    try {
      const { Logger } = require('@nestjs/common');
      return new Logger('GithubService');
    } catch {
      return null;
    }
  }

  private async fetchStats(): Promise<GithubStats> {
    const username = this.getUsername();
    const [user, repos, pullRequests] = await Promise.all([
      this.fetchUser(),
      this.listRepos({ includePrivate: true }),
      this.fetchPullRequestsCount(),
    ]);

    const stars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
    const forks = repos.reduce((acc, repo) => acc + repo.forks_count, 0);

    const languageData = this.buildLanguageData(repos);
    const projectsData = this.buildProjectsTimeline(repos);
    const githubActivity = await this.buildGithubActivity(repos);
    const totalRepos = repos.length;
    const publicRepos = user.public_repos ?? repos.filter((repo) => !repo.private).length;
    const privateRepos = Math.max(
      user.owned_private_repos ?? user.total_private_repos ?? totalRepos - publicRepos,
      0,
    );

    const stats: GithubStats = {
      username,
      totalRepos,
      publicRepos,
      privateRepos,
      pullRequests,
      followers: user.followers ?? 0,
      following: user.following ?? 0,
      stars,
      forks,
      languageData,
      projectsData,
      githubActivity,
    };

    this.statsCache = { value: stats, expiresAt: Date.now() + this.getCacheTtlMs() };
    return stats;
  }

  private getUsername() {
    return this.config.get<string>('GITHUB_USERNAME') ?? 'Albarracin-sg';
  }

  private getCacheTtlMs() {
    const ttlMinutes = Number(this.config.get('GITHUB_CACHE_TTL_MINUTES') ?? 30);
    return Math.max(ttlMinutes, 5) * 60 * 1000;
  }

  private getHeaders(includeAuth = true) {
    const token = this.config.get<string>('GITHUB_TOKEN');
    return {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(includeAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async fetchJson<T>(url: string): Promise<T> {
    let response = await fetch(url, { headers: this.getHeaders(true) });
    if (response.status === 401) {
      response = await fetch(url, { headers: this.getHeaders(false) });
    }
    if (!response.ok) {
      throw new Error(`GitHub API error ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async getRepoFile(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const content: any = await this.fetchJson(url);
      if (content && content.content && content.encoding === 'base64') {
        return Buffer.from(content.content, 'base64').toString('utf-8');
      }
      return null;
    } catch {
      return null;
    }
  }

  async getRepoTree(owner: string, repo: string, branch = 'main'): Promise<any> {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
      return await this.fetchJson(url);
    } catch {
      try {
        const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
        return await this.fetchJson(url);
      } catch {
        return null;
      }
    }
  }

  private hasToken() {
    return Boolean(this.config.get<string>('GITHUB_TOKEN'));
  }

  private async fetchUser(): Promise<GitHubUser> {
    const username = this.getUsername();
    if (this.hasToken()) {
      try {
        const viewer = await this.fetchJson<GitHubUser>('https://api.github.com/user');
        if (viewer.login === username) {
          return viewer;
        }
      } catch {
        // Fallback to public profile if the token is invalid or belongs to another user.
      }
    }
    return this.fetchJson<GitHubUser>(`https://api.github.com/users/${username}`);
  }

  private async fetchRepos(): Promise<GitHubRepo[]> {
    if (this.repoCache && this.repoCache.expiresAt > Date.now()) {
      return this.repoCache.value;
    }

    const perPage = 100;
    let page = 1;
    const repos: GitHubRepo[] = [];

    while (page <= 10) {
      const url = this.getReposUrl(page, perPage);
      const batch = await this.fetchJson<GitHubRepo[]>(url);
      repos.push(...batch);
      if (batch.length < perPage) {
        break;
      }
      page += 1;
    }

    this.repoCache = { value: repos, expiresAt: Date.now() + this.getCacheTtlMs() };
    return repos;
  }

  private getReposUrl(page: number, perPage: number) {
    const username = this.getUsername();
    if (this.hasToken()) {
      return `https://api.github.com/user/repos?visibility=all&affiliation=owner&per_page=${perPage}&page=${page}&sort=updated&direction=desc`;
    }
    return `https://api.github.com/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc`;
  }

  private async fetchRepoCommits(repo: GitHubRepo, sinceIso: string): Promise<GitHubCommit[]> {
    const username = this.getUsername();
    const commits: GitHubCommit[] = [];
    let page = 1;

    while (page <= 10) {
      const url = `https://api.github.com/repos/${repo.owner.login}/${repo.name}/commits?author=${username}&since=${sinceIso}&per_page=100&page=${page}`;
      try {
        const batch = await this.fetchJson<GitHubCommit[]>(url);
        commits.push(...batch);
        if (batch.length < 100) {
          break;
        }
        page += 1;
      } catch (error) {
        if (error instanceof Error && error.message.includes('409')) {
          return commits;
        }
        throw error;
      }
    }

    return commits;
  }

  private async fetchPullRequestsCount(): Promise<number> {
    if (!this.hasToken()) {
      return 0;
    }

    const username = this.getUsername();
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        ...this.getHeaders(true),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query PullRequestsCount($query: String!) {
          search(query: $query, type: ISSUE, first: 1) {
            issueCount
          }
        }`,
        variables: {
          query: `author:${username} type:pr`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL error ${response.status}: ${await response.text()}`);
    }

    const result = (await response.json()) as {
      data?: { search?: { issueCount?: number } };
    };

    return result.data?.search?.issueCount ?? 0;
  }

  private buildLanguageData(repos: GitHubRepo[]) {
    const counts = new Map<string, number>();
    for (const repo of repos) {
      const language = repo.language ?? 'Other';
      counts.set(language, (counts.get(language) ?? 0) + 1);
    }

    const total = Array.from(counts.values()).reduce((acc, value) => acc + value, 0) || 1;
    const palette = ['#7c3aed', '#22c55e', '#0ea5e9', '#f59e0b', '#ef4444', '#14b8a6'];

    return Array.from(counts.entries())
      .map(([name, count], index) => ({
        name,
        value: Math.round((count / total) * 100),
        color: palette[index % palette.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }

  private buildProjectsTimeline(repos: GitHubRepo[]) {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = date.toLocaleString('en', { month: 'short' });
      return { key, label, projects: 0 };
    });

    for (const repo of repos) {
      const created = new Date(repo.created_at);
      const key = `${created.getFullYear()}-${created.getMonth() + 1}`;
      const entry = months.find((item) => item.key === key);
      if (entry) {
        entry.projects += 1;
      }
    }

    return months.map((item) => ({ month: item.label, projects: item.projects }));
  }

  private async buildGithubActivity(repos: GitHubRepo[]) {
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - idx));
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleString('en', { weekday: 'short' });
      return { key, label, commits: 0 };
    });

    const sinceIso = `${days[0]?.key}T00:00:00Z`;
    const activeRepos = repos.filter((repo) => repo.pushed_at && repo.archived === false);
    const commitsByRepo = await Promise.all(activeRepos.map((repo) => this.fetchRepoCommits(repo, sinceIso)));

    for (const commits of commitsByRepo) {
      for (const commit of commits) {
        const key = commit.commit?.author?.date?.slice(0, 10);
        if (!key) continue;
        const entry = days.find((item) => item.key === key);
        if (!entry) continue;
        entry.commits += 1;
      }
    }

    return days.map((item) => ({ day: item.label, commits: item.commits }));
  }
}
