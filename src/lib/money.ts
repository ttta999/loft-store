/** Shared display rules. Historical values must use their saved currency/rate. */
export type MoneyCurrency = 'USD' | 'UZS'
export const roundUsd = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100
export function moneyNumber(amount: number, currency: MoneyCurrency): string {
  return (currency === 'UZS' ? Math.round(amount) : roundUsd(amount)).toLocaleString(currency === 'USD' ? 'en-US' : 'ru-RU', { maximumFractionDigits: currency === 'USD' ? 2 : 0 }).replace(/[\u00a0\u202f]/g, ' ')
}
export function displayMoney(amount: number, currency: MoneyCurrency, language = 'ru', usdStyle: 'prefix'|'suffix'|'code' = 'prefix'): string {
  if (!Number.isFinite(amount) || amount < 0) return language === 'uz' ? 'Summa tekshirilishi kerak' : 'Сумма требует проверки'
  return currency === 'USD' ? usdStyle === 'prefix' ? `$${moneyNumber(amount,currency)}` : `${roundUsd(amount).toLocaleString('ru-RU',{maximumFractionDigits:2}).replace(/[\u00a0\u202f]/g,' ')} ${usdStyle === 'code' ? 'USD' : '$'}` : `${moneyNumber(amount,currency)} ${language === 'uz' ? 'so‘m' : 'сум'}`
}
export function catalogMoney(usd: number, currency: MoneyCurrency, rate: number, language = 'ru'): string {
  return displayMoney(currency === 'USD' ? usd : rate > 0 ? usd * rate : NaN, currency, language)
}
/** Largest-remainder allocation keeps displayed line amounts equal to the server's rounded aggregate. */
export function allocateUzs(amountsUsd: number[], rate: number): number[] {
  if (!(rate > 0) || !Number.isFinite(rate) || !amountsUsd.every(v => Number.isFinite(v) && v >= 0)) throw new Error('Invalid money')
  const exact = amountsUsd.map(v => v * rate)
  const result = exact.map(Math.floor)
  const remainder = Math.round(amountsUsd.reduce((a,b) => a+b,0) * rate) - result.reduce((a,b) => a+b,0)
  exact.map((v,i) => ({i,f:v-result[i]})).sort((a,b) => b.f-a.f || a.i-b.i).slice(0,remainder).forEach(({i}) => result[i]++)
  return result
}
