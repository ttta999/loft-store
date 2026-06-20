import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    console.log('🔄 Получаем курс USD к UZS...')
    
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      headers: {
        'User-Agent': 'LOFT-Store/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    const rate = data.rates?.UZS

    if (rate && rate > 0) {
      console.log('✅ Курс USD к UZS:', rate)
      return res.json({
        rate: rate,
        source: 'ExchangeRate-API',
        date: new Date().toISOString(),
        base: 'USD'
      })
    }

    throw new Error('UZS rate not found in response')

  } catch (error) {
    console.error('❌ Ошибка получения курса:', error)
    // ✅ Fallback изменён на 12100
    return res.json({
      rate: 12100,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
      date: new Date().toISOString()
    })
  }
}