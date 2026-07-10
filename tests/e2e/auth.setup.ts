import { test as setup } from '@playwright/test';
import { authenticator } from 'otplib';
import fs from 'fs';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // 1. Check if GITHUB_STORAGE_STATE_JSON is provided via CI/CD secrets
  if (process.env.GITHUB_STORAGE_STATE_JSON) {
    console.log('[Auth Setup] Injecting storage state from GITHUB_STORAGE_STATE_JSON.');
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, process.env.GITHUB_STORAGE_STATE_JSON, 'utf8');
    return;
  }

  // 2. Otherwise execute UI-driven fallback authentication
  console.log('[Auth Setup] Executing login fallback via GitHub UI.');
  const username = process.env.GITHUB_USER;
  const password = process.env.GITHUB_PASSWORD;
  const totpSecret = process.env.GITHUB_TOTP_SECRET;

  if (!username || !password) {
    console.warn('[Auth Setup] Missing GITHUB_USER or GITHUB_PASSWORD. Writing empty storage state and skipping login.');
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }), 'utf8');
    return;
  }

  await page.goto('https://github.com/login');
  await page.fill('#login_field', username);
  await page.fill('#password', password);
  await page.click('input[type="submit"]');

  // Check if 2FA is required
  // Wait up to 3 seconds for 2FA screen to load if present
  try {
    await page.waitForSelector('input#app_totp', { timeout: 3000 });
    const isTwoFactorRequired = await page.locator('input#app_totp').isVisible();
    if (isTwoFactorRequired) {
      if (!totpSecret) {
        throw new Error('GITHUB_TOTP_SECRET is required but not provided.');
      }
      console.log('[Auth Setup] 2FA required. Generating TOTP token programmatically.');
      const otp = authenticator.generate(totpSecret);
      await page.fill('input#app_totp', otp);
    }
  } catch {
    console.log('[Auth Setup] No 2FA selector detected. Continuing...');
  }

  // Wait until we are redirected to dashboard (or logged in successfully)
  await page.waitForURL('https://github.com/**');

  // Save authentication state
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
  console.log('[Auth Setup] Storage state saved successfully.');
});
