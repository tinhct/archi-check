import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig = (phase: string): NextConfig => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    process.env.SKIP_ENV_VALIDATION = 'true';
  }

  return {
    // Explicitly acknowledge Turbopack for dev (Next.js 16 default).
    // The webpack config below is only exercised during production builds,
    // where Turbopack is not used. Fixtures are intentionally available in dev.
    turbopack: {},
    allowedDevOrigins: [
      "vocalist-fence-outpost.ngrok-free.dev",
      "*.ngrok-free.dev",
      "*.ngrok-free.app",
      "*.ngrok.io",
      "*.smee.io"
    ],
    webpack: (config) => {
      // In production client builds, resolve the mocks directory to false (empty module).
      // This ensures adversarial fixture payloads (prompt injection samples, ReDoS triggers)
      // are never included in the client bundle.
      // Defense-in-depth: middleware + notFound() also block playground routes in production.
      if (phase === PHASE_PRODUCTION_BUILD) {
        config.resolve.alias = {
          ...config.resolve.alias,
          '@/lib/mocks/fixtures/playground-fixtures.json': false,
        };
      }
      return config;
    },
  };
};

export default nextConfig;
