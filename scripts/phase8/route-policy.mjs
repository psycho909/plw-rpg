export const ROUTE_POLICIES = Object.freeze({
  v3: Object.freeze({ id: 'v3', version: 'normal-fresh-save-routes-v3', normalEncounterCap: 3 }),
  measured: Object.freeze({ id: 'measured', version: 'phase8-measured-routes-v1', normalEncounterCap: 1 }),
})

export const WOLF_CHAIN = Object.freeze(['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader', 'wolfKing'])

const RANK_ORDER = Object.freeze({ normal: 0, elite: 1, miniBoss: 2, boss: 3 })
const KIND_ORDER = Object.freeze({ chief: 0, wolf: 1, content: 2, wild: 3 })

export function parseRoutePolicy(argv) {
  const policyIndex = argv.indexOf('--policy')
  const id = policyIndex < 0 ? 'v3' : argv[policyIndex + 1]
  const policy = ROUTE_POLICIES[id]
  if (!policy || (policyIndex >= 0 && (!id || id.startsWith('--')))) {
    throw new RangeError(`--policy must be one of: ${Object.keys(ROUTE_POLICIES).join(', ')}`)
  }
  return policy
}

/**
 * Keep the v3 rank/kind/ID ordering byte-for-byte in spirit. In measured mode,
 * an eligible next wolf-chain member wins a same-rank wolf tie over a defeated
 * chain member, preventing the runner from re-farming grayWolf indefinitely.
 */
export function orderAdventureTargets(targets, policyId = 'v3', defeatedWolfIds = []) {
  if (!ROUTE_POLICIES[policyId]) throw new RangeError(`unknown route policy: ${policyId}`)
  const defeated = new Set(defeatedWolfIds)
  const nextEligibleWolf = policyId === 'measured'
    ? WOLF_CHAIN.find(id => !defeated.has(id) && targets.some(target => target.kind === 'wolf' && target.definitionId === id))
    : null

  return [...targets].sort((left, right) => {
    const rankDifference = (RANK_ORDER[right.rank] ?? -1) - (RANK_ORDER[left.rank] ?? -1)
    if (rankDifference) return rankDifference
    const kindDifference = (KIND_ORDER[left.kind] ?? 99) - (KIND_ORDER[right.kind] ?? 99)
    if (kindDifference) return kindDifference
    if (policyId === 'measured' && left.kind === 'wolf' && right.kind === 'wolf') {
      if (left.definitionId === nextEligibleWolf && right.definitionId !== nextEligibleWolf) return -1
      if (right.definitionId === nextEligibleWolf && left.definitionId !== nextEligibleWolf) return 1
      const leftDefeated = defeated.has(left.definitionId)
      const rightDefeated = defeated.has(right.definitionId)
      if (leftDefeated !== rightDefeated) return leftDefeated ? 1 : -1
      const leftOrder = WOLF_CHAIN.indexOf(left.definitionId)
      const rightOrder = WOLF_CHAIN.indexOf(right.definitionId)
      if (leftOrder >= 0 && rightOrder >= 0 && leftOrder !== rightOrder) return leftOrder - rightOrder
    }
    return left.definitionId.localeCompare(right.definitionId)
  })
}

export function canStartNormalEncounter(policyId, encountersToday) {
  const policy = ROUTE_POLICIES[policyId]
  if (!policy) throw new RangeError(`unknown route policy: ${policyId}`)
  return Number.isSafeInteger(encountersToday) && encountersToday >= 0 && encountersToday < policy.normalEncounterCap
}

export function countPotionUses(before, after) {
  if (!Number.isFinite(before) || !Number.isFinite(after) || before < 0 || after < 0) return null
  const delta = before - after
  return Number.isSafeInteger(delta) && delta >= 0 ? delta : null
}

/**
 * Reconstruct exact incoming HP loss from an action boundary when the only
 * player-side healing is measured potion use (or otherHealing supplied by an
 * observer). Returns null when the observation is incomplete.
 */
export function reconstructIncomingDamage({
  hpBefore, hpAfter, maxHp, potionUses = 0, receivedAttack, otherHealing = 0, healingUnknown = false,
}) {
  if (!receivedAttack) return 0
  if (healingUnknown || ![hpBefore, hpAfter, maxHp, potionUses, otherHealing].every(Number.isFinite)
    || hpBefore < 0 || hpAfter < 0 || maxHp < hpBefore || potionUses < 0 || otherHealing < 0) return null
  const potionHealing = potionUses * Math.min(45, Math.max(0, maxHp - hpBefore))
  const damage = hpBefore + potionHealing + otherHealing - hpAfter
  return damage >= 0 ? damage : null
}

/** Return gold-only expected reward; null means at least one gold term is unmeasured. */
export function riskAdjustedGoldReward({
  winRate, retreatRate, deathRate, victoryGold, retreatCostGold, deathLossGold,
}) {
  const values = [winRate, retreatRate, deathRate, victoryGold, retreatCostGold, deathLossGold]
  if (!values.every(Number.isFinite)) return null
  if ([winRate, retreatRate, deathRate].some(rate => rate < 0 || rate > 1)
    || Math.abs(winRate + retreatRate + deathRate - 1) > 1e-9
    || [retreatCostGold, deathLossGold].some(value => value < 0)) {
    throw new RangeError('risk-adjusted reward requires outcome rates summing to one and non-negative gold costs')
  }
  return winRate * victoryGold - retreatRate * retreatCostGold - deathRate * deathLossGold
}

export function summarizeCombatOutcomes(rows) {
  const groups = new Map()
  for (const row of rows) {
    if (!['win', 'retreat', 'death'].includes(row.outcome)) continue
    const key = [row.routeVariant ?? row.route, row.definitionId, row.rank, row.band].join('/')
    const group = groups.get(key) ?? { routeVariant: row.routeVariant ?? row.route, definitionId: row.definitionId,
      rank: row.rank, band: row.band, rows: [] }
    group.rows.push(row)
    groups.set(key, group)
  }
  const percentile = (values, fraction) => {
    if (!values.length) return null
    const sorted = [...values].sort((left, right) => left - right)
    return sorted[Math.ceil(fraction * sorted.length) - 1] ?? null
  }
  const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

  return [...groups.values()].map(group => {
    const completed = group.rows
    const wins = completed.filter(row => row.outcome === 'win')
    const retreats = completed.filter(row => row.outcome === 'retreat')
    const deaths = completed.filter(row => row.outcome === 'death')
    const count = completed.length
    const winRate = wins.length / count, retreatRate = retreats.length / count, deathRate = deaths.length / count
    const goldFor = rowsForOutcome => mean(rowsForOutcome.map(row => row.goldDelta).filter(Number.isFinite))
    const victoryGold = goldFor(wins)
    const retreatCosts = retreats.map(row => Math.max(0, -(row.goldDelta ?? 0)))
    const deathLosses = deaths.map(row => Math.max(0, -(row.goldDelta ?? 0)))
    const status = completed.find(row => row.grossDamageStatus !== 'MEASURED')?.grossDamageStatus ?? 'MEASURED'
    const hpPercents = completed.filter(row => Number.isFinite(row.hpAfter) && Number.isFinite(row.hpMaxAfter) && row.hpMaxAfter > 0)
      .map(row => row.hpAfter / row.hpMaxAfter * 100)
    const goldObserved = completed.every(row => Number.isFinite(row.goldDelta))
    return {
      routeVariant: group.routeVariant, definitionId: group.definitionId, rank: group.rank, band: group.band,
      encounters: count, wins: wins.length, retreats: retreats.length, deaths: deaths.length,
      winRate, retreatRate, deathRate,
      turnsP10: percentile(completed.map(row => row.turns).filter(Number.isFinite), .1),
      turnsP50: percentile(completed.map(row => row.turns).filter(Number.isFinite), .5),
      turnsP90: percentile(completed.map(row => row.turns).filter(Number.isFinite), .9),
      hpRemainingPercentP10: percentile(hpPercents, .1), hpRemainingPercentP50: percentile(hpPercents, .5), hpRemainingPercentP90: percentile(hpPercents, .9),
      potionUsePerEncounter: mean(completed.map(row => row.potionUse).filter(Number.isFinite)),
      grossDamageTakenP50: status === 'MEASURED'
        ? percentile(completed.map(row => row.grossDamageTaken).filter(Number.isFinite), .5)
        : status,
      fightGoldDeltaMean: goldObserved ? mean(completed.map(row => row.goldDelta)) : null,
      fightTimeMinutesP50: percentile(completed.map(row => row.timeDeltaMinutes).filter(Number.isFinite), .5),
      fightStaminaDeltaP50: percentile(completed.map(row => row.staminaDelta).filter(Number.isFinite), .5),
      materialDelta: completed.map(row => row.materialDelta ?? {}),
      riskAdjustedGold: goldObserved ? riskAdjustedGoldReward({ winRate, retreatRate, deathRate,
        victoryGold: victoryGold ?? 0, retreatCostGold: mean(retreatCosts) ?? 0, deathLossGold: mean(deathLosses) ?? 0 }) : null,
      riskAdjustedGoldScope: goldObserved ? 'Direct fight gold only; potion/material/time/stamina remain separate unpriced dimensions.' : 'NOT MEASURED: incomplete gold delta',
    }
  }).sort((left, right) => `${left.routeVariant}/${left.band}/${left.rank}/${left.definitionId}`
    .localeCompare(`${right.routeVariant}/${right.band}/${right.rank}/${right.definitionId}`))
}

export function normalEncounterCutoffReason(policyId) {
  if (policyId === 'v3') return 'v3 permits up to three Normal starts per in-game day.'
  if (policyId === 'measured') return 'measured permits one Normal start per in-game day, then leaves the area uncleared for another day or recovery; higher-rank opportunities remain selectable.'
  throw new RangeError(`unknown route policy: ${policyId}`)
}
