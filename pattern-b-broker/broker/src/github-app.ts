import * as fs from "node:fs";
import jwt from "jsonwebtoken";
import { Octokit } from "@octokit/rest";
import type { TokenResponse } from "@gh-app-devices/shared";

function createAppJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iat: now - 60,
      exp: now + 600,
      iss: appId,
    },
    privateKey,
    { algorithm: "RS256" }
  );
}

/**
 * Mint a short-lived GitHub App installation token.
 * Called by the broker when a device requests a token.
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
