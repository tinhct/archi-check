# Manual Test Guide — Live-Fire Staging (`MOCK_GITHUB=false`)

**Feature:** AC-ST-502 — Shadow Mode (Live GitHub App integration)
**Date Generated:** 2026-07-12
**Author:** Senior QA Engineer (Agent)
**Audience:** Junior Developers / New Contributors
**Status:** Ready for Human Execution

---

> [!CAUTION]
> **This guide uses REAL GitHub credentials and makes REAL API calls.**
> Before starting, confirm you are using a **dedicated test repository** — not a production
> codebase or any repository your team actively uses. Shadow Mode intercepts all outbound
> writes, so no comments or status checks will be posted, but the GitHub REST API **will**
> be called to fetch PR diffs and check collaborator permissions.

---

## 🎯 What You Are Testing

Shadow Mode with live credentials (`MOCK_GITHUB=false`) verifies that ArchiCheck can:

1. **Receive and authenticate** real webhook payloads signed by GitHub.
2. **Fetch live PR diffs** from the GitHub REST API using a real App installation token.
3. **Intercept all outbound write calls** (comments, commit status updates) so nothing is
   posted to your GitHub PR thread.
4. **Run the full pipeline** (sanitize → LLM → evaluate) against real code changes.

---

## 🧰 One-Time Setup (Prerequisites)

Complete this section **once** before running any test cases.
Each numbered item must be fully satisfied before proceeding.

---

### Step P1 — Register a GitHub App

> [!IMPORTANT]
> You need a GitHub App (not a Personal Access Token). GitHub Apps generate short-lived
> installation tokens with fine-grained permissions, which is what ArchiCheck uses.

1. Go to **GitHub → Settings → Developer Settings → GitHub Apps → New GitHub App**.
2. Fill in the required fields:
   - **App name:** `ArchiCheck-Local-Dev-<yourname>` (must be globally unique)
   - **Homepage URL:** `http://localhost:3000`
   - **Webhook URL:** Leave blank for now — you will fill this in at Step P4.
   - **Webhook secret:** Generate a random string (e.g. run `openssl rand -hex 20` in your terminal) and **save it** — you will need it later.
3. Set **Repository permissions**:
   - **Contents:** Read-only (to fetch diffs)
   - **Issues:** Read & Write (to read comments)
   - **Pull Requests:** Read & Write
   - **Commit Statuses:** Read & Write
4. Subscribe to events:
   - ✅ **Pull request**
   - ✅ **Issue comment**
5. Click **Create GitHub App**.
6. On the app detail page, note your **App ID** (shown at the top).
7. Scroll to **Private Keys** → **Generate a private key**. A `.pem` file downloads automatically. Keep it safe.

---

### Step P2 — Install the App on a Test Repository

1. Go to your new GitHub App page → **Install App** → select the **test repository** where you want to fire test webhooks.
2. After installing, note the **Installation ID** — you can find it in the URL of the installation page: `https://github.com/settings/installations/<INSTALLATION_ID>`.

> [!TIP]
> Create a **fresh empty repository** (e.g. `archicheck-live-test`) specifically for this
> purpose. Never install the test app on a repository used by your real team.

---

### Step P3 — Configure `.env.local`

Open `<PROJECT_ROOT>/.env.local` (create it if it does not exist) and add the following:

```bash
# ─── Live-Fire Shadow Mode Configuration ───────────────────────────────────────
MOCK_GITHUB=false
ARCHICHECK_MODE=shadow

# GitHub App credentials
GITHUB_APP_ID=<your-app-id-from-step-P1>
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
<paste the full contents of the .pem file here, keeping newlines>
-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=<the-random-secret-from-step-P1>

# LLM provider — use mock to avoid Gemini API costs during shadow testing
LLM_PROVIDER_TYPE=mock

# Upstash Redis is NOT required — Shadow Mode uses InMemoryCache automatically
# UPSTASH_REDIS_REST_URL=  (leave commented out)
# UPSTASH_REDIS_REST_TOKEN= (leave commented out)
```

> [!WARNING]
> **Never commit `.env.local` to git.** The project `.gitignore` already excludes it.
> Confirm with: `cat .gitignore | grep env.local`

---

### Step P4 — Start a Webhook Proxy (ngrok or smee)

GitHub cannot send webhooks to `localhost` directly. You need a proxy that creates a public
tunnel to your machine.

#### Option A — ngrok (recommended)

1. Install ngrok: https://ngrok.com/download (free account required)
2. Run: `ngrok http 3000`
3. Copy the **Forwarding URL** shown (e.g. `https://abc123.ngrok-free.app`).

#### Option B — smee.io (no account required)

1. Go to https://smee.io and click **Start a new channel**.
2. Copy the channel URL (e.g. `https://smee.io/AbCdEfGhIjKlMnOp`).
3. Install the smee client: `npm install -g smee-client`
4. Run: `smee --url https://smee.io/<your-channel> --target http://localhost:3000/api/webhook`

---

### Step P5 — Register the Proxy URL in Your GitHub App

1. Go to your GitHub App → **Edit** → **Webhook URL** field.
2. Set it to:
   - **ngrok:** `https://<your-ngrok-subdomain>.ngrok-free.app/api/webhook`
   - **smee.io:** `https://smee.io/<your-channel>` (smee proxies the target automatically)
3. Ensure **Active** checkbox is ticked.
4. Click **Save Changes**.

---

### Step P6 — Start the Dev Server

In a terminal window at `<PROJECT_ROOT>/archi-check/`:

```bash
npm run dev
```

Expected output (first few lines):
```
▲ Next.js 16.x (Turbopack)
- Local: http://localhost:3000
✓ Ready in ~230ms
```

> [!NOTE]
> Running **`npm run dev`** sets `NODE_ENV=development` automatically. This is necessary because the webhook API routes and testing triggers are blocked when `NODE_ENV=production` for safety.

> [!TIP]
> Keep this terminal window visible during all test cases — this is where you will read
> shadow mode intercept logs in real time.

> [!IMPORTANT]
> **Avoid Hydration Mismatch Errors in Browser:**
> When opening the application or testing UI components via your local server or the ngrok tunnel, always use an **Incognito/Private window** with all browser extensions disabled.
> 
> Browser extensions (such as Scite, password managers, or translation tools) can inject script tags or style elements into the page before React loads. Because next.js development overlays display hydration mismatches as prominent red error panels, testing in an extension-free environment is critical to verify clean rendering.



---

## 🧪 Test Cases

---

### Test B2.1 — Receiving a Live Pull Request Webhook

**Goal:** Confirm the server receives a signed webhook from GitHub, fetches the live diff, runs the full pipeline, and intercepts all outbound writes.

| Step | Action | What to Do (Detailed) | Expected Result |
|------|--------|-----------------------|-----------------|
| 1 | Open your test repository on GitHub.com | Navigate to `https://github.com/<your-org>/<your-test-repo>` | Repository home page loads |
| 2 | Create a feature branch | Click the branch dropdown → type a new branch name (e.g. `test/shadow-pr-1`) → click **Create branch** | New branch created |
| 3 | Add a small code change | Click **Add file → Create new file**, name it `test-shadow.ts`, add any content (e.g. `const x = 1;`), and commit directly to `test/shadow-pr-1` | File committed to the branch |
| 4 | Open a Pull Request | Click **Compare & pull request** → set base to `main` → click **Create pull request** | GitHub sends a live `pull_request.opened` webhook to your proxy URL |
| 5 | Watch the `npm run dev` terminal | Switch to the terminal running `npm run dev` within ~2 seconds of creating the PR | Terminal should print all of these lines (order may vary):<br/>• `[ArchiCheck] Webhook received`<br/>• `[ArchiCheck] Heuristics scored`<br/>• `[SHADOW MODE] 🟡 createCommitStatus intercepted`<br/>• `[SHADOW MODE] 🟡 createComment intercepted` |
| 6 | Verify no GitHub writes occurred | Go back to your test PR on GitHub.com and refresh the page | **No comment posted** in the PR thread. **No commit status check** (green/red badge) visible next to the commit SHA |
| 7 | Clean up | Close the PR on GitHub.com | PR closed |

> [!NOTE]
> If you see `Error: Could not resolve installation` or `JWT` errors in the terminal, your
> `GITHUB_APP_ID` or `GITHUB_PRIVATE_KEY` in `.env.local` is incorrect. Re-check Step P3.

---

### Test B2.2 — Shadow Format: Human-Readable (Default)

**Goal:** Verify the default shadow log format is colorized and multi-line (human-readable).

| Step | Action | What to Do (Detailed) | Expected Result |
|------|--------|-----------------------|-----------------|
| 1 | Confirm env setting | Open `.env.local` and confirm `ARCHICHECK_SHADOW_FORMAT` is **not set** (commented out or absent) | Variable absent from file |
| 2 | Restart dev server | Stop `npm run dev` (Ctrl+C) and run `npm run dev` again | Server restarts cleanly |
| 3 | Create another test PR | Repeat steps 2–4 from Test B2.1 (create a new branch, commit a file, open a PR) | GitHub fires a `pull_request.opened` webhook |
| 4 | Inspect terminal output | Look at the `npm run dev` terminal | Shadow logs appear as **colorized**, **multi-line** key-value blocks — NOT minified JSON |
| 5 | Locate intercept lines | Find the `[SHADOW MODE] 🟡` lines in the output | Each intercepted call appears on its own labeled block with fields like `action:`, `prNumber:`, `payload:` |

---

### Test B2.3 — Shadow Format: Structured JSON (`ARCHICHECK_SHADOW_FORMAT=json`)

**Goal:** Verify that setting `ARCHICHECK_SHADOW_FORMAT=json` switches to machine-readable single-line JSON output suitable for log aggregation tools.

| Step | Action | What to Do (Detailed) | Expected Result |
|------|--------|-----------------------|-----------------|
| 1 | Set the env variable | Open `.env.local` and add `ARCHICHECK_SHADOW_FORMAT=json` on a new line | File saved |
| 2 | Restart dev server | Stop `npm run dev` (Ctrl+C) and run `npm run dev` again | Server restarts cleanly |
| 3 | Fire the webhook | Repeat steps 2–4 from Test B2.1 | GitHub fires a live `pull_request.opened` webhook |
| 4 | Inspect terminal output | Look at the `npm run dev` terminal | Shadow intercept lines appear as **single-line minified JSON** objects (e.g. `{"mode":"shadow","timestamp":"...","action":"createCommitStatus","payload":{...}}`) |
| 5 | Verify JSON fields | Parse one of the JSON lines mentally or pipe it: `npm run dev 2>&1 \| grep '"mode":"shadow"'` in a new terminal | JSON contains: `mode`, `timestamp`, `action`, `payload` |
| 6 | Reset env | Remove `ARCHICHECK_SHADOW_FORMAT=json` from `.env.local` and restart the dev server | Server returns to default human-readable format |

---

### Test B2.4 — Live Bypass Command Interception

**Goal:** Verify that a real `/archicheck bypass` comment posted on GitHub is intercepted by Shadow Mode and does NOT unlock the commit gate.

> [!IMPORTANT]
> Shadow Mode blocks bypass execution entirely when active — this is by design. The bypass
> command only executes in normal (non-shadow) mode.

| Step | Action | What to Do (Detailed) | Expected Result |
|------|--------|-----------------------|-----------------|
| 1 | Ensure shadow mode is active | Confirm `.env.local` has `ARCHICHECK_MODE=shadow` and `MOCK_GITHUB=false`. Dev server running. | Configuration confirmed |
| 2 | Create an open test PR | Following steps from Test B2.1, create a new branch, commit a file, and open a PR against `main` | PR is open on GitHub.com |
| 3 | Post the bypass comment | In the PR thread on GitHub.com, post a comment: `/archicheck bypass` | Comment appears in the PR thread |
| 4 | Watch the dev server terminal | Within ~2 seconds, GitHub fires a live `issue_comment.created` webhook | Terminal prints: `[SHADOW MODE] 🟡 bypassCommand intercepted` with the comment payload |
| 5 | Verify commit status unchanged | Check the PR page on GitHub.com | **No commit status change** — the gate is not unblocked. No new comment posted in the thread. |
| 6 | Confirm HTTP response | The terminal should also show the route returning HTTP 200 | Server logs show `200` for the webhook call with the shadow intercept message |

---

### Test B2.5 — Pipeline End-to-End with Mock LLM in Live Mode

**Goal:** Verify that with `LLM_PROVIDER_TYPE=mock`, the full pipeline (diff fetch → sanitize → quiz generation → outbound intercept) completes end-to-end using real GitHub data but no LLM API costs.

| Step | Action | What to Do (Detailed) | Expected Result |
|------|--------|-----------------------|-----------------|
| 1 | Confirm env | `.env.local` has `LLM_PROVIDER_TYPE=mock`, `MOCK_GITHUB=false`, `ARCHICHECK_MODE=shadow` | Configuration confirmed |
| 2 | Create a PR with a "leaky" diff | Create a new file in your test repo named `config.ts` containing `const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";` and open a PR | GitHub fires a `pull_request.opened` webhook |
| 3 | Watch terminal for sanitizer output | In the dev terminal, look for sanitizer log lines | Terminal shows the secret being scrubbed: the `AKIAIOSFODNN7EXAMPLE` value is replaced with `[REDACTED_SECRET]` before the mock LLM is called |
| 4 | Watch terminal for mock quiz output | Continue watching dev terminal | Mock LLM generates quiz questions (from `.archicheck.mock.json` or default scenario). The full quiz JSON is logged. |
| 5 | Confirm write interception | Check for `[SHADOW MODE] 🟡` lines | Both `createComment` (quiz posting) and `createCommitStatus` (gate lock) are intercepted — NOT sent to GitHub |
| 6 | Verify PR is clean | Open the PR on GitHub.com | Zero comments, zero commit status checks — the PR looks untouched |


---

## 🔍 How to Verify Webhook Delivery

If you need to verify that a live webhook was successfully dispatched by GitHub and correctly received by your local server, you can check the results in three different places:

### 1. ngrok Web Inspection Interface (Highly Recommended)
When ngrok is running, it hosts a local web dashboard that captures and displays every single HTTP request passing through your tunnel.
* **Access URL:** Open `http://127.0.0.1:4040` in your browser.
* **What to look for:** 
  * You should see a `POST /api/webhook` entry in the left-hand sidebar history.
  * Clicking on it lets you inspect the **Headers** and **JSON Payload** sent by GitHub.
  * In the **Response** tab, you should see the HTTP status code (typically `202 Accepted` or `200 OK`) and the JSON body returned by your local server.

### 2. GitHub App "Recent Deliveries" Page (Source of Truth)
GitHub tracks every single webhook execution, including historical logs and manual redelivery triggers.
* **Access URL:** Navigate to your **GitHub Settings** $\rightarrow$ **Developer Settings** $\rightarrow$ **GitHub Apps** $\rightarrow$ Click **Edit** on your App $\rightarrow$ Click **Advanced** in the left menu.
* **What to look for:**
  * Under the **Recent Deliveries** section, you will see a list of webhook events.
  * A green checkmark ($\checkmark$) with a `202` or `200` response status confirms it was delivered and acknowledged by your local proxy.
  * Click on any delivery ID to expand the full Request/Response payload, headers, and metadata. You can also click the **Redeliver** button to replay the event without having to recreate/modify the PR.

### 3. Dev Server Terminal Logs
Your server outputs console logs when the webhook route executes.
* **What to look for:**
  * Look at the terminal running `npm run dev`. You should see output matching the webhook handler:
    ```text
    [ArchiCheck] Webhook received for event: pull_request.opened
    [ArchiCheck] Heuristics scored: Gated.
    [SHADOW MODE] 🟡 createCommitStatus intercepted
    [SHADOW MODE] 🟡 createComment intercepted
    ```

---

## ✅ Done Criteria

This live-fire staging test run may be signed off as **Complete** when:

- [ ] Test B2.1 passed — PR webhook received, pipeline executed, no GitHub writes
- [ ] Test B2.2 passed — Default shadow log is human-readable / colorized
- [ ] Test B2.3 passed — JSON format switch works and resets cleanly
- [ ] Test B2.4 passed — Bypass command intercepted, gate not mutated
- [ ] Test B2.5 passed — Full pipeline with mock LLM and live diff produces no GitHub side effects

---

## 🧹 Teardown Checklist

After completing all tests, perform the following cleanup to avoid leaving dangling test infrastructure:

| Step | Action |
|------|--------|
| 1 | Close all open test PRs on GitHub.com |
| 2 | Delete test branches created during this session |
| 3 | Stop the ngrok / smee proxy process (Ctrl+C) |
| 4 | **Optional:** Uninstall the test GitHub App from the test repository (GitHub → Settings → Applications → Configure → Uninstall) |
| 5 | Remove `MOCK_GITHUB=false` and `ARCHICHECK_MODE=shadow` from `.env.local` to restore normal dev defaults |
| 6 | Restart `npm run dev` to confirm the server comes up cleanly in default mode |

---

## 🚨 Common Errors & Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `Error: JSON Web Token` in terminal | `GITHUB_PRIVATE_KEY` malformed in `.env.local` | Ensure the PEM block is wrapped in double-quotes and has literal `\n` newlines, **or** each newline in the file is a real newline character |
| `401 Unauthorized` from GitHub API | App not installed on the test repo | Complete Step P2 — install the App on the test repository |
| No webhook received after creating PR | Proxy not running or wrong URL in GitHub App settings | Restart ngrok/smee and re-check Step P5 |
| `[ArchiCheck] Shadow mode not active` in logs | `ARCHICHECK_MODE=shadow` missing from `.env.local` | Add the variable and restart the dev server |
| PR receives a real comment/status | `MOCK_GITHUB=true` is still active | Set `MOCK_GITHUB=false` in `.env.local` and restart |
| `504 Gateway Timeout` from GitHub | ngrok free tier session expired (8-hour limit) | Restart ngrok and update webhook URL in GitHub App settings |
