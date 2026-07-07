import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/webhook/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { env } from '@/config/env';
import { gitHubAuthService } from '@/lib/github/auth';
import { getPRState, setPRState } from '@/lib/redis/client';
import { llmProvider } from '@/lib/llm/provider';
import { heuristicsService } from '@/lib/analyzer/heuristics';

// Capture and track all background tasks registered via Next.js waitUntil
let activePromises: Promise<any>[] = [];

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    waitUntil: vi.fn().mockImplementation((promise) => {
      activePromises.push(promise);
    })
  };
});

// Helper to await all registered background promises to complete
async function flushBackgroundTasks() {
  await Promise.all(activePromises);
  activePromises = [];
}

// Create storage objects to act as our simulated database and git provider state
let mockRedisDb: Record<string, any> = {};
let mockGitHubComments: string[] = [];
let mockCommitStatuses: Array<{ state: string; description: string; target_url?: string }> = [];

// Mock GitHub App Authentication and Octokit client calls
vi.mock('@/lib/github/auth', () => {
  return {
    gitHubAuthService: {
      getInstallationClient: vi.fn().mockResolvedValue({
        request: vi.fn().mockResolvedValue({ data: 'mock-diff-content' }),
        rest: {
          repos: {
            createCommitStatus: vi.fn().mockImplementation((payload) => {
              mockCommitStatuses.push({
                state: payload.state,
                description: payload.description,
                target_url: payload.target_url
              });
              return Promise.resolve({});
            }),
            getCollaboratorPermissionLevel: vi.fn().mockImplementation((payload) => {
              // Simulating permission roles
              if (payload.username === 'techlead-admin') {
                return Promise.resolve({ data: { permission: 'admin' } });
              }
              return Promise.resolve({ data: { permission: 'write' } });
            })
          },
          pulls: {
            listCommits: vi.fn().mockResolvedValue({
              data: [{ commit: { author: { date: '2026-07-07T00:00:00Z' } } }]
            }),
          },
          issues: {
            createComment: vi.fn().mockImplementation((payload) => {
              mockGitHubComments.push(payload.body);
              return Promise.resolve({
                data: { html_url: `https://github.com/mock/pr/comment-${mockGitHubComments.length}` }
              });
            }),
          }
        }
      })
    }
  };
});

// Mock Upstash Redis state cache to use our stateful mockRedisDb
vi.mock('@/lib/redis/client', () => {
  return {
    setPRState: vi.fn().mockImplementation((prId, state) => {
      mockRedisDb[`pr:${prId}`] = state;
      return Promise.resolve();
    }),
    getPRState: vi.fn().mockImplementation((prId) => {
      return Promise.resolve(mockRedisDb[`pr:${prId}`] || null);
    }),
    deletePRState: vi.fn().mockImplementation((prId) => {
      delete mockRedisDb[`pr:${prId}`];
      return Promise.resolve();
    }),
  };
});

// Mock LLM provider to verify simulation steps
vi.mock('@/lib/llm/provider', () => {
  return {
    llmProvider: {
      generateQuiz: vi.fn().mockResolvedValue({
        questions: [
          {
            id: 'q1',
            question: 'Why did you use an asynchronous task loop in the route handler?',
            targetFile: 'src/app/api/webhook/route.ts',
            codeSnippet: 'waitUntil(gatingTask)',
            rationale: 'Checks if they understand Serverless background execution context limits.'
          }
        ]
      }),
      validateAnswers: vi.fn().mockImplementation((diff, quiz, answers) => {
        const answer = answers[0];
        if (answer.includes('waitUntil') || answer.includes('Vercel Edge')) {
          return Promise.resolve({
            passed: true,
            score: 9,
            reasoning: 'The developer correctly explained that waitUntil prevents Vercel from freezing the context prematurely.'
          });
        }
        return Promise.resolve({
          passed: false,
          score: 3,
          reasoning: 'The developer failed to justify the concurrency and serverless execution bounds.'
        });
      })
    }
  };
});

// Helper to construct a NextRequest with the correct headers and signature
function createMockRequest(payload: object, eventType: string = 'pull_request'): NextRequest {
  const bodyString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', env.GITHUB_WEBHOOK_SECRET);
  const hash = hmac.update(bodyString).digest('hex');
  const signature = `sha256=${hash}`;

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

describe('Milestone 1 End-to-End Simulation', () => {
  beforeEach(() => {
    mockRedisDb = {};
    mockGitHubComments = [];
    mockCommitStatuses = [];
    activePromises = [];
    vi.clearAllMocks();
  });

  it('should execute the full gated user journey successfully', async () => {
    vi.spyOn(heuristicsService, 'shouldGate').mockReturnValue(true);
    console.log('\n=== SIMULATION START ===');

    // ----------------------------------------------------
    // STEP 1: Developer opens a pull request containing high-complexity changes
    // ----------------------------------------------------
    console.log('\n[Step 1] Developer opens a new PR (Gating heuristic triggered)...');
    const openPRPayload = {
      action: 'opened',
      pull_request: {
        number: 101,
        head: { sha: 'commit-sha-101' },
        created_at: '2026-07-07T00:10:00Z', // 10 minutes delta (gating threshold)
        user: { login: 'junior-coder' }
      },
      repository: { name: 'archi-check', owner: { login: 'tinhct' } },
      installation: { id: 789 }
    };

    const openPRReq = createMockRequest(openPRPayload, 'pull_request');
    const openPRResponse = await POST(openPRReq);

    expect(openPRResponse.status).toBe(202);
    console.log('-> Status Locked synchronously to Pending.');
    expect(mockCommitStatuses[0]).toEqual({
      state: 'pending',
      description: 'ArchiCheck is evaluating your pull request changes...',
      target_url: undefined
    });

    // Flush mock background waitUntil tasks
    await flushBackgroundTasks();

    // Verify background task execution
    expect(llmProvider.generateQuiz).toHaveBeenCalled();
    expect(mockRedisDb['pr:101']).toBeDefined();
    expect(mockRedisDb['pr:101'].status).toBe('pending');
    expect(mockRedisDb['pr:101'].prAuthor).toBe('junior-coder');
    console.log('-> Heuristics scored: Gated.');
    console.log('-> Quiz questions generated and stored in Upstash Redis cache.');
    console.log('-> Quiz comment injected into PR thread.');

    // ----------------------------------------------------
    // STEP 2: An unauthorized reviewer tries to answer the quiz
    // ----------------------------------------------------
    console.log('\n[Step 2] A reviewer attempts to answer the questions...');
    const reviewerCommentPayload = {
      action: 'created',
      issue: { number: 101, pull_request: {} },
      comment: {
        body: 'We use waitUntil so that background tasks can finish.',
        user: { login: 'senior-reviewer' }
      },
      repository: { name: 'archi-check', owner: { login: 'tinhct' } },
      installation: { id: 789 }
    };

    const reviewerCommentReq = createMockRequest(reviewerCommentPayload, 'issue_comment');
    const reviewerCommentResponse = await POST(reviewerCommentReq);

    expect(reviewerCommentResponse.status).toBe(200);
    const reviewerCommentBody = await reviewerCommentResponse.json();
    expect(reviewerCommentBody.message).toBe('Warning comment posted to non-author commenter');
    console.log('-> Rejected: Warning comment posted. Only PR author is allowed to submit validations.');
    expect(mockGitHubComments[1]).toContain('only the PR Author (@junior-coder) may answer');

    // ----------------------------------------------------
    // STEP 3: PR Author answers the quiz justification
    // ----------------------------------------------------
    console.log('\n[Step 3] PR Author answers the quiz (Validation loop executed)...');
    const authorCommentPayload = {
      action: 'created',
      issue: { number: 101, pull_request: {} },
      comment: {
        body: '> Why did you use waitUntil?\nI used Next.js waitUntil to prevent Vercel serverless context freeze.',
        user: { login: 'junior-coder' }
      },
      repository: { name: 'archi-check', owner: { login: 'tinhct' } },
      installation: { id: 789 }
    };

    const authorCommentReq = createMockRequest(authorCommentPayload, 'issue_comment');
    const authorCommentResponse = await POST(authorCommentReq);

    expect(authorCommentResponse.status).toBe(202);
    
    // Flush background validation execution
    await flushBackgroundTasks();

    expect(llmProvider.validateAnswers).toHaveBeenCalled();
    expect(mockRedisDb['pr:101'].status).toBe('success');
    expect(mockCommitStatuses[mockCommitStatuses.length - 1].state).toBe('success');
    console.log('-> Validation passed (Score: 9/10).');
    console.log('-> Commit status unlocked to SUCCESS.');
    console.log('-> Release comment posted: Access approved.');

    // ----------------------------------------------------
    // STEP 4: Emergency Bypass triggered by Tech Lead
    // ----------------------------------------------------
    console.log('\n[Step 4] Simulating an alternative flow: Admin issues /archicheck bypass...');
    // Reset state to pending to run bypass test
    mockRedisDb['pr:101'].status = 'pending';

    const bypassCommentPayload = {
      action: 'created',
      issue: { number: 101, pull_request: {} },
      comment: {
        body: ' /archicheck bypass ', // with extra whitespaces
        user: { login: 'techlead-admin' },
        html_url: 'https://github.com/mock/pr/comment-bypass-123'
      },
      repository: { name: 'archi-check', owner: { login: 'tinhct' } },
      installation: { id: 789 }
    };

    const bypassCommentReq = createMockRequest(bypassCommentPayload, 'issue_comment');
    const bypassCommentResponse = await POST(bypassCommentReq);

    expect(bypassCommentResponse.status).toBe(200);
    const bypassCommentBody = await bypassCommentResponse.json();
    expect(bypassCommentBody.message).toBe('Emergency bypass executed successfully');
    
    expect(mockRedisDb['pr:101'].status).toBe('bypassed');
    expect(mockCommitStatuses[mockCommitStatuses.length - 1]).toEqual({
      state: 'success',
      description: '⚠️ Emergency bypass executed by Tech Lead.',
      target_url: 'https://github.com/mock/pr/comment-bypass-123'
    });
    console.log('-> Validated: User is collaborator (admin).');
    console.log('-> Gate unlocked with description: "⚠️ Emergency bypass executed by Tech Lead."');
    console.log('-> State database updated to bypassed.');
    console.log('-> Bypass audit comment injected into PR thread.');
    console.log('\n=== SIMULATION COMPLETED SUCCESSFULLY ===\n');
  });
});
