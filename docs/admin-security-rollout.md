# Mandatory administrator MFA rollout

The only new production SQL file for this stage is `supabase/migrations/20261126183000_require_verified_admin_mfa.sql`. The current catalogue ACL revocation remains in place. Apply the new migration only with separate production authorization.

## Preflight

1. Verify the current Store and Admin deployment SHAs and record their exact Vercel deployment IDs. Verify that both variants of the Admin frontend can complete password and TOTP login on the isolated staging stack.
2. Review Supabase backup and restore access. Record the backup timestamp and recovery objective. Prove restoration in an approved isolated environment. A local schema restore does not verify a production backup.
3. Independently confirm each authorized administrator's identity and have that administrator complete a fresh password and TOTP sign-in. Verify the legitimate session is AAL2 and uses the approved TOTP factor in `auth.sessions.factor_id`. Record only the outcome. Keep an infrastructure owner available who can use the recovery procedure below.
4. Verify all existing allowlisted administrators are confirmed Auth users with `mfa_required=true` and exactly one verified TOTP factor. A missing or ambiguous factor blocks the migration. Resolve it through the owner procedure under separate approval. Keep the existing factors, passwords and sessions intact during rollout.

## Application order

1. Apply the verified SQL file in a transaction, while a known-good AAL2 session is available. The migration adds an approved-factor reference, a mandatory flag constraint, an owner-only short-lived approval table and a private access-event journal. It replaces the two existing access functions in place so their RLS and RPC callers inherit the new gate.
2. Verify the existing administrator can still sign in with a freshly issued AAL2 session. Confirm expected deauthorization for AAL1 and the authenticated RPC/Storage boundary using approved read-only smoke checks. Confirm public catalogue reads and the historical DML revocation.
3. Publish the compatible Admin bundle. The current verified-factor-only UI remains compatible with the migration while each existing manager has exactly one verified factor. The new UI understands the approved factor identifier and accepts a verified factor when the older schema omits that field. The Store runtime has no associated schema-facing change.
4. Check Admin navigation, catalogue, orders, private documents and the existing cache. Test real logout only with explicit authorization for the affected session. Re-run the access review and confirm that protected operations still call the shared guard.

## New administrators and recovery

An ordinary Auth account may enroll a factor through Supabase. Administrative authority is granted only by the infrastructure owner. Independently verify the person's identity and supervise enrollment of their verified TOTP factor. Match the approved account and factor IDs through owner-only metadata, without recording passwords, TOTP secrets, JWTs or codes. Under the owner SQL role, call `private.store_approve_admin` with the account and verified factor IDs. Use the returned approval in `private.store_activate_admin` for the same account within 15 minutes. The operation consumes the approval once. Both steps write private audit events. The identifier does not grant access through PostgREST or Auth.

For loss of a factor, verify identity independently and call `private.store_begin_admin_recovery` as the owner. It removes the role, cancels outstanding approvals and revokes the account's sessions in the same transaction, then records the event. Use Supabase Auth's sanctioned owner recovery controls when necessary to reset the password or remove a lost factor. Supervise replacement enrollment and issue a new short-lived approval. Confirm a fresh AAL2 session before restoring normal operation. Preserve the provider's operator audit trail in addition to the database events.

## Rollback

Before the migration commits, SQL failure rolls back that transaction. Pause deployment and resolve the failed precondition. After it commits, revert the frontend to a tested compatible deployment if necessary. Keep the strict AAL2 and approved-factor guard in place. Any SQL correction must be a reviewed forward migration that retains fail-closed access, the approval journal and the existing catalogue ACLs. Use the infrastructure-owner recovery flow for lockout. Never restore a production database in place as part of a frontend rollback.
