import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { checkTokenBudget } from '@/lib/telemetry/budgetAlert';
import { redis } from '@/lib/redis/client';
import { env } from '@/config/env';

interface MockRedisClient {
  get: Mock;
  set: Mock;
  incrby: Mock;
  flushAll: () => void;
}

// Mock Redis client calls
vi.mock('@/lib/redis/client', () => {
  const store = new Map<string, unknown>();
  const mockClient = {
    get: vi.fn(async (key: string) => store.get(key) || null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
      return 'OK';
    }),
    incrby: vi.fn(async (key: string, amount: number) => {
      const current = (store.get(key) as number) || 0;
      const next = current + amount;
      store.set(key, next);
      return next;
    }),
    flushAll: () => store.clear()
  };
  return {
    redis: mockClient
  };
});

describe('Token Burn Telemetry Alerting Unit Tests', () => {
  const originalSlackUrl = env.SLACK_WEBHOOK_URL;
  const originalBudgetLimit = env.TELEMETRY_BUDGET_LIMIT;
  let fetchSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    (redis as unknown as MockRedisClient).flushAll();
    
    // Default mock environment variables
    env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T123/B123/mock-key';
    env.TELEMETRY_BUDGET_LIMIT = 10.0; // $10 limit

    // Spy on global fetch API
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);
  });

  afterEach(() => {
    env.SLACK_WEBHOOK_URL = originalSlackUrl;
    env.TELEMETRY_BUDGET_LIMIT = originalBudgetLimit;
  });

  it('should skip check if SLACK_WEBHOOK_URL is not set', async () => {
    env.SLACK_WEBHOOK_URL = undefined;

    await checkTokenBudget({ input: 1000, output: 500, total: 1500 });

    expect(redis.get).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should increment token counters in Redis and NOT trigger alert if cost is under threshold', async () => {
    // 1M input tokens = $0.075, 1M output tokens = $0.30
    // Total cost for { input: 1M, output: 1M } = $0.375, under $10 limit
    await checkTokenBudget({ input: 1000000, output: 1000000, total: 2000000 });

    expect((redis as unknown as MockRedisClient).incrby).toHaveBeenCalledWith('archicheck:telemetry:input_tokens', 1000000);
    expect((redis as unknown as MockRedisClient).incrby).toHaveBeenCalledWith('archicheck:telemetry:output_tokens', 1000000);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should dispatch a Slack webhook alert when cost exceeds limit and no alert has been sent', async () => {
    // 100M input tokens = $7.50, 10M output tokens = $3.00 (Total $10.50, exceeds $10 limit)
    await checkTokenBudget({ input: 100000000, output: 10000000, total: 110000000 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(env.SLACK_WEBHOOK_URL, expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('Token Budget Limit Breached')
    }));

    // Verify alert state is cached in Redis with expiration
    expect(redis.set).toHaveBeenCalledWith('archicheck:telemetry:alert_sent', 'true', { ex: 86400 });
  });

  it('should debounce alerts and NOT send alert if alert_sent cache key is already present', async () => {
    // Pre-seed alert_sent state
    await redis.set('archicheck:telemetry:alert_sent', 'true');

    // Run budget check exceeding limit
    await checkTokenBudget({ input: 100000000, output: 10000000, total: 110000000 });

    // Confirm Redis gets updated, but fetch alert is bypassed
    expect((redis as unknown as MockRedisClient).incrby).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
