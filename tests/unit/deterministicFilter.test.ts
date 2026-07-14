import { describe, it, expect } from 'vitest';
import { validateCommentReply, extractAnswers } from '@/lib/security/deterministicFilter';

describe('Deterministic Filter Unit Tests', () => {
  describe('validateCommentReply', () => {
    it('should pass valid technical explanations in English', () => {
      const result = validateCommentReply('We added a cache layer to improve response latency to under 50ms.');
      expect(result.valid).toBe(true);
    });

    it('should pass valid explanations in German', () => {
      const result = validateCommentReply('Wir haben einen Cache hinzugefügt, um die Latenz zu verringern.');
      expect(result.valid).toBe(true);
    });

    it('should pass valid explanations in Vietnamese', () => {
      const result = validateCommentReply('Chúng tôi đã thêm một lớp bộ đệm để cải thiện thời gian phản hồi.');
      expect(result.valid).toBe(true);
    });

    it('should reject repetitive characters (e.g. key mashing)', () => {
      const result = validateCommentReply('aaaaabbbbbcccccdddddeeeee');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Repetitive character pattern');
    });

    it('should reject non-spaced long blocks when length is >= 20', () => {
      const result = validateCommentReply('thisisaveryslowandrepetitivesinglewordexplanation');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('at least 3 words');
    });

    it('should reject replies with insufficient unique character variety when length is >= 20', () => {
      const result = validateCommentReply('abc abc abc abc abc abc abc');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('character variety');
    });

    it('should reject replies containing single words longer than 15 characters without paths or camelCase', () => {
      const result = validateCommentReply('Here is a suspiciouswordlengthstring for evaluation.');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Suspiciously long word');
    });

    it('should pass long words if they contain path separators or extensions', () => {
      const result1 = validateCommentReply('We updated the path inside src/lib/security/deterministicFilter.ts.');
      expect(result1.valid).toBe(true);

      const result2 = validateCommentReply('Check this file: my_long_file_name_with_underscores.json.');
      expect(result2.valid).toBe(true);
    });

    it('should pass long words if they are standard camelCase or PascalCase compound names', () => {
      const result = validateCommentReply('We implemented the OrderRepositoryDecoratorImpl class.');
      expect(result.valid).toBe(true);
    });

    it('should not reject valid markdown lines or bullet points (e.g. --- or ...)', () => {
      const result1 = validateCommentReply('--- \n* First point. \n* Second point.');
      expect(result1.valid).toBe(true);

      const result2 = validateCommentReply('We are waiting on ... for confirmation.');
      expect(result2.valid).toBe(true);
    });
  });

  describe('extractAnswers', () => {
    it('should correctly extract answers from a concatenated playground string', () => {
      const concatenated = 'Q1: Why this cache?\nA1: To improve latency.\n\nQ2: What is the TTL?\nA2: We set it to 5 minutes.';
      const answers = extractAnswers(concatenated);
      expect(answers).toEqual([
        'To improve latency.',
        'We set it to 5 minutes.'
      ]);
    });

    it('should handle single-question concatenated strings', () => {
      const concatenated = 'Q1: Explain the change.\nA1: Just standard optimization.';
      const answers = extractAnswers(concatenated);
      expect(answers).toEqual(['Just standard optimization.']);
    });
  });
});
