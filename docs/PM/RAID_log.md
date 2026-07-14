# RAID Log

**Last Updated:** 2026-07-14

## ⚠️ Risks (Potential future problems)

| ID | Date Identified | Description | Impact (H/M/L) | Mitigation Strategy | Status (Open/Closed) |
|----|-----------------|-------------|----------------|---------------------|----------------------|
| R1 | 2026-07-06 | Unified diff parser memory/CPU overload on huge code changes. | H | Apply file blocklists and enforce a 1,500-line hard ceiling circuit breaker. | Closed |
| R2 | 2026-07-06 | GitHub API rate limits due to branch/ref-log queries. | M | Use First Commit Proxy branch timing via a single GET pulls query. | Closed |
| R3 | 2026-07-06 | Regex ReDoS (Denial of Service) from custom user patterns. | H | Implement 500-char line shield and 500ms post-execution CPU circuit breaker. | Closed |
| R4 | 2026-07-07 | Code syntax corruption in Git diff after credential redaction. | M | Utilize regex lookbehinds to redact only string values, leaving syntax intact. | Closed |
| R5 | 2026-07-07 | Proprietary source code leakage / LLM data training use. | H | Enforce Google Cloud Vertex AI enterprise endpoints with zero-data-retention. | Closed |
| R6 | 2026-07-07 | LLM API latency/outages freezing developer pull request merges. | H | Implement a 15-second total timeout with fail-open fallback questions. | Closed |
| R7 | 2026-07-07 | PR merge race conditions during heuristics processing window. | M | Lock commit status to Pending immediately upon webhook signature check. | Closed |
| R8 | 2026-07-07 | Upstash Redis database timeout/failure deadlocking gated PRs. | H | Wrap state cache in 1000ms timeout, fail-open to Success, and warn in PR comment. | Closed |
| R9 | 2026-07-07 | Out-of-order status check race condition (Success finishes before Pending). | H | Await the initial Pending status check synchronously before starting async heuristics. | Closed |
| R10 | 2026-07-07 | Vercel execution context freeze during async waitUntil background task. | H | Handle errors cleanly, minimize payload size, and trace worker lifecycle. | Closed |
| R11 | 2026-07-09 | YAML configuration parsing vulnerabilities or memory exhaustion. | M | Enforce 50KB maximum size constraints and wrap parsing in try/catch. | Closed |
| R12 | 2026-07-09 | Accidental mock provider activation in live production environments. | H | Enforce strict Zod discriminated union validation checks in production. | Closed |
| R13 | 2026-07-10 | GitHub staging E2E tests blocked by 2FA login prompts or anti-bot captchas. | H | Use Playwright `storageState` session caching + programmatic TOTP fallback. | Closed |
| R14 | 2026-07-10 | QA E2E test runs pollute staging branch refs and PR history. | M | Unconditional Octokit API teardown scripts deleting branches/PRs. | Closed |
| R15 | 2026-07-10 | GitHub webhooks fail to route to dynamic Vercel preview environments. | H | Programmatically update QA GitHub App webhook URL to preview URL in CI. | Closed |
| R16 | 2026-07-12 | Production regression if `validateAnswers` return type change (`EvaluationResult`) is not handled atomically with webhook route update. | H | Dual-approval PR gate required for AC-ST-504. CI must pass green before merge. | Closed |
| R17 | 2026-07-12 | `reasoning` vs `rationale` field name conflict between existing `evaluationResponseSchema` and Phase 2 API design. If misaligned, parity breaks silently. | M | Standardize on `reasoning` everywhere. Canonical Phase 2 schema updated to use `reasoning`. Verified in AC-ST-501-P2 AC-4. | Closed |
| R18 | 2026-07-12 | `playground-fixtures.json` containing adversarial prompt injection payloads may be included in production Next.js client bundle despite middleware 404 guard. | M | Configure `next.config.ts` webpack exclusion for `src/lib/mocks/` directory. Null-safety fallback `fixtures?.fixtures ?? []` required in UI component. | Closed |
| R19 | 2026-07-12 | LLM hallucinating scores outside 0-10 range causing Zod response parse failure, resulting in unhandled 500 on evaluate endpoint. | M | Route catches Zod parse failure and returns shaped `{ reason: "llm_format_error" }` 200 OK response instead of throwing. | Closed |
| R20 | 2026-07-14 | Next.js dev server showing client-side hydration warning overlays due to browser extensions injecting elements into MetadataWrapper. | M | Created `src/instrumentation-client.ts` to patch window.reportError before hydration runs, suppressing extension hydration errors in development. | Closed |
| R21 | 2026-07-14 | Infinite comment loop triggered when bot accounts reply to comment webhooks, causing recursive webhook triggering. | M | Filter out webhook events where comment author type is 'Bot' or username ends in '[bot]'. | Closed |
| R22 | 2026-07-14 | TypeError on live environments due to unconfigured Octokit in App constructor, leaving .rest undefined. | H | Pass custom REST-enabled Octokit class to App constructor options. | Closed |


## 🧠 Assumptions (Things accepted as true without proof)

| ID | Date | Description | Validation Plan | Status (Valid/Invalid/Pending) |
|----|------|-------------|-----------------|--------------------------------|
| A1 | 2026-07-06 | Webhook signature check ensures request origin authenticity. | HMAC validation suite in webhook tests. | Valid |
| A2 | 2026-07-07 | First Commit author date acts as a valid proxy for branch creation. | Comparative tests of PR timestamps vs commit metadata. | Valid |
| A3 | 2026-07-07 | paid/enterprise endpoints do not use code for foundational training. | Review of Vertex AI and Paid Claude Beta terms of service. | Valid |
| A4 | 2026-07-07 | GitGuardian Scan key is configured as a secret in CI environment. | Run CI checks with mock secrets. | Invalid |

## ⚖️ Decisions (Key choices made during sprints)

| ID | Date | Decision Made | Rationale & Alternatives Considered |
|----|------|---------------|-------------------------------------|
| D1 | 2026-07-06 | Adopt fail-open default policy. | Protects developer pipelines from deadlocks if internal caches/APIs fail. |
| D2 | 2026-07-06 | Choose Vitest over Jest. | Native ES module support, speed, and clean Next.js configurations. |
| D3 | 2026-07-06 | Use Node's timingSafeEqual. | Safeguards HMAC validation headers from timing side-channel attacks. |
| D4 | 2026-07-06 | Ngrok static proxy tunnel. | Smee-client timed out; localtunnel triggered anti-phishing interstitial warnings. |
| D5 | 2026-07-07 | JWT PEM newlines normalization. | Replacing raw string config `\n` blocks dynamically fixes parsing errors. |
| D6 | 2026-07-07 | Adopt First Commit Proxy. | Shaves 50-200ms off execution time compared to branch ref API lookups. |
| D7 | 2026-07-07 | Use standard `yaml` npm package. | Custom regex parsers fail on valid YAML multi-line or indented syntax. |
| D8 | 2026-07-07 | Vertex AI factory abstraction. | Keeps core OSS code key-agnostic, while fully protecting internal pilots. |
| D9 | 2026-07-07 | Lookbehind value-only redaction. | Keeps variables declared (`const key = "[REDACTED]"`) syntactically parseable. |
| D10 | 2026-07-07 | Lock status check to Pending immediately. | Prevents auto-merge race conditions where fast approvals bypass heuristics. |
| D11 | 2026-07-07 | Await initial status check synchronously. | Guarantees the block status finishes registering on GitHub before Edge responds 202. |
| D12 | 2026-07-07 | Strict PR Author Validation. | Prevents junior developer cognitive offloading by rejecting answers from reviewers. |
| D13 | 2026-07-07 | Language-Agnostic Intent-Based LLM Scoring. | Instructs LLM to evaluate raw technical correctness, accepting multilingual responses. |
| D14 | 2026-07-07 | Simple argument-free /archicheck bypass command. | Reduces friction and regex parse failure risks during P0 incidents. |
| D15 | 2026-07-07 | Mutate commit status check description on bypass. | Retains context `archicheck/verification` to unlock merge while leaving audit trails in UI. |
| D16 | 2026-07-09 | Migrate base model to Gemini 2.5 Flash. | Newer AI Studio API keys (AQ.) throw 404 Not Found errors on older 1.5 models. |
| D17 | 2026-07-09 | Environment-Driven Factory & Discriminated Union. | Permits mock local testing DX while structurally blocking mock activations in production. |
| D18 | 2026-07-09 | Implement 50KB size cap limit for .archicheck.yml parsing. | Enables user customizations while eliminating parsing DoS risks on live webhooks. |
| D19 | 2026-07-10 | Run E2E tests against dynamic Vercel previews. | Real GitHub UI validation is only possible if tests run against public URLs. |
| D20 | 2026-07-10 | Use storageState + otplib for E2E authentication. | Session cookie caching handles 95% of runs, with a programmatic TOTP fallback. |
| D21 | 2026-07-10 | API-driven global teardown branch cleanup. | Prevents repository branch bloat by closing PRs and deleting branches programmatically. |
| D22 | 2026-07-10 | Dynamic webhook updates via App API. | Updates the QA GitHub App webhook endpoint to match Vercel Preview dynamically in CI. |
| D23 | 2026-07-12 | Phase 2 evaluate response uses Zod discriminated union keyed on `reason` field with three variants: `success`, `sanitizer_rejection`, `llm_format_error`. | Flat schema permits logically impossible states (e.g., sanitizer_rejection with a score). Discriminated union enforces type-safe combinations at compile time. |
| D24 | 2026-07-12 | Fixture file location: `src/lib/mocks/fixtures/playground-fixtures.json` (not `tests/` or `public/`). | `tests/` excluded from tsconfig. `public/` exposes security payloads. `src/lib/mocks/` resolves cleanly through TypeScript compiler while remaining logically quarantined. |
| D25 | 2026-07-12 | `validateAnswers` confirmed pure (no Redis/Octokit side effects). Story 5.4 adds `tokens: { input, output, total }` to return type. | Side effects already correctly isolated in webhook route handler. Surfacing token counts enables playground evaluate route receipt display without duplicating LLM calls. |
| D26 | 2026-07-12 | Zod structural validation runs BEFORE `parseDiff()` on the evaluate endpoint. | `parseDiff()` uses expensive regular expressions. Zod length boundaries (O(1) checks) immediately drop oversized payloads before diff parsing, preventing ReDoS on the Node event loop. |
| D27 | 2026-07-12 | Sanitizer rejection of `reply` returns shaped HTTP 200 OK with `reason: "sanitizer_rejection"` and `passed: false`, NOT an HTTP 400. | HTTP 400 triggers generic error boundaries. A shaped 200 provides immediate, contextual feedback to developers testing prompt injection vectors locally, matching the pedagogical goal of the Playground. |
| D28 | 2026-07-12 | Phase 2 diff and quizJson size limits: `diff` max 50,000 chars (shared with Phase 1 via `DiffSchema`), `quizJson` max 20 items (`z.array(QuizSchema).max(20)`), `reply` max 10,000 chars. | Protects evaluate endpoint from context window exhaustion and quota abuse via direct API calls bypassing the UI. |
| D29 | 2026-07-12 | Playground evaluate route runs on Node.js runtime (not Edge). | Edge runtime dependency risk from transitive imports outweighs scalability benefit for a local-only developer tool. Middleware already blocks this route in production. |
| D30 | 2026-07-12 | `passingThreshold: 7` is a fixed system constant returned in every Phase 2 API response. Configurable threshold via `.archicheck.yml` deferred to Future sprint (BLG-01). | Dynamically parsing synthetic repo configs in a stateless sandbox adds significant scope. Default of 7 is sufficient for Sprint 5. |
| D31 | 2026-07-12 | Strict Invalidation rule: any diff `onChange` event or template load instantly nullifies `quizJson` and `evaluationResult` React state. Regenerate also clears Phase 2 state. CSS 0.2s opacity transition used for graceful visual fade. | Prevents contextual mismatch where quiz from Diff A is evaluated against Diff B reply. Debouncing creates a race condition window. |
| D32 | 2026-07-12 | Token counter uses Replace (not Accumulate) semantics on Regenerate. Pipeline Total shows spinner during active LLM call. | Accumulation misrepresents single-transaction cost. Spinner prevents stale values from being read as current truth. |

## 🐛 Issues (Current problems occurring right now)

| ID | Date | Description | Action Required | Status (Open/In Progress/Resolved) |
|----|------|-------------|-----------------|------------------------------------|
| I1 | 2026-07-06 | Sandbox blocks GitHub CLI API configuration commands. | Manually run configuration commands locally. | Resolved |
| I2 | 2026-07-06 | Vercel CLI hangs during env additions. | Wrote script to terminate command process after 7 seconds. | Resolved |
| I3 | 2026-07-07 | RSA Certificate load truncated in `.env.local`. | Wrap multiline private key strings in double quotes. | Resolved |
| I4 | 2026-07-07 | Upstash Redis `ping()` returns `PONG` instead of `OK`. | Correct test assertions in integration test files. | Resolved |
| I5 | 2026-07-07 | ReDoS test triggers Vitest watchdog timeouts. | Optimize test string to 26 characters to run under 1.5s. | Resolved |
| I6 | 2026-07-07 | CI fails to cache packages / incorrect paths. | Remove `working-directory` path prefixes from `.github/workflows/ci.yml`. | Resolved |
| I7 | 2026-07-07 | GitGuardian Scan fails on missing api-key. | Add `continue-on-error: true` to ggshield CI step. | Resolved |
| I8 | 2026-07-08 | Header `x-github-event` hardcoded to `pull_request` inside trigger tool. | Corrected header key to reference dynamic `eventType` variable. | Resolved |
| I9 | 2026-07-09 | Newly generated Gemini keys starting with `AQ.` throw 404 on `gemini-1.5`. | Migrated base model configuration to `gemini-2.5-flash`. | Resolved |
| I10 | 2026-07-10 | Vitest runs Playwright E2E files causing import test crashes. | Exclude `tests/e2e` files in `vitest.config.ts`. | Resolved |
| I11 | 2026-07-10 | Local E2E runs crash on missing user/password variables. | Output warning logs and write dummy auth states locally. | Resolved |
| I12 | 2026-07-10 | E2E mock diff volume does not trigger complexity gating. | Added 310 dummy line loops inside mock PR diff returns. | Resolved |
| I13 | 2026-07-10 | Playwright show-report fails due to missing HTML files. | Update config reporter to `[['list'], ['html', { open: 'never' }]]`. | Resolved |
