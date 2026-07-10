#!/usr/bin/env node
/**
 * ArchiCheck BYOK Setup Wizard — AC-ST-503 / Epic-05
 * Run: npm run setup:keys
 *
 * Guides a new developer to configure their free-tier Google AI Studio key,
 * validates it with a lightweight live ping, and safely injects it into
 * .env.local without corrupting any existing variables.
 *
 * Historical Mitigation (Sprint 1 — multiline .env.local corruption):
 * File patching uses a line-by-line filter strategy. Only lines starting
 * with LLM_API_KEY= or LLM_PROVIDER_TYPE= are replaced. All other lines
 * (including multiline GITHUB_PRIVATE_KEY PEM blocks) are written back verbatim.
 *
 * Flags:
 *   --offline   Skip the live Gemini API validation ping.
 */

import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── ANSI colour helpers ──────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const fmt = {
  info: (s) => `${c.cyan}ℹ ${c.reset}${s}`,
  ok: (s) => `${c.green}✔ ${c.reset}${s}`,
  warn: (s) => `${c.yellow}⚠ ${c.reset}${s}`,
  err: (s) => `${c.red}✖ ${c.reset}${s}`,
  header: (s) => `\n${c.bold}${c.blue}${s}${c.reset}\n`,
};

// ─── Parse CLI flags ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isOffline = args.includes('--offline');

// ─── Readline helper ─────────────────────────────────────────────────────────
function prompt(question, masked = false) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    if (masked) {
      // Hide input for API key entry
      process.stdout.write(question);
      let value = '';
      const stream = process.stdin;
      stream.setRawMode?.(true);
      stream.resume();
      stream.setEncoding('utf8');
      const onData = (ch) => {
        ch = ch.toString();
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          stream.setRawMode?.(false);
          stream.pause();
          stream.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(value);
        } else if (ch === '\u0003') {
          process.stdout.write('\n');
          process.exit(0);
        } else if (ch === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          value += ch;
          process.stdout.write('*');
        }
      };
      stream.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

// ─── Validate key against Gemini countTokens ─────────────────────────────────
async function validateKey(apiKey) {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    // Align model with core application configuration (gemini-2.5-flash)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    await model.countTokens('ArchiCheck BYOK validation ping.');
    return true;
  } catch {
    return false;
  }
}

// ─── Safe .env.local injection ────────────────────────────────────────────────
function injectEnvVars(apiKey) {
  const envPath = resolve(process.cwd(), '.env.local');

  let lines = [];
  if (existsSync(envPath)) {
    // Filter out any existing LLM_API_KEY= and LLM_PROVIDER_TYPE= lines
    // All other lines are preserved verbatim (including multiline PEM values)
    const raw = readFileSync(envPath, 'utf8');
    lines = raw
      .split('\n')
      .filter((line) => !line.startsWith('LLM_API_KEY=') && !line.startsWith('LLM_PROVIDER_TYPE='));
  }

  // Append the new values
  lines.push(`LLM_API_KEY=${apiKey}`);
  lines.push(`LLM_PROVIDER_TYPE=gemini-developer`);

  writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(fmt.header('🔑  ArchiCheck BYOK Setup Wizard'));
  console.log(`${c.dim}This wizard configures your free-tier Google AI Studio API key so you`);
  console.log(`can test live LLM generations locally without using ArchiCheck's`);
  console.log(`corporate Vertex AI budget.${c.reset}`);
  console.log();
  console.log(fmt.info(`Get a free key at: ${c.cyan}https://aistudio.google.com/app/apikey${c.reset}`));
  console.log();

  if (isOffline) {
    console.log(fmt.warn('Offline mode enabled. Skipping Gemini API validation.'));
    console.log();
  }

  // ── Prompt for key ──────────────────────────────────────────────────────────
  const apiKey = await prompt('Paste your Google AI Studio API key: ', true);

  if (!apiKey || apiKey.trim().length === 0) {
    console.log(fmt.err('No key provided. Aborting.'));
    process.exit(1);
  }

  // ── Validate ────────────────────────────────────────────────────────────────
  if (!isOffline) {
    process.stdout.write(`\n${fmt.info('Validating key with Gemini API…')}\n`);
    const isValid = await validateKey(apiKey);

    if (!isValid) {
      console.log(fmt.err('Key validation failed. The key may be invalid or have no quota.'));
      console.log();
      console.log(`${c.bold}${c.yellow}💡 Platform Transition Notice:${c.reset}`);
      console.log(`  Google has recently transitioned to issuing keys starting with ${c.cyan}"AQ."${c.reset} (instead of ${c.cyan}"AIza"${c.reset}).`);
      console.log(`  Some environments, proxies, or older SDK integrations might reject the ${c.cyan}"AQ."${c.reset} format.`);
      console.log();
      console.log(`${c.bold}🧪 To run a native "Acid Test" direct curl command to verify your key:${c.reset}`);
      console.log(`${c.dim}  curl -H "Content-Type: application/json" \\`);
      console.log(`       -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \\`);
      console.log(`       "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}"${c.reset}`);
      console.log();
      
      const override = await prompt('Save this key anyway? (y/N): ');
      if (!override.toLowerCase().startsWith('y')) {
        console.log(fmt.warn('Aborted. .env.local was not modified.'));
        process.exit(0);
      }
      console.log(fmt.warn('Saving unvalidated key at your request.'));
    } else {
      console.log(fmt.ok('Key validated successfully!'));
    }
  }

  // ── Inject into .env.local ──────────────────────────────────────────────────
  try {
    injectEnvVars(apiKey);
    console.log();
    console.log(fmt.ok('.env.local updated successfully.'));
    console.log(fmt.info('  LLM_API_KEY=<your-key>'));
    console.log(fmt.info('  LLM_PROVIDER_TYPE=gemini-developer'));
    console.log();
    console.log(`${c.green}${c.bold}Setup complete!${c.reset} Restart your dev server to use your key.`);
    console.log(`${c.dim}  npm run dev${c.reset}`);
  } catch (err) {
    console.log(fmt.err(`Failed to write .env.local: ${err.message}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(fmt.err(`Unexpected error: ${err.message}`));
  process.exit(1);
});
