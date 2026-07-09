# Implementation Plan: Epic 4 (Mock LLM Sandbox)

**Target Story/Epic:** Epic-04 / AC-ST-403 (Dynamic Local Mock LLM Sandbox)

**Status:** Under Review

**Approved By:** tinhct/User | **Approval Date:** YYYY-MM-DD

## 🎯 Execution Scope

* **Objective:** Evolve the hardcoded local mock LLM provider into a dynamic developer sandbox using `.archicheck.mock.json` (baseline committed) and `.archicheck.mock.local.json` (ignored local override) configuration files. This allows contributors to simulate diverse diff patterns using keyword triggers, customize mock quiz questions, and configure reply validation criteria (such as minimum length and forced failure states).
* **Prerequisites:**
  * Epic-04 YAML configurations and fallback fetching mechanisms must be executed (Completed).

## 🛠️ Step-by-Step Execution Steps

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| 1    | Update Git ignore configs to quarantine local overrides | `.gitignore` | Verify `git status` ignores `.archicheck.mock.local.json` when created locally. |
| 2    | Define Zod schema types for Sandbox scenarios | `src/types/sandbox.ts` | Schema validates `trigger_keywords` (array of strings), optional `minimum_answer_length` (defaults to 20), optional `force_fail` (boolean, defaults to false), and the generated mock `questions` template list. |
| 3    | Implement Sandbox loader in `mock_llm.ts` | `src/lib/llm/mock_llm.ts` | Checks `local.json` first, falls back to `mock.json`. <br>**Exceptional Cases Covered**:<br>1. If files are missing, logs warning: `"[ArchiCheck] Mock config not found. Using system default fixtures."` and loads hardcoded defaults.<br>2. If any file exists but has syntax errors (malformed), throws fatal exception: `"Archicheck Sandbox Error: Invalid JSON..."` and prevents execution. |
| 4    | Implement pattern-matching fixture router | `src/lib/llm/mock_llm.ts` | Scans added diff lines (lines starting with `+` but not `+++`) against `trigger_keywords`. First matching scenario wins. Fallback scenario (`default_fallback: true`) wins if no keyword matches. |
| 5    | Integrate stateless justification validator | `src/lib/llm/mock_llm.ts` | Statelessly matches diff keywords in `validateAnswers` to resolve validation rules. <br>**Exceptional Cases Covered**:<br>1. If `force_fail: true` is set, validation fails with score 4 regardless of reply length.<br>2. Rejects reply if length is less than `minimum_answer_length`. |
| 6    | Create baseline config and unit test coverage | `.archicheck.mock.json`, `tests/unit/mock_llm.test.ts` | Baseline contains out-of-the-box `useState` and `sql` rules. Unit tests cover file resolution, malformed JSON fatal exceptions, routing keyword checks, and boundary validation parameters. |
