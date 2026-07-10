/**
 * Unit Tests: shadowLogger — AC-ST-502 / Epic-05
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('shadowLogger — logIntercepted()', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Reset env before each test
    delete process.env.ARCHICHECK_SHADOW_FORMAT;
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ARCHICHECK_SHADOW_FORMAT;
  });

  it('emits a colorized console.log in default (human-readable) mode', async () => {
    // Re-import fresh to pick up env var changes
    vi.resetModules();
    const { logIntercepted } = await import('./shadowLogger');

    logIntercepted('createComment', { body: 'test' });

    expect(consoleSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();

    const firstCall = consoleSpy.mock.calls[0][0] as string;
    expect(firstCall).toContain('createComment');
    expect(firstCall).toContain('[SHADOW MODE]');
    expect(firstCall).toContain('intercepted');
  });

  it('emits a single-line JSON string to stdout when ARCHICHECK_SHADOW_FORMAT=json', async () => {
    process.env.ARCHICHECK_SHADOW_FORMAT = 'json';
    vi.resetModules();
    const { logIntercepted } = await import('./shadowLogger');

    logIntercepted('createCommitStatus', { sha: 'abc123', state: 'success' });

    expect(stdoutSpy).toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();

    const writtenArg = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(writtenArg.trim());
    expect(parsed.mode).toBe('shadow');
    expect(parsed.action).toBe('createCommitStatus');
    expect(parsed.payload).toEqual({ sha: 'abc123', state: 'success' });
    expect(parsed.timestamp).toBeTruthy();
  });

  it('JSON output is a single line terminated by \\n', async () => {
    process.env.ARCHICHECK_SHADOW_FORMAT = 'json';
    vi.resetModules();
    const { logIntercepted } = await import('./shadowLogger');

    logIntercepted('bypassCommand', {});

    const writtenArg = stdoutSpy.mock.calls[0][0] as string;
    const lines = writtenArg.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
  });
});
