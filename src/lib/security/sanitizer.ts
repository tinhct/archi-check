import { parse } from 'yaml';

export const DEFAULT_PATTERNS = [
  { name: 'AWS_ACCESS_KEY_ID', regex: /(A3T[A-Z0-9]{16}|AKIA[0-9A-Z]{16})/g },
  { name: 'STRIPE_API_KEY', regex: /sk_(live|test)_[0-9a-zA-Z]{24}/g },
  { name: 'GOOGLE_API_KEY', regex: /AIzaSy[0-9A-Za-z-_]{33}/g },
  { name: 'SLACK_WEBHOOK', regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9a-zA-Z_]{8}\/B[0-9a-zA-Z_]{8}\/[0-9a-zA-Z_]{24}/g },
  { name: 'JWT_TOKEN', regex: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g },
  { name: 'PRIVATE_KEY_BLOCK', regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[^-]+-----END [A-Z ]+ PRIVATE KEY-----/g },
  // Generic password assignments: matches only the value inside quotes using positive lookbehind and lookahead
  { name: 'GENERIC_PASSWORD', regex: /(?<=\b(password|passwd|secret|api_key|apikey|private_key|token|auth)\s*[:=]\s*["'])(?!\[REDACTED_SECRET\])[^"']{4,}(?=["'])/gi }
];

/**
 * Sanitizes input strings (like Git diffs) by stripping out sensitive credential patterns.
 * 
 * @param content The raw input text (e.g. Git diff).
 * @param customPatterns Optional custom regex patterns from repository config.
 * @param prId Optional pull request ID for logs.
 * @param filePath Optional file path context for logs.
 * @returns The sanitized text with credentials redacted.
 */
export async function scrubSecrets(
  content: string,
  customPatterns: string[] = [],
  prId?: number,
  filePath?: string
): Promise<string> {
  const start = performance.now();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Sanitization timeout (possible ReDoS)')), 500)
  );

  const processingPromise = (async () => {
    let sanitized = content;

    // 1. Apply default safe patterns
    for (const { name, regex } of DEFAULT_PATTERNS) {
      // Check timeout
      if (performance.now() - start > 500) {
        throw new Error('Sanitization timeout (possible ReDoS)');
      }

      const matches = sanitized.match(regex);
      if (matches && matches.length > 0) {
        console.log(JSON.stringify({
          event: 'secret_scrubbed',
          pr_id: prId?.toString() || 'unknown',
          file_path: filePath || 'unknown',
          rule_name: name
        }));
        sanitized = sanitized.replace(regex, '[REDACTED_SECRET]');
      }
    }

    // 2. Apply custom patterns with line-length checks
    if (customPatterns.length > 0) {
      const lines = sanitized.split('\n');
      const processedLines = lines.map((line) => {
        // Line-length truncation guard (The Shield)
        if (line.length > 500) {
          console.warn(`[ArchiCheck] Line length exceeds 500 characters (${line.length}). Redacting entire line to prevent ReDoS.`);
          return '[REDACTED_SECRET]';
        }

        let processedLine = line;
        for (const patternString of customPatterns) {
          // Check timeout (The Fail-Safe post-execution throw)
          if (performance.now() - start > 500) {
            throw new Error('Sanitization timeout (possible ReDoS)');
          }

          try {
            const regex = new RegExp(patternString, 'g');
            const matches = processedLine.match(regex);
            if (matches && matches.length > 0) {
              console.log(JSON.stringify({
                event: 'secret_scrubbed',
                pr_id: prId?.toString() || 'unknown',
                file_path: filePath || 'unknown',
                rule_name: `CUSTOM_PATTERN: ${patternString}`
              }));
              processedLine = processedLine.replace(regex, '[REDACTED_SECRET]');
            }
          } catch (err: any) {
            // Re-throw compilation timeouts to trigger fail-safe
            if (err.message?.includes('timeout')) {
              throw err;
            }
            console.error(`[ArchiCheck] Failed to compile or run custom regex pattern "${patternString}":`, err);
          }
        }
        return processedLine;
      });

      // Secondary check post-map execution
      if (performance.now() - start > 500) {
        throw new Error('Sanitization timeout (possible ReDoS)');
      }

      sanitized = processedLines.join('\n');
    }

    return sanitized;
  })();

  return Promise.race([processingPromise, timeoutPromise]);
}
