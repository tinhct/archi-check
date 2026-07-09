import { z } from 'zod';

export const SandboxQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  targetFile: z.string(),
  codeSnippet: z.string(),
  rationale: z.string()
});

export const SandboxScenarioSchema = z.object({
  trigger_keywords: z.array(z.string()).optional(),
  default_fallback: z.boolean().optional(),
  minimum_answer_length: z.number().default(20),
  force_fail: z.boolean().default(false),
  questions: z.array(SandboxQuestionSchema)
});

export const SandboxConfigSchema = z.array(SandboxScenarioSchema);

export type SandboxScenario = z.infer<typeof SandboxScenarioSchema>;
export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;
