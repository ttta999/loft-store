import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { localAuth } from './session-fixture.mjs'

// Require the same loopback and Docker-context checks as the integration tests.
await localAuth()
const localDatabase = 'supabase_db_loft-security-local'
const secondary = 'loft_schema_restore_' + randomBytes(6).toString('hex')
const docker = (command, input) => execFileSync('docker', ['exec', '-i', localDatabase, ...command], {
  input, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10_000_000,
})
const psql = (database, query) => docker(['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
  '-U', 'postgres', '-d', database], query).toString().trim()

const namespaces = ['public', 'private', 'auth', 'storage']
const archive = docker(['pg_dump', '-U', 'postgres', '--schema-only', '--no-owner', '-Fc',
  ...namespaces.flatMap(namespace => ['--schema', namespace]), 'postgres'])
docker(['createdb', '-U', 'postgres', '--template', 'template0', secondary])
try {
  psql(secondary, `drop schema public;
    create schema extensions;
    create extension if not exists pgcrypto with schema extensions;
    create extension if not exists "uuid-ossp" with schema extensions;`)
  const restore = spawnSync('docker', ['exec', '-i', localDatabase, 'pg_restore', '-U', 'supabase_admin',
    '--exit-on-error', '--single-transaction', '--no-owner', '-d', secondary], { input: archive, encoding: 'utf8' })
  if (restore.status !== 0) {
    throw new Error(restore.stderr.split('\n').find(line => line.startsWith('pg_restore: error:')) || 'Schema restore failed')
  }
  const fingerprint = `
    select json_build_object(
      'application_tables',(select count(*) from information_schema.tables where table_schema in ('public','private')),
      'policies',(select count(*) from pg_policies where schemaname in ('public','private','storage')),
      'admin_gate',pg_get_functiondef('public.store_is_admin()'::regprocedure),
      'client_update',has_table_privilege('authenticated','public.products','UPDATE')
    );`
  assert.deepEqual(JSON.parse(psql(secondary, fingerprint)), JSON.parse(psql('postgres', fingerprint)))
  console.log('PASS: restored local schema in a disposable database with matching tables, RLS, MFA guard and catalogue ACL')
} finally {
  docker(['dropdb', '-U', 'postgres', secondary])
}
