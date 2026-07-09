# Alpha Release: Manual End-to-End Test Plan

**Target Version:** [v1.0.0-alpha] | **Execution Date:** 2026-07-08 - 2026-07-09

**Tester / Developer:** tinhct

## 🎯 Testing Objective

To manually validate the "Golden Path" (the primary user journey) and ensure all core components (UI, API Gateway, Backend Services, and Database) integrate correctly in a local/dev environment prior to automated test execution and staging deployment.

## 🏗️ Test Environment Setup (Local/Dev)

**Pre-requisites for Execution:**

- [ ] Local Next.js server is running on `localhost:3000` (`npm run dev`)
- [ ] Environment variables configured inside `.env.local` (e.g. `LLM_API_KEY`, `UPSTASH_REDIS_REST_URL`)
- [ ] Timing-safe verify signature is bypassed or mock headers are supplied for HTTP calls
- [ ] Developer console/network tab is open for monitoring

## 📦 Test Data Requirements

| Data Entity | Required State | Credentials / Mock Values |
|-------------|----------------|---------------------------|
| PR Author | Tracked Developer login | `junior-dev` |
| Bypass Admin | Tracked Repository Admin login | `techlead-admin` (role: `admin` / `maintain`) |
| Target Data | Baseline repo unified diff | Unified diff patch with complexity keywords |

---

## 🛤️ Step-by-Step E2E Execution Scripts

### E2E Flow 1: Synchronous PR Gating & Status Check Initialization

* **Description:** Verify that opening a pull request with complex changes synchronously locks the PR status checks to Pending and posts the architectural quiz comment thread.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | Start dev server | Run `npm run dev` in the root workspace terminal. | Server starts on `localhost:3000`. API route bound. | 200 OK on Vercel Edge dev route logs. | Pass |
| 2.   | POST a mock `pull_request.opened` event | Run `npx vite-node scratch/trigger_webhook.ts opened`. Ensure `MOCK_GITHUB=true` is set in `.env.local`. <br><br>*Note: This simulated event automatically generates 315 dummy lines in mock diff files to trigger the velocity spray-and-pray gating threshold.* | Receives HTTP `202 Accepted` response. | Headers TimingSafe HMAC verification passes. | Pass |
| 3.   | Check commit status checks | **Mock Mode**: Inspect the running Next.js dev server terminal for `[Mock GitHub] createCommitStatus called` showing `state: 'pending'`. <br>**Live Mode**: Run `curl -H "Authorization: token YOUR_GITHUB_TOKEN" "https://api.github.com/repos/<OWNER>/<REPO>/commits/<COMMIT_SHA>/status"` (using `git rev-parse HEAD`). | Commit status check `archicheck/verification` is locked to `pending`. | POST to `/repos/.../statuses` returns 201 Created. | Pass |
| 4.   | Inspect PR comment thread | **Mock Mode**: Inspect dev server terminal for `[Mock GitHub] createComment called` containing the quiz questions. Or query Redis: `curl -H "Authorization: Bearer YOUR_REDIS_REST_TOKEN" "https://tough-starling-158111.upstash.io/get/archicheck:pr:101"`. <br>**Live Mode**: Open PR page on `github.com`. | Markdown quiz comment containing files, snippet, and rationales is posted. | Stored state in Upstash Redis cache namespace. | Pass |

---

### E2E Flow 2: PR Author Quiz Response & Gate Unblocking

* **Description:** Verify that the PR author can reply with answers in technical slang (English, Vietnamese, or German) and unblock the status gate checks.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | POST an `issue_comment.created` event | Run `npx vite-node scratch/trigger_webhook.ts comment`. <br><br>*Note: This simulated event sends an issue comment containing answers that justify the 300 complexity lines (explaining they are mock test fixtures with low runtime/performance impact) so the LLM evaluates the justification successfully.* | Receives HTTP `202 Accepted` response. | Event verified timing-safely. | Pass |
| 2.   | Parse commenter body text justification | Check the terminal console logs of your running Next.js dev server. | Email blockquotes (`>`) are stripped from comment body. | String cleaner output extracts pure developer answer. | Pass |
| 3.   | Run LLM validation analysis | Check terminal console logs for LLM scoring outputs (score 0-10). | Answer is scored by Gemini 2.5 Flash. If score >= 7, pass state triggers. | Vertex/Gemini returns schema-compliant JSON. | Pass |
| 4.   | Verify commit check status | **Mock Mode**: Inspect dev server terminal for `[Mock GitHub] createCommitStatus called` showing `state: 'success'`. <br>**Live Mode**: Run `curl -H "Authorization: token YOUR_GITHUB_TOKEN" "https://api.github.com/repos/<OWNER>/<REPO>/commits/<COMMIT_SHA>/status"`. | Gating check is unlocked and set to `success` in repository. | Status check updates state value to `success`. | Pass |
| 5.   | Check PR comment feedback | **Mock Mode**: Inspect dev server terminal for `[Mock GitHub] createComment called` with approval message. Query Redis `archicheck:pr:101` (it should return `null` as it gets deleted on pass). <br>**Live Mode**: Open PR page on `github.com` and inspect comments. | Approved access confirmation comment is posted. | Cache key deleted cleanly upon verification success. | Pass |

---

### E2E Flow 3: Admin Emergency Slash Command Bypass Override

* **Description:** Verify that repository maintainers can bypass the gating lock check during outages or emergencies.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | POST an `issue_comment.created` event containing bypass | Run `npx vite-node scratch/trigger_webhook.ts bypass`. <br><br>*Note: This simulated event posts `/archicheck bypass` from a user mocked as an admin (`techlead-admin`) to bypass the gate.* | Receives HTTP `202 Accepted` response. | Webhook accepts command timing-safely. | Pass |
| 2.   | Validate commenter repository permissions | Check dev server terminal console for log: `[Mock GitHub] getCollaboratorPermissionLevel called`. | System checks if commenter role is `admin` or `maintain`. | GET `/repos/.../collaborators/.../permission` returns 200. | Pass |
| 3.   | Mutate gate checks status | **Mock Mode**: Inspect dev server terminal for `[Mock GitHub] createCommitStatus called` with `state: 'success'` and description `"⚠️ Emergency bypass..."`. <br>**Live Mode**: Run `curl -H "Authorization: token YOUR_GITHUB_TOKEN" "https://api.github.com/repos/<OWNER>/<REPO>/commits/<COMMIT_SHA>/status"`. | Status check context `archicheck/verification` is updated to `success`. | POST `/repos/.../statuses` sets description to "⚠️ Emergency bypass...". | Pass |
| 4.   | Inspect PR comments logs | **Mock Mode**: Inspect dev server terminal for `[Mock GitHub] createComment called` showing bypass audit comments. <br>**Live Mode**: Open PR page on `github.com`. | Bypass audit comment is injected into PR comment thread. | POST to `/repos/.../comments` returns 201. | Pass |

---

## 🚨 Alpha Defect Reporting

*If any step above fails, log it immediately in the Sprint Defect Log.*

**Quick Log (For Local Reference):**

* **Failed Step:** [Step Number]
* **Observed Behavior:** [What actually happened?]
* **Console/Network Error:** [Paste stack trace or HTTP status code]
* **Next Action:** [E.g., Investigating auth middleware, adjusting DB schema]
