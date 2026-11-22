import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function waitForTelegram(): Promise<void> {
  let continuingTelegram = false
  try { continuingTelegram = sessionStorage.getItem('loft-telegram-tab') === '1' } catch { /* Private browsing. */ }
  const launchedInTelegram = continuingTelegram || /(?:^|[#?&])tgWebApp(?:Data|Version)=/.test(location.hash)
  if (window.Telegram?.WebApp || !launchedInTelegram) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const sdk = document.getElementById('telegram-sdk')
    const done = () => {
      clearTimeout(deadline)
      sdk?.removeEventListener('load', done)
      sdk?.removeEventListener('error', done)
      if (window.Telegram?.WebApp) resolve()
      else reject(new Error('Telegram SDK unavailable'))
    }
    const deadline = setTimeout(done, 8000)
    sdk?.addEventListener('load', done, { once: true })
    sdk?.addEventListener('error', done, { once: true })
  })
}

class StartupBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }

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
  createRoot(document.getElementById('root')!).render(
    <StrictMode><StartupBoundary><App /></StartupBoundary></StrictMode>,
  )
}).catch(() => window.dispatchEvent(new Event('loft:boot-error')))
