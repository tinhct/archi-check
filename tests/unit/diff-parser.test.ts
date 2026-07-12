import { describe, it, expect } from 'vitest';
import { diffParserService } from '@/lib/analyzer/diff-parser';
import { MOCK_DIFF_COMPLEX } from '../fixtures/mock-diffs';

describe('DiffParserService Unit Tests', () => {
  it('should identify blocklisted files correctly', () => {
    expect(diffParserService.isBlocklisted('package-lock.json')).toBe(true);
    expect(diffParserService.isBlocklisted('yarn.lock')).toBe(true);
    expect(diffParserService.isBlocklisted('src/assets/logo.png')).toBe(true);
    expect(diffParserService.isBlocklisted('dist/bundle.js')).toBe(true);
    expect(diffParserService.isBlocklisted('docs/README.md')).toBe(true);
    
    expect(diffParserService.isBlocklisted('src/index.ts')).toBe(false);
    expect(diffParserService.isBlocklisted('src/lib/analyzer/heuristics.ts')).toBe(false);
  });

  it('should parse simple diffs and output low score', () => {
    const mockDiff = `
diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,2 +1,2 @@
-console.log("hello");
+console.log("world");
    `.trim();
    const analysis = diffParserService.parseDiff(mockDiff);
    expect(analysis.linesAdded).toBe(1);
    expect(analysis.linesRemoved).toBe(1);
    expect(analysis.score).toBeLessThanOrEqual(2);
  });

  it('should parse complex diffs containing structural keywords and output higher score', () => {
    const analysis = diffParserService.parseDiff(MOCK_DIFF_COMPLEX);
    expect(analysis.linesAdded).toBe(22);
    expect(analysis.linesRemoved).toBe(0);
    // MOCK_DIFF_COMPLEX has keywords: export, async, function, const, try, catch, etc.
    expect(analysis.score).toBeGreaterThan(2);
  });

  it('should skip blocklisted files in diff parsing lines counts', () => {
    const mockDiff = `
diff --git a/package-lock.json b/package-lock.json
index 12345..67890 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,3 +1,3 @@
+{ "version": "1.0.1" }
- { "version": "1.0.0" }
diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,2 +1,2 @@
+const testVal = 'valid-code';
    `.trim();

    const analysis = diffParserService.parseDiff(mockDiff);
    // package-lock.json added line must be ignored, only index.ts added line counts
    expect(analysis.linesAdded).toBe(1);
  });

  it('should extract only clean added code, stripping leading plus characters', () => {
    const rawDiff = `
diff --git a/src/test.ts b/src/test.ts
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,3 @@
 unmodified line
-deleted line
+const addedLine = true;
    `.trim();

    const cleanCode = diffParserService.extractAddedCode(rawDiff);
    expect(cleanCode).toBe('const addedLine = true;');
  });

  it('should skip custom excluded paths when parsed with custom excluded glob patterns', () => {
    const mockDiff = `
diff --git a/src/exclude-me/file.ts b/src/exclude-me/file.ts
--- a/src/exclude-me/file.ts
+++ b/src/exclude-me/file.ts
@@ -1,1 +1,2 @@
+const hiddenVar = 'skip this';
+
diff --git a/src/include-me/file.ts b/src/include-me/file.ts
--- a/src/include-me/file.ts
+++ b/src/include-me/file.ts
@@ -1,1 +1,2 @@
+const visibleVar = 'keep this';
`.trim();

    // With exclusion pattern
    const excludedPatterns = ['**/exclude-me/**'];
    const analysis = diffParserService.parseDiff(mockDiff, excludedPatterns);
    
    // Only src/include-me/file.ts (1 line added) should count. src/exclude-me/file.ts should be ignored.
    expect(analysis.linesAdded).toBe(1);
  });

  it('should handle exclusion pattern parsing errors gracefully by writing a warning and skipping the pattern', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalGlobToRegex = (diffParserService as any).globToRegex;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (diffParserService as any).globToRegex = () => {
      throw new Error('mock glob regex build error');
    };
    try {
      const isExcluded = diffParserService.isExcluded('src/file.ts', ['invalid-glob-pattern']);
      expect(isExcluded).toBe(false);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (diffParserService as any).globToRegex = originalGlobToRegex;
    }
  });

  it('should skip blocklisted files in extractAddedCode', () => {
    const mockDiff = `
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,1 +1,2 @@
+{ "new_dependency": "1.0.0" }
diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,1 +1,2 @@
+const active = true;
    `.trim();
    const cleanCode = diffParserService.extractAddedCode(mockDiff);
    expect(cleanCode).toBe('const active = true;');
  });
});
