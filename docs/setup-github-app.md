# Setting Up the GitHub App

This guide walks through creating and installing a GitHub App for the field device POC.

## Prerequisites

- Admin access to the target GitHub organization
- A test repository to install the app on

## Step 1 — Create the GitHub App

1. Go to **Organization Settings → Developer settings → GitHub Apps → New GitHub App**
   - URL: `https://github.com/organizations/<ORG>/settings/apps/new`

2. Fill in the form:
   | Field | Value |
   |-------|-------|
   | **App name** | `field-device-poc` (or similar) |
   | **Homepage URL** | `https://github.com/<ORG>` |
   | **Webhook** | Uncheck "Active" (not needed for this POC) |

3. Set **Repository permissions**:
   | Permission | Access |
   |-----------|--------|
   | **Contents** | Read & write |
   | **Issues** | Read & write |
   | **Metadata** | Read (granted automatically) |

4. Under **Where can this GitHub App be installed?**, select **Only on this account**.

5. Click **Create GitHub App**.

## Step 2 — Note the App ID

After creation, you'll be on the app's settings page.

- Copy the **App ID** (a numeric value near the top of the page).
- You'll need this for `GITHUB_APP_ID` in your `.env` files.

## Step 3 — Generate a Private Key

1. On the app settings page, scroll to **Private keys**.
2. Click **Generate a private key**.
3. A `.pem` file will download automatically.
4. Store this file securely. For the POC:
   - **Pattern A:** Place it in `pattern-a-direct/private-key.pem`
   - **Pattern B broker:** Place it in `pattern-b-broker/broker/private-key.pem`

> **Warning:** Never commit `.pem` files. They are already in `.gitignore`.

## Step 4 — Install the App on a Repository

1. On the app settings page, click **Install App** in the left sidebar.
2. Select your organization.
3. Choose **Only select repositories** and pick your test repository.
4. Click **Install**.

## Step 5 — Note the Installation ID

After installing:

1. Go to **Organization Settings → GitHub Apps → Configure** (next to your app).
2. The URL will look like: `https://github.com/organizations/<ORG>/settings/installations/<INSTALLATION_ID>`
3. Copy the numeric `INSTALLATION_ID` from the URL.
4. You'll need this for `GITHUB_INSTALLATION_ID` in your `.env` files.

## Step 6 — Configure Environment Files

### Pattern A (direct minting)

```bash
cd pattern-a-direct
cp .env.example .env
# Edit .env with your App ID, Installation ID, private key path, and target repo
```

### Pattern B (broker)

```bash
cd pattern-b-broker/broker
cp .env.example .env
# Edit .env with your App ID, Installation ID, private key path, and API keys

cd ../device-client
cp .env.example .env
# Edit .env with broker URL and matching API key
```

## Verification

1. Go to **Organization Settings → Developer settings → GitHub Apps** and confirm your app (`field-device-poc`) appears in the list.
2. Click **Configure** next to the app. Under **Repository access**, confirm your test repository is listed.
3. On your local machine, verify the private key file exists and is not empty:

   ```bash
   # Pattern A
    pattern-a-direct/private-key.pem

   # Pattern B
    pattern-b-broker/broker/private-key.pem
   ```

## Entra ID Setup (Optional — for Pattern B Entra ID auth)

If you want to test Entra ID authentication:

1. **Register an App Registration** in Azure AD / Entra ID for the broker service
   - Note the **Application (client) ID** → `ENTRA_CLIENT_ID` on the broker
   - Note the **Directory (tenant) ID** → `ENTRA_TENANT_ID` on the broker

2. **Register a second App Registration** for the device identity
   - Generate a certificate for the device app
   - Note the **Application (client) ID** → `AZURE_CLIENT_ID` on the device client
   - Upload the certificate's public key to the app registration

3. **Grant the device app permission** to call the broker app
   - On the broker app registration, go to **Expose an API** and add a scope
   - On the device app registration, go to **API permissions** and add the broker's scope
