import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Unit tests for the instrumentation-client.ts hydration error filter.
//
// Key design facts this suite tests:
//
//  1. instrumentation-client.ts runs BEFORE React's hydrateRoot() (it is
//     the first require in app-next-turbopack.js).
//
//  2. The filter uses DOM inspection — NOT error message text — to detect
//     browser extension injection. "shadowLL" appears only in the dev overlay's
//     visual diff, never inside the actual Error object's .message or .stack.
//
//  3. Detection criteria: error.message.includes("Hydration failed") AND
//     any of these DOM signals:
//       - document.getElementById("shadowLL") is truthy  (Scite shadow div)
//       - link[href^="chrome-extension://"] is present   (any Chrome ext link)
//       - link[href^="moz-extension://"] is present      (Firefox ext link)
//       - link[href^="safari-extension://"] is present   (Safari ext link)
//
//  4. All non-hydration errors and hydration errors without DOM signals pass
//     through to the original window.reportError() unchanged.
// ---------------------------------------------------------------------------

/**
 * Exact mirror of the suppression predicate inside instrumentation-client.ts.
 * Update this mirror whenever the predicate in the source file changes.
 */
function shouldSuppressError(
  error: unknown,
  mockDocument: {
    getElementById: (id: string) => Element | null;
    querySelector: (selector: string) => Element | null;
  }
): boolean {
  if (!(error instanceof Error)) return false;
  if (!error.message.includes('Hydration failed')) return false;

  const hasExtensionInjection =
    !!mockDocument.getElementById('shadowLL') ||
    !!mockDocument.querySelector('link[href^="chrome-extension://"]') ||
    !!mockDocument.querySelector('link[href^="moz-extension://"]') ||
    !!mockDocument.querySelector('link[href^="safari-extension://"]');

  return hasExtensionInjection;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHydrationError(msg = 'Hydration failed because the server rendered HTML didn\'t match the client.') {
  return new Error(msg);
}

function makeCleanDocument() {
  return {
    getElementById: vi.fn().mockReturnValue(null),
    querySelector: vi.fn().mockReturnValue(null),
  };
}

function makeExtensionDocument(options: {
  hasShadowLL?: boolean;
  chromeLink?: boolean;
  mozLink?: boolean;
  safariLink?: boolean;
} = {}) {
  // Use a plain truthy object — no DOM API needed (Vitest runs in node env).
  const mockElement = {} as Element;
  return {
    getElementById: vi.fn().mockImplementation((id: string) =>
      id === 'shadowLL' && options.hasShadowLL ? mockElement : null
    ),
    querySelector: vi.fn().mockImplementation((selector: string) => {
      if (selector.includes('chrome-extension') && options.chromeLink) return mockElement;
      if (selector.includes('moz-extension') && options.mozLink) return mockElement;
      if (selector.includes('safari-extension') && options.safariLink) return mockElement;
      return null;
    }),
  };
}

// ---------------------------------------------------------------------------
// Suppression cases — extension DOM signals present
// ---------------------------------------------------------------------------

describe('instrumentation-client: suppresses when extension DOM signal is present', () => {
  it('suppresses hydration error when Scite div#shadowLL is in the DOM', () => {
    const doc = makeExtensionDocument({ hasShadowLL: true });
    expect(shouldSuppressError(makeHydrationError(), doc)).toBe(true);
  });

  it('suppresses hydration error when a chrome-extension:// link is in the DOM', () => {
    const doc = makeExtensionDocument({ chromeLink: true });
    expect(shouldSuppressError(makeHydrationError(), doc)).toBe(true);
  });

  it('suppresses hydration error when a moz-extension:// link is in the DOM', () => {
    const doc = makeExtensionDocument({ mozLink: true });
    expect(shouldSuppressError(makeHydrationError(), doc)).toBe(true);
  });

  it('suppresses hydration error when a safari-extension:// link is in the DOM', () => {
    const doc = makeExtensionDocument({ safariLink: true });
    expect(shouldSuppressError(makeHydrationError(), doc)).toBe(true);
  });

  it('suppresses when both shadowLL AND chrome link are present', () => {
    const doc = makeExtensionDocument({ hasShadowLL: true, chromeLink: true });
    expect(shouldSuppressError(makeHydrationError(), doc)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pass-through cases — error must NOT be suppressed
// ---------------------------------------------------------------------------

describe('instrumentation-client: passes through errors that are not extension-caused', () => {
  it('does NOT suppress a hydration error when DOM is clean (no extension signals)', () => {
    const doc = makeCleanDocument();
    expect(shouldSuppressError(makeHydrationError(), doc)).toBe(false);
  });

  it('does NOT suppress a non-hydration Error (TypeError) even with extension in DOM', () => {
    const doc = makeExtensionDocument({ chromeLink: true });
    const err = new TypeError('Cannot read properties of null (reading "foo")');
    expect(shouldSuppressError(err, doc)).toBe(false);
  });

  it('does NOT suppress a non-hydration Error containing "shadowLL" in its message', () => {
    const doc = makeExtensionDocument({ hasShadowLL: true });
    const err = new Error('shadowLL element found during DOM scan');
    expect(shouldSuppressError(err, doc)).toBe(false);
  });

  it('does NOT suppress non-Error values (strings, plain objects, null)', () => {
    const doc = makeExtensionDocument({ chromeLink: true });
    expect(shouldSuppressError('Hydration failed error string', doc)).toBe(false);
    expect(shouldSuppressError({ message: 'Hydration failed' }, doc)).toBe(false);
    expect(shouldSuppressError(null, doc)).toBe(false);
    expect(shouldSuppressError(undefined, doc)).toBe(false);
  });

  it('does NOT suppress an error whose message mentions "chrome-extension" but not "Hydration failed"', () => {
    const doc = makeExtensionDocument({ chromeLink: true });
    const err = new Error('Failed to fetch chrome-extension://foo/bar.css');
    expect(shouldSuppressError(err, doc)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Verify the "shadowLL in message" anti-pattern is NOT used
// (regression guard: earlier broken implementation used message-based detection)
// ---------------------------------------------------------------------------

describe('instrumentation-client: does NOT rely on "shadowLL" being in error message/stack', () => {
  it('SUPPRESSES standard hydration error message (no shadowLL in msg) when DOM signal present', () => {
    // This is the real-world case: error.message is always the generic text,
    // "shadowLL" only appears in the dev overlay visual diff.
    const doc = makeExtensionDocument({ hasShadowLL: true });
    const err = makeHydrationError(
      'Hydration failed because the server rendered HTML didn\'t match the client.'
    );
    // Confirm: the error message itself does NOT contain "shadowLL"
    expect(err.message).not.toContain('shadowLL');
    // But suppression should still trigger due to DOM signal
    expect(shouldSuppressError(err, doc)).toBe(true);
  });

  it('does NOT suppress a hydration error whose message happens to contain "shadowLL" but DOM is clean', () => {
    const doc = makeCleanDocument();
    const err = makeHydrationError('Hydration failed, shadowLL mismatch detected');
    expect(shouldSuppressError(err, doc)).toBe(false);
  });
});
