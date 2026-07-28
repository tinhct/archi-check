# Scoping Document: Dynamic Gemini Model Version Configuration

**Reference:** New Feature Request

**Status:** Draft

**Last Updated:** 2026-07-28

## 1. Problem

Currently, the model name used to invoke the developer-tier Gemini and enterprise-tier Vertex AI endpoints is hardcoded as `'gemini-2.5-flash'` inside the LLM provider service (`src/lib/llm/provider.ts`). 

A developer onboarding onto the project or working on complex architectures wants to use the latest model version (e.g., `gemini-2.5-pro` or new versions as they release) to benchmark performance, optimize formatting accuracy, or run advanced verification rules. Because it is hardcoded, developers must manually patch code files locally, which increases maintenance overhead, risks merge conflicts, and blocks team-wide testing of newer models.

## 2. Constraints

* **Architecture/Code:** The default model selection must still be `gemini-2.5-flash` to maintain zero-config local sandbox operations out of the box.
* **Dependencies:** Must strictly rely on the official `@google/generative-ai` and `@google-cloud/vertexai` SDK parameters already installed.
* **Security/Performance:** Exposing internal system directory names or raw API responses in public-facing logs is prohibited.
* **Team Conventions:** Environment configurations must be validated at boot via the Zod schema in `src/config/env.ts`.

## 3. Success Criteria

* The model version used in API requests can be customized dynamically without altering source files.
* If no model override is provided, the system defaults gracefully to `gemini-2.5-flash`.
* Unit tests verify environment parsing, fallback checks, and ensure environment variables do not leak across test scopes.

## 4. Candidate Approaches

* **Approach A: Global Environment Variable Override (`GEMINI_MODEL_VERSION`)**
  Define a new environment key `GEMINI_MODEL_VERSION` inside `src/config/env.ts` with a default of `'gemini-2.5-flash'`. The LLM provider instantiates the model dynamically from this environment configuration.
  * *Trade-off:* Pro: Very simple, standard, zero config overhead. Con: Global setting only; cannot customize per-repository in multi-tenant environments.
* **Approach B: Repository-level Configuration (`.archicheck.yml`)**
  Extend the YAML schema validator in `src/lib/config/yamlParser.ts` to support `gemini_model` and thread this property to the provider calls.
  * *Trade-off:* Pro: High granularity; different repositories can declare different models (e.g., cheaper flash for simple apps, pro for core frameworks). Con: Increases parsing complexity and requires updates to the gating workflow.
* **Approach C: Hybrid Configuration (Global Env default + Local `.archicheck.yml` override)**
  Enforce the environment variable check as a baseline, but merge repository-level `.archicheck.yml` overrides if specified in the pull request branch.
  * *Trade-off:* Pro: Maximum flexibility for both infrastructure operators and repo developers. Con: Highest implementation complexity and test coverage overhead.

## 5. Open Questions & Assumptions

* **Assumption:** The developer only needs to override the model for Gemini and Vertex AI (developer/enterprise paths). Mock and Claude paths remain unaffected.
* **Retrospective Sync & Historical Mitigation (Sprint 6 Lesson):** Any unit tests evaluating this override must explicitly restore the original `process.env.GEMINI_MODEL_VERSION` state in `afterEach` hooks to prevent environment variables leaking and breaking other test suites.
