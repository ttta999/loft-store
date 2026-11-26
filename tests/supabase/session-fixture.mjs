import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const container = 'supabase_db_loft-security-local'
const workdir = process.env.LOFT_LOCAL_SUPABASE_DIR ?? '/tmp/loft-security-local'
const endpoint = 'http://127.0.0.1:56321'

export function sql(input) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
    '-U', 'postgres', 'postgres'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
}

export async function localAuth() {
  const dockerEndpoint = execFileSync('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], { encoding: 'utf8' })
  assert.match(dockerEndpoint.trim(), /^unix:\/\//, 'Use a local Docker context')
  for (const [target, internal, port] of [[container, '5432/tcp', '56322'],
    ['supabase_kong_loft-security-local', '8000/tcp', '56321']]) {
    const bindings = execFileSync('docker', ['inspect', '--format', '{{json .NetworkSettings.Ports}}', target], { encoding: 'utf8' })
    assert.deepEqual(JSON.parse(bindings)[internal], [{ HostIp: '127.0.0.1', HostPort: port }])
  }
  const status = JSON.parse(execFileSync('supabase', ['status', '--workdir', workdir, '--agent', 'no', '-o', 'json'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }))
  assert.equal(status.API_URL, endpoint)
  const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  const { TOTP, Secret } = await import(pathToFileURL(workdir + '/node_modules/otpauth/dist/otpauth.esm.js').href)
  const owner = createClient(endpoint, status.SERVICE_ROLE_KEY, opts)
  const client = () => createClient(endpoint, status.ANON_KEY, opts)
  async function account() {
    const suffix = randomBytes(10).toString('hex')
    const email = 'fixture-' + suffix + '@example.test'
    const password = randomBytes(24).toString('base64url')
    sql(`insert into private.store_registration_invites(email_hash,expires_at)
      values(encode(extensions.digest('${email}','sha256'),'hex'),now()+interval '5 minutes');`)
    const created = await owner.auth.admin.createUser({ email, password, email_confirm: true })
    assert.ok(!created.error, `Synthetic account must be created by local Auth (${created.error?.status ?? ''} ${created.error?.code ?? ''})`)
    const api = client()
    assert.ok(!(await api.auth.signInWithPassword({ email, password })).error, 'Synthetic password login')
    return { id: created.data.user.id, email, password, api }
  }
  async function verifyTotp(api, factorId, secret) {
    const result = await api.auth.mfa.challengeAndVerify({ factorId, code: otp(secret) })
    assert.ok(!result.error, 'Fresh TOTP challenge must succeed')
    return result.data
  }
  async function enroll(api) {
    const result = await api.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Fixture ' + randomBytes(4).toString('hex') })
    assert.ok(!result.error, `Local TOTP enrollment (${result.error?.code ?? ''})`)
    const access = await verifyTotp(api, result.data.id, result.data.totp.secret)
    return { factorId: result.data.id, secret: result.data.totp.secret, access }
  }
  function otp(secret) {
    return new TOTP({ secret: Secret.fromBase32(secret) }).generate()
  }
  return { account, client, enroll, verifyTotp, otp, owner, url: endpoint, anonKey: status.ANON_KEY }
}
