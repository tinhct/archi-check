import { z } from 'zod';

/**
 * Zod schema enforcing the structure of the LLM-generated quiz payload.
 * Used for Structured Outputs when calling OpenAI/Gemini/Anthropic.
 */
export const quizPayloadSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string().describe('Unique identifier for this question (e.g. q1, q2)'),
      question: z.string().describe('The architectural comprehension question for the developer'),
      targetFile: z.string().describe('The file path targeted by this question'),
      codeSnippet: z.string().describe('The code block in the file that prompts this question'),
      rationale: z.string().describe('The underlying reason why this question is crucial to ask'),
    })
  ).min(1).max(3),
});

/**
 * Zod schema enforcing the response validation payload structure.
 */
export const evaluationResponseSchema = z.object({
  passed: z.boolean().describe('Whether the developer proved architectural comprehension'),
  score: z.number().min(0).max(10).describe('Comprehension score out of 10'),
  reasoning: z.string().describe('Detailed explanation of why the answer was accepted or rejected'),
});

export type QuizPayloadType = z.infer<typeof quizPayloadSchema>;
export type EvaluationResponseType = z.infer<typeof evaluationResponseSchema>;
