# AI Quality & Evaluation Framework

**Last Updated:** 2026-07-08

## 📏 Key Performance Indicators (KPIs)

| Metric | Measurement Method | Target Baseline |
|--------|--------------------|-----------------|
| **Task Success Rate** | Automated E2E testing (`simulation.test.ts`) | > 95% pass rate |
| **Context Relevance** | Reviewer reviews / LLM-as-a-judge comparison | > 90% relevance score |
| **Response Latency** | Telemetry logging (`latency_ms`) | < 3.0 seconds total |

## 🧪 Evaluation Pipeline

* **Golden Dataset:** Located in `/tests/fixtures/golden_dataset.json` (mock code changes paired with expected target questions and approved developer justifications).
* **Automated Evaluators:** Automated Vitest validation runs verifying formatting compliance and parsing success.
