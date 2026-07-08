# Product Backlog: ArchiCheck

**Last Refined:** 2026-07-08

**Product Owner Persona:** Senior Agile Product Manager

## 📊 Backlog Health Summary

| Total Epics | Total Stories | To Do | In Progress | Done | Completion % |
|-------------|---------------|-------|-------------|------|--------------|
| 3           | 8             | 2     | 0           | 6    | 75.0%        |

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
  1. [x] Wraps Gemini and Vertex AI invocations in a 15-second total timeout limit.
  2. [x] Handles exponential retry wait cycles on 429/5xx codes.
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

## 🎯 Next Sprint Priorities (Refinement Queue)
1. **AC-ST-302: Token Burn Telemetry Alerting** (High - Critical budget control for enterprise trial cohorts).
2. **AC-ST-301: Pilot Onboarding & Cohort Configuration** (Medium - Required before deploying to regional cohorts).
