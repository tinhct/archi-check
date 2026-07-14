# Product Backlog: ArchiCheck

**Last Refined:** 2026-07-14

**Product Owner Persona:** Senior Agile Product Manager

## 📊 Backlog Health Summary

| Total Epics | Total Stories | To Do | In Progress | Done | Completion % | Created/Updated Date |
|-------------|---------------|-------|-------------|------|--------------|----------------------|
| 5           | 23            | 5     | 0           | 18   | 78.3%        | 2026-07-14           |

## 🚀 Epic Wall & Release Mapping

### Epic-01: Diff Complexity Scorer & Security Sanitizer
* **Status:** Done
* **Description:** Build the core logic that extracts code change complexity metrics, runs gating heuristics, sanitizes source diffs of any credentials, and provides abort-safe LLM API wrappers.
* **Progress:** `[▓▓▓▓▓▓▓▓▓▓] 100%`

#### 📋 User Stories

##### 🆔 AC-ST-101: Diff Complexity Scoring
* **Priority:** Highest
* **Status:** Done
* **Assigned Sprint:** Sprint 2
* **Description:** As an engineering manager, I want the system to calculate complexity keywords and velocity gates so that we only flag cognitive-heavy code changes.
* **Acceptance Criteria:**
  1. [x] Scans unified git diffs for structural syntax keywords.
  2. [x] Implements First Commit Proxy velocity delta evaluations.
* **Dependencies / Blockers:** None

##### 🆔 AC-ST-102: Payload Sanitization & ReDoS Shield
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 2
* **Description:** As a security architect, I want diff contents scrubbed of API keys and passwords with ReDoS watchdogs so that we never leak keys or block the Event Loop.
* **Acceptance Criteria:**
  1. [x] Employs ECMAScript lookbehind assertions to redact secret values while leaving variables parseable.
  2. [x] Truncates lines exceeding 500 characters and halts regex loops after 500ms.
* **Dependencies / Blockers:** None

##### 🆔 AC-ST-103: Resilient LLM Connection
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 2
* **Description:** As a developer, I want LLM calls wrapped in timeouts and exponential backoffs so that API rate limits never hang my build pipeline.
* **Acceptance Criteria:**
*   1. [x] Wraps Gemini and Vertex AI invocations in a 15-second total timeout limit.
*   2. [x] Handles exponential retry wait cycles on 429/5xx codes.
* **Dependencies / Blockers:** None

##### 🆔 AC-ST-104: LLM Contract Testing & Resiliency
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 3
* **Description:** As a QA engineer, I want contract tests written against the LLM APIs so that schema drift and API outages trigger graceful fail-open behaviors without blocking CI.
* **Acceptance Criteria:**
*   1. [x] Spies on Gemini/Vertex SDK calls to inject 429/Timeout exceptions and asserts default fail-open fallback yields.
*   2. [x] Validates that invalid JSON or altered response schemas throw parsing exceptions and redirect flow to fallback states timing-safely.
* **Dependencies / Blockers:** None

##### 🆔 AC-ST-601: Enforce Strict Environment Variable Boot Validation
* **Priority:** High
* **Status:** To Do
* **Assigned Sprint:** Sprint 6
* **Description:** As a Developer or Administrator, I want the environment configuration system to parse GITHUB_PRIVATE_KEY for standard RSA delimiters and multi-line formats on boot, so that key format errors are caught at startup rather than throwing cryptic JWT signing errors at runtime.
* **Acceptance Criteria:**
*   1. [ ] Zod env validation schema (`src/config/env.ts`) parses GITHUB_PRIVATE_KEY checking that it starts with `-----BEGIN RSA PRIVATE KEY-----` and contains newline formatting.
*   2. [ ] Startup fails immediately with a fatal error if key validation fails, stopping misconfigured Docker or staging/production server containers from booting.
* **Dependencies / Blockers:** None

##### 🆔 AC-ST-603: Standardize Pre-LLM API Validation Guardrails (Deterministic Filtering)
* **Priority:** High
* **Status:** To Do
* **Assigned Sprint:** Sprint 6
* **Description:** As a Product Owner, I want the production webhook pipeline (/api/webhook) and evaluate API route to use the same deterministic gibberish verification rules implemented in the local sandbox, so that nonsense answers are blocked at the API layer without burning LLM token budgets.
* **Acceptance Criteria:**
*   1. [ ] Webhook route processes reply comments through deterministic gibberish checks: character repetition checks, spacing/word count density, distinct letter counts, and suspicious single-word limits.
*   2. [ ] Obvious gibberish comments are rejected at the API layer (returning a status nudge / comment), avoiding expensive non-deterministic LLM evaluation calls.
*   3. [ ] Playground evaluate route (`/api/playground/evaluate`) uses the same deterministic checker.
* **Dependencies / Blockers:** Relies on Epic-05 (ac-st-501-p2, mock semantic validator logic)

---

### Epic-02: Interactive Interrogation Gate & Bypass
* **Status:** Done
* **Description:** Lock the PR merge checks, present markdown questions directly in the thread, validate author response justifications, and allow maintainer bypass overrides.
* **Progress:** `[▓▓▓▓▓▓▓▓▓▓] 100%`

#### 📋 User Stories

##### 🆔 AC-ST-201: Synchronous Gate Lock & Markdown UI
* **Priority:** Highest
* **Status:** Done
* **Assigned Sprint:** Sprint 3
* **Description:** As a PR author, I want the CI gate locked immediately upon push and a quiz comment posted containing files and rationales so that I know what to justify.
* **Acceptance Criteria:**
  1. [x] Locks commit status checks to `Pending` synchronously at webhook entry.
  2. [x] Appends native language tips welcoming Vietnamese/German answers.
* **Dependencies / Blockers:** Relies on Epic-01 Core Parser

##### 🆔 AC-ST-202: Author Answer Validation
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 3
* **Description:** As a team lead, I want replies parsed of blockquotes and validated strictly against the author login so that reviewers cannot take the quiz for them.
* **Acceptance Criteria:**
  1. [x] Strips email/web blockquotes (`>`) to parse clean justifications.
  2. [x] Blocks non-author answer submissions with warning replies.
* **Dependencies / Blockers:** Relies on AC-ST-201

##### 🆔 AC-ST-203: Break-Glass Slash Command (/archicheck bypass)
* **Priority:** Highest
* **Status:** Done
* **Assigned Sprint:** Sprint 3
* **Description:** As an administrator, I want to bypass status gates using a simple comment comment so that critical production hotfixes are never delayed during outages.
* **Acceptance Criteria:**
  1. [x] Intercepts `/archicheck bypass` comments ignoring trailing whitespace.
  2. [x] Queries repository permission levels to allow bypasses strictly for Admins/Maintainers.
* **Dependencies / Blockers:** Relies on AC-ST-201

##### 🆔 AC-ST-602: Implement Edge Runtime waitUntil Async Queue Fallback
* **Priority:** Medium
* **Status:** To Do
* **Assigned Sprint:** Sprint 6
* **Description:** As a System Architect, I want the webhook pipeline background execution task to support non-Edge platforms gracefully, so that the background LLM calls are not prematurely terminated when deploying to Node.js environments.
* **Acceptance Criteria:**
*   1. [ ] Implement a request context task queue helper to track background promises.
*   2. [ ] Helper executes `waitUntil` if available (Next.js/Vercel Edge default), or holds the request connection open / tracks promises via local lifecycle queues if running on standard Node.js containers.
* **Dependencies / Blockers:** None

---

### Epic-03: Staging Polish & Telemetry
* **Status:** To Do
* **Description:** Integrate telemetry analysis tools and prepare initial cohorts onboarding for early adopter developer teams and pilot cohorts.
* **Progress:** `[░░░░░░░░░░] 0%`

#### 📋 User Stories

##### 🆔 AC-ST-301: Pilot Onboarding & Cohort Configuration
* **Priority:** Medium
* **Status:** To Do
* **Assigned Sprint:** Future
* **Description:** As an onboarding manager, I want cohort mappings stored in configuration profiles so that pilot developer teams can use custom interrogation rules.
* **Acceptance Criteria:**
  1. [ ] Parse country-specific threshold configs from local YAML files.
  2. [ ] Map custom prompt validation presets according to regional team roles.
* **Dependencies / Blockers:** None

##### 🆔 AC-ST-302: Token Burn Telemetry Alerting
* **Priority:** High
* **Status:** To Do
* **Assigned Sprint:** Future
* **Description:** As a product owner, I want prompt and completion token costs aggregated and logged to Slack/email alerts when approaching the monthly limit.
* **Acceptance Criteria:**
  1. [ ] Accumulates token consumption metadata from Vercel execution streams.
  2. [ ] Issues warning payloads if cumulative consumption exceeds $200.
* **Dependencies / Blockers:** Relies on Epic-01 Telemetry Logs

---

### Epic-04: Repository Customization & Developer Experience (DX)
* **Status:** Done
* **Description:** Enable seamless local contribution workflows without incurring API costs, and allow repository maintainers to customize ArchiCheck’s threshold logic.
* **Progress:** `[▓▓▓▓▓▓▓▓▓▓] 100%`

#### 📋 User Stories

##### 🆔 AC-ST-401: Local Mock LLM Service
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 4
* **Description:** As an open-source contributor, I want a local mock LLM service that intercepts prompt requests and returns a schema-compliant mock response so that I can test UI and comprehension gates offline without API keys.
* **Acceptance Criteria:**
  1. [x] Returns strict JSON schema defined in `src/lib/llm/schema.ts` (`{ passed: boolean, reasoning: string }` or `{ questions: Array }`).
  2. [x] Activated via environment variable `LLM_PROVIDER_TYPE=mock`.
  3. [x] Restricts execution to non-production environments (`NODE_ENV !== 'production'`).
  4. [x] Implements a string-length evaluation heuristic (justifications $\le 20$ chars fail with a nudge comment, $> 20$ chars pass).
* **Dependencies / Blockers:** None

##### 🆔 AC-ST-402: Robust .archicheck.yml Configuration Parser
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 4
* **Description:** As a Repository Administrator, I want to define custom complexity thresholds and prompt parameters in a `.archicheck.yml` or `.archicheck.yaml` file so that ArchiCheck’s cognitive gate matches my team's standards.
* **Acceptance Criteria:**
  1. [x] Fetches configuration file sequentially from HEAD commit (`.archicheck.yml` first, then fallback to `.archicheck.yaml`).
  2. [x] Limits fetched config file size to 50KB to protect against memory DoS.
  3. [x] Gracefully falls back to system defaults on 404, parsing errors, or validation failures without throwing or crashing the webhook.
  4. [x] Validates inputs via Zod schema containing `lines_added_threshold`, `algorithmic_complexity_score`, `ai_reliance_ratio`, and `excluded_paths` with strict defaults.
* **Dependencies / Blockers:** None

##### 🆔 AC-ST-403: Evolving Local Mock LLM Service into a Dynamic Developer Sandbox
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 4
* **Description:** As an open-source contributor, I want to configure custom trigger keywords and validation parameters (minimum length, force fail) in `.archicheck.mock.json` / `.archicheck.mock.local.json` files so that I can test diverse gating scenarios and reply validations offline.
* **Acceptance Criteria:**
  1. [x] Priority lookup evaluates `.archicheck.mock.local.json` before falling back to `.archicheck.mock.json`.
  2. [x] Halts execution and throws fatal exception if files exist but contain malformed JSON, and gracefully falls back to default hardcoded questions on missing files.
  3. [x] Routes incoming PR diffs to specific mock quiz templates based on `trigger_keywords` matches against added code lines.
  4. [x] Statelessly matches diff contents to evaluate developer responses against configurable `minimum_answer_length` and `force_fail` parameters.
* **Dependencies / Blockers:** Relies on AC-ST-401

##### 🆔 AC-ST-404: Interactive Sanitization Pipeline Sandbox
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 4
* **Description:** As an open-source contributor, I want to locally simulate the secret scrubber, prompt injection detector, and ReDoS circuit breaker triggers so that I can verify the UI states and safety gates offline.
* **Acceptance Criteria:**
  1. [x] Exposes standard credential signatures (AWS, Slack Bot token, GCP private key block) and verifies they are scrubbed to `[REDACTED_SECRET]`.
  2. [x] Injects an artificial 505ms delay in `scrubSecrets` if `TRIGGER_REDOS_TIMEOUT` is matched in the diff (quarantined strictly to non-production environments).
  3. [x] Catches ReDoS timeout rejections in webhook routes to transition status checks to `success` (fail-open) with the description: `"⚠️ Custom secret sanitizer timed out. Gate bypassed."` and posts a PR warning comment.
  4. [x] Blocks prompt injection replies case-insensitively using substring filters, returning a score of 4 and reasoning: `"Security anomaly detected in response. Please provide a genuine architectural justification."`.
* **Dependencies / Blockers:** Relies on AC-ST-403

##### 🆔 AC-ST-405: Playwright E2E GitHub Simulation (Staging QA Automation)
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 4
* **Description:** As an Automation QA Engineer, I want to execute automated end-to-end integration tests on Vercel preview environments using Playwright, a dedicated QA bot account, and programmatically updated webhook URLs, so that we can validate UI gating states headlessly in CI without burning LLM tokens.
* **Acceptance Criteria:**
  1. [x] Playwright config reads `storageState` JSON session files from CI environment parameters, with programmatic fallback generating TOTP tokens via `otplib` (TOTP setup secret stored in GitHub Secrets).
  2. [x] The staging preview environment CI dynamically updates the webhook URL of the QA GitHub App instance to target the current Vercel preview URL before execution.
  3. [x] Implements an API-driven global teardown (`api-teardown.ts`) using `@octokit/rest` that unconditionally closes the opened pull request and deletes the `archicheck-qa-test-[timestamp]` branch.
  4. [x] Playwright executes Scenario 4 (Happy Path validation pass) and asserts commit status locks, quiz comment render, and status check unlocks.
  5. [x] Playwright executes Scenario 3 (ReDoS Bomb) and asserts the PR bypasses the gate, showing the fail-open warning message.
* **Dependencies / Blockers:** Relies on AC-ST-404

---

### Epic-05: The "Live-Fire" Developer Toolkit
* **Status:** Done
* **Description:** Empower developers to test real LLM generations locally using their own free-tier API keys, bypassing the need for live GitHub webhooks or staging infrastructure. Phase 2 extends the Local AI Playground into a stateful, two-stage interactive pipeline that mirrors the full GitHub PR comment/evaluation cycle. AC-ST-505 redesigned the UI into a Pipeline Thread layout with per-question inline reply boxes.
* **Progress:** `[▓▓▓▓▓▓▓▓▓▓] 100%`

#### 📋 User Stories

##### 🆔 AC-ST-501: The Local AI Playground (UI & API)
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 5
* **Description:** As a Developer or OSS Contributor, I want a local web interface (localhost:3000/playground) to paste PR diffs and test them against live LLMs, so that I can rapidly iterate on AI prompt engineering without triggering GitHub webhooks or polluting remote repositories.
* **Acceptance Criteria:**
  1. [x] Implement Next.js Middleware (`middleware.ts`) to intercept `/playground` and `/api/playground`. If `process.env.NODE_ENV === 'production'`, return an immediate 404 at the Edge.
  2. [x] Implement a secondary `notFound()` fallback inside the page and route components.
  3. [x] Build the Next.js API route that accepts a raw string diff, runs it through `sanitizer.ts`, sends it to the configured LLM provider, and returns the generated quiz JSON.
  4. [x] Build the React UI with a dark-mode developer aesthetic, utilizing a split-pane layout (Input Diff vs. Output JSON / Token Cost Estimate).
  5. [x] Implement a "Load Fixture" dropdown in the UI. Selecting a fixture instantly auto-populates the diff and optionally seeds Phase 2 quiz state.
* **Dependencies / Blockers:** Relies on Core Parser and Sanitizer configurations

##### 🆔 AC-ST-502: "Shadow Mode" (Read-Only Webhooks)
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 5
* **Description:** As a System Administrator, I want a mode that processes real GitHub webhooks but intercepts all outbound write actions, so that I can safely test ArchiCheck against live historical PRs in my repository without posting ghost comments to my team.
* **Acceptance Criteria:**
  1. [x] Update the GitHub App wrapper. If `process.env.ARCHICHECK_MODE === 'shadow'`, intercept and block `octokit.issues.createComment` and `octokit.repos.createCommitStatus`.
  2. [x] Intercept the caching utility: instantiate an `InMemoryCache` (using a JS Map) instead of the `UpstashRedisCache` so developers do not need live Redis credentials to run tests.
  3. [x] Route intercepted payloads to the local terminal. By default, output a colorized, human-readable trace log.
  4. [x] If `ARCHICHECK_SHADOW_FORMAT=json` is present in the environment, suppress all text logs and emit a single, strict, minified JSON object to stdout.
  5. [x] Strictly disable the parsing and execution of the `/archicheck bypass` slash command if Shadow Mode is active.
* **Dependencies / Blockers:** Relies on Webhook Handler

##### 🆔 AC-ST-503: The "BYOK" Free-Tier Setup Wizard
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 5
* **Description:** As a New Contributor, I want a CLI script to securely configure my own free-tier API key, so that I can test live-fire scenarios without needing access to the project's guarded Vertex AI staging budget.
* **Acceptance Criteria:**
  1. [x] Write a Node CLI script (`npm run setup:keys`) using inquirer or prompts to guide the user through setup.
  2. [x] Prompt the user for their Gemini Developer key, and attempt a real, lightweight API call (e.g. countTokens) to validate the key online.
  3. [x] If the user passes the `--offline` flag, skip the ping, display a yellow warning (`⚠️ Offline mode enabled. Skipping Gemini API validation.`), and proceed.
  4. [x] If validation fails online, prompt the user: *"Validation failed. Do you want to save this key anyway? (y/N)"*.
  5. [x] Upon success (or explicit override), automatically inject `LLM_API_KEY=[key]` and `LLM_PROVIDER_TYPE=gemini-developer` into `.env.local` without corrupting other variables.
* **Dependencies / Blockers:** None

##### 🆔 AC-ST-501-P2: Local AI Playground — Phase 2 (Two-Stage Evaluation Pipeline)
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 5
* **Description:** As a Developer tuning the AI system, I want a stateful two-stage interactive pipeline inside the Playground (Generate Quiz → Submit Reply → Grade) that mirrors the GitHub PR comment thread, so that I can test both generation and evaluation phases locally without triggering real webhooks.
* **Acceptance Criteria:**
  1. [x] **Schema Extraction (Task 5.1.1a):** `src/schema/quiz.ts` created with shared `QuizSchema` and `DiffSchema`. Both API routes import from it.
  2. [x] **Phase 1 Breaking Schema Change (Task 5.1.1b):** `POST /api/playground` now returns `{ quiz, tokens: { input, output, total } }`. All 9 Phase 1 unit tests updated.
  3. [x] **Evaluate API Route (Task 5.1.2):** `POST /api/playground/evaluate` implemented on Node.js runtime with Zod validation (reply min 20, max 10,000; quizJson max 20; diff max 50,000), sanitizer gate, LLM call, score integrity check. Production blocked via `notFound()`.
  4. [x] **Canonical Phase 2 Response Schema:** Discriminated union (`success | sanitizer_rejection | llm_format_error`) implemented in `src/schema/quiz.ts` and enforced in the route.
  5. [x] **Fixture File:** `src/lib/mocks/fixtures/playground-fixtures.json` created with 4 scenarios. webpack alias strips mocks from production client bundle.
  6. [x] **Two-Stage React UI:** State machine `idle → quiz_ready → evaluated` with strict downstream invalidation, fixture seeding, Pipeline HUD, per-question inline reply boxes (AC-ST-505), compact token badges, sanitized diff tab.
  7. [x] **Test Coverage:** 11 unit tests for evaluate route (97 total across 17 files). All green.
* **Dependencies / Blockers:** Blocked by AC-ST-504 (resolved). Requires `src/schema/quiz.ts` (created).

##### 🆔 AC-ST-504: Isolate & Surface LLM Evaluation Telemetry
* **Priority:** Highest (Hard blocker for AC-ST-501-P2 evaluate endpoint)
* **Status:** Done
* **Assigned Sprint:** Sprint 5
* **Description:** As a Tech Lead, I want `validateAnswers` in `provider.ts` to surface separate `input`/`output` token counts in its return value so that the Playground evaluate route and the webhook route can display accurate per-phase token costs, while formally verifying the function contains zero Redis/Octokit side effects.
* **Acceptance Criteria:**
  1. [x] **Verify Purity:** `validateAnswers` confirmed pure — all Octokit and Redis side effects confirmed in webhook route handler only.
  2. [x] **Update Return Type:** `EvaluationResult` type updated with `tokens: { input, output, total }`. `validateAnswers` threads token counts from `usageMetadata`.
  3. [x] **Update Fail-Open:** Fail-open return includes `tokens: { input: 0, output: 0, total: 0 }`.
  4. [x] **Update Webhook Route:** Webhook call-site updated. TypeScript compiles cleanly.
  5. [x] **Verify Shadow Mode Compatibility:** `auth.ts` Octokit interceptor verified compatible after return type change.
  6. [x] **Update Tests:** `provider.test.ts` and `simulation.test.ts` updated. 97/97 green.
  7. [x] **Dual Approval Gate:** Approved by Tech Lead and System Architect.
* **Dependencies / Blockers:** None.

##### 🆔 AC-ST-505: Playground UI — "Pipeline Thread" Layout Redesign
* **Priority:** High
* **Status:** Done
* **Assigned Sprint:** Sprint 5
* **Description:** As a Developer using the Playground, I want a Pipeline Thread layout with per-question inline reply boxes, compact token badges, and a Sanitized Diff tab, so that the interaction flow mirrors the GitHub PR comment thread and eliminates the reply megabox / token receipt sprawl.
* **Acceptance Criteria:**
  1. [x] Right pane renders one `question-thread-block` per question with inline `<textarea>` reply box (`reply-input-{question.id}`).
  2. [x] React state: `reply: string` replaced by `perQuestionReplies: Record<string, string>`. `invalidateDownstream()`, `handleReset()` clear the map. `handleRetryEval()` preserves it.
  3. [x] Concatenation: structured `Q{n}: {question}\nA{n}: {answer}` format joined by `\n\n` before POST to evaluate endpoint.
  4. [x] Evaluate button enabled only when ALL per-question boxes meet `MIN_REPLY_LENGTH` (20 chars). Per-box amber hint shown below threshold.
  5. [x] Token receipt table replaced with compact inline badges: `In: X | Out: Y | Total: Z` in Phase 1 card header.
  6. [x] Left pane tab bar: `[Raw PR Diff]` `[Sanitized View]`. Sanitized tab disabled until after Generate. Resets to Raw on `invalidateDownstream()`.
  7. [x] Phase 2 megabox removed from left pane.
  8. [x] Pipeline HUD (header bar) unchanged.
  9. [x] Fixture `phase2.reply` ignored — reply boxes left empty on fixture load.
  10. [x] Element IDs: `tab-raw`, `tab-sanitized`, `reply-input-{question.id}` added.
  11. [x] `npx tsc --noEmit` clean. 97/97 tests green (no regressions).
* **Dependencies / Blockers:** None — UI-only change, no API modifications.

---

## 📌 Non-Critical Backlog Items (Future Sprints)

The following items were identified during the Phase 2 design session and are deferred:

| ID | Description | Rationale for Deferral |
|----|-------------|------------------------|
| BLG-01 | Configurable `passingThreshold` via `.archicheck.yml` | Adds significant scope; default of 7 is sufficient for Sprint 5 sandbox |
| BLG-02 | `z.literal(0)` enforcement on `sanitizer_rejection` token fields | Over-engineering for current sprint |
| BLG-03 | Shared `DiffSchema` constant in `src/schema/quiz.ts` (already covered in AC-ST-501-P2 AC-1) | Covered |
| BLG-04 | Fixture schema `version` field migration tooling (v1.0 → v2.0 migration helper) | Future when fixtures evolve |

---

## 🎯 Next Sprint Priorities (Refinement Queue)

**Sprint 5 — COMPLETE ✅**
All Sprint 5 stories (AC-ST-501, AC-ST-502, AC-ST-503, AC-ST-504, AC-ST-501-P2, AC-ST-505) are Done.

**Sprint 6 — Sprint Backlog (Active Planning):**
1. **AC-ST-603: Standardize Pre-LLM API Validation Guardrails (Deterministic Filtering)** (High — Prevents production budget burn from spam replies)
2. **AC-ST-601: Enforce Strict Environment Variable Boot Validation** (High — Prevents runtime JWT key failures)
3. **AC-ST-302: Token Burn Telemetry Alerting** (High — Critical budget control before staging/prod launch)
4. **AC-ST-602: Implement Edge Runtime waitUntil Async Queue Fallback** (Medium — Ensures environment hosting flexibility)
5. **AC-ST-301: Pilot Onboarding & Cohort Configuration** (Medium — Required for Alpha pilots across initial developer teams)
