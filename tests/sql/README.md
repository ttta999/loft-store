# Isolated Store 2.0 database checks

```sh
npm ci --prefix tests/sql --ignore-scripts
node scripts/test-store2-db.mjs
```

Runs eight additive Store 2.0 migrations in a new, in-memory PGlite PostgreSQL database. No Supabase URL, access token, Docker daemon, network connection or persistent database is used. Every fixture is synthetic. The `net.http_post` and Cron definitions in the baseline are inert: they cannot send messages or start real background tasks.

The baseline contains only the table/column shapes used by these migrations, minimal local auth/MFA stubs and the existing atomic product-save function. It does not reproduce every production constraint or the entire financial schema. These checks supplement the existing financial/API/browser regression suites, not replace them.

The PGlite test dependency has a separate pinned lockfile and is not a runtime dependency of either application. `LOFT_PGLITE_ROOT` optionally points to another local PGlite `dist/index.js` installation.
