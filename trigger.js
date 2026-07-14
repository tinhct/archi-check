/* eslint-disable */
const crypto = require('crypto');

// 1. Setup the secret and payload GITHUB_WEBHOOK_SECRET
const secret = '7958b1b8925469c5cdc3f8d7148412bc028511ac';

const payload = JSON.stringify({
    action: 'opened',
    pull_request: {
        number: 102,
        state: 'open',
        user: { login: 'developer-name', type: 'User' },
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

// 2. Generate the exact signature GitHub would generate
const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

// 3. Fire the request
console.log("Firing signed webhook...");
fetch('http://localhost:3000/api/webhook', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': signature
    },
    body: payload
}).then(async res => {
    console.log('Response Status:', res.status);
    if (res.status !== 202) console.log(await res.text());
}).catch(console.error);