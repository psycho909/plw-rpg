import { MATRIX_BANDS, MATRIX_SOURCES } from './combat-matrix.mjs'
import { riskAdjustedGoldReward } from './route-policy.mjs'

export function parseControlledMatrixArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index]
    if (!['--band', '--source', '--target'].includes(flag)) throw new RangeError(`unknown controlled matrix argument: ${flag}`)
    if (parsed[flag]) throw new RangeError(`duplicate controlled matrix argument: ${flag}`)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new RangeError(`${flag} requires a value`)
    parsed[flag] = value
    index++
  }
  if (!MATRIX_BANDS.includes(parsed['--band'])) throw new RangeError(`--band must be one of: ${MATRIX_BANDS.join(', ')}`)
  if (!MATRIX_SOURCES.includes(parsed['--source'])) throw new RangeError(`--source must be one of: ${MATRIX_SOURCES.join(', ')}`)
  if (parsed['--target'] && !/^[a-zA-Z0-9_-]+$/.test(parsed['--target'])) throw new RangeError('--target must be a definition ID')
  return { band: parsed['--band'], source: parsed['--source'], target: parsed['--target'] ?? null }
}

export function matrixPercentile(values, fraction) {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)] ?? null
}

export function summarizeControlledMatrix(rows) {
  const groups = new Map()
  for (const row of rows) {
    if (!['win', 'retreat', 'death'].includes(row.outcome)) continue
    const key = [row.definitionId, row.rank, row.band, row.source, row.style].join('/')
    const group = groups.get(key) ?? { definitionId: row.definitionId, rank: row.rank, band: row.band,
      source: row.source, style: row.style, rows: [] }
    group.rows.push(row)
    groups.set(key, group)
  }
  return [...groups.values()].map(group => {
    const samples = group.rows
    const wins = samples.filter(row => row.outcome === 'win')
    const retreats = samples.filter(row => row.outcome === 'retreat')
    const deaths = samples.filter(row => row.outcome === 'death')
    const count = samples.length
    const winRate = wins.length / count
    const retreatRate = retreats.length / count
    const deathRate = deaths.length / count
    const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
    const victoryGold = mean(wins.map(row => row.goldDelta).filter(Number.isFinite))
    const retreatCostGold = mean(retreats.map(row => Math.max(0, -(row.goldDelta ?? 0))).filter(Number.isFinite))
    const deathLossGold = mean(deaths.map(row => Math.max(0, -(row.goldDelta ?? 0))).filter(Number.isFinite))
    const goldMeasured = samples.every(row => Number.isFinite(row.goldDelta))
    const grossDamageStatus = samples.find(row => row.grossDamageStatus !== 'MEASURED')?.grossDamageStatus ?? 'MEASURED'
    const hpPercent = samples.map(row => Number.isFinite(row.hpAfter) && Number.isFinite(row.hpMaxAfter) && row.hpMaxAfter > 0
      ? row.hpAfter / row.hpMaxAfter * 100 : null).filter(Number.isFinite)
    return {
      definitionId: group.definitionId, rank: group.rank, band: group.band, source: group.source, style: group.style,
      samples: count, wins: wins.length, retreats: retreats.length, deaths: deaths.length,
      winRate, retreatRate, deathRate,
      turnsP10: matrixPercentile(samples.map(row => row.turns).filter(Number.isFinite), .1),
      turnsP50: matrixPercentile(samples.map(row => row.turns).filter(Number.isFinite), .5),
      turnsP90: matrixPercentile(samples.map(row => row.turns).filter(Number.isFinite), .9),
      hpRemainingPercentP10: matrixPercentile(hpPercent, .1),
      hpRemainingPercentP50: matrixPercentile(hpPercent, .5),
      hpRemainingPercentP90: matrixPercentile(hpPercent, .9),
      potionUseMean: mean(samples.map(row => row.potionUse).filter(Number.isFinite)),
      grossDamageTakenP50: grossDamageStatus === 'MEASURED'
        ? matrixPercentile(samples.map(row => row.grossDamageTaken).filter(Number.isFinite), .5) : grossDamageStatus,
      fightGoldDeltaMean: goldMeasured ? mean(samples.map(row => row.goldDelta)) : null,
      fightTimeMinutesP50: matrixPercentile(samples.map(row => row.timeDeltaMinutes).filter(Number.isFinite), .5),
      fightStaminaSpentP50: matrixPercentile(samples.map(row => row.staminaSpent).filter(Number.isFinite), .5),
      riskAdjustedGold: goldMeasured ? riskAdjustedGoldReward({ winRate, retreatRate, deathRate,
        victoryGold: victoryGold ?? 0, retreatCostGold: retreatCostGold ?? 0, deathLossGold: deathLossGold ?? 0 }) : null,
      riskAdjustedGoldScope: goldMeasured
        ? 'Direct fight gold only; preparation, potion, material, game time and stamina remain separate unpriced dimensions.'
        : 'NOT MEASURED: incomplete gold delta',
    }
  }).sort((left, right) => `${left.band}/${left.rank}/${left.definitionId}/${left.source}/${left.style}`
    .localeCompare(`${right.band}/${right.rank}/${right.definitionId}/${right.source}/${right.style}`))
}

export function isWithinControlledJobBudget(startedAtMs, nowMs, hardStopMinutes = 14) {
  return Number.isFinite(startedAtMs) && Number.isFinite(nowMs) && nowMs - startedAtMs < hardStopMinutes * 60_000
}

export function classifyControlledCell({ executionError = null, timeLimitReached = false,
  naReason = null, attemptedSamples = 0, expectedSamples }) {
  if (executionError) return { status: 'RUNNER_ERROR', errorReason: executionError, naReason: null }
  if (timeLimitReached) return { status: 'TIME_LIMIT_REACHED', errorReason: null, naReason }
  if (naReason) return { status: attemptedSamples > 0 ? 'INCOMPLETE' : 'NOT_APPLICABLE',
    errorReason: null, naReason }
  return { status: attemptedSamples === expectedSamples ? 'PASS' : 'INCOMPLETE',
    errorReason: null, naReason: null }
}

export function controlledJobCellTransition(currentStatus, { executionError = null, timeLimitReached = false } = {}) {
  if (timeLimitReached) return { status: currentStatus === 'FAIL' ? 'FAIL' : 'TIME_LIMIT_REACHED', stop: true }
  if (executionError) return { status: 'FAIL', stop: false }
  return { status: currentStatus, stop: false }
}

export function findNewBossExclusiveDrop(instances, beforeInstanceIds, sourceBoss, ownerId) {
  return [...instances].reverse().find(item => !beforeInstanceIds.has(item.instanceId)
    && item.ownerId === ownerId && item.baseId === sourceBoss.baseId
    && (item.provenance?.bossSource == null || item.provenance.bossSource === sourceBoss.definitionId)) ?? null
}

export function isEligibleDifferentBossDrop(item, targetBossDefinitionId, targetBossExclusiveBaseId) {
  return !!item && item.baseId !== targetBossExclusiveBaseId
    && item.provenance?.bossSource !== targetBossDefinitionId
}

export const CONTROLLED_MATRIX_SAMPLE_COUNT = 100
export const CONTROLLED_MATRIX_SEEDS = Object.freeze([61101, 61102, 61103])
export const CONTROLLED_MATRIX_TURN_LIMIT = 200
