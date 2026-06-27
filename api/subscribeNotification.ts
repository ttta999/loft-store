import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { chatId, firstName, username } = req.body

    // ✅ Используем TELEGRAM_CLIENT_BOT_TOKEN (@loftnotify_bot)
    const NOTIFICATION_BOT_TOKEN = process.env.TELEGRAM_CLIENT_BOT_TOKEN

    if (!NOTIFICATION_BOT_TOKEN) {
      console.error('❌ TELEGRAM_CLIENT_BOT_TOKEN не найден')
      return res.status(500).json({ error: 'Notification bot not configured' })
    }

    // Отправляем приветственное сообщение от @loftnotify_bot
    const welcomeMessage = `
✅ Вы успешно подписались на уведомления LOFT Store!

📍 Наш адрес: ТЦ Mercato, 2 этаж, магазин 34
🕐 Режим работы: ежедневно 10:00 - 20:00

Вы будете получать уведомления о:
• Новых поступлениях
• Скидках и акциях
• Статусе заказов

Спасибо что выбрали нас! 🙏
    `.trim()

    const telegramUrl = `https://api.telegram.org/bot${NOTIFICATION_BOT_TOKEN}/sendMessage`
    
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcomeMessage,
        parse_mode: 'HTML'
      })
    })

    console.log(`✅ Пользователь ${chatId} подписан на @loftnotify_bot`)
    
    return res.status(200).json({ success: true, chatId })
  } catch (error) {
    console.error('Ошибка в subscribeNotification:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}