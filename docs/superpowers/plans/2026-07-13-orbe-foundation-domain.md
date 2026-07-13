# Orbe Foundation and Financial Domain Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` (recommended when the user authorizes delegated execution) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Establish the repository, enforce architectural boundaries, implement the first pure financial rules, and prove atomic encrypted local-first persistence through a minimal Windows desktop slice.

**Architecture:** npm workspaces contain dependency-free domain code, Zod transport contracts, and a Tauri/React desktop app. TypeScript owns domain validation and use cases. Rust owns the encrypted SQLCipher connection and exposes narrow Tauri commands. Each local mutation writes its entity and outbox record inside one SQLite transaction.

**Tech Stack:** Node.js 22, npm workspaces, TypeScript, React, Vite, Vitest, fast-check, ESLint, dependency-cruiser, Tauri 2, Rust, rusqlite with SQLCipher, Windows Credential Manager, GitHub Actions.

---

## Preconditions and constraints

- Read `docs/superpowers/specs/2026-07-13-orbe-design.md` and `CONTEXT.md` before Task 1.
- Run every command from the repository root unless a step says otherwise.
- Use `superpowers:test-driven-development` for Tasks 2 through 6.
- Do not add API, MySQL, card, recurrence, budget, report, or site behavior in this plan.
- Use `Money`/`Centavos` for every financial value. A `number` from a decimal input must be converted at the UI boundary, never accepted by domain constructors.

### Task 1: Bootstrap the monorepo and CI

**Files:**

- Create: `.nvmrc`
- Create: `.editorconfig`
- Create: `.gitignore`
- Create: `package.json`
- Create: `package-lock.json` through `npm install`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `vitest.workspace.ts`
- Create: `.github/workflows/ci.yml`
- Create: `packages/domain/package.json`
- Create: `packages/domain/tsconfig.json`
- Create: `packages/domain/src/index.ts`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`

**Step 1: Create the workspace manifest**

Use Node `22` in `.nvmrc`. Define npm workspaces as `apps/*` and `packages/*`. Root scripts must be:

```json
{
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "lint": "eslint .",
    "test": "vitest run",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "boundaries": "depcruise --config dependency-cruiser.cjs packages apps"
  }
}
```

Install root development dependencies:

```powershell
npm install --save-dev typescript vitest eslint @eslint/js typescript-eslint dependency-cruiser fast-check
```

Expected: `package-lock.json` is created and `npm ls --depth=0` exits `0`.

**Step 2: Add package compilation probes**

Create `packages/domain/src/index.ts`:

```ts
export const domainPackage = '@orbe/domain' as const;
```

Create `packages/contracts/src/index.ts`:

```ts
export const syncProtocolVersion = 1 as const;
```

Configure each package with `composite`, `declaration`, `rootDir: "src"`, and `outDir: "dist"` extending `tsconfig.base.json`.

**Step 3: Enforce dependency direction**

Create `dependency-cruiser.cjs` with a rule that forbids `packages/domain/src` from importing `apps`, `packages/contracts`, React, Tauri, Node built-ins, database libraries, and browser globals. Add a rule preventing circular dependencies.

Run:

```powershell
npm run typecheck
npm run boundaries
```

Expected: both commands exit `0`.

**Step 4: Add continuous integration**

Create `.github/workflows/ci.yml` for `push` and `pull_request` on Windows and Ubuntu. Both jobs run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Task 5 extends the Windows job with Rust checks in the same commit that introduces the Cargo manifest.

**Step 5: Commit**

```powershell
git add .nvmrc .editorconfig .gitignore package.json package-lock.json tsconfig.base.json eslint.config.mjs vitest.workspace.ts dependency-cruiser.cjs .github packages
git commit -m "build: bootstrap Orbe monorepo"
```

### Task 2: Implement exact money and installment allocation

**Files:**

- Create: `packages/domain/src/money/centavos.ts`
- Create: `packages/domain/src/money/allocate-installments.ts`
- Create: `packages/domain/src/money/centavos.test.ts`
- Create: `packages/domain/src/money/allocate-installments.test.ts`
- Modify: `packages/domain/src/index.ts`

**Step 1: Write failing exact-money tests**

```ts
import { describe, expect, it } from 'vitest';
import { add, centavos, formatBRL, parseBRL } from './centavos';

describe('Centavos', () => {
  it('parses and formats Brazilian money without floating-point arithmetic', () => {
    expect(parseBRL('R$ 1.234,56')).toBe(centavos(123456));
    expect(formatBRL(centavos(123456))).toBe('R$ 1.234,56');
  });

  it('adds integer centavos', () => {
    expect(add(centavos(10), centavos(20))).toBe(centavos(30));
  });
});
```

Run `npm test -- packages/domain/src/money/centavos.test.ts`.

Expected: FAIL because the module does not exist.

**Step 2: Implement branded integer centavos**

```ts
export type Centavos = number & { readonly __brand: 'Centavos' };

export function centavos(value: number): Centavos {
  if (!Number.isSafeInteger(value)) throw new Error('Centavos must be a safe integer');
  return value as Centavos;
}

export const add = (left: Centavos, right: Centavos): Centavos => centavos(left + right);
export const subtract = (left: Centavos, right: Centavos): Centavos => centavos(left - right);
```

Implement `parseBRL` by normalizing a validated `^-?R?\$?\s*[\d.]+,\d{2}$` string and concatenating reais and cents. Implement `formatBRL` with `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`, dividing only at this presentation boundary.

**Step 3: Write failing allocation property tests**

Use `fast-check` to assert for totals from 1 to 100,000,000 centavos and 1 to 120 installments that:

- the length equals the requested count;
- every installment is an integer centavo value;
- the sum equals the original total;
- installments before the last differ by at most one centavo;
- all rounding residue is applied to the last installment.

Run `npm test -- packages/domain/src/money/allocate-installments.test.ts`.

Expected: FAIL because `allocateInstallments` does not exist.

**Step 4: Implement deterministic allocation**

```ts
export function allocateInstallments(total: Centavos, count: number): readonly Centavos[] {
  if (total <= 0 || !Number.isInteger(count) || count < 1) throw new Error('Invalid installments');
  const base = Math.floor(total / count);
  const first = Array.from({ length: count - 1 }, () => centavos(base));
  const assigned = base * (count - 1);
  return [...first, centavos(total - assigned)];
}
```

Run both test files; expected: PASS.

**Step 5: Commit**

```powershell
git add packages/domain/src
git commit -m "feat(domain): add exact money primitives"
```

### Task 3: Model accounts, entries, balances, and atomic transfers

**Files:**

- Create: `packages/domain/src/shared/identity.ts`
- Create: `packages/domain/src/accounts/account.ts`
- Create: `packages/domain/src/transactions/transaction.ts`
- Create: `packages/domain/src/transactions/balance.ts`
- Create: `packages/domain/src/transactions/transfer.ts`
- Create: `packages/domain/src/transactions/transaction.test.ts`
- Create: `packages/domain/src/transactions/transfer.test.ts`
- Modify: `packages/domain/src/index.ts`

**Step 1: Write failing status and balance tests**

Cover these rules with fixed dates:

- paid expense subtracts its account;
- pending expense changes no balance;
- pending expense before due date remains `pending`;
- pending expense after due date derives as `overdue` without rewriting the stored state;
- received income adds to its account;
- pending income changes no balance;
- archived accounts keep their history.

Represent stored entry states as `pending | settled`; derive display states as `pending | overdue | paid | received` from kind, settlement, due date, and `now`.

Run `npm test -- packages/domain/src/transactions`.

Expected: FAIL because the modules do not exist.

**Step 2: Implement domain types and constructors**

Use these public shapes:

```ts
export type AccountType = 'checking' | 'digital' | 'savings' | 'cash';

export interface FinancialAccount {
  readonly id: EntityId;
  readonly name: string;
  readonly type: AccountType;
  readonly institution?: string;
  readonly color: string;
  readonly openingBalance: Centavos;
  readonly openingBalanceDate: string;
  readonly status: 'active' | 'archived';
  readonly displayOrder: number;
}

export type TransactionKind = 'expense' | 'income';
export type TransactionState = 'pending' | 'settled';
```

Constructors trim names/descriptions, require positive transaction values, validate ISO calendar dates, require a category, and require an account for settled non-card entries.

**Step 3: Write failing transfer tests**

Test that transfer creation rejects the same source and destination, non-positive values, and missing accounts. Test that applying one transfer returns exactly two ledger postings with one shared `transferId`, equal values, opposite directions, and no category.

**Step 4: Implement transfers as one aggregate operation**

Expose `createTransfer(command): Transfer` and `postingsForTransfer(transfer): readonly [DebitPosting, CreditPosting]`. Do not model a transfer as income plus expense.

Run `npm test -- packages/domain/src/transactions`.

Expected: PASS.

**Step 5: Commit**

```powershell
git add packages/domain/src
git commit -m "feat(domain): model accounts transactions and transfers"
```

### Task 4: Define versioned local and synchronization contracts

**Files:**

- Create: `packages/contracts/src/entities.ts`
- Create: `packages/contracts/src/local-commands.ts`
- Create: `packages/contracts/src/sync-v1.ts`
- Create: `packages/contracts/src/contracts.test.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/package.json`

**Step 1: Install Zod and write failing contract tests**

```powershell
npm install zod --workspace @orbe/contracts
```

Tests must reject decimal money, malformed UUIDs, unknown entity types, a transfer with equal accounts, a sync operation without idempotency key, and a pull response whose sequence is lower than its starting cursor.

Expected: the test file fails because schemas do not exist.

**Step 2: Implement public contracts**

Use a discriminated union for `account`, `category`, `transaction`, and `transfer`. Define:

```ts
export interface SyncOperationV1 {
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly entityType: 'account' | 'category' | 'transaction' | 'transfer';
  readonly entityId: string;
  readonly baseVersion: number;
  readonly payload: EntityPayloadV1;
  readonly deletedAt: string | null;
  readonly occurredAt: string;
}
```

Do not include `ownerId` in client financial command bodies. The server obtains ownership from the authenticated session. Payloads travel inside authenticated TLS requests; the API validates them, encrypts them with the active server finance key before MySQL persistence, and decrypts them only for an authorized owner's pull response.

**Step 3: Verify and commit**

```powershell
npm test -- packages/contracts/src/contracts.test.ts
npm run typecheck --workspace @orbe/contracts
git add packages/contracts
git commit -m "feat(contracts): define versioned local and sync schemas"
```

Expected: tests and type checking pass.

### Task 5: Scaffold the Tauri desktop shell and composition boundary

**Files:**

- Create through tooling: `apps/desktop/*`
- Modify: `apps/desktop/package.json`
- Create: `apps/desktop/src/app/App.tsx`
- Create: `apps/desktop/src/app/App.test.tsx`
- Create: `apps/desktop/src/app/ports.ts`
- Create: `apps/desktop/src/app/composition.ts`
- Create: `apps/desktop/src/styles/tokens.css`
- Modify: `apps/desktop/src-tauri/tauri.conf.json`
- Modify: `.github/workflows/ci.yml`

**Step 1: Scaffold without overwriting root files**

```powershell
npm create tauri-app@latest apps/desktop -- --template react-ts --manager npm --identifier app.orbe.desktop --tauri-version 2
npm install
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom --workspace @orbe/desktop
```

If the generator proposes root workspace changes, decline them and add the desktop scripts manually.

**Step 2: Write a failing shell test**

Test that the first render contains the Orbe brand, a `Configurar depois` action, and an accessible main landmark, while no network call is made. Mock every port at the composition boundary.

Run `npm run test --workspace @orbe/desktop`.

Expected: FAIL against the generated screen.

**Step 3: Define ports before adapters**

```ts
export interface LocalFinanceStore {
  listAccounts(): Promise<readonly FinancialAccount[]>;
  applyMutation(command: LocalMutationCommand): Promise<MutationReceipt>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}
```

Create `AppDependencies` from these ports. `App.tsx` receives dependencies from `composition.ts`; components do not import `@tauri-apps/api` directly.

**Step 4: Implement the minimal accessible shell**

Add neutral light/dark tokens, focus styles, the brand, empty-state copy, and a single onboarding action. Do not implement final sidebar or finance forms in this plan.

Run:

```powershell
npm run test --workspace @orbe/desktop
npm run build --workspace @orbe/desktop
```

Expected: PASS and a production frontend build.

Extend the Windows CI job to install Rust stable and run `cargo test` plus `cargo check` against `apps/desktop/src-tauri/Cargo.toml`.

**Step 5: Commit**

```powershell
git add apps/desktop package.json package-lock.json
git commit -m "feat(desktop): add Tauri composition shell"
```

### Task 6: Encrypt SQLite and make local mutation plus outbox atomic

**Files:**

- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/migrations/0001_initial.sql`
- Create: `apps/desktop/src-tauri/src/database/mod.rs`
- Create: `apps/desktop/src-tauri/src/database/key.rs`
- Create: `apps/desktop/src-tauri/src/database/migrations.rs`
- Create: `apps/desktop/src-tauri/src/commands/local_finance.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Create: `apps/desktop/src/infrastructure/tauri-local-finance-store.ts`
- Create: `apps/desktop/src/infrastructure/tauri-local-finance-store.test.ts`

**Step 1: Add Rust dependencies and failing migration tests**

Use `rusqlite` with the SQLCipher bundled feature, `keyring`, `secrecy`, `uuid` with v7, `serde`, `serde_json`, `thiserror`, and `tempfile` for tests. A Rust test must:

1. create a temporary encrypted database;
2. assert `PRAGMA cipher_version` is non-empty;
3. migrate it;
4. assert tables `entities`, `outbox`, `sync_cursor`, and `schema_migrations` exist;
5. assert opening with a different key fails.

Run:

```powershell
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml database
```

Expected: FAIL because the database module does not exist.

**Step 2: Implement key storage and migration backup**

Store a random 32-byte database key under service `Orbe` and account `local-database-key` in Windows Credential Manager. On first start create it with the operating-system random source. Before every schema migration, copy the closed database to `backups/pre-migration-<schema>-<utc>.sqlite3` and retain the newest three copies.

The application must refuse to start the finance store if SQLCipher support is absent; never fall back to unencrypted SQLite.

**Step 3: Define the initial schema**

`0001_initial.sql` stores entity metadata and encrypted JSON payloads. Required columns for `entities` are `id`, `entity_type`, `version`, `payload`, `created_at`, `updated_at`, and nullable `deleted_at`. Required columns for `outbox` are `operation_id`, unique `idempotency_key`, `entity_id`, `entity_type`, `base_version`, `payload`, `occurred_at`, `attempt_count`, and nullable `last_error`.

**Step 4: Write the failing atomicity test**

Inject a failure immediately after the entity upsert but before the outbox insert. Assert neither row remains. Then run without injection and assert exactly one entity and one outbox row exist. Repeating the same idempotency key must return the original receipt and create no duplicate.

Expected: FAIL before the transaction command is implemented.

**Step 5: Implement the Tauri command as one SQL transaction**

Expose one command:

```rust
#[tauri::command]
pub fn apply_local_mutation(
    state: tauri::State<'_, DatabaseState>,
    command: LocalMutationCommand,
) -> Result<MutationReceipt, LocalFinanceError>
```

Validate the command contract, begin an immediate transaction, upsert the entity with incremented logical version, insert the outbox operation, commit, and return the version and operation ID. Roll back on every error.

**Step 6: Implement and test the TypeScript adapter**

The adapter calls only `invoke('apply_local_mutation', { command })`, parses the returned receipt with the contracts package, and maps technical failures to a stable application error. Its unit test mocks `invoke` and asserts no owner identity is sent.

Run:

```powershell
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run test --workspace @orbe/desktop
npm run boundaries
```

Expected: all commands pass.

**Step 7: Commit**

```powershell
git add apps/desktop packages package.json package-lock.json
git commit -m "feat(storage): add encrypted atomic local outbox"
```

### Task 7: Verify the milestone and document the boundary

**Files:**

- Create: `docs/architecture/local-first-boundary.md`
- Modify only if checks expose a defect: files from Tasks 1–6

**Step 1: Document the proven write path**

Describe the exact call chain `React event -> application use case -> LocalFinanceStore -> Tauri command -> SQL transaction -> entity + outbox`, key storage location, migration backup location, and how to inspect only technical metadata without printing financial payloads.

**Step 2: Run the complete milestone gate**

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run boundaries
npm run build
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Expected: every command exits `0`, with no skipped domain or database tests.

**Step 3: Review architecture and commit**

Invoke `superpowers:requesting-code-review`, address all blocking findings using `superpowers:receiving-code-review`, then rerun Step 2. Invoke `superpowers:verification-before-completion` before reporting the milestone complete.

```powershell
git add docs/architecture/local-first-boundary.md
git commit -m "docs: record local-first persistence boundary"
```
