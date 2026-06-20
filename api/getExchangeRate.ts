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
    console.log(' Запрашиваем курс с CBU.uz...')
    
    // ✅ Используем XML API CBU.uz (более надёжный)
    const response = await fetch('https://cbu.uz/ru/arkhiv-kursov-valyut/xml/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/xml, text/xml',
      },
    })

    if (!response.ok) {
      throw new Error(`CBU.uz returned ${response.status}`)
    }

    const xml = await response.text()
    console.log(' Получен XML, длина:', xml.length)
    
    // Парсим XML
    // Формат: <CcyNm_A>USD</CcyNm_A> ... <Rate>12058.45</Rate>
    const usdBlock = xml.match(/<CcyNm_A>\s*USD\s*<\/CcyNm_A>[\s\S]*?<Rate>\s*([\d.]+)\s*<\/Rate>/i)
    
    if (usdBlock && usdBlock[1]) {
      const rate = parseFloat(usdBlock[1])
      
      if (rate > 0 && rate < 100000) {
        console.log('✅ Курс USD с CBU.uz (XML API):', rate)
        return res.json({ 
          rate, 
          source: 'CBU.uz XML API',
          date: new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })
        })
      }
    }
    
    // ✅ Fallback: парсим HTML страницу
    console.log('️ XML не сработал, пробуем HTML...')
    const htmlResponse = await fetch('https://cbu.uz/ru/currency/rates/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html',
      },
    })
    
    const html = await htmlResponse.text()
    
    // Пробуем разные паттерны
    const patterns = [
      /1\s*USD\s*=\s*([\d\s.,]+)/i,
      /USD[^>]*>([\d\s.,]+)<\/td>/i,
      /class="[^"]*rate[^"]*"[^>]*>([\d\s.,]+)<\/[^>]+>/i,
      /([\d\s.,]+)\s*сум/i,
    ]
    
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const rate = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'))
        if (rate > 0 && rate < 100000) {
          console.log('✅ Курс USD с CBU.uz (HTML):', rate)
          return res.json({ rate, source: 'CBU.uz HTML' })
        }
      }
    }
    
    console.error('❌ Не удалось найти курс ни в XML ни в HTML')
    return res.status(500).json({ error: 'Не нашли курс', fallback: 13000 })
    
  } catch (error) {
    console.error('❌ Ошибка получения курса:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: 13000
    })
  }
}