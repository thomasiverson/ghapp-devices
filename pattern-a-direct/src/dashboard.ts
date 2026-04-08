import "dotenv/config";
import express from "express";
import { mintInstallationToken } from "./mint-token.js";
import {
  readRepoContents,
  downloadReleaseAsset,
  createIssue,
  pushCommit,
} from "@gh-app-devices/shared";

const APP_ID = process.env.GITHUB_APP_ID!;
const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID!;
const PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH!;
const OWNER = process.env.GITHUB_OWNER!;
const REPO = process.env.GITHUB_REPO!;

const app = express();
app.use(express.json());

// ── State ───────────────────────────────────────────────
let currentToken: string | null = null;
let tokenExpiresAt: string | null = null;

// ── API Routes ──────────────────────────────────────────

app.post("/api/mint-token", async (_req, res) => {
  try {
    const result = await mintInstallationToken(APP_ID, INSTALLATION_ID, PRIVATE_KEY_PATH);
    currentToken = result.token;
    tokenExpiresAt = result.expires_at;
    res.json({
      success: true,
      masked_token: result.token.slice(0, 8) + "..." + result.token.slice(-4),
      expires_at: result.expires_at,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/read-contents", async (_req, res) => {
  if (!currentToken) return res.status(400).json({ success: false, error: "No token — mint one first" });
  try {
    const file = await readRepoContents(currentToken, OWNER, REPO, "README.md");
    res.json({ success: true, path: file.path, chars: file.content.length, sha: file.sha, preview: file.content.slice(0, 200) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/download-release", async (_req, res) => {
  if (!currentToken) return res.status(400).json({ success: false, error: "No token — mint one first" });
  try {
    const asset = await downloadReleaseAsset(currentToken, OWNER, REPO, "v1.0.0", "example-asset.zip");
    res.json({ success: true, name: asset.name, size: asset.size });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/create-issue", async (_req, res) => {
  if (!currentToken) return res.status(400).json({ success: false, error: "No token — mint one first" });
  try {
    const issue = await createIssue(
      currentToken, OWNER, REPO,
      `[Device POC] Demo issue — ${new Date().toISOString()}`,
      "This issue was created from the Pattern A dashboard demo."
    );
    res.json({ success: true, number: issue.number, url: issue.html_url });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/push-commit", async (_req, res) => {
  if (!currentToken) return res.status(400).json({ success: false, error: "No token — mint one first" });
  try {
    const result = await pushCommit(
      currentToken, OWNER, REPO,
      `device-logs/diagnostic-${Date.now()}.txt`,
      `Device diagnostic report\nTimestamp: ${new Date().toISOString()}\nSource: Pattern A Dashboard\n`,
      "chore: device diagnostic upload (Pattern A dashboard)"
    );
    res.json({ success: true, path: result.path, sha: result.sha, url: result.html_url });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/discard-token", (_req, res) => {
  currentToken = null;
  tokenExpiresAt = null;
  res.json({ success: true });
});

app.get("/api/status", (_req, res) => {
  res.json({
    hasToken: !!currentToken,
    tokenExpiresAt,
    owner: OWNER,
    repo: REPO,
    appId: APP_ID,
  });
});

// ── Dashboard HTML ──────────────────────────────────────

app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(DASHBOARD_HTML);
});

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pattern A — Direct Token Minting Demo</title>
<style>
  :root {
    --bg: #0d1117; --surface: #161b22; --border: #30363d;
    --text: #e6edf3; --muted: #7d8590; --accent: #58a6ff;
    --green: #3fb950; --red: #f85149; --yellow: #d29922;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: var(--bg); color: var(--text); padding: 2rem; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin-bottom: .25rem; }
  .subtitle { color: var(--muted); margin-bottom: 1.5rem; font-size: .9rem; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
  .card h2 { font-size: 1rem; margin-bottom: .75rem; display: flex; align-items: center; gap: .5rem; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: .75rem; font-weight: 600; }
  .badge-green { background: rgba(63,185,80,.15); color: var(--green); }
  .badge-red { background: rgba(248,81,73,.15); color: var(--red); }
  .badge-yellow { background: rgba(210,153,34,.15); color: var(--yellow); }
  .badge-blue { background: rgba(88,166,255,.15); color: var(--accent); }
  button { background: var(--accent); color: #fff; border: none; padding: .5rem 1rem; border-radius: 6px;
    font-size: .85rem; cursor: pointer; font-weight: 600; transition: opacity .15s; }
  button:hover { opacity: .85; }
  button:disabled { opacity: .4; cursor: not-allowed; }
  button.danger { background: var(--red); }
  button.secondary { background: var(--border); color: var(--text); }
  .btn-row { display: flex; gap: .5rem; flex-wrap: wrap; }
  .result { margin-top: .75rem; padding: .75rem; background: var(--bg); border-radius: 6px;
    font-family: 'SF Mono', SFMono-Regular, Consolas, monospace; font-size: .8rem;
    white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; display: none; }
  .result.visible { display: block; }
  .result.error { border-left: 3px solid var(--red); }
  .result.success { border-left: 3px solid var(--green); }
  .flow { display: flex; align-items: center; gap: .5rem; margin: 1rem 0; flex-wrap: wrap; }
  .flow-step { background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
    padding: .4rem .75rem; font-size: .8rem; }
  .flow-step.active { border-color: var(--accent); color: var(--accent); }
  .flow-arrow { color: var(--muted); }
  .token-info { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-top: .5rem; }
  .token-info code { background: var(--bg); padding: 4px 8px; border-radius: 4px; font-size: .8rem; }
  .meta { color: var(--muted); font-size: .8rem; margin-top: .5rem; }
  .ops-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
  @media (max-width: 600px) { .ops-grid { grid-template-columns: 1fr; } }
  .op-card { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 1rem; }
  .op-card h3 { font-size: .85rem; margin-bottom: .5rem; }
  .op-card .desc { color: var(--muted); font-size: .75rem; margin-bottom: .75rem; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border);
    border-top-color: var(--accent); border-radius: 50%; animation: spin .6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .log { margin-top: 1.5rem; }
  .log h2 { font-size: 1rem; margin-bottom: .5rem; }
  #event-log { background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    padding: 1rem; font-family: monospace; font-size: .75rem; max-height: 250px; overflow-y: auto; }
  .log-entry { padding: 2px 0; border-bottom: 1px solid var(--border); }
  .log-entry:last-child { border-bottom: none; }
  .log-time { color: var(--muted); }
  .log-ok { color: var(--green); }
  .log-err { color: var(--red); }
</style>
</head>
<body>

<h1>🔐 Pattern A — Direct On-Device Token Minting</h1>
<p class="subtitle">Device holds the GitHub App private key and mints short-lived installation tokens directly.</p>

<div class="flow" id="flow">
  <div class="flow-step" id="step-device">📱 Device</div>
  <div class="flow-arrow">→</div>
  <div class="flow-step" id="step-jwt">Sign JWT</div>
  <div class="flow-arrow">→</div>
  <div class="flow-step" id="step-github">GitHub API</div>
  <div class="flow-arrow">→</div>
  <div class="flow-step" id="step-token">Installation Token</div>
  <div class="flow-arrow">→</div>
  <div class="flow-step" id="step-ops">Repo Operations</div>
</div>

<div class="card">
  <h2>🔑 Token Management</h2>
  <div class="btn-row">
    <button id="btn-mint" onclick="mintToken()">Mint Installation Token</button>
    <button id="btn-discard" class="danger" onclick="discardToken()" disabled>Discard Token</button>
  </div>
  <div class="token-info" id="token-info" style="display:none">
    <span class="badge badge-green" id="token-badge">Active</span>
    <code id="token-display"></code>
    <span class="meta">Expires: <span id="token-expires"></span></span>
  </div>
  <div class="result" id="mint-result"></div>
</div>

<div class="card">
  <h2>⚡ GitHub Operations</h2>
  <div class="ops-grid">
    <div class="op-card">
      <h3>📄 Read Repo Contents</h3>
      <p class="desc">Download README.md via Contents API</p>
      <button class="secondary op-btn" onclick="runOp('read-contents', this)" disabled>Run</button>
      <div class="result" id="result-read-contents"></div>
    </div>
    <div class="op-card">
      <h3>📦 Download Release</h3>
      <p class="desc">Fetch release asset via Releases API</p>
      <button class="secondary op-btn" onclick="runOp('download-release', this)" disabled>Run</button>
      <div class="result" id="result-download-release"></div>
    </div>
    <div class="op-card">
      <h3>🐛 Create Issue</h3>
      <p class="desc">Open a test issue via Issues API</p>
      <button class="secondary op-btn" onclick="runOp('create-issue', this)" disabled>Run</button>
      <div class="result" id="result-create-issue"></div>
    </div>
    <div class="op-card">
      <h3>📤 Push Commit</h3>
      <p class="desc">Upload diagnostic file via Contents API</p>
      <button class="secondary op-btn" onclick="runOp('push-commit', this)" disabled>Run</button>
      <div class="result" id="result-push-commit"></div>
    </div>
  </div>
</div>

<div class="card log">
  <h2>📋 Event Log</h2>
  <div id="event-log"><div class="log-entry"><span class="log-time">[ready]</span> Dashboard loaded. Target: <span id="log-target"></span></div></div>
</div>

<script>
const opBtns = document.querySelectorAll('.op-btn');

function log(msg, type = '') {
  const el = document.getElementById('event-log');
  const t = new Date().toLocaleTimeString();
  const cls = type === 'ok' ? 'log-ok' : type === 'err' ? 'log-err' : '';
  el.innerHTML += '<div class="log-entry"><span class="log-time">[' + t + ']</span> <span class="' + cls + '">' + msg + '</span></div>';
  el.scrollTop = el.scrollHeight;
}

function setFlowActive(...ids) {
  document.querySelectorAll('.flow-step').forEach(s => s.classList.remove('active'));
  ids.forEach(id => document.getElementById(id)?.classList.add('active'));
}

function showResult(id, data, ok) {
  const el = document.getElementById(id);
  el.textContent = JSON.stringify(data, null, 2);
  el.className = 'result visible ' + (ok ? 'success' : 'error');
}

async function mintToken() {
  const btn = document.getElementById('btn-mint');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Minting...';
  setFlowActive('step-device', 'step-jwt');
  log('Signing JWT with private key...');

  try {
    setFlowActive('step-jwt', 'step-github');
    const res = await fetch('/api/mint-token', { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    setFlowActive('step-token');
    document.getElementById('token-display').textContent = data.masked_token;
    document.getElementById('token-expires').textContent = new Date(data.expires_at).toLocaleString();
    document.getElementById('token-info').style.display = 'flex';
    document.getElementById('token-badge').textContent = 'Active';
    document.getElementById('token-badge').className = 'badge badge-green';
    document.getElementById('btn-discard').disabled = false;
    opBtns.forEach(b => b.disabled = false);
    log('Token minted: ' + data.masked_token + ' (expires ' + data.expires_at + ')', 'ok');
    showResult('mint-result', data, true);
  } catch (err) {
    log('Mint failed: ' + err.message, 'err');
    showResult('mint-result', { error: err.message }, false);
  }
  btn.disabled = false;
  btn.textContent = 'Mint Installation Token';
}

async function discardToken() {
  await fetch('/api/discard-token', { method: 'POST' });
  document.getElementById('token-info').style.display = 'none';
  document.getElementById('btn-discard').disabled = true;
  opBtns.forEach(b => b.disabled = true);
  setFlowActive('step-device');
  log('Token discarded', 'ok');
}

async function runOp(op, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  setFlowActive('step-token', 'step-ops');
  log('Running: ' + op + '...');

  try {
    const res = await fetch('/api/' + op, { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    showResult('result-' + op, data, true);

    let summary = op;
    if (data.url) summary += ' → ' + data.url;
    else if (data.path) summary += ' → ' + data.path;
    else if (data.sha) summary += ' (sha: ' + data.sha.slice(0,7) + ')';
    log(summary, 'ok');
  } catch (err) {
    showResult('result-' + op, { error: err.message }, false);
    log(op + ' failed: ' + err.message, 'err');
  }
  btn.disabled = false;
  btn.textContent = 'Run';
  setFlowActive('step-token', 'step-ops');
}

// Init
fetch('/api/status').then(r => r.json()).then(d => {
  document.getElementById('log-target').textContent = d.owner + '/' + d.repo;
  if (d.hasToken) {
    document.getElementById('token-info').style.display = 'flex';
    document.getElementById('token-expires').textContent = new Date(d.tokenExpiresAt).toLocaleString();
    document.getElementById('btn-discard').disabled = false;
    opBtns.forEach(b => b.disabled = false);
    setFlowActive('step-token');
  } else {
    setFlowActive('step-device');
  }
});
</script>
</body>
</html>`;

const PORT = Number(process.env.PORT) || 3030;
app.listen(PORT, () => {
  console.log(`\n🔐 Pattern A Dashboard: http://localhost:${PORT}\n`);
  console.log(`   Target: ${OWNER}/${REPO}`);
  console.log(`   App ID: ${APP_ID}\n`);
});
