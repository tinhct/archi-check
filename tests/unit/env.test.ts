import { describe, it, expect, afterAll } from 'vitest';
import { envSchema } from '@/config/env';

describe('Environment Schema Unit Tests', () => {
  const originalEnv = process.env.NODE_ENV;

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  const baseConfig = {
    GITHUB_APP_ID: '12345',
    GITHUB_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----',
    GITHUB_WEBHOOK_SECRET: 'webhook-secret-key',
    UPSTASH_REDIS_REST_URL: 'https://mock-redis-url.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'mock-redis-token',
    LLM_PROVIDER: 'gemini',
    LLM_PROVIDER_TYPE: 'mock',
    LLM_API_KEY: 'mock-api-key'
  };

  it('should accept mock provider settings when process.env.NODE_ENV is not production', () => {
    process.env.NODE_ENV = 'development';
    const result = envSchema.safeParse(baseConfig);
    expect(result.success).toBe(true);
  });

  it('should strictly reject mock provider settings when process.env.NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    const result = envSchema.safeParse(baseConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.includes('LLM_PROVIDER_TYPE'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('strictly prohibited');
    }
  });

  it('should reject gemini-developer in production if api-key matches the default mock key', () => {
    process.env.NODE_ENV = 'production';
    const config = {
      ...baseConfig,
      LLM_PROVIDER_TYPE: 'gemini-developer',
      LLM_API_KEY: 'mock-api-key'
    };
    const result = envSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.includes('LLM_API_KEY'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('LLM_API_KEY is required');
    }
  });

  it('should accept gemini-developer in production if a real API key is supplied', () => {
    process.env.NODE_ENV = 'production';
    const config = {
      ...baseConfig,
      LLM_PROVIDER_TYPE: 'gemini-developer',
      LLM_API_KEY: 'AQ.real-gemini-key'
    };
    const result = envSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject vertex in production if GOOGLE_CREDS_JSON is missing', () => {
    process.env.NODE_ENV = 'production';
    const config = {
      ...baseConfig,
      LLM_PROVIDER_TYPE: 'vertex',
      GOOGLE_CREDS_JSON: ''
    };
    const result = envSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.includes('GOOGLE_CREDS_JSON'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('GOOGLE_CREDS_JSON is required');
    }
  });
});
