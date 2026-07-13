# Orbe Implementation Roadmap

> **For agentic workers:** Use `superpowers:subagent-driven-development` (recommended when the user authorizes delegated execution) or `superpowers:executing-plans` to implement each plan task-by-task.

**Goal:** Deliver Orbe 1.0 as a Windows-first, local-first personal finance application, with private multi-device synchronization and a public download site.

**Architecture:** A TypeScript monorepo separates pure financial rules, API contracts, the Tauri desktop client, the Fastify/MySQL service, and the public site. The desktop client writes to encrypted SQLite first and synchronizes through an idempotent outbox protocol. The server authenticates users, isolates opaque encrypted financial records by owner, and never exposes finance through administrative routes.

**Tech Stack:** Node.js 22, npm workspaces, TypeScript, React, Vite, Tauri 2, Rust, SQLCipher/SQLite, Fastify, Prisma, MySQL, Zod, Vitest, Testing Library, Playwright, Cargo tests, GitHub Actions.

---

## Source of truth

- Product and architecture specification: `docs/superpowers/specs/2026-07-13-orbe-design.md`
- Domain vocabulary: `CONTEXT.md`
- Repository: `https://github.com/raphaelmvc/orbe`
- Default branch: `main`

If a plan and the approved specification disagree, stop that task and update the plan to match the specification before writing production code. Do not silently reinterpret financial rules.

## Global engineering constraints

- Store BRL values as integer centavos. Never use floating-point arithmetic for money.
- Generate UUIDv7 identifiers on the client for synchronized entities and operations.
- Keep `packages/domain` independent of React, Tauri, SQLite, Fastify, Prisma, MySQL, browser APIs, and Node-specific APIs.
- Persist a local mutation and its outbox operation in the same SQL transaction.
- Apply transfers, invoice payments, restores, and compound financial actions atomically.
- Scope every remote financial query by the authenticated `ownerId`; ignore any owner supplied in a request body.
- Keep financial values, descriptions, balances, last-four card digits, and report contents out of logs.
- Put secrets only in local environment files or deployment secret stores. Commit `.env.example`, never `.env`.
- Use accessible controls, visible focus, keyboard navigation, Brazilian formatting, and theme tokens from the first UI slice.
- Write a failing test before every domain rule, use case, persistence behavior, API policy, and regression fix.
- Keep commits small and named after one completed task. Do not combine unrelated plan tasks.

## Skill order during implementation

1. `superpowers:using-git-worktrees` before implementation, after the repository has a real initial commit and only if an isolated worktree is needed.
2. `superpowers:executing-plans` for inline sequential execution, or `superpowers:subagent-driven-development` only after the user explicitly authorizes subagents.
3. `superpowers:test-driven-development` at the beginning of each feature task.
4. `frontend-design` before implementing the desktop visual shell and the public site.
5. `build-web-apps:react-best-practices` while implementing or reviewing React code.
6. `build-web-apps:supabase-postgres-best-practices` is not used because Orbe uses MySQL on Hostinger, not Supabase/Postgres.
7. `build-web-apps:stripe-best-practices` is not used because Orbe has no billing.
8. `web-design-guidelines` after the desktop and site interfaces render, for accessibility and interaction review.
9. `superpowers:requesting-code-review` at the end of each plan.
10. `superpowers:verification-before-completion` before claiming any milestone or release complete.
11. `superpowers:finishing-a-development-branch` after all checks for a plan pass.

## Ordered implementation plans

### Milestone 1 — Foundation and financial domain

Plan: `docs/superpowers/plans/2026-07-13-orbe-foundation-domain.md`

Produces a buildable monorepo, CI, pure money/account/transaction rules, versioned contracts, a minimal Tauri shell, encrypted local database initialization, and the atomic local mutation/outbox boundary.

Exit gate:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

All commands exit `0`; money, account, transaction, transfer, migration, and outbox tests pass.

### Milestone 2 — Desktop finance experience

Plan: `docs/superpowers/plans/2026-07-13-orbe-desktop-finance.md`

Produces the Orbe shell, collapsible sidebar and user menu, onboarding, accounts, categories, expense/income/transfer drawers, dashboard, transaction history, trash, themes, and offline-only usability.

Exit gate:

```powershell
npm run test --workspace @orbe/desktop
npm run test:e2e --workspace @orbe/desktop
npm run build --workspace @orbe/desktop
npm run tauri:build --workspace @orbe/desktop -- --debug
```

The Playwright smoke suite covers an empty profile, first account, paid expense, received income, atomic transfer, restore from trash, keyboard navigation, and light/dark/automatic theme.

### Milestone 3 — Cards, recurrence, budgets, and reports

Plan: `docs/superpowers/plans/2026-07-13-orbe-cards-recurring-reports.md`

Produces bank-inspired visual cards, invoice cycles, installments, limit calculations, partial and external payments, fixed and variable recurrence flows, optional budgets, dashboard analytics, and Brazilian PDF/CSV export.

Exit gate:

```powershell
npm run test --workspace @orbe/domain
npm run test --workspace @orbe/desktop
npm run test:e2e --workspace @orbe/desktop -- cards recurring reports
```

Property tests cover centavo conservation and installment rounding; end-to-end tests prove that invoice payments are not counted as new expenses.

### Milestone 4 — Authentication, synchronization, and administration

Plan: `docs/superpowers/plans/2026-07-13-orbe-sync-auth-admin.md`

Produces the Hostinger-compatible API, MySQL schema, bootstrap administrator, email/Google authentication, approval flow, recovery, device sessions, encrypted synchronized storage, conflict resolution, deletion grace period, PIN integration, and a finance-blind admin panel.

Exit gate:

```powershell
npm run test --workspace @orbe/api
npm run test:integration --workspace @orbe/api
npm run test:e2e --workspace @orbe/desktop -- auth sync admin
npm run prisma:validate --workspace @orbe/api
npm run build --workspace @orbe/api
```

Two isolated desktop profiles synchronize after offline use; stale same-record edits create a resolvable conflict; cross-user and administrative finance access attempts return `404` or `403` without leaking existence or contents.

### Milestone 5 — Site, Windows integration, and release

Plan: `docs/superpowers/plans/2026-07-13-orbe-site-release.md`

Produces the public presentation/download site, privacy and terms pages, version manifest, signed Tauri updater, Windows tray/autostart/notifications, backup and restore runbooks, CI release artifacts, and Hostinger deployment documentation.

Exit gate:

```powershell
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run tauri:build --workspace @orbe/desktop
```

Install, upgrade, rollback-from-backup, uninstall, discreet notifications, tray behavior, and download integrity are manually verified on a clean supported Windows virtual machine.

## Release definition

Orbe 1.0 is releasable only after every criterion in section 21 of the approved specification has a linked automated test or a recorded Windows verification result in `docs/release/1.0.0-verification.md`. A passing build alone is not release approval.
