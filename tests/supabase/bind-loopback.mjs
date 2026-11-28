import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { request } from 'node:http'

const network = 'loft-security-loopback'
const endpoint = execFileSync('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], { encoding: 'utf8' }).trim()
assert.match(endpoint, /^unix:\/\//, 'Use a local Docker context')
const socketPath = endpoint.slice('unix://'.length)

function engine(method, path, body, type = 'application/json') {
  return new Promise((resolve, reject) => {
    const req = request({ socketPath, path, method, headers: body ? { 'Content-Type': type, 'Content-Length': body.length } : {} }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(Buffer.concat(chunks))
        else reject(new Error(`Docker returned HTTP ${res.statusCode} for ${method} ${path}`))
      })
    })
    req.on('error', reject)
    req.end(body)
  })
}

for (const [service, containerPort, hostPort] of [['db', '5432/tcp', '56322'], ['kong', '8000/tcp', '56321']]) {
  const name = `supabase_${service}_loft-security-local`
  const path = '/containers/' + name
  const state = JSON.parse(await engine('GET', path + '/json'))
  const bindings = state.NetworkSettings.Ports[containerPort] ?? []
  assert.deepEqual(Object.keys(state.NetworkSettings.Networks), [network])
  assert.deepEqual(Object.keys(state.HostConfig.PortBindings), [containerPort])
  assert.equal(state.HostConfig.PortBindings[containerPort][0].HostPort, hostPort)
  if (bindings.length === 1 && bindings[0].HostIp === '127.0.0.1' && bindings[0].HostPort === hostPort) continue

  // The CLI copies local Kong configuration, fixtures and TLS files into this directory.
  const configArchive = service === 'kong'
    ? await engine('GET', path + '/archive?path=/home/kong/.')
    : undefined
  const backup = name + '_unbound_backup'
  await engine('POST', path + '/stop?t=10')
  await engine('POST', path + '/rename?name=' + backup)
  try {
    // Release the old endpoint's Docker DNS aliases before creating its replacement.
    await engine('POST', `/networks/${network}/disconnect`, Buffer.from(JSON.stringify({ Container: backup })))
    const host = { ...state.HostConfig, PortBindings: { [containerPort]: [{ HostIp: '127.0.0.1', HostPort: hostPort }] } }
    await engine('POST', '/containers/create?name=' + name, Buffer.from(JSON.stringify({
      ...state.Config,
      HostConfig: host,
      NetworkingConfig: { EndpointsConfig: { [network]: { Aliases: state.NetworkSettings.Networks[network].Aliases } } },
    })))
    if (configArchive) await engine('PUT', path + '/archive?path=/home/kong', configArchive, 'application/x-tar')
    await engine('POST', path + '/start')
    const live = JSON.parse(await engine('GET', path + '/json'))
    assert.deepEqual(live.NetworkSettings.Ports[containerPort], [{ HostIp: '127.0.0.1', HostPort: hostPort }])
    // Remove only the superseded container. Its database volume was reused.
    await engine('DELETE', '/containers/' + backup)
  } catch (error) {
    console.error(`Loopback setup stopped. Inspect only the dedicated ${name} and ${backup} containers before retrying.`)
    throw error
  }
  console.log(`${service}: 127.0.0.1:${hostPort}`)
}
