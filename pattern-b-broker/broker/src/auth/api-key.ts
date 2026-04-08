import type { Request, Response, NextFunction } from "express";

/**
 * Middleware: validate device identity via a pre-shared API key.
 *
 * Expects: Authorization: Bearer <api-key>
 * The list of valid keys is read from the BROKER_API_KEYS env var.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const key = authHeader.slice(7);
  const validKeys = (process.env.BROKER_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (!validKeys.includes(key)) {
    console.warn(`[auth:api-key] Rejected unknown key: ${key.slice(0, 8)}...`);
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  // Attach device identity to request for audit logging
  (req as any).deviceIdentity = { method: "api-key", key: key.slice(0, 8) + "..." };
  next();
}
