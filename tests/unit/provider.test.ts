import { describe, it, expect, vi, beforeEach } from 'vitest';
import { llmProvider } from '@/lib/llm/provider';
import { GoogleGenerativeAI } from '@google/generative-ai';

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: vi.fn()
        };
      }
    }
  };
});

describe('LLMProvider Unit Tests & Resiliency', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate a default fallback quiz when the LLM API call fails (Fail-Open)', async () => {
    // Spy on prototype method to intercept instantiation inside the provider
    const spy = vi.spyOn(GoogleGenerativeAI.prototype, 'getGenerativeModel').mockReturnValue({
      generateContent: vi.fn().mockRejectedValue(new Error('API Rate Limit Exceeded'))
    } as never);

    const result = await llmProvider.generateQuiz('some-diff-content');

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].targetFile).toBe('unknown');
    expect(result.questions[0].question).toContain('Bypassed due to LLM circuit breaker');
    expect(spy).toHaveBeenCalled();
  });

  it('should validate answers with a fallback value when the validation fails (Fail-Open)', async () => {
    const spy = vi.spyOn(GoogleGenerativeAI.prototype, 'getGenerativeModel').mockReturnValue({
      generateContent: vi.fn().mockRejectedValue(new Error('API Timeout'))
    } as never);

    const mockQuiz = {
      questions: [{ id: 'q1', question: 'Q', targetFile: 'F', codeSnippet: 'C', rationale: 'R' }]
    };
    
    const result = await llmProvider.validateAnswers('diff', mockQuiz, ['answer']);

    expect(result.passed).toBe(true);
    expect(result.score).toBe(10);
    expect(result.reasoning).toContain('Evaluation bypassed due to LLM timeout');
    expect(spy).toHaveBeenCalled();
  });
});
