# Implementation Plan: AC-ST-501 — The Local AI Playground (UI & API)

**Target Story/Epic:** AC-ST-501 / Epic-05

**Status:** Draft

**Approved By:** _Pending_ | **Approval Date:** _Pending_

---

## 🔍 Retrospective Scan (Historical Mitigations)

| Past Lesson | Sprint | Mitigation Applied in This Plan |
|---|---|---|
| `waitUntil` is undefined in Vitest environments | Sprint 3 | `/api/playground` route handler wraps any background calls in `typeof waitUntil === 'function'` guard. |
| Vitest scans Playwright spec files causing import crashes | Sprint 4 | Playground E2E test named `playground.spec.ts` and explicitly added to Vitest `exclude` in `vitest.config.ts`. |
| `.env.local` multiline variable truncation | Sprint 1 | Playground reads `LLM_API_KEY` via the existing `env.ts` factory — no new env parsing code introduced. |

---

## 🎯 Execution Scope

* **Objective:** Build a developer-only local web UI at `/playground` that accepts raw git diffs, runs them through the existing sanitizer and LLM provider factory, and renders the generated quiz JSON — with template preloading and a production edge block.
* **Prerequisites:**
  * `DEP-08`: Next.js Middleware edge path blocking — Internal, no external dependency.
  * `src/lib/llm/provider.ts` and `src/lib/security/sanitizer.ts` must be stable (both Done from Epic 4).

---

## 🛠️ Step-by-Step Execution Steps

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| 1 | Create Next.js Middleware that intercepts `/playground` and `/api/playground/*` routes. If `NODE_ENV === 'production'`, immediately return a `NextResponse` with status `404`. | `middleware.ts` (project root) | Navigating to `/playground` in a production build returns 404. Local dev renders correctly. |
| 2 | Create the `/api/playground` POST route. Accept `{ diff: string, provider: string }` body, run `scrubSecrets(diff)` then `getProvider(provider).generateQuiz(diff)`, return `{ sanitizedDiff, quiz, tokenCost }`. Add `notFound()` secondary guard if `NODE_ENV === 'production'`. | `src/app/api/playground/route.ts` | POST to `/api/playground` with a raw diff returns a structured quiz JSON object. |
| 3 | Create the Playground page component with a `notFound()` guard as secondary defense. | `src/app/playground/page.tsx` | Page renders in dev. Returns 404 in production build. |
| 4 | Build the split-pane React UI: left pane has a `<textarea>` for diff input and a provider `<select>` (`mock` / `gemini-developer`); right pane renders the JSON output and estimated token cost. Style with dark-mode CSS. | `src/app/playground/page.tsx`, `src/app/playground/playground.css` | UI renders with both panes visible. Submitting a diff populates the right pane with JSON. |
| 5 | Implement the "Load Template" `<select>` dropdown. Selecting a scenario (Clean / Leaky Diff / Prompt Injection / ReDoS) auto-populates the diff textarea from hardcoded template strings sourced from Sprint 4 scenario payloads. | `src/app/playground/page.tsx` | Selecting "Leaky Diff" from the dropdown fills the textarea with the AWS key diff. |
| 6 | Write Vitest unit tests for the `/api/playground` route: mock `scrubSecrets` and `getProvider`, assert response contains `sanitizedDiff`, `quiz`, `tokenCost`. Add `playground.spec.ts` path to Vitest `exclude` in `vitest.config.ts`. | `src/app/api/playground/route.test.ts`, `vitest.config.ts` | `npm run test:run` passes. No Playwright import conflicts. |

---

## ⏪ Rollback Strategy

* **Trigger:** If `middleware.ts` breaks routing for any existing route (e.g., `/api/webhook`), or if `/playground` is reachable in a production build.
* **Action:** `git revert` the `middleware.ts` commit. Verify existing webhook routes are restored by running `npm run test:run` and confirming all 57+ existing tests pass green.
