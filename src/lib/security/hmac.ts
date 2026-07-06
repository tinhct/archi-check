import crypto from 'crypto';

/**
 * Validates the HMAC hex signature sent by GitHub in the X-Hub-Signature-256 header.
 * 
 * @param payload The raw stringified request body.
 * @param signature The X-Hub-Signature-256 header value from GitHub.
 * @param secret The webhook secret configured in the GitHub App.
 * @returns True if signature is valid, false otherwise.
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature.startsWith('sha256=')) {
    return false;
  }

  const cleanSignature = signature.substring(7); // Remove 'sha256=' prefix
  const hmac = crypto.createHmac('sha256', secret);
  const calculatedSignature = hmac.update(payload).digest('hex');

  // Use timingSafeEqual to protect against timing attacks
  const signatureBuffer = Buffer.from(cleanSignature, 'utf8');
  const calculatedBuffer = Buffer.from(calculatedSignature, 'utf8');

  if (signatureBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, calculatedBuffer);
}
