import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/security/hmac';
import { env } from '@/config/env';

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
  
  try {
    const payload = JSON.parse(rawBody);

    // Fail-open strategy: Ensure processing does not exceed 5-second webhook limits.
    // In production, offload heavy analysis & LLM generation to an asynchronous background task 
    // (e.g. Vercel Background Functions, Ingest Pipeline, or an async Queue).
    
    if (event === 'pull_request') {
      const { action, pull_request } = payload;
      
      if (action === 'opened' || action === 'synchronize') {
        // Trigger asynchronous complexity analysis and gating flow
        console.log(`[ArchiCheck] Processing PR #${pull_request.number} context for commit ${pull_request.head.sha}`);
        
        // Return 202 Accepted to signal async processing has started
        return NextResponse.json({ 
          message: 'Pull request event accepted and queued for analysis',
          pr: pull_request.number,
          sha: pull_request.head.sha
        }, { status: 202 });
      }
    }

    if (event === 'issue_comment') {
      // Handles answers typed in PR comments or /archicheck bypass commands
      const { action, comment } = payload;
      if (action === 'created') {
        console.log(`[ArchiCheck] Processing new comment: "${comment.body.substring(0, 30)}..."`);
        
        return NextResponse.json({ message: 'Comment processed' }, { status: 200 });
      }
    }

    return NextResponse.json({ message: `Event '${event}' accepted but no action required` }, { status: 200 });

  } catch (error) {
    // Fail-open: log error but return success to prevent blocking GitHub's webhook deliveries
    console.error('[ArchiCheck] Webhook handler crashed but failing open:', error);
    return NextResponse.json({ 
      error: 'Internal processing failed, failing open', 
      details: (error as Error).message 
    }, { status: 200 });
  }
}
