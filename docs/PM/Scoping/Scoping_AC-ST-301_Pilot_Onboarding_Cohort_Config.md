# Scoping Document: Pilot Onboarding & Cohort Configuration

**Reference:** AC-ST-301 (Sprint 6)

**Status:** Approved (Approach A)

**Last Updated:** 2026-07-14

## 1. Problem

Currently, ArchiCheck operates under a single global configuration template (complexity thresholds, prompt parameters, and paths). However, when onboarding different developer teams or pilot cohorts, some teams need custom gating parameters (e.g., frontend teams need lower line thresholds but high CSS exclusions, while core backend teams require strict heuristics and custom prompt instruction presets). Without cohort configuration mappings, we cannot run multi-team pilots in a single staging or production repository deployment.

## 2. Constraints

* **Architecture/Code:** Configuration parser must read from a centralized profile registry and map parameters based on repository or PR author contexts.
* **Dependencies:** Must utilize standard parsing libraries (yaml, zod) and remain compatible with Next.js edge environments.
* **Security/Performance:** Profile matching must run in $\le 5\text{ms}$ during webhook execution.
* **Team Conventions:** Team mappings must be stored declarative-style in the codebase so that changes are tracked in source control.

## 3. Success Criteria

* **Dynamic Overrides:** Pull requests from different authors or targeting specific subdirectories automatically load their team's corresponding gating config instead of the global default.
* **Type-Safe Validation:** Cohort profile files are validated using a strict Zod schema on boot/load to prevent runtime errors due to malformed configs.
* **Graceful Fallbacks:** If a cohort is not matched or contains errors, the system gracefully falls back to standard `.archicheck.yml` or global system defaults.

## 4. Candidate Approaches

* **Approach A: Static Repository Configuration profiles** — Store configurations in `config/cohorts.yaml`. The webhook route parses this file, matches the PR author or changed files to a configured cohort, and overrides `.archicheck.yml` defaults.
  * *Trade-off:* Clean version control, simple implementation, zero database reads, but requires a redeploy or code commit to add/modify cohorts.
* **Approach B: Upstash Redis Dynamic Configuration** — Store cohort mapping configurations in Upstash Redis. The system queries Redis dynamically during webhook runs using `cohort:[cohort_id]` keys.
  * *Trade-off:* Cohorts can be updated dynamically via API/dashboard without redeploys, but introduces database read latencies and requires additional Redis credentials.

## 5. Open Questions & Assumptions

* **Assumption:** Pilot cohorts are identified primarily by GitHub usernames or organizational teams.
* **Question:** If a PR overlaps multiple team folders (e.g. changing both frontend and backend files), which cohort profile takes precedence? (Recommended: Strict matching rules based on path prefixes defined in the cohort file, falling back to the author's primary cohort).
