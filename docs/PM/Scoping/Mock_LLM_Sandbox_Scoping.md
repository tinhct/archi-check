# Scoping: Dynamic Developer Sandbox for Local Mock LLM Service

**Target Epic:** Epic 4: Repository Customization & Developer DX
**Status:** Under Review

---

## 1. 🎯 Problem
Open-source contributors and integration engineers cannot locally simulate and test diverse architectural gating scenarios (such as massive AI-generated code vs. minor human refactors) because the current Mock LLM service is completely hardcoded. This blocks local verification of customized rules, forcing contributors to either use live cloud API keys or manually modify the core codebase files during development.

---

## 2. 🛡️ Constraints
* **Production Quarantine**: Sandbox parsing utilities must throw fatal errors if triggered when `NODE_ENV === 'production'` to prevent security risks and deployment pollution.
* **Offline Zero-Cost**: The execution path must require zero network requests, external databases, or third-party dependency libraries.
* **MVP Compatibility**: Must integrate seamlessly with the existing `LLMProvider` factory router switches without altering the production interface contracts.

---

## 3. 🏁 Success Criteria
* **Dynamic Configuration**: A local file-based sandbox configuration (`.archicheck.mock.json`) dynamically controls the mock quiz questions, matching heuristics, and validation thresholds.
* **Keyword Scenario Mapping**: Specific regex keywords in the simulated diffs (e.g., `useState`, `sql`) dynamically trigger corresponding custom quiz question blocks.
* **Justification Validation loops**: Offline comment response evaluation dynamically validates answers based on customizable rules (e.g., length or keyword matches).
* **Test Suite Verification**: Integration and simulation tests run cleanly offline under mock setups.

---

## 4. 🛠️ Candidate Approaches

* **Approach A: Single Unified Root `.archicheck.mock.json` Configuration File**
  * *Trade-off:* High developer ergonomics for manipulating mock PR states in one place, but requires robust runtime validation and deep-merge logic.
* **Approach B: Folder-Based Mock Fixtures Directory (`/fixtures/mock_llm/*.json`)**
  * *Trade-off:* Clean separation of individual pull request test configurations, but introduces filesystem clutter and requires file-reading logic for multiple files.
* **Approach C: Environment Variable Inline Injection (`MOCK_LLM_FIXTURES='[{"pr": 101, ...}]'`)**
  * *Trade-off:* Avoids local filesystem I/O operations entirely, but quickly becomes unreadable and difficult to maintain for complex nesting.

---

## 5. ❓ Open Questions
* Should `.archicheck.mock.json` be added to the global `.gitignore` list, or committed to the repository to share mock development setups among teams?
* If `.archicheck.mock.json` is missing or malformed during a mock run, should the service fail-open, fall back to default hardcoded question sets, or halt execution with an error?
