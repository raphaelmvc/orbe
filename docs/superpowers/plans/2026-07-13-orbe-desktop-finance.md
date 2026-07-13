# Orbe Desktop Finance Experience Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` (recommended when the user authorizes delegated execution) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Make Orbe fully useful offline for accounts, categories, manual income, manual expenses, transfers, dashboard review, trash, preferences, and onboarding.

**Architecture:** Feature folders call application use cases through injected ports. React reads local projections and never queries SQLite or Tauri directly. Each command is validated in the domain/application layer, persisted with an outbox row, then reflected through a local query projection. Responsive desktop layout uses CSS tokens and accessible headless interaction primitives.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, React Hook Form, Zod, Radix UI primitives, Lucide icons, CSS Modules/design tokens, Vitest, Testing Library, Playwright, Tauri test adapters.

---

## Preconditions and constraints

- Complete `docs/superpowers/plans/2026-07-13-orbe-foundation-domain.md` first.
- Invoke `frontend-design` before Task 1 and retain the approved dashboard/card visual direction from the product specification.
- Invoke `build-web-apps:react-best-practices` while implementing Tasks 1–7.
- Use `superpowers:test-driven-development` for each task.
- This milestone must work with the network disabled and without an authenticated server session.
- Do not implement cards, invoices, installments, recurrence, budgets, reports, admin, or remote synchronization here.

### Task 1: Build the Orbe application shell and navigation

**Files:**

- Create: `apps/desktop/src/app/routes.tsx`
- Create: `apps/desktop/src/layout/AppShell.tsx`
- Create: `apps/desktop/src/layout/AppSidebar.tsx`
- Create: `apps/desktop/src/layout/UserMenu.tsx`
- Create: `apps/desktop/src/layout/TopBar.tsx`
- Create: `apps/desktop/src/layout/app-shell.module.css`
- Create: `apps/desktop/src/layout/AppShell.test.tsx`
- Modify: `apps/desktop/src/app/App.tsx`
- Modify: `apps/desktop/src/styles/tokens.css`

**Step 1: Write failing navigation tests**

Render at desktop width and assert:

- brand `Orbe` and highlighted `Adicionar` control;
- groups `Principal`, `Planejamento`, and `Análise`;
- routes Início, Transações, Contas, Cartões, Recorrências, Orçamentos, Relatórios;
- footer avatar, user name, sync state, and expansion control;
- user menu entries Meu perfil, Lixeira, Configurações, Bloquear agora, Sair;
- Administração appears only for `role: 'admin'`;
- collapsing preserves icons, accessible names, Add, avatar, and sync state.

Run `npm run test --workspace @orbe/desktop -- AppShell`.

Expected: FAIL because shell components do not exist.

**Step 2: Implement layout contracts**

```ts
export interface SessionSummary {
  readonly displayName: string;
  readonly username: string;
  readonly email: string;
  readonly role: 'user' | 'admin';
}

export type SyncVisualState =
  | 'synced'
  | 'offline'
  | 'syncing'
  | 'conflict'
  | 'error';
```

Use buttons for actions, navigation links for routes, tooltips in collapsed mode, and a modal confirmation for Sair only when unsent state requires explanation. Add a skip link to main content.

**Step 3: Implement tokens and layout**

Define semantic tokens for canvas, surface, elevated surface, text, muted text, border, focus, income, expense, warning, success, and Orbe accent in light and dark schemes. Do not encode meaning through color alone.

Run the unit tests and `npm run build --workspace @orbe/desktop`; expected: PASS.

**Step 4: Commit**

```powershell
git add apps/desktop/src
git commit -m "feat(desktop): build Orbe navigation shell"
```

### Task 2: Implement onboarding, accounts, and opening balances

**Files:**

- Create: `apps/desktop/src/features/onboarding/OnboardingWizard.tsx`
- Create: `apps/desktop/src/features/accounts/AccountsPage.tsx`
- Create: `apps/desktop/src/features/accounts/AccountForm.tsx`
- Create: `apps/desktop/src/features/accounts/account-use-cases.ts`
- Create: `apps/desktop/src/features/accounts/account-use-cases.test.ts`
- Create: `apps/desktop/src/features/accounts/AccountsPage.test.tsx`
- Create: `apps/desktop/src-tauri/migrations/0002_accounts_projection.sql`
- Modify: `apps/desktop/src-tauri/src/commands/local_finance.rs`

**Step 1: Write failing use-case tests**

Assert account creation requires a trimmed name, supported type, valid color, integer opening balance, and ISO opening-balance date. Assert editing does not rewrite historical postings. Assert an account with history is archived, while an unused account may be moved to trash.

Expected: FAIL before use cases exist.

**Step 2: Implement account commands and projection**

Create `CreateAccount`, `UpdateAccount`, and `ArchiveAccount` use cases. Add a projection table optimized for list and balance queries; update entity, projection, and outbox in the same Rust transaction.

**Step 3: Write failing onboarding tests**

Test the ordered optional steps: accounts, opening balances, cards teaser, categories review. `Configurar depois` must reach an instructive empty dashboard. Card setup remains disabled with text explaining it arrives in the next milestone.

**Step 4: Implement onboarding and account page**

Use a right-side account form on wide windows and a full-width sheet on narrow windows. Support current/checking, digital, savings, and cash. Display institution only when entered. Include archive confirmation explaining that history remains.

**Step 5: Verify and commit**

```powershell
npm run test --workspace @orbe/desktop -- accounts onboarding
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
git add apps/desktop
git commit -m "feat(desktop): add onboarding and financial accounts"
```

### Task 3: Implement categories and one-level subcategories

**Files:**

- Create: `packages/domain/src/categories/category.ts`
- Create: `packages/domain/src/categories/category.test.ts`
- Create: `apps/desktop/src/features/settings/categories/CategoriesSettings.tsx`
- Create: `apps/desktop/src/features/settings/categories/CategoryForm.tsx`
- Create: `apps/desktop/src/features/settings/categories/default-categories.ts`
- Create: `apps/desktop/src/features/settings/categories/CategoriesSettings.test.tsx`
- Create: `apps/desktop/src-tauri/migrations/0003_categories_projection.sql`

**Step 1: Write failing domain tests**

Test that a category has kind `expense | income`, a subcategory belongs to exactly one category, a subcategory cannot own children, a used category can be deactivated but not physically removed, and duplicate active names within the same parent and kind are rejected case-insensitively.

**Step 2: Implement the category aggregate and defaults**

Seed expense categories Moradia, Alimentação, Transporte, Saúde, Educação, Lazer, Assinaturas, Compras, Impostos, Outros; seed income categories Salário, Renda extra, Reembolso, Presente, Outros. Mark seeds as user-editable records, not hard-coded UI constants.

**Step 3: Build settings UI**

Categories live under Configurações, not the main sidebar. The form shows one optional subcategory level and explains deactivation. Historical entries retain their category labels.

**Step 4: Verify and commit**

```powershell
npm run test --workspace @orbe/domain -- categories
npm run test --workspace @orbe/desktop -- CategoriesSettings
git add packages/domain apps/desktop
git commit -m "feat(finance): add categories and subcategories"
```

### Task 4: Implement separate expense, income, and transfer drawers

**Files:**

- Create: `apps/desktop/src/features/transactions/AddMenu.tsx`
- Create: `apps/desktop/src/features/transactions/ExpenseDrawer.tsx`
- Create: `apps/desktop/src/features/transactions/IncomeDrawer.tsx`
- Create: `apps/desktop/src/features/transactions/TransferDrawer.tsx`
- Create: `apps/desktop/src/features/transactions/transaction-use-cases.ts`
- Create: `apps/desktop/src/features/transactions/transaction-use-cases.test.ts`
- Create: `apps/desktop/src/features/transactions/TransactionDrawers.test.tsx`
- Create: `apps/desktop/src-tauri/migrations/0004_transactions_projection.sql`

**Step 1: Write failing application tests**

Test create paid/pending expense, received/pending income, and confirmed transfer. Assert a paid expense requires source account, a received income requires destination account, a pending item changes no balance, and a transfer updates both balances or neither. Assert `Salvar e adicionar outra` returns a reset draft while normal save closes the drawer.

**Step 2: Define progressive form state**

```ts
export type PaymentMethod = 'cash' | 'debit' | 'credit-card' | 'other';

export interface ExpenseDraft {
  description: string;
  amountText: string;
  date: string;
  categoryId: string;
  subcategoryId: string | null;
  paymentMethod: PaymentMethod;
  accountId: string | null;
  state: 'pending' | 'paid';
}
```

Hide subcategory unless the category has active options. Hide account for pending expenses until payment confirmation is requested. Credit-card selection displays a milestone message and cannot be submitted until card support lands.

**Step 3: Implement three independent drawers**

Do not use tabs inside a shared form. Each drawer owns its schema, focus trap, title, submit copy, and error summary. Escape closes only after warning about dirty input. On success, announce the result through an `aria-live` region.

**Step 4: Implement atomic local commands and projections**

Extend the Rust command handler so transaction/transfer entity, balance projection, and outbox write commit together. Add a failure-injection test proving no single-sided transfer survives.

**Step 5: Verify and commit**

```powershell
npm run test --workspace @orbe/desktop -- transactions
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml transfer
git add apps/desktop packages/domain
git commit -m "feat(finance): add manual transaction drawers"
```

### Task 5: Build transaction history and settlement flows

**Files:**

- Create: `apps/desktop/src/features/transactions/TransactionsPage.tsx`
- Create: `apps/desktop/src/features/transactions/TransactionFilters.tsx`
- Create: `apps/desktop/src/features/transactions/SettleTransactionDialog.tsx`
- Create: `apps/desktop/src/features/transactions/TransactionsPage.test.tsx`
- Create: `apps/desktop/src/features/transactions/settlement-use-case.test.ts`
- Modify: `apps/desktop/src/features/transactions/transaction-use-cases.ts`

**Step 1: Write failing settlement tests**

Test that confirming a pending expense asks date and source account then subtracts once; confirming pending income asks date and destination then adds once; repeating the command is idempotent; overdue status is derived from the Windows-local calendar date; reverting a settlement creates a compensating projection change rather than deleting history.

**Step 2: Implement list queries and filters**

Support period, account, category, subcategory, and status. Use cursor pagination ordered by occurrence date then ID. Query parameters remain serializable so the page can restore its filter state.

**Step 3: Build the page and dialogs**

Show description, formatted value, date, category/subcategory, account, and status. Provide accessible row actions for edit, settle, move to trash, and inspect. Preserve a visible empty-filter state distinct from a new-user empty state.

**Step 4: Verify and commit**

```powershell
npm run test --workspace @orbe/desktop -- TransactionsPage settlement
git add apps/desktop
git commit -m "feat(finance): add transaction history and settlement"
```

### Task 6: Build the offline dashboard

**Files:**

- Create: `apps/desktop/src/features/dashboard/DashboardPage.tsx`
- Create: `apps/desktop/src/features/dashboard/dashboard-query.ts`
- Create: `apps/desktop/src/features/dashboard/dashboard-query.test.ts`
- Create: `apps/desktop/src/features/dashboard/DashboardPage.test.tsx`
- Create: `apps/desktop/src/features/dashboard/dashboard.module.css`

**Step 1: Write failing projection tests**

For a fixed month, test consolidated active-account balance, received income, paid expense, result, monthly flow points, expense totals by category/subcategory, and upcoming pending due dates. Assert pending items do not enter settled totals and archived account history remains in historical reports but not the current active balance summary.

**Step 2: Implement the local dashboard query**

Return one view model from a single port call:

```ts
export interface DashboardViewModel {
  balance: Centavos;
  monthIncome: Centavos;
  monthExpense: Centavos;
  monthResult: Centavos;
  flow: readonly { date: string; income: Centavos; expense: Centavos }[];
  categories: readonly { categoryId: string; label: string; total: Centavos }[];
  upcoming: readonly UpcomingItem[];
}
```

Do not calculate totals by scraping rendered rows.

**Step 3: Implement empty and populated states**

Use the approved balanced dashboard. Reserve the right column for an honest empty state titled `Seus cartões aparecerão aqui`, with an inactive explanatory action until card creation is delivered in Milestone 3; do not fake card data. Include an accessible chart table alternative.

**Step 4: Verify and commit**

```powershell
npm run test --workspace @orbe/desktop -- dashboard
git add apps/desktop
git commit -m "feat(desktop): add offline finance dashboard"
```

### Task 7: Implement trash, preferences, and themes

**Files:**

- Create: `apps/desktop/src/features/trash/TrashPage.tsx`
- Create: `apps/desktop/src/features/trash/trash-use-cases.ts`
- Create: `apps/desktop/src/features/trash/trash-use-cases.test.ts`
- Create: `apps/desktop/src/features/settings/PreferencesPage.tsx`
- Create: `apps/desktop/src/features/settings/preferences-schema.ts`
- Create: `apps/desktop/src/features/theme/ThemeProvider.tsx`
- Create: `apps/desktop/src/features/theme/ThemeToggle.tsx`
- Create: `apps/desktop/src/features/theme/ThemeProvider.test.tsx`
- Create: `apps/desktop/src-tauri/migrations/0005_preferences.sql`

**Step 1: Write failing retention and restore tests**

Test default 30-day retention, a custom positive day count, `never`, restore, permanent delete confirmation, empty trash, and archiving preference for structural records with history. Deletion/restoration must emit outbox operations.

**Step 2: Implement trash use cases**

Retention cleanup runs on startup and once per local day, never while a migration or restore is active. Permanent deletion removes only tombstones older than the configured retention and their now-unreferenced encrypted payloads.

**Step 3: Write and implement theme tests**

Default to `system`; allow `light`, `dark`, and `system` from Settings and the top-bar icon. Assert a Windows theme-change event updates `system` immediately while explicit modes do not change.

**Step 4: Build preferences UI**

Include only working trash retention and theme preferences plus category/subcategory management. Lock, notification, startup, and tray settings are added with their working native behavior in later milestones; do not render or persist non-functional controls here.

**Step 5: Verify and commit**

```powershell
npm run test --workspace @orbe/desktop -- trash theme preferences
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
git add apps/desktop
git commit -m "feat(desktop): add trash preferences and themes"
```

### Task 8: Run offline desktop acceptance

**Files:**

- Create: `apps/desktop/e2e/offline-finance.spec.ts`
- Create: `apps/desktop/e2e/keyboard-navigation.spec.ts`
- Create: `apps/desktop/playwright.config.ts`
- Create: `docs/testing/desktop-offline-fixture.md`

**Step 1: Add deterministic Playwright fixtures**

Launch the frontend against a test local-store adapter seeded per test. Do not share a database across tests. Freeze dates and timezone at `America/Sao_Paulo`.

**Step 2: Cover the user journey**

Automate: skip onboarding, create checking and cash accounts, review seeded categories, add paid expense, add received income, create transfer, verify dashboard totals, settle a pending expense, trash and restore it, collapse sidebar, open user menu, and switch all themes.

**Step 3: Cover accessibility mechanics**

Complete the same add-expense flow without a mouse. Assert focus enters the drawer, returns to the trigger after close, visible labels exist, and no serious axe violations occur.

**Step 4: Run the milestone gate**

```powershell
npm run test --workspace @orbe/desktop
npm run test:e2e --workspace @orbe/desktop
npm run build --workspace @orbe/desktop
npm run tauri:build --workspace @orbe/desktop -- --debug
```

Expected: all commands exit `0` with the network adapter disabled.

**Step 5: Review and commit**

Invoke `web-design-guidelines` on the rendered application, then `superpowers:requesting-code-review` and `superpowers:verification-before-completion`.

```powershell
git add apps/desktop/e2e apps/desktop/playwright.config.ts docs/testing
git commit -m "test(desktop): prove offline finance journey"
```
