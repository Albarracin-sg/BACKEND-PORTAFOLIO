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

  // Initial Admin User (for seeding)
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(6),
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
