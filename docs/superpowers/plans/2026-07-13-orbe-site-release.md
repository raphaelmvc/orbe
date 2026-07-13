# Orbe Site, Windows Integration, and Release Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` (recommended when the user authorizes delegated execution) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Publish a trustworthy Orbe download site, complete native Windows behavior, produce tamper-resistant update artifacts, deploy the API/site to Hostinger, and verify backup, restore, install, update, and uninstall for the family release.

**Architecture:** A small static React/Vite site consumes a signed public release manifest and links only to immutable release artifacts. Tauri native services own tray, autostart, notifications, deep links, secure storage, and updater integration behind desktop ports. GitHub Actions builds/tests/releases; Hostinger runs the Fastify API and serves the site/download metadata. Runbooks make deployment and restoration repeatable without committing secrets.

**Tech Stack:** React, Vite, Tauri 2 plugins, GitHub Actions, GitHub Releases, Hostinger Node.js hosting, MySQL backups, SMTP, Playwright, PowerShell release verification.

---

## Preconditions and constraints

- Complete all earlier milestone plans.
- Invoke `frontend-design` before implementing the public site.
- Invoke `build-web-apps:react-best-practices` while implementing the site.
- Invoke `web-design-guidelines` after rendered desktop/site review.
- The site presents and downloads Orbe; it has no financial dashboard and no finance forms.
- Tauri updater signatures are mandatory. Commercial Authenticode is optional and absent from the first free release, so documentation must honestly mention possible SmartScreen warnings.
- Never put SMTP, database, OAuth, bootstrap, JWT, finance encryption, or updater private keys in repository files or release artifacts.

### Task 1: Build the public Orbe presentation and download site

**Files:**

- Create: `apps/site/package.json`
- Create: `apps/site/tsconfig.json`
- Create: `apps/site/vite.config.ts`
- Create: `apps/site/index.html`
- Create: `apps/site/src/main.tsx`
- Create: `apps/site/src/App.tsx`
- Create: `apps/site/src/styles.css`
- Create: `apps/site/src/components/DownloadButton.tsx`
- Create: `apps/site/src/components/FeatureSection.tsx`
- Create: `apps/site/src/pages/PrivacyPage.tsx`
- Create: `apps/site/src/pages/TermsPage.tsx`
- Create: `apps/site/src/pages/ChangelogPage.tsx`
- Create: `apps/site/src/App.test.tsx`

**Step 1: Write failing content and boundary tests**

Assert site contains Orbe presentation, Windows requirement, features, screenshots region, version, changelog, privacy, terms, contact, and download action. Assert it contains no sign-in, signup, balance, transaction, account, card-management, or report controls.

Expected: FAIL before site exists.

**Step 2: Implement the visual direction**

Use Orbe's quiet, modern finance identity with strong typography, restrained gradients, generous spacing, and real screenshots captured from deterministic desktop fixtures. Do not use bank logos or fabricated customer testimonials. Make the primary action `Baixar para Windows` and show installer architecture/size/version nearby.

**Step 3: Implement legal pages from product facts**

Privacy must describe manual finance entry, local encrypted storage, synchronized encrypted server storage, authentication/email/admin metadata, technical operator access caveat, seven-day deletion, and contact. Terms state free family use, no bank/payment service, no financial advice, no guaranteed third-party availability, and backup responsibilities. Do not invent a company identity.

**Step 4: Verify and commit**

```powershell
npm run test --workspace @orbe/site
npm run build --workspace @orbe/site
git add apps/site package.json package-lock.json
git commit -m "feat(site): add Orbe presentation and download site"
```

### Task 2: Implement native tray, autostart, and discreet Windows notifications

**Files:**

- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Create: `apps/desktop/src-tauri/src/native/tray.rs`
- Create: `apps/desktop/src-tauri/src/native/autostart.rs`
- Create: `apps/desktop/src-tauri/src/native/notifications.rs`
- Create: `apps/desktop/src/infrastructure/native/windows-native-service.ts`
- Create: `apps/desktop/src/features/notifications/NotificationCenter.tsx`
- Create: `apps/desktop/src/features/notifications/notification-policy.ts`
- Create: `apps/desktop/src/features/notifications/notification-policy.test.ts`
- Modify: `apps/desktop/src/features/settings/PreferencesPage.tsx`

**Step 1: Write failing privacy policy tests**

Default notification payload may contain generic title `Orbe` and text such as `Você tem um lembrete pendente`, but no amount, bank, description, category, card digits, account, or invoice value. Detailed mode is opt-in. Quiet hours and notification-type preferences suppress delivery without deleting in-app items.

**Step 2: Implement notification center and native adapter**

The header bell opens the in-app center. Native toast is sent only when backgrounded and permission is available. Clicking a toast focuses the existing window, unlocks if needed, then navigates to the related internal entity; route data must not contain sensitive labels.

**Step 3: Implement tray behavior**

Default: launch with Windows, close hides to tray, tray menu offers Abrir Orbe, Bloquear agora, Sincronizar agora, and Sair. Explicit Sair stops the process after the outbox is safely persisted; it need not wait for network completion.

**Step 4: Connect real preferences**

Add working startup, tray, notification privacy, quiet hours, and notification-type controls. Detect unsupported permissions and explain how to enable them in Windows Settings.

**Step 5: Verify and commit**

```powershell
npm run test --workspace @orbe/desktop -- notifications preferences
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml native
npm run tauri:build --workspace @orbe/desktop -- --debug
git add apps/desktop
git commit -m "feat(windows): add tray autostart and discreet notifications"
```

### Task 3: Implement signed updates and immutable release metadata

**Files:**

- Modify: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src/features/updates/update-service.ts`
- Create: `apps/desktop/src/features/updates/UpdateDialog.tsx`
- Create: `apps/desktop/src/features/updates/update-service.test.ts`
- Create: `packages/contracts/src/release-manifest.ts`
- Create: `release/latest.json`
- Create: `docs/release/signing.md`

**Step 1: Write failing release-contract tests**

Manifest requires semantic version, publication time, minimum supported version, Portuguese notes URL, Windows x64 installer URL, SHA-256, size, and Tauri signature. Reject HTTP URLs, mutable `latest.exe` installer URLs without version, missing signature, and downgrade versions.

**Step 2: Configure the Tauri updater**

Store only the updater public key in `tauri.conf.json`. Keep private signing key and password in GitHub Actions secrets. Check automatically on startup and periodically, display version and notes, download only after user confirmation, verify signature/hash, and require a second confirmation before restart/install.

**Step 3: Protect local data across update**

Before install, close active SQL transactions, checkpoint WAL, create `backups/pre-update-<from>-to-<to>-<utc>.sqlite3`, verify it opens with the current key, then allow installation. A failed migration restores the pre-migration backup and keeps the old compatible application path available through release rollback instructions.

**Step 4: Document key handling**

`docs/release/signing.md` records generation, GitHub secret names, public key rotation process, offline backup of the private key, and loss/compromise response. It states that updater signing prevents tampering but does not replace Authenticode or guarantee SmartScreen reputation.

**Step 5: Verify and commit**

```powershell
npm run test --workspace @orbe/contracts -- release-manifest
npm run test --workspace @orbe/desktop -- update-service
git add apps/desktop packages/contracts release docs/release/signing.md
git commit -m "feat(release): add signed desktop updates"
```

### Task 4: Create CI, release, and artifact-integrity workflows

**Files:**

- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Create: `.github/workflows/deploy-site.yml`
- Create: `scripts/verify-release.ps1`
- Create: `scripts/verify-release.test.ps1`
- Create: `docs/release/releasing.md`

**Step 1: Write release verification script tests**

Given fixture manifest/artifact/signature, test valid release, wrong SHA-256, wrong size, missing signature, mismatched version, and non-HTTPS URL. Script exits non-zero on any mismatch and prints no secret values.

**Step 2: Expand CI**

Ubuntu job runs JS lint/typecheck/unit/API integration/site build. Windows job runs domain/desktop tests, Cargo tests/check, Playwright desktop fixture tests, and debug Tauri build. Cache only package and Rust registries/targets; do not cache `.env`, SQLite profiles, keyrings, or build secrets.

**Step 3: Implement release workflow**

Trigger on signed `v*` tag. Verify tag equals app/package version, run the full gate, build Windows installer/update bundle, sign through Tauri secret, compute hash/size, upload immutable GitHub Release assets, create `release/latest.json`, verify it, and publish site metadata only after assets exist.

**Step 4: Implement site deploy artifact**

Build `apps/site`, copy `release/latest.json` and changelog, and produce one artifact suitable for Hostinger upload. Keep API deployment separate so a static-site failure cannot redeploy database migrations.

**Step 5: Verify and commit**

```powershell
npm test
npm run lint
npm run typecheck
pwsh -File scripts/verify-release.test.ps1
git add .github scripts docs/release/releasing.md
git commit -m "ci: add verified Windows release pipeline"
```

### Task 5: Prepare Hostinger API and site deployment

**Files:**

- Create: `apps/api/hostinger-start.mjs`
- Create: `docs/deployment/hostinger.md`
- Create: `docs/deployment/environment.md`
- Create: `docs/deployment/mysql-migrations.md`
- Create: `docs/deployment/smtp-and-google.md`
- Create: `scripts/hostinger-health-check.ps1`
- Create: `scripts/hostinger-health-check.test.ps1`

**Step 1: Implement a production start contract**

Build API to `dist` and start with one plain Node command compatible with Hostinger's managed Node application. Listen on `process.env.PORT` and trusted proxy configuration. Handle `SIGTERM`: stop accepting requests, finish bounded in-flight requests, close Prisma, exit.

**Step 2: Write deployment runbook**

Document domain/subdomain mapping, Node 22 selection, build/start commands, environment-variable entry, MySQL database/user creation, TLS, CORS origin, SMTP, Google redirect URIs, bootstrap secret setup/consumption, first admin sequence, site upload, and health check. Use variable names and examples, never real credentials.

**Step 3: Document safe migrations**

Before migration: enable maintenance response for mutating API routes, verify recent backup, export schema version, run `prisma migrate deploy`, smoke test, disable maintenance. On failure: leave writes disabled, restore the tested backup, redeploy previous API artifact, verify, then reopen writes.

**Step 4: Implement non-sensitive health checks**

Script calls public readiness, release manifest, privacy/terms/site pages, and installer HEAD URL. It verifies status, TLS, content type, manifest contract, versioned artifact URL, and expected size without downloading user or finance endpoints.

**Step 5: Verify and commit**

```powershell
npm run build --workspace @orbe/api
npm run build --workspace @orbe/site
pwsh -File scripts/hostinger-health-check.test.ps1
git add apps/api docs/deployment scripts
git commit -m "docs(deploy): add Hostinger deployment runbooks"
```

### Task 6: Implement and test backup and restore operations

**Files:**

- Create: `scripts/export-mysql-backup.ps1`
- Create: `scripts/verify-mysql-restore.ps1`
- Create: `docs/operations/backup-restore.md`
- Create: `docs/operations/key-backup.md`
- Create: `apps/desktop/src/features/diagnostics/DiagnosticExport.tsx`
- Create: `apps/desktop/src/features/diagnostics/diagnostic-export.test.ts`

**Step 1: Define backup inventory**

Inventory includes MySQL dump, schema migration table, server keyring backup stored separately, JWT/updater key recovery materials, deployment environment inventory without values, site/release artifact versions, and desktop automatic local backups. State retention and who can access each item.

**Step 2: Create MySQL export and restore-verification scripts**

Export uses environment-provided credentials, encryption at rest, UTC timestamp, SHA-256 sidecar, and no password on command line. Restore verification targets a disposable database, runs integrity counts/constraints, starts API against it, executes readiness/auth/sync smoke tests, then removes only the verified disposable database name.

**Step 3: Test diagnostic privacy**

Desktop diagnostic export contains application/OS version, migration version, outbox counts, sync status codes, redacted error types, and timestamps. Assert it excludes values, descriptions, balances, categories, account names, bank names, card digits, emails, usernames, tokens, keys, and raw payloads. Require preview and consent before save.

**Step 4: Perform a rehearsal**

Create test users/records, take backup, mutate/delete them, restore to disposable environment, and prove login plus sync record counts. Record date, duration, backup hash, result, and operator in `docs/release/1.0.0-verification.md` without user data.

**Step 5: Commit**

```powershell
git add scripts docs/operations apps/desktop/src/features/diagnostics
git commit -m "feat(operations): add verified backup and diagnostics"
```

### Task 7: Run final Windows and web acceptance

**Files:**

- Create: `apps/site/e2e/site.spec.ts`
- Create: `apps/desktop/e2e/windows-native.spec.ts`
- Create: `docs/release/1.0.0-verification.md`
- Create: `docs/release/windows-test-matrix.md`

**Step 1: Test the site**

Playwright asserts desktop/mobile layouts, keyboard navigation, legal pages, version/changelog agreement, download link to the exact signed release, no mixed content, no finance UI, and no serious axe violations.

**Step 2: Build release candidate**

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run tauri:build --workspace @orbe/desktop
```

Expected: every command exits `0`; capture artifact names and SHA-256 in the verification document.

**Step 3: Verify on a clean Windows VM**

Record OS edition/build and test: fresh install, expected SmartScreen behavior, signup/approval/login, PIN, offline finance, two-device restore, discrete notification, toast navigation after unlock, tray close/open/exit, autostart toggle, theme, signed update from prior release candidate, local backup preservation, uninstall, and reinstall recovery.

**Step 4: Verify all specification acceptance criteria**

Create a table in `docs/release/1.0.0-verification.md` mapping every bullet in specification section 21 to an automated test path or manual Windows evidence. Any missing row blocks release.

**Step 5: Review, verify, and commit**

Invoke `web-design-guidelines`, `superpowers:requesting-code-review`, and `superpowers:verification-before-completion`. Fix blockers and rerun the complete gate.

```powershell
git add apps/site/e2e apps/desktop/e2e docs/release
git commit -m "test(release): verify Orbe 1.0 acceptance"
```

### Task 8: Publish the family release

**Files:**

- Modify: `CHANGELOG.md`
- Modify: `release/latest.json`
- Modify: `docs/release/1.0.0-verification.md`

**Step 1: Confirm publication inputs**

Require completed verification document, tested MySQL backup, updater private-key availability, Hostinger environment health, consumed bootstrap procedure ready for first use, privacy/terms reviewed by the owner, and rollback artifact identified.

**Step 2: Create and push the signed tag**

```powershell
git status --short
git tag -s v1.0.0 -m "Orbe 1.0.0"
git push origin v1.0.0
```

Expected: clean worktree before tagging and release workflow succeeds.

**Step 3: Deploy in order**

Deploy compatible API/database migration, run health check, publish site/release manifest, download installer through public site, verify hash/signature, then invite the first family test user. Do not email broad download links before this smoke test passes.

**Step 4: Observe without financial logging**

Monitor readiness, HTTP error rates, mail delivery outcome, sync technical error codes, database capacity, and update downloads. Never enable verbose payload logging to diagnose production incidents.

**Step 5: Finish the branch**

Invoke `superpowers:finishing-a-development-branch` only after the release and rollback checks pass.
