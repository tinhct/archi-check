import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/webhook/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { env } from '@/config/env';

// Helper to construct a NextRequest with the correct headers and signature
function createMockRequest(payload: object, signatureHeaderValue?: string): NextRequest {
  const bodyString = JSON.stringify(payload);
  
  let signature = signatureHeaderValue;
  if (!signature) {
    const hmac = crypto.createHmac('sha256', env.GITHUB_WEBHOOK_SECRET);
    const hash = hmac.update(bodyString).digest('hex');
    signature = `sha256=${hash}`;
  }

  const req = new Request('http://localhost:3000/api/webhook', {
    method: 'POST',
    body: bodyString,
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'pull_request',
      'x-hub-signature-256': signature,
    },
  });

  return req as unknown as NextRequest;
}

describe('Webhook API Route Integration Tests', () => {
  it('should reject requests missing the GitHub signature header', async () => {
    const req = new Request('http://localhost:3000/api/webhook', {
      method: 'POST',
      body: JSON.stringify({ action: 'opened' }),
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'pull_request',
      },
    });

    const response = await POST(req as unknown as NextRequest);
    expect(response.status).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe('Missing signature header');
  });

  it('should reject requests with an invalid signature', async () => {
    const req = createMockRequest({ action: 'opened' }, 'sha256=invalid-signature-hash');
    
    const response = await POST(req);
    expect(response.status).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe('Invalid HMAC signature');
  });

  it('should accept pull_request.opened event with valid signature and return 202', async () => {
    const payload = {
      action: 'opened',
      pull_request: {
        number: 42,
        head: { sha: 'abcdef1234567890' },
      },
    };
    
    const req = createMockRequest(payload);
    const response = await POST(req);
    
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.message).toContain('accepted and queued');
    expect(body.pr).toBe(42);
    expect(body.sha).toBe('abcdef1234567890');
  });

  it('should accept issue_comment.created event and return 200', async () => {
    const payload = {
      action: 'created',
      comment: {
        body: 'Approved! /archicheck bypass reason',
        user: { login: 'techlead-user' },
      },
    };
    
    const bodyString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', env.GITHUB_WEBHOOK_SECRET);
    const hash = hmac.update(bodyString).digest('hex');

    const req = new Request('http://localhost:3000/api/webhook', {
      method: 'POST',
      body: bodyString,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'issue_comment',
        'x-hub-signature-256': `sha256=${hash}`,
      },
    });

    const response = await POST(req as unknown as NextRequest);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Comment processed');
  });
});
