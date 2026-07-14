/**
 * InMemoryCache — AC-ST-502 / Epic-05
 *
 * A zero-dependency, in-process cache implementing the same interface
 * as the Upstash Redis client used in production. Instantiated by the
 * Redis client factory when ARCHICHECK_MODE=shadow to ensure no real
 * Redis connections are made during shadow-mode operation.
 *
 * Historical Mitigation (Sprint 4 — Redis State Pollution):
 * Each shadow-mode webhook invocation gets isolated state via this Map.
 * No afterEach teardown hooks are needed in tests.
 */
export class InMemoryCache {
  private store: Map<string, { value: string; expiresAt: number | null }>;

  constructor() {
    this.store = new Map();
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }

  async set(
    key: string,
    value: unknown,
    options?: { ex?: number }
  ): Promise<'OK'> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);
    const expiresAt =
      options?.ex != null ? Date.now() + options.ex * 1000 : null;
    this.store.set(key, { value: serialized, expiresAt });
    return 'OK';
  }

  async get<TData = unknown>(key: string): Promise<TData | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Respect TTL if set
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as TData;
    } catch {
      return entry.value as unknown as TData;
    }
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async incrby(key: string, value: number): Promise<number> {
    const current = await this.get<number | string>(key);
    const parsed = typeof current === 'string' ? parseInt(current, 10) : typeof current === 'number' ? current : 0;
    const next = parsed + value;
    await this.set(key, next);
    return next;
  }

  /** Utility: clear all entries (useful in unit tests) */
  flushAll(): void {
    this.store.clear();
  }

  /** Utility: returns current entry count */
  size(): number {
    return this.store.size;
  }
}
