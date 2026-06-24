import { VercelRequest, VercelResponse } from '@vercel/node'
import * as crypto from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { initData } = req.body

  if (!initData) {
    return res.status(400).json({ 
      success: false, 
      error: 'Init data is required' 
    })
  }

  try {
    // Токен твоего бота
    const BOT_TOKEN = process.env.TELEGRAM_CLIENT_BOT_TOKEN
    
    if (!BOT_TOKEN) {
      console.error('TELEGRAM_CLIENT_BOT_TOKEN не найден в переменных окружения')
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      })
    }
    
    // Парсим initData
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    urlParams.delete('hash')

    if (!hash) {
      return res.status(400).json({ 
        success: false, 
        error: 'Hash is required' 
      })
    }

    // Сортируем параметры
    const sortedParams = Array.from(urlParams.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    // Создаём ключ для проверки
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest()

    // Создаём хеш
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex')

    // Проверяем хеш
    if (computedHash !== hash) {
      console.error('Hash не совпадает:', { computedHash, hash })
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid initData' 
      })
    }

    // Парсим данные пользователя
    const userParam = urlParams.get('user')
    const user = userParam ? JSON.parse(decodeURIComponent(userParam)) : null

    return res.status(200).json({ 
      success: true, 
      user,
      message: 'Telegram WebApp validated successfully'
    })

  } catch (error) {
    console.error('Ошибка валидации Telegram:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Validation failed' 
    })
  }
}