# Pattern B Walkthrough — Token Broker + Device Client

In this pattern, a trusted backend broker holds the GitHub App's private key. Devices authenticate to the broker and receive short-lived tokens. No GitHub secrets are stored on devices.

## Architecture

```
[ Device (CLI) ]
   |
   |  1. Authenticate (API key or Entra ID cert)
   v
[ Token Broker (Express) ]
   |
   |  2. Validate device identity
   |  3. Mint GitHub installation token
   v
[ GitHub API ]
   |
   |  4. Device uses token for repo operations
   v
[ Target Repository ]
```

## Prerequisites

- GitHub App created and installed (see [setup-github-app.md](./setup-github-app.md))
- Private key `.pem` file available for the **broker only**
- Node.js 18+ installed
- (Optional) Entra ID app registrations for certificate-based auth

## Setup

### 1. Configure the Broker

```bash
cd pattern-b-broker/broker
cp .env.example .env
```

Edit `.env` — replace every placeholder with your real values:

```env
GITHUB_APP_ID=123456                          # ← your GitHub App ID
GITHUB_INSTALLATION_ID=78901234               # ← your Installation ID
GITHUB_PRIVATE_KEY_PATH=./private-key.pem
PORT=4041

# Generate your own API keys (e.g. openssl rand -hex 32)
BROKER_API_KEYS=your-device-api-key-1,your-device-api-key-2
```

Copy your `.pem` private key file into `pattern-b-broker/broker/`.

### 2. Configure the Device Client

```bash
cd ../device-client
cp .env.example .env
```

Edit `.env`:

```env
BROKER_URL=http://localhost:4041              # ← must match broker PORT
AUTH_METHOD=api-key
BROKER_API_KEY=your-device-api-key-1          # ← must match one key in BROKER_API_KEYS
GITHUB_OWNER=your-org                         # ← your org or user
GITHUB_REPO=your-test-repo                    # ← repo where the app is installed
PORT=4040
```

> **Important:** `BROKER_API_KEY` in the device client must exactly match one of the comma-separated keys in the broker's `BROKER_API_KEYS`. If they don't match, the broker will reject the request with `401 Unauthorized`.

## Build and Run

```bash
# From repo root — build all packages
npm run build
```

### Start the Broker

```bash
cd pattern-b-broker/broker
npm start
```

Expected output:
```
🔐 Token Broker listening on http://localhost:4041
   POST /token  — mint a GitHub App installation token
   GET  /health — health check
```

### Run the Device Client (in a separate terminal)

```bash
cd pattern-b-broker/device-client
npm start              # CLI mode
npm run demo           # or dashboard mode (http://localhost:4040)
```

## Expected Output

```
╔══════════════════════════════════════════════════╗
║  Pattern B — Device Client (Token Broker)       ║
╚══════════════════════════════════════════════════╝

⏳ Authenticating to broker (method: api-key)...
⏳ Requesting GitHub token from http://localhost:4041/token...
✅ Token obtained (expires: 2026-04-07T12:00:00Z)

📄 Reading README.md from repo...
   ✅ Read README.md (1234 chars, sha: abc123)

📦 Downloading latest release asset...
   ⚠️  Skipped: (if no release exists yet)

🐛 Creating a test issue...
   ✅ Created issue #43: https://github.com/org/repo/issues/43

📤 Pushing a diagnostic file...
   ✅ Committed device-logs/diagnostic-1712345678.txt (sha: def456)

🏁 Pattern B demo complete. Token discarded (not stored).
```

## Using Entra ID Authentication

To test with Entra ID instead of API keys:

1. Set up the Entra ID app registrations (see [setup-github-app.md](./setup-github-app.md#entra-id-setup-optional--for-pattern-b-entra-id-auth))

2. Update the device client `.env`:
   ```env
   AUTH_METHOD=entra-id
   AZURE_TENANT_ID=your-tenant-id
   AZURE_CLIENT_ID=your-device-app-client-id
   AZURE_CLIENT_CERTIFICATE_PATH=./device-cert.pem
   ENTRA_BROKER_AUDIENCE=your-broker-app-client-id
   ```

3. Run the device client as before — it will acquire an Entra ID token using the certificate, then exchange it at the broker for a GitHub token.

## Testing Auth Failures

```bash
# Invalid API key — should get 401
curl -X POST http://localhost:4041/token \
  -H "Authorization: Bearer invalid-key" \
  -H "X-Auth-Method: api-key"

# Missing auth — should get 401
curl -X POST http://localhost:4041/token
```

## Security Advantages Over Pattern A

- **No GitHub secrets on devices** — the private key stays on the broker
- **Immediate revocation** — remove a device's API key or Entra ID app registration to cut access
- **Audit trail** — the broker logs every token mint with device identity
- **Centralized control** — one place to manage all device access
