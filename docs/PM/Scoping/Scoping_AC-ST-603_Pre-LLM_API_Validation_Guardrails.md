# Scoping Document: Standardize Pre-LLM API Validation Guardrails (Deterministic Filtering)

**Reference:** AC-ST-603 (Sprint 6)

**Status:** Approved (Approach A)

**Last Updated:** 2026-07-14

## 1. Problem

Currently, both the production GitHub webhook route (`/api/webhook`) and the local AI Playground evaluate route (`/api/playground/evaluate`) accept developer justifications to unblock gated pull requests. While the local playground mock LLM uses basic string metrics, the production webhook route executes real, non-deterministic LLM calls directly. 

Without deterministic front-end guardrails, malicious users or automated scripts can submit repetitive characters (e.g. `"aaaaabbbbbcccccdddddeeeee"`), random keyboard mashing (e.g. `"asdfghjklqwertyuiopz"`), or trivially short spam. This either wastes expensive LLM token quotas, triggers processing overhead, or causes non-deterministic approvals/rejections by the LLM. 

## 2. Constraints

* **Architecture/Code:** The same exact validation code must be shared between the Playground endpoint and the production Webhook endpoint to guarantee behavioral parity.
* **Dependencies:** Must run deterministically inside Vercel Edge Serverless functions (no heavyweight Python/NLP binary dependencies allowed).
* **Security/Performance:** Validation must run in $\le 5\text{ms}$ to prevent CPU/memory exhaustion and must not block the Node.js single-threaded event loop.
* **Team Conventions:** Must return clean, structured error formats (`{ error: string }`) for API rejections and must support multilingual answers (Vietnamese, German, English) without false positives on technical jargon/camelCase classes.

## 3. Success Criteria

* **Algorithmic Parity:** A spam comment or nonsense answer is rejected at the API layer with identical responses on both the webhook thread (status comment) and the local playground interface (Bad Request `400` or shaped error badge).
* **Zero Token Cost for Spam:** Real LLM invocations are completely short-circuited and bypassed if the reply fails the deterministic check.
* **Multilingual Accuracy:** Valid technical class names (e.g., `OrderRepositoryDecoratorImpl`), technical slang, and standard Vietnamese/German sentences pass the checker without false positive rejections.

## 4. Candidate Approaches

* **Approach A: Centralized TypeScript Validator Utility Class** — Implement a shared utility file `src/lib/security/deterministicFilter.ts` executing quick regex checks: character repetition density, space-to-character ratio, unique letters count, and suspicious single-word caps.
  * *Trade-off:* High performance ($\le 1\text{ms}$), simple unit testing, zero dependencies, but requires manual tuning of heuristic thresholds.
* **Approach B: External Client-Side Edge Library Integration** — Import a lightweight userland NLP/entropy evaluation library (e.g., standard Shannon Entropy calculator package).
  * *Trade-off:* Standard mathematical justification of randomness (high entropy is rejected), but risks transitive dependency bloating and potential incompatibilities with technical code syntax terms (which naturally look like high-entropy strings).
* **Approach C: Webhook Middleware Gating** — Intercept responses in the Next.js Edge Middleware layer (`middleware.ts`) before loading route handlers.
  * *Trade-off:* Protects routes from execution overhead, but increases Edge Middleware complexity and makes sharing validation states with playground components difficult.

## 5. Open Questions & Assumptions

* **Assumption:** Technical justifications will naturally contain spaces, camelCase terms, and multi-word explanations rather than single strings of repetition.
* **Question:** What is the ideal character repetition threshold to balance aggressive spam rejection with valid technical comments?
* **Question:** Should a rejected validation on webhooks post a warning comment to the PR thread, or silently set the gate status to `Failed`? (Recommended: Post a nudge warning comment to guide the author, identical to how reviewer bypass rejections are handled).
