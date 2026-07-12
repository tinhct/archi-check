import { describe, it, expect } from 'vitest';
import { verifySignature } from '@/lib/security/hmac';
import crypto from 'crypto';

describe('HMAC verification unit tests', () => {
  const secret = 'my-webhook-secret';
  const payload = JSON.stringify({ event: 'ping' });

  const getValidSignature = (p: string, s: string) => {
    const hmac = crypto.createHmac('sha256', s);
    return 'sha256=' + hmac.update(p).digest('hex');
  };

  it('should return true for a valid signature matching payload and secret', () => {
    const signature = getValidSignature(payload, secret);
    expect(verifySignature(payload, signature, secret)).toBe(true);
  });

  it('should return false if signature does not start with sha256= prefix', () => {
    const signature = 'invalid=' + crypto.randomBytes(32).toString('hex');
    expect(verifySignature(payload, signature, secret)).toBe(false);
  });

  it('should return false if signature buffer lengths do not match calculated signature length', () => {
    const signature = 'sha256=tooshort';
    expect(verifySignature(payload, signature, secret)).toBe(false);
  });

  it('should return false if signature calculation mismatch but length is same', () => {
    const validSig = getValidSignature(payload, secret);
    const modifiedSig = validSig.replace(/.$/, 'a'); // alter last character
    expect(verifySignature(payload, modifiedSig, secret)).toBe(false);
  });
});
