import { z } from 'zod';
import { ArchicheckConfig } from '@/lib/config/yamlParser';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';

const cohortOverrideSchema = z.object({
  lines_added_threshold: z.number().int().positive().optional(),
  algorithmic_complexity_score: z.number().int().min(1).max(10).optional(),
  ai_reliance_ratio: z.number().min(0.0).max(1.0).optional(),
  excluded_paths: z.array(z.string()).optional(),
});

const cohortSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(z.string()),
  overrides: cohortOverrideSchema,
});

const cohortsFileSchema = z.object({
  version: z.string(),
  cohorts: z.array(cohortSchema),
});

/**
 * Checks if the PR author belongs to a pilot cohort and returns merged configuration overrides.
 * Falls back to the base configuration if cohorts.yaml is missing or invalid.
 */
export function getCohortOverrides(
  author: string,
  baseConfig: ArchicheckConfig,
  configFilePath?: string
): ArchicheckConfig {
  const filePath = configFilePath || path.join(process.cwd(), 'config/cohorts.yaml');

  if (!fs.existsSync(filePath)) {
    console.log(`[ArchiCheck] Cohorts configuration file not found. Using base configuration.`);
    return baseConfig;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = YAML.parse(content);
    const validated = cohortsFileSchema.parse(parsed);

    // Case-insensitive member search
    const matchedCohort = validated.cohorts.find((cohort) =>
      cohort.members.some((member) => member.toLowerCase() === author.toLowerCase())
    );

    if (!matchedCohort) {
      console.log(`[ArchiCheck] No active cohort overrides found for author '${author}'. Using base configuration.`);
      return baseConfig;
    }

    console.log(`[ArchiCheck] Active cohort match found for author '${author}': '${matchedCohort.name}'. Applying overrides: ${JSON.stringify(matchedCohort.overrides)}`);

    // Filter out undefined fields to avoid overwriting baseConfig fields with undefined
    const cleanOverrides = Object.fromEntries(
      Object.entries(matchedCohort.overrides).filter(([, value]) => value !== undefined)
    );

    return {
      ...baseConfig,
      ...cleanOverrides,
    };
  } catch (err) {
    console.warn(
      '[ArchiCheck] Failed to load or validate cohorts configuration. Falling back to base configuration. Reason:',
      (err as Error).message
    );
    return baseConfig;
  }
}
