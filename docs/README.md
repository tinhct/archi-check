# ArchiCheck Documentation Index

Welcome to the ArchiCheck knowledge repository. This directory serves as the single source of truth for the system's technical design, security controls, testing gates, and project management cadences.

---

## 🗺️ Documentation Sitemap

The documentation is organized into specialized domain directories:

```
docs/
├── Applied-AI/                 # Prompt specs, safety policies, and hallucination tests
├── Architecture/               # System topology, API contracts, sequence maps, and ADRs
├── Integration/                # Connectors and contract interface mappings
├── PM/                         # Agile backlog, RAID logs, scoping sheets, and sprint reports
│   └── Active_Agent_State.md   # Live agent state and context preservation log
├── Security/                   # STRIDE threat models and vulnerability registers
├── Testing-And-Release-Gates/  # Test strategy, release gates, and governance rules
└── FAQ.md                      # General frequently asked questions
```

---

## 📐 Domain Directory Details

### 1. 🏗️ Architecture & Solution Design (`./Architecture/`)
Details the structural and system topologies that compose the gating framework.
*   **[ADRs.md](./Architecture/ADRs.md):** Architectural Decision Records capturing core decisions (such as state management choices, Edge fallback designs, and union response schemas).
*   **[API_Contract.md](./Architecture/API_Contract.md):** Detailed endpoint specifications for webhook endpoints and sandbox playground APIs.
*   **[Environment_Architecture.md](./Architecture/Environment_Architecture.md):** Gating topography and environment variable definitions across Local, Staging, and Production.

### 2. 🛡️ Security & Risk Management (`./Security/`)
Details our DevSecOps guidelines, threat mitigation plans, and mock audits.
*   **[Threat_Model.md](./Security/Threat_Model.md):** STRIDE Threat Model capturing boundaries, flows, and mitigations for ingestion, sanitation, and inference.
*   **[Vulnerability_Register.md](./Security/Vulnerability_Register.md):** Open-source vulnerability tracker mapping CVSS severity levels, locations, and remediations.
*   **[Mock_Bugs_Security_Review.md](./Security/Mock_Bugs_Security_Review.md):** Retrospective analysis of mock/sandbox failures to prevent staging/production regressions.

### 3. 🧠 Applied AI & Prompt Engineering (`./Applied-AI/`)
Details prompt instructions, safety filters, and semantic verification rules.
*   **[Safety_and_Hallucination_Test_Plan.md](./Applied-AI/Safety_and_Hallucination_Test_Plan.md):** Defensive evaluation rules, prompt injection vectors, and model safety parameters.
*   **[Gibberish_Mitigation_Process.md](./Applied-AI/Gibberish_Mitigation_Process.md):** Details of the deterministic, pre-LLM check filters used to block keyboard mashing and conserve token budgets.

### 4. 🧪 Testing & Release Gates (`./Testing-And-Release-Gates/`)
Details automated verification suites, manual checklists, and test governance policies.
*   **[Test_Plan.md](./Testing-And-Release-Gates/Test_Plan.md):** Release verification criteria, coverage matrices, and sprint quality gate sign-offs.
*   **[Test_Governance_Policy.md](./Testing-And-Release-Gates/Test_Governance_Policy.md):** Quality standards, timeout limits, and boundary assertions for unit, integration, and E2E simulation tests.

### 5. 📅 Project Management & AI-Scrum (`./PM/`)
Details backlog grooming, scoping files, and sprint reports managed under our AI-Scrum framework.
*   **[Product_Backlog.md](./PM/Product_Backlog.md):** Agile User Stories (`AC-ST-XXX`) containing Acceptance Criteria and epic progress bars.
*   **[Active_Agent_State.md](./PM/Active_Agent_State.md):** Live context log checked off by agents to prevent context amnesia during multi-turn runs.
*   **[RAID_log.md](./PM/RAID_log.md) & [Dependency_Register.md](./PM/Dependency_Register.md):** Tracks risks, assumptions, blockers, and system dependencies.
*   **[Sprint Reports](./PM/Sprint_Reports/):** brutally honest sprint retrospectives detailing AI hallucinations and engineering improvements.

---

## 📚 Core System Policies Summary

To preserve human agency and maintain software quality, ArchiCheck enforces the following core governance rules:

### 1. AI Intervention Policy
AI validation is a resource-intensive task that introduces friction. To protect developer speed, ArchiCheck only triggers gating quizzes if the git diff complexity is high ($\ge 5$ complexity score) **and** the code shows substantial reliance on AI generation ($\ge 70\%$). Minimal changes (documentation, configuration, tiny refactors) bypass the gate automatically.

### 2. Human Override & Escalation Policy
Ultimate system authority remains with the engineering team. In the event of model outages, database failures, or incorrect scoring gates, repository administrators can release commit status locks instantly using the `/archicheck bypass` slash command in the PR comment thread.

---

## 💬 Quick Links
*   **[System FAQ](./FAQ.md)**
*   **[Local AI Playground Manual](./PM/Sprint_Test_Reports/Manual-Test/Manual_Test_Epic_05_Live_Fire_Toolkit.md)**
*   **[Active Agent State Tracking](./PM/Active_Agent_State.md)**
