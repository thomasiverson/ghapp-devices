# GitHub App Field Device POC

Proof-of-concept demonstrating secure GitHub access for field devices using **GitHub Apps with short-lived tokens** instead of long-lived PATs.

This repo implements two architecture patterns from the [Recommended Strategy for Field Devices Needing GitHub Access](./Recommended-Strategy-Field-Devices-GitHub-Access.md).

## Architecture Patterns

### Pattern A — Direct On-Device Token Minting

```
[ Field Device ]  →  sign JWT with private key  →  [ GitHub API ]
```

The device holds the GitHub App private key and mints installation tokens directly. Simpler, but the private key is at risk if the device is compromised.

### Pattern B — Token Broker (Recommended)

```
[ Field Device ]  →  authenticate  →  [ Token Broker ]  →  mint token  →  [ GitHub API ]
```

A trusted backend broker holds the private key. Devices authenticate to the broker (via API key or Entra ID certificate) and receive short-lived GitHub tokens. No GitHub secrets on devices.

## Comparison

| | Pattern A (Direct) | Pattern B (Broker) |
|---|---|---|
| **GitHub secrets on device** | Yes (private key) | No |
| **Revocation** | Regenerate app key | Remove device API key or Entra ID registration |
| **Backend dependency** | None | Token broker service |
| **Best for** | Hardware-secured devices (TPM/HSM) | General field deployments |
| **Audit trail** | GitHub audit log only | Broker logs + GitHub audit log |

## Demo Operations

Both patterns demonstrate four GitHub operations:

1. **Read repo contents** — download a configuration file
2. **Download release asset** — fetch a release artifact
3. **Create an issue** — report from the field
4. **Push a commit** — upload diagnostic data

## Project Structure

```
├── shared/                        # Shared GitHub operations library
├── pattern-a-direct/              # Pattern A: on-device token minting
├── pattern-b-broker/
│   ├── broker/                    # Express token broker
│   └── device-client/             # CLI that talks to the broker
└── docs/                          # Setup and walkthrough guides
```

## Quick Start

### Prerequisites

- Node.js 18+
- A GitHub App installed on a test repository ([setup guide](./docs/setup-github-app.md))

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Configure Environment

Before running anything you need to create `.env` files from the provided templates. Every placeholder value (`123456`, `your-org`, etc.) **must** be replaced with your own credentials.

**1. Pattern A** — direct on-device minting:

```bash
cd pattern-a-direct
cp .env.example .env
```

Edit `pattern-a-direct/.env` and fill in:

| Variable | Where to find it |
|---|---|
| `GITHUB_APP_ID` | GitHub App settings page (numeric ID near top) |
| `GITHUB_INSTALLATION_ID` | URL after clicking **Configure** on the installed app |
| `GITHUB_PRIVATE_KEY_PATH` | Path to the `.pem` file downloaded from the app |
| `GITHUB_OWNER` | The org or user that owns the target repo |
| `GITHUB_REPO` | The repo where the app is installed |

Then copy the `.pem` private key file into `pattern-a-direct/`.

**2. Pattern B** — broker + device client (two `.env` files):

```bash
# Broker
cd pattern-b-broker/broker
cp .env.example .env

# Device client
cd ../device-client
cp .env.example .env
```

Edit `pattern-b-broker/broker/.env`:

| Variable | Value |
|---|---|
| `GITHUB_APP_ID` | Same App ID as Pattern A |
| `GITHUB_INSTALLATION_ID` | Same Installation ID as Pattern A |
| `GITHUB_PRIVATE_KEY_PATH` | Path to the `.pem` file (copy it into `broker/`) |
| `BROKER_API_KEYS` | One or more API keys you generate (e.g. `openssl rand -hex 32`) |

Edit `pattern-b-broker/device-client/.env`:

| Variable | Value |
|---|---|
| `BROKER_URL` | `http://localhost:4041` (must match broker's `PORT`) |
| `BROKER_API_KEY` | One of the keys from `BROKER_API_KEYS` above — **must match** |
| `GITHUB_OWNER` | Same org/user as Pattern A |
| `GITHUB_REPO` | Same repo as Pattern A |

> **Important:** The `BROKER_API_KEY` in the device client must exactly match one of the comma-separated keys in the broker's `BROKER_API_KEYS`. If they don't match, the broker will return `401 Unauthorized`.

See the [full setup guide](./docs/setup-github-app.md) for step-by-step instructions on creating the GitHub App and finding these values.

### Run All Dashboards (recommended)

Start both Pattern A and Pattern B dashboards plus the broker in one command:

```bash
npm run demo
```

| Label | Service | Port |
|---|---|---|
| `A-dash` | Pattern A Dashboard | 3030 |
| `B-broker` | Pattern B Token Broker | 4041 |
| `B-dash` | Pattern B Device Dashboard | 4040 |

Press `Ctrl+C` to stop all three.

### Run Pattern A Only (CLI)

```bash
cd pattern-a-direct
cp .env.example .env   # fill in your GitHub App credentials
npm start              # CLI mode
npm run demo           # dashboard mode (port 3030)
```

→ [Full Pattern A walkthrough](./docs/pattern-a-walkthrough.md)

### Run Pattern B Only (CLI)

Terminal 1 — start the broker:
```bash
cd pattern-b-broker/broker
cp .env.example .env   # fill in your GitHub App credentials + API keys
npm start              # starts broker on port 4041
```

Terminal 2 — run the device client:
```bash
cd pattern-b-broker/device-client
cp .env.example .env   # fill in broker URL + API key + target repo
npm start              # CLI mode
npm run demo           # dashboard mode (port 4040)
```

→ [Full Pattern B walkthrough](./docs/pattern-b-walkthrough.md)

## Documentation

- [Setting Up the GitHub App](./docs/setup-github-app.md) — create and install the GitHub App
- [Pattern A Walkthrough](./docs/pattern-a-walkthrough.md) — direct token minting
- [Pattern B Walkthrough](./docs/pattern-b-walkthrough.md) — broker + device client
- [Strategy Document](./Recommended-Strategy-Field-Devices-GitHub-Access.md) — full rationale
