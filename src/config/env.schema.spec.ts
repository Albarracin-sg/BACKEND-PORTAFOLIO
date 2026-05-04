import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  const baseEnv = {
    NODE_ENV: 'test',
    PORT: 6767,
    DATABASE_URL: 'https://database.example.com',
    JWT_SECRET: 'super-secret-token',
    CORS_ORIGIN: '*',
    STORAGE_DRIVER: 'local',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 587,
    SMTP_USER: 'mailer',
    SMTP_PASS: 'password',
    MAIL_FROM: 'noreply@example.com',
    GITHUB_USERNAME: 'octocat',
    GITHUB_TOKEN: 'github-token',
    GITHUB_CACHE_TTL_MINUTES: 30,
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'password123',
  };

  it('accepts the required Spotify credentials', () => {
    const result = validateEnv({
      ...baseEnv,
      SPOTIFY_CLIENT_ID: 'spotify-client-id',
      SPOTIFY_CLIENT_SECRET: 'spotify-client-secret',
      SPOTIFY_REFRESH_TOKEN: 'spotify-refresh-token',
    });

    expect(result.SPOTIFY_CLIENT_ID).toBe('spotify-client-id');
    expect(result.SPOTIFY_CLIENT_SECRET).toBe('spotify-client-secret');
    expect(result.SPOTIFY_REFRESH_TOKEN).toBe('spotify-refresh-token');
  });
});
