import { describe, it, expect } from 'vitest';
import { MockLLMProvider } from '@/lib/llm/mock_llm';

describe('MockLLMProvider Unit Tests', () => {
  const provider = new MockLLMProvider();

  it('should generate a structured mock quiz payload containing questions', async () => {
    const quiz = await provider.generateQuiz('some-diff');
    expect(quiz.questions).toHaveLength(2);
    expect(quiz.questions[0].id).toBe('q1');
    expect(quiz.questions[0].question).toContain('architectural purpose');
    expect(quiz.questions[1].id).toBe('q2');
    expect(quiz.questions[1].question).toContain('bypassing API endpoints');
  });

  it('should reject validations if answer justification is 20 characters or less', async () => {
    const mockQuiz = {
      questions: [{ id: 'q1', question: 'Q', targetFile: 'F', codeSnippet: 'C', rationale: 'R' }]
    };
    const result = await provider.validateAnswers('some-diff', mockQuiz, ['Too short answer']);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(4);
    expect(result.reasoning).toContain('too brief');
  });

  it('should approve validations if answer justification is greater than 20 characters', async () => {
    const mockQuiz = {
      questions: [{ id: 'q1', question: 'Q', targetFile: 'F', codeSnippet: 'C', rationale: 'R' }]
    };
    const result = await provider.validateAnswers('some-diff', mockQuiz, ['This is a sufficiently long justification of over twenty characters.']);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(9);
    expect(result.reasoning).toContain('sufficiently detailed');
  });
});
