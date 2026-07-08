# Goal
Parse Git diffs to extract algorithmic complexity, scrub all sensitive credentials from the payload, and establish a secure, zero-data-retention connection to the LLM API.

# List of Stories
* **Story 2.1: Diff Complexity Extraction & Heuristics**
  * **Task 2.1.1**: Build `diff-parser.ts` to fetch unified diffs from the GitHub API and isolate clean code additions.
  * **Task 2.1.2**: Implement the baseline heuristics score using specific keyword triggers (`class`, `interface`, `async`, `useState`, `useEffect`).
  * **Task 2.1.3**: Write the threshold evaluation function including the "First Commit Proxy" velocity rules.
* **Story 2.2: Payload Sanitization (Secret Scrubbing)**
  * **Task 2.2.1**: Update `sanitizer.ts` with default credential matching rules, line-length truncation shields (500 chars), custom patterns from `.archicheck.yml`, and 500ms ReDoS circuit breakers.
  * **Task 2.2.2**: Write unit tests verifying secret redaction and ReDoS circuit breaker triggers.
  * **Task 2.2.3**: Coordinate security architecture reviews (archived in [Feature_Payload_Sanitization_&_Secret_Scrubbing.md](../../Architecture/SD/Feature_Payload_Sanitization_&_Secret_Scrubbing.md)).
* **Story 2.3: Secure LLM API Connection & Prompting**
  * **Task 2.3.1**: Build `provider.ts` to support both standard Gemini Developer API and Google Cloud Vertex AI SDK integrations.
  * **Task 2.3.2**: Draft architectural system prompts inside `prompts.ts` using structured JSON output schemas.
  * **Task 2.3.3**: Implement the 15-second total timeout circuit breaker and retry strategy (2 retries on 429/5xx).
  * **Task 2.3.4**: Establish token consumption telemetry logs.

# Implementation Outcome
* **Diff Parsing & Scorer**: Successfully built [diff-parser.ts](../../../src/lib/analyzer/diff-parser.ts) and [heuristics.ts](../../../src/lib/analyzer/heuristics.ts). The engine skips blocklisted dependency manager logs, assets, and markdown documentation, and triggers gating checks if standard thresholds are breached or velocity is suspicious.
* **Scrubbing Pipeline**: Implemented a secure sanitization pipeline in [sanitizer.ts](../../../src/lib/security/sanitizer.ts) utilizing lookbehind regex patterns to redact secrets into `[REDACTED_SECRET]` without breaking Javascript code syntax.
* **ReDoS Shields**: Configured a 500-character line-length truncation guard and a 500ms execution timer that throws an error to fail-safe and quarantine payloads if ReDoS backtracking is suspected.
* **Vertex & Gemini SDKs**: Installed `yaml`, `@google/generative-ai`, and `@google-cloud/vertexai` dependencies. Implemented conditional factory initialization inside [provider.ts](../../../src/lib/llm/provider.ts) utilizing parsed `GOOGLE_CREDS_JSON` and `LLM_PROVIDER_TYPE` env configurations.
* **Timeout & Retry Circuit Breaker**: Programmed a 15-second total timeout with abort controllers and exponential backoff retry handlers (500ms/1500ms delays) to protect developer CI pipelines.
* **Documentation Portable standard**: Audited all markdown files to replace absolute local paths with relative ones, and established standards in [.cursorrules](../../../.cursorrules).
* **Test Verification**: Expanded Vitest suites with 23 passing tests covering parser hunk logic, heuristics velocity checks, ReDoS circuit breakers, and LLMProvider mock failures.

# Decisions Made
* **First Commit Proxy**: Adopted `TimeDelta = pull_request.created_at - First_Commit.author.date` as the development duration proxy for the "Spray and Pray" velocity heuristic, saving extra API ref lookups and conserving SLA headroom.
* **Synchronous Time Interceptions**: Implemented elapsed CPU-time checks post-execution in the sanitizer loop to throw timeout exceptions, successfully bypassing Node's single-threaded event loop block during catastrophic backtracking.
* **YAML Library Choice**: Decided to install the standard `yaml` package for parsing `.archicheck.yml` rather than writing custom regex parsers, ensuring support for all valid YAML indentation formats.

# Lessons Learned
* **Microtasks Precedence**: JavaScript microtasks execute before macrotasks (like `setTimeout`). Therefore, a synchronous CPU-bound regex thread-block cannot be preempted by `Promise.race(setTimeout)`. We must measure elapsed time post-execution and throw errors explicitly.
* **ReDoS Test Optimization**: Catastrophic backtracking execution scales exponentially ($2^N$). Decreased the ReDoS test repeating characters to exactly 26, ensuring it consistently exceeds 500ms on the sandbox CPU without hitting Vitest's 15-second watchdog threshold.

# Pending & Open Items
* **Unfinished Tasks/Stories:** None. All Sprint 2 stories completed.
* **Open Risks & Issues:** None.

# Burned Tokens
* **Total Prompt Tokens:** 64,800
* **Total Completion Tokens:** 12,850
* **Estimated API Cost:** $0.39
