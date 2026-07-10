/**
 * Shadow Logger — AC-ST-502 / Epic-05
 *
 * Structured logger for Shadow Mode interceptions.
 *
 * Format control via ARCHICHECK_SHADOW_FORMAT env var:
 *   - (default): Human-readable colorized terminal trace
 *   - ARCHICHECK_SHADOW_FORMAT=json: Machine-parseable single-line JSON to stdout
 *
 * This is intentionally a pure function (no class) for easy mocking in tests.
 */

interface ShadowLogEntry {
  mode: 'shadow';
  timestamp: string;
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

/**
 * Log an intercepted outbound write operation in shadow mode.
 *
 * @param action - Human-readable action label (e.g. "createComment", "createCommitStatus")
 * @param payload - The full payload that would have been sent to the external system
 */
export function logIntercepted(action: string, payload: unknown): void {
  const entry: ShadowLogEntry = {
    mode: 'shadow',
    timestamp: new Date().toISOString(),
    action,
    payload,
  };

  if (process.env.ARCHICHECK_SHADOW_FORMAT === 'json') {
    // Machine-parseable: single-line JSON to stdout for piping
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    // Human-readable: colorized trace for developer terminals
    const ts = `\x1b[90m${entry.timestamp}\x1b[0m`;
    const label = `\x1b[33m[SHADOW MODE]\x1b[0m \x1b[33m🟡\x1b[0m`;
    const actionStr = `\x1b[36m${action}\x1b[0m`;
    console.log(`${ts} ${label} ${actionStr} intercepted`);
    console.log(
      `\x1b[90m  payload:\x1b[0m`,
      JSON.stringify(payload, null, 2)
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')
    );
  }
}
