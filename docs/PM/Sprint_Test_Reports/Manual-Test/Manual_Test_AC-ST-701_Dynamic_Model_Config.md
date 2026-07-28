# Manual Test Plan: AC-ST-701 - Dynamic Gemini Model Version Configuration

**Target Version:** Sprint 7 Build (v0.3.0) | **Execution Date:** 2026-07-28

**Tester / Developer:** tinhct/User

## 🎯 Testing Objective

To manually validate the configuration override logic for the Gemini and Vertex AI models implemented in user story `AC-ST-701`:
1. **Fallback default:** Ensure the system defaults gracefully to `gemini-2.5-flash` when the environment variable `GEMINI_MODEL_VERSION` is absent.
2. **Dynamic override:** Verify that setting `GEMINI_MODEL_VERSION` to a custom name (e.g., `gemini-2.5-pro` or a test string) dynamically updates the target model parameter in API requests.

---

## 🏗️ Test Environment Setup (Local/Dev)

**Pre-requisites for Execution:**
- [ ] Node.js v18+ is installed.
- [ ] Next.js development server running locally or compiled successfully via `npm run build`.
- [ ] A terminal window is open at the root of the `archi-check` directory.

---

## Track-by-Track Execution Scripts

### Test Flow 1: Verification of Model Fallback Default

* **Description:** Verifying that the application falls back cleanly to the baseline `gemini-2.5-flash` model when no environment variable override is configured.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Ensure `GEMINI_MODEL_VERSION` is omitted from your `.env.local` or environment keys. Run: `npm run dev` (starts the development server). | Next.js development server starts cleanly on port 3000. | Pass |
| 2.   | Load the Local Playground (`http://localhost:3000/playground`) in your browser. | The UI compiles and loads the sandbox successfully. | Pass |
| 3.   | Provide a test diff, enter a mock/valid API key in the UI, select the "Gemini (BYOK)" provider, and click **Generate Quiz**. | The provider initializes the Gemini client, defaults to calling `gemini-2.5-flash`, and returns the structured quiz payload. | Pass |

### Test Flow 2: Verification of Dynamic Override Config

* **Description:** Verifying that setting the model version override dynamically updates the client model instantiation.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Shut down the server. Run in terminal:<br>`GEMINI_MODEL_VERSION="gemini-2.5-pro" npm run dev` | Server boots and parses the custom Zod environment schema. | Pass |
| 2.   | Load the Local Playground in your browser, enter your developer API key, select "Gemini (BYOK)", and trigger **Generate Quiz**. | The system resolves `env.GEMINI_MODEL_VERSION`, instantiates the generative client targeting `gemini-2.5-pro`, and executes the query. | Pass |
| 3.   | (Optional) Provide an invalid/non-existent model name:<br>`GEMINI_MODEL_VERSION="gemini-non-existent-version" npm run dev`<br>Trigger a quiz generation. | The Google SDK request is dispatched and fails with a `404 Model not found` error, verifying that the provider did indeed send the overridden model name parameter rather than defaulting. | Pass |
