# Playground UI — "Pipeline Thread" Redesign Review
**Story candidate:** AC-ST-505 | Sprint 5 | Priority: High

---

## ✅ Diagnosis: Confirmed Valid

All three friction points are real and stem from the same root cause: the original layout was
a **"Dashboard"** (symmetric two-pane; input left / output right) that was then extended with
Phase 2 *inside* the input pane. The Phase 2 reply box ended up on the wrong side of the screen
relative to the questions it answers.

| # | Friction | Root Cause | Agreed? |
|---|---|---|---|
| 1 | Megabox disconnect (reply left, questions right) | Phase 2 was bolted onto Phase 1's layout without restructuring | ✅ Yes |
| 2 | Token Receipt table is too tall | Designed as a standalone "card" when it's metadata | ✅ Yes |
| 3 | Sanitized Diff occupies right-pane real estate | Right pane is "AI output" but diff is input context | ✅ Yes |

---

## ✅ Prototype: Sound Architecture

The HTML prototype correctly captures the target information architecture:

```
LEFT PANE (Context)            RIGHT PANE (Interactive AI Thread)
─────────────────────          ──────────────────────────────────
Fixture / Provider selects     Phase 1 card header
  [Tab: Raw Diff]                └─ In: 316 | Out: 340 | Total: 656
  [Tab: Sanitized View]        Q1 question text
Regenerate button (footer)       └─ Rationale
                                 └─ [textarea: Your answer for Q1]
                               Q2 question text
                                 └─ Rationale
                                 └─ [textarea: Your answer for Q2]
                               ──────────────────
                               [ Evaluate All Replies ]
```

This maps cleanly onto the GitHub PR comment thread pattern the user already knows:
**inline comment → inline reply → submit review.**

---

## ⚠️ Technical Decisions Required Before Implementation

### Decision 1 — State Shape Change (BLOCKING)

The current state has:
```typescript
const [reply, setReply] = useState<string>('');
```

The redesign requires per-question replies:
```typescript
const [perQuestionReplies, setPerQuestionReplies] = useState<Record<string, string>>({});
// key = question.id (e.g. "q1", "q2")
```

**Three downstream sites that must be updated atomically:**

| Site | Current | Must Become |
|---|---|---|
| `invalidateDownstream()` | `setReply('')` | `setPerQuestionReplies({})` |
| `handleReset()` | `setReply('')` | `setPerQuestionReplies({})` |
| `handleRetryEval()` | preserves `reply` string | preserves `perQuestionReplies` map (no change needed) |
| `handleEvaluate()` | sends `reply` | builds & sends concatenated string |

---

### Decision 2 — Concatenation Format (BLOCKING)

When the user clicks **"Evaluate All Replies"**, the React side must combine
`perQuestionReplies` into the single `reply: string` the API contract requires.

**Two options:**

**Option A — Structured (recommended):**
```
Q1: What are the immediate security risks…?
A1: Hardcoding credentials in source exposes them to anyone with repo access.
    They appear in git history permanently even after removal.

Q2: What is the recommended practice for managing sensitive credentials?
A2: Store credentials in environment variables injected at runtime via a
    secrets manager (AWS Secrets Manager / Vault). Never commit them.
```
Pros: The LLM evaluator sees which answer maps to which question — better scoring accuracy.
Cons: Slightly more tokens sent.

**Option B — Plain join:**
```
Hardcoding credentials in source exposes them to anyone with repo access.
They appear in git history permanently even after removal.

Store credentials in environment variables injected at runtime via a
secrets manager (AWS Secrets Manager / Vault). Never commit them.
```
Pros: Simpler, matches current API expectation exactly.
Cons: LLM must infer which answer maps to which question.

> **My recommendation: Option A.** The mock LLM's `validateAnswers` evaluates the reply
> holistically against the full question set. Providing question context in the payload
> reduces hallucination risk in the evaluation and produces more precise `reasoning` text.
> The extra tokens are trivial (≈ 30–50 per question).

---

### Decision 3 — Partial Submission Policy (BLOCKING)

If there are 3 questions and the developer answers only Q1 and Q2 (leaving Q3 blank), can
they still click "Evaluate All Replies"?

**Option A — Allow partial (any box meets MIN_REPLY_LENGTH):**
Evaluate button enabled if `Object.values(perQuestionReplies).some(r => r.trim().length >= MIN_REPLY_LENGTH)`.
The unanswered questions get an empty `A3:` in the concatenated string and the LLM penalises accordingly.

**Option B — Require all boxes meet MIN_REPLY_LENGTH:**
Evaluate button stays disabled until every question has a ≥ 20-char answer.
Show per-box hint: `· min. 20 chars` (same amber indicator we added today).

> **My recommendation: Option B.** This is a developer self-assessment tool.
> Submitting a partial answer for a formal rubric evaluation is misleading — the score
> will reflect unanswered questions without the developer understanding why they failed.
> The per-box hints make the requirement obvious without being blocking in an annoying way.

---

### Decision 4 — Fixture Pre-population of Per-Question Boxes (MINOR)

The current fixture schema has:
```json
"phase2": { "quizJson": [...], "reply": "single reply string" }
```

With per-question boxes, the single `reply` string needs to be either:
- **Split into N boxes** (but we can't reliably detect per-question boundaries in a free-form string)
- **Shown as a single pre-populated Q1 box** (ugly hack)
- **Left empty** (fixture only seeds the quiz, not the reply boxes — user fills them in)

> **My recommendation: Leave boxes empty on fixture load.** The fixture's existing `reply`
> field can be retained in the schema for documentation/reference, but the UI should not
> try to split it. This is cleanest and avoids a lossy parse. The schema does not need to
> change; only the UI's handling of `fixture.phase2.reply` changes (ignore it).

---

### Decision 5 — Tab State for Left Pane (MINOR, not blocking)

The left pane needs a `activeLeftTab: 'raw' | 'sanitized'` state.
- `'sanitized'` tab should only be enabled when `phase1Result?.sanitizedDiff` is available (i.e., after a Generate call).
- On `invalidateDownstream()`, reset to `'raw'`.

No API changes required.

---

## 📋 Proposed Scope: AC-ST-505

```
##### 🆔 AC-ST-505: Playground UI — "Pipeline Thread" Layout Redesign
* Priority: High
* Status: To Do
* Assigned Sprint: Sprint 5
* Description: Redesign the Playground from a "Dashboard" (symmetric two-pane) layout to a
  "Pipeline Thread" layout that mirrors the GitHub inline comment/reply UX, eliminating
  the cross-screen reply disconnect, token receipt sprawl, and sanitized diff misplacement.

* Acceptance Criteria:
  1. [ ] Right pane renders one question block per Question object. Each block contains:
         question text, rationale (styled as a left-bordered aside), and a dedicated
         <textarea> for the per-question reply (placeholder: "Draft your answer for Q{n}…").
  2. [ ] React state: `reply: string` replaced by `perQuestionReplies: Record<string, string>`
         keyed on `question.id`. `invalidateDownstream()` and `handleReset()` clear this map.
         `handleRetryEval()` preserves the map (no change in behavior).
  3. [ ] Concatenation: On "Evaluate All Replies", build the reply string using the structured
         "Q{n}: {question text}\nA{n}: {answer}" format, one block per question, joined by \n\n.
  4. [ ] Evaluate button enabled only when ALL per-question boxes meet MIN_REPLY_LENGTH (20 chars).
         Each box shows the amber `· min. 20 chars` hint while below threshold.
  5. [ ] Token receipt moved to Phase 1 card header as compact inline badges:
         `In: X | Out: Y | Total: Z` (monospace, single line). The standalone token table removed.
  6. [ ] Left pane gains a tab bar: [Raw PR Diff] [Sanitized View (Sent to LLM)].
         Sanitized tab enabled only after a Generate call. Resets to Raw on invalidateDownstream().
  7. [ ] "Phase 2 — Developer Reply" section removed from the left pane.
  8. [ ] The Pipeline HUD (header bar token total + spinner) is unchanged.
  9. [ ] Fixture `phase2.reply` field is ignored during fixture loading; reply boxes are left empty.
  10.[ ] All existing element IDs preserved: `btn-reset`, `btn-generate`, `btn-evaluate`,
         `fixture-select`, `provider-select`, `diff-input`. New elements need IDs:
         `reply-input-{question.id}` (one per question box), `tab-raw`, `tab-sanitized`.
  11.[ ] `npx tsc --noEmit` clean. `npm run test:run` 97/97 green (no regressions).

* Files Changed:
  - src/app/playground/page.tsx (state + JSX rewrite of right pane and left pane)
  - src/app/playground/playground.css (remove token-receipt table styles, add tab styles,
    add per-question-block styles, remove phase2-section left-pane styles)
  - No API route changes required.

* Non-Goals:
  - The POST /api/playground/evaluate contract is unchanged (reply: string).
  - The fixture JSON schema is unchanged.
  - No new tests required (API is unchanged; UI unit tests are out of scope for this sprint).
```

---

## 🔑 Pre-Implementation Checklist

Before the first line of code changes, the following decisions must be signed off:

| # | Decision | My Recommendation |
|---|---|---|
| 2 | Concatenation format | Option A — Structured Q/A format |
| 3 | Partial submission policy | Option B — All boxes must meet MIN_REPLY_LENGTH |
| 4 | Fixture reply pre-population | Leave boxes empty; ignore `fixture.phase2.reply` |

All are non-breaking to the API. Decisions 2 and 3 only affect the `handleEvaluate` handler.
