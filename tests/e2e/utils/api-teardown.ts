import { Octokit } from '@octokit/rest';

/**
 * Clean up the temporary test branch and close the opened PR via the GitHub REST API.
 * 
 * @param pullNumber The pull request number to close.
 * @param branchName The git branch name to delete.
 */
export async function cleanupPrAndBranch(pullNumber: number, branchName: string) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('[Teardown] GITHUB_TOKEN not provided. Skipping branch and PR cleanup.');
    return;
  }

  const octokit = new Octokit({ auth: token });
  const owner = process.env.GITHUB_OWNER || 'tinhct';
  const repo = process.env.GITHUB_REPO || 'archi-check';

  try {
    console.log(`[Teardown] Closing Pull Request #${pullNumber}...`);
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
      state: 'closed',
    });
    console.log(`[Teardown] Pull Request #${pullNumber} closed successfully.`);
  } catch (error) {
    console.error(`[Teardown] Failed to close Pull Request #${pullNumber}:`, error);
  }

  try {
    console.log(`[Teardown] Deleting branch refs/heads/${branchName}...`);
    await octokit.git.deleteRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
    });
    console.log(`[Teardown] Branch refs/heads/${branchName} deleted successfully.`);
  } catch (error) {
    console.error(`[Teardown] Failed to delete branch refs/heads/${branchName}:`, error);
  }
}
