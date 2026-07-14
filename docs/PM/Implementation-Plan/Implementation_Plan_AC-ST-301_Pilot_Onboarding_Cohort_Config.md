# Implementation Plan: Pilot Onboarding & Cohort Configuration

**Target Story/Epic:** AC-ST-301 / Epic-04

**Status:** Approved

**Approved By:** Product Owner | **Approval Date:** 2026-07-14

## 🔎 Retrospective Scan — Historical Mitigations Applied

* **Yaml Parsing Inconsistencies (Sprint 4):** Standard YAML parses keys dynamically, which can lead to runtime crashes if input structures are malformed or missing required keys.
  * **Mitigation:** We implement a strict Zod schema validation layer (`cohortsFileSchema`) that runs on load, verifying types and structure, and falling back gracefully to base repository defaults if the file is absent or malformed.

## 🎯 Execution Scope

* **Objective:** Enable repository owners to map developer teams (pilot cohorts) to specific overrides for complexity and path exclusions in a static declarative `config/cohorts.yaml` file, supporting multi-team pilots in a single deployment.
* **Prerequisites:** None.

## 🛠️ Step-by-Step Execution Steps

### 🟡 Task Group A: Cohort Config Service

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| A1 | **Create `config/cohorts.yaml`:** Create a default configurations file `config/cohorts.yaml` at the root of the project containing version `1.0` and sample profiles (e.g. `frontend-team` and `backend-team` overrides). | `config/cohorts.yaml` (NEW) | File exists at the project root. |
| A2 | **Create Cohort Manager:** Create `src/lib/config/cohortManager.ts`. Declare Zod validation schemas matching the target layout: `cohortsFileSchema` validating cohorts version, array of members, and overrides schema. Export `getCohortOverrides(author: string, baseConfig: ArchicheckConfig): ArchicheckConfig`. | `src/lib/config/cohortManager.ts` (NEW) | Code compiles cleanly with no syntax errors. |
| A3 | **Implement config merging:** Inside `getCohortOverrides`, read the local yaml file using `fs.readFileSync`. If parsing fails or file is not found, return the base configuration unchanged. If validation passes, check if the PR `author` matches one of the cohort member lists (case-insensitive). If matched, merge overrides into the returned `ArchicheckConfig` object. | `src/lib/config/cohortManager.ts` | The merged configuration contains overridden parameters for cohort members. |

### 🟡 Task Group B: Integration with Webhook

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| B1 | **Integrate overrides in Webhook:** In `src/app/api/webhook/route.ts`, locate the parsed repository config and pass it through `getCohortOverrides` with the PR author (`pullRequest.user.login` context) to get the final active configuration object. | `src/app/api/webhook/route.ts` | Gating checks and path exclusions use the overridden parameters when matching pilot authors. |

### 🟡 Task Group C: QA Validation & Testing

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| C1 | **Write unit tests for cohort config:** Create `tests/unit/cohortManager.test.ts`. Test: (1) Happy path (valid yaml file matching author overrides values). (2) Default fallback (if author is not registered in any cohort). (3) Missing file handling (graceful fallback). (4) Malformed yaml validation (warn and fallback). | `tests/unit/cohortManager.test.ts` (NEW) | `npm run test:run` passes. |
| C2 | **Verify regression tests:** Run full Vitest test suite. | Test runner | All 153+ tests are green. |

## ⏪ Rollback Strategy

* **Trigger:** Incorrect overrides or config load failures blocking standard webhook runs.
* **Action:** Revert change in `src/app/api/webhook/route.ts` that merges overrides, or rename/delete `config/cohorts.yaml`.
