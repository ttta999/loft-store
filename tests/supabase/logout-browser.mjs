import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'
import { chromium, webkit, expect } from '@playwright/test'
import { localAuth, sql } from './session-fixture.mjs'

const local = await localAuth()
const app = 'http://127.0.0.1:56324'
const adminRoot = resolve(process.env.LOFT_ADMIN_ROOT || '../loft-store-admin')
const server = spawn(process.execPath, [resolve(adminRoot, 'node_modules/vite/bin/vite.js'),
  '--host', '127.0.0.1', '--port', '56324', '--strictPort'], {
  cwd: adminRoot,
  env: { ...process.env, VITE_SUPABASE_URL: local.url, VITE_SUPABASE_ANON_KEY: local.anonKey },
  stdio: 'ignore',
})
const authKey = 'sb-127-auth-token'

try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) break
    try { if ((await fetch(app)).ok) { ready = true; break } } catch { /* wait for Vite */ }
    await wait(250)
  }
  assert.ok(ready, 'Dedicated loopback Admin server')

  for (const [engine, launch] of [[chromium, { channel: 'chrome' }], [webkit, {}]]) {
    const browser = await engine.launch(launch)
    try {
      for (const failure of [null, 'network', 'auth']) {
        const fixture = await local.account()
        const factor = await local.enroll(fixture.api)
        const approval = sql(`select private.store_approve_admin('${fixture.id}','${factor.factorId}')`)
        sql(`select private.store_activate_admin('${fixture.id}','${approval}')`)
        const { data: { session } } = await fixture.api.auth.getSession()
        const sessionId = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url')).session_id
        const serverSessionCount = () => sql(`select count(*) from auth.sessions where id='${sessionId}'`)
        assert.equal(serverSessionCount(), '1')

        const context = await browser.newContext({ serviceWorkers: 'block' })
        let calls = 0
        await context.routeWebSocket('**/*', socket => socket.close())
        await context.route('**/*', async route => {
          const url = new URL(route.request().url())
          if (![app, local.url].includes(url.origin)) return route.abort()
          if (url.origin === local.url && url.pathname === '/auth/v1/logout') {
            calls++
            if (calls === 1 && failure === 'network') return route.abort('internetdisconnected')
            if (calls === 1 && failure === 'auth') return route.fulfill({
              status: 503, json: { message: 'Fixture Auth unavailable' },
              headers: { 'access-control-allow-origin': app },
            })
          }
          return route.continue()
        })
        await context.addInitScript(({ storage, session: value, origin }) => {
          if (location.origin === origin && !localStorage.getItem('seeded-fixture')) {
            localStorage.setItem('seeded-fixture', '1')
            localStorage.setItem(storage, JSON.stringify(value))
            localStorage.setItem('loft_admin_theme', 'dark')
            localStorage.setItem('loft-admin-language:guest', 'ru')
          }
        }, { storage: authKey, session, origin: app })
        try {
          const first = await context.newPage()
          const second = await context.newPage()
          await first.goto(app)
          await expect(first.getByRole('button', { name: 'Выйти' })).toBeEnabled({ timeout: 10_000 })
          await second.goto(app)
          await expect(second.getByRole('button', { name: 'Выйти' })).toBeEnabled()
          await second.goto(app + '/orders')
          await expect(second.getByRole('heading', { name: 'Заказы', exact: true })).toBeVisible()
          let releaseResponse = () => {}
          let captured = false
          const gate = new Promise(resolve => { releaseResponse = resolve })
          await second.route('**/rest/v1/orders?*', async route => {
            if (new URL(route.request().url()).searchParams.get('limit') !== '1') return route.fallback()
            const response = await route.fetch()
            captured = response.ok()
            await gate
            await route.fulfill({ response }).catch(() => {})
          })
          const oldRead = second.evaluate(async () => {
            const { supabase } = await import('/src/lib/supabase.ts')
            const result = await supabase.from('orders').select('id').limit(1)
            return { accepted: !result.error, rejected: Boolean(result.error) }
          })
          await expect.poll(() => captured).toBe(true)
          await first.getByRole('button', { name: 'Выйти' }).evaluate(button => {
            button.click()
            button.click()
          })
          await expect(first).toHaveURL(app + '/login')
          await expect(second).toHaveURL(app + '/login')
          releaseResponse()
          assert.deepEqual(await oldRead, { accepted: false, rejected: true })
          await expect.poll(() => calls).toBe(1)
          if (failure) {
            await expect(first.getByText('Вы вышли из админки на этом устройстве. Серверный выход не подтверждён.')).toBeVisible()
            assert.equal(serverSessionCount(), '1')
            await first.getByRole('button', { name: 'Повторить', exact: true }).click()
            await expect.poll(() => calls).toBe(2)
          }
          await expect.poll(serverSessionCount).toBe('0')
          await second.goBack()
          await expect(second).toHaveURL(app + '/login')
          await second.reload()
          await second.goto(app + '/orders')
          await expect(second).toHaveURL(app + '/login')
          const state = await first.evaluate(key => [localStorage.getItem(key),
            localStorage.getItem('loft_admin_theme'), localStorage.getItem('loft-admin-language:guest')], authKey)
          assert.deepEqual(state, [null, 'dark', 'ru'])
          console.log(`PASS: ${engine.name()} logout ${failure ?? 'success'}, two tabs, late response, Back, reload and server session state`)
        } finally { await context.close() }
      }
    } finally { await browser.close() }
  }
} finally {
  server.kill()
}
