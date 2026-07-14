# Implementation Plan: Edge Runtime waitUntil Async Queue Fallback

**Target Story/Epic:** AC-ST-602 / Epic-02

**Status:** Approved

**Approved By:** Product Owner | **Approval Date:** 2026-07-14

## 🔎 Retrospective Scan — Historical Mitigations Applied

* **Vitest waitUtil Omission (Sprint 3):** During test runs, `waitUntil` is undefined in Vitest Node environment, causing route handler unit tests to fail unless mocked.
  * **Mitigation:** We encapsulate background task tracking inside a unified utility wrapper (`trackTask`). This isolates Node.js runtime checks and provides a clean mock hook for testing environments.

## 🎯 Execution Scope

* **Objective:** Create a unified background task tracker utility (`asyncTracker.ts`) that falls back to tracking promises in-memory when Next.js `waitUntil` is undefined, preventing background thread execution cut-off in standalone Node.js container environments.
* **Prerequisites:** None.

## 🛠️ Step-by-Step Execution Steps

### 🟡 Task Group A: Task Tracker Utility

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| A1 | **Create `asyncTracker.ts`:** Create `src/lib/utils/asyncTracker.ts`. Export `trackTask(promise: Promise<unknown> \| (() => Promise<unknown>))` checking if `waitUntil` is defined. If yes, call it. If no, push the promise to a private `Set` of active promises, deleting it on `.finally()`. Export `drainTasks(): Promise<void>` to await all outstanding promises using `Promise.allSettled`. | `src/lib/utils/asyncTracker.ts` (NEW) | Code compiles with no TypeScript warnings. |
| A2 | **Register lifecycle event hooks:** Inside `asyncTracker.ts`, check `typeof process !== 'undefined'` and register `process.once('SIGTERM')` and `process.once('SIGINT')` hooks to await `drainTasks()` before container termination. | `src/lib/utils/asyncTracker.ts` | Server shuts down gracefully. |

### 🟡 Task Group B: Route Handler Integration

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| B1 | **Integrate in Webhook Route:** In `src/app/api/webhook/route.ts`, replace the native `waitUntil` imports and calls with `trackTask` from `@/lib/utils/asyncTracker`. Remove `if (typeof waitUntil === 'function')` inline condition blocks. | `src/app/api/webhook/route.ts` | The webhook route compiles and compiles cleanly. |

### 🟡 Task Group C: QA Validation & Verification

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| C1 | **Write unit tests for tracker:** Create `tests/unit/asyncTracker.test.ts` to assert: (1) `trackTask` correctly registers a task. (2) `drainTasks` awaits unresolved promises. (3) Tasks are automatically deleted from tracking list upon resolution. | `tests/unit/asyncTracker.test.ts` (NEW) | `npm run test:run` passes. |
| C2 | **Update webhook unit tests:** Verify webhook unit tests pass when `waitUntil` is mocked or when utilizing the tracker. | Webhook tests | Webhook tests pass. |
| C3 | **Execute regression checks:** Run full Vitest suite. | Test runner | All 149+ tests are green. |

## ⏪ Rollback Strategy

* **Trigger:** Container crash loops or memory leaks under Node.js runtime environment.
* **Action:** Revert imports in `route.ts` back to standard `next/server` `waitUntil` and delete `asyncTracker.ts`.
