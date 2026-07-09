import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          process.env[key] = value;
        }
      });
      console.log('[Trigger Tool] Loaded .env.local variables.');
    } else {
      console.warn('[Trigger Tool] .env.local not found. Using system environment variables.');
    }
  } catch (err) {
    console.error('[Trigger Tool] Failed to load .env.local:', err);
  }
}

function getGitRemoteInfo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    // Matches git@github.com:owner/repo.git or https://github.com/owner/repo.git
    const match = remoteUrl.match(/(?:github\.com[:/])([^/]+)\/([^.]+)(?:\.git)?/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
      };
    }
  } catch {
    // Fallback
  }
  return { owner: 'tinhct', repo: 'archi-check' };
}

async function run() {
  loadEnv();

  const { owner, repo } = getGitRemoteInfo();
  console.log(`[Trigger Tool] Resolved Git Remote: owner=${owner}, repo=${repo}`);

  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'mock-secret';
  const url = 'http://localhost:3000/api/webhook';
  
  const action = process.argv[2] || 'opened';
  let eventType = 'pull_request';
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let payload: any = {};
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (action === 'comment') {
    eventType = 'issue_comment';
    payload = {
      action: 'created',
      installation: {
        id: 123456,
      },
      issue: {
        number: 101,
        pull_request: {
          url: `https://api.github.com/repos/${owner}/${repo}/pulls/101`,
        },
      },
      comment: {
        id: 999999,
        body: process.argv[3] || '1. The 300 identical constant declarations are added as local testing data to trigger the developer velocity gating heuristic during end-to-end integration simulation testing.\n2. This addition does not imply any new runtime state management logic or dynamic configuration toggles within the LLM provider.\n3. The bundle size increase is minor (~15KB) and does not violate our serverless cold start limits or performance budget.',
        user: {
          login: 'junior-dev',
        },
      },
      repository: {
        name: repo,
        owner: {
          login: owner,
        },
      },
    };
  } else if (action === 'bypass') {
    eventType = 'issue_comment';
    payload = {
      action: 'created',
      installation: {
        id: 123456,
      },
      issue: {
        number: 101,
        pull_request: {
          url: `https://api.github.com/repos/${owner}/${repo}/pulls/101`,
        },
      },
      comment: {
        id: 999998,
        body: '/archicheck bypass',
        user: {
          login: 'techlead-admin',
        },
      },
      repository: {
        name: repo,
        owner: {
          login: owner,
        },
      },
    };
  } else {
    // Default pull_request.opened (supports 'opened', 'opened-ignored', 'opened-gated')
    const prNum = action === 'opened-ignored' ? 402 : action === 'opened-gated' ? 403 : 101;
    payload = {
      action: 'opened',
      number: prNum,
      installation: {
        id: 123456,
      },
      pull_request: {
        number: prNum,
        head: {
          sha: 'dummy-sha-commit-12345',
        },
        created_at: new Date().toISOString(),
        user: {
          login: 'junior-dev',
        },
      },
      repository: {
        name: repo,
        owner: {
          login: owner,
        },
      },
    };
  }

  const bodyString = JSON.stringify(payload);
  
  // Calculate timing-safe HMAC SHA-256 signature
  const hmac = crypto.createHmac('sha256', secret);
  const hash = hmac.update(bodyString).digest('hex');
  const signature = `sha256=${hash}`;

  console.log(`[Trigger Tool] Sending POST (${eventType} event / action: ${action}) to ${url}...`);
  console.log(`[Trigger Tool] Signature: ${signature}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': eventType,
        'x-hub-signature-256': signature,
      },
      body: bodyString,
    });

    console.log(`[Trigger Tool] Status: ${res.status} ${res.statusText}`);
    const responseText = await res.text();
    console.log(`[Trigger Tool] Response Body: ${responseText}`);
  } catch (error) {
    console.error('[Trigger Tool] Request failed:', error);
  }
}

run();
