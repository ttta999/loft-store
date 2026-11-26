# Isolated Supabase security checks

Run this from the Store repository. Use a local Docker context and a fresh temporary directory. The commands below use Supabase CLI 3.4.0 and test ports 56321 and 56322. Docker Desktop may require adding its CLI directory to the shell PATH.

```sh
mkdir -p /tmp/loft-security-local
supabase init --workdir /tmp/loft-security-local --agent no
```

In the generated `/tmp/loft-security-local/supabase/config.jsonc`, set `project_id` to `loft-security-local`, `api.port` to `56321` and `db.port` to `56322`. Set both `auth.mfa.totp.enroll_enabled` and `auth.mfa.totp.verify_enabled` to `true`. Keep this generated config and all credentials outside Git. Leave the project unlinked.

```sh
docker network create --driver bridge loft-security-loopback
supabase start --workdir /tmp/loft-security-local --network-id loft-security-loopback --agent no \
  -x realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
node tests/supabase/bind-loopback.mjs
docker restart supabase_auth_loft-security-local supabase_rest_loft-security-local supabase_storage_loft-security-local
node tests/supabase/bootstrap.mjs
npm install --prefix /tmp/loft-security-local --ignore-scripts --no-audit --no-fund otpauth@9.4.1
node tests/supabase/admin-integration.mjs
node tests/supabase/restore-schema.mjs
LOFT_ADMIN_ROOT=/path/to/loft-store-admin node tests/supabase/logout-browser.mjs
```

CLI 3.4.0 can initially publish ports to all interfaces. Before loading fixtures, the bind script explicitly restricts the two published ports of this stack to loopback. On each restart, bind the ports again before running tests. Check Auth health after restarting the dependent containers and before using the API. Keep the Vite server on loopback too.

Bootstrap uses the live provider Auth, Storage and REST schemas, a synthetic pre-migration application schema and the historical SQL files. It skips the historical account and payment fixtures and provides synthetic substitutes. All LOFT cron jobs are inactive and the local `net.http_post` is inert. No workers, Telegram credentials or production URLs are used for outbound requests. The Auth test installs the pending MFA migration after creating an enrolled synthetic administrator. It can also run against a test stack that already has the migration. The browser test launches the Admin checkout with only the local API key.

PGlite remains useful for fast regressions. It simulates provider tables and cannot replace these Auth, Storage or concurrent PostgreSQL checks.

The restore test streams a schema-only archive into another disposable database in the same local container and compares its tables, policies, role grants and administrative guard. It does not include account, factor, session or application rows.

Stop only this project and retain its synthetic volumes with:

```sh
supabase stop --workdir /tmp/loft-security-local --project-id loft-security-local --agent no
```
