import { Octokit } from '@octokit/rest';
import { QuizStatus } from '@/types/archicheck';

/**
 * Interface representing the details needed to post a commit status check.
 */
export interface StatusCheckOptions {
  client: Octokit;
  owner: string;
  repo: string;
  sha: string;
  status: QuizStatus;
  description?: string;
}

/**
 * Handles creation and updates of GitHub status checks for pull request commits.
 */
export class GitHubStatusService {
  /**
   * Sets the commit status check for ArchiCheck verification.
   * 
   * @param options Configuration options.
   */
  async setCommitStatus(options: StatusCheckOptions): Promise<void> {
    const { client, owner, repo, sha, status, description } = options;

    let state: 'pending' | 'success' | 'failure' | 'error';
    let defaultDescription = '';

    switch (status) {
      case 'pending':
        state = 'pending';
        defaultDescription = 'Awaiting architectural comprehension check.';
        break;
      case 'success':
        state = 'success';
        defaultDescription = 'Comprehension verified. Ready to merge.';
        break;
      case 'bypassed':
        state = 'success';
        defaultDescription = 'Bypassed by Tech Lead. Ready to merge.';
        break;
      case 'failed':
      default:
        state = 'failure';
        defaultDescription = 'Comprehension verification failed.';
        break;
    }

    await client.repos.createCommitStatus({
      owner,
      repo,
      sha,
      state,
      context: 'archicheck/verification',
      description: description || defaultDescription,
      // Optional URL pointing to a dashboard (if built in enterprise edition)
      target_url: undefined,
    });
  }
}

export const gitHubStatusService = new GitHubStatusService();
