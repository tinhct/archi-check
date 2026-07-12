# Implementation Plan: AC-ST-502 — "Shadow Mode" (Read-Only Webhooks)

**Target Story/Epic:** AC-ST-502 / Epic-05

**Status:** Approved

**Approved By:** Product Owner | **Approval Date:** 2026-07-10

---

## 🔍 Retrospective Scan (Historical Mitigations)

| Past Lesson | Sprint | Mitigation Applied in This Plan |
|---|---|---|
| GitHub Octokit client stubs must mock both `.rest` and `.request` methods to avoid `TypeError` | Sprint 3 | Shadow Mode unit tests will stub both `octokit.issues.createComment` and `octokit.request` (used by `createCommitStatus`) to fully exercise interception logic. |
| Redis integration tests leave stale state, affecting concurrent runs | Sprint 4 | Shadow Mode instantiates a fresh `InMemoryCache` (JS Map) per webhook invocation — no real Redis keys are ever written. Unit tests require zero `afterEach` cleanup. |
| Mock diff volume must exceed 300 lines to trigger gate heuristics | Sprint 4 | Shadow Mode tests will explicitly set `MOCK_LINES_OVERRIDE=true` or use a config threshold override, not mutate diff payloads. |

---

## 🎯 Execution Scope

* **Objective:** Introduce an `ARCHICHECK_MODE=shadow` environment flag that allows the complete webhook pipeline (heuristics → sanitization → LLM call) to execute against live repository data but intercepts all outbound write operations (GitHub comments, commit status changes, Redis writes), dumping the intercepted payloads to the local terminal in either human-readable or structured JSON format.
* **Prerequisites:**
  * `src/lib/github/auth.ts` (Octokit wrapper) must be stable — Done from Epic 4.
  * `src/lib/redis/client.ts` (Redis cache factory) must be stable — Done from Epic 2.

---

## 🛠️ Step-by-Step Execution Steps

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| 1 | Create `src/lib/cache/inMemoryCache.ts` implementing the same `get(key)` / `set(key, value, ttl)` / `delete(key)` interface as the existing Upstash Redis client. Back it with a JS `Map`. | `src/lib/cache/inMemoryCache.ts` | Unit test: `set` then `get` returns the same value. `delete` removes the key. |
| 2 | Update `src/lib/redis/client.ts` factory. If `process.env.ARCHICHECK_MODE === 'shadow'`, instantiate and return `InMemoryCache` instead of the `UpstashRedisCache`. | `src/lib/redis/client.ts` | Setting `ARCHICHECK_MODE=shadow` in `.env.local` and running the webhook results in zero Upstash connection attempts in the logs. |
| 3 | Create `src/lib/shadow/shadowLogger.ts`. Export a `logIntercepted(action: string, payload: unknown): void` function. If `ARCHICHECK_SHADOW_FORMAT=json` is set, emit a single-line `JSON.stringify` to `process.stdout`. Otherwise, emit a colorized `console.log` trace line: `[SHADOW MODE] 🟡 <action> intercepted`. | `src/lib/shadow/shadowLogger.ts` | Without `ARCHICHECK_SHADOW_FORMAT=json`, terminal shows colorized trace. With it, `stdout` receives a minified JSON string. |
| 4 | Update the GitHub App Octokit wrapper (`src/lib/github/auth.ts`). Wrap `octokit.issues.createComment` and `octokit.repos.createCommitStatus` calls. If `ARCHICHECK_MODE === 'shadow'`, call `logIntercepted(...)` and return a mocked successful response instead of making real API calls. | `src/lib/github/auth.ts` | Running a webhook with `ARCHICHECK_MODE=shadow` prints shadow trace to terminal. No comment appears in GitHub. No status check is mutated. |
| 5 | Disable `/archicheck bypass` parsing when Shadow Mode is active. At the start of the bypass command handler in `src/app/api/webhook/route.ts`, add an early return if `process.env.ARCHICHECK_MODE === 'shadow'`, logging a shadow interception notice. | `src/app/api/webhook/route.ts` | Posting `/archicheck bypass` with `ARCHICHECK_MODE=shadow` results in a shadow log only — no GitHub status is mutated. |
| 6 | Write unit tests: (a) `inMemoryCache.test.ts` covering get/set/delete, (b) `shadowLogger.test.ts` asserting output format branching, (c) update existing webhook route tests to assert bypass command early-exits when `ARCHICHECK_MODE=shadow`. | `src/lib/cache/inMemoryCache.test.ts`, `src/lib/shadow/shadowLogger.test.ts`, existing route test files | `npm run test:run` passes all tests. No Redis credentials needed in the test environment. |

---

## ⏪ Rollback Strategy

* **Trigger:** If the Octokit wrapper changes cause real GitHub API calls to fail in production (i.e., the shadow intercept branch accidentally activates in non-shadow mode).
* **Action:** `git revert` the `src/lib/github/auth.ts` commit. Validate by setting `ARCHICHECK_MODE=` (unset) and confirming all existing webhook integration tests pass.
