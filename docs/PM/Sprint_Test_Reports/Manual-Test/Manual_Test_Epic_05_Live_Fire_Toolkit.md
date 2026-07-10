# Manual E2E Test Plan — Epic 05: The "Live-Fire" Developer Toolkit

**Feature:** AC-ST-501 / AC-ST-502 / AC-ST-503
**Date Generated:** 2026-07-10
**Author:** Senior QA Engineer (Agent)
**Status:** Ready for Human Execution

---

> [!IMPORTANT]
> Execute all steps below in a **local development** environment (`npm run dev`).
> These features are intentionally blocked in production. Confirm `NODE_ENV=development`.

---

## 🧪 Section 1 — AC-ST-501: Local AI Playground

### Prerequisites
- `npm run dev` running on `localhost:3000`
- `.env.local` contains `LLM_PROVIDER_TYPE=mock` (for offline testing)

### Test 1.1 — Production Block (Middleware Gate)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Build the project: `npm run build` | Build completes successfully |
| 2 | Start production server: `npm run start` | Server starts on port 3000 |
| 3 | Navigate to `http://localhost:3000/playground` | **Returns HTTP 404** — page not found |
| 4 | Send `POST http://localhost:3000/api/playground` with `{"diff":"test"}` | **Returns HTTP 404** |
| 5 | Restart in dev mode: `npm run dev` | Server starts, playground accessible |

### Test 1.2 — UI Renders Correctly

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:3000/playground` | Dark-mode playground UI appears |
| 2 | Verify header shows "🧪 ArchiCheck AI Playground" | Visible with "DEV ONLY" green badge |
| 3 | Verify production warning banner is visible | Yellow `⚠️ Local development environment` banner present |
| 4 | Verify left pane shows diff textarea | Empty textarea with placeholder text |
| 5 | Verify right pane shows empty state | "🔬 Paste a diff and click Run Analysis" message |

### Test 1.3 — Template Loader Dropdown

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Load Template" dropdown | 5 options appear: `— Load a template —`, 4 scenarios |
| 2 | Select "🔑 Scenario 1: Leaky Diff (AWS Key)" | Textarea auto-populates with diff containing `AKIAIOSFODNN7EXAMPLE` |
| 3 | Select "💉 Scenario 2: Prompt Injection Diff" | Textarea populates with injection phrase diff |
| 4 | Select "💣 Scenario 3: ReDoS Bomb" | Textarea populates with `TRIGGER_REDOS_TIMEOUT` diff |
| 5 | Select "✅ Scenario 4: Perfect Loop (Clean)" | Textarea populates with clean OrderService diff |

### Test 1.4 — Mock LLM Analysis

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select "🔑 Scenario 1: Leaky Diff" from templates | Diff populates |
| 2 | Ensure Provider is set to "🤖 Mock LLM (offline)" | Mock provider selected |
| 3 | Click "▶ Run Analysis" | Button shows "⏳ Analysing…" spinner in right pane |
| 4 | Wait for response | Right pane shows quiz questions as cards |
| 5 | Verify "💸 Token Cost" section appears | Shows token estimate string |
| 6 | Verify "🔒 Sanitized Diff" section appears | AWS key is replaced with `[REDACTED_SECRET]` |
| 7 | Verify "📦 Raw JSON Response" section appears | Valid quiz JSON rendered |

### Test 1.5 — Validation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "▶ Run Analysis" with empty textarea | Button is disabled (greyed out) |
| 2 | Type a diff manually, then click "Clear" | Textarea clears, dropdown resets, output clears |
| 3 | Submit a diff with only whitespace | Button remains disabled |

---

## 🧪 Section 2 — AC-ST-502: Shadow Mode

### Prerequisites
- Add `ARCHICHECK_MODE=shadow` to `.env.local`
- Restart dev server: `npm run dev`
- Set `MOCK_GITHUB=true` (for offline simulation)

### Test 2.1 — Shadow Mode Redis Isolation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send a PR open webhook payload to `/api/webhook` | Request completes successfully |
| 2 | Check server terminal output | **No Upstash Redis connection attempt** logged |
| 3 | Check terminal for `[SHADOW MODE] 🟡` lines | Colorized shadow log lines visible for write operations |
| 4 | Check GitHub | **No comment posted** to any PR |
| 5 | Check GitHub | **No commit status created** on any PR |

### Test 2.2 — Shadow Log Output Formats

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | With `ARCHICHECK_SHADOW_FORMAT` unset, trigger a webhook | Terminal shows colorized: `[SHADOW MODE] 🟡 createCommitStatus intercepted` |
| 2 | Add `ARCHICHECK_SHADOW_FORMAT=json` to `.env.local`, restart, trigger webhook | Terminal shows a single-line minified JSON: `{"mode":"shadow","timestamp":"...","action":"createCommitStatus","payload":{...}}` |
| 3 | Pipe output: `npm run dev 2>&1 \| grep '{"mode"'` | JSON lines can be grep'd and piped cleanly |

### Test 2.3 — Bypass Command Shadow Interception

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send a webhook simulating `/archicheck bypass` comment | Returns HTTP 200 |
| 2 | Verify terminal shows `bypassCommand intercepted` | Shadow log line appears |
| 3 | Verify GitHub | **No commit status change** on the PR |
| 4 | Remove `ARCHICHECK_MODE=shadow` from `.env.local`, restart | Normal bypass flow resumes |

---

## 🧪 Section 3 — AC-ST-503: BYOK Setup Wizard

### Test 3.1 — Offline Mode (No Network Call)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run: `npm run setup:keys -- --offline` | Welcome banner appears, `⚠️ Offline mode enabled. Skipping Gemini API validation.` shown |
| 2 | Paste any string when prompted for API key | Wizard accepts input |
| 3 | Check `.env.local` after wizard completes | `LLM_API_KEY=<entered-value>` and `LLM_PROVIDER_TYPE=gemini-developer` present |
| 4 | Verify all other existing `.env.local` lines are preserved | `GITHUB_APP_ID`, `UPSTASH_REDIS_REST_URL`, etc. unchanged |

### Test 3.2 — Invalid Key with Override

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run: `npm run setup:keys` (no offline flag) | Welcome banner appears |
| 2 | Enter a deliberately invalid key (e.g. `invalid-key-123`) | Wizard calls Gemini API, validation fails: `✖ Key validation failed.` |
| 3 | At the `Save this key anyway? (y/N):` prompt, type `y` | Wizard saves the key with a `⚠️ Saving unvalidated key` warning |
| 4 | Check `.env.local` | Key saved despite validation failure |

### Test 3.3 — Invalid Key with Abort

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run: `npm run setup:keys` | Welcome banner appears |
| 2 | Enter an invalid key | Validation fails |
| 3 | At `Save this key anyway? (y/N):` prompt, press Enter (default N) | Wizard prints `⚠️ Aborted. .env.local was not modified.` and exits |
| 4 | Check `.env.local` | File is **unchanged** from before the wizard ran |

### Test 3.4 — Multiline Value Preservation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Confirm `.env.local` contains `GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMII..."` | Note current value |
| 2 | Run wizard in offline mode with a new key | Wizard completes |
| 3 | Open `.env.local` | `GITHUB_PRIVATE_KEY` block is **identical** to before — not truncated or corrupted |

---

## ✅ Done Criteria

All three stories may be marked **Done** when all sections above pass without errors.

Update `/docs/PM/Product_Backlog.md` statuses accordingly:
- `AC-ST-501` → ✅ Done
- `AC-ST-502` → ✅ Done
- `AC-ST-503` → ✅ Done
