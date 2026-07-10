import { Redis } from '@upstash/redis';
import { env } from '@/config/env';
import { QuizState } from '@/types/archicheck';
import { InMemoryCache } from '@/lib/cache/inMemoryCache';

const isShadowMode = process.env.ARCHICHECK_MODE === 'shadow';
const isMock = env.UPSTASH_REDIS_REST_URL.includes('mock') || process.env.MOCK_GITHUB === 'true';

const memoryStore = new Map<string, string>();

const mockRedis = {
  ping: async () => 'PONG',
  set: async (key: string, value: unknown) => {
    memoryStore.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    return 'OK';
  },
  get: async <TData = unknown>(key: string): Promise<TData | null> => {
    const data = memoryStore.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as TData;
    } catch {
      return data as unknown as TData;
    }
  },
  del: async (key: string) => {
    memoryStore.delete(key);
    return 1;
  },
};

export const redis: Redis | InMemoryCache = isShadowMode
  ? new InMemoryCache()
  : isMock
  ? (mockRedis as unknown as Redis)
  : new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

/**
 * Saves the state of a pull request quiz to Redis with a 1,000ms timeout circuit breaker.
 */
export async function setPRState(prId: number, state: QuizState): Promise<void> {
  const key = `archicheck:pr:${prId}`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Redis operation timed out (1000ms limit)')), 1000)
  );

  const setPromise = (async () => {
    await redis.set(key, JSON.stringify(state), { ex: 30 * 24 * 60 * 60 });
  })();

  try {
    await Promise.race([setPromise, timeoutPromise]);
  } catch (error) {
    console.error(JSON.stringify({
      event: 'redis_write_failure',
      pr_id: prId.toString(),
      error: error instanceof Error ? error.message : String(error)
    }));
    throw error;
  }
}

/**
 * Retrieves the quiz state of a pull request from Redis with a 1,000ms timeout limit.
 */
export async function getPRState(prId: number): Promise<QuizState | null> {
  const key = `archicheck:pr:${prId}`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Redis operation timed out (1000ms limit)')), 1000)
  );

  const getPromise = (async () => {
    const data = await redis.get<string>(key);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data;
  })();

  try {
    return await Promise.race([getPromise, timeoutPromise]);
  } catch (error) {
    console.error(JSON.stringify({
      event: 'redis_read_failure',
      pr_id: prId.toString(),
      error: error instanceof Error ? error.message : String(error)
    }));
    return null; // Fail-open on read failures by treating it as a cache miss
  }
}

/**
 * Clears the quiz state of a pull request from Redis with a 1,000ms timeout limit.
 */
export async function deletePRState(prId: number): Promise<void> {
  const key = `archicheck:pr:${prId}`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Redis operation timed out (1000ms limit)')), 1000)
  );

  const delPromise = (async () => {
    await redis.del(key);
  })();

  try {
    await Promise.race([delPromise, timeoutPromise]);
  } catch (error) {
    console.error(JSON.stringify({
      event: 'redis_delete_failure',
      pr_id: prId.toString(),
      error: error instanceof Error ? error.message : String(error)
    }));
  }
}
