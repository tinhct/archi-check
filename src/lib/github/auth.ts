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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.app as any).getSignedJsonWebToken();
  }

  /**
   * Retrieves an authenticated Octokit client instance for a specific repository installation ID.
   * 
   * @param installationId The repository's installation ID.
   * @returns A promise resolving to an authenticated Octokit instance.
   */
  async getInstallationClient(installationId: number): Promise<Octokit> {
    if (process.env.MOCK_GITHUB === 'true') {
      console.log('[Mock GitHub] Returning mocked Octokit client for offline development.');
      /* eslint-disable @typescript-eslint/no-explicit-any */
      return {
        request: async (options: any) => {
          console.log('[Mock GitHub] request called:', options);
          return {
            data: `diff --git a/src/lib/llm/provider.ts b/src/lib/llm/provider.ts
index 123456..789012 100644
--- a/src/lib/llm/provider.ts
+++ b/src/lib/llm/provider.ts
@@ -10,3 +10,12 @@
+const test = "complex_keyword_here";
+if (test) {
+  console.log("adding complexity to force gating checks");
+  const process = "complexity_indicators";
+  const run = "ai_reliance";
+}`
          };
        },
        rest: {
          repos: {
            createCommitStatus: async (params: any) => {
              console.log('[Mock GitHub] createCommitStatus called:', params);
              return { data: {} };
            },
            getCollaboratorPermissionLevel: async (params: any) => {
              console.log('[Mock GitHub] getCollaboratorPermissionLevel called:', params);
              return { data: { permission: 'admin' } };
            },
          },
          pulls: {
            listCommits: async (params: any) => {
              console.log('[Mock GitHub] listCommits called:', params);
              return { data: [{ commit: { author: { date: new Date(Date.now() - 5 * 60 * 1000).toISOString() } } }] };
            },
          },
          issues: {
            createComment: async (params: any) => {
              console.log('[Mock GitHub] createComment called:', params);
              return { data: { html_url: 'http://localhost:3000/mock-comment-url' } };
            },
          },
        },
      } as unknown as Octokit;
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    const octokitInstance = await this.app.getInstallationOctokit(installationId);
    // Cast to Octokit (Octokit/Rest wrapper client)
    return octokitInstance as unknown as Octokit;
  }
}

export const gitHubAuthService = new GitHubAuthService();
