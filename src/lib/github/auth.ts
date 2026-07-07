import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import { env } from '@/config/env';

/**
 * Handles GitHub App JWT authentication and generates short-lived Installation Octokit instances.
 */
export class GitHubAuthService {
  private app: App;

  constructor() {
    const formattedKey = env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');
    this.app = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: formattedKey,
      webhooks: {
        secret: env.GITHUB_WEBHOOK_SECRET,
      },
    });
  }

  /**
   * Generates a GitHub App JWT (JSON Web Token) for administrative calls.
   * 
   * @returns The generated JWT string.
   */
  getAppJwt(): string {
    return this.app.getSignedJsonWebToken();
  }

  /**
   * Retrieves an authenticated Octokit client instance for a specific repository installation ID.
   * 
   * @param installationId The repository's installation ID.
   * @returns A promise resolving to an authenticated Octokit instance.
   */
  async getInstallationClient(installationId: number): Promise<Octokit> {
    const octokitInstance = await this.app.getInstallationOctokit(installationId);
    // Cast to Octokit (Octokit/Rest wrapper client)
    return octokitInstance as unknown as Octokit;
  }
}

export const gitHubAuthService = new GitHubAuthService();
