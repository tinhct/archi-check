import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/webhook/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { env } from '@/config/env';
import { gitHubAuthService } from '@/lib/github/auth';
import { getPRState } from '@/lib/redis/client';

// Mock GitHub App Authentication and Octokit client calls
vi.mock('@/lib/github/auth', () => {
  return {
    gitHubAuthService: {
      getInstallationClient: vi.fn().mockResolvedValue({
        request: vi.fn().mockResolvedValue({ data: 'mock-diff' }),
        rest: {
          repos: {
            createCommitStatus: vi.fn().mockResolvedValue({}),
            getCollaboratorPermissionLevel: vi.fn().mockResolvedValue({
              data: { permission: 'admin' }
            }),
          },
          pulls: {
            listCommits: vi.fn().mockResolvedValue({
              data: [{ commit: { author: { date: '2026-07-07T00:00:00Z' } } }]
            }),
          },
          issues: {
            createComment: vi.fn().mockResolvedValue({
              data: { html_url: 'https://github.com/mock/pr/comment-123' }
            }),
          }
        }
      })
    }
  };
});

// Mock Upstash Redis state cache
vi.mock('@/lib/redis/client', () => {
  return {
    setPRState: vi.fn().mockResolvedValue(undefined),
    getPRState: vi.fn().mockResolvedValue({
      prId: 42,
      commitSha: 'abcdef1234567890',
      prAuthor: 'pr-author-user',
      status: 'pending',
      quizPayload: {
        questions: [{ id: 'q1', question: 'Q', targetFile: 'F', codeSnippet: 'C', rationale: 'R' }]
      }
    }),
    deletePRState: vi.fn().mockResolvedValue(undefined),
  };
});

// Helper to construct a NextRequest with the correct headers and signature
function createMockRequest(payload: object, eventType: string = 'pull_request', signatureHeaderValue?: string): NextRequest {
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
      'x-github-event': eventType,
      'x-hub-signature-256': signature,
    },
  });

  return req as unknown as NextRequest;
}

describe('Webhook API Route Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    const req = createMockRequest({ action: 'opened' }, 'pull_request', 'sha256=invalid-signature-hash');
    
    const response = await POST(req);
    expect(response.status).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe('Invalid HMAC signature');
  });

  it('should accept pull_request.opened event and return 202', async () => {
    const payload = {
      action: 'opened',
      pull_request: {
        number: 42,
        head: { sha: 'abcdef1234567890' },
        created_at: '2026-07-07T00:10:00Z',
        user: { login: 'pr-author-user' }
      },
      repository: {
        name: 'archi-check',
        owner: { login: 'tinhct' },
      },
      installation: {
        id: 123
      }
    };
    
    const req = createMockRequest(payload);
    const response = await POST(req);
    
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.message).toContain('accepted and queued');
    expect(body.pr).toBe(42);
    expect(body.sha).toBe('abcdef1234567890');

    expect(gitHubAuthService.getInstallationClient).toHaveBeenCalledWith(123);
  });

  it('should block non-author comment attempts and post warning comment', async () => {
    const payload = {
      action: 'created',
      issue: {
        number: 42,
        pull_request: {} // Flag it as a PR comment
      },
      comment: {
        body: 'I am a reviewer trying to answer the quiz.',
        user: { login: 'some-reviewer-user' },
      },
      repository: {
        name: 'archi-check',
        owner: { login: 'tinhct' },
      },
      installation: {
        id: 123
      }
    };

    // Ensure mock Redis state returns the correct author
    vi.mocked(getPRState).mockResolvedValueOnce({
      prId: 42,
      commitSha: 'abcdef1234567890',
      prAuthor: 'pr-author-user', // Author is 'pr-author-user', commenter is 'some-reviewer-user'
      status: 'pending',
      quizPayload: { questions: [] }
    });

    const req = createMockRequest(payload, 'issue_comment');
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Warning comment posted to non-author commenter');
  });

  it('should accept PR author comments, clean replies, and return 202', async () => {
    const payload = {
      action: 'created',
      issue: {
        number: 42,
        pull_request: {}
      },
      comment: {
        body: 'My clean justification response details.',
        user: { login: 'pr-author-user' },
      },
      repository: {
        name: 'archi-check',
        owner: { login: 'tinhct' },
      },
      installation: {
        id: 123
      }
    };

    // Ensure mock Redis state returns the correct author matching the comment
    vi.mocked(getPRState).mockResolvedValueOnce({
      prId: 42,
      commitSha: 'abcdef1234567890',
      prAuthor: 'pr-author-user',
      status: 'pending',
      quizPayload: { questions: [] }
    });

    const req = createMockRequest(payload, 'issue_comment');
    const response = await POST(req);

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.message).toBe('Comment accepted for evaluation');
  });

  it('should execute emergency bypass if the commenter is an Admin or Maintainer', async () => {
    const payload = {
      action: 'created',
      issue: {
        number: 42,
        pull_request: {}
      },
      comment: {
        body: '/archicheck bypass',
        user: { login: 'techlead-admin' },
        html_url: 'https://github.com/mock/pr/comment-999'
      },
      repository: {
        name: 'archi-check',
        owner: { login: 'tinhct' },
      },
      installation: {
        id: 123
      }
    };

    const req = createMockRequest(payload, 'issue_comment');
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Emergency bypass executed successfully');
  });

  it('should reject emergency bypass if the commenter is not authorized', async () => {
    const payload = {
      action: 'created',
      issue: {
        number: 42,
        pull_request: {}
      },
      comment: {
        body: '/archicheck bypass  ', // trailing whitespace
        user: { login: 'junior-dev' },
        html_url: 'https://github.com/mock/pr/comment-888'
      },
      repository: {
        name: 'archi-check',
        owner: { login: 'tinhct' },
      },
      installation: {
        id: 123
      }
    };

    // Override mock response to return write permission for this test
    const mockInstallationClient = await gitHubAuthService.getInstallationClient(123);
    vi.spyOn(mockInstallationClient.rest.repos, 'getCollaboratorPermissionLevel').mockResolvedValueOnce({
      data: { permission: 'write' }
    } as any);

    const req = createMockRequest(payload, 'issue_comment');
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Unauthorized bypass attempt rejected');
  });
});
