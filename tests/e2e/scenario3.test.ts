import { test, expect } from '@playwright/test';
import { Octokit } from '@octokit/rest';
import { cleanupPrAndBranch } from './utils/api-teardown';

const owner = process.env.GITHUB_OWNER || 'tinhct';
const repo = process.env.GITHUB_REPO || 'archi-check';
const token = process.env.GITHUB_TOKEN;

test.describe('ArchiCheck E2E - Scenario 3 (ReDoS Bomb & Fail-Open)', () => {
  let pullNumber: number;
  let branchName: string;

  test.afterEach(async () => {
    if (pullNumber && branchName) {
      await cleanupPrAndBranch(pullNumber, branchName);
    }
  });

  test('should fail open and approve access when encountering ReDoS timeout', async ({ page }) => {
    if (!token) {
      test.skip(true, 'GITHUB_TOKEN not provided. Skipping E2E test.');
      return;
    }

    const octokit = new Octokit({ auth: token });
    const timestamp = Date.now();
    branchName = `archicheck-qa-test-s3-${timestamp}`;

    console.log(`[E2E] Creating branch refs/heads/${branchName}...`);
    const mainRef = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    const mainSha = mainRef.data.object.sha;

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: mainSha,
    });

    let fileContent = 'const bomb = "TRIGGER_REDOS_TIMEOUT";\n';
    for (let i = 0; i < 310; i++) {
      fileContent += `const dummyLine_${i} = "filler";\n`;
    }

    console.log('[E2E] Committing file to trigger Scenario 3...');
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `src/qa-test-s3-${timestamp}.ts`,
      message: 'test: trigger scenario 3 ReDoS bomb E2E',
      content: Buffer.from(fileContent).toString('base64'),
      branch: branchName,
    });

    console.log('[E2E] Opening Pull Request...');
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: `E2E Test: Scenario 3 ReDoS Bomb - ${timestamp}`,
      head: branchName,
      base: 'main',
      body: 'This PR triggers Scenario 3 ReDoS timeout.',
    });
    pullNumber = pr.data.number;
    console.log(`[E2E] Pull Request #${pullNumber} opened successfully.`);

    console.log('[E2E] Waiting for webhook status fail-open on GitHub PR page...');
    await page.goto(`https://github.com/${owner}/${repo}/pull/${pullNumber}`);

    // Assert status check transitions to success with warning description
    const failOpenStatus = page.locator('text=Custom secret sanitizer timed out. Gate bypassed.');
    await expect(failOpenStatus).toBeVisible({ timeout: 25000 });

    // Assert warning comment is visible on the PR thread
    const warningComment = page.locator('text=The secret sanitization pass timed out. To prevent build blocks');
    await expect(warningComment).toBeVisible({ timeout: 15000 });
  });
});
