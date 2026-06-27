import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { chatId, message, botType = 'manager' } = req.body

    console.log('📩 Получен запрос на отправку:', {
      chatId,
      messageLength: message?.length,
      botType,
      timestamp: new Date().toISOString()
    })

    if (!chatId || !message) {
      console.error('❌ Отсутствуют обязательные параметры:', { chatId, message })
      return res.status(400).json({
        error: 'chatId and message are required',
        received: { chatId: !!chatId, message: !!message }
      })
    }

    // ✅ Выбираем токен в зависимости от типа бота
    const botToken = botType === 'client' 
      ? process.env.TELEGRAM_CLIENT_BOT_TOKEN      // @loftnotify_bot
      : process.env.TELEGRAM_MANAGER_BOT_TOKEN     // @loftadminbot

    if (!botToken) {
      console.error(`❌ Bot token not found for type: ${botType}`)
      console.error('Доступные переменные:', {
        hasManagerToken: !!process.env.TELEGRAM_MANAGER_BOT_TOKEN,
        hasClientToken: !!process.env.TELEGRAM_CLIENT_BOT_TOKEN,
      })
      return res.status(500).json({
        error: 'Bot token not configured',
        botType,
        hasToken: !!botToken
      })
    }

    console.log(`✅ Отправляем через бота: ${botType === 'client' ? '@loftnotify_bot' : '@loftadminbot'}`)

    // Отправляем сообщение через Telegram API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    const data = await response.json()
    
    console.log('📊 Ответ от Telegram API:', {
      ok: data.ok,
      status: response.status,
      chatId,
    })

    if (!data.ok) {
      console.error('❌ Telegram API error:', data)
      return res.status(500).json({
        error: 'Failed to send message',
        details: data,
        chatId,
      })
    }

    console.log(`✅ Сообщение успешно отправлено пользователю ${chatId}`)
    
    return res.status(200).json({
      success: true,
      chatId,
      messageId: data.result?.message_id,
    })
  } catch (error) {
    console.error('💥 Unexpected error in sendNotification:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}