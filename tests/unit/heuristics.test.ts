import { describe, it, expect } from 'vitest';
import { heuristicsService } from '@/lib/analyzer/heuristics';
import { ComplexityAnalysis } from '@/types/archicheck';

describe('HeuristicsService Unit Tests', () => {
  const mockLowComplexity: ComplexityAnalysis = {
    score: 3,
    linesAdded: 10,
    linesRemoved: 2,
    isAgentic: false,
    confidence: 1.0,
  };

  const mockHighComplexity: ComplexityAnalysis = {
    score: 8,
    linesAdded: 150,
    linesRemoved: 50,
    isAgentic: false,
    confidence: 1.0,
  };

  const mockSprayVolume: ComplexityAnalysis = {
    score: 4,
    linesAdded: 350,
    linesRemoved: 10,
    isAgentic: false,
    confidence: 1.0,
  };

  it('should gate PRs that exceed both complexity and AI reliance thresholds', () => {
    // Complexity threshold is 5, AI reliance threshold is 0.7 (default settings)
    const result = heuristicsService.shouldGate(mockHighComplexity, 0.8);
    expect(result).toBe(true);
  });

  it('should not gate PRs with high complexity but low AI reliance', () => {
    const result = heuristicsService.shouldGate(mockHighComplexity, 0.3);
    expect(result).toBe(false);
  });

  it('should not gate PRs with low complexity even with high AI reliance', () => {
    const result = heuristicsService.shouldGate(mockLowComplexity, 0.9);
    expect(result).toBe(false);
  });

  it('should trigger gate via the Spray and Pray velocity fallback check', () => {
    // Under 15 minutes and > 300 lines added
    const result = heuristicsService.shouldGate(mockSprayVolume, 0.2, 10);
    expect(result).toBe(true);
  });

  it('should not trigger velocity gate if changes took > 15 minutes', () => {
    const result = heuristicsService.shouldGate(mockSprayVolume, 0.2, 20);
    expect(result).toBe(false);
  });

  it('should not trigger velocity gate if lines added <= 300 even if fast', () => {
    const result = heuristicsService.shouldGate(mockHighComplexity, 0.2, 5);
    expect(result).toBe(false);
  });

  it('should respect custom config overrides for complexity score gating', () => {
    // Standard high complexity (8) with high AI reliance (0.8) normally gates (true)
    // Overriding complexity threshold score to 9 should bypass gating (false)
    const customConfig = {
      lines_added_threshold: 300,
      algorithmic_complexity_score: 9,
      ai_reliance_ratio: 0.7,
      excluded_paths: []
    };
    const result = heuristicsService.shouldGate(mockHighComplexity, 0.8, undefined, customConfig);
    expect(result).toBe(false);
  });

  it('should respect custom config overrides for lines added volume gating', () => {
    // mockSprayVolume has 350 lines, time delta is 10 minutes. Under default settings (300 lines) it gates (true).
    // Overriding lines added threshold to 400 lines should bypass gating (false).
    const customConfig = {
      lines_added_threshold: 400,
      algorithmic_complexity_score: 5,
      ai_reliance_ratio: 0.7,
      excluded_paths: []
    };
    const result = heuristicsService.shouldGate(mockSprayVolume, 0.2, 10, customConfig);
    expect(result).toBe(false);
  });
});
