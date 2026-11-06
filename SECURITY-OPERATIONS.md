# Security architecture — 6 November 2026

The storefront and admin appearance and existing Telegram notification templates are preserved. Runtime frontend package versions are unchanged.

## Deployment order

1. Apply `supabase/migrations/20261106154106_security_architecture.sql`. It adds the new transactions, policies and maintenance functions while retaining legacy write/stock grants temporarily. The new maintenance job starts disabled.
2. Configure the existing manager recipient explicitly in `private.store_notification_config` (`manager_chat_id`). The server first uses `TELEGRAM_MANAGER_CHAT_ID` if configured, otherwise this private setting; there is no hardcoded recipient in source. Missing configuration fails closed and leaves the message queued.
3. Deploy the compatible storefront and admin commits. Both require the existing server-only `SUPABASE_SERVICE_ROLE_KEY`; it must never have a `VITE_` prefix. Storefront also requires its existing two Telegram bot tokens.
4. Verify both deployments, then apply `20261106161926_enforce_security_architecture.sql`. This removes direct admin writes affecting orders/inventory, removes public raw-stock reads, and enables the maintenance job.

The maintenance bearer is generated in Supabase Vault. `pg_cron`/`pg_net` call the fixed production `/api/maintenance` URL. The HTTP handler authenticates against a service-only RPC before touching queues or storage. The bearer is not committed, returned to customers, or stored in a browser. No new hosting plan or external library is required.

## Inventory and payments

- Product, colour and size edits commit as one transaction. Colour/variant IDs are retained. A snapshot of the product version and inventory rejects stale edits instead of overwriting concurrent purchases.
- Reserved colours cannot be removed. Reserved zero-stock sizes remain addressable for later stock return.
- Products referenced by unreleased orders cannot be physically deleted; the existing visibility action remains available.
- Order state transitions and special-request changes are checked in database RPCs under customer/row locks. Cancellation cannot be reversed by assigning a status.
- Marking an order with **payment on receipt** as **issued** records the received payment and timestamp in the same transaction and existing payment audit. Staff should perform this existing action only when handing over the goods and receiving the payment. Historical orders are not reclassified.
- A newly submitted receipt has a 24-hour review deadline. Replacement receipts do not extend it. A receipt image is not proof of a bank transfer. Managers confirm payment against the actual bank receipt within that interval. Expired unpaid orders release stock once. Existing historical receipt reservations are not retroactively expired.

## Sessions, registration and files

- Customer bearer tokens are kept only in memory and stored server-side only as hashes. `store_admin_revoke_customer_sessions(p_user)` invalidates a customer's sessions. Access fails closed if the registry is unavailable.
- Existing admin login and verified MFA remain unchanged. Public Supabase user creation is blocked by a database guard. An MFA-authorized admin can allow a specific email to register for 24 hours using `store_admin_allow_registration(p_email)`; this does **not** grant administrator rights. The managed Supabase signup toggle was not changed because management access was unavailable.
- Private image uploads remain limited to 2 MB, with a 50 MB rolling daily and 200 MB stored/reserved quota per customer. Pending uploads reserve quota atomically. Special requests are limited to five unresolved and thirty daily submissions per customer.
- Automatic storage cleanup only considers uploads registered by the new architecture, older than 24 hours, and not referenced by an order or request. It marks them unavailable for new attachments before deletion. Legacy files and linked receipts are preserved. Physical deletion goes through the Storage API.
- Product images accept JPEG, PNG, WebP and AVIF up to 10 MB. Anonymous readers receive availability instead of exact stock. Unpublished catalogue rows are filtered in the database.

## Notifications and monitoring

Creating orders/requests wakes a background worker without waiting for Telegram. Admin state changes and their existing message text are recorded atomically. Immediate delivery and retries share the same event key/claim, preventing two concurrent workers from sending the same claim. Delivery is at-least-once: a network failure after Telegram accepted a message but before acknowledgment can still cause a duplicate. Telegram offers no send-message idempotency key.

Failed sends remain queued and retry with bounded backoff (up to one hour); they are not discarded after a fixed attempt count. Inspect pending message age/attempts and Vercel worker errors. The existing reservation task and new housekeeping task should remain successful in `cron.job_run_details`. Never log bearers, bot tokens, receipt links or customer addresses.

## Validation and limits

`npm test`, production builds and isolated Playwright flows cover both repositories. `tests/security-architecture.sql` and the existing `db/*verify*.sql` suites must be run in rollback transactions; they use disposable fixtures and never send real messages. The CSP is checked against production bundles with all external requests mocked. `npm audit` reports zero known vulnerabilities in both lockfiles; the compatible minimatch override closes the remaining tooling advisory.

Supabase leaked-password checking remains unavailable on the current plan. Unique administrator passwords and enforced MFA are still required. This change does not purchase a plan, change personal GitHub/Vercel credentials, or claim a verified backup-restore procedure. Those account/operational checks require separate access. Do not weaken MFA to work around access problems.
