# Implementation Plan: AC-ST-503 — The "BYOK" Free-Tier Setup Wizard

**Target Story/Epic:** AC-ST-503 / Epic-05

**Status:** Draft

**Approved By:** _Pending_ | **Approval Date:** _Pending_

---

## 🔍 Retrospective Scan (Historical Mitigations)

| Past Lesson | Sprint | Mitigation Applied in This Plan |
|---|---|---|
| Multiline `.env.local` variables (e.g., `GITHUB_PRIVATE_KEY`) are corrupted if a naive string replace is used | Sprint 1 | The wizard patches `.env.local` using a line-by-line regex substitution targeting only `LLM_API_KEY=` and `LLM_PROVIDER_TYPE=` lines — all other lines are left untouched and written back verbatim. |
| `fs.readFileSync` in tests reads real disk files, causing non-deterministic failures | Sprint 4 | All wizard tests mock the `node:fs` module using `vi.mock('node:fs')` to prevent reading or writing the developer's real `.env.local` file. |
| CI environment must not route to corporate Vertex AI keys | Multiple | The wizard strictly sets `LLM_PROVIDER_TYPE=gemini-developer` — it never writes `vertex` or modifies `GOOGLE_CREDS_JSON`. |

---

## 🎯 Execution Scope

* **Objective:** Author a Node.js CLI script (`npm run setup:keys`) that interactively guides a new contributor to enter their free-tier Google AI Studio key, validates it with a lightweight live ping (`countTokens`), supports an `--offline` skip flag, and safely injects the key into `.env.local` without corrupting existing variables (especially multiline PEM certificates).
* **Prerequisites:**
  * `DEP-09`: Gemini `countTokens` payload compatibility — External. Verify the free-tier quota allows `countTokens` without a billing account.
  * `@google/genai` SDK must already be installed (confirmed from Epic 4).

---

## 🛠️ Step-by-Step Execution Steps

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| 1 | Create `scripts/setup-keys.mjs` as a standalone ES Module CLI script. Parse `process.argv` to detect the `--offline` flag. | `scripts/setup-keys.mjs` | Running `node scripts/setup-keys.mjs --offline` proceeds without any network call. |
| 2 | Install `prompts` as a dev dependency (`npm install -D prompts`) for interactive terminal prompts. Add the `setup:keys` script entry to `package.json`: `"setup:keys": "node scripts/setup-keys.mjs"`. | `package.json` | `npm run setup:keys` launches the interactive CLI prompt. |
| 3 | Implement the interactive flow: (a) Display a welcome banner with instructions to get a free key at `aistudio.google.com`. (b) Prompt for the API key with `prompts({ type: 'password', name: 'key' })`. | `scripts/setup-keys.mjs` | Terminal shows the welcome text and a masked password prompt. |
| 4 | Implement key validation. If `--offline` flag is present, print a yellow `⚠️ Offline mode enabled. Skipping Gemini API validation.` warning and skip. Otherwise, call `new GoogleGenAI({ apiKey }).models.countTokens(...)`. On failure, prompt: `"Validation failed. Do you want to save this key anyway? (y/N)"`. | `scripts/setup-keys.mjs` | Online mode: a valid key passes silently. An invalid key triggers the `y/N` prompt. Offline mode: warning is printed and flow continues. |
| 5 | Implement `.env.local` safe injection. Read the file if it exists. Filter out any existing `LLM_API_KEY=` or `LLM_PROVIDER_TYPE=` lines. Append the two new lines. Write the result back. If `.env.local` does not exist, create it fresh. | `scripts/setup-keys.mjs` | After running the wizard, `.env.local` contains `LLM_API_KEY=<key>` and `LLM_PROVIDER_TYPE=gemini-developer`. All other existing lines (including `GITHUB_PRIVATE_KEY="..."`) are preserved verbatim. |
| 6 | Write Vitest unit tests using `vi.mock('node:fs')` and `vi.mock('@google/genai')` to simulate: (a) successful key validation, (b) offline flag, (c) validation failure with `y` override, (d) validation failure with `N` abort, (e) `.env.local` preservation of existing multiline vars. | `scripts/setup-keys.test.ts` | `npm run test:run` passes all cases. No real file writes or network calls during tests. |

---

## ⏪ Rollback Strategy

* **Trigger:** The wizard corrupts an existing `.env.local` (e.g., truncates `GITHUB_PRIVATE_KEY`).
* **Action:** Restore `.env.local` from the `.env.example` reference file and manually re-enter credentials. Harden the file-write logic with a backup step (`cp .env.local .env.local.bak`) before any write.
