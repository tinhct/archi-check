import { test, expect } from '@playwright/test';
import { Octokit } from '@octokit/rest';
import { cleanupPrAndBranch } from './utils/api-teardown';

const owner = process.env.GITHUB_OWNER || 'tinhct';
const repo = process.env.GITHUB_REPO || 'archi-check';
const token = process.env.GITHUB_TOKEN;

test.describe('ArchiCheck E2E - Scenario 4 (Happy Path)', () => {
  let pullNumber: number;
  let branchName: string;

  test.afterEach(async () => {
    if (pullNumber && branchName) {
      await cleanupPrAndBranch(pullNumber, branchName);
    }
  });

  test('should lock PR, render quiz, accept valid reply, and unlock PR', async ({ page }) => {
    if (!token) {
      test.skip(true, 'GITHUB_TOKEN not provided. Skipping E2E test.');
      return;
    }

    const octokit = new Octokit({ auth: token });
    const timestamp = Date.now();
    branchName = `archicheck-qa-test-s4-${timestamp}`;

    console.log(`[E2E] Creating branch refs/heads/${branchName}...`);
    const mainRef = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    const mainSha = mainRef.data.object.sha;

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: mainSha,
    });

    let fileContent = 'const clean_code = "all passes cleanly";\n';
    for (let i = 0; i < 310; i++) {
      fileContent += `const dummyLine_${i} = "filler";\n`;
    }

    console.log('[E2E] Committing file to trigger Scenario 4...');
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `src/qa-test-s4-${timestamp}.ts`,
      message: 'test: trigger scenario 4 happy path E2E',
      content: Buffer.from(fileContent).toString('base64'),
      branch: branchName,
    });

    console.log('[E2E] Opening Pull Request...');
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: `E2E Test: Scenario 4 Happy Path - ${timestamp}`,
      head: branchName,
      base: 'main',
      body: 'This PR triggers Scenario 4 gating.',
    });
    pullNumber = pr.data.number;
    console.log(`[E2E] Pull Request #${pullNumber} opened successfully.`);

    console.log('[E2E] Waiting for webhook status lock on GitHub PR page...');
    await page.goto(`https://github.com/${owner}/${repo}/pull/${pullNumber}`);

    // Assert status check enters pending state
    const pendingStatus = page.locator('text=Verification quiz pending');
    await expect(pendingStatus).toBeVisible({ timeout: 20000 });

    // Assert Markdown Quiz comment is visible
    const quizComment = page.locator('text=ArchiCheck Architectural Comprehension Quiz');
    await expect(quizComment).toBeVisible({ timeout: 15000 });

    // Fill in a valid response (>20 characters)
    console.log('[E2E] Submitting compliant architectural response...');
    await page.fill('#new_comment_field', '> This is a compliant explanation that exceeds the twenty character minimum length requirement.');
    await page.click('button:has-text("Comment")');

    // Assert status check transitions to success
    console.log('[E2E] Waiting for status check to transition to Success...');
    const successStatus = page.locator('text=Verification complete. Access approved.');
    await expect(successStatus).toBeVisible({ timeout: 20000 });
  });
});
