# Master Prompt & Policy Specification

**Last Updated:** 2026-07-08

## 📜 System Prompts

| Persona / Agent Role | Primary Objective | System Prompt Source File |
|----------------------|-------------------|---------------------------|
| **System Architect** | Generate 1-3 targeted questions on complexity decisions. | `src/lib/llm/prompts.ts#L8` (`QUIZ_GENERATION_V1`) |
| **Technical Lead** | Evaluate author justifications for correctness. | `src/lib/llm/prompts.ts#L22` (`ANSWER_VALIDATION_V1`) |

## 🧬 Prompt Architecture Structure

* **Context Injection:** Raw template replacement replacing placeholder tags (e.g. `{{diff}}`, `{{questions}}`, `{{answers}}`) with the scrubbed code diff, generated questions, and user replies.
* **Few-Shot Examples:** None in MVP. Zero-shot structured prompting is used due to the high quality of Gemini 2.5 Flash.
* **Output Schema Enforcement:** Handled natively by the SDK using the `responseSchema` configuration parameter (derived from Zod models in `src/lib/llm/schema.ts`):
  * Quiz Schema: `{ questions: Array<{ id: string, question: string, targetFile: string, codeSnippet: string, rationale: string }> }`
  * Validation Schema: `{ passed: boolean, score: number, reasoning: string }`
* **Tone & Persona Constraints:** Objective, technical, and analytical. Must avoid grammar-police checks and prioritize structural intent over language choice.
