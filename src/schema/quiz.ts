import { z } from 'zod';
import { quizPayloadSchema } from '@/lib/llm/schema';

/**
 * Single question schema — sourced from src/lib/llm/schema.ts.
 * Importing the element type keeps a single source of truth for the quiz question shape.
 * Both POST /api/playground and POST /api/playground/evaluate import from here.
 */
export const QuizSchema = quizPayloadSchema.shape.questions.element;

/**
 * Shared diff input schema — max 50,000 characters.
 * Used by both POST /api/playground (Phase 1) and POST /api/playground/evaluate (Phase 2).
 * Single source of truth prevents limit drift between the two endpoints.
 */
export const DiffSchema = z
  .string()
  .min(1, 'Diff must not be empty.')
  .max(50000, 'Diff exceeds the maximum allowed size of 50,000 characters.');

/**
 * Token counts sub-schema — used inside Phase 1 and Phase 2 API responses.
 * Structurally compatible with the TokenCounts interface in src/types/archicheck.d.ts.
 */
const TokenCountsSchema = z.object({
  input: z.number().int().min(0),
  output: z.number().int().min(0),
  total: z.number().int().min(0),
});

/**
 * Phase 2 evaluate endpoint response — Zod discriminated union keyed on `reason`.
 *
 * Three variants enforce type-safe combinations at compile time:
 *  - 'success':             Pipeline ran correctly. LLM scored the reply.
 *                           `passed` reflects rubric outcome (true or false).
 *  - 'sanitizer_rejection': Reply was blocked by scrubSecrets before any LLM call.
 *                           Tokens are zeroed (no LLM call was made).
 *  - 'llm_format_error':   LLM responded but returned a score outside the 0-10 integer range.
 *                           Tokens reflect actual consumed tokens from the failed call.
 *
 * Field name is `reasoning` (not `rationale`) to maintain parity with the production
 * EvaluationResult type in src/types/archicheck.d.ts.
 */
export const EvaluateResponseSchema = z.discriminatedUnion('reason', [
  z.object({
    reason: z.literal('success'),
    passed: z.boolean(),
    score: z.number().int().min(0).max(10),
    reasoning: z.string(),
    passingThreshold: z.number(),
    tokens: TokenCountsSchema,
  }),
  z.object({
    reason: z.literal('sanitizer_rejection'),
    passed: z.literal(false),
    score: z.null(),
    reasoning: z.string(),
    passingThreshold: z.number(),
    tokens: TokenCountsSchema,
  }),
  z.object({
    reason: z.literal('llm_format_error'),
    passed: z.literal(false),
    score: z.null(),
    reasoning: z.string(),
    passingThreshold: z.number(),
    tokens: TokenCountsSchema,
  }),
]);

export type EvaluateResponse = z.infer<typeof EvaluateResponseSchema>;

/**
 * Playground fixture schemas — validates the versioned playground-fixtures.json structure.
 * The Zod parse MUST be gated behind `process.env.NODE_ENV !== 'production'` in all
 * UI component imports to prevent fixture validation code from running in production.
 */
const PlaygroundFixturePhase2Schema = z.object({
  quizJson: z.array(QuizSchema),
  reply: z.string(),
});

const PlaygroundFixtureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  phase1: z.object({
    diff: z.string(),
  }),
  phase2: PlaygroundFixturePhase2Schema.optional(),
});

export const PlaygroundFixtureFileSchema = z.object({
  version: z.literal('1.0', {
    error: 'Unsupported fixture version. To add support, update PlaygroundFixtureFileSchema in src/schema/quiz.ts.',
  }),
  fixtures: z.array(PlaygroundFixtureSchema),
});

export type PlaygroundFixture = z.infer<typeof PlaygroundFixtureSchema>;
export type PlaygroundFixtureFile = z.infer<typeof PlaygroundFixtureFileSchema>;
