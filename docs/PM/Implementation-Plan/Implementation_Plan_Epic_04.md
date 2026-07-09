# Implementation Plan: Epic 4 (Repository Customization & DX)

**Target Story/Epic:** Epic-04 / AC-ST-401 & AC-ST-402

**Status:** Draft

**Approved By:** [Pending Review] | **Approval Date:** [Pending Review]

## 🎯 Execution Scope

* **Objective:** Enable offline local testing using a simulated Mock LLM service and support repository-level customization of complexity thresholds via .archicheck.yml/yaml files.
* **Prerequisites:** Epic 2: Webhook Gating must be fully integrated (Resolved).

## 🛠️ Step-by-Step Execution Steps

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| 1    | Build Local Mock LLM Service implementing the LLMProvider interface with a length check heuristic (>20 characters passes) | `src/lib/llm/mock_llm.ts` | Unit tests verify that replies <= 20 chars fail-nudge, and replies > 20 chars pass. |
| 2    | Refactor provider selection factory to route generateQuiz and validateAnswers to Mock LLM if type is set to 'mock' | `src/lib/llm/provider.ts` | Server logs show local mock intercepts and executes without making network requests. |
| 3    | Update environment configuration variables schema using Zod discriminated union to strictly reject mock type in production | `src/config/env.ts` | Starting the server with `LLM_PROVIDER_TYPE=mock` and `NODE_ENV=production` fails with an explicit Zod error. |
| 4    | Implement repository config fetcher utilizing Octokit sequential retrieval (.yml -> .yaml -> default settings fallback) | `src/lib/github/configFetcher.ts` | Mocked Octokit calls assert fallback sequence completes without throwing on 404s. |
| 5    | Write YAML configuration parser with a strict 50KB size cap constraint to block memory-based Denial-of-Service (DoS) attacks | `src/lib/config/yamlParser.ts` | Unit tests assert file size limit exceeds throw errors and partial configs merge defaults correctly. |
| 6    | Inject parsed config thresholds into the heuristics gating service and PR state Cache | `src/lib/analyzer/heuristics.ts`, `src/app/api/webhook/route.ts` | Webhooks gate PRs dynamically matching thresholds configured in local repository configuration files. |

## ⏪ Rollback Strategy

* **Trigger:** Mock LLM execution leaks into live production runs, or configuration fetching raises runtime exceptions that crash webhook delivery.
* **Action:** Revert repository codebase to commit `24e8592` (`git reset --hard 24e8592 && git push --force`) and restart production environments.
