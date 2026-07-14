# Implementation Plan: Enforce Strict Environment Variable Boot Validation

**Target Story/Epic:** AC-ST-601 / Epic-02

**Status:** Approved

**Approved By:** Product Owner | **Approval Date:** 2026-07-14

## 🔎 Retrospective Scan — Historical Mitigations Applied

* **Next.js 16 Startup Gaps (Sprint 5):** Next.js will successfully compile and boot the dev server even if environment variables are malformed, leading to delayed runtime cryptography crashes.
  * **Mitigation:** We enforce strict format checking at startup in the schema definition inside `src/config/env.ts`, causing Next.js to crash immediately during module evaluation.

## 🎯 Execution Scope

* **Objective:** Ensure the environment configuration schema parses `GITHUB_PRIVATE_KEY` for standard RSA delimiters and multi-line formatting on boot. It must crash the process immediately with a descriptive error if format validation fails, preventing misconfigured Docker containers or staging/production instances from running.
* **Prerequisites:** None.

## 🛠️ Step-by-Step Execution Steps

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| 1 | **Refine `envSchema` validator:** Add a refinement to `envSchema` in `src/config/env.ts`. For `GITHUB_PRIVATE_KEY`, if it is present and does not equal `'mock-key'`: (1) Replace escaped `\\n` with real `\n` to simulate runtime behavior. (2) Confirm it starts with `-----BEGIN` (allowing `RSA PRIVATE KEY` or generic `PRIVATE KEY` standard PEM headers) and ends with `-----END`. (3) Confirm it contains multiple lines (has `\n`). | `src/config/env.ts` | Zod schema validation will fail if a malformed key is passed. |
| 2 | **Normalize parsed environment output:** Make sure `parsedEnv.GITHUB_PRIVATE_KEY` contains the normalized key with real `\n` characters (or let `auth.ts` handle it, but ensuring it parses cleanly). | `src/config/env.ts` | The exported `env.GITHUB_PRIVATE_KEY` contains the formatted multiline certificate string. |
| 3 | **Update environment boot exception handler:** Ensure that if `envSchema.parse(process.env)` throws a Zod error, we print the validation issues in a clean, human-readable console message and throw a fatal error. | `src/config/env.ts` | Running the server with a malformed key crashes with a clear console message. |
| 4 | **Add env boot validation tests:** Add tests in `tests/unit/env.test.ts` checking: (1) Valid multiline PEM private key passes. (2) Single-line key throws. (3) Key missing RSA headers throws. (4) Normalization of escaped `\\n` works. | `tests/unit/env.test.ts` | Running `npm run test:run` succeeds with the new unit tests. |
| 5 | **Verify TypeScript compilation:** Run `npx tsc --noEmit` to confirm no type signature drift. | Codebase | Typecheck passes with zero errors. |
| 6 | **Execute test suite regression:** Run `npm run test:run` to confirm all 141+ tests are green. | Test runner | All tests pass. |

## ⏪ Rollback Strategy

* **Trigger:** TypeScript fails to compile or the test suite fails regression check.
* **Action:** Revert changes to `src/config/env.ts` using `git checkout src/config/env.ts`.
