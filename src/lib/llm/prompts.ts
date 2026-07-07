/**
 * Versioned prompt templates for ArchiCheck LLM interactions.
 * System prompts are versioned to track drift and optimize evaluation.
 */
export const PROMPTS = {
  /**
   * Version 1.0.0 of the Quiz Generation Prompt.
   * Directs the LLM to identify high-complexity architectural structures in a diff
   * and ask targeting questions.
   */
  QUIZ_GENERATION_V1: `
You are a Senior System Architect. Your job is to generate a comprehension quiz for a developer who submitted a pull request.
Review the following Git diff:
<diff>
{{diff}}
</diff>

Generate 1 to 3 targeted questions focused strictly on architectural decisions, state management, security-sensitive boundaries, or concurrency patterns visible in the diff.
Do not ask trivial questions about style or indentation.
Output must conform to the JSON Schema.
  `.trim(),

  /**
   * Version 1.0.0 of the Answer Validation Prompt.
   * Directs the LLM to verify if the developer's answers prove actual structural comprehension.
   */
  ANSWER_VALIDATION_V1: `
You are a Tech Lead. Check if the developer understands the PR they submitted.
Compare the Git diff, the questions asked, and the developer's responses.
<diff>
{{diff}}
</diff>

<questions>
{{questions}}
</questions>

<answers>
{{answers}}
</answers>

Evaluate if the developer demonstrates genuine comprehension of the architectural choices they checked in.
Ensure they are not pasting auto-generated AI boilerplate or evasive answers.
Output must conform to the JSON Schema with "passed", "score", and "reasoning".

CRITICAL INSTRUCTION: The user may respond in English, Vietnamese, German, or a mixed technical vernacular (e.g., using English tech terms within another language's grammar). DO NOT penalize for grammar, spelling, or language choice. You must evaluate ONLY the structural and technical accuracy of their reasoning. If their logic correctly answers the question, output passed: true.
  `.trim(),
};
