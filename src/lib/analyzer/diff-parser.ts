import { ComplexityAnalysis } from '@/types/archicheck';
import { Octokit } from '@octokit/rest';

/**
 * Service responsible for parsing raw git diff strings and calculating architectural complexity scores.
 */
export class DiffParserService {
  private blocklistRegex = [
    // Dependency lockfiles
    /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|go\.sum)$/,
    // Static assets & media
    /\.(svg|png|jpg|jpeg|gif|ico|webp|mp4|webm|min\.js)$/,
    // Build/distribution folders
    /(^|\/)(dist|build|\.next)\//,
    // Documentation and structural configuration files
    /\.(md|csv|json)$/,
  ];

  /**
   * Fetches the raw .diff unified text of a pull request from the GitHub API.
   */
  async fetchPRDiff(octokit: Octokit, owner: string, repo: string, pullNumber: number): Promise<string> {
    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner,
      repo,
      pull_number: pullNumber,
      headers: {
        accept: 'application/vnd.github.diff',
      },
    });
    return response.data as unknown as string;
  }

  /**
   * Checks if a file path matches the exclusion blocklist.
   */
  isBlocklisted(filePath: string): boolean {
    return this.blocklistRegex.some((regex) => regex.test(filePath));
  }

  /**
   * Parses a raw Git unified diff string, skipping blocklisted files.
   * Extracts structural metrics (lines added/removed, complexity keyword indicators).
   */
  parseDiff(rawDiff: string): ComplexityAnalysis {
    let linesAdded = 0;
    let linesRemoved = 0;
    let complexityIndicators = 0;

    const hunks = this.splitIntoFiles(rawDiff);

    for (const hunk of hunks) {
      if (this.isBlocklisted(hunk.filePath)) {
        continue;
      }

      for (const line of hunk.lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          linesAdded++;
          // Algorithmic complexity indicators (MVP targets: class, interface, async, useState, useEffect, etc.)
          if (
            /\b(class|interface|async|useState|useEffect|function|const|let|var|if|for|while|switch|try|catch)\b/i.test(
              line,
            )
          ) {
            complexityIndicators++;
          }
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          linesRemoved++;
        }
      }
    }

    const totalLinesModified = linesAdded + linesRemoved;
    let score = 0;

    if (linesAdded > 0) {
      // Score calculation scales keyword triggers against clean additions
      score = Math.min(10, Math.ceil((complexityIndicators / linesAdded) * 10 + totalLinesModified / 100));
    }

    return {
      score,
      linesAdded,
      linesRemoved,
      isAgentic: false,
      confidence: 1.0,
    };
  }

  /**
   * Extracts only the raw code lines added (excluding blocklisted files and deleted blocks)
   * to provide a clean payload for LLM analysis.
   */
  extractAddedCode(rawDiff: string): string {
    const hunks = this.splitIntoFiles(rawDiff);
    const cleanLines: string[] = [];

    for (const hunk of hunks) {
      if (this.isBlocklisted(hunk.filePath)) {
        continue;
      }

      for (const line of hunk.lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          cleanLines.push(line.substring(1)); // Strip the leading '+'
        }
      }
    }

    return cleanLines.join('\n');
  }

  /**
   * Internal helper to split unified diffs into structural files and their lines.
   */
  private splitIntoFiles(rawDiff: string): Array<{ filePath: string; lines: string[] }> {
    const files: Array<{ filePath: string; lines: string[] }> = [];
    const lines = rawDiff.split('\n');
    let currentFile: { filePath: string; lines: string[] } | null = null;

    for (const line of lines) {
      if (line.startsWith('diff --git ')) {
        const parts = line.split(' ');
        let filePath = '';
        if (parts.length >= 4) {
          filePath = parts[3].replace(/^b\//, '');
        }
        currentFile = { filePath, lines: [] };
        files.push(currentFile);
      } else if (currentFile) {
        currentFile.lines.push(line);
      }
    }

    return files;
  }
}

export const diffParserService = new DiffParserService();
