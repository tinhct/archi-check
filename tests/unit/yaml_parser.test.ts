import { describe, it, expect, vi } from 'vitest';
import { parseAndValidateConfig } from '@/lib/config/yamlParser';

describe('YAML Parser & Config Validator Unit Tests', () => {
  it('should return system defaults if input string is null, empty or undefined', () => {
    const config = parseAndValidateConfig(undefined);
    expect(config.lines_added_threshold).toBe(300);
    expect(config.algorithmic_complexity_score).toBe(5);
    expect(config.ai_reliance_ratio).toBe(0.7);
    expect(config.excluded_paths).toContain('**/node_modules/**');
  });

  it('should successfully parse complete valid YAML configurations', () => {
    const yaml = `
lines_added_threshold: 150
algorithmic_complexity_score: 8
ai_reliance_ratio: 0.5
excluded_paths:
  - '**/dist/**'
  - 'static/'
`;
    const config = parseAndValidateConfig(yaml);
    expect(config.lines_added_threshold).toBe(150);
    expect(config.algorithmic_complexity_score).toBe(8);
    expect(config.ai_reliance_ratio).toBe(0.5);
    expect(config.excluded_paths).toContain('**/dist/**');
  });

  it('should gracefully merge missing fields with defaults on partial configurations', () => {
    const yaml = `
lines_added_threshold: 420
`;
    const config = parseAndValidateConfig(yaml);
    expect(config.lines_added_threshold).toBe(420);
    expect(config.algorithmic_complexity_score).toBe(5); // Default
    expect(config.ai_reliance_ratio).toBe(0.7); // Default
  });

  it('should fall back to defaults and log warnings if size exceeds 50KB limit', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Create a 51KB string
    const largeYaml = 'lines_added_threshold: 100\n' + '# '.repeat(26000);
    
    const config = parseAndValidateConfig(largeYaml);
    
    expect(config.lines_added_threshold).toBe(300); // Default
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][1]).toContain('exceeds the 50KB safety limit');
    
    warnSpy.mockRestore();
  });

  it('should fall back to defaults and log warnings if YAML syntax is malformed', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const malformedYaml = `
lines_added_threshold: [invalid
`;
    const config = parseAndValidateConfig(malformedYaml);
    expect(config.lines_added_threshold).toBe(300); // Default
    expect(warnSpy).toHaveBeenCalled();
    
    warnSpy.mockRestore();
  });
});
