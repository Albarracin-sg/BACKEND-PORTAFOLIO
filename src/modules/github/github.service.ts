import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
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
  followers: number;
  following: number;
};

type GitHubEvent = {
  type: string;
  created_at: string;
  payload?: { size?: number };
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
  publicRepos: number;
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

  constructor(private readonly config: ConfigService) {}

  async listRepos() {
    const repos = await this.fetchRepos();
    return repos.filter((repo) => !repo.fork);
  }

  async getStats(): Promise<GithubStats> {
    if (this.statsCache && this.statsCache.expiresAt > Date.now()) {
      return this.statsCache.value;
    }

    const username = this.getUsername();
    const [user, repos, events] = await Promise.all([
      this.fetchUser(),
      this.listRepos(),
      this.fetchEvents(),
    ]);

    const stars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
    const forks = repos.reduce((acc, repo) => acc + repo.forks_count, 0);

    const languageData = this.buildLanguageData(repos);
    const projectsData = this.buildProjectsTimeline(repos);
    const githubActivity = this.buildGithubActivity(events);

    const stats: GithubStats = {
      username,
      publicRepos: user.public_repos ?? repos.length,
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

  private async fetchUser(): Promise<GitHubUser> {
    const username = this.getUsername();
    return this.fetchJson<GitHubUser>(`https://api.github.com/users/${username}`);
  }

  private async fetchRepos(): Promise<GitHubRepo[]> {
    if (this.repoCache && this.repoCache.expiresAt > Date.now()) {
      return this.repoCache.value;
    }

    const username = this.getUsername();
    const perPage = 100;
    let page = 1;
    const repos: GitHubRepo[] = [];

    while (page <= 10) {
      const url = `https://api.github.com/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc`;
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

  private async fetchEvents(): Promise<GitHubEvent[]> {
    const username = this.getUsername();
    return this.fetchJson<GitHubEvent[]>(
      `https://api.github.com/users/${username}/events/public?per_page=100`,
    );
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

  private buildGithubActivity(events: GitHubEvent[]) {
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - idx));
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleString('en', { weekday: 'short' });
      return { key, label, commits: 0 };
    });

    for (const event of events) {
      if (event.type !== 'PushEvent') continue;
      const key = event.created_at.slice(0, 10);
      const entry = days.find((item) => item.key === key);
      if (!entry) continue;
      entry.commits += event.payload?.size ?? 0;
    }

    return days.map((item) => ({ day: item.label, commits: item.commits }));
  }
}
