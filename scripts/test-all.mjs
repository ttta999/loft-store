import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'
const admin = resolve(process.env.LOFT_ADMIN_ROOT || loadEnv('e2e', process.cwd(), 'LOFT_').LOFT_ADMIN_ROOT || '../loft-store-admin')
if (!existsSync(resolve(admin, 'package.json'))) throw new Error('Set LOFT_ADMIN_ROOT to the admin checkout')
const env = { ...process.env, LOFT_ADMIN_ROOT: admin }
for (const args of [['test'], ['test', '--prefix', admin], ['run', 'build'], ['run', 'build', '--prefix', admin], ['run', 'test:e2e']]) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { stdio: 'inherit', env })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
