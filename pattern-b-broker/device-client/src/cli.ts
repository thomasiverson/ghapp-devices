import "dotenv/config";
import { ClientCertificateCredential } from "@azure/identity";
import {
  readRepoContents,
  downloadReleaseAsset,
  createIssue,
  pushCommit,
  type TokenResponse,
} from "@gh-app-devices/shared";

// ── Configuration from environment ──────────────────────
const BROKER_URL = process.env.BROKER_URL ?? "http://localhost:4041";
const AUTH_METHOD = process.env.AUTH_METHOD ?? "api-key";
const BROKER_API_KEY = process.env.BROKER_API_KEY;
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

/**
 * Get an authorization header for the broker based on the configured auth method.
 */
async function getBrokerAuthHeader(): Promise<{ authorization: string; "x-auth-method": string }> {
  if (AUTH_METHOD === "entra-id") {
    const tenantId = process.env.AZURE_TENANT_ID!;
    const clientId = process.env.AZURE_CLIENT_ID!;
    const certPath = process.env.AZURE_CLIENT_CERTIFICATE_PATH!;
    const audience = process.env.ENTRA_BROKER_AUDIENCE!;

    requireEnv("AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_CERTIFICATE_PATH", "ENTRA_BROKER_AUDIENCE");

    const credential = new ClientCertificateCredential(tenantId, clientId, certPath);
    const tokenResponse = await credential.getToken(`${audience}/.default`);

    return {
      authorization: `Bearer ${tokenResponse.token}`,
      "x-auth-method": "entra-id",
    };
  }

  // Default: API key
  if (!BROKER_API_KEY) {
    console.error("BROKER_API_KEY is required when AUTH_METHOD=api-key");
    process.exit(1);
  }

  return {
    authorization: `Bearer ${BROKER_API_KEY}`,
    "x-auth-method": "api-key",
  };
}

/**
 * Request a short-lived GitHub token from the broker.
 */
async function requestToken(authHeaders: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${BROKER_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Broker returned ${res.status}: ${body}`);
  }

  return res.json() as Promise<TokenResponse>;
}

async function main() {
  requireEnv("BROKER_URL", "GITHUB_OWNER", "GITHUB_REPO");

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Pattern B — Device Client (Token Broker)       ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Step 1: Authenticate to broker and get GitHub token ─
  console.log(`⏳ Authenticating to broker (method: ${AUTH_METHOD})...`);
  const authHeaders = await getBrokerAuthHeader();

  console.log(`⏳ Requesting GitHub token from ${BROKER_URL}/token...`);
  const { token, expires_at } = await requestToken(authHeaders);
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
      "This issue was created by the Pattern B device client POC to verify write access via the token broker."
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
      `Device diagnostic report\nTimestamp: ${new Date().toISOString()}\nPattern: B (broker-mediated)\nAuth: ${AUTH_METHOD}\n`,
      `chore: device diagnostic upload (Pattern B POC)`
    );
    console.log(`   ✅ Committed ${result.path} (sha: ${result.sha})\n`);
  } catch (err: any) {
    console.log(`   ⚠️  Skipped: ${err.message}\n`);
  }

  // ── Done ──────────────────────────────────────────────
  console.log("🏁 Pattern B demo complete. Token discarded (not stored).");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
