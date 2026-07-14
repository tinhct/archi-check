import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCohortOverrides } from '@/lib/config/cohortManager';
import { ArchicheckConfig } from '@/lib/config/yamlParser';
import * as fs from 'fs';
import * as path from 'path';

describe('Pilot Cohort Configuration Manager Unit Tests', () => {
  const testYamlPath = path.join(process.cwd(), 'config/cohorts-test-temp.yaml');
  
  const baseConfig: ArchicheckConfig = {
    lines_added_threshold: 300,
    algorithmic_complexity_score: 5,
    ai_reliance_ratio: 0.7,
    excluded_paths: ['**/node_modules/**']
  };

  beforeEach(() => {
    // Ensure clean state before each test
    if (fs.existsSync(testYamlPath)) {
      fs.unlinkSync(testYamlPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testYamlPath)) {
      fs.unlinkSync(testYamlPath);
    }
  });

  it('should return base config if cohorts file is missing', () => {
    const config = getCohortOverrides('frontend-dev-1', baseConfig, testYamlPath);
    expect(config).toEqual(baseConfig);
  });

  it('should return base config if author is not in any cohort', () => {
    const yamlContent = `
version: "1.0"
cohorts:
  - id: "frontend-team"
    name: "Frontend UI Developers"
    members:
      - "frontend-dev-1"
    overrides:
      algorithmic_complexity_score: 3
`;
    fs.writeFileSync(testYamlPath, yamlContent, 'utf8');

    const config = getCohortOverrides('unregistered-user', baseConfig, testYamlPath);
    expect(config).toEqual(baseConfig);
  });

  it('should apply overrides if author matches cohort members case-insensitively', () => {
    const yamlContent = `
version: "1.0"
cohorts:
  - id: "frontend-team"
    name: "Frontend UI Developers"
    members:
      - "Frontend-Dev-1"
    overrides:
      algorithmic_complexity_score: 3
      excluded_paths:
        - "**/tests/**"
`;
    fs.writeFileSync(testYamlPath, yamlContent, 'utf8');

    const config = getCohortOverrides('frontend-dev-1', baseConfig, testYamlPath);
    expect(config.algorithmic_complexity_score).toBe(3);
    expect(config.lines_added_threshold).toBe(300); // unchanged
    expect(config.excluded_paths).toEqual(['**/tests/**']); // overridden
  });

  it('should warn and fall back to base config if cohorts file is malformed', () => {
    const yamlContent = `
version: "1.0"
cohorts:
  - id: "frontend-team"
    name: "Frontend UI Developers"
    members: "invalid-type-should-be-array"
    overrides: {}
`;
    fs.writeFileSync(testYamlPath, yamlContent, 'utf8');

    const config = getCohortOverrides('frontend-dev-1', baseConfig, testYamlPath);
    expect(config).toEqual(baseConfig);
  });
});
