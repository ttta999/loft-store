import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔄 Запрашиваем курс с CBU.uz...')
    
    // Получаем HTML страницу с курсами
    const response = await fetch('https://cbu.uz/ru/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`CBU.uz returned ${response.status}`)
    }

    const html = await response.text()
    
    // Ищем курс USD в HTML
    // На сайте CBU.uz формат: 1 USD = 12 058,45
    const usdPattern = /1\s*USD\s*=\s*([\d\s.,]+)/i
    const match = html.match(usdPattern)

    if (match && match[1]) {
      // Парсим число: "12 058,45" → 12058.45
      const rateString = match[1].replace(/\s/g, '').replace(',', '.')
      const rate = parseFloat(rateString)

      if (rate > 0 && rate < 100000) {
        console.log('✅ Курс USD с CBU.uz:', rate)
        return res.status(200).json({
          rate: rate,
          source: 'CBU.uz',
          date: new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })
        })
      }
    }

    console.error('❌ Не удалось найти курс USD в HTML')
    return res.status(500).json({ error: 'Failed to parse USD rate', html: html.substring(0, 500) })

  } catch (error) {
    console.error('❌ Ошибка получения курса:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: 13000
    })
  }
}