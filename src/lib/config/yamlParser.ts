import { z } from 'zod';
import * as YAML from 'yaml';

export const archicheckConfigSchema = z.object({
  lines_added_threshold: z.number().int().positive().default(300),
  algorithmic_complexity_score: z.number().int().min(1).max(10).default(5),
  ai_reliance_ratio: z.number().min(0.0).max(1.0).default(0.7),
  excluded_paths: z.array(z.string()).default(['**/node_modules/**', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'])
});

export type ArchicheckConfig = z.infer<typeof archicheckConfigSchema>;

export class ConfigSizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigSizeError';
  }
}

/**
 * Parses and validates raw .archicheck.yml/yaml contents.
 * Reverts to defaults if parsing, validation, or size boundaries fail.
 */
export function parseAndValidateConfig(yamlContentString: string | null | undefined): ArchicheckConfig {
  const defaultConfig = archicheckConfigSchema.parse({});

  if (!yamlContentString || yamlContentString.trim().length === 0) {
    return defaultConfig;
  }

  try {
    // 50KB limit size guard (51200 bytes)
    const byteLength = Buffer.byteLength(yamlContentString, 'utf8');
    if (byteLength > 51200) {
      throw new ConfigSizeError(`Configuration file size of ${byteLength} bytes exceeds the 50KB safety limit.`);
    }

    const parsed = YAML.parse(yamlContentString);
    
    // Zod's parse with defaults handles missing parameters by deep-merging defaults
    return archicheckConfigSchema.parse(parsed || {});
  } catch (error) {
    console.warn(
      `[ArchiCheck] Failed to parse repository configuration. Falling back to system defaults. Reason:`,
      (error as Error).message
    );
    return defaultConfig;
  }
}
