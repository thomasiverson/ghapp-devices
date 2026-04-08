import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

let client: jwksClient.JwksClient | null = null;

function getJwksClient(tenantId: string): jwksClient.JwksClient {
  if (!client) {
    client = jwksClient({
      jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      cache: true,
      rateLimit: true,
    });
  }
  return client;
}

function getSigningKey(tenantId: string, kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    getJwksClient(tenantId).getSigningKey(kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error("No signing key found"));
      resolve(key.getPublicKey());
    });
  });
}

/**
 * Middleware: validate a JWT bearer token issued by Entra ID.
 *
 * Expects: Authorization: Bearer <entra-id-jwt>
 * Validates issuer, audience, and expiry against the ENTRA_* env vars.
 */
export function entraIdAuth(req: Request, res: Response, next: NextFunction) {
  const tenantId = process.env.ENTRA_TENANT_ID;
  const clientId = process.env.ENTRA_CLIENT_ID;

  if (!tenantId || !clientId) {
    res.status(500).json({ error: "Entra ID not configured on broker" });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  // Decode header to get the kid for JWKS lookup
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string") {
    res.status(401).json({ error: "Invalid JWT" });
    return;
  }

  const kid = decoded.header.kid;
  if (!kid) {
    res.status(401).json({ error: "JWT missing kid header" });
    return;
  }

  getSigningKey(tenantId, kid)
    .then((publicKey) => {
      const payload = jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
        audience: clientId,
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      }) as jwt.JwtPayload;

      // Attach device/app identity from token claims for audit
      (req as any).deviceIdentity = {
        method: "entra-id",
        sub: payload.sub,
        appId: payload.azp ?? payload.appid,
        name: payload.name ?? payload.preferred_username,
      };

      next();
    })
    .catch((err) => {
      console.warn(`[auth:entra-id] Token validation failed: ${err.message}`);
      res.status(401).json({ error: "Invalid Entra ID token" });
    });
}
