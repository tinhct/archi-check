# Implementation Plan: Epic 4 (Repository Customization & DX)

This plan details the technical tasks, file modifications, code interfaces, and test strategies required to complete Sprint 4.

---

## 🚀 Part 1: Story 4.1 - Local Mock LLM Service

### 1. Task 4.1.1: Build Mock LLM Service (`src/lib/llm/mock_llm.ts`)
*   **Target Interface**: Implement the existing LLM provider methods:
    ```typescript
    export interface ILLMProvider {
      generateQuiz(diff: string): Promise<QuizPayload>;
      validateAnswers(diff: string, questions: QuizPayload, answers: string[]): Promise<EvaluationResult>;
    }
    ```
*   **Logic**:
    *   `generateQuiz`: Returns a static, schema-compliant `QuizPayload` containing three mock questions discussing simulated files.
    *   `validateAnswers`: Evaluates the first string inside the `answers` array.
        *   If `answers[0].length > 20`, returns:
            ```json
            { "passed": true, "score": 9, "reasoning": "Mock success validation approved." }
            ```
        *   If `answers[0].length <= 20`, returns:
            ```json
            { "passed": false, "score": 4, "reasoning": "Mock justification is too brief. Please elaborate." }
            ```

### 2. Task 4.1.2: Environment Toggle Wiring (`src/lib/llm/provider.ts`)
*   **Refactor**:
    *   Add `mock` to the `LLMProvider` initialization.
    *   If `env.LLM_PROVIDER_TYPE === 'mock'`, forward `generateQuiz` and `validateAnswers` directly to the `MockLLMProvider` implementation.
    *   Verify that no external network requests or fetch operations are executed when running under `mock` mode.

### 3. Task 4.1.3: Zod ENV Validation (`src/config/env.ts`)
*   **Refactor**:
    *   Update the Zod `LLM_PROVIDER_TYPE` validation to accept `mock` in the enum:
        ```typescript
        LLM_PROVIDER_TYPE: z.enum(['gemini-developer', 'vertex', 'mock']).default('gemini-developer'),
        ```
    *   Add a strict conditional check inside the Zod schema refinement block:
        ```typescript
        .superRefine((data, ctx) => {
          if (process.env.NODE_ENV === 'production' && data.LLM_PROVIDER_TYPE === 'mock') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "CRITICAL: Mock provider is strictly prohibited in production environments.",
              path: ['LLM_PROVIDER_TYPE']
            });
          }
          if (process.env.NODE_ENV === 'production') {
            if (data.LLM_PROVIDER_TYPE === 'gemini-developer' && (!data.LLM_API_KEY || data.LLM_API_KEY === 'mock-api-key')) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "LLM_API_KEY is required for gemini-developer in production.",
                path: ['LLM_API_KEY']
              });
            }
            if (data.LLM_PROVIDER_TYPE === 'vertex' && (!data.GOOGLE_CREDS_JSON || data.GOOGLE_CREDS_JSON.trim().length === 0)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "GOOGLE_CREDS_JSON is required for Vertex AI in production.",
                path: ['GOOGLE_CREDS_JSON']
              });
            }
          }
        })
        ```

---

## 🛠️ Part 2: Story 4.2 - Robust `.archicheck.yml` Configuration Parser

### 1. Task 4.2.1: GitHub API File Fetcher (`src/lib/github/configFetcher.ts`)
*   **Create Utility**: Implement a helper function `fetchRepositoryConfig`:
    *   Input: `octokit` (authenticated Github App client), `owner: string`, `repo: string`, `ref: string` (commit SHA).
    *   Logic:
        1.  Attempt to fetch `/.archicheck.yml` using `octokit.rest.repos.getContent`.
        2.  If the response is a 404 (or throws), immediately catch and attempt to fetch `/.archicheck.yaml`.
        3.  If both are 404, gracefully return `null`.
        4.  If a configuration is returned, extract the base64-encoded string content.

### 2. Task 4.2.2: YAML Parsing & Validation (`src/lib/config/yamlParser.ts`)
*   **Create Service**: Implement `parseAndValidateConfig`:
    *   Input: `yamlContentString: string`.
    *   Logic:
        1.  **Size Guard**: Verify `Buffer.byteLength(yamlContentString, 'utf8') <= 51200` (50KB limit). If exceeded, throw an explicit `ConfigSizeError` (or return the fallback defaults).
        2.  **Parse**: Call `YAML.parse(yamlContentString)`.
        3.  **Validate**: Pass parsed JSON object to `archicheckConfigSchema.parse(parsedObject)`.
            *   Zod's `.default()` values will automatically merge system defaults for missing keys.
        4.  **Try/Catch Wrapper**: Wrap all parsing inside a `try/catch` returning default settings if any corruption occurs, logging a warning console message.

### 3. Task 4.2.3: Inject Config into Heuristics & Analysis
*   **Heuristics Update**: Refactor `heuristicsService.shouldGate` signature to accept a configuration object:
    ```typescript
    shouldGate(
      analysis: ComplexityAnalysis, 
      aiRelianceRatio: number,
      timeDeltaMinutes?: number,
      config?: ArchicheckConfig
    ): boolean
    ```
*   **State Caching Update**: Save the parsed configuration parameters inside the Redis cache state so that subsequent validation webhooks (such as replies validation) preserve the custom thresholds.
*   **Excluded Paths Gating**: Update the path matcher in `diff-parser.ts` to respect `excluded_paths` configured in `.archicheck.yml`.

---

## 🧪 Part 3: Test Verification Plan

*   **Unit Tests**:
    *   `mock_llm.test.ts`: Verify dynamic length check logic (length 15 returns `passed: false`, length 25 returns `passed: true`).
    *   `env.test.ts`: Assert that setting `LLM_PROVIDER_TYPE=mock` throws validation errors in production environments.
    *   `yaml_parser.test.ts`: Verify that YAML parsing correctly merges partial config files (e.g., config only containing `lines_added_threshold: 150` defaults the other fields properly).
    *   `size_limiter.test.ts`: Verify that a string exceeding 50KB triggers a size boundary abort.
*   **Integration Tests**:
    *   `sequential_fetch.test.ts`: Stub Octokit calls to verify the fallback sequence (`.yml` $\rightarrow$ `.yaml` $\rightarrow$ default config).
