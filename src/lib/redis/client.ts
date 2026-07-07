import { Redis } from '@upstash/redis';
import { env } from '@/config/env';
import { QuizState } from '@/types/archicheck';

export const redis = new Redis({
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
