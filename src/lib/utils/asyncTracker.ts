// @ts-expect-error next/server does not export waitUntil in older next typings
import { waitUntil } from 'next/server';

const activePromises = new Set<Promise<unknown>>();

/**
 * Tracks an asynchronous background task.
 * If running on a platform supporting Next.js waitUntil (Edge runtime), it delegates to it.
 * Otherwise, it tracks the promise in-memory to prevent premature process termination.
 */
export function trackTask(promise: Promise<unknown> | (() => Promise<unknown>)): void {
  const taskPromise = typeof promise === 'function' ? promise() : promise;

  if (typeof waitUntil === 'function') {
    try {
      waitUntil(taskPromise);
      return;
    } catch {
      // In Next.js, waitUntil can exist but throw if called outside request context.
      // Fall back to in-memory tracking.
    }
  }

  // Fallback for standard Node.js runtime environments
  activePromises.add(taskPromise);
  taskPromise.finally(() => {
    activePromises.delete(taskPromise);
  });
}

/**
 * Awaits and drains all active tracked background tasks.
 * Primarily used during graceful shutdown or in testing environments.
 */
export async function drainTasks(): Promise<void> {
  if (activePromises.size === 0) return;
  
  const promises = Array.from(activePromises);
  await Promise.allSettled(promises);
}

// Graceful container shutdown hooks for Node.js process lifecycles (skipped during testing)
if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  const handleShutdown = async (signal: string) => {
    console.log(`[ArchiCheck] Received ${signal}. Draining background task queue...`);
    
    // Safety timeout: force exit after 5 seconds to prevent hanging zombie containers
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout breached (5s). Force exiting.')), 5000);
    });

    try {
      await Promise.race([drainTasks(), timeoutPromise]);
      console.log('[ArchiCheck] All background tasks successfully drained.');
      process.exit(0);
    } catch (err) {
      console.error('[ArchiCheck] Shutdown sequence warning/error:', (err as Error).message);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => handleShutdown('SIGTERM'));
  process.once('SIGINT', () => handleShutdown('SIGINT'));
}
export { activePromises };
