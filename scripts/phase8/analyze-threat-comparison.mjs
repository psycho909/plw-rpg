import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = resolve('reports/v2/20261014-balance-tuning/phase-08/d-runner/d2-controlled')
const attempts = []
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('attempt-')) continue
  const dir = join(root, entry.name)
  try {
    const [manifest, summary, checkpoints, daily, crises, actions] = await Promise.all([
      'manifest.json','summary.json','checkpoints.json','daily-balance.json','crises.json','actions.json'
    ].map(file => readFile(join(dir, file), 'utf8').then(JSON.parse)))
    if (!manifest.parameterComparison) continue
    attempts.push({ name: entry.name, dir, manifest, summary, checkpoints, daily, crises, actions })
  } catch {}
}

const mean = rows => rows.length ? rows.reduce((sum, value) => sum + value, 0) / rows.length : null
const rounded = value => value === null ? null : Math.round(value * 1e4) / 1e4
const labels = ['V0-current','G1-growth-equals-guard-offset','G2-halfway-growth','K1-guard-coefficient-equals-growth']
const result = []
for (const label of labels) for (const scenario of ['no-intervention','life-focused','adventure-focused']) {
  const rows = attempts.filter(run => run.manifest.parameterComparison.label === label && run.manifest.scenarios.length === 1 && run.manifest.scenarios[0] === scenario)
    .sort((a,b) => a.manifest.startedAt.localeCompare(b.manifest.startedAt))
  const run = rows.at(-1)
  if (!run) { result.push({ label, scenario, status: 'MISSING' }); continue }
  const daily = run.daily
  const totalDays = daily.reduce((sum, row) => sum + row.days, 0)
  const budget = {
    rows: daily.length,
    expectedDailyTicks: daily.reduce((sum, row) => sum + row.expectedDailyTicks, 0),
    simulatedMinutes: daily.reduce((sum, row) => sum + row.simulatedMinutes, 0),
    elapsedMinutes: daily.reduce((sum, row) => sum + row.elapsedMinutes, 0),
    crisisOutcomeDelta: daily.reduce((sum, row) => sum + row.crisisOutcomeDelta, 0),
    crisisOutcomeDeltaFromRaw: daily.reduce((sum, row) => sum + row.crisisOutcomeDeltaFromRaw, 0),
    accountingValid: daily.length === run.manifest.seeds.length && daily.every(row => row.simulatedMinutesCovered && row.dailyTicksCovered && row.crisisDeltaReconciles),
  }
  const checkpointAt = year => run.checkpoints.filter(row => row.year === year)
  const horizons = Object.fromEntries([10,50,100].map(year => {
    const checkpoints = checkpointAt(year)
    const crisis = run.summary.summaries[scenario]?.[year] ?? null
    return [year, {
      checkpoints: checkpoints.length,
      monsterPopulation: rounded(mean(checkpoints.map(row => row.monsterPopulation))),
      threatBands: Object.fromEntries([0,1,2,3].map(band => [band, checkpoints.filter(row => row.threatLevel === band).length])),
      safetyMean: rounded(mean(checkpoints.map(row => row.safety))),
      safetyMin: checkpoints.length ? Math.min(...checkpoints.map(row => row.safety)) : null,
      populationMean: rounded(mean(checkpoints.map(row => row.population))),
      foodMean: rounded(mean(checkpoints.map(row => row.food))),
      prosperityMean: rounded(mean(checkpoints.map(row => row.prosperity))),
      bossSpawnsMean: rounded(mean(checkpoints.map(row => row.bossSpawns))),
      crisisCount: crisis?.count ?? null,
      crisisResolved: crisis?.resolved ?? null,
      crisisIntervalsDays: crisis?.intervalDays ?? null,
      crisisOutcomes: crisis?.outcomeDistribution ?? null,
    }]
  }))
  const crisisCount100 = horizons[100]?.crisisCount ?? null
  const crisisPopulationDelta3Seed = budget.crisisOutcomeDeltaFromRaw
  const bandDays = [0,1,2,3].map(band => daily.reduce((sum,row) => sum + row.threatBandDays[band],0))
  const popBins = Object.fromEntries(['0-24','25-49','50-74','75-99','100'].map(bin => [bin,daily.reduce((sum,row)=>sum+row.monsterPopulationDays[bin],0)]))
  const safetyBins = Object.fromEntries(['0-25','26-50','51-75','76-100'].map(bin => [bin,daily.reduce((sum,row)=>sum+row.safetyDays[bin],0)]))
  const combatActions = run.actions.filter(row => row.scenario === scenario && /combat|encounter/.test(row.kind))
  result.push({ label, scenario, attempt: run.name, parameters: run.manifest.parameterComparison,
    validity: run.summary.validity, checkpoints: run.checkpoints.length, totalDays, dailyBudget: budget,
    crisisDenominators100y: { totalAcrossThreeSeeds: crisisCount100,
      meanPerSeedCentury: crisisCount100 === null ? null : crisisCount100 / run.manifest.seeds.length,
      meanPerSeedYear: crisisCount100 === null ? null : crisisCount100 / (run.manifest.seeds.length * 100) },
    crisisPopulationDelta100y: { totalAcrossThreeSeeds: crisisPopulationDelta3Seed,
      meanPerSeedCentury: crisisPopulationDelta3Seed / run.manifest.seeds.length,
      meanPerSeedYear: crisisPopulationDelta3Seed / (run.manifest.seeds.length * 100) },
    monsterThreatBandDays: Object.fromEntries([0,1,2,3].map((band,index)=>[band,{days:bandDays[index],percent:rounded(100*bandDays[index]/totalDays)}])),
    monsterPopulationDays: popBins, safetyDays: safetyBins,
    safetyFloorDays: daily.reduce((sum,row)=>sum+row.safetyFloorDays,0),
    meanGrowthPerDay: rounded(mean(daily.map(row=>row.averageGrowthPerDay))),
    meanGuardReductionPerDay: rounded(daily.reduce((sum,row)=>sum+row.guardReduction,0)/totalDays),
    crisisOutcomesAllHorizon: run.summary.summaries[scenario]?.[100]?.outcomeDistribution ?? null,
    lifeForcedFightCheck: scenario === 'life-focused' ? { combatOrEncounterActions: combatActions.length, actionKinds: [...new Set(combatActions.map(row=>row.kind))] } : undefined,
    horizons })
}
await writeFile(join(root, 'comparison-summary.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result.map(row => ({ label: row.label, scenario: row.scenario, attempt: row.attempt, status: row.status ?? row.validity?.status,
  checkpoints: row.checkpoints, crisesAt100: row.horizons?.[100]?.crisisCount, resolvedAt100: row.horizons?.[100]?.crisisResolved,
  monsterAt100: row.horizons?.[100]?.monsterPopulation, safetyAt100: row.horizons?.[100]?.safetyMean,
  band3Percent: row.monsterThreatBandDays?.[3]?.percent, safetyFloorPercent: row.totalDays ? rounded(row.safetyFloorDays / row.totalDays * 100) : null })), null, 2))
