export const ECONOMY_SEEDS = Object.freeze([61101, 61102, 61103])
export const ECONOMY_YEARS = 3

export function csv(rows) {
  if (!rows.length) return ''
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))]
  const field = value => {
    const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return `${headers.join(',')}\n${rows.map(row => headers.map(key => field(row[key])).join(',')).join('\n')}\n`
}

export function stockObservation(state) {
  const candidates = ['merchantStock', 'shopStock', 'storeStock', 'merchantInventory', 'shopInventory', 'storeInventory']
  const key = candidates.find(name => Object.hasOwn(state, name))
  return key ? { modeled: true, key, value: structuredClone(state[key]) } : { modeled: false, value: null }
}

export function summarizeLedger(rows, startGold, endGold) {
  const income = rows.reduce((sum, row) => sum + Math.max(0, row.goldDelta ?? 0), 0)
  const sinks = rows.reduce((sum, row) => sum + Math.max(0, -(row.goldDelta ?? 0)), 0)
  return {
    actionCount: rows.length,
    grossGoldIncome: income,
    grossGoldSinks: sinks,
    netGold: income - sinks,
    finalGoldDelta: endGold - startGold,
    goldLedgerReconciles: income - sinks === endGold - startGold,
    materialIn: sumMaterialDeltas(rows, 1),
    materialOut: sumMaterialDeltas(rows, -1),
  }
}

function sumMaterialDeltas(rows, sign) {
  const totals = {}
  for (const row of rows) for (const [id, delta] of Object.entries(row.materialDelta ?? {})) {
    if (Math.sign(delta) === sign) totals[id] = (totals[id] ?? 0) + Math.abs(delta)
  }
  return totals
}

export function arbitrageResult({ goldBefore, goldAfter, buySpend, craftSpend, saleRevenue }) {
  return {
    goldBefore, buySpend, craftSpend, saleRevenue, goldAfter,
    netPerLoop: goldAfter - goldBefore,
    reconciles: goldAfter - goldBefore === saleRevenue - buySpend - craftSpend,
  }
}
