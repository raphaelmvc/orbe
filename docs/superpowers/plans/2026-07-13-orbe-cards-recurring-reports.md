# Orbe Cards, Recurrence, Budgets, and Reports Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` (recommended when the user authorizes delegated execution) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Complete Orbe's financial feature set with realistic credit cards and invoices, monthly recurrence, optional budgets, analytical views, and Brazilian exports.

**Architecture:** Pure domain modules calculate invoice cycles, installments, available limit, payment allocation, recurrence occurrences, budgets, and report totals. Desktop feature modules persist aggregates locally through the existing atomic mutation/outbox port and render read-only projections. Invoice payment is a settlement operation, never a second expense.

**Tech Stack:** Existing domain/desktop stack plus fast-check, Recharts with accessible table fallback, Papa Parse-compatible RFC 4180 writer, pdf-lib, Vitest, Testing Library, Playwright.

---

## Preconditions and constraints

- Complete the foundation and desktop-finance plans first.
- Use `superpowers:test-driven-development` for every financial rule.
- Use `frontend-design` before implementing the visual card and dashboard card column.
- Never represent a credit card as a financial account.
- Never create income for an external invoice payment.
- Never count an invoice payment as a new expense.
- Keep purchase total and original date on the purchase aggregate; installments belong to invoice competencies.

### Task 1: Implement card cycle and invoice assignment rules

**Files:**

- Create: `packages/domain/src/cards/card.ts`
- Create: `packages/domain/src/cards/invoice-cycle.ts`
- Create: `packages/domain/src/cards/invoice-cycle.test.ts`
- Create: `packages/domain/src/cards/card.test.ts`
- Modify: `packages/domain/src/index.ts`

**Step 1: Write failing calendar tests**

Use fixed calendar dates to cover purchases before, on, and after close day; close days absent in short months; due days absent in February; December-to-January rollover; and leap year. Adopt this explicit rule: a purchase on the close date belongs to the next invoice, while purchases before it belong to the closing invoice. Clamp configured close/due days to the last calendar day of that month.

Expected: FAIL because cycle functions do not exist.

**Step 2: Implement card and cycle types**

```ts
export interface CreditCard {
  readonly id: EntityId;
  readonly nickname: string;
  readonly bankName: string;
  readonly bankLogoAsset: string | null;
  readonly visualStyle: CardVisualStyle;
  readonly network: 'visa' | 'mastercard' | 'elo' | 'amex' | 'other';
  readonly lastFour: string;
  readonly holderName: string;
  readonly limit: Centavos;
  readonly closingDay: number;
  readonly dueDay: number;
  readonly status: 'active' | 'archived';
}
```

Validate `lastFour` as exactly four digits, days as 1–31, and a positive limit. Return ISO dates and invoice key `YYYY-MM` from cycle functions.

**Step 3: Verify and commit**

```powershell
npm run test --workspace @orbe/domain -- cards
git add packages/domain
git commit -m "feat(cards): add card and invoice cycle rules"
```

### Task 2: Implement purchases, installments, invoices, and available limit

**Files:**

- Create: `packages/domain/src/cards/purchase.ts`
- Create: `packages/domain/src/cards/installments.ts`
- Create: `packages/domain/src/cards/invoice.ts`
- Create: `packages/domain/src/cards/limit.ts`
- Create: `packages/domain/src/cards/purchase.test.ts`
- Create: `packages/domain/src/cards/invoice.test.ts`
- Create: `packages/domain/src/cards/limit.property.test.ts`

**Step 1: Write failing purchase and property tests**

Test a cash-like one-installment card purchase, 2–120 installments, centavo residue on only the last installment, monthly invoice rollover, original purchase date preservation, and edit scope `this | this-and-future | entire-purchase`. Property tests assert installment sum equals purchase total and unpaid current plus future installments fully commit limit.

**Step 2: Implement aggregate interfaces**

```ts
export interface CardPurchase {
  readonly id: EntityId;
  readonly cardId: EntityId;
  readonly description: string;
  readonly total: Centavos;
  readonly purchaseDate: string;
  readonly categoryId: EntityId;
  readonly subcategoryId: EntityId | null;
  readonly installmentCount: number;
}

export interface CardInstallment {
  readonly id: EntityId;
  readonly purchaseId: EntityId;
  readonly sequence: number;
  readonly amount: Centavos;
  readonly invoiceKey: string;
}
```

An invoice is a projection over installments, adjustments, and payments for one card/cycle, with `originalAmount`, `paidAmount`, and `remainingAmount`.

**Step 3: Implement available limit**

Calculate `limit - all unsettled purchase amounts`, then clamp only display output at zero; retain an over-limit indicator when committed value exceeds limit. Payment increases availability by the applied amount without exceeding total limit unless a positive card adjustment explicitly raises it.

**Step 4: Verify and commit**

```powershell
npm run test --workspace @orbe/domain -- purchase invoice limit
git add packages/domain
git commit -m "feat(cards): model installments invoices and limits"
```

### Task 3: Implement partial, account-origin, and external invoice payments

**Files:**

- Create: `packages/domain/src/cards/invoice-payment.ts`
- Create: `packages/domain/src/cards/invoice-payment.test.ts`
- Create: `apps/desktop/src/features/cards/pay-invoice-use-case.ts`
- Create: `apps/desktop/src/features/cards/pay-invoice-use-case.test.ts`
- Create: `apps/desktop/src-tauri/migrations/0006_cards.sql`
- Modify: `apps/desktop/src-tauri/src/commands/local_finance.rs`

**Step 1: Write failing domain tests**

Test total and partial payment, multiple partial payments, external payment, payment above remaining amount requiring explicit overpayment confirmation, idempotent retry, and exact limit restoration. Assert external payment has no account and no income; account-origin payment subtracts the account but creates no expense transaction.

**Step 2: Implement payment command**

```ts
export type InvoicePaymentOrigin =
  | { type: 'account'; accountId: EntityId }
  | { type: 'external' };

export interface PayInvoiceCommand {
  invoiceId: EntityId;
  amount: Centavos;
  paidAt: string;
  origin: InvoicePaymentOrigin;
  confirmOverpayment: boolean;
}
```

Return ledger postings only for account-origin payment and invoice settlement postings for both origins.

**Step 3: Prove persistence atomicity**

For account-origin payment, update account balance projection, invoice projection, limit projection, payment entity, and outbox in one Rust transaction. Inject a failure before commit and assert none remain. For external payment, assert no account row is touched.

**Step 4: Verify and commit**

```powershell
npm run test --workspace @orbe/domain -- invoice-payment
npm run test --workspace @orbe/desktop -- pay-invoice
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml invoice_payment
git add packages/domain apps/desktop
git commit -m "feat(cards): add invoice payment flows"
```

### Task 4: Build Cards page, visual card, invoice block, and expense integration

**Files:**

- Create: `apps/desktop/src/features/cards/CardsPage.tsx`
- Create: `apps/desktop/src/features/cards/CreditCardVisual.tsx`
- Create: `apps/desktop/src/features/cards/CardForm.tsx`
- Create: `apps/desktop/src/features/cards/InvoicePanel.tsx`
- Create: `apps/desktop/src/features/cards/InvoicePaymentDrawer.tsx`
- Create: `apps/desktop/src/features/cards/CardsPage.test.tsx`
- Create: `apps/desktop/src/features/cards/cards.module.css`
- Modify: `apps/desktop/src/features/transactions/ExpenseDrawer.tsx`
- Modify: `apps/desktop/src/features/dashboard/DashboardPage.tsx`

**Step 1: Write failing progressive-form tests**

No new rendering dependency is required for the visual card; implement it with semantic HTML and CSS Modules so bank-inspired styling remains fully controlled by Orbe.

When payment method becomes credit card, assert card selector and installment count appear, account selector disappears, installment preview appears before save, and invalid purchase above available limit requires explicit confirmation. Other payment methods must hide all card fields.

**Step 2: Write failing visual-card tests**

Assert bank logo top-left, network top-right, masked last four, holder, available limit bottom-left, due date bottom-right, and no decorative chip. Ensure the accessible name contains nickname and last four but not unmasked data.

**Step 3: Implement Cards page**

Include card selection, card management, current invoice, invoice history, installments, and payments. The dashboard right column shows the selected visual card and invoice block immediately below it. Use bank-inspired gradients and tokens without copying an exact physical card artwork.

**Step 4: Implement invoice payment drawer**

Offer `Conta financeira` and `Pagamento externo`, then date and amount. Explain that external payment changes invoice/limit only. Show original, paid, and remaining values before confirmation.

**Step 5: Verify and commit**

```powershell
npm run test --workspace @orbe/desktop -- CardsPage CreditCardVisual ExpenseDrawer
git add apps/desktop
git commit -m "feat(desktop): add visual cards and invoices"
```

### Task 5: Implement fixed recurrence and variable monthly reminders

**Files:**

- Create: `packages/domain/src/recurrence/recurrence.ts`
- Create: `packages/domain/src/recurrence/generate-occurrences.ts`
- Create: `packages/domain/src/recurrence/recurrence.test.ts`
- Create: `apps/desktop/src/features/recurrence/RecurrencesPage.tsx`
- Create: `apps/desktop/src/features/recurrence/RecurrenceForm.tsx`
- Create: `apps/desktop/src/features/recurrence/VariableReminderDrawer.tsx`
- Create: `apps/desktop/src/features/recurrence/recurrence-use-cases.test.ts`
- Create: `apps/desktop/src-tauri/migrations/0007_recurrence.sql`

**Step 1: Write failing generation tests**

Test monthly fixed rules, last-day clamping, start/end bounds, pause/resume, no duplicate occurrence for the same rule/month, and edit scopes `only-this | this-and-future | entire-series`. A fixed rule generates a pending expense with its known value. A variable rule generates only a reminder with no value and no balance effect.

**Step 2: Implement deterministic catch-up generation**

Generate missing months from the last generated competence through the current local month inside one transaction. Use a unique key `(ruleId, competence)` for idempotency. Never auto-settle a generated expense.

**Step 3: Build recurrence flows**

Allow monthly frequency, due day, payment method, optional end date, and pause. Opening a variable reminder asks for actual amount, then lets the user create the expense as pending or paid; paid requires an account.

**Step 4: Verify and commit**

```powershell
npm run test --workspace @orbe/domain -- recurrence
npm run test --workspace @orbe/desktop -- recurrence
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml recurrence
git add packages/domain apps/desktop
git commit -m "feat(finance): add monthly recurrence flows"
```

### Task 6: Implement optional category and subcategory budgets

**Files:**

- Create: `packages/domain/src/budgets/budget.ts`
- Create: `packages/domain/src/budgets/budget.test.ts`
- Create: `apps/desktop/src/features/budgets/BudgetsPage.tsx`
- Create: `apps/desktop/src/features/budgets/BudgetForm.tsx`
- Create: `apps/desktop/src/features/budgets/budget-query.test.ts`
- Modify: `apps/desktop/src/features/dashboard/DashboardPage.tsx`
- Create: `apps/desktop/src-tauri/migrations/0008_budgets.sql`

**Step 1: Write failing budget tests**

Test category or direct subcategory budget per month, positive integer value, configurable warning thresholds, defaults 80 and 100, settled expense consumption, no submission blocking, and no dashboard budget section when none exists.

**Step 2: Implement budget domain and query**

Return spent, limit, integer basis points used, threshold state, and overage. Avoid percentage floating-point comparisons by comparing `spent * 10_000` against `limit * thresholdBasisPoints`.

**Step 3: Build budget UI and dashboard section**

Show progress with text and color, allow month navigation and copy from prior month, and retain expense entry even beyond 100%.

**Step 4: Verify and commit**

```powershell
npm run test --workspace @orbe/domain -- budgets
npm run test --workspace @orbe/desktop -- budgets
git add packages/domain apps/desktop
git commit -m "feat(finance): add optional monthly budgets"
```

### Task 7: Implement reports and Brazilian CSV/PDF exports

**Files:**

- Create: `packages/domain/src/reports/report-model.ts`
- Create: `packages/domain/src/reports/report-calculator.ts`
- Create: `packages/domain/src/reports/report-calculator.test.ts`
- Create: `apps/desktop/src/features/reports/ReportsPage.tsx`
- Create: `apps/desktop/src/features/reports/report-query.ts`
- Create: `apps/desktop/src/features/reports/export-csv.ts`
- Create: `apps/desktop/src/features/reports/export-pdf.ts`
- Create: `apps/desktop/src/features/reports/export.test.ts`

**Step 1: Write failing report tests**

Install report rendering/export dependencies:

```powershell
npm install recharts pdf-lib --workspace @orbe/desktop
```

Cover monthly summary, income versus expense, category/subcategory, evolution, account flow/balance, card purchase/installment/invoice, and budget versus actual. Filters cover period, account, card, category, subcategory, and state. Assert invoice payments never enter expense totals and external payments never enter income.

**Step 2: Implement report calculators**

Calculators receive immutable records and return centavos plus ISO dates. Formatting occurs only in the desktop export/UI layer. Include explicit competence and occurrence date fields so card installments are not confused with purchase date.

**Step 3: Implement CSV export**

Emit UTF-8 with BOM for Excel compatibility, semicolon delimiter, CRLF, quoted fields, `DD/MM/AAAA`, and `1.234,56` values. Include a metadata preamble with report name, period, and generated timestamp, without user credentials.

**Step 4: Implement PDF export**

Create A4 documents with Orbe title, report/filters, generated date, totals, tables, page numbers, and automatic page breaks. Embed a font that supports Portuguese accents and verify text extraction in tests.

**Step 5: Build accessible reports page**

Charts require a table alternative. Exports use a save dialog and never overwrite without confirmation.

**Step 6: Verify and commit**

```powershell
npm run test --workspace @orbe/domain -- reports
npm run test --workspace @orbe/desktop -- reports export
git add packages/domain apps/desktop
git commit -m "feat(reports): add analytics and Brazilian exports"
```

### Task 8: Run cards and planning acceptance

**Files:**

- Create: `apps/desktop/e2e/cards.spec.ts`
- Create: `apps/desktop/e2e/recurring.spec.ts`
- Create: `apps/desktop/e2e/reports.spec.ts`
- Create: `docs/testing/financial-invariants.md`

**Step 1: Automate realistic card usage**

Create a card, buy R$ 100,00 in three installments, assert R$ 33,33 / R$ 33,33 / R$ 33,34, verify full R$ 100,00 limit commitment, pay R$ 40,00 from an account, pay R$ 20,00 externally, and verify invoice, account, report, and available limit values.

**Step 2: Automate recurrence and budget usage**

Generate a fixed pending rent expense, fill a variable energy reminder, settle only one, configure an 80/100 budget, and verify the dashboard states.

**Step 3: Verify exports**

Export filtered CSV/PDF to a temporary directory, parse both, and assert Brazilian dates/values plus absence of invoice-payment duplication.

**Step 4: Run milestone gate**

```powershell
npm run test --workspace @orbe/domain
npm run test --workspace @orbe/desktop
npm run test:e2e --workspace @orbe/desktop -- cards recurring reports
```

Expected: all pass with no skipped money property tests.

**Step 5: Review and commit**

Invoke `web-design-guidelines`, `superpowers:requesting-code-review`, and `superpowers:verification-before-completion`.

```powershell
git add apps/desktop/e2e docs/testing/financial-invariants.md
git commit -m "test(finance): prove card recurrence and report invariants"
```
