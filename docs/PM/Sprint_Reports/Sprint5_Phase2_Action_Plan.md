# Sprint 5 — Phase 2 Scope: Action Plan & Governance Record

**Prepared:** 2026-07-12 | **Governed by:** `.cursorrules` Epic Intake & Impact Analysis Protocol

---

## 🔍 Retrospective Scan — Key Lessons Applied

| Past Mistake | Sprint | Mitigation in Phase 2 Plans |
|---|---|---|
| Vitest scans Playwright files → crashes | Sprint 4 | Evaluate route test: `.test.ts` suffix. Fixture: `.json` (no Vitest conflict) |
| `fs` reads leak real local files in tests | Sprint 4 | Fixture uses static import (not `fs`). Tests mock the JSON import via `vi.mock` |
| Integration tests leave stale Redis records | Sprint 4 | Evaluate endpoint is stateless — no Redis writes, no teardown hooks needed |
| Mock `gitHubAuthService` needs both `.rest` and `.request` stubs | Sprint 3 | Evaluate endpoint doesn't call Octokit — no mocking complexity |
| `waitUntil` undefined in Vitest | Sprint 3 | Evaluate endpoint uses Node.js runtime, not Edge. No `waitUntil` needed |

---

## 🔬 Critical Code Findings (from codebase research)

| Finding | Impact |
|---|---|
| `validateAnswers` in `provider.ts` is **already pure** — zero Redis/Octokit calls | Story 5.4 is narrower than expected: surface token counts, not extract side effects |
| `usageMetadata.promptTokenCount` and `candidatesTokenCount` already extracted in LLM calls — but only logged to console | Story 5.4 Step 3–6: thread these values into the return value |
| Existing `evaluationResponseSchema` uses field name **`reasoning`** (not `rationale`) | Phase 2 canonical schema updated: use `reasoning` everywhere for production parity |
| `src/schema/` directory does **not exist** | Must be created in Task Group A before evaluate route can be written |
| `tokenCost` in Phase 1 route is estimated (`chars / 4 ≈ tokens`) — not real SDK token count | Phase 1 breaking change: replace `tokenCost: string` with real `tokens: { input, output, total }` |

---

## 📦 Governance Documents Executed (per .cursorrules)

| Document | Status | Changes Made |
|---|---|---|
| `docs/PM/Product_Backlog.md` | ✅ Updated | Added AC-ST-501-P2 (7 ACs), AC-ST-504 (7 ACs + dual approval), non-critical BLG-01–04, updated Epic 5 to In Progress, Next Sprint Priorities reordered |
| `docs/PM/RAID_log.md` | ✅ Updated | Added R16–R19 (risks), D23–D32 (decisions) |
| `docs/PM/Dependency_Register.md` | ✅ Updated | Added DEP-10, DEP-11, DEP-12; updated Mermaid diagram with Epic 5 |
| `docs/PM/Implementation-Plan/Implementation_Plan_AC-ST-504.md` | ✅ Created | 12-step execution plan, purity audit, dual-approval gate, rollback strategy |
| `docs/PM/Implementation-Plan/Implementation_Plan_AC-ST-501-P2.md` | ✅ Created | 4 task groups (A/B/C/D), 24 steps, retrospective mitigations, rollback per group |
| `docs/Architecture/SD/Solution_Design_Playground_Phase2_Evaluation_Pipeline.md` | ✅ Created | Architecture diagram, API contract, data model changes, security considerations |
| `docs/Applied-AI/AI_Workflow_Design.md` | ✅ Updated | Phase 2 evaluation loop flowchart appended, Last Updated → 2026-07-12 |

---

## 🔀 Two New Stories for Sprint 5

### AC-ST-504: Isolate & Surface LLM Evaluation Telemetry
**Priority:** Highest — **Hard blocker** for AC-ST-501-P2 evaluate route  
**Blocked by:** Nothing (can start immediately)  
**Status:** Draft Implementation Plan created — **awaiting human approval**

**Scope (12 steps):**
1. Purity audit of `validateAnswers`
2. Update `EvaluationResult` type → add `tokens` field
3-5. Thread token counts from `callGeminiDeveloper`, `callVertexAI`, `callClaude`
6. Update `callLLM` return type
7. Update `validateAnswers` return (including fail-open with `tokens: {0,0,0}`)
8. Preserve `generateQuiz` return type (no change)
9. Update webhook route call-site
10-11. Update unit + integration tests
12. CI green gate

---

### AC-ST-501-P2: Local AI Playground Phase 2
**Priority:** High  
**Blocked by:** AC-ST-504 (for Task Group B/D), DEP-11 (for Task Group D)  
**Status:** Draft Implementation Plan created — **awaiting human approval**

**Task Group Execution Order:**
```
Task Group A (no blockers):   A1 src/schema/quiz.ts → A2 Phase 1 route → A3 Phase 1 tests
       ↓                                           ↓
Task Group C (needs DEP-12):  C1 Fixture JSON → C2 webpack → C3 Zod schema
       ↓                                           ↓
Task Group B (needs DEP-10+DEP-12): B1-B9 Evaluate route + unit tests
       ↓
Task Group D (needs DEP-11+DEP-12): D1-D7 Two-stage React UI
```

---

## ⚠️ Approval Gate (per .cursorrules line 62)

> **You are strictly forbidden from writing source code until a human user explicitly updates the 'Status' of the implementation plan to 'Approved'.**

**Plans awaiting approval:**
- [`Implementation_Plan_AC-ST-504.md`](file:///Users/tinhct/Documents/AI%20Projects/ArchiCheck%20Project/archi-check/docs/PM/Implementation-Plan/Implementation_Plan_AC-ST-504.md) — Status: **Draft**
- [`Implementation_Plan_AC-ST-501-P2.md`](file:///Users/tinhct/Documents/AI%20Projects/ArchiCheck%20Project/archi-check/docs/PM/Implementation-Plan/Implementation_Plan_AC-ST-501-P2.md) — Status: **Draft**

**To approve:** Change `**Status:** Draft` to `**Status:** Approved` in either file, or tell me verbally which story to begin.

---

## 🗓️ Recommended Sprint 5 Execution Order

```
Day 1-2:  AC-ST-504 (12 steps, all tests must be green before PR merge)
Day 2-3:  AC-ST-501-P2 Task Group A (schema + Phase 1 breaking change)
Day 3-4:  AC-ST-501-P2 Task Group B+C (evaluate route + fixture system, in parallel)
Day 4-5:  AC-ST-501-P2 Task Group D (two-stage React UI)
Day 5:    Manual E2E validation + Sprint 5 report
```
