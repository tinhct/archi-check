# Product Backlog: ArchiCheck

**Last Refined:** 2026-07-09

**Product Owner Persona:** Senior Agile Product Manager

## 📊 Backlog Health Summary

| Total Epics | Total Stories | To Do | In Progress | Done | Completion % | Created/Updated Date |
|-------------|---------------|-------|-------------|------|--------------|----------------------|
| 4           | 12            | 2     | 1           | 9    | 75.0%        | 2026-07-09           |

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
* **Status:** In Progress
* **Description:** Enable seamless local contribution workflows without incurring API costs, and allow repository maintainers to customize ArchiCheck’s threshold logic.
* **Progress:** `[▓▓▓▓▓▓▓░░░] 66%`

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
* **Status:** In Progress
* **Assigned Sprint:** Sprint 4
* **Description:** As an open-source contributor, I want to configure custom trigger keywords and validation parameters (minimum length, force fail) in `.archicheck.mock.json` / `.archicheck.mock.local.json` files so that I can test diverse gating scenarios and reply validations offline.
* **Acceptance Criteria:**
  1. [ ] Priority lookup evaluates `.archicheck.mock.local.json` before falling back to `.archicheck.mock.json`.
  2. [ ] Halts execution and throws fatal exception if files exist but contain malformed JSON, and gracefully falls back to default hardcoded questions on missing files.
  3. [ ] Routes incoming PR diffs to specific mock quiz templates based on `trigger_keywords` matches against added code lines.
  4. [ ] Statelessly matches diff contents to evaluate developer responses against configurable `minimum_answer_length` and `force_fail` parameters.
* **Dependencies / Blockers:** Relies on AC-ST-401

---

## 🎯 Next Sprint Priorities (Refinement Queue)
1. **AC-ST-401: Local Mock LLM Service** (High - Critical for offline testing DX).
2. **AC-ST-402: Robust .archicheck.yml Configuration Parser** (High - Critical for maintainer custom settings).
3. **AC-ST-302: Token Burn Telemetry Alerting** (High - Critical budget control for enterprise trial cohorts).
4. **AC-ST-301: Pilot Onboarding & Cohort Configuration** (Medium - Required before deploying to regional cohorts).
