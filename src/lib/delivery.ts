export const roundUsd = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100
export const formatUsd = (amount: number) => `$${roundUsd(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
export function readDeliverySettings(price: any, threshold: any, rate: number) {
  const deliveryPriceUsd = price?.price_usd == null ? Number(price?.price || 0) / rate : Number(price.price_usd)
  const freeDeliveryThresholdUsd = threshold?.amount_usd == null ? Number(threshold?.amount || 0) / rate : Number(threshold.amount_usd)
  if (![deliveryPriceUsd, freeDeliveryThresholdUsd].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Не удалось получить настройки доставки')
  return { deliveryPriceUsd, freeDeliveryThresholdUsd }
}
export function deliveryQuote(productsUsd: number, delivery: boolean, priceUsd: number, thresholdUsd: number, rate: number) {
  const free = delivery && thresholdUsd > 0 && productsUsd >= thresholdUsd - Number.EPSILON * Math.max(1, productsUsd, thresholdUsd) * 4
  const deliveryUsd = delivery && !free ? priceUsd : 0
  const amount = productsUsd + deliveryUsd
  return { free, deliveryUsd, totalUsd: roundUsd(amount), totalUzs: Math.round(amount * rate) }
}
