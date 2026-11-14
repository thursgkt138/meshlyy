# Emerald application redesign — verification gate

Branch: `design/emerald-app-unification`. Reference: emerald landing-page styling on `feature/retailer-catalog-v2`.

## Changes in this branch
- Global colour, focus, card and motion tokens.
- Retailer shell and shared editorial page introduction for dashboard, catalogue, stock, orders, and POS.
- Retailer login and onboarding split-screen composition.
- Consumer `/pickup-live` discovery hero and responsive shopping styling.

These changes are presentation-only. No SQL migrations, deployment, inventory mutations, or order API changes were made.

## Required verification before merge

### 1. Build and static checks
```powershell
npm install
npm run typecheck
npm run build
npm run test:preview
```
Do not mark green until commands have actually run. Current GitHub edits have **not** been built in this environment.

### 2. Visual review
Review at widths 375, 768, 1024 and 1440px:
- `/`: latest landing-page gradients remain intact.
- `/pickup-live`: search, product listings, basket, reservation drawer, sign-in, mobile cart, empty/error/loading states.
- `/retailer/login`, `/retailer/signup`, `/retailer/onboarding`: form visibility, focus, validation, submit, small-screen stacking.
- `/retailer/dashboard`, `/retailer/catalog`, `/retailer/stock`, `/retailer/orders`, `/retailer/pos`: no overflow, working action controls, clear navigation, readable statuses, sticky/mobile bars.
- `/retailer/sales`, store management, help, settings and assistant: inspect for older design patterns requiring component-level redesign.
- Keyboard-only navigation and prefers-reduced-motion; ensure no decorative visuals cover interactive elements.

### 3. Staging-only functional regression
Use isolated staging project with synthetic inventory, never production:
- Retailer signup/login/onboarding and closed-by-default shop.
- Catalogue add/edit product and price.
- Stock adjustment with audit trail.
- POS hold, checkout, idempotent completion, stock decrement.
- Consumer cart hold and pickup confirmation; no double deduction.
- Accept/reject/expire, pickup verification and collected status.
- Mobile cart and drawer keyboard interaction.
- Concurrent last-item POS vs consumer attempt and expiry release.

**Stop if staging migration or synthetic accounts are not ready.** Do not run mutating tests against production.

## Known gaps
- Consumer journey beyond existing `/pickup-live` is not fully component-redesigned.
- Sales/settings/help/assistant/store pages are not individually reworked yet.
- No screenshots, browser visual regression, or build output has been captured in this session.
- Repository package manifest does not declare Playwright; add it only with a reviewed test setup.
