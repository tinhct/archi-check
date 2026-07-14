# Product Roadmap

**Last Updated:** 2026-07-14

## 🎯 Product Vision
ArchiCheck serves as a cognitive safeguard for software teams. It detects when developers may be "rubber-stamping" complex AI-generated changes, and gates pull requests behind interactive, language-agnostic architectural comprehension quizzes to keep engineering intuition active, preserve accountability, and protect long-term system integrity.

## 🗺️ Roadmap Visualization

```mermaid
gantt
    title High-Level Product Roadmap
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    
    section Phase 1: Foundation
    Sprint 0 Setup & Compliance       :done, sprint0, 2026-06-01, 7d
    Sprint 1 Webhook & Caching        :done, sprint1, after sprint0, 7d
    
    section Phase 2: Core Features
    Sprint 2 Scorer & LLM Connect     :done, sprint2, after sprint1, 7d
    Sprint 3 Webhook Loop & Bypass    :done, sprint3, after sprint2, 7d
    
    section Phase 3: Launch
    Sprint 4 Customization & DX       :done, sprint4, after sprint3, 7d
    Sprint 5 Live-Fire Toolkit        :done, sprint5, after sprint4, 8d
    Sprint 6 Staging Polish           :active, sprint6, after sprint5, 7d
```

## 📍 Milestones & Deliverables

| Milestone | Target Date | Status (Done/Active/Pending) | Key Epics / Features |
| :---- | :---- | :---- | :---- |
| **M1: Baseline Infrastructure** | 2026-06-29 | Done | GitHub App registration, HMAC verify, Upstash Redis caching. |
| **M2: Scorer & Webhook Gate** | 2026-07-13 | Done | Diff parsing, secret scrubber, ReDoS watchdogs, Pending checks, quiz comment, Admin bypass. |
| **M3: Sandbox & Customization** | 2026-07-10 | Done | Local mock LLM sandbox, config `.archicheck.yml` parser, Playwright E2E GitHub simulation. |
| **M4: Live-Fire Developer Toolkit** | 2026-07-12 | Done | Shadow Mode, BYOK Setup Wizard, Local AI Playground Phase 1 & Phase 2 (two-stage evaluation pipeline, Pipeline Thread UI). |
| **M5: Production Dogfooding** | 2026-08-10 | Active | Dogfooding pilots with early adopter Beta cohorts, telemetry logs audits, and budget cap alarms. |

## 📈 Current Focus & Next Steps

* **Currently Completed (Sprint 5):** Full "Live-Fire" Developer Toolkit (Epic 05) — Local AI Playground Phase 1 & Phase 2 (two-stage evaluation pipeline with per-question inline reply boxes, Zod response schema union, and fixture system), Shadow Mode (real GitHub webhook authentication & request interception with local memory cache), BYOK CLI setup wizard, and the "Pipeline Thread" UI layout redesign. All stories and BUG fixes are fully complete.
* **Up Next (Sprint 6):** AC-ST-302 Token Burn Telemetry Alerting (budget cap alarms for Vercel execution streams). AC-ST-301 Pilot Onboarding & Cohort Configuration (developer Alpha trials for early pilot teams).
* **Key Blockers/Risks:** None currently active. All Sprint 5 implementation is validated with 141/141 tests green, TypeScript compilation clean.
