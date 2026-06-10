import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { chatId, message } = req.body

  if (!chatId || !message) {
    return res.status(400).json({ error: 'chatId and message are required' })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    return res.status(500).json({ error: 'Bot token not configured' })
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    )

    const data = await response.json()

    if (!data.ok) {
      console.error('Telegram API error:', data)
      return res.status(500).json({ error: 'Failed to send message', details: data })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error sending notification:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}