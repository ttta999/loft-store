import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Разрешаем только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔄 Получаем курс валют с CBU.uz...')
    
    // Получаем курс с CBU.uz на сервере (CORS не проблема)
    const response = await fetch('https://cbu.uz/ru/currency/rates/', {
      headers: {
        'User-Agent': 'LOFT-Store/1.0',
      },
    })
    
    if (!response.ok) {
      console.error('❌ Ошибка получения HTML с CBU.uz:', response.status)
      // Fallback на внешний API
      return await getFallbackRate(res)
    }
    
    const html = await response.text()
    
    // Парсим курс USD из HTML
    // Ищем паттерн: 1 USD = 12058.45
    const usdMatch = html.match(/1\s*USD\s*=\s*([\d\s.,]+)/i)
    
    if (usdMatch && usdMatch[1]) {
      const rate = parseFloat(usdMatch[1].replace(/\s/g, '').replace(',', '.'))
      
      if (rate > 0 && rate < 100000) { // Проверка на адекватность курса
        console.log('✅ Курс USD получен с CBU.uz:', rate)
        return res.status(200).json({ 
          rate, 
          source: 'CBU.uz',
          timestamp: new Date().toISOString()
        })
      }
    }
    
    console.warn('⚠️ Не удалось распарсить курс с CBU.uz, используем fallback')
    return await getFallbackRate(res)
    
  } catch (error) {
    console.error('❌ Ошибка получения курса с CBU.uz:', error)
    return await getFallbackRate(res)
  }
}

// Fallback функция для получения курса с внешнего API
async function getFallbackRate(res: VercelResponse) {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const data = await response.json()
    
    const rate = data.rates?.UZS || 13000
    console.log('✅ Курс получен с fallback API:', rate)
    
    return res.status(200).json({ 
      rate, 
      source: 'exchangerate-api',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Ошибка fallback API:', error)
    return res.status(200).json({ 
      rate: 13000, 
      source: 'fallback',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}