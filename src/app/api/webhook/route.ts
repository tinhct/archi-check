import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/security/hmac';
import { env } from '@/config/env';
import { gitHubAuthService } from '@/lib/github/auth';
import { diffParserService } from '@/lib/analyzer/diff-parser';
import { heuristicsService } from '@/lib/analyzer/heuristics';
import { llmProvider } from '@/lib/llm/provider';
import { setPRState, getPRState } from '@/lib/redis/client';
import { generateQuizComment, generateRedisFailureComment, generateNonAuthorWarningComment } from '@/lib/github/comments';
import { parseDeveloperReply } from '@/lib/github/comment-parser';
import { logIntercepted } from '@/lib/shadow/shadowLogger';
import { fetchRepositoryConfig } from '@/lib/github/configFetcher';
import { parseAndValidateConfig } from '@/lib/config/yamlParser';
import { scrubSecrets } from '@/lib/security/sanitizer';
import { validateCommentReply } from '@/lib/security/deterministicFilter';
// @ts-expect-error next/server does not export waitUntil in older next typings
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
            // A. Fetch repository configuration (.archicheck.yml/yaml)
            const configString = await fetchRepositoryConfig(octokit, repoOwner, repoName, headSha);
            const config = parseAndValidateConfig(configString);

            // B. Fetch Diff
            const rawDiff = await diffParserService.fetchPRDiff(octokit, repoOwner, repoName, prNumber);
            
            // Scrub diff payloads of credentials before metrics analysis and LLM calls
            let sanitizedDiff = rawDiff;
            try {
              sanitizedDiff = await scrubSecrets(rawDiff, [], prNumber);
            } catch (error) {
              console.warn('[ArchiCheck] Sanitizer timed out or failed (possible ReDoS). Fail-open quarantine triggered:', (error as Error).message);
              
              // 1. Release gate to Success
              await octokit.rest.repos.createCommitStatus({
                owner: repoOwner,
                repo: repoName,
                sha: headSha,
                state: 'success',
                context: 'archicheck/verification',
                description: '⚠️ Custom secret sanitizer timed out. Gate bypassed.',
              });

              // 2. Post PR warning comment
              await octokit.rest.issues.createComment({
                owner: repoOwner,
                repo: repoName,
                issue_number: prNumber,
                body: '⚠️ **ArchiCheck Warning**\n\nThe secret sanitization pass timed out. To prevent build blocks, the status gate has failed open and bypassed verification. Please inspect your changes for exposed credentials.',
              });
              return;
            }

            // C. Extract Complexity Metrics using custom excluded paths
            const analysis = diffParserService.parseDiff(sanitizedDiff, config.excluded_paths);

            // D. Fetch First Commit (First Commit Proxy)
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

            // E. Evaluate Heuristics (Check if gating is needed using config thresholds)
            const aiRelianceRatio = 0.0; // MVP default baseline; dynamic parsing in Story 3.2
            const requiresGate = heuristicsService.shouldGate(analysis, aiRelianceRatio, timeDeltaMinutes, config);

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

            // F. Generate Quiz (LLM Provider call)
            const { quiz: quizPayload } = await llmProvider.generateQuiz(sanitizedDiff);

            // F. Cache Quiz State in Upstash Redis (Cache-First)
            // If this throws (timeout/error), it falls to catch block (Fail-Open)
            await setPRState(prNumber, {
              prId: prNumber,
              commitSha: headSha,
              prAuthor: pull_request.user.login,
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
    const { action, issue, comment, repository, installation } = payload;
    
    // We only process created comments on active pull requests
    if (action === 'created' && issue.pull_request && installation?.id) {
      // Prevent infinite comment feedback loops by ignoring bot-created comments
      if (comment.user.type === 'Bot' || comment.user.login.endsWith('[bot]')) {
        return NextResponse.json({ message: 'Comment from bot user ignored' }, { status: 200 });
      }

      const prNumber = issue.number;
      const commentAuthor = comment.user.login;
      const repoName = repository.name;
      const repoOwner = repository.owner.login;
      const commentBody = comment.body.trim();

      // Case-insensitive bypass check ignoring trailing/leading whitespace
      const isBypassCommand = /^\/archicheck\s+bypass\s*$/i.test(commentBody);

      try {
        const octokit = await gitHubAuthService.getInstallationClient(installation.id);

        if (isBypassCommand) {
          // AC-ST-502: Shadow Mode guard — intercept bypass, do not mutate GitHub state
          if (process.env.ARCHICHECK_MODE === 'shadow') {
            logIntercepted('bypassCommand', { prNumber, commentAuthor, commentBody });
            return NextResponse.json({ message: '[Shadow Mode] Bypass command intercepted — no GitHub state mutated.' }, { status: 200 });
          }

          // Fetch Current Quiz State to verify the PR is tracked
          const state = await getPRState(prNumber);
          if (!state) {
            return NextResponse.json({ message: 'Bypass skipped: PR not tracked by ArchiCheck' }, { status: 200 });
          }

          // Fetch Commenter permission levels from GitHub API
          const permissionResponse = await octokit.rest.repos.getCollaboratorPermissionLevel({
            owner: repoOwner,
            repo: repoName,
            username: commentAuthor,
          });
          
          const role = permissionResponse.data.permission; // 'admin' | 'maintain' | 'write' | 'read' | 'none'
          const isAuthorized = role === 'admin' || role === 'maintain';

          if (isAuthorized) {
            // 1. Set commit status to Success (Unblocks CI/CD)
            await octokit.rest.repos.createCommitStatus({
              owner: repoOwner,
              repo: repoName,
              sha: state.commitSha,
              state: 'success',
              context: 'archicheck/verification',
              target_url: comment.html_url,
              description: '⚠️ Emergency bypass executed by Tech Lead.',
            });

            // 2. Set State in Upstash Redis
            await setPRState(prNumber, {
              ...state,
              status: 'bypassed',
              bypassReason: `Emergency bypass executed by @${commentAuthor}`,
              validatedAt: new Date().toISOString()
            });

            // 3. Post confirmation comment to PR
            await octokit.rest.issues.createComment({
              owner: repoOwner,
              repo: repoName,
              issue_number: prNumber,
              body: `⚠️ **Emergency bypass executed by @${commentAuthor}.**\n\nAutomated architectural verification check has been bypassed. PR is unblocked for merge.`
            });

            // 4. Log structured metadata JSON
            console.log(JSON.stringify({
              event: 'bypass_executed',
              pr_id: prNumber.toString(),
              user: commentAuthor,
              role
            }));

            return NextResponse.json({ message: 'Emergency bypass executed successfully' }, { status: 200 });

          } else {
            // Rejection reply for unauthorized users
            await octokit.rest.issues.createComment({
              owner: repoOwner,
              repo: repoName,
              issue_number: prNumber,
              body: `❌ Unauthorized. Only Maintainers or Admins can execute an emergency bypass. (Current role: \`${role}\`)`
            });

            return NextResponse.json({ message: 'Unauthorized bypass attempt rejected' }, { status: 200 });
          }
        }

        // Fetch Quiz State from Redis (1000ms timeout)
        const state = await getPRState(prNumber);

        // If this PR is not tracked or not actively in pending state, drop the event
        if (!state || state.status !== 'pending') {
          return NextResponse.json({ message: 'Comment acknowledged but no active gate pending' }, { status: 200 });
        }

        // Verify that the commenter is the PR Author
        if (commentAuthor !== state.prAuthor) {
          // Post non-author warning comment and reject
          await octokit.rest.issues.createComment({
            owner: repoOwner,
            repo: repoName,
            issue_number: prNumber,
            body: generateNonAuthorWarningComment(commentAuthor, state.prAuthor)
          });
          return NextResponse.json({ message: 'Warning comment posted to non-author commenter' }, { status: 200 });
        }

        // Isolate developer reply (strip blockquotes)
        const cleanReply = parseDeveloperReply(comment.body);
        if (!cleanReply) {
          return NextResponse.json({ message: 'Empty reply after parsing blockquotes' }, { status: 200 });
        }

        // Run deterministic filtering (AC-ST-603)
        const filterResult = validateCommentReply(cleanReply);
        if (!filterResult.valid) {
          // Post comment warning explaining the deterministic check rejection
          await octokit.rest.issues.createComment({
            owner: repoOwner,
            repo: repoName,
            issue_number: prNumber,
            body: `⚠️ **Architectural justification rejected by validation guardrails.**\n\n**Reason:** ${filterResult.reason}\n\nPlease provide a genuine technical explanation.`
          });
          return NextResponse.json({ message: 'Reply rejected by deterministic validation guardrails' }, { status: 200 });
        }

        // Run LLM validation asynchronously in the background
        const validationTask = (async () => {
          try {
            // A. Fetch original diff
            const rawDiff = await diffParserService.fetchPRDiff(octokit, repoOwner, repoName, prNumber);

            // Scrub secrets before passing to LLM validation
            let sanitizedDiff = rawDiff;
            try {
              sanitizedDiff = await scrubSecrets(rawDiff, [], prNumber);
            } catch (error) {
              console.warn('[ArchiCheck] Sanitizer timed out or failed (possible ReDoS) during validation. Fail-open triggered:', (error as Error).message);
              
              // Release status gate to Success
              await octokit.rest.repos.createCommitStatus({
                owner: repoOwner,
                repo: repoName,
                sha: state.commitSha,
                state: 'success',
                context: 'archicheck/verification',
                description: '⚠️ Custom secret sanitizer timed out. Gate bypassed.',
              });
              return;
            }

            // B. Validate via LLM
            const evaluation = await llmProvider.validateAnswers(sanitizedDiff, state.quizPayload, [cleanReply]);

            if (evaluation.passed) {
              // C1. Update status check to Success
              await octokit.rest.repos.createCommitStatus({
                owner: repoOwner,
                repo: repoName,
                sha: state.commitSha,
                state: 'success',
                context: 'archicheck/verification',
                description: '✅ Verification complete. Access approved.',
              });

              // C2. Update Redis state to Success
              await setPRState(prNumber, {
                ...state,
                status: 'success',
                userAnswers: [cleanReply],
                validatedAt: new Date().toISOString()
              });

              // C3. Post verification complete comment
              await octokit.rest.issues.createComment({
                owner: repoOwner,
                repo: repoName,
                issue_number: prNumber,
                body: `✅ **Verification complete!**\n\n*Reasoning*: ${evaluation.reasoning}`
              });

            } else {
              // D1. Keep Status check as pending, but update description with nudge
              await octokit.rest.repos.createCommitStatus({
                owner: repoOwner,
                repo: repoName,
                sha: state.commitSha,
                state: 'pending',
                context: 'archicheck/verification',
                description: `⏳ Interrogation failed (Score: ${evaluation.score}/10). Justification needed.`,
              });

              // D2. Post nudge comment
              await octokit.rest.issues.createComment({
                owner: repoOwner,
                repo: repoName,
                issue_number: prNumber,
                body: `⏳ **Please elaborate further.**\n\n*Feedback*: ${evaluation.reasoning}`
              });
            }

          } catch (err) {
            console.error(`[ArchiCheck] Async answer validation task failed for PR #${prNumber}:`, err);
          }
        })();

        if (typeof waitUntil === 'function') {
          waitUntil(validationTask);
        }

        return NextResponse.json({ message: 'Comment accepted for evaluation' }, { status: 202 });

      } catch (err) {
        console.error('[ArchiCheck] Webhook handler failed to parse issue_comment logic:', err);
        return NextResponse.json({ error: 'System degraded, failing open.' }, { status: 200 });
      }
    }
  }

  return NextResponse.json({ message: `Event '${event}' accepted but no action required` }, { status: 200 });
}
