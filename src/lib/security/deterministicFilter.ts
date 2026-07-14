/**
 * Deterministic string validation algorithms to catch gibberish, spam,
 * or keyboard-mashing comments before calling external LLM providers.
 */

export function validateCommentReply(reply: string): { valid: boolean; reason?: string } {
  const trimmed = reply.trim();

  // 1. Repetitive character check (e.g. "aaaa", "ffff", "1111")
  // Excludes punctuation and spaces by targeting alphanumeric characters.
  if (/([a-zA-Z0-9])\1{3,}/i.test(trimmed)) {
    return { valid: false, reason: 'Repetitive character pattern detected.' };
  }

  // 2. Word count and character variety (only for replies >= 20 characters)
  if (trimmed.length >= 20) {
    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < 3) {
      return { valid: false, reason: 'Response must contain at least 3 words.' };
    }

    const uniqueChars = new Set(trimmed.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (uniqueChars.size < 6) {
      return { valid: false, reason: 'Response lacks sufficient character variety.' };
    }
  }

  // 3. Suspicious word length check (reject words > 15 characters without path separators or camelCase)
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  for (const word of words) {
    if (word.length > 15) {
      const hasPathSeparators = /[\/\._]/.test(word);
      const isCamelCase = /[a-z][A-Z]/.test(word);
      if (!hasPathSeparators && !isCamelCase) {
        return { valid: false, reason: 'Suspiciously long word detected.' };
      }
    }
  }

  return { valid: true };
}

/**
 * Extracts individual answers from a concatenated playground answer string.
 * Playground answers are formatted as: "Q1: Question\nA1: Answer\n\nQ2: Question..."
 */
export function extractAnswers(concatenated: string): string[] {
  const matches = [...concatenated.matchAll(/A\d+:\s+([\s\S]*?)(?=\n\nQ\d+:|$)/g)];
  return matches.map((m) => m[1].trim());
}
