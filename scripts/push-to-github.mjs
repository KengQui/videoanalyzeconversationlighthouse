/**
 * push-to-github.mjs
 *
 * Pushes this project to GitHub using git operations and the Replit GitHub integration.
 * Repository: https://github.com/KengQui/videoanalyzeconversationlighthouse
 *
 * Usage:
 *   GITHUB_TOKEN=<token> node scripts/push-to-github.mjs
 *
 * The GITHUB_TOKEN can be obtained from the Replit GitHub integration connection.
 * When run inside Replit code execution, the token is available via listConnections("github").
 *
 * Prerequisites:
 *   - GitHub integration connected in this Repl
 *   - GITHUB_TOKEN environment variable set with a valid OAuth token
 */

import { execSync } from "child_process";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { Octokit } from "@octokit/rest";

const OWNER = "KengQui";
const REPO = "videoanalyzeconversationlighthouse";

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "inherit", ...opts });
}

/**
 * Verifies the GitHub connection via the Replit connectors proxy.
 * Returns the authenticated user's login.
 */
async function verifyGitHubAuth(connectors) {
  const response = await connectors.proxy("github", "/user", { method: "GET" });
  const user = await response.json();
  if (!user.login) {
    throw new Error("GitHub authentication failed. Ensure the GitHub integration is connected.");
  }
  return user.login;
}

/**
 * Creates the GitHub repository if it does not already exist.
 * Uses @octokit/rest with requests proxied through the Replit connectors SDK.
 */
async function ensureRepository(connectors) {
  const octokit = new Octokit({
    request: {
      fetch: (url, opts) =>
        connectors.proxy("github", url.replace("https://api.github.com", ""), {
          method: opts?.method ?? "GET",
          body: opts?.body,
          headers: opts?.headers,
        }),
    },
  });

  try {
    const { data } = await octokit.repos.get({ owner: OWNER, repo: REPO });
    console.log(`Repository: ${data.html_url}`);
    return data.html_url;
  } catch (err) {
    if (err.status === 404) {
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name: REPO,
        description: "Video analyze conversation lighthouse",
        private: false,
        auto_init: false,
      });
      console.log(`Repository created: ${data.html_url}`);
      return data.html_url;
    }
    throw err;
  }
}

/**
 * Pushes all committed project files to GitHub using git.
 * Configures git identity, stages all files, commits, and force-pushes to main.
 * Always sanitizes the remote URL (removes token) in a finally block.
 */
function pushViaGit(token) {
  const encodedToken = encodeURIComponent(token);
  const remoteUrl = `https://${OWNER}:${encodedToken}@github.com/${OWNER}/${REPO}.git`;
  const cleanUrl = `https://github.com/${OWNER}/${REPO}.git`;

  run('git config user.name "KengQui"');
  run('git config user.email "kengqui@users.noreply.github.com"');

  // Stage everything and commit
  run("git add .");
  run('git commit -m "Sync project files" --allow-empty');

  // Set the remote
  try {
    run(`git remote add github "${remoteUrl}"`, { stdio: "pipe" });
  } catch {
    run(`git remote set-url github "${remoteUrl}"`, { stdio: "pipe" });
  }

  try {
    run("git push --force github main");
  } finally {
    // Always remove the token from the remote URL, even if push fails
    run(`git remote set-url github "${cleanUrl}"`, { stdio: "pipe" });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error(
    "Error: GITHUB_TOKEN environment variable is required.\n" +
    "Obtain the token from the Replit GitHub integration (listConnections in code execution).\n" +
    `Usage: GITHUB_TOKEN=<token> node scripts/push-to-github.mjs`
  );
  process.exit(1);
}

const connectors = new ReplitConnectors();

// Step 1: Verify authentication
const login = await verifyGitHubAuth(connectors);
console.log(`Authenticated as: ${login}`);

if (login !== OWNER) {
  throw new Error(
    `Authenticated as "${login}" but expected "${OWNER}". ` +
    "Connect the correct GitHub account via the Replit GitHub integration."
  );
}

// Step 2: Ensure repository exists
await ensureRepository(connectors);

// Step 3: Push via git
console.log("Pushing project files via git...");
pushViaGit(token);

console.log(`\nSuccess! Repository: https://github.com/${OWNER}/${REPO}`);
