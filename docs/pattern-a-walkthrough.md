# Pattern A Walkthrough — Direct On-Device Token Minting

In this pattern, the device holds the GitHub App's private key and mints installation tokens directly.

## Architecture

```
[ Device (CLI) ]
   |
   |  1. Sign JWT with private key
   |  2. Exchange JWT for installation token
   v
[ GitHub API ]
   |
   |  3. Use token for repo operations
   v
[ Target Repository ]
```

## Prerequisites

- GitHub App created and installed (see [setup-github-app.md](./setup-github-app.md))
- Private key `.pem` file available locally
- Node.js 18+ installed

## Setup

```bash
# From the repository root
npm install

# Configure environment
cd pattern-a-direct
cp .env.example .env
```

Edit `.env` — replace every placeholder with your real values:

```env
GITHUB_APP_ID=123456                          # ← your GitHub App ID
GITHUB_INSTALLATION_ID=78901234               # ← your Installation ID
GITHUB_PRIVATE_KEY_PATH=./private-key.pem
GITHUB_OWNER=your-org                         # ← your org or user
GITHUB_REPO=your-test-repo                    # ← repo where the app is installed
PORT=3030
```

Copy your `.pem` private key file into `pattern-a-direct/`.

## Build and Run

```bash
# Build all packages
cd ..  # back to repo root
npm run build

# Run the CLI demo
cd pattern-a-direct
npm start

# Or run the web dashboard
npm run demo           # opens http://localhost:3030
```

## Expected Output

```
╔══════════════════════════════════════════════════╗
║  Pattern A — Direct On-Device Token Minting     ║
╚══════════════════════════════════════════════════╝

⏳ Minting installation access token...
✅ Token obtained (expires: 2026-04-07T12:00:00Z)

📄 Reading README.md from repo...
   ✅ Read README.md (1234 chars, sha: abc123)

📦 Downloading latest release asset...
   ⚠️  Skipped: (if no release exists yet)

🐛 Creating a test issue...
   ✅ Created issue #42: https://github.com/org/repo/issues/42

📤 Pushing a diagnostic file...
   ✅ Committed device-logs/diagnostic-1712345678.txt (sha: def456)

🏁 Pattern A demo complete. Token discarded (not stored).
```

## Security Considerations

- **The private key is the highest-risk artifact.** If the device is compromised, the attacker gains full access scoped to the app's permissions.
- This pattern is only appropriate when the device has hardware-backed key storage (e.g., TPM, HSM).
- For most field deployments, **Pattern B (token broker)** is preferred because the private key never leaves the backend.

## Customization

- Edit `src/cli.ts` to change which demo operations run
- Modify the release tag/asset name to match your test repo's releases
- Adjust the diagnostic file content to simulate real device data
