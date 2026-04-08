import "dotenv/config";
import express from "express";
import tokenRouter from "./routes/token.js";

const app = express();
app.use(express.json());

// ── Health check ────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ── Token minting route ─────────────────────────────────
app.use(tokenRouter);

// ── Start ───────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4041;
app.listen(PORT, () => {
  console.log(`\n🔐 Token Broker listening on http://localhost:${PORT}`);
  console.log(`   POST /token  — mint a GitHub App installation token`);
  console.log(`   GET  /health — health check\n`);
});
