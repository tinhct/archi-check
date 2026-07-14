import { redis } from '@/lib/redis/client';
import { env } from '@/config/env';
import { TokenCounts } from '@/types/archicheck';

// Pricing model per 1M tokens for Gemini
const GEMINI_INPUT_COST_PER_MILLION = 0.075;
const GEMINI_OUTPUT_COST_PER_MILLION = 0.30;

/**
 * Aggregates token consumption in Redis and dispatches a Slack alert
 * if the monthly budget limit is exceeded.
 */
export async function checkTokenBudget(tokens: TokenCounts): Promise<void> {
  // If no Slack webhook URL is configured, skip checking
  if (!env.SLACK_WEBHOOK_URL) {
    return;
  }

  try {
    const inputKey = 'archicheck:telemetry:input_tokens';
    const outputKey = 'archicheck:telemetry:output_tokens';

    // Increment input and output token totals in Redis
    const inputTotal = await (redis as any).incrby(inputKey, tokens.input);
    const outputTotal = await (redis as any).incrby(outputKey, tokens.output);

    // Calculate cumulative cost in USD
    const inputCost = (inputTotal * GEMINI_INPUT_COST_PER_MILLION) / 1000000;
    const outputCost = (outputTotal * GEMINI_OUTPUT_COST_PER_MILLION) / 1000000;
    const cumulativeCost = inputCost + outputCost;

    // Compare with budget threshold
    if (cumulativeCost >= env.TELEMETRY_BUDGET_LIMIT) {
      const alertSentKey = 'archicheck:telemetry:alert_sent';
      const hasBeenSent = await redis.get<string | boolean>(alertSentKey);

      if (!hasBeenSent) {
        // Dispatch Slack webhook alert payload
        const response = await fetch(env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ **[ArchiCheck Alert] LLM Token Budget Limit Breached**\n\nCumulative token consumption cost has reached **$${cumulativeCost.toFixed(4)}**, exceeding the configured budget limit of **$${env.TELEMETRY_BUDGET_LIMIT.toFixed(2)}**.\n\n*Input Tokens:* ${inputTotal.toLocaleString()}\n*Output Tokens:* ${outputTotal.toLocaleString()}\n\nAll automated checks will remain active, but please audit usage pattern logs.`,
          }),
        });

        if (response.ok) {
          // Store alert status in Redis with a 24-hour TTL (86400 seconds) to prevent spamming
          await redis.set(alertSentKey, 'true', { ex: 86400 });
          console.log(`[ArchiCheck] Token budget breach alert dispatched. Cost: $${cumulativeCost.toFixed(4)}`);
        } else {
          console.error(`[ArchiCheck] Failed to send budget alert to Slack. Status: ${response.status}`);
        }
      }
    }
  } catch (error) {
    console.error('[ArchiCheck] Failed to aggregate telemetry or dispatch budget alert:', error);
  }
}
