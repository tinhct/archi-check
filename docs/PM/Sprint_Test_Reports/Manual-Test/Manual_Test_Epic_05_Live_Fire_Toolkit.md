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

## 🧪 Section 2 — AC-ST-502: Shadow Mode

### Prerequisites
- Add `ARCHICHECK_MODE=shadow` to `.env.local`
- Restart dev server: `npm run dev`
- Ensure `.env.local` contains `MOCK_GITHUB=true` (forces offline client mockup)
- Ensure `.env.local` contains `GITHUB_WEBHOOK_SECRET` (e.g. `mock-secret`)

---

### Test 2.1 — Shadow Mode Redis Isolation & Outbound Writes Interception

| Step | Action Details | Expected Result |
|------|----------------|-----------------|
| 1 | Trigger a Pull Request `opened` event by running this signed webhook command in a new terminal window:<br/><br/>```bash\nnode - << '"'"'EOF'"'"'\nconst crypto = require("crypto");\nconst fs = require("fs");\nlet secret = "mock-secret";\n\ntry {\n  const envFile = fs.readFileSync(".env.local", "utf8");\n  const match = envFile.match(/^GITHUB_WEBHOOK_SECRET\\s*=\\s*["' "'"'"'"]?([^"' "'"'"'\\r\\n]+)/m);\n  if (match) secret = match[1];\n} catch (e) {}\n\nconst payload = {\n  action: "opened",\n  pull_request: { number: 501, head: { sha: "shadow-test-sha" } },\n  repository: { name: "archi-check", owner: { login: "tinhct" } },\n  installation: { id: 12345 }\n};\n\nconst body = JSON.stringify(payload);\nconst hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");\n\nfetch("http://localhost:3000/api/webhook", {\n  method: "POST",\n  headers: {\n    "content-type": "application/json",\n    "x-github-event": "pull_request",\n    "x-hub-signature-256": "sha256=" + hmac\n  },\n  body\n})\n.then(r => r.json())\n.then(console.log)\n.catch(console.error);\nEOF\n``` | Returns `{"message":"Webhook received and verification initiated"}` (HTTP 202) |
| 2 | Check the `npm run dev` server log output. | **No connection attempts** or read/write operations to Upstash Redis (the console logs will verify this since `InMemoryCache` is active). |
| 3 | Check the server logs for colorized trace outputs. | Visual output includes:<br/>`[SHADOW MODE] 🟡 createCommitStatus intercepted`<br/>`[SHADOW MODE] 🟡 createComment intercepted` |
| 4 | Verify GitHub client remains passive:<br/>- **If offline (MOCK_GITHUB=true):** Confirm the server terminal logs do NOT output any `[Mock GitHub] createComment called` or `[Mock GitHub] createCommitStatus called` blocks (which normally fire for mock writes).<br/>- **If online (MOCK_GITHUB=false):** Navigate to the Pull Request page on your real GitHub repository and verify that no new comments were posted and no commit statuses were modified. | **No live comments** or status checks are actually posted on GitHub (verifies absolute read-only safety). |

---

### Test 2.2 — Shadow Log Output Formats

| Step | Action Details | Expected Result |
|------|----------------|-----------------|
| 1 | Trigger the PR `opened` event (using the Node command from Test 2.1) while `ARCHICHECK_SHADOW_FORMAT` is **unset** in `.env.local`. | Dev console prints a colorized, multi-line human-readable trace. |
| 2 | Add `ARCHICHECK_SHADOW_FORMAT=json` to `.env.local`, restart your server, and trigger the webhook event again. | Dev console prints a minified single-line JSON string containing the fields `mode`, `timestamp`, `action`, and the structured `payload`. |
| 3 | Confirm piping works: Run a trigger while grepping for the shadow mode prefix:<br/>`npm run dev 2>&1 | grep '{"mode":"shadow"'` | Single-line JSON messages can be filtered, grep'd, and piped cleanly to other shells or diagnostic scripts. |

---

### Test 2.3 — Bypass Command Shadow Interception

| Step | Action Details | Expected Result |
|------|----------------|-----------------|
| 1 | Trigger a `/archicheck bypass` comment event by running this signed webhook command in a new terminal window:<br/><br/>```bash\nnode - << '"'"'EOF'"'"'\nconst crypto = require("crypto");\nconst fs = require("fs");\nlet secret = "mock-secret";\n\ntry {\n  const envFile = fs.readFileSync(".env.local", "utf8");\n  const match = envFile.match(/^GITHUB_WEBHOOK_SECRET\\s*=\\s*["' "'"'"'"]?([^"' "'"'"'\\r\\n]+)/m);\n  if (match) secret = match[1];\n} catch (e) {}\n\nconst payload = {\n  action: "created",\n  issue: { number: 501, pull_request: {} },\n  comment: { user: { login: "techlead-admin" }, body: "/archicheck bypass" },\n  repository: { name: "archi-check", owner: { login: "tinhct" } },\n  installation: { id: 12345 }\n};\n\nconst body = JSON.stringify(payload);\nconst hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");\n\nfetch("http://localhost:3000/api/webhook", {\n  method: "POST",\n  headers: {\n    "content-type": "application/json",\n    "x-github-event": "issue_comment",\n    "x-hub-signature-256": "sha256=" + hmac\n  },\n  body\n})\n.then(r => r.json())\n.then(console.log)\n.catch(console.error);\nEOF\n``` | Returns `{"message":"[Shadow Mode] Bypass command intercepted — no GitHub state mutated."}` (HTTP 200) |
| 2 | Check the server logs. | Dev console displays `bypassCommand intercepted` log lines containing the payload: `{ prNumber: 501, commentAuthor: 'techlead-admin', commentBody: '/archicheck bypass' }`. |
| 3 | Verify state integrity. | No commit status updates are executed. |
| 4 | Remove `ARCHICHECK_MODE=shadow` from `.env.local` and restart your dev server. | Bypass gate is restored to normal stateful operation. |

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
