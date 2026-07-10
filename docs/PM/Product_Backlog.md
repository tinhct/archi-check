# Product Backlog: ArchiCheck

**Last Refined:** 2026-07-09

**Product Owner Persona:** Senior Agile Product Manager

## 📊 Backlog Health Summary

| Total Epics | Total Stories | To Do | In Progress | Done | Completion % | Created/Updated Date |
|-------------|---------------|-------|-------------|------|--------------|----------------------|
| 4           | 14            | 3     | 1           | 10   | 71.4%        | 2026-07-10           |

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
* **Description:** As an administrator, I want to bypass status gates using a simple comment command so that critical production hotfixes are never delayed during outages.
* **Acceptance Criteria:**
  1. [x] Intercepts `/archicheck bypass` commands ignoring trailing whitespace.
  2. [x] Queries repository permission levels to allow bypasses strictly for Admins/Maintainers.
* **Dependencies / Blockers:** Relies on AC-ST-201

---

### Epic-03: Staging Polish & Telemetry
* **Status:** To Do
* **Description:** Integrate telemetry analysis tools and prepare initial cohorts onboarding for the Vietnamese and European Alpha pilots.
* **Progress:** `[░░░░░░░░░░] 0%`

#### 📋 User Stories

##### 🆔 AC-ST-301: Pilot Onboarding & Cohort Configuration
* **Priority:** Medium
* **Status:** To Do
* **Assigned Sprint:** Future
* **Description:** As an onboarding manager, I want cohort mappings stored in configuration profiles so that Vietnam and EU pilots can use custom interrogation rules.
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
* **Status:** To Do
* **Description:** Empower developers to test real LLM generations locally using their own free-tier API keys, bypassing the need for live GitHub webhooks or staging infrastructure, while strictly protecting corporate token budgets.
* **Progress:** `[░░░░░░░░░░] 0%`

#### 📋 User Stories

##### 🆔 AC-ST-501: The Local AI Playground (UI & API)
* **Priority:** High
* **Status:** To Do
* **Assigned Sprint:** Sprint 5
* **Description:** As a Developer or OSS Contributor, I want a local web interface (localhost:3000/playground) to paste PR diffs and test them against live LLMs, so that I can rapidly iterate on AI prompt engineering without triggering GitHub webhooks or polluting remote repositories.
* **Acceptance Criteria:**
  1. [ ] Implement Next.js Middleware (`middleware.ts`) to intercept `/playground` and `/api/playground`. If `process.env.NODE_ENV === 'production'`, return an immediate 404 at the Edge.
  2. [ ] Implement a secondary `notFound()` fallback inside the page and route components.
  3. [ ] Build the Next.js API route that accepts a raw string diff, runs it through `sanitizer.ts`, sends it to the configured LLM provider, and returns the generated quiz JSON.
  4. [ ] Build the React UI with a dark-mode developer aesthetic, utilizing a split-pane layout (Input Diff vs. Output JSON / Token Cost Estimate).
  5. [ ] Implement a "Load Template" dropdown in the UI. Selecting a template must instantly auto-populate the input textarea with the 4 core mock scenarios from Sprint 4 (Clean, Leaky Diff, Prompt Injection, ReDoS).
* **Dependencies / Blockers:** Relies on Core Parser and Sanitizer configurations

##### 🆔 AC-ST-502: "Shadow Mode" (Read-Only Webhooks)
* **Priority:** High
* **Status:** To Do
* **Assigned Sprint:** Sprint 5
* **Description:** As a System Administrator, I want a mode that processes real GitHub webhooks but intercepts all outbound write actions, so that I can safely test ArchiCheck against live historical PRs in my repository without posting ghost comments to my team.
* **Acceptance Criteria:**
  1. [ ] Update the GitHub App wrapper. If `process.env.ARCHICHECK_MODE === 'shadow'`, intercept and block `octokit.issues.createComment` and `octokit.repos.createCommitStatus`.
  2. [ ] Intercept the caching utility: instantiate an `InMemoryCache` (using a JS Map) instead of the `UpstashRedisCache` so developers do not need live Redis credentials to run tests.
  3. [ ] Route intercepted payloads to the local terminal. By default, output a colorized, human-readable trace log.
  4. [ ] If `ARCHICHECK_SHADOW_FORMAT=json` is present in the environment, suppress all text logs and emit a single, strict, minified JSON object to stdout.
  5. [ ] Strictly disable the parsing and execution of the `/archicheck bypass` slash command if Shadow Mode is active.
* **Dependencies / Blockers:** Relies on Webhook Handler

##### 🆔 AC-ST-503: The "BYOK" Free-Tier Setup Wizard
* **Priority:** High
* **Status:** To Do
* **Assigned Sprint:** Sprint 5
* **Description:** As a New Contributor, I want a CLI script to securely configure my own free-tier API key, so that I can test live-fire scenarios without needing access to the project's guarded Vertex AI staging budget.
* **Acceptance Criteria:**
  1. [ ] Write a Node CLI script (`npm run setup:keys`) using inquirer or prompts to guide the user through setup.
  2. [ ] Prompt the user for their Gemini Developer key, and attempt a real, lightweight API call (e.g. countTokens) to validate the key online.
  3. [ ] If the user passes the `--offline` flag, skip the ping, display a yellow warning (`⚠️ Offline mode enabled. Skipping Gemini API validation.`), and proceed.
  4. [ ] If validation fails online, prompt the user: *"Validation failed. Do you want to save this key anyway? (y/N)"*.
  5. [ ] Upon success (or explicit override), automatically inject `LLM_API_KEY=[key]` and `LLM_PROVIDER_TYPE=gemini-developer` into `.env.local` without corrupting other variables.
* **Dependencies / Blockers:** None

---

## 🎯 Next Sprint Priorities (Refinement Queue)
1. **AC-ST-501: Local AI Playground (UI & API)** (High - Critical developer feedback loop DX).
2. **AC-ST-502: "Shadow Mode" (Read-Only Webhooks)** (High - Real repository safe integration testing).
3. **AC-ST-503: The "BYOK" Free-Tier Setup Wizard** (High - Frictionless onboarding for external contributors).
4. **AC-ST-302: Token Burn Telemetry Alerting** (High - Critical budget control for staging/prod).
5. **AC-ST-301: Pilot Onboarding & Cohort Configuration** (Medium - Required for Alpha pilots).
