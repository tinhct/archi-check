# Functional Test Report

**Execution Date:** 2026-07-08 | **Feature/Epic:** Epics 01 & 02 (Core Analyzers & Gates)

## 🎯 Acceptance Criteria Validation

| Story ID | Scenario Description | Input Data | Expected Result | Actual Result | Status | Defect ID |
|----------|----------------------|------------|-----------------|---------------|--------|-----------|
| **AC-ST-101** | Complexity Diff parsing & Velocity check | Unified git diff, first commit dates | Gate commits based on scoring keywords & First Commit Proxy. | Correctly score diff and gate PRs within the threshold. | Pass | None |
| **AC-ST-102** | Payload Sanitization & ReDoS watchdogs | Raw strings containing keys and long backtracking patterns | Scrub secrets timing-safely; truncate lines >500 chars and halt regex execution in 500ms. | Value lookbehind scrubbing successful, ReDoS watcher aborted backtracking cleanly. | Pass | BUG-001 |
| **AC-ST-103** | Resilient LLM Connection | 429/5xx model failures, API timeouts | Retry x2 with exponential delays; fail-open to default templates on persist timeout. | Handled backoffs successfully, fell back to default questions. | Pass | None |
| **AC-ST-201** | Synchronous Gating Status Checks | incoming pull_request webhook payload | Commit status check context `archicheck/verification` locked to Pending synchronously. | Status locked instantly, quiz markdown posted to PR thread. | Pass | BUG-002 |
| **AC-ST-202** | Author Answer Verification | issue_comment answer text, blockquote quotes | Verify commenter login against PR author. Strip blocks starting with `>`. | Blocked non-author answers with warnings; correctly parsed clean justifications. | Pass | None |
| **AC-ST-203** | Tech Lead Bypass Command | issue_comment body `/archicheck bypass` | Validate user permissions; override status checks to Success for admin/maintain roles. | Unlocked status checks and posted confirmation comments for authorized roles. | Pass | BUG-003 |
