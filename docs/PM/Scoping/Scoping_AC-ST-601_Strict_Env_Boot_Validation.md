# Scoping Document: Enforce Strict Environment Variable Boot Validation

**Reference:** AC-ST-601 (Sprint 6)

**Status:** Approved (Approach A)

**Last Updated:** 2026-07-14

## 1. Problem

Currently, if the standard RSA certificate structure in `GITHUB_PRIVATE_KEY` is misconfigured or truncated during environment copy-pasting (e.g. missing `\n` newlines, missing PEM headers, or incorrect characters), Next.js boots successfully without warning. The system only fails later when an active pull request webhook event is received, throwing cryptic cryptography signature or JWT signing exceptions at runtime. This leads to silent fail-opens in production or broken deployments that are hard to diagnose.

## 2. Constraints

* **Architecture/Code:** Validation must occur in the central environment schema parser (`src/config/env.ts`) so that validation is unified with other variables.
* **Dependencies:** Must utilize the existing Zod library configurations to check format.
* **Security/Performance:** The validation check must execute instantly during server boot, before the application starts accepting HTTP connections.
* **Team Conventions:** If validation fails, it must print a clear, colorized, human-readable traceback console log indicating the exact formatting issue (e.g., missing RSA headers or missing newlines), then abort the process with a non-zero exit code (`process.exit(1)`).

## 3. Success Criteria

* **Fatal Boot Failure:** The application immediately crashes on boot (`npm run start` or `npm run dev`) if `GITHUB_PRIVATE_KEY` lacks standard RSA PEM headers or is single-line when it should be multiline.
* **Clear Console Diagnostic:** The crash message clearly states that the `GITHUB_PRIVATE_KEY` env var is misconfigured, preventing generic stack trace confusion.

## 4. Candidate Approaches

* **Approach A: Zod Schema Custom Refinement** — Extend the existing Zod environment parsing schema in `src/config/env.ts` with a `.refine()` block on `GITHUB_PRIVATE_KEY`. It validates that the string contains `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` (or `PRIVATE KEY` generic headers) and contains multiple newline strings.
  * *Trade-off:* Zero additional files, leverages Next.js native startup validation, but errors are formatted inside Zod's default error format unless intercepted.
* **Approach B: Pre-Boot Validation Script** — Write a standalone shell/TypeScript pre-boot script (`scripts/validate-pem.ts`) that runs in the CI/CD pipeline or as a npm `predev`/`prestart` script.
  * *Trade-off:* Separates startup validation from the main app code, but adds configuration complexity to `package.json` scripts and increases container boot times slightly.

## 5. Open Questions & Assumptions

* **Assumption:** The `GITHUB_PRIVATE_KEY` is loaded into the server environment as a string containing newlines (either literal newlines or escaped `\n` characters that get replaced at runtime).
* **Question:** Should the validator attempt to automatically replace `\n` strings with literal newlines on boot, or strictly reject them and force the user to fix the configuration? (Recommended: Perform replacing first, then validate the final parsed certificate format).
