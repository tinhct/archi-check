import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import { env } from '@/config/env';
import fs from 'fs';
import path from 'path';

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
          const urlStr = options.url || '';
          
          if (urlStr.includes('/pulls/402')) {
            // Flow 4 - Ignored paths: 60 lines of additions inside src/ignored-dir/file.ts
            let diffLines = `diff --git a/src/ignored-dir/file.ts b/src/ignored-dir/file.ts
index 123456..789012 100644
--- a/src/ignored-dir/file.ts
+++ b/src/ignored-dir/file.ts
@@ -1,1 +1,60 @@\n`;
            for (let i = 0; i < 60; i++) {
              diffLines += `+const ignored_${i} = "this path is ignored";\n`;
            }
            return { data: diffLines };
          }
          
          if (urlStr.includes('/pulls/403')) {
            // Flow 4 - Gated paths: 60 lines of additions inside src/main.ts
            let diffLines = `diff --git a/src/main.ts b/src/main.ts
index 123456..789012 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,1 +1,60 @@\n`;
            for (let i = 0; i < 60; i++) {
              diffLines += `+const gated_${i} = "this path is gated";\n`;
            }
            return { data: diffLines };
          }
          
          // Default 315 lines of provider.ts
          let diffLines = `diff --git a/src/lib/llm/provider.ts b/src/lib/llm/provider.ts
index 123456..789012 100644
--- a/src/lib/llm/provider.ts
+++ b/src/lib/llm/provider.ts
@@ -10,3 +10,320 @@\n`;
          for (let i = 0; i < 315; i++) {
            diffLines += `+const complexityLine_${i} = "forcing_velocity_spray_and_pray_gating_check";\n`;
          }
          return { data: diffLines };
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
            getContent: async (params: any) => {
              console.log('[Mock GitHub] getContent called:', params);
              const localFilePath = path.resolve(process.cwd(), params.path);
              if (fs.existsSync(localFilePath)) {
                const content = fs.readFileSync(localFilePath, 'utf8');
                return {
                  data: {
                    content: Buffer.from(content, 'utf8').toString('base64'),
                    encoding: 'base64',
                    type: 'file',
                    name: params.path,
                    path: params.path
                  }
                };
              }
              const err = new Error(`File Not Found at local path: ${localFilePath}`);
              (err as any).status = 404;
              throw err;
            }
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
