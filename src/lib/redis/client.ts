import { Redis } from '@upstash/redis';
import { env } from '@/config/env';
import { QuizState } from '@/types/archicheck';

/**
 * Initializes the Upstash Redis client.
 * Using Edge-compatible Redis SDK from Upstash.
 */
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Saves the state of a pull request quiz to Redis.
 * Key structure: `archicheck:pr:${prId}`
 * Fail-open: Logs errors but does not throw, ensuring CI/CD flows are not blocked by Redis outages.
 * 
 * @param prId The pull request ID.
 * @param state The state object containing quiz status, questions, and head commit SHA.
 */
export async function setPRState(prId: number, state: QuizState): Promise<void> {
  const key = `archicheck:pr:${prId}`;
  try {
    // Store quiz state with a 30-day expiration window to conserve Redis space
    await redis.set(key, JSON.stringify(state), { ex: 30 * 24 * 60 * 60 });
  } catch (error) {
    console.error(`[ArchiCheck] Redis setPRState failed for PR #${prId} (failing open):`, error);
  }
}

/**
 * Retrieves the quiz state of a pull request from Redis.
 * Fail-open: Returns null if Redis is unreachable, treating it as a cache miss.
 * 
 * @param prId The pull request ID.
 * @returns The QuizState or null if not found or unreachable.
 */
export async function getPRState(prId: number): Promise<QuizState | null> {
  const key = `archicheck:pr:${prId}`;
  try {
    const data = await redis.get<string>(key);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error(`[ArchiCheck] Redis getPRState failed for PR #${prId} (failing open):`, error);
    return null;
  }
}

/**
 * Clears the quiz state of a pull request from Redis.
 * Fail-open: Logs errors but does not throw.
 * 
 * @param prId The pull request ID.
 */
export async function deletePRState(prId: number): Promise<void> {
  const key = `archicheck:pr:${prId}`;
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[ArchiCheck] Redis deletePRState failed for PR #${prId} (failing open):`, error);
  }
}
