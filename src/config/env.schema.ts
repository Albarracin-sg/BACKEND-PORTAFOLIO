import { z } from 'zod';

export const envSchema = z.object({
  // Base
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(6767),

  // Database
  DATABASE_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(8),

  // Security
  CORS_ORIGIN: z.string().default('*'),

  // Storage
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),

  // Email Configuration
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  MAIL_FROM: z.string(),

  // GitHub Integration
  GITHUB_USERNAME: z.string(),
  GITHUB_TOKEN: z.string(),
  GITHUB_CACHE_TTL_MINUTES: z.coerce.number().default(30),

  // Spotify Integration
  SPOTIFY_CLIENT_ID: z.string(),
  SPOTIFY_CLIENT_SECRET: z.string(),
  SPOTIFY_REFRESH_TOKEN: z.string(),
  SPOTIFY_CACHE_TTL_MS: z.coerce.number().default(30000),
  SPOTIFY_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(30),
  SPOTIFY_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // GitHub Integration
  GITHUB_STATS_CACHE_TTL_MS: z.coerce.number().default(600000),
  GITHUB_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(20),
  GITHUB_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Projects Cache
  PROJECTS_CACHE_TTL_MS: z.coerce.number().default(300000),
  PROJECTS_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(60),
  PROJECTS_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Bot Rate Limiting
  BOT_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(10),
  BOT_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // HTTP Timeout
  HTTP_TIMEOUT_MS: z.coerce.number().default(30000),

  // HuggingFace AI Bot Integration
  HUGGINGFACE_API_KEY: z.string().default(''),
  HUGGINGFACE_MODEL: z.string().default('microsoft/Phi-3-mini-128k-instruct'),
  HUGGINGFACE_API_URL: z.string().default('https://api-inference.huggingface.co/models'),
  HUGGINGFACE_MAX_TOKENS: z.coerce.number().default(512),
  HUGGINGFACE_TIMEOUT_MS: z.coerce.number().default(30000),

  // Initial Admin User (for seeding)
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(6),

  // Swagger Docs Basic Auth
  DOCS_USERNAME: z.string().default('demo'),
  DOCS_PASSWORD: z.string().default('demo123'),

  // Swagger Rate Limiting
  SWAGGER_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(30),
  SWAGGER_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
}
