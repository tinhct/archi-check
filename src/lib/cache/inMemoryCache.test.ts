/**
 * Unit Tests: InMemoryCache — AC-ST-502 / Epic-05
 *
 * Historical Mitigation (Sprint 4 — Redis State Pollution):
 * These tests use only the in-process Map. No Redis credentials or
 * network connections required. No afterEach teardown hooks needed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCache } from './inMemoryCache';

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  it('returns PONG for ping()', async () => {
    expect(await cache.ping()).toBe('PONG');
  });

  it('set() stores a value and get() retrieves it', async () => {
    await cache.set('key1', { foo: 'bar' });
    const result = await cache.get<{ foo: string }>('key1');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('get() returns null for a missing key', async () => {
    const result = await cache.get('missing');
    expect(result).toBeNull();
  });

  it('stores string values without double-serialization', async () => {
    await cache.set('strKey', 'plain-string');
    const result = await cache.get<string>('strKey');
    expect(result).toBe('plain-string');
  });

  it('del() removes the key', async () => {
    await cache.set('toDelete', 'value');
    await cache.del('toDelete');
    expect(await cache.get('toDelete')).toBeNull();
  });

  it('del() returns 1 when key existed, 0 when it did not', async () => {
    await cache.set('exists', 'v');
    expect(await cache.del('exists')).toBe(1);
    expect(await cache.del('never-existed')).toBe(0);
  });

  it('respects TTL: returns null after expiry', async () => {
    // Set a value then manually expire it by overwriting via the store
    await cache.set('ttlKey', 'short-lived', { ex: 1 });
    // Simulate past-expiry by writing directly into the Map with a past timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cache as any).store.set('ttlKey', { value: '"short-lived"', expiresAt: Date.now() - 1 });
    const result = await cache.get('ttlKey');
    expect(result).toBeNull();
  });

  it('flushAll() clears all entries', async () => {
    await cache.set('a', 1);
    await cache.set('b', 2);
    cache.flushAll();
    expect(cache.size()).toBe(0);
  });

  it('size() reflects the number of stored entries', async () => {
    expect(cache.size()).toBe(0);
    await cache.set('x', 1);
    expect(cache.size()).toBe(1);
  });

  it('does not share state between instances', async () => {
    const cache2 = new InMemoryCache();
    await cache.set('shared', 'instance1');
    expect(await cache2.get('shared')).toBeNull();
  });
});
