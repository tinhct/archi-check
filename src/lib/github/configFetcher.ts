import { Octokit } from '@octokit/rest';

/**
 * Helper utility to sequentially retrieve repository-level .archicheck.yml or .archicheck.yaml files.
 */
export async function fetchRepositoryConfig(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string
): Promise<string | null> {
  // 1. Try to fetch .archicheck.yml
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '.archicheck.yml',
      ref
    });

    if (response.data && !Array.isArray(response.data) && 'content' in response.data) {
      return Buffer.from(response.data.content, 'base64').toString('utf8');
    }
  } catch (error) {
    // Log debug message and fallback to next extension
    console.debug(`[ArchiCheck] .archicheck.yml not found or failed to fetch: ${(error as Error).message}. Trying fallback...`);
  }

  // 2. Try to fetch .archicheck.yaml fallback
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '.archicheck.yaml',
      ref
    });

    if (response.data && !Array.isArray(response.data) && 'content' in response.data) {
      return Buffer.from(response.data.content, 'base64').toString('utf8');
    }
  } catch (error) {
    console.debug(`[ArchiCheck] Fallback .archicheck.yaml not found: ${(error as Error).message}`);
  }

  return null;
}
