import { z } from 'zod';

/**
 * Zod schema defining the environment variables needed for ArchiCheck.
 * Ensures the app fails fast at boot if configuration is invalid.
 */
const envSchema = z
  .object({
    GITHUB_APP_ID: z.string().min(1, 'GITHUB_APP_ID is required'),
    GITHUB_PRIVATE_KEY: z.string()
      .min(1, 'GITHUB_PRIVATE_KEY is required')
      .transform((val) => {
        if (val === 'mock-key') return val;
        return val.replace(/\\n/g, '\n');
      })
      .refine((val) => {
        if (val === 'mock-key') return true;
        const trimmed = val.trim();
        return trimmed.startsWith('-----BEGIN') && trimmed.endsWith('-----');
      }, {
        message: 'Invalid RSA private key structure: Must start with -----BEGIN and end with ----- (standard PEM footer delimiters)'
      })
      .refine((val) => {
        if (val === 'mock-key') return true;
        return val.includes('\n');
      }, {
        message: 'Invalid RSA private key structure: Must contain multiple lines with newline characters'
      }),
    GITHUB_WEBHOOK_SECRET: z.string().min(1, 'GITHUB_WEBHOOK_SECRET is required'),
    UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),
    LLM_PROVIDER: z.enum(['gemini', 'claude']).default('gemini'),
    LLM_PROVIDER_TYPE: z.enum(['gemini-developer', 'vertex', 'mock']).default('gemini-developer'),
    LLM_API_KEY: z.string().default('mock-api-key'),
    GOOGLE_CREDS_JSON: z.string().optional(),
    COMPLEXITY_THRESHOLD: z
      .string()
      .default('5')
      .transform((val) => parseInt(val, 10)),
    AGENT_RELIANCE_THRESHOLD: z
      .string()
      .default('0.7')
      .transform((val) => parseFloat(val)),
  })
  .superRefine((data, ctx) => {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && data.LLM_PROVIDER_TYPE === 'mock') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CRITICAL: Mock provider is strictly prohibited in production environments.',
        path: ['LLM_PROVIDER_TYPE'],
      });
    }
    if (isProd) {
      if (data.LLM_PROVIDER_TYPE === 'gemini-developer' && (!data.LLM_API_KEY || data.LLM_API_KEY === 'mock-api-key')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'LLM_API_KEY is required for gemini-developer in production.',
          path: ['LLM_API_KEY'],
        });
      }
      if (data.LLM_PROVIDER_TYPE === 'vertex' && (!data.GOOGLE_CREDS_JSON || data.GOOGLE_CREDS_JSON.trim().length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GOOGLE_CREDS_JSON is required for vertex in production.',
          path: ['GOOGLE_CREDS_JSON'],
        });
      }
    } else {
      if (data.LLM_PROVIDER_TYPE === 'vertex' && (!data.GOOGLE_CREDS_JSON || data.GOOGLE_CREDS_JSON.trim().length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GOOGLE_CREDS_JSON is recommended when LLM_PROVIDER_TYPE is set to vertex',
          path: ['GOOGLE_CREDS_JSON'],
        });
      }
    }
  });

// Validate environment variables. In production/test we validate, in local development we fall back or warn.
let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', '❌ [ArchiCheck] Environment validation failed during boot:');
  if (error instanceof z.ZodError) {
    error.issues.forEach((err) => {
      console.error('\x1b[33m%s\x1b[0m', `  - ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error('\x1b[33m%s\x1b[0m', `  - ${(error as Error).message}`);
  }

  if (process.env.NODE_ENV === 'production' && process.env.SKIP_ENV_VALIDATION !== 'true') {
    process.exit(1);
  }
  // In development or build-time validation bypass, mock or parse what we can
  parsedEnv = {
    GITHUB_APP_ID: process.env.GITHUB_APP_ID || 'mock-id',
    GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY || 'mock-key',
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || 'mock-secret',
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || 'https://mock.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || 'mock-token',
    LLM_PROVIDER: (process.env.LLM_PROVIDER as 'gemini' | 'claude') || 'gemini',
    LLM_PROVIDER_TYPE: (process.env.LLM_PROVIDER_TYPE as 'gemini-developer' | 'vertex' | 'mock') || 'gemini-developer',
    LLM_API_KEY: process.env.LLM_API_KEY || 'mock-api-key',
    GOOGLE_CREDS_JSON: process.env.GOOGLE_CREDS_JSON || undefined,
    COMPLEXITY_THRESHOLD: parseInt(process.env.COMPLEXITY_THRESHOLD || '5', 10),
    AGENT_RELIANCE_THRESHOLD: parseFloat(process.env.AGENT_RELIANCE_THRESHOLD || '0.7'),
  };
}

export const env = parsedEnv;
export { envSchema };
export type EnvType = z.infer<typeof envSchema>;
