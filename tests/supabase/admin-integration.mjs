import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomBytes, randomUUID } from 'node:crypto'
import { localAuth, sql } from './session-fixture.mjs'
import { verifyCatalogue } from './catalogue.mjs'

const { account, client, enroll, otp, owner, url, anonKey } = await localAuth()
const admin = await account()
const verified = await enroll(admin.api)
const migration = new URL('../../supabase/migrations/20261126183000_require_verified_admin_mfa.sql', import.meta.url)

const rpc = async (api, name, args) => {
  const response = await api.rpc(name, args)
  assert.ok(!response.error, `${name} failed (${response.error?.code ?? ''})`)
  return response.data
}
const allowed = api => rpc(api, 'store_is_admin')
const checkId = value => { assert.match(value, /^[a-f0-9-]{36}$/); return value }
const adminId = checkId(admin.id)
const factorId = checkId(verified.factorId)
if (sql("select count(*) from information_schema.columns where table_schema='private' and table_name='store_admins' and column_name='approved_factor_id'") === '0') {
  sql(`insert into private.store_admins(user_id,mfa_required) values('${adminId}',true)`)
  assert.equal(await allowed(admin.api), true)
  sql(await readFile(migration, 'utf8'))
  assert.equal(await allowed(admin.api), true, 'Existing verified manager retains access during migration')
} else {
  const permit = checkId(sql(`select private.store_approve_admin('${adminId}','${factorId}')`))
  sql(`select private.store_activate_admin('${adminId}','${permit}')`)
}
console.log('PASS: verified administrator and exact confirmed factor')

const guest = client()
assert.ok((await guest.rpc('store_is_admin')).error)
const ordinary = await account()
assert.equal(await allowed(ordinary.api), false)
const passwordOnly = client()
assert.ok(!(await passwordOnly.auth.signInWithPassword({ email: admin.email, password: admin.password })).error)
assert.equal(await allowed(passwordOnly), false)
assert.equal((await rpc(passwordOnly, 'store_admin_auth_state')).factorId, factorId)
const wrongCode = otp(verified.secret) === '000000' ? '111111' : '000000'
assert.ok((await passwordOnly.auth.mfa.challengeAndVerify({ factorId, code: wrongCode })).error)
assert.equal(await allowed(passwordOnly), false)
assert.ok((await passwordOnly.rpc('store_admin_tasks')).error)
assert.deepEqual(await rpc(admin.api, 'store_admin_tasks') !== null, true)
assert.throws(() => sql(`update private.store_admins set mfa_required=false where user_id='${adminId}'`))
console.log('PASS: anonymous, ordinary Auth and administrator AAL1 are denied')

const pending = await account()
const pendingId = checkId(pending.id)
assert.equal(await allowed(pending.api), false)
const pendingFactor = await enroll(pending.api)
const pendingFactorId = checkId(pendingFactor.factorId)
assert.equal(await allowed(pending.api), false, 'Auth enrollment alone does not grant a role')
assert.throws(() => sql("set role authenticated; select private.store_approve_admin(null,null);"))
const expired = checkId(sql(`select private.store_approve_admin('${pendingId}','${pendingFactorId}')`))
sql(`update private.store_admin_enrollment set expires_at=now()-interval '1 second' where id='${expired}'`)
assert.throws(() => sql(`select private.store_activate_admin('${pendingId}','${expired}')`))
const approval = checkId(sql(`select private.store_approve_admin('${pendingId}','${pendingFactorId}')`))
assert.throws(() => sql(`select private.store_activate_admin('${ordinary.id}','${approval}')`))
sql(`select private.store_activate_admin('${pendingId}','${approval}')`)
assert.throws(() => sql(`select private.store_activate_admin('${pendingId}','${approval}')`))
assert.equal(await allowed(pending.api), true)
await enroll(pending.api)
assert.equal(await allowed(pending.api), false, 'A verified but unapproved TOTP factor is insufficient')
sql(`select private.store_begin_admin_recovery('${pendingId}')`)
assert.equal(sql(`select count(*) from auth.sessions where user_id='${pendingId}'`), '0')
const recovered = client()
assert.ok(!(await recovered.auth.signInWithPassword({ email: pending.email, password: pending.password })).error)
assert.equal(await allowed(recovered), false)
assert.equal(sql(`select string_agg(event,',' order by id) from private.store_admin_access_events where user_id='${pendingId}'`), 'approved,approved,activated,recovery_started')
console.log('PASS: owner-only approval, account binding, expiry, single use and audited recovery')

const bucket = 'payment-screenshots'
const path = 'isolated/' + randomUUID() + '.png'
const png = new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9xBhcAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' })
assert.ok(!(await owner.storage.from(bucket).upload(path, png)).error)
assert.ok((await ordinary.api.storage.from(bucket).createSignedUrl(path,30)).error)
assert.ok((await passwordOnly.storage.from(bucket).createSignedUrl(path,30)).error)
assert.ok(!(await admin.api.storage.from(bucket).createSignedUrl(path,30)).error)
assert.deepEqual((await ordinary.api.from('orders').select('id')).data, [])
console.log('PASS: real RLS, RPC and Storage enforce the AAL2 boundary')

const buyers = ['900009900', '900009901'].map(id => ({ id, hash: randomBytes(32).toString('hex') }))
for (const buyer of buyers) {
  await rpc(owner, 'store_register_session', { p_hash: buyer.hash, p_user: buyer.id })
  assert.equal(await rpc(owner, 'store_validate_session', { p_hash: buyer.hash, p_user: buyer.id }), true)
}
assert.equal(await rpc(owner, 'store_validate_session', { p_hash: buyers[0].hash, p_user: buyers[1].id }), false)
console.log('PASS: synthetic customer sessions remain scoped to their own customer')

await verifyCatalogue(admin.api, owner, guest)

const retiredAccessToken = verified.access.access_token
const sessionId = checkId(JSON.parse(Buffer.from(retiredAccessToken.split('.')[1], 'base64url')).session_id)
assert.ok(!(await admin.api.auth.signOut({ scope: 'local' })).error)
assert.equal(sql(`select count(*) from auth.sessions where id='${sessionId}'`), '0')
assert.equal(await allowed(passwordOnly), false)
const afterRevocation = await fetch(url + '/rest/v1/rpc/store_is_admin', {
  method: 'POST',
  headers: { apikey: anonKey, Authorization: 'Bearer ' + retiredAccessToken, 'Content-Type': 'application/json' },
  body: '{}',
})
if (afterRevocation.ok) assert.equal(await afterRevocation.json(), false)
else assert.ok([401, 403].includes(afterRevocation.status))
console.log('PASS: local Supabase Auth removes the server session on sign out')
