# Scoping Document: Edge Runtime waitUntil Async Queue Fallback

**Reference:** AC-ST-602 (Sprint 6)

**Status:** Approved (Approach A)

**Last Updated:** 2026-07-14

## 1. Problem

The live webhook route uses Next.js `waitUntil` to execute heavy, non-blocking LLM evaluations in the background, allowing the HTTP endpoint to respond immediately with a `202 Accepted` status to GitHub. However, `waitUntil` is a Vercel-specific utility that is only available under the Edge Runtime. When deploying the application on standard Node.js environments (like Docker containers, Kubernetes clusters, or Vercel's standalone Node runtime), `waitUntil` is undefined. This causes the app to either crash with a `TypeError` or immediately terminate background promises before they resolve when the HTTP request ends.

## 2. Constraints

* **Architecture/Code:** The webhook routing logic must remain compatible with Edge deployments while adding fallback support for Node.js runtimes.
* **Dependencies:** Must not require external distributed queue systems (like RabbitMQ, SQS, or BullMQ with separate worker pools) to keep the hosting footprint lightweight.
* **Security/Performance:** The fallback mechanism must prevent the Node.js process from shutting down or cutting off active execution promises before LLM calls complete.
* **Team Conventions:** Webhook controller responses must still return `202 Accepted` in $\le 200\text{ms}$ regardless of the runtime platform.

## 3. Success Criteria

* **Edge Parity:** Webhooks process successfully on Node.js runtimes without crashing when calling `waitUntil`.
* **Promise Retention:** Background evaluations complete successfully even after the HTTP response has been sent and the connection closed.
* **Timeout Protection:** If background tasks run longer than the maximum platform handler execution limit, they fail-open safely rather than hanging.

## 4. Candidate Approaches

* **Approach A: Request Context Promise Tracker (In-Memory Queue)** — Implement a custom utility `src/lib/utils/asyncTracker.ts` that exposes a `trackTask(promise)` wrapper. On Edge, it routes directly to `waitUntil`. On standard Node.js, it pushes the promise to an active in-memory task tracker array. The app hooks into server shutdown events to ensure the queue drains before the process exits.
  * *Trade-off:* High performance, simple, zero external architecture dependencies, but if the container crashes or restarts, active in-flight promises in memory are lost.
* **Approach B: Connection-Holding Controller Fallback** — If running on a Node.js runtime, modify the route controller to defer sending the HTTP response until the evaluation promise resolves (essentially making the webhook synchronous for Node.js).
  * *Trade-off:* Guarantees promise completion and simplifies debugging, but violates the $\le 200\text{ms}$ response constraint and risks GitHub webhook timeout rejections (which trigger on response latency $> 10\text{ seconds}$).
* **Approach C: Standalone Server Lifecycle Handler** — Integrate a server-level request-tracking hook inside a custom HTTP server configuration (such as wrapping Next.js in an Express server wrapper).
  * *Trade-off:* Full process lifecycle control, but breaks standard Next.js deployment simplicity and is incompatible with Edge Serverless deployment models.

## 5. Open Questions & Assumptions

* **Assumption:** The in-memory promise queue is acceptable for local dev and standard single-container Docker deployments, as lost tasks during crash restarts are rare edge cases.
* **Question:** How do we prevent memory leaks if a high volume of background promises are tracked? (Recommended: Clean up promise references from the array immediately upon resolution using `.finally()`).
