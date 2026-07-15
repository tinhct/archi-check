/* eslint-disable */
const crypto = require('crypto');

// 1. Setup secret and dynamic username
const secret = '7958b1b8925469c5cdc3f8d7148412bc028511ac';
const username = process.argv[2] || 'external-contractor'; // Defaults to the standard user

// 2. Build the payload
const payload = JSON.stringify({
    action: 'opened',
    pull_request: {
        number: 15, 
        state: 'open',
        user: { 
            login: username, // <-- Injected dynamically!
            type: 'User' 
        },
        head: { sha: '73335b39420c6c5332612a752e2a3e98d6042542', ref: 'feature-branch' },
        base: { sha: '0987654321fedcba', ref: 'main' }
    },
    repository: {
        name: 'archi-check',
        full_name: 'tinhct/archi-check',
        owner: { login: 'tinhct' }
    },
    installation: { id: 45123987 } 
});

// 3. Sign and fire
const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log(`Firing webhook as PR author: ${username}...`);

fetch('http://localhost:3000/api/webhook', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': signature
    },
    body: payload
}).then(res => console.log('Response Status:', res.status)).catch(console.error);