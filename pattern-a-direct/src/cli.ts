import "dotenv/config";
import { mintInstallationToken } from "./mint-token.js";
import {
  readRepoContents,
  downloadReleaseAsset,
  createIssue,
  pushCommit,
} from "@gh-app-devices/shared";

// ── Configuration from environment ──────────────────────
const APP_ID = process.env.GITHUB_APP_ID!;
const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID!;
const PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH!;
const OWNER = process.env.GITHUB_OWNER!;
const REPO = process.env.GITHUB_REPO!;

function requireEnv(...names: string[]) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    console.error("Copy .env.example to .env and fill in the values.");
    process.exit(1);
  }
}

async function main() {
  requireEnv(
    "GITHUB_APP_ID",
    "GITHUB_INSTALLATION_ID",
    "GITHUB_PRIVATE_KEY_PATH",
    "GITHUB_OWNER",
    "GITHUB_REPO"
  );

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Pattern A — Direct On-Device Token Minting     ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Step 1: Mint an installation token ────────────────
  console.log("⏳ Minting installation access token...");
  const { token, expires_at } = await mintInstallationToken(
    APP_ID,
    INSTALLATION_ID,
    PRIVATE_KEY_PATH
  );
  console.log(`✅ Token obtained (expires: ${expires_at})\n`);

  // ── Step 2: Read repo contents ────────────────────────
  console.log("📄 Reading README.md from repo...");
  try {
    const file = await readRepoContents(token, OWNER, REPO, "README.md");
    console.log(`   ✅ Read ${file.path} (${file.content.length} chars, sha: ${file.sha})\n`);
  } catch (err: any) {
    console.log(`   ⚠️  Skipped: ${err.message}\n`);
  }

  // ── Step 3: Download a release asset ──────────────────
  console.log("📦 Downloading latest release asset...");
  try {
    // Placeholder: replace tag and asset name with real values from your test repo
    const asset = await downloadReleaseAsset(
      token,
      OWNER,
      REPO,
      "v1.0.0",
      "example-asset.zip"
    );
    console.log(`   ✅ Downloaded ${asset.name} (${asset.size} bytes)\n`);
  } catch (err: any) {
    console.log(`   ⚠️  Skipped: ${err.message}\n`);
  }

  // ── Step 4: Create an issue ───────────────────────────
  console.log("🐛 Creating a test issue...");
  try {
    const issue = await createIssue(
      token,
      OWNER,
      REPO,
      `[Device POC] Test issue — ${new Date().toISOString()}`,
      "This issue was created by the Pattern A device POC to verify write access."
    );
    console.log(`   ✅ Created issue #${issue.number}: ${issue.html_url}\n`);
  } catch (err: any) {
    console.log(`   ⚠️  Skipped: ${err.message}\n`);
  }

  // ── Step 5: Push a commit ─────────────────────────────
  console.log("📤 Pushing a diagnostic file...");
  try {
    const result = await pushCommit(
      token,
      OWNER,
      REPO,
      `device-logs/diagnostic-${Date.now()}.txt`,
      `Device diagnostic report\nTimestamp: ${new Date().toISOString()}\nPattern: A (direct minting)\n`,
      `chore: device diagnostic upload (Pattern A POC)`
    );
    console.log(`   ✅ Committed ${result.path} (sha: ${result.sha})\n`);
  } catch (err: any) {
    console.log(`   ⚠️  Skipped: ${err.message}\n`);
  }

  // ── Done ──────────────────────────────────────────────
  console.log("🏁 Pattern A demo complete. Token discarded (not stored).");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
