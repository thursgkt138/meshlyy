# Meshlyy launch execution board — 2026-11-06

Scope: Meshlyy only. Pickup-only. Do not access or change TODAYZ resources. No production database writes, deployment, schema restore, or inventory-mutating tests without explicit approval.

## Status meanings
- Verified: observed passing test or read-only result.
- Implemented / unverified: code exists, but full behavior not proven.
- Blocked: prerequisite or known defect.
- Planned: no verified implementation.

## A — Staging first (P0)
- [x] Create separate Supabase staging project: kbcdrrvyjfflgeufqymf (user confirmed).
- [x] Confirm staging public schema has no base tables (user confirmed).
- [ ] Export schema-only structure from original Meshlyy database using read-only credentials and review for secrets, ownership/roles, extensions, and Supabase-managed schemas. Do not transfer rows.
- [ ] Reconcile schema with repository SQL and order dependencies: extensions, tables, indexes, RLS, functions, triggers, grants, realtime publication, cron.
- [ ] Review proposed staging migration and obtain explicit approval before executing it.
- [ ] Create synthetic retailer and customer identities and disposable store/SKU in staging only.
- [ ] Verify staging API URL and keys remain isolated from production.
- [ ] Validate stock holds, release, expiration, idempotency, and simultaneous POS/pickup requests with explicit opt-in.
- [ ] Fix expired confirm_cart_hold transaction rollback; verify regression.
- [ ] Check staging cron execution and stock restoration (not merely cron success).

## B — Full read-only repo audit (P0)
- [ ] Inventory routes/components for consumer and retailer; distinguish demos from live Supabase flows.
- [ ] Inventory SQL/RPC definitions, RLS/grants, auth flows, order status transitions, cron.
- [ ] Run build/typecheck/test listing in isolated environment; inspect dependency declaration. Do not claim tests passed until executed.
- [ ] Trace customer discovery -> cart -> request -> retailer accept -> code -> verify -> collected -> inventory/history.
- [ ] Trace offline POS checkout vs online hold, simultaneous checkout, cancellation and expiry.
- [ ] Verify mobile/PWA behavior, error/empty states, accessibility, images and catalog licensing.
- [ ] Record every finding with evidence, owner, acceptance criterion, and release blocker status.

## C — All P0 release gates
- [ ] Consumer authentication, location, store discovery, product search, pricing, availability, cart, checkout, order status.
- [ ] Retailer onboarding, store on/off, catalog, inventory, POS, accept/reject, pickup code and collection completion.
- [ ] Prevent overselling; no double stock deduction/return; idempotent requests; correct one-minute holds and pickup expiry.
- [ ] Authorization/RLS isolation, input validation, abuse limits, secrets hygiene.
- [ ] Production/staging environment separation, backups and restore rehearsal, monitoring and alerting.
- [ ] Payment model and refunds clearly defined for pickup-only MVP; no unverified payment promises.
- [ ] Privacy/terms/merchant agreements and catalog image/data licensing reviewed.
- [ ] End-to-end regression suite and load tests at a defined concurrent-user/transaction target; 5,000 registered users alone is not a capacity metric.
- [ ] Controlled launch checklist, rollback plan, support process, live-store inventory readiness.
- [ ] Launch approval only after all critical acceptance tests pass.

## Known evidence / gaps
- Staging is created but schema migration has not run.
- Original project reported three per-minute expiration cron jobs and successful recent executions; restoration correctness remains unverified.
- A historical confirm_cart_hold expired-path bug raises after release, rolling back the release.
- Manual concurrency test and Playwright config exist on test/inventory-concurrency-safety; no authorized execution yet.
- Retailer dashboard, orders, POS, stock pages exist on the branch; feature correctness remains unverified.
- Branch package.json lacks @playwright/test and @supabase/supabase-js declarations despite test imports; verify dependency strategy.
- Home page imports DemoProvider, Discovery, BasketDemo, PickupDemo and RetailerDemo; verify consumer production routes separately rather than treating demo as real checkout.

## Immediate next action
Run `npx.cmd supabase --version` locally and report output. Then prepare a read-only, schema-only export plan for review. Never paste database passwords or service-role keys into chat/GitHub.
