import { ComplexityAnalysis } from '@/types/archicheck';

/**
 * Service responsible for parsing raw git diff strings and calculating architectural complexity scores.
 */
export class DiffParserService {
  /**
   * Parses a raw Git unified diff string.
   * Extracts structural metrics (lines added/removed, cyclomatic indicators).
   * 
   * @param rawDiff The unified git diff string.
   * @returns ComplexityAnalysis object detailing lines modified and raw complexity score.
   */
  parseDiff(rawDiff: string): ComplexityAnalysis {
    let linesAdded = 0;
    let linesRemoved = 0;
    let complexityIndicators = 0;

    const lines = rawDiff.split('\n');

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        linesAdded++;
        // Check for indicators of algorithmic or logic complexity (conditionals, loops, API routes)
        if (
          /\b(if|else|switch|case|for|while|try|catch|async|await|promise|function|const|class)\b/i.test(
            line,
          )
        ) {
          complexityIndicators++;
        }
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        linesRemoved++;
      }
    }

    // Heuristic: basic score based on complexity keywords relative to total additions
    const totalLinesModified = linesAdded + linesRemoved;
    let score = 0;

    if (linesAdded > 0) {
      score = Math.min(10, Math.ceil((complexityIndicators / linesAdded) * 10 + totalLinesModified / 100));
    }

    return {
      score,
      linesAdded,
      linesRemoved,
      isAgentic: false, // Set by HeuristicsService based on additional metadata or telemetry
      confidence: 0.8,
    };
  }
}

export const diffParserService = new DiffParserService();
