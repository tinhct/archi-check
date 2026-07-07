import { defineConfig } from 'vitest/config';
import { loadEnvConfig } from '@next/env';
import path from 'path';

loadEnvConfig(process.cwd());

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', '.next/**', 'tests/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
