import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { announceTelegramReady } from './lib/telegram'
import { warmPage } from './lib/pagePreload'
import { initializeTelegramDisplayUser } from './lib/telegramDisplayUser'
import { markStartup } from './lib/startupTiming'

document.documentElement.dataset.loftEntry = 'true'
markStartup('entry')
warmPage(location.pathname)

function waitForTelegram(): Promise<void> {
  let continuingTelegram = false
  try { continuingTelegram = sessionStorage.getItem('loft-telegram-tab') === '1' } catch { /* Private browsing. */ }
  const launchedInTelegram = continuingTelegram || /(?:^|[#?&])tgWebApp(?:Data|Version)=/.test(location.hash) ||
    new URLSearchParams(location.search).has('tgWebAppStartParam')
  if (window.Telegram?.WebApp) markStartup('sdk')
  if (window.Telegram?.WebApp || !launchedInTelegram) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const settle = () => {
      clearTimeout(deadline)
      window.removeEventListener('loft:sdk-settled', settle)
      if (window.Telegram?.WebApp) { markStartup('sdk'); resolve() }
      else reject(new Error('Telegram SDK unavailable'))
    }
    const deadline = setTimeout(settle, 8000)
    window.addEventListener('loft:sdk-settled', settle, { once: true })
    if (document.documentElement.dataset.loftSdk) settle()
  })
}

class StartupBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }

  componentDidMount() { if (this.state.failed) announceTelegramReady() }
  componentDidUpdate() { if (this.state.failed) announceTelegramReady() }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="min-h-screen grid place-content-center gap-4 p-6 text-center">
      <p role="alert">Не удалось открыть магазин / Do‘kon ochilmadi</p>
      <button type="button" className="min-h-11 rounded-xl bg-[#1B2A4A] px-4 text-white"
        onClick={() => location.reload()}>Повторить / Qayta urinish</button>
    </main>
  }
}

void waitForTelegram().then(() => {
  if (window.Telegram?.WebApp.initData) {
    try { sessionStorage.setItem('loft-telegram-tab', '1') } catch { /* Private browsing. */ }
  }
  initializeTelegramDisplayUser()
  createRoot(document.getElementById('root')!).render(
    <StrictMode><StartupBoundary><App /></StartupBoundary></StrictMode>,
  )
}).catch(() => window.dispatchEvent(new Event('loft:boot-error')))
