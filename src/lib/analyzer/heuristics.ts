import { env } from '@/config/env';
import { ComplexityAnalysis } from '@/types/archicheck';
import { ArchicheckConfig } from '@/lib/config/yamlParser';

/**
 * Service that encapsulates the policy engine of ArchiCheck.
 * Determines if a pull request triggers the interactive comprehension gate.
 */
export class HeuristicsService {
  /**
   * Decides whether the pull request warrants an architectural interrogation.
   * 
   * @param analysis The complexity analysis of the diff.
   * @param aiRelianceRatio Estimated ratio of agent-authored code (0.0 to 1.0).
   * @param timeDeltaMinutes The time delta (in minutes) between the first commit and PR creation.
   * @param config Optional repository configuration overrides.
   * @returns True if the PR should be blocked and gated, false otherwise.
   */
  shouldGate(
    analysis: ComplexityAnalysis, 
    aiRelianceRatio: number,
    timeDeltaMinutes?: number,
    config?: ArchicheckConfig
  ): boolean {
    const complexityThreshold = config ? config.algorithmic_complexity_score : env.COMPLEXITY_THRESHOLD;
    const relianceThreshold = config ? config.ai_reliance_ratio : env.AGENT_RELIANCE_THRESHOLD;
    const linesAddedThreshold = config ? config.lines_added_threshold : 300;

    // 1. Standard policy gating: High complexity AND high AI reliance
    const exceedsComplexity = analysis.score >= complexityThreshold;
    const exceedsAiReliance = aiRelianceRatio >= relianceThreshold;
    const standardGate = exceedsComplexity && exceedsAiReliance;

    // 2. Velocity ("Spray and Pray") heuristic:
    // If development speed was suspiciously fast (< 15 mins) and the change was substantial
    const isSuspiciouslyFast = timeDeltaMinutes !== undefined && timeDeltaMinutes < 15;
    const exceedsVolume = analysis.linesAdded > linesAddedThreshold;
    const isSprayAndPray = isSuspiciouslyFast && exceedsVolume;

    return standardGate || isSprayAndPray;
  }
}

export const heuristicsService = new HeuristicsService();
