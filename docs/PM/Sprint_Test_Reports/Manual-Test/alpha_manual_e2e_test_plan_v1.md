# Alpha Release: Manual End-to-End Test Plan (v1)

**Target Version:** [v1.0.0-alpha] | **Execution Date:** 2026-07-09

**Tester / Developer:** tinhct

## 🎯 Testing Objective

To manually validate the "Golden Path" and Epic-04 customization gates, ensuring that the Mock LLM service evaluates developer replies locally, and custom `.archicheck.yml` configurations parse dynamically to govern complexity thresholds.

## 🏗️ Test Environment Setup (Local/Dev)

**Pre-requisites for Execution:**

- [ ] Local Next.js server is running on `localhost:3000` (`npm run dev`)
- [ ] Environment variables configured inside `.env.local`
- [ ] Developer console/network tab is open for monitoring

## 📦 Test Data Requirements

| Data Entity | Required State | Credentials / Mock Values |
|-------------|----------------|---------------------------|
| PR Author | Tracked Developer login | `junior-dev` |
| Bypass Admin | Tracked Repository Admin login | `techlead-admin` (role: `admin` / `maintain`) |
| Custom Config | Repository configuration file | `.archicheck.yml` or `.archicheck.yaml` |

---

## 🛤️ Step-by-Step E2E Execution Scripts

### E2E Flow 1: Synchronous PR Gating & Status Check Initialization
* **Description:** Verify that opening a pull request with complex changes synchronously locks the PR status checks to Pending and posts the architectural quiz comment thread.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | Start dev server | Run `npm run dev` in the root workspace terminal. | Server starts on `localhost:3000`. API route bound. | 200 OK on Vercel Edge dev route logs. | Pass |
| 2.   | POST a mock `pull_request.opened` event | Run `npx vite-node scratch/trigger_webhook.ts opened`. Ensure `MOCK_GITHUB=true` is set in `.env.local`. | Receives HTTP `202 Accepted` response. | Headers TimingSafe HMAC verification passes. | Pass |
| 3.   | Check commit status checks | **Mock Mode**: Inspect Next.js dev server terminal for `[Mock GitHub] createCommitStatus called` showing `state: 'pending'`. | Commit status check `archicheck/verification` is locked to `pending`. | POST to `/repos/.../statuses` returns 201. | Pass |
| 4.   | Inspect PR comment thread | **Mock Mode**: Inspect dev server terminal for `[Mock GitHub] createComment called` containing the quiz questions. | Markdown quiz comment containing files, snippet, and rationales is posted. | Stored state in Upstash Redis cache namespace. | Pass |

---

### E2E Flow 2: PR Author Quiz Response & Gate Unblocking
* **Description:** Verify that the PR author can reply with answers and unblock the status gate checks.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | POST an `issue_comment.created` event | Run `npx vite-node scratch/trigger_webhook.ts comment`. | Receives HTTP `202 Accepted` response. | Event verified timing-safely. | Pass |
| 2.   | Parse commenter body text justification | Check the terminal console logs of your running Next.js dev server. | Email blockquotes (`>`) are stripped from comment body. | String cleaner output extracts pure developer answer. | Pass |
| 3.   | Run LLM validation analysis | Check terminal console logs for LLM scoring outputs (score 0-10). | Answer is scored by Gemini 2.5 Flash. If score >= 7, pass state triggers. | Vertex/Gemini returns schema-compliant JSON. | Pass |
| 4.   | Verify commit check status | **Mock Mode**: Inspect dev server terminal for `[Mock GitHub] createCommitStatus called` showing `state: 'success'`. | Gating check is unlocked and set to `success` in repository. | Status check updates state value to `success`. | Pass |
| 5.   | Check PR comment feedback | **Mock Mode**: Inspect dev server terminal for `[Mock GitHub] createComment called` with approval message. | Approved access confirmation comment is posted. | Cache key deleted cleanly upon verification success. | Pass |

---

### E2E Flow 3: Admin Emergency Slash Command Bypass Override
* **Description:** Verify that repository maintainers can bypass the gating lock check during outages or emergencies.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | POST an `issue_comment.created` event containing bypass | Run `npx vite-node scratch/trigger_webhook.ts bypass`. | Receives HTTP `202 Accepted` response. | Webhook accepts command timing-safely. | Pass |
| 2.   | Validate commenter repository permissions | Check dev server terminal console for log: `[Mock GitHub] getCollaboratorPermissionLevel called`. | System checks if commenter role is `admin` or `maintain`. | GET `/repos/.../collaborators/.../permission` returns 200. | Pass |
| 3.   | Mutate gate checks status | **Mock Mode**: Inspect dev server terminal for `[Mock GitHub] createCommitStatus called` with `state: 'success'` and description `"⚠️ Emergency bypass..."`. | Status check context `archicheck/verification` is updated to `success`. | POST `/repos/.../statuses` sets description to "⚠️ Emergency bypass...". | Pass |

---

### E2E Flow 4: Repository Customization (.archicheck.yml) & Local Mock LLM Gating
* **Description:** Verify that custom thresholds and path exclusions govern PR gating checks, and the mock LLM evaluates developer answers locally based on response length.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | Set up environment for offline mock testing | Edit `.env.local` to set `LLM_PROVIDER_TYPE=mock`. Run `npm run dev`. | App boots with Mock LLM selected. | Env schema validates successfully. | Pass |
| 2.   | Create local `.archicheck.yml` configuration | Add `.archicheck.yml` to the root directory with custom settings: <br>`lines_added_threshold: 50`<br>`excluded_paths:`<br>`  - '**/ignored-dir/**'` | Custom file is registered locally. | File size is under the 50KB boundary check. | Pass |
| 3.   | POST `opened` event matching excluded paths | Trigger `npx vite-node scratch/trigger_webhook.ts opened` with a simulated diff where 60 lines are inside `src/ignored-dir/file.ts`. | PR is bypassed and status sets to `success`. | Output shows excluded paths are correctly skipped. | Pass |
| 4.   | POST `opened` event exceeding custom threshold | Trigger webhook with 60 lines added in `src/main.ts`. | PR gets gated. Mock LLM generates quiz questions. | Status checks set to pending. Comment containing mock questions posted. | Pass |
| 5.   | POST comment reply <= 20 characters | Trigger `comment` event with answer body `"OK"`. | Mock LLM rejects reply (Score: 4). PR remains gated. | Console logs show validation failure due to length <= 20. | Pass |
| 6.   | POST comment reply > 20 characters | Trigger `comment` event with body `"This is a detailed explanation answering the mock quiz."` | Mock LLM accepts reply (Score: 9). PR check unblocked. | Commit status check unlocks to `success`. | Pass |

---

## 🚨 Alpha Defect Reporting

*If any step above fails, log it immediately in the Sprint Defect Log.*

**Quick Log (For Local Reference):**

* **Failed Step:** [Step Number]
* **Observed Behavior:** [What actually happened?]
* **Console/Network Error:** [Paste stack trace or HTTP status code]
* **Next Action:** [E.g., Investigating auth middleware, adjusting DB schema]
