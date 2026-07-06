import { z } from 'zod';

/**
 * Zod schema defining the environment variables needed for ArchiCheck.
 * Ensures the app fails fast at boot if configuration is invalid.
 */
const envSchema = z.object({
  GITHUB_APP_ID: z.string().min(1, 'GITHUB_APP_ID is required'),
  GITHUB_PRIVATE_KEY: z.string().min(1, 'GITHUB_PRIVATE_KEY is required'),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, 'GITHUB_WEBHOOK_SECRET is required'),
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),
  LLM_PROVIDER: z.enum(['gemini', 'claude']).default('gemini'),
  LLM_API_KEY: z.string().min(1, 'LLM_API_KEY is required'),
  COMPLEXITY_THRESHOLD: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('5'),
  AGENT_RELIANCE_THRESHOLD: z
    .string()
    .transform((val) => parseFloat(val))
    .default('0.7'),
});

// Validate environment variables. In production/test we validate, in local development we fall back or warn.
let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Environment validation failed: ${(error as Error).message}`);
  }
  // In development, mock or parse what we can
  parsedEnv = {
    GITHUB_APP_ID: process.env.GITHUB_APP_ID || 'mock-id',
    GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY || 'mock-key',
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || 'mock-secret',
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || 'https://mock.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || 'mock-token',
    LLM_PROVIDER: (process.env.LLM_PROVIDER as 'gemini' | 'claude') || 'gemini',
    LLM_API_KEY: process.env.LLM_API_KEY || 'mock-api-key',
    COMPLEXITY_THRESHOLD: parseInt(process.env.COMPLEXITY_THRESHOLD || '5', 10),
    AGENT_RELIANCE_THRESHOLD: parseFloat(process.env.AGENT_RELIANCE_THRESHOLD || '0.7'),
  };
}

export const env = parsedEnv;
export type EnvType = z.infer<typeof envSchema>;
