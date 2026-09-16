import { supabase } from './supabase'

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

export const initTelegram = () => {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready()
    window.Telegram.WebApp.expand()
    return window.Telegram.WebApp
  }
  return null
}

export const getUserData = () => {
  const tg = initTelegram()
  if (!tg?.initDataUnsafe?.user) return null

  const user = tg.initDataUnsafe.user
  return {
    id: user.id.toString(),
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    username: user.username || '',
    photoUrl: user.photo_url || '',
    languageCode: user.language_code || 'ru',
  }
}

export const getChatId = (): string | null => {
  const tg = initTelegram()
  if (!tg?.initDataUnsafe?.user) return null
  return tg.initDataUnsafe.user.id.toString()
}

export const subscribeUser = async () => {
  const tg = initTelegram()
  if (!tg?.initDataUnsafe?.user) {
    console.log('Не в Telegram, автоподписка пропущена')
    return
  }

  const user = tg.initDataUnsafe.user
  const chatId = user.id.toString()

  try {
    // ✅ Подписываем на основной бот (локально в БД)
    const { error: mainError } = await supabase
      .from('subscribers')
      .upsert({
        chat_id: chatId,
        user_id: chatId,
        username: user.username || null,
        first_name: user.first_name || null,
        is_subscribed: true,
      }, {
        onConflict: 'chat_id'
      })

    if (mainError) {
      console.error('Ошибка подписки на основной бот:', mainError)
    } else {
      console.log('✅ Пользователь подписан на основной бот:', chatId)
    }

    // ✅ Автоматически подписываем на notification bot (@loftnotify_bot)
    try {
      const response = await fetch('/api/subscribeNotification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chatId,
          firstName: user.first_name,
          username: user.username
        })
      })

      if (response.ok) {
        console.log('✅ Пользователь подписан на notification bot (@loftnotify_bot):', chatId)
      } else {
        console.error('❌ Ошибка подписки на notification bot')
      }
    } catch (error) {
      console.error('Ошибка при подписке на notification bot:', error)
    }

  } catch (error) {
    console.error('Ошибка подписки:', error)
  }
}

// ✅ ПОКАЗАТЬ/СКРЫТЬ системную кнопку «назад» Telegram + повесить обработчик
export const setupTelegramBackButton = (
  shouldShow: boolean,
  onBack: () => void
): (() => void) => {
  const back = getWebApp()?.BackButton
  if (!back) return () => {}

  if (shouldShow) {
    back.show()
    back.onClick(onBack)
  } else {
    back.hide()
    back.offClick(onBack)
  }

  // cleanup
  return () => {
    back.offClick(onBack)
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

export const sendNotificationToManager = async (message: string): Promise<boolean> => {
  const MANAGER_CHAT_ID = '6150570809' // Замени на свой chat ID

  try {
    const response = await fetch('/api/sendNotification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: MANAGER_CHAT_ID,
        message,
        botType: 'manager' // Использует TELEGRAM_MANAGER_BOT_TOKEN (@loftadminbot)
      }),
    })

    const data = await response.json()
    return data.success
  } catch (error) {
    console.error('Ошибка отправки уведомления менеджеру:', error)
    return false
  }
}

export const sendNotificationToClient = async (message: string, clientChatId: string): Promise<boolean> => {
  if (!clientChatId) return false

  try {
    const response = await fetch('/api/sendNotification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: clientChatId,
        message,
        botType: 'client' // Использует TELEGRAM_CLIENT_BOT_TOKEN (@loftnotify_bot)
      }),
    })

    const data = await response.json()
    return data.success
  } catch (error) {
    console.error('Ошибка отправки уведомления клиенту:', error)
    return false
  }
}

export const sendNotification = async (message: string): Promise<boolean> => {
  return sendNotificationToManager(message)
}