# Manual Test Plan: Epic 04 - Playwright E2E Implementation

**Target Version:** Sprint 4 Build (v0.1.0) | **Execution Date:** 2026-07-10

**Tester / Developer:** tinhct/User

## 🎯 Testing Objective

To manually validate that the Playwright End-to-End testing framework has been successfully integrated into the ArchiCheck repository. This includes verifying dependency installation, browser binary configuration, local test execution, and HTML report generation.

## 🏗️ Test Environment Setup (Local/Dev)

**Pre-requisites for Execution:**

- [ ] Local development environment is active and the ArchiCheck server is running on `localhost:3000`.
- [ ] Node.js is installed (v18+ recommended).
- [ ] Terminal is open at the project root.

---

## 🛤️ Step-by-Step E2E Execution Scripts

### E2E Flow 1: Framework Initialization and Execution Validation

* **Description:** Verifying that a human developer can successfully trigger the Playwright suite and view the generated artifacts.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Run `npm list @playwright/test` | Terminal outputs the installed Playwright version (should not be empty). | |
| 2.   | Run `npx playwright test` | Terminal displays the test runner UI, executes baseline smoke tests, and reports `[X] passed`. | |
| 3.   | Run `npx playwright show-report` | Local browser automatically opens displaying the Playwright HTML test report. | |
| 4.   | Inspect `playwright.config.ts` | File exists at root. Contains configurations for Chromium, Firefox, and WebKit. Base URL points to local server. | |
| 5.   | Force a failing test (temporarily break a locator in a spec file) and run `npx playwright test` | Test fails. Terminal displays exact line of failure. HTML report captures screenshot/trace of the failure. | |

---

## 🚨 Defect Reporting

*If any step above fails (e.g., missing browser binaries, config path errors), log it immediately in the Sprint Defect Log.*

**Quick Log (For Local Reference):**

* **Failed Step:** [Step Number]
* **Observed Behavior:** [What actually happened?]
* **Console/Network Error:** [Paste terminal stack trace]
* **Next Action:** [E.g., Re-running `npx playwright install`, checking config paths]
