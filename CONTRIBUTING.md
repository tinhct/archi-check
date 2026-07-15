# Contributing to ArchiCheck

> *"AI should not be the reason you have fewer people. It should be the reason the people you have are the best they've ever been. This is not about slowing AI down. It's about accelerating it — in the right direction, together."*

Thank you for your interest in contributing to ArchiCheck! We are building a cognitive safeguard for human software engineering, and we welcome contributions from both human developers and autonomous AI agents.

---

## 📅 AI-Scrum in Practice

ArchiCheck is managed under **AI-Scrum**, a collaborative framework that mirrors the structure of high-performing human engineering teams. We run autonomous agent teams using this structured cadence:

*   **Sprints:** Sprints have variable durations, adjusting dynamically to accommodate scoping, implementation, and review gates.
*   **Backlog Refinement:** All stories are scoped in detail in `/docs/PM/Product_Backlog.md` before coding begins. Stories must contain clear priority levels, sprint assignments, and detailed Acceptance Criteria (AC).
*   **Standups & Updates:** Agents record their sequential task completions dynamically inside `/docs/PM/Active_Agent_State.md` to coordinate multi-step implementation tasks.
*   **Retrospectives:** Every sprint closes with a retrospective. We document what failed, what succeeded, and which agent hallucinations or technical blockers were encountered.

---

## 👮 Governance & Context tracking

All developments (whether human-driven or agentic) must comply with our strict project governance parameters.

### 📐 AI-Agent Governance (.cursorrules)
AI agents operating in this codebase are governed by our global policy rules in `.cursorrules`. Key boundaries include:
1.  **Read-Before-Write Scoping:** No implementation may begin until a detailed Solution Design or Scoping document has been written under `/docs/PM/Scoping/` or `/docs/Architecture/SD/`.
2.  **No Unverified Side-Effects:** Agents are strictly prohibited from mutating core cache keys, database objects, or credentials settings without explicit, typed interfaces and mock-safety stubs.
3.  **Strict Delimiter & Delays Gates:** All code must run within timing limits (timeouts < 15s) and catch errors gracefully, falling back to secure fail-open baselines.

### 🧠 Preventing Agent Context Amnesia
Because autonomous agents operate within limited context windows, they are prone to "context amnesia"—forgetting preceding choices, variables, or milestones during multi-turn coding sessions. 

To prevent this:
*   We use a state-tracking log file located at **[Active_Agent_State.md](./docs/PM/Active_Agent_State.md)**.
*   **Agents must update this file at the start and end of every task execution turn.**
*   The log contains a sequential checklist of active phases, completed steps, and open variables, preserving state transitions across conversation boundaries.
*   Humans and agents should read this file first before resuming any work to align on current state and next priorities.

---

## 🐛 Reporting Issues

### Before Creating an Issue
Please perform the following checks before opening an issue:
1.  **Check Open Issues:** Search our GitHub issue tracker to verify the bug or feature request has not already been logged.
2.  **Run Locally:** Test your setup in a clean local environment (`npm run test:run` and `npm run setup:keys`) to ensure it is not a local configuration drift.
3.  **Collect Diagnostics:** Grab relevant terminal logs, Vitest output stack traces, and environment variables configurations (redacting private secrets).

### Bug Reports
When submitting a bug report, use our standard issue template containing:
*   **Context:** OS version, Node version, and database setup profile.
*   **Steps to Reproduce:** Copy-pasteable shell commands or API request payloads.
*   **Expected vs. Actual Behavior:** What should have happened vs. what actually happened.
*   **Relevant Logs:** Detailed error stack traces or Next.js console messages.

### Feature Requests
We welcome feature suggestions! Please submit feature requests with:
*   **User Story:** "As a [role], I want [capability] so that [benefit]."
*   **Proposed Scoping:** A brief scoping design outlining dependencies and potential risks.
*   **Success Metrics:** How we can verify the feature is working (suggested automated checks).

---

## 🛠️ Pull Request Guidelines

### Before Starting Work
*   Assign the issue to yourself (or coordinate in the chat).
*   Create a branch off `main` named `feature/[story-id]-[short-description]` or `bugfix/[defect-id]-[short-description]`.
*   Ensure that the target branch is always **`main`**.

### PR Size & Scope
Keep PRs small, focused, and incremental. A single pull request should address **one story** or **one bugfix** at a time. Large, multi-epic PRs will be rejected.

### Handling AI-Generated Code
If you use AI assistants (such as Copilot, Cursor, or Gemini) to generate code:
*   You must review and manually test every line.
*   Ensure that formatting matches our Prettier standards (`npm run lint`).
*   Confirm that zero raw mock keys or test tokens are left in production files.

### New to Pull Requests?
If you are new to GitHub pull requests:
1.  Fork the repository and clone it locally.
2.  Create your feature branch, commit changes, and push to your fork.
3.  Submit a pull request targeting `archi-check:main`.
4.  Verify that all GitHub Actions tests pass green.

### PR Description Template
Ensure your PR description includes:
```markdown
## Target Story / Epic
Fixes #[Issue ID] / AC-ST-[ID]

## Objectives
- [List core implementation items]

## Validation & Testing
- [x] Run `npm run test:run` (171/171 passing)
- [x] Run `npm run lint` (0 errors/warnings)
- [List custom integration scenarios or manual setup checks performed]

## Security & Privacy Checks
- [ ] Confirmed secrets are redacted by sanitizer engine.
- [ ] Verified no sensitive values leak into console logs.
```

### Commit Messages
We use structured semantic commit messages (based on Conventional Commits):
*   `feat: add pre-LLM check filters to webhook route`
*   `fix: resolve mock Redis incrby counter type error`
*   `docs: update product roadmap milestones and targets`
*   `test: add evaluate router validation integration tests`

---

## 🤖 Prompt & Agent Guidelines

When interacting with this codebase using AI coding assistants:
1.  **Provide Strict Grounding:** Instruct the model to query file structures directly using directory lists and search tools before writing code.
2.  **Maintain Comments:** Retain all existing code comments, security annotations, and JSDoc blocks unless they are obsolete.
3.  **Mock Assertions:** When writing tests, mock external network requests and verify caching/database states in isolation.
