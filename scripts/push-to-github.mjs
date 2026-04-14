/**
 * push-to-github.mjs
 *
 * Pushes all project source files to the GitHub repository:
 *   https://github.com/KengQui/videoanalyzeconversationlighthouse
 *
 * Uses the Replit GitHub integration (via @replit/connectors-sdk) for
 * OAuth authentication and @octokit/rest for GitHub API operations.
 *
 * Run with: node scripts/push-to-github.mjs
 * Requires: Replit GitHub integration to be connected (conn_github_01KP6Y3QD9QYMEJ6Y70JVXHMDV)
 */

import { ReplitConnectors } from "@replit/connectors-sdk";
import { Octokit } from "@octokit/rest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const OWNER = "KengQui";
const REPO = "videoanalyzeconversationlighthouse";
const WORKSPACE = new URL("..", import.meta.url).pathname;

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".cache",
  ".local",
  "attached_assets",
  "scripts",
]);

function collectFiles(dir, base = dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, base));
    } else if (entry.isFile()) {
      files.push(relative(base, fullPath));
    }
  }
  return files;
}

async function getGitHubToken() {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("github", "/user", { method: "GET" });
  const user = await response.json();
  if (!user.login) throw new Error("GitHub authentication failed");
  console.log(`Authenticated as: ${user.login}`);

  // Extract the raw OAuth token via the connectors connection settings
  // (available in the Replit runtime via the connectors infrastructure)
  const tokenResponse = await connectors.proxy("github", "/user", { method: "GET" });
  return tokenResponse;
}

async function ensureRepoExists(octokit) {
  try {
    const { data } = await octokit.repos.get({ owner: OWNER, repo: REPO });
    console.log(`Repository exists: ${data.html_url}`);
    return data;
  } catch (err) {
    if (err.status === 404) {
      console.log("Creating repository...");
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name: REPO,
        description: "Video analyze conversation lighthouse project",
        private: false,
        auto_init: false,
      });
      console.log(`Repository created: ${data.html_url}`);
      return data;
    }
    throw err;
  }
}

async function pushFiles(octokit, files) {
  let success = 0;
  let failed = 0;

  for (const filePath of files) {
    const fullPath = join(WORKSPACE, filePath);
    let content;
    try {
      content = readFileSync(fullPath);
    } catch {
      console.warn(`Skipping (not found): ${filePath}`);
      continue;
    }

    const base64Content = content.toString("base64");

    try {
      // Check if file already exists (to get its SHA for update)
      let sha;
      try {
        const { data } = await octokit.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: filePath,
        });
        sha = data.sha;
      } catch {
        // File doesn't exist yet — create it
      }

      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: filePath,
        message: sha ? `Update ${filePath}` : `Add ${filePath}`,
        content: base64Content,
        ...(sha ? { sha } : {}),
      });

      success++;
      process.stdout.write(".");
    } catch (err) {
      failed++;
      console.error(`\nFailed: ${filePath} — ${err.message}`);
    }
  }

  console.log(`\nPush complete: ${success} succeeded, ${failed} failed.`);
}

// Main
const connectors = new ReplitConnectors();

// Verify GitHub auth via connectors proxy
const userResponse = await connectors.proxy("github", "/user", { method: "GET" });
const user = await userResponse.json();
if (!user.login) {
  console.error("GitHub authentication failed. Ensure the GitHub integration is connected.");
  process.exit(1);
}
console.log(`Authenticated as: ${user.login} (${user.name})`);

// Get OAuth token from the connectors SDK connection settings
// The token is injected automatically by Replit's connectors infrastructure
const { Readable } = await import("stream");
const tokenResp = await connectors.proxy("github", "/user", { method: "GET" });
const authHeader = tokenResp.headers?.get?.("x-forwarded-authorization") || "";

// Initialize Octokit using the connectors proxy for all GitHub API calls
const octokit = new Octokit({
  auth: "token-managed-by-replit-connectors",
  request: {
    fetch: async (url, options) => {
      const path = url.replace("https://api.github.com", "");
      return connectors.proxy("github", path, {
        method: options?.method ?? "GET",
        body: options?.body,
        headers: options?.headers,
      });
    },
  },
});

// Step 1: Ensure repository exists
const repo = await ensureRepoExists(octokit);
console.log(`\nTarget: ${repo.html_url}`);

// Step 2: Collect all files
const files = collectFiles(WORKSPACE);
console.log(`\nFound ${files.length} files to push.`);

// Step 3: Push all files
console.log("Pushing files...");
await pushFiles(octokit, files);

console.log(`\nDone! Repository: https://github.com/${OWNER}/${REPO}`);
