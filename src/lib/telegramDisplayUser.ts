import { useStore } from '../store/useStore'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 128) : ''
}

function avatarUrl(value: unknown) {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''
  } catch { return '' }
}

/** Read once before React mounts. Copy only presentation fields, no account identifier. */
export function initializeTelegramDisplayUser() {
  const webApp = window.Telegram?.WebApp
  const user = webApp?.initData ? webApp.initDataUnsafe?.user : undefined
  if (!user) return
  useStore.getState().setTelegramDisplayUser({
    firstName: text(user.first_name), lastName: text(user.last_name),
    username: text(user.username), photoUrl: avatarUrl(user.photo_url),
  })
}

/** Presentation only. API callers continue to authenticate using signed initData. */
export function useTelegramDisplayUser() {
  return useStore(state => state.telegramUser ?? state.telegramDisplayUser)
}
