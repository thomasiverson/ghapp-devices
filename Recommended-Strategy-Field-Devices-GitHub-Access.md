# Recommended Strategy for Field Devices Needing GitHub Access

## Executive Summary
Field devices that need access to GitHub should **not rely on long‑lived Personal Access Tokens (PATs)** as a permanent solution. PATs are static, human‑owned credentials that are difficult to rotate and easy to misuse if compromised.  

**The recommended long‑term approach is GitHub Apps with short‑lived tokens**, ideally delivered through a central broker or gateway so that no GitHub secrets are stored persistently on devices in the field.

---

## 1. Classify What the Device Actually Needs to Do

Before selecting an authentication model, clearly identify the device use case:

- **Read‑only access**  
  Examples: downloading firmware, configuration files, or release artifacts.

- **Write access**  
  Examples: uploading diagnostics, logs, creating issues, or committing results.

- **CI‑like workflows**  
  Builds or tests triggered automatically (generally not recommended directly on devices).

- **One‑time provisioning**  
  Factory setup or initial bootstrap operations.

Most field devices only require **read‑only access**, which enables much simpler and safer authorization patterns.

---

## 2. Why PATs Are a Poor Long‑Term Fit for Field Devices

From a security perspective:

- PATs are **long‑lived static secrets**
- They are **portable** if copied from the device
- They are typically **owned by human users**
- They are **difficult to rotate** once devices are deployed

Field devices are often:

- Physically accessible
- Rarely updated
- Hard to audit continuously

This combination creates unacceptable risk for long‑term GitHub access using PATs.

---

## 3. Target Architecture: GitHub Apps

### Why GitHub Apps Are the Preferred Model

GitHub Apps provide:

- Repository‑scoped permissions
- Non‑human identities
- Short‑lived access tokens (approximately one hour)
- Centralized revocation
- Strong auditability

This aligns well with zero‑trust and least‑privilege principles.

---

## 4. Recommended Architecture Pattern

```text
[ Field Device ]
   |
   |  (device identity: cert, key, or attestation)
   v
[ Device Auth Broker / Gateway ]
   |
   |  mints short-lived GitHub App token
   v
[ GitHub API / Repositories ]
```

**Key principle:** The device never stores a long‑term GitHub credential.

---

## 5. Practical Implementation Patterns

### Pattern A — GitHub App + Token Broker (Recommended)

- Devices authenticate to a trusted backend service
- Backend securely stores the GitHub App private key
- Backend mints short‑lived installation tokens
- Devices discard tokens after use

**Pros:**
- No GitHub secrets on devices
- Immediate revocation if a device is compromised
- Clean separation of identity and access

**Trade‑off:** Requires a backend service

---

### Pattern B — GitHub App With On‑Device Token Minting

- GitHub App private key stored on device
- Device directly generates installation tokens

**Pros:**
- No backend dependency

**Cons:**
- Private key compromise impacts the entire app
- Only appropriate with hardware‑backed key storage

---

### Pattern C — Fine‑Grained PATs (Transitional Only)

Use **only** as a temporary measure when modern patterns are not yet possible.

Hard requirements:
- Fine‑grained PATs only
- Repository‑scoped
- Read‑only permissions where possible
- Short expiration (30–90 days)
- One PAT per device

This should be positioned as a **temporary containment strategy**, not an endpoint.

---

## 6. Alternative for Read‑Only Devices

If devices only download signed artifacts:

- Use GitHub Releases or package registries
- Fetch assets with minimal or no API access
- Validate asset signatures on the device

This approach eliminates most authentication complexity and GitHub exposure.

---

## 7. Enterprise Governance Considerations (Entra ID / EMU)

For enterprises using Entra ID:

- Disable classic PATs enterprise‑wide
- Restrict PAT usage to fine‑grained tokens only if necessary
- Prefer GitHub Apps for non‑human access
- Enable secret scanning and push protection
- Periodically review token usage

Important note: **PATs bypass Entra Conditional Access**, which reinforces the need to minimize or eliminate them.

---

## 8. Recommended Migration Path

**Phase 1 — Contain**
- Inventory existing PAT usage
- Convert to fine‑grained tokens
- Remove unnecessary privileges

**Phase 2 — Introduce GitHub Apps**
- Create a read‑only GitHub App
- Pilot with a small set of devices

**Phase 3 — Add a Broker**
- Centralize token minting
- Remove GitHub secrets from devices

**Phase 4 — Enforce**
- Disable classic PATs
- Document and standardize approved access patterns

---

## Summary

For field devices, the secure and scalable strategy is **GitHub Apps with short‑lived tokens**, ideally delivered via a gateway or broker. PATs should be treated strictly as transitional mechanisms due to their static nature, operational risk, and lack of identity enforcement.
