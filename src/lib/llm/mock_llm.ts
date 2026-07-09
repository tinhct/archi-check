/* eslint-disable @typescript-eslint/no-unused-vars */
import { QuizPayload, EvaluationResult } from '@/types/archicheck';

/**
 * Local offline Mock LLM Provider to enable fast DX testing without API tokens.
 */
export class MockLLMProvider {
  async generateQuiz(_diff: string): Promise<QuizPayload> {
    return {
      questions: [
        {
          id: 'q1',
          question: 'Mock Question 1: What is the architectural purpose of these changes?',
          targetFile: 'src/lib/llm/provider.ts',
          codeSnippet: 'const provider = "mock";',
          rationale: 'Validating factory selection.'
        },
        {
          id: 'q2',
          question: 'Mock Question 2: Why are we bypassing API endpoints locally?',
          targetFile: 'src/lib/llm/provider.ts',
          codeSnippet: 'if (LLM_PROVIDER_TYPE === "mock")',
          rationale: 'Evaluating token cost mitigation.'
        }
      ]
    };
  }

  async validateAnswers(
    _diff: string,
    _questions: QuizPayload,
    answers: string[]
  ): Promise<EvaluationResult> {
    const answer = answers[0] || '';
    
    if (answer.trim().length > 20) {
      return {
        passed: true,
        score: 9,
        reasoning: '✅ Mock evaluation passed: Your justification is sufficiently detailed (length > 20 characters).'
      };
    }

    return {
      passed: false,
      score: 4,
      reasoning: '❌ Mock evaluation failed: Your explanation is too brief. Please elaborate with more detail (length must exceed 20 characters).'
    };
  }
}
