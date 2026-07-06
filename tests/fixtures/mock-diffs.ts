/**
 * Mock data fixtures representing various git diff structures for testing.
 */

export const MOCK_DIFF_SIMPLE = `
diff --git a/README.md b/README.md
index 12345..67890 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,3 @@
 # My Project
-Some text
+Some updated text
`.trim();

export const MOCK_DIFF_COMPLEX = `
diff --git a/src/index.ts b/src/index.ts
new file mode 100644
index 00000..12345
--- /dev/null
+++ b/src/index.ts
@@ -0,0 +1,24 @@
+import { createServer } from 'http';
+
+export async function runServer(port: number) {
+  const server = createServer(async (req, res) => {
+    const authHeader = req.headers.authorization;
+    if (!authHeader) {
+      res.writeHead(401);
+      return res.end('Unauthorized');
+    }
+    
+    try {
+      await processRequest(req);
+      res.writeHead(200);
+      res.end('OK');
+    } catch (err) {
+      res.writeHead(500);
+      res.end('Internal Server Error');
+    }
+  });
+  
+  server.listen(port);
+}
`.trim();

export const MOCK_DIFF_WITH_SECRET = `
diff --git a/config.ts b/config.ts
--- a/config.ts
+++ b/config.ts
@@ -1,3 +1,3 @@
-export const API_KEY = "placeholder";
+export const API_KEY = "AIzaSyDummyKey_1234567890abcdefghijklmn";
`.trim();
