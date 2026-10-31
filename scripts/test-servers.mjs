import { createServer, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/postcss'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const admin = resolve(process.env.LOFT_ADMIN_ROOT || loadEnv('e2e', process.cwd(), 'LOFT_').LOFT_ADMIN_ROOT || '../loft-store-admin')
if (!existsSync(resolve(admin, 'src/App.tsx'))) throw new Error('Set LOFT_ADMIN_ROOT to a checkout of loft-store-admin')
// Test servers never embed live project configuration or credentials.
process.env.VITE_SUPABASE_URL = 'https://fixture.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'fixture-anon-key'
for (const [root, port] of [[process.cwd(), 4173], [admin, 4174]]) {
  const server = await createServer({ root, cacheDir: resolve('/private/tmp', `loft-e2e-vite-${port}`), configFile: false, plugins: [react()], css: { postcss: { plugins: [tailwind({ base: root })] } }, server: { host: '127.0.0.1', port, strictPort: true } })
  await server.listen()
  console.log(`Fixture server: http://127.0.0.1:${port}`)
}
