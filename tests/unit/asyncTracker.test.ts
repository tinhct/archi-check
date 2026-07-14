import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackTask, drainTasks, activePromises } from '@/lib/utils/asyncTracker';

// Mock next/server waitUntil behavior
vi.mock('next/server', () => {
  return {
    waitUntil: undefined // Simulate Node.js environment where next/server exports but it's not a function or throws
  };
});

describe('Async Task Tracker Unit Tests', () => {
  beforeEach(() => {
    activePromises.clear();
  });

  it('should track a promise task in-memory', async () => {
    let resolved = false;
    const task = new Promise((resolve) => {
      setTimeout(() => {
        resolved = true;
        resolve(true);
      }, 10);
    });

    trackTask(task);
    expect(activePromises.size).toBe(1);

    await task;
    expect(activePromises.size).toBe(0);
    expect(resolved).toBe(true);
  });

  it('should track a function returning a promise task', async () => {
    let resolved = false;
    const taskFn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      resolved = true;
      return true;
    };

    trackTask(taskFn);
    expect(activePromises.size).toBe(1);

    await drainTasks();
    expect(activePromises.size).toBe(0);
    expect(resolved).toBe(true);
  });

  it('should drain multiple unresolved promises concurrently', async () => {
    const outputs: string[] = [];

    const task1 = new Promise((resolve) => {
      setTimeout(() => {
        outputs.push('task1');
        resolve(true);
      }, 20);
    });

    const task2 = new Promise((resolve) => {
      setTimeout(() => {
        outputs.push('task2');
        resolve(true);
      }, 10);
    });

    trackTask(task1);
    trackTask(task2);

    expect(activePromises.size).toBe(2);

    await drainTasks();

    expect(activePromises.size).toBe(0);
    expect(outputs).toContain('task1');
    expect(outputs).toContain('task2');
  });
});
