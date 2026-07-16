/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require('crypto');
const { loadEnvConfig } = require('@next/env');

// Load environment variables from .env.local / .env
loadEnvConfig(process.cwd());

const secret = process.env.GITHUB_WEBHOOK_SECRET;
const port = process.env.PORT || '3000';

if (!secret) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error: GITHUB_WEBHOOK_SECRET is not defined in your environment variables.');
  console.error('Please configure .env.local first or run npm install to initialize it.');
  process.exit(1);
}

const username = process.argv[2] || 'developer-name';
const prNumber = parseInt(process.argv[3], 10) || 101;

const payload = JSON.stringify({
  action: 'opened',
  pull_request: {
    number: prNumber,
    state: 'open',
    user: { login: username, type: 'User' },
    head: { sha: '73335b39420c6c5332612a752e2a3e98d6042542', ref: 'feature-branch' },
    base: { sha: '0987654321fedcba', ref: 'main' }
  },
  repository: {
    name: 'archi-check',
    full_name: 'tinhct/archi-check',
    owner: { login: 'tinhct' }
  },
  installation: { id: 146231857 }
});

const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

console.log(`\n🚀 Simulating PR opened webhook event...`);
console.log(`👤 PR Author: ${username}`);
console.log(`🔢 PR Number: #${prNumber}`);
console.log(`🔗 Target URL: http://localhost:${port}/api/webhook`);

fetch(`http://localhost:${port}/api/webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-github-event': 'pull_request',
    'x-hub-signature-256': signature
  },
  body: payload
})
  .then(async (res) => {
    console.log(`\n📥 Response Status: ${res.status}`);
    if (res.status === 202) {
      console.log('\x1b[32m%s\x1b[0m', '✓ Success: Webhook successfully accepted for background processing.');
      console.log('Check your dev server console to view the incoming PR gating flow and analysis output.');
    } else {
      const text = await res.text();
      console.log('\x1b[31m%s\x1b[0m', `✖ Failed: Webhook returned status code ${res.status}`);
      console.log(text);
    }
  })
  .catch((err) => {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error connecting to server:', err.message);
    console.error('Make sure your local server is running (npm run dev) on the correct port.');
  });
