type CachedRate = { rate: number; source: string; timestamp: string; expires: number }
let cached: CachedRate | null = null
let pending: Promise<CachedRate> | null = null
function valid(rate: unknown): rate is number { return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 && rate < 1_000_000_000 }
export async function exchangeRate(): Promise<CachedRate> {
  if (cached && cached.expires > Date.now()) return cached
  if (pending) return pending
  pending = (async () => {
    try {
      const response = await fetch('https://cbu.uz/oz/arkhiv-kursa-valyut/json/', { signal: AbortSignal.timeout(4000) })
      if (!response.ok) throw new Error('Currency provider failed')
      const data: unknown = await response.json()
      if (!Array.isArray(data)) throw new Error('Invalid currency response')
      const usd = data.find(item => item?.Ccy === 'USD')
      const rate = Number(usd?.Rate)
      if (!valid(rate)) throw new Error('USD unavailable')
      return { rate, source: 'CBU.uz', timestamp: new Date().toISOString(), expires: Date.now() + 600_000 }
    } catch {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(4000) })
      if (!response.ok) throw new Error('Currency provider failed')
      const data = await response.json()
      if ((data.base && data.base !== 'USD') || !valid(data.rates?.UZS)) throw new Error('USD unavailable')
      return { rate: data.rates.UZS as number, source: 'exchangerate-api.com', timestamp: new Date().toISOString(), expires: Date.now() + 600_000 }
    }
  })().then(result => { cached = result; return result }).finally(() => { pending = null })
  return pending
}
