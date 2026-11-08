export type PaymentCurrency = 'UZS' | 'USD'
export interface PaymentCard { number: string; holder: string }
export type PaymentCards = Record<PaymentCurrency, PaymentCard>
export function formatCardNumber(number: string) { return number.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || '' }
export function parsePaymentCards(value: unknown): PaymentCards {
  if (!value || typeof value !== 'object') throw new Error('Платёжные реквизиты недоступны')
  const cards = {} as PaymentCards
  for (const currency of ['UZS', 'USD'] as const) {
    const card = (value as Record<string, unknown>)[currency] as Partial<PaymentCard> | undefined
    if (!card || typeof card.number !== 'string' || !/^[0-9]{16}$/.test(card.number.replace(/\s/g, '')) || typeof card.holder !== 'string' || !card.holder.trim() || card.holder.trim().length > 100) throw new Error('Проверьте номер карты и получателя')
    cards[currency] = { number: card.number.replace(/\s/g, ''), holder: card.holder.trim() }
  }
  return cards
}
