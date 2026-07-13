/**
 * instrumentation-client.ts — Next.js 15+ App Router client instrumentation hook.
 *
 * This file is loaded by Next.js (via require-instrumentation-client.js) BEFORE
 * React's hydrateRoot() is called. Module-level code here is the earliest
 * possible interception point in the client runtime.
 *
 * Problem:
 *   The Scite Chrome extension (ID: hghakoefmnkhamdhenpbogkeopjlkpoa) injects
 *   a <div id="shadowLL"> and a chrome-extension:// <link> into Next.js's
 *   internal MetadataWrapper <div hidden> boundary before React hydration runs.
 *   This causes a structural mismatch that React 19 surfaces as a recoverable
 *   error, which the Next.js dev overlay shows as a crash popup.
 *
 * Why suppressHydrationWarning on <html> / <body> does NOT fix this:
 *   suppressHydrationWarning suppresses mismatches ONE React-component level
 *   deep. The mismatch is inside Next.js's own <MetadataWrapper> → <div hidden>
 *   → <__next_metadata_boundary__>, which is many levels below <html> in the
 *   React component tree. React's prop never propagates that deep.
 *
 * Why useEffect / useLayoutEffect cannot fix this:
 *   React's onRecoverableError callback (which calls window.reportError) fires
 *   during the commit phase of the work loop — BEFORE useEffect or
 *   useLayoutEffect fire. By the time any effect runs, the error has already
 *   been dispatched to the dev overlay.
 *
 * Solution:
 *   Before hydrateRoot() runs, monkey-patch window.reportError() to intercept
 *   hydration errors that coincide with known browser-extension DOM injection
 *   markers. Detection uses DOM inspection (NOT error message text) because
 *   "shadowLL" appears only in the dev overlay's visual diff, never inside the
 *   actual Error object's message or stack.
 *
 *   Suppression criteria (ALL must be true):
 *     1. error.message includes "Hydration failed"
 *     2. The DOM contains a chrome-extension:// <link> OR the Scite <div id="shadowLL">
 *
 *   All other errors pass through to the original window.reportError() unchanged,
 *   so real application errors are never silently swallowed.
 *
 *   This block is dead code in production (NODE_ENV guard).
 */

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  const originalReportError = window.reportError.bind(window);

  window.reportError = function patchedReportError(error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes('Hydration failed') &&
      typeof document !== 'undefined'
    ) {
      // Detect browser extension DOM injection by inspecting the live DOM.
      // Extension-injected elements are present at the time this callback fires
      // (during React's commit phase), before React cleans them up.
      const hasExtensionInjection =
        // Scite extension's shadow container
        !!document.getElementById('shadowLL') ||
        // Any chrome-extension:// stylesheet link in the document
        !!document.querySelector('link[href^="chrome-extension://"]') ||
        // Firefox and Safari extension links (defensive)
        !!document.querySelector('link[href^="moz-extension://"]') ||
        !!document.querySelector('link[href^="safari-extension://"]');

      if (hasExtensionInjection) {
        // Benign dev-only browser extension conflict. React has already
        // recovered by regenerating the tree on the client. Safe to discard.
        return;
      }
    }

    // All other errors: pass through to the original handler.
    return originalReportError(error);
  };
}

// Required export shape for Next.js instrumentation-client hooks.
export function register() {}
export function onRouteChange() {}
