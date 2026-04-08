import * as fs from "node:fs";
import jwt from "jsonwebtoken";
import { Octokit } from "@octokit/rest";
import type { TokenResponse } from "@gh-app-devices/shared";

/**
 * Create a JWT signed with the GitHub App's private key.
 * GitHub requires RS256, iat backdated 60s, and a max 10-min expiry.
 */
function createAppJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iat: now - 60, // issued-at: 60 seconds in the past to allow clock drift
      exp: now + 600, // expires: 10 minutes
      iss: appId,
    },
    privateKey,
    { algorithm: "RS256" }
  );
}

/**
 * Mint a short-lived installation access token for the GitHub App.
 *
 * Flow:
 * 1. Sign a JWT as the GitHub App
 * 2. Exchange the JWT for an installation token via POST /app/installations/:id/access_tokens
 *
 * The returned token is valid for approximately 1 hour.
 */
export async function mintInstallationToken(
  appId: string,
  installationId: string,
  privateKeyPath: string
): Promise<TokenResponse> {
  const privateKey = fs.readFileSync(privateKeyPath, "utf-8");
  const appJwt = createAppJwt(appId, privateKey);

  const octokit = new Octokit({ auth: appJwt });

  const { data } = await octokit.apps.createInstallationAccessToken({
    installation_id: Number(installationId),
  });

  return {
    token: data.token,
    expires_at: data.expires_at,
  };
}
