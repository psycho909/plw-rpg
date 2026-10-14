import test from 'node:test'
import assert from 'node:assert/strict'
import { arbitrageResult, csv, stockObservation, summarizeLedger } from './economy-harness-core.mjs'

test('CSV preserves mixed optional columns and quotes nested values', () => {
  assert.equal(csv([{ kind: 'buy', delta: { iron: 2 }, note: 'a,b' }, { kind: 'sell' }]),
    'kind,delta,note\nbuy,"{""iron"":2}","a,b"\nsell,,\n')
})

test('ledger reconciles gross income and sinks against final gold delta', () => {
  const result = summarizeLedger([{ goldDelta: 4, materialDelta: { fang: 2 } },
    { goldDelta: -7, materialDelta: { fang: -1 } }, { goldDelta: 10 }], 20, 27)
  assert.equal(result.goldLedgerReconciles, true)
  assert.equal(result.grossGoldIncome, 14)
  assert.equal(result.grossGoldSinks, 7)
  assert.deepEqual(result.materialIn, { fang: 2 })
  assert.deepEqual(result.materialOut, { fang: 1 })
})

test('absence of a merchant stock field remains NOT MODELED instead of an empty stock', () => {
  assert.deepEqual(stockObservation({ settlement: { stage: 'village' } }), { modeled: false, value: null })
  assert.deepEqual(stockObservation({ storeStock: { iron: 2 } }), { modeled: true, key: 'storeStock', value: { iron: 2 } })
})

test('buy-craft-sell loop arithmetic distinguishes a loss from a riskless profit', () => {
  assert.deepEqual(arbitrageResult({ goldBefore: 100, goldAfter: 65, buySpend: 30, craftSpend: 10, saleRevenue: 5 }),
    { goldBefore: 100, buySpend: 30, craftSpend: 10, saleRevenue: 5, goldAfter: 65, netPerLoop: -35, reconciles: true })
  assert.equal(arbitrageResult({ goldBefore: 100, goldAfter: 101, buySpend: 2, craftSpend: 3, saleRevenue: 6 }).reconciles, true)
})
