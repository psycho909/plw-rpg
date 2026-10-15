export const WORLD_SEEDS = [40131, 40132, 40133]
export const WORLD_YEARS = [10, 50, 100]
export const WORLD_SCENARIOS = ['no-intervention', 'life-focused', 'adventure-focused', 'mixed', 'prosperous-controlled', 'struggling-controlled']

export function summarizeWorld(rows) {
  const resolved = rows.filter(row => row.outcome)
  const distribution = Object.fromEntries(['decisive_success', 'costly_success', 'setback', 'local_defeat'].map(key => [key, resolved.filter(row => row.outcome === key).length]))
  const bySeed = new Map()
  for (const row of rows) {
    if (row.triggeredAt === undefined) continue
    const seed = row.seed ?? 'all'
    if (!bySeed.has(seed)) bySeed.set(seed, [])
    bySeed.get(seed).push(row)
  }
  const intervals = [...bySeed.values()].flatMap(seedRows => seedRows.sort((a,b) => a.triggeredAt-b.triggeredAt)
    .slice(1).map((row,index) => (row.triggeredAt - seedRows[index].triggeredAt) / 1440))
  const sortedIntervals = intervals.slice().sort((a,b) => a-b)
  const middle = Math.floor(sortedIntervals.length / 2)
  const median = !sortedIntervals.length ? null : sortedIntervals.length % 2
    ? sortedIntervals[middle] : (sortedIntervals[middle - 1] + sortedIntervals[middle]) / 2
  return { count: rows.length, resolved: resolved.length, outcomeDistribution: distribution,
    intervalDays: intervals.length ? { min: Math.min(...intervals), median, max: Math.max(...intervals) } : null,
    readinessAtTrigger: rows.map(row => row.readinessAtTrigger).filter(Number.isFinite),
    avgReadinessAtTrigger: rows.length ? rows.reduce((sum,row)=>sum+(row.readinessAtTrigger ?? 0),0)/rows.length : null }
}

export function validateWorldRun({ seeds, years, scenarios, checkpoints, transitions }) {
  const failures = []
  if (seeds.length < 3 || new Set(seeds).size !== seeds.length) failures.push('need-at-least-three-distinct-seeds')
  if (!years.length || years.some(year => ![10, 50, 100].includes(year)) || new Set(years).size !== years.length) failures.push('invalid-horizon-selection')
  for (const scenario of scenarios) for (const seed of seeds) for (const year of years) {
    if (!checkpoints.some(row => row.scenario === scenario && row.seed === seed && row.year === year)) failures.push(`missing-checkpoint:${scenario}:${seed}:${year}`)
  }
  if (!transitions.length) failures.push('no-crisis-phase-evidence')
  if (checkpoints.some(row => row.saveReloadEqual !== true)) failures.push('save-reload-equality-failed')
  if (checkpoints.some(row => row.continuationEqual !== true)) failures.push('continuation-equality-failed')
  const playerScenarios = scenarios.filter(scenario => !['no-intervention', 'prosperous-controlled', 'struggling-controlled'].includes(scenario))
  if (checkpoints.some(row => playerScenarios.includes(row.scenario) && (!row.playerAlive || row.unresolvedPlayerDeath))) failures.push('active-player-dead-without-successor')
  return { status: failures.length ? 'INVALID' : 'VALID', failures }
}
