import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deliveryQuote, formatUsd, readDeliverySettings } from '../src/lib/delivery.ts'

test('USD delivery, totals and the inclusive free threshold do not expose floating point tails', () => {
  assert.equal(formatUsd(160 + 2.518760568299551), '$162.52')
  assert.equal(formatUsd(2.518760568299551), '$2.52')
  assert.deepEqual(deliveryQuote(160, true, 2.52, 200, 11910.62), { free: false, deliveryUsd: 2.52, totalUsd: 162.52, totalUzs: 1935714 })
  for (const price of [200, 200.01]) assert.equal(deliveryQuote(price, true, 2.52, 200, 11910.62).deliveryUsd, 0)
  assert.equal(deliveryQuote(199.999, true, 2.52, 200, 11910.62).deliveryUsd, 2.52)
  assert.equal(deliveryQuote(199.99, true, 2.52, 200, 11910.62).deliveryUsd, 2.52)
  assert.equal(deliveryQuote(100, false, 2.52, 200, 11910.62).deliveryUsd, 0)
  assert.equal(deliveryQuote(0.1 + 0.2, true, 5, 0.3, 12000).deliveryUsd, 0)
  assert.equal(deliveryQuote(300, true, 2.52, 0, 12000).deliveryUsd, 2.52)
})
test('canonical USD settings stay stable through exchange-rate updates; old UZS settings still read correctly', () => {
  for (const rate of [11910.62, 12500]) assert.deepEqual(readDeliverySettings({ price_usd: 2.52, price: 30015 }, { amount_usd: 200 }, rate), { deliveryPriceUsd: 2.52, freeDeliveryThresholdUsd: 200 })
  assert.deepEqual(readDeliverySettings({ price: 30000 }, { amount: 2400000 }, 12000), { deliveryPriceUsd: 2.5, freeDeliveryThresholdUsd: 200 })
  assert.throws(() => readDeliverySettings({ price_usd: -1 }, {}, 12000))
})
