# Manual E2E Test Plan — AC-ST-505: Playground UI "Pipeline Thread" Layout Redesign

**Feature:** AC-ST-505 — Pipeline Thread UI Redesign
**Date Generated:** 2026-07-12
**Author:** Senior QA Engineer (Agent)
**Status:** Ready for Human Execution

---

> [!IMPORTANT]
> **Environment Context (`NODE_ENV`):**
> These playground and local sandbox features are strictly blocked in production for security.
> * Running **`npm run dev`** sets `NODE_ENV=development` automatically, allowing you to access and test the playground.
> * Running **`npm run build && npm run start`** sets `NODE_ENV=production` automatically, blocking the playground and evaluate endpoints with an HTTP 404.
> * **Verification:** Ensure you are running **`npm run dev`** and have set `LLM_PROVIDER_TYPE=mock` in `.env.local` for offline testing. You can verify the environment by visiting `/playground` (it should load with a yellow "Local development environment" warning badge). You can inspect the current shell environment with `echo $NODE_ENV`.


---

## 🧪 Test 505.1 — Left Pane: Raw / Sanitized Tab Bar

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:3000/playground` | Left pane renders two tabs at the top of the diff area: **Raw PR Diff** and **Sanitized View (Sent to LLM)** |
| 2 | Inspect the **Sanitized View** tab | Tab appears greyed-out / disabled (cannot be clicked) |
| 3 | Hover over the disabled **Sanitized View** tab | Tooltip appears: `"Generate a quiz first to see the sanitized view"` |
| 4 | Verify **Raw PR Diff** tab is active by default | Tab has a blue underline / active style |
| 5 | Paste any diff content into the textarea | Char count badge in the tab bar updates live |

## 🧪 Test 505.2 — Sanitized View Tab Enabled After Generate

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load the **"Leaky Diff (AWS Key)"** fixture from the dropdown | Diff textarea populates with a diff containing `AKIAIOSFODNN7EXAMPLE` |
| 2 | Click **▶ Generate Quiz** | Spinner appears in right pane; quiz cards eventually render |
| 3 | Click the **Sanitized View** tab | Tab becomes enabled and active (blue underline) |
| 4 | Inspect the content in the sanitized view | `AKIAIOSFODNN7EXAMPLE` is replaced with `[REDACTED_SECRET]`. Tab renders the sanitized version of the diff as read-only monospace text |
| 5 | Click back to **Raw PR Diff** tab | Original diff with the raw AWS key is shown again |
| 6 | Manually edit the diff textarea (change one character) | Tab bar immediately resets to **Raw PR Diff** (active). **Sanitized View** tab returns to disabled state |

## 🧪 Test 505.3 — Per-Question Inline Reply Boxes

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ensure a quiz has been generated (continue from Test 505.2) | Right pane shows question cards |
| 2 | Count the number of questions rendered | Each question has its own numbered block (Q1, Q2, Q3…) |
| 3 | Inspect each question block | Below each question text, a separate `<textarea>` reply box is present, labeled **"↳ Your reply"** |
| 4 | Click a reply box and start typing | Box activates with a blue focus ring. `reply-input-{question.id}` element ID is present (inspect via browser DevTools) |
| 5 | Verify reply boxes are independent | Typing in Q1's box does not affect Q2's box |
| 6 | Leave ALL reply boxes empty | **⚖ Evaluate All Replies** button remains disabled |

## 🧪 Test 505.4 — All-or-Nothing Minimum Length Enforcement

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type fewer than 20 characters in Q1's reply box (e.g. `"short"`) | An amber hint appears below the box: `"5 / 20 chars · min. 20 chars"` |
| 2 | Leave Q2 and Q3 boxes empty | **⚖ Evaluate All Replies** button remains disabled |
| 3 | Type ≥ 20 characters in Q1 (e.g. `"This is a long enough answer."`) | Amber hint disappears for Q1 |
| 4 | With Q2 and Q3 still empty, inspect the Evaluate button | Button still disabled — hover to see tooltip: `"All 3 answer boxes must have at least 20 characters"` |
| 5 | Fill ALL boxes with ≥ 20 characters each | **⚖ Evaluate All Replies** button becomes active (enabled, green) |
| 6 | Remove one character from any box to drop below 20 | Evaluate button immediately disables again |

## 🧪 Test 505.5 — Compact Token Badges (Not a Table)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate a quiz (any fixture) | Phase 1 completes |
| 2 | Inspect the Phase 1 card header (top of the right pane card) | A single-line badge row appears: `In: X \| Out: Y \| Total: Z` in monospace font (**Note:** values will be `0` for Mock LLM, or `> 0` for live providers) |
| 3 | Verify NO large token table is rendered | Confirm there is no multi-row HTML `<table>` with token data in the UI |
| 4 | Evaluate all replies with ≥ 20 chars each | Phase 2 completes |
| 5 | Inspect the eval result card | A Phase 2 token badge row appears below the reasoning text: `In: X \| Out: Y \| Total: Z` (values will be `0` for Mock LLM) |
| 6 | Inspect the Pipeline Total HUD in the header bar | Shows the sum of Phase 1 + Phase 2 tokens as a single number (`0` for Mock LLM) |


## 🧪 Test 505.6 — State Invalidation on Diff Change

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate a quiz and fill all reply boxes | Right pane shows quiz in `quiz_ready` state |
| 2 | Click back into the diff textarea (left pane) and type one character | **All right pane content instantly disappears** (quiz cards gone, evaluation result gone). Right pane returns to empty state |
| 3 | Verify Sanitized View tab is disabled | Tab is greyed-out again |
| 4 | Verify all reply boxes are cleared | No previously typed text remains |
| 5 | Click **↺ Reset Pipeline** button | All state resets: diff cleared, fixture dropdown reset to default, right pane empty |

## 🧪 Test 505.7 — Retry Preserves Per-Question Replies

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate a quiz | Right pane shows questions |
| 2 | Fill all reply boxes with ≥ 20 chars each | Evaluate button enabled |
| 3 | Simulate an evaluation error (temporarily set provider to `gemini-developer` with no real key, or see if the mock returns an error scenario) | An error block appears: `"Evaluation Error"` with a **↺ Retry** button |
| 4 | Click **↺ Retry** | Error block disappears. Phase goes back to `quiz_ready`. |
| 5 | Inspect the reply boxes | **All previously typed text is preserved.** Boxes are NOT cleared on retry. |
| 6 | Click **⚖ Evaluate All Replies** again | Evaluation proceeds using the same reply content |

## 🧪 Test 505.8 — Fixture Seeding (Phase 2 Pre-Populated Quiz)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load a fixture that has `⚡` prefix in the dropdown (Phase 2 fixture) | Diff populates in left pane AND the right pane immediately shows Phase 1 quiz questions WITHOUT making an API call |
| 2 | Inspect the Generate button label | Button shows **"🔄 Regenerate (Overwrites Fixture)"** instead of **"▶ Generate Quiz"** |
| 3 | Inspect the reply boxes | **All reply boxes are empty** — fixture pre-population does NOT inject text into reply boxes |
| 4 | Inspect the **Sanitized View** tab | Tab remains disabled (fixture-seeded quizzes bypass the sanitizer — there is no sanitized diff) |

## ✅ Done Criteria

AC-ST-505 may be marked **Done** when all tests above pass without errors.
