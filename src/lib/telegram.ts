import { supabase } from './supabase'

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
    const { error } = await supabase
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

    if (error) {
      console.error('Ошибка подписки:', error)
    } else {
      console.log('✅ Пользователь подписан:', chatId)
    }
  } catch (error) {
    console.error('Ошибка подписки:', error)
  }
}

export const sendNotificationToManager = async (message: string): Promise<boolean> => {
  const MANAGER_CHAT_ID = '6150570809'
  
  try {
    const response = await fetch('/api/sendNotification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chatId: MANAGER_CHAT_ID, 
        message,
        botType: 'manager'
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
        botType: 'client'
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