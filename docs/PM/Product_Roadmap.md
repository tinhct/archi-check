# Product Roadmap

**Last Updated:** 2026-07-10

## 🎯 Product Vision
ArchiCheck serves as a cognitive safeguard for software teams. It detects when developers may be "rubber-stamping" complex AI-generated changes, and gates pull requests behind interactive, language-agnostic architectural comprehension quizzes to keep engineering intuition active, preserve accountability, and protect long-term system integrity.

## 🗺️ Roadmap Visualization

```mermaid
gantt
    title High-Level Product Roadmap
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    
    section Phase 1: Foundation
    Sprint 0 Setup & Compliance       :done, sprint0, 2026-06-01, 14d
    Sprint 1 Webhook & Caching        :done, sprint1, 2026-06-15, 14d
    
    section Phase 2: Core Features
    Sprint 2 Scorer & LLM Connect     :done, sprint2, 2026-06-29, 14d
    Sprint 3 Webhook Loop & Bypass    :done, sprint3, 2026-07-13, 14d
    
    section Phase 3: Launch
    Sprint 4 Customization & DX       :done, sprint4, 2026-07-06, 14d
    Sprint 5 Staging Polish & Telemetry:active, sprint5, after sprint4, 14d
```

## 📍 Milestones & Deliverables

| Milestone | Target Date | Status (Done/Active/Pending) | Key Epics / Features |
| :---- | :---- | :---- | :---- |
| **M1: Baseline Infrastructure** | 2026-06-29 | Done | GitHub App registration, HMAC verify, Upstash Redis caching. |
| **M2: Scorer & Webhook Gate** | 2026-07-13 | Done | Diff parsing, secret scrubber, ReDoS watchdogs, Pending checks, quiz comment, Admin bypass. |
| **M3: Sandbox & Customization** | 2026-07-10 | Done | Local mock LLM sandbox, config `.archicheck.yml` parser, Playwright E2E GitHub simulation. |
| **M4: Production Dogfooding** | 2026-08-10 | Active | Dogfooding pilots with EU & Vietnam Beta cohorts, telemetry logs audits, and budget cap alarms. |

## 📈 Current Focus & Next Steps

* **Currently Building:** Setting up token burn telemetry logging and Vercel execution stream integrations to generate alarms when billing approaches standard budgets.
* **Up Next:** Initiating user profile mappings and cohort configurations for the regional developer Alpha trials.
* **Key Blockers/Risks:** None currently active. All historical local developer credential bypasses and e2e skip guards have been fully mitigated.
