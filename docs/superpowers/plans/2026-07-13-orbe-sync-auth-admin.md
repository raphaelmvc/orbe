# Orbe Authentication, Synchronization, and Administration Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` (recommended when the user authorizes delegated execution) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add secure account lifecycle, administrator approval, private encrypted cloud backup, multi-device synchronization, conflict resolution, device management, and local PIN unlock without weakening offline finance behavior.

**Architecture:** A Fastify API uses MySQL through Prisma for identities, sessions, approval state, sync metadata, encrypted financial blobs, audit events, and deletion scheduling. Access tokens are short-lived JWTs; rotated opaque refresh tokens are hashed at rest. The desktop keeps the source-of-interaction local and sends validated finance payloads through authenticated TLS requests; the API encrypts them before MySQL persistence and uses push/pull cursors with idempotency. Administrative services depend only on identity repositories and cannot import financial storage modules.

**Tech Stack:** Node.js 22, TypeScript, Fastify, Prisma, MySQL 8, Zod, Argon2id, jose, Nodemailer/SMTP, Google OAuth 2.0/OIDC, Vitest, Testcontainers, Supertest/light-my-request, Playwright, Tauri keyring.

---

## Preconditions and constraints

- Complete the first three milestone plans before integrating desktop sync.
- Use `superpowers:test-driven-development` for each task.
- Do not log payload ciphertext, values, descriptions, balances, card digits, email codes, passwords, access tokens, refresh tokens, or PIN material.
- Obtain `ownerId`, role, and device identity from the verified session, never from finance request bodies.
- Respond to cross-user resource access without confirming whether another user's record exists.
- Keep administrative modules unable to import the financial record repository at compile time.
- Email recovery intentionally preserves decryptable synchronized data; document this accurately and do not claim zero-knowledge encryption.

### Task 1: Scaffold the Fastify API, Prisma schema, and test database

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/config.ts`
- Create: `apps/api/src/config.test.ts`
- Create: `apps/api/src/plugins/prisma.ts`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/.env.example`
- Create: `apps/api/test/mysql-container.ts`
- Create: `apps/api/test/health.integration.test.ts`
- Modify: `vitest.workspace.ts`

**Step 1: Install API dependencies**

```powershell
npm install fastify @fastify/cors @fastify/helmet @fastify/rate-limit @prisma/client zod pino --workspace @orbe/api
npm install --save-dev prisma tsx testcontainers --workspace @orbe/api
```

**Step 2: Write failing configuration tests**

Require `DATABASE_URL`, `ACCESS_TOKEN_PRIVATE_KEY`, `ACCESS_TOKEN_PUBLIC_KEY`, `REFRESH_TOKEN_PEPPER`, `FINANCE_KEYRING_JSON`, `BOOTSTRAP_ADMIN_SECRET_HASH`, `APP_BASE_URL`, SMTP settings, and Google settings only when Google login is enabled. Reject production wildcard CORS and default/example secrets.

Expected: FAIL before config parsing exists.

**Step 3: Implement a narrow app factory**

```ts
export interface AppOptions {
  config: ApiConfig;
  clock: Clock;
  idGenerator: IdGenerator;
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance>
```

Register redaction for authorization headers, cookies, passwords, codes, tokens, `payloadCiphertext`, `payloadIv`, and `payloadTag`. Health endpoints may report service/database status but no environment values.

**Step 4: Create the initial Prisma schema**

Models: `User`, `ExternalIdentity`, `EmailVerification`, `PasswordReset`, `Device`, `RefreshSession`, `ApprovalEvent`, `BootstrapState`, `SyncRecord`, `SyncOperation`, `UserSequence`, `DeletionRequest`, and `AuditEvent`. Add unique normalized email/username, unique provider subject, unique `(ownerId, entityType, entityId)`, and unique `(ownerId, idempotencyKey)`.

**Step 5: Test migrations on MySQL**

Start MySQL through Testcontainers, run `prisma migrate deploy`, then call `/health/ready`. Expected status `200` and body `{ "status": "ready" }`.

**Step 6: Verify and commit**

```powershell
npm run prisma:validate --workspace @orbe/api
npm run test:integration --workspace @orbe/api -- health
npm run build --workspace @orbe/api
git add apps/api package.json package-lock.json vitest.workspace.ts
git commit -m "feat(api): scaffold Hostinger-compatible service"
```

### Task 2: Implement bootstrap administrator, signup, email verification, and approval

**Files:**

- Create: `apps/api/src/modules/auth/signup.ts`
- Create: `apps/api/src/modules/auth/email-verification.ts`
- Create: `apps/api/src/modules/admin/bootstrap-admin.ts`
- Create: `apps/api/src/modules/admin/approvals.ts`
- Create: `apps/api/src/modules/email/email-service.ts`
- Create: `apps/api/src/modules/email/templates.ts`
- Create: `apps/api/src/modules/auth/signup.integration.test.ts`
- Create: `apps/api/src/modules/admin/approval.integration.test.ts`
- Create: `apps/desktop/src/features/auth/SignupPage.tsx`
- Create: `apps/desktop/src/features/auth/PendingApprovalPage.tsx`

**Step 1: Write failing bootstrap tests**

Test that the first administrator requires the configured one-time secret, consumes the bootstrap state transactionally, and cannot be repeated even with the same secret. Public signup must never accept or derive an admin role.

**Step 2: Write failing signup state-machine tests**

States are `unverified -> pending -> active | rejected | blocked`. Signup requires name, normalized unique email, normalized unique username, and password. Email verification changes only `unverified` to `pending`, sends waiting mail to user, and sends the admin a temporary approval link. Approval link requires an authenticated admin session and expires.

**Step 3: Implement password hashing and email tokens**

Use Argon2id with measured production parameters recorded in `docs/security/password-hashing.md`. Store verification/approval tokens only as HMAC-SHA-256 digests with a server pepper, plus expiry and consumed timestamp. Render templates without financial data.

**Step 4: Implement finance-blind approval service**

The admin list DTO contains only:

```ts
export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  username: string;
  status: 'pending' | 'active' | 'rejected' | 'blocked';
  createdAt: string;
  lastLoginAt: string | null;
}
```

Place this module in an ESLint/dependency-cruiser zone that forbids imports from `modules/sync`, Prisma `SyncRecord` helpers, report code, and finance contracts.

**Step 5: Build signup and waiting UI**

Show email-verification and approval as distinct states. A blocked/rejected response must use plain language and provide no finance data. App restart restores the visible auth state.

**Step 6: Verify and commit**

```powershell
npm run test:integration --workspace @orbe/api -- signup approval
npm run test --workspace @orbe/desktop -- auth
npm run boundaries
git add apps/api apps/desktop docs/security
git commit -m "feat(auth): add verified and approved registration"
```

### Task 3: Implement login, rotated sessions, Google linking, and password recovery

**Files:**

- Create: `apps/api/src/modules/auth/login.ts`
- Create: `apps/api/src/modules/auth/sessions.ts`
- Create: `apps/api/src/modules/auth/google.ts`
- Create: `apps/api/src/modules/auth/password-recovery.ts`
- Create: `apps/api/src/modules/auth/login.integration.test.ts`
- Create: `apps/api/src/modules/auth/password-recovery.integration.test.ts`
- Create: `apps/desktop/src/features/auth/LoginPage.tsx`
- Create: `apps/desktop/src/features/auth/ForgotPasswordPage.tsx`
- Create: `apps/desktop/src/features/auth/GoogleLinkConfirmation.tsx`

**Step 1: Write failing login/session tests**

Test login by email or username, inactive-status denial, short access token, opaque refresh token, rotation on every refresh, reuse detection revoking the token family, device-specific logout, global logout after password reset, and last-login update.

**Step 2: Implement session storage**

Hash refresh tokens with HMAC-SHA-256 and a pepper. Store family ID, device ID, expiry, rotation counter, revoked timestamp, and replacement relation. Access JWT contains only subject, role, device ID, session ID, issue/expiry, issuer, and audience.

**Step 3: Write failing Google tests**

Test verified Google email with no account starts signup and requires username/admin approval; same email with an existing account requires authenticated confirmation before linking; provider subject cannot link to two accounts; a link never silently creates a duplicate.

**Step 4: Implement OIDC code flow with PKCE**

Desktop opens the system browser and receives a loopback/deep-link callback through Tauri. Validate issuer, audience, nonce, state, PKCE, code, and verified email. Do not accept an ID token posted directly by the client as sufficient proof.

**Step 5: Write failing recovery tests**

Test six digits, ten-minute expiry, one-time use, maximum five attempts, resend cooldown, account/IP rate limits, indistinguishable request response, new password creation, and revocation of all previous sessions. Store only code digests.

**Step 6: Build login and recovery UI**

Login accepts one identifier field labeled `E-mail ou usuário`. Google is optional and visually secondary. Recovery has request code, verify code, and set password steps; it never reveals whether an email exists before successful code validation.

**Step 7: Verify and commit**

```powershell
npm run test:integration --workspace @orbe/api -- login password-recovery google
npm run test --workspace @orbe/desktop -- Login ForgotPassword Google
git add apps/api apps/desktop
git commit -m "feat(auth): add sessions Google linking and recovery"
```

### Task 4: Encrypt remote financial records and enforce owner isolation

**Files:**

- Create: `apps/api/src/modules/crypto/finance-envelope.ts`
- Create: `apps/api/src/modules/crypto/finance-envelope.test.ts`
- Create: `apps/api/src/modules/sync/sync-repository.ts`
- Create: `apps/api/src/modules/sync/owner-isolation.integration.test.ts`
- Create: `docs/security/finance-key-rotation.md`

**Step 1: Write failing envelope tests**

Use AES-256-GCM with random 96-bit IV, authenticated associated data containing owner ID, entity type, entity ID, version, and key ID. Test round trip, tampered ciphertext/tag/AAD rejection, distinct ciphertext for the same plaintext, active key selection, and old-key decryption during rotation.

**Step 2: Implement keyring configuration**

Parse `FINANCE_KEYRING_JSON` as an ordered set of base64 32-byte keys and one active key ID. Keep keys outside MySQL and repository. Never log key IDs alongside entity identifiers in normal request logs.

**Step 3: Write cross-user tests first**

Create users A and B. For every repository method, attempt to read, update, delete, restore, or infer B's record using A's session and known IDs. Expected: no content and no existence leak. Repeat with an admin session; expected: finance access denied.

**Step 4: Implement an owner-bound repository**

Construct `OwnerFinanceRepository` only from authenticated `ownerId`; methods do not accept owner as a parameter. Every Prisma `where` includes the captured owner. Administrative composition root cannot construct this repository.

**Step 5: Verify and commit**

```powershell
npm run test --workspace @orbe/api -- finance-envelope
npm run test:integration --workspace @orbe/api -- owner-isolation
npm run boundaries
git add apps/api docs/security
git commit -m "feat(security): encrypt and isolate synchronized finance"
```

### Task 5: Implement idempotent sync push/pull and desktop outbox worker

**Files:**

- Create: `apps/api/src/modules/sync/routes.ts`
- Create: `apps/api/src/modules/sync/push.ts`
- Create: `apps/api/src/modules/sync/pull.ts`
- Create: `apps/api/src/modules/sync/sync.integration.test.ts`
- Create: `apps/desktop/src/features/sync/sync-client.ts`
- Create: `apps/desktop/src/features/sync/sync-worker.ts`
- Create: `apps/desktop/src/features/sync/sync-worker.test.ts`
- Create: `apps/desktop/src-tauri/src/commands/sync.rs`
- Create: `apps/desktop/src-tauri/migrations/0009_sync_state.sql`

**Step 1: Write failing API sync tests**

Test push idempotency, monotonic per-user sequence, base-version match, same-record stale conflict, independent-record merge, tombstone propagation, batch size limits, cursor pagination, and retry after connection loss following server commit. A duplicate operation returns the original result.

**Step 2: Implement push transaction**

For each operation, lock user sequence and target record, check idempotency, compare base version, apply encrypted payload/tombstone, increment sequence, store operation result, and commit. Compound operations share a transaction group ID and are all accepted or rejected.

**Step 3: Implement pull cursor**

Return changes with sequence greater than cursor, ordered ascending, plus `nextCursor` and `hasMore`. Cursor advances on desktop only after the whole batch applies to local entities/projections in one transaction.

**Step 4: Write failing desktop worker tests**

Test triggers after local mutation, unlock, reconnect, foreground, interval while active, and manual request. Test exponential backoff with jitter, offline retention, server-commit/client-timeout retry, pull apply failure preserving cursor, token refresh, and discreet visual states.

**Step 5: Implement the worker**

Allow one worker per profile through a mutex. Push bounded outbox batches, mark acknowledged operations, then pull until `hasMore` is false. Never block local queries or command completion on network state.

**Step 6: Verify and commit**

```powershell
npm run test:integration --workspace @orbe/api -- sync
npm run test --workspace @orbe/desktop -- sync-worker
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml sync
git add apps/api apps/desktop packages/contracts
git commit -m "feat(sync): add idempotent push pull protocol"
```

### Task 6: Implement conflict preservation and resolution

**Files:**

- Create: `apps/desktop/src/features/sync/conflict-store.ts`
- Create: `apps/desktop/src/features/sync/ConflictCenter.tsx`
- Create: `apps/desktop/src/features/sync/ConflictDialog.tsx`
- Create: `apps/desktop/src/features/sync/conflict-resolution.ts`
- Create: `apps/desktop/src/features/sync/conflict-resolution.test.ts`
- Create: `apps/desktop/src-tauri/migrations/0010_conflicts.sql`

**Step 1: Write failing conflict tests**

Test that stale same-record edits preserve local and remote encrypted/decrypted versions, visible relevant field differences, and base version. Resolving local or remote creates a new mutation based on current server version and removes the conflict only after local persistence. Transfer/payment transaction groups cannot be split.

**Step 2: Implement conflict storage**

Store both payloads encrypted locally plus technical metadata. Decrypt only for the authenticated unlocked profile. Conflict logs contain entity type and conflict ID, not field contents.

**Step 3: Build resolution UI**

Show a conflict state in sidebar footer and notification center. Dialog compares description labels, dates, category labels, status, and formatted values only after unlock. User chooses `Manter deste computador` or `Manter versão sincronizada`; no silent last-write-wins.

**Step 4: Verify and commit**

```powershell
npm run test --workspace @orbe/desktop -- conflict
npm run test:e2e --workspace @orbe/desktop -- conflict
git add apps/desktop
git commit -m "feat(sync): preserve and resolve conflicts"
```

### Task 7: Implement devices, local PIN, lock, and account deletion

**Files:**

- Create: `apps/api/src/modules/devices/routes.ts`
- Create: `apps/api/src/modules/account/deletion.ts`
- Create: `apps/api/src/modules/account/deletion.integration.test.ts`
- Create: `apps/desktop/src/features/security/pin-service.ts`
- Create: `apps/desktop/src/features/security/LockScreen.tsx`
- Create: `apps/desktop/src/features/security/DevicesPage.tsx`
- Create: `apps/desktop/src/features/security/security.test.ts`
- Create: `apps/desktop/src/features/profile/DeleteAccountFlow.tsx`

**Step 1: Write failing device tests**

Test device registration, list only own devices, revoke one session, revocation taking effect on refresh, and password change revoking all other devices. Admin must not see a user's device list through admin routes.

**Step 2: Write failing PIN tests**

PIN is per device, optional, numeric, and protected by Windows Credential Manager. Store only an Argon2id verifier plus a wrapped local unlock key. Test wrong PIN, rate-limited retry, fallback to full login, manual lock, auto-lock disabled by default, configurable inactivity, and restart behavior.

**Step 3: Implement lock state**

Lock clears decrypted keys and sensitive query caches from memory, hides finance UI, and pauses payload application while allowing ciphertext download to wait. `Bloquear agora` is always available in the user menu.

**Step 4: Write failing deletion tests**

Test reauthentication, optional export acknowledgement, seven-day cancellation, sign-in state during grace period, cancellation, final purge of identity/sessions/finance data, and retained minimal security audit with no financial content.

**Step 5: Implement profile/device/deletion UI**

Show active device with last activity, revoke actions, PIN setup, auto-lock preference, and a destructive deletion flow with exact purge date. Deletion confirmation must not be a single accidental click.

**Step 6: Verify and commit**

```powershell
npm run test:integration --workspace @orbe/api -- devices deletion
npm run test --workspace @orbe/desktop -- security DeleteAccount
git add apps/api apps/desktop
git commit -m "feat(account): add devices PIN lock and deletion"
```

### Task 8: Build the administrator panel without finance access

**Files:**

- Create: `apps/desktop/src/features/admin/AdminPage.tsx`
- Create: `apps/desktop/src/features/admin/UserApprovalTable.tsx`
- Create: `apps/desktop/src/features/admin/AdminPage.test.tsx`
- Create: `apps/api/src/modules/admin/admin-routes.integration.test.ts`

**Step 1: Write negative API tests first**

Enumerate every admin route and assert response schemas contain only admin summary fields and approval audit metadata. Attempt query/body parameters named `accountId`, `cardId`, `transactionId`, `report`, and `includeFinance`; expected rejection. Static architecture test asserts no admin module imports sync/finance repositories.

**Step 2: Build admin page**

Route exists only for `role: admin`. List name, email, username, status, signup date, and last login. Actions: approve, reject, block, reactivate. Require confirmation for reject/block and show outcome without exposing finance.

**Step 3: Verify and commit**

```powershell
npm run test:integration --workspace @orbe/api -- admin-routes
npm run test --workspace @orbe/desktop -- AdminPage
npm run boundaries
git add apps/api apps/desktop
git commit -m "feat(admin): add finance-blind user administration"
```

### Task 9: Prove multi-device recovery and isolation

**Files:**

- Create: `apps/desktop/e2e/auth-approval.spec.ts`
- Create: `apps/desktop/e2e/multi-device-sync.spec.ts`
- Create: `apps/desktop/e2e/password-recovery.spec.ts`
- Create: `apps/api/test/security-matrix.integration.test.ts`
- Create: `docs/testing/sync-failure-matrix.md`

**Step 1: Automate account lifecycle**

Bootstrap administrator, register a family user, verify email through a captured test mailbox, approve as admin, log in, set PIN, lock/unlock, reset password by six-digit code, and prove old refresh sessions fail.

**Step 2: Automate two desktop profiles**

Device A creates data online. Device B logs in and restores. Both go offline and edit different records; reconnect and merge. Both edit the same record; reconnect and resolve conflict. Device A performs a transfer during a simulated timeout; retry must not duplicate it.

**Step 3: Run the security matrix**

For normal user, different user, blocked user, expired token, revoked device, and admin, test every sync/admin/device route with owned and foreign IDs. Record expected `2xx/401/403/404/409` results in the matrix doc.

**Step 4: Run milestone gate**

```powershell
npm run test --workspace @orbe/api
npm run test:integration --workspace @orbe/api
npm run test:e2e --workspace @orbe/desktop -- auth sync admin
npm run prisma:validate --workspace @orbe/api
npm run build --workspace @orbe/api
```

Expected: all pass; no test relies on order or shared users.

**Step 5: Review and commit**

Invoke `superpowers:requesting-code-review` with emphasis on authorization and cryptography, then `superpowers:verification-before-completion`.

```powershell
git add apps/desktop/e2e apps/api/test docs/testing/sync-failure-matrix.md
git commit -m "test(sync): prove recovery isolation and multi-device use"
```
