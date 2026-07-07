import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/security/hmac';
import { env } from '@/config/env';
import { gitHubAuthService } from '@/lib/github/auth';
import { diffParserService } from '@/lib/analyzer/diff-parser';
import { heuristicsService } from '@/lib/analyzer/heuristics';
import { llmProvider } from '@/lib/llm/provider';
import { setPRState } from '@/lib/redis/client';
import { generateQuizComment, generateRedisFailureComment } from '@/lib/github/comments';
import { waitUntil } from 'next/server';

/**
 * POST handler for GitHub App webhooks.
 * Implements strict security signature validation and must be fail-open < 5 seconds.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = env.GITHUB_WEBHOOK_SECRET;
  
  // 1. Signature Verification
  const signature = req.headers.get('x-hub-signature-256');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
  }

  const rawBody = await req.text();
  const isSignatureValid = verifySignature(rawBody, signature, webhookSecret);

  if (!isSignatureValid) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  // 2. Identify Event Type
  const event = req.headers.get('x-github-event');
  const payload = JSON.parse(rawBody);
  
  if (event === 'pull_request') {
    const { action, pull_request, repository, installation } = payload;
    
    if ((action === 'opened' || action === 'synchronize') && installation?.id) {
      const prNumber = pull_request.number;
      const headSha = pull_request.head.sha;
      const repoName = repository.name;
      const repoOwner = repository.owner.login;

      try {
        const octokit = await gitHubAuthService.getInstallationClient(installation.id);

        // [LOCK EARLY] Set status to Pending synchronously to avoid any race condition
        await octokit.rest.repos.createCommitStatus({
          owner: repoOwner,
          repo: repoName,
          sha: headSha,
          state: 'pending',
          context: 'archicheck/verification',
          description: 'ArchiCheck is evaluating your pull request changes...',
        });

        // [UNLOCK FAST] Run gating heuristics and LLM evaluation asynchronously in the background
        const gatingTask = (async () => {
          try {
            // A. Fetch Diff
            const rawDiff = await diffParserService.fetchPRDiff(octokit, repoOwner, repoName, prNumber);
            
            // B. Extract Complexity Metrics
            const analysis = diffParserService.parseDiff(rawDiff);

            // C. Fetch First Commit (First Commit Proxy)
            const commitsList = await octokit.rest.pulls.listCommits({
              owner: repoOwner,
              repo: repoName,
              pull_number: prNumber,
            });
            const firstCommitDate = commitsList.data[0]?.commit?.author?.date;
            
            let timeDeltaMinutes: number | undefined;
            if (firstCommitDate) {
              const diffMs = new Date(pull_request.created_at).getTime() - new Date(firstCommitDate).getTime();
              timeDeltaMinutes = Math.max(0, diffMs / 1000 / 60);
            }

            // D. Evaluate Heuristics (Check if gating is needed)
            const aiRelianceRatio = 0.0; // MVP default baseline; dynamic parsing in Story 3.2
            const requiresGate = heuristicsService.shouldGate(analysis, aiRelianceRatio, timeDeltaMinutes);

            if (!requiresGate) {
              // Heuristic bypass: immediately set status check to Success
              await octokit.rest.repos.createCommitStatus({
                owner: repoOwner,
                repo: repoName,
                sha: headSha,
                state: 'success',
                context: 'archicheck/verification',
                description: 'Bypassed: Changes do not meet complexity thresholds.',
              });
              return;
            }

            // E. Generate Quiz (LLM Provider call)
            const quizPayload = await llmProvider.generateQuiz(rawDiff);

            // F. Cache Quiz State in Upstash Redis (Cache-First)
            // If this throws (timeout/error), it falls to catch block (Fail-Open)
            await setPRState(prNumber, {
              prId: prNumber,
              commitSha: headSha,
              status: 'pending',
              quizPayload,
            });

            // G. Inject Comment in Pull Request thread
            const markdownComment = generateQuizComment(quizPayload);
            const commentResponse = await octokit.rest.issues.createComment({
              owner: repoOwner,
              repo: repoName,
              issue_number: prNumber,
              body: markdownComment,
            });

            // H. Update Status Check context pointing target_url directly to the comment HTML anchor URL
            await octokit.rest.repos.createCommitStatus({
              owner: repoOwner,
              repo: repoName,
              sha: headSha,
              state: 'pending',
              context: 'archicheck/verification',
              target_url: commentResponse.data.html_url,
              description: 'Verification quiz pending. Click "Details" to review the questions.',
            });

          } catch (err) {
            console.error(`[ArchiCheck] Async PR gating flow failed for PR #${prNumber}:`, err);
            
            // Fail-Open fallback (triggers if LLM or Redis fails)
            try {
              // Post warning comment
              await octokit.rest.issues.createComment({
                owner: repoOwner,
                repo: repoName,
                issue_number: prNumber,
                body: generateRedisFailureComment(),
              });
              
              // Unblock the CI/CD status check
              await octokit.rest.repos.createCommitStatus({
                owner: repoOwner,
                repo: repoName,
                sha: headSha,
                state: 'success',
                context: 'archicheck/verification',
                description: 'Bypassed: System degraded (Redis/LLM failure).',
              });
            } catch (fallbackErr) {
              console.error('[ArchiCheck] Failed to execute fail-open fallback status update:', fallbackErr);
            }
          }
        })();

        if (typeof waitUntil === 'function') {
          waitUntil(gatingTask);
        }

        return NextResponse.json({ 
          message: 'Pull request event accepted and queued for analysis',
          pr: prNumber,
          sha: headSha
        }, { status: 202 });

      } catch (err) {
        console.error('[ArchiCheck] Webhook handler failed to initialize status lock:', err);
        // Fail-open synchronously at webhook level if Octokit initialization crashes
        return NextResponse.json({ error: 'System degraded, failing open.' }, { status: 200 });
      }
    }
  }

  if (event === 'issue_comment') {
    const { action, comment } = payload;
    if (action === 'created') {
      console.log(`[ArchiCheck] Processing new comment: "${comment.body.substring(0, 30)}..."`);
      return NextResponse.json({ message: 'Comment processed' }, { status: 200 });
    }
  }

  return NextResponse.json({ message: `Event '${event}' accepted but no action required` }, { status: 200 });
}
