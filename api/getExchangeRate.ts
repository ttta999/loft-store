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
    
    const response = await fetch('https://cbu.uz/ru/currency/rates/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html',
      },
    })

    const html = await response.text()
    
    // Ищем: 1 USD = 12 058,45
    const match = html.match(/1\s*USD\s*=\s*([\d\s.,]+)/i)
    
    if (match && match[1]) {
      const rate = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'))
      
      if (rate > 0) {
        console.log('✅ Курс с CBU.uz:', rate)
        return res.json({ rate, source: 'CBU.uz' })
      }
    }
    
    return res.status(500).json({ error: 'Не нашли курс', fallback: 13000 })
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
    return res.status(500).json({ error: 'Error', fallback: 13000 })
  }
}