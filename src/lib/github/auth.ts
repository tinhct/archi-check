import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import { env } from '@/config/env';
import fs from 'fs';
import path from 'path';
import { logIntercepted } from '@/lib/shadow/shadowLogger';

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
        request: async (routeOrOptions: any, parameters?: any) => {
          console.log('[Mock GitHub] request called:', routeOrOptions, parameters);
          
          let pullNumber: number | undefined;
          if (typeof routeOrOptions === 'string') {
            pullNumber = parameters?.pull_number;
            const match = routeOrOptions.match(/\/pulls\/(\d+)/);
            if (match) {
              pullNumber = parseInt(match[1], 10);
            }
          } else if (routeOrOptions && typeof routeOrOptions === 'object') {
            pullNumber = routeOrOptions.pull_number || routeOrOptions.pull_request?.number;
            const urlStr = routeOrOptions.url || '';
            const match = urlStr.match(/\/pulls\/(\d+)/);
            if (match) {
              pullNumber = parseInt(match[1], 10);
            }
          }

          if (pullNumber === 402) {
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
          
          if (pullNumber === 403) {
            // Flow 4 - Gated paths: 60 lines of additions inside src/main.ts
            let diffLines = `diff --git a/src/main.ts b/src/main.ts
index 123456..789012 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,1 +1,60 @@\n`;
            for (let i = 0; i < 59; i++) {
              diffLines += `+const gated_${i} = "this path is gated";\n`;
            }
            diffLines += `+const [state, setState] = useState(0);\n`;
            return { data: diffLines };
          }

          if (pullNumber === 501) {
            // Sandbox Scenario 1: Leaky Diff
            let diffLines = `diff --git a/src/index.ts b/src/index.ts
index 123456..789012 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,4 +1,320 @@
+const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
+const slack_token = "xoxb-123456789012-123456789012-abcdefghijklmnopqrstuvwx";
+const gcp_key = "-----BEGIN RSA PRIVATE KEY-----\\nMIIEvgI...\\n-----END RSA PRIVATE KEY-----";
+const normal_line = "this is normal code change";
+`;
            for (let i = 0; i < 310; i++) {
              diffLines += `+const dummyLine_${i} = "filler";\n`;
            }
            return { data: diffLines };
          }

          if (pullNumber === 502) {
            // Sandbox Scenario 2: Prompt Injection Diff Trigger
            let diffLines = `diff --git a/src/main.ts b/src/main.ts
index 123456..789012 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,3 +1,320 @@
+const phrase = "prompt-injection";
+`;
            for (let i = 0; i < 310; i++) {
              diffLines += `+const dummyLine_${i} = "filler";\n`;
            }
            return { data: diffLines };
          }

          if (pullNumber === 503) {
            // Sandbox Scenario 3: ReDoS Bomb
            let diffLines = `diff --git b/src/main.ts b/src/main.ts
index 123456..789012 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,3 +1,320 @@
+const bomb = "TRIGGER_REDOS_TIMEOUT";
+`;
            for (let i = 0; i < 310; i++) {
              diffLines += `+const dummyLine_${i} = "filler";\n`;
            }
            return { data: diffLines };
          }

          if (pullNumber === 504) {
            // Sandbox Scenario 4: Perfect Loop
            let diffLines = `diff --git b/src/main.ts b/src/main.ts
index 123456..789012 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,3 +1,320 @@
+const clean_code = "all passes cleanly";
+`;
            for (let i = 0; i < 310; i++) {
              diffLines += `+const dummyLine_${i} = "filler";\n`;
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
    const octokit = octokitInstance as unknown as Octokit;

    // AC-ST-502: Shadow Mode — intercept all outbound GitHub write operations
    if (process.env.ARCHICHECK_MODE === 'shadow') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (octokit.rest.issues as any).createComment = async (params: any) => {
        logIntercepted('createComment', params);
        return { data: { html_url: '[SHADOW MODE — no comment posted]' } } as any;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (octokit.rest.repos as any).createCommitStatus = async (params: any) => {
        logIntercepted('createCommitStatus', params);
        return { data: {} } as any;
      };
    }

    return octokit;
  }
}

export const gitHubAuthService = new GitHubAuthService();
