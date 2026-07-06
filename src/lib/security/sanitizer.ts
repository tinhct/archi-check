/**
 * Sanitizes input strings (like Git diffs) by stripping out obvious sensitive patterns 
 * (API keys, private keys, passwords, bearer tokens) before they are sent to the LLM API.
 * Ensures zero data leakage of credentials to external services.
 * 
 * @param content The raw input text (e.g. Git diff).
 * @returns The sanitized text with credentials redacted.
 */
export function scrubSecrets(content: string): string {
  let sanitized = content;

  // Regular expressions for common secret signatures
  const patterns = [
    // AWS Keys
    { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/g, replacement: '[REDACTED AWS KEY]' },
    // Stripe API keys
    { name: 'Stripe API Key', regex: /sk_live_[0-9a-zA-Z]{24}/g, replacement: '[REDACTED STRIPE KEY]' },
    // Google API Keys
    { name: 'Google API Key', regex: /AIzaSy[0-9A-Za-z-_]{33}/g, replacement: '[REDACTED GOOGLE API KEY]' },
    // JWT Tokens
    { name: 'JWT Token', regex: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, replacement: '[REDACTED JWT]' },
    // Private RSA/Elliptic Curve keys
    { name: 'Private Key Block', regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[^-]+-----END [A-Z ]+ PRIVATE KEY-----/g, replacement: '[REDACTED PRIVATE KEY BLOCK]' },
    // Generic passwords or client secrets in config syntax
    { name: 'Generic Password', regex: /(password|passwd|secret|api_key|apikey|private_key|token|auth)\s*[:=]\s*["'](?!\[REDACTED)[^"']{4,}["']/gi, replacement: '$1: "[REDACTED SECRET]"' },
  ];

  for (const { regex, replacement } of patterns) {
    sanitized = sanitized.replace(regex, replacement);
  }

  return sanitized;
}
