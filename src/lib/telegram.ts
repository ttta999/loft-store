import { authenticate, storeApi } from './api'
import { markStartup } from './startupTiming'

// ✅ Расширенные типы Telegram WebApp.
// В проектном .d.ts может не быть BackButton/HapticFeedback —
// описываем их сами и обращаемся через безопасный каст.
interface TelegramBackButton {
  isVisible: boolean
  show: () => void
  hide: () => void
  onClick: (callback: () => void) => void
  offClick: (callback: () => void) => void
}

interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

interface TelegramWebAppExtended {
  BackButton?: TelegramBackButton
  HapticFeedback?: TelegramHapticFeedback
}

// ✅ Безопасное получение расширенного WebApp (без TS-ошибок)
const getWebApp = (): TelegramWebAppExtended | null => {
  return (window as any).Telegram?.WebApp ?? null
}

export function announceTelegramReady() {
  const webApp = window.Telegram?.WebApp
  const root = document.documentElement
  if (!webApp || root.dataset.telegramReady === 'true') return
  webApp.ready()
  root.dataset.telegramReady = 'true'
  markStartup('ready')
  webApp.expand()
}

export const getUserData = async () => {
  const { user } = await authenticate()
  return { id: String(user.id), firstName: user.first_name || '', lastName: user.last_name || '',
    username: user.username || '', photoUrl: user.photo_url || '', languageCode: user.language_code || 'ru' }
}
export const subscribeUser = async () => { await storeApi('subscribe') }

// ✅ ПОКАЗАТЬ/СКРЫТЬ системную кнопку «назад» Telegram + повесить обработчик
export const setupTelegramBackButton = (
  shouldShow: boolean,
  onBack: () => void
): (() => void) => {
  const back = getWebApp()?.BackButton
  if (!back) return () => {}

  const guardedBack=()=>{if(document.querySelector('[data-onboarding]')){document.querySelector<HTMLButtonElement>('[data-onboarding-back]')?.click();return}onBack()}
  if (shouldShow) {
    back.show()
    back.onClick(guardedBack)
  } else {
    back.hide()
    back.offClick(guardedBack)
  }

  // cleanup
  return () => {
    back.offClick(guardedBack)
    back.hide()
  }
}

// ✅ Просто скрыть системную кнопку «назад» (используется в App.tsx)
export const hideTelegramBackButton = () => {
  getWebApp()?.BackButton?.hide()
}

// ✅ Тактильная обратная связь (вибрация)
export const hapticFeedback = (
  type: 'impact' | 'notification' | 'selection' = 'impact',
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
) => {
  const haptic = getWebApp()?.HapticFeedback
  if (!haptic) return

  try {
    if (type === 'impact') {
      haptic.impactOccurred(style as 'light' | 'medium' | 'heavy')
    } else if (type === 'notification') {
      haptic.notificationOccurred(style as 'success' | 'warning' | 'error')
    } else if (type === 'selection') {
      haptic.selectionChanged()
    }
  } catch (error) {
    // Игнорируем ошибки вибрации
  }
}
