# Meshlyy isolated inventory validation

This suite is **manual only**. Never include it in push-triggered CI and never use a production store, production SKU, or TODAYZ resources.

## Environment prerequisites
- A separate Supabase staging project with the same Meshlyy schema, RLS, RPC functions, and cron jobs as the target environment.
- A disposable retailer store owned by the E2E retailer account.
- A distinct E2E customer account.
- A disposable active SKU with exactly **one** available unit.
- No active POS hold for the retailer and no outstanding cart/pickup reservations for this SKU.
- Valid local environment variables listed in `tests/inventory-concurrency.manual.ts`.
- Never paste credentials into GitHub or chat. Use local environment variables.

## Read-only discovery

From the repository:

```powershell
npx.cmd playwright test --config=playwright.concurrency.config.ts --list
```

This lists tests and does not mutate inventory.

## Controlled race

Only after confirming the Supabase URL belongs to the **staging project** and the SKU/store are disposable:

```powershell
$env:E2E_ALLOW_CONCURRENCY = "YES"
$env:E2E_DISPOSABLE_STORE_CONFIRMED = "YES"
npx.cmd playwright test --config=playwright.concurrency.config.ts --workers=1 --reporter=line
Remove-Item Env:E2E_ALLOW_CONCURRENCY -ErrorAction SilentlyContinue
Remove-Item Env:E2E_DISPOSABLE_STORE_CONFIRMED -ErrorAction SilentlyContinue
```

**Warning:** The race test changes staging inventory and may create a pickup reservation. It does not automatically clean up. Inspect the winning hold/reservation and use the appropriate authorized release/cancel workflow. Do not rerun until the SKU is restored to exactly one unit and all prior holds/reservations are cleared.

## Expected result
Exactly one contender succeeds and available stock is zero. If neither succeeds, or both succeed, the test fails. This verifies one race execution, not a guarantee under load.

## Additional scenarios to implement after staging is available

1. **Expiration:** Create a one-unit cart hold, wait until expiry plus cron allowance, confirm the hold is expired and stock returns to one; repeat with POS hold. Verify repeated expiry processing never increments stock twice.
2. **Duplicate checkout:** Complete a single POS hold twice using the *same hold ID* and verify the returned sale ID is identical and only one sale record exists. Requires separate authorization for actual staging sales.
3. **Simultaneous checkout:** Fire two `complete_pos_bill_hold` requests with the same active hold ID; both should resolve to the same sale ID, with exactly one sale record and no further stock deduction.
4. **Two-customer contention:** Two separate customer accounts request the last unit simultaneously. Exactly one should succeed.
5. **Cart confirmation:** Repeated `confirm_cart_hold` calls must return the same reservation ID, with no second deduction.
6. **Expired cart confirmation bug:** Confirm an expired cart hold and verify eventual stock recovery by cron. The current implementation calls release then raises an exception, so the release in that transaction rolls back. Fix and retest before launch.

All tests must assert the final stock and persisted transaction counts, not only API success codes. Use fresh disposable SKUs/holds per scenario to avoid cross-test interference.

## Release gate

Do not declare 5,000-user readiness based on this suite. Next steps include repeated contention tests, multi-product deadlock checks, performance testing in staging, and monitoring database latency/errors.
