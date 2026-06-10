import { useStore } from '../store/useStore'

declare global {
  interface Window {
    Telegram?: any
  }
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

// Получаем chat_id для отправки уведомлений
export const getChatId = (): string | null => {
  const tg = initTelegram()
  if (!tg?.initDataUnsafe?.user) return null
  
  // chat_id = id пользователя Telegram
  return tg.initDataUnsafe.user.id.toString()
}

// Функция отправки уведомления через нашу API
export const sendNotification = async (message: string, chatId: string): Promise<boolean> => {
  if (!chatId || !message) return false

  try {
    const response = await fetch('/api/sendNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, message }),
    })
    
    const data = await response.json()
    return data.success
  } catch (error) {
    console.error('Ошибка отправки уведомления:', error)
    return false
  }
}