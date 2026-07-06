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
 * 
 * @param prId The pull request ID.
 * @param state The state object containing quiz status, questions, and head commit SHA.
 */
export async function saveQuizState(prId: number, state: QuizState): Promise<void> {
  const key = `archicheck:pr:${prId}`;
  // Store quiz state with a 30-day expiration window to conserve Redis space
  await redis.set(key, JSON.stringify(state), { ex: 30 * 24 * 60 * 60 });
}

/**
 * Retrieves the quiz state of a pull request from Redis.
 * 
 * @param prId The pull request ID.
 * @returns The QuizState or null if not found.
 */
export async function getQuizState(prId: number): Promise<QuizState | null> {
  const key = `archicheck:pr:${prId}`;
  const data = await redis.get<string>(key);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

/**
 * Clears the quiz state of a pull request from Redis.
 * 
 * @param prId The pull request ID.
 */
export async function clearQuizState(prId: number): Promise<void> {
  const key = `archicheck:pr:${prId}`;
  await redis.del(key);
}
