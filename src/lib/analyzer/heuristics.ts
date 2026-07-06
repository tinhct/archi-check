import { env } from '@/config/env';
import { ComplexityAnalysis } from '@/types/archicheck';

/**
 * Service that encapsulates the policy engine of ArchiCheck.
 * Determines if a pull request triggers the interactive comprehension gate.
 */
export class HeuristicsService {
  /**
   * Decides whether the pull request warrants an architectural interrogation.
   * 
   * @param analysis The complexity analysis of the diff.
   * @param aiRelianceRatio Estimated ratio of agent-authored code (from Git metadata/PR body/author).
   * @returns True if the PR should be blocked and gated, false otherwise.
   */
  shouldGate(analysis: ComplexityAnalysis, aiRelianceRatio: number): boolean {
    const complexityThreshold = env.COMPLEXITY_THRESHOLD;
    const relianceThreshold = env.AGENT_RELIANCE_THRESHOLD;

    // Gate is active if the algorithmic complexity is high AND agentic contribution exceeds the threshold
    const exceedsComplexity = analysis.score >= complexityThreshold;
    const exceedsAiReliance = aiRelianceRatio >= relianceThreshold;

    return exceedsComplexity && exceedsAiReliance;
  }
}

export const heuristicsService = new HeuristicsService();
