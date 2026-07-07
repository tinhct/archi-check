import { QuizPayload } from '@/types/archicheck';

/**
 * Generates the clean markdown comment for a gated pull request containing the LLM questions.
 */
export function generateQuizComment(payload: QuizPayload): string {
  const intro = [
    '## 🔍 ArchiCheck Cognitive Gate Intervention',
    'This pull request contains architectural code modifications or was committed at high velocity.',
    'To preserve system intuition, please justify the following decisions in a reply comment below.',
    ''
  ].join('\n');

  const questionsSection = payload.questions.map((q) => {
    return [
      `### ❓ Question: ${q.question}`,
      `* **Target File**: \`${q.targetFile}\``,
      `* **Rationale**: *${q.rationale}*`,
      '```typescript',
      q.codeSnippet,
      '```',
      ''
    ].join('\n');
  }).join('\n');

  const instructions = [
    '---',
    '💡 **How to reply**:',
    '- Reply directly in this PR thread answering the questions above.',
    '- Only new, non-quoted text blocks in your comment will be evaluated by the gate.',
    '- Once submitted, the system will automatically validate your justification and release the status hold.',
    '',
    '*💡 Tip: You may respond in English, Vietnamese, German, or your native technical language. Technical accuracy is what matters.*'
  ].join('\n');

  return `${intro}\n${questionsSection}\n${instructions}`;
}

/**
 * Generates the markdown warning comment posted when Redis state persistence fails (Fail-Open).
 */
export function generateRedisFailureComment(): string {
  return [
    '## ⚠️ ArchiCheck Bypassed',
    'State persistence cached database is currently unreachable (Redis Write Failure).',
    'Automated architectural review skipped to prevent pipeline blocking. **Manual peer review is heavily advised.**'
  ].join('\n');
}

/**
 * Generates warning comment when a user other than the PR author attempts to answer the quiz.
 */
export function generateNonAuthorWarningComment(user: string, author: string): string {
  return `❌ @${user}, to ensure systemic intuition is retained by the code contributor, only the PR Author (@${author}) may answer this interrogation. Tech Leads may use \`/archicheck bypass\` if this is an emergency.`;
}
