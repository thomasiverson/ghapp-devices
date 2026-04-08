import { Router, type Request, type Response, type NextFunction } from "express";
import { apiKeyAuth } from "../auth/api-key.js";
import { entraIdAuth } from "../auth/entra-id.js";
import { mintInstallationToken } from "../github-app.js";

const router = Router();

/**
 * Choose auth middleware based on a custom header.
 * X-Auth-Method: api-key  → API key validation
 * X-Auth-Method: entra-id → Entra ID JWT validation
 * Default: api-key
 */
function selectAuth(req: Request, res: Response, next: NextFunction) {
  const method = (req.headers["x-auth-method"] as string)?.toLowerCase() ?? "api-key";

  if (method === "entra-id") {
    return entraIdAuth(req, res, next);
  }
  return apiKeyAuth(req, res, next);
}

/**
 * POST /token
 *
 * Authenticates the device, then mints and returns a short-lived
 * GitHub App installation token.
 *
 * Response: { token: string, expires_at: string }
 */
router.post("/token", selectAuth, async (req: Request, res: Response) => {
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_INSTALLATION_ID;
  const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH;

  if (!appId || !installationId || !privateKeyPath) {
    res.status(500).json({ error: "GitHub App not configured on broker" });
    return;
  }

  const identity = (req as any).deviceIdentity ?? { method: "unknown" };

  console.log(
    `[token] Minting token for device (auth: ${identity.method}, id: ${JSON.stringify(identity)})`
  );

  try {
    const tokenResponse = await mintInstallationToken(appId, installationId, privateKeyPath);

    console.log(
      `[token] Token minted successfully (expires: ${tokenResponse.expires_at})`
    );

    res.json(tokenResponse);
  } catch (err: any) {
    console.error(`[token] Failed to mint token: ${err.message}`);
    res.status(500).json({ error: "Failed to mint GitHub token" });
  }
});

export default router;
