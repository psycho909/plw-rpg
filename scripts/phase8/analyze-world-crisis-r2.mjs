import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = resolve('reports/v2/20261014-balance-tuning/phase-08/d-runner')
const dirs = (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory() && entry.name.startsWith('attempt-'))
const runs = []
for (const entry of dirs) {
  const dir = join(root, entry.name)
  let manifest
  try { manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')) } catch { continue }
  if (!Array.isArray(manifest.scenarios) || manifest.scenarios.length !== 1) continue
  const scenario = manifest.scenarios[0]
  let summary
  try { summary = JSON.parse(await readFile(join(dir, 'summary.json'), 'utf8')) } catch { continue }
  const checkpoints = JSON.parse(await readFile(join(dir, 'checkpoints.json'), 'utf8'))
  const deaths = JSON.parse(await readFile(join(dir, 'deaths.json'), 'utf8'))
  const successions = JSON.parse(await readFile(join(dir, 'successions.json'), 'utf8'))
  runs.push({ attempt: entry.name, manifest, scenario, summary, checkpoints, deaths, successions })
}
const latest = (scenario, years) => runs.filter(run => run.scenario === scenario && run.manifest.years.join(',') === years.join(','))
  .sort((a,b) => a.manifest.startedAt.localeCompare(b.manifest.startedAt)).at(-1)
const mean = rows => rows.length ? rows.reduce((total,row)=>total+row,0)/rows.length : null
const rounded = value => value === null ? null : Math.round(value*100)/100
const summarizeRun = async run => {
  const dailyRows = await readFile(join(root,run.attempt,'daily-balance.json'),'utf8').then(JSON.parse).catch(()=>null)
  const dailyBalance = dailyRows ? { seeds:dailyRows.length, meanGrowthPerDay:rounded(mean(dailyRows.map(row=>row.averageGrowthPerDay))), meanGuardReductionPerDay:rounded(mean(dailyRows.map(row=>row.averageGuardReductionPerDay))),
    totalCrisisOutcomeDelta:rounded(dailyRows.reduce((sum,row)=>sum+row.crisisOutcomeDelta,0)), totalPlayerCombatRelief:rounded(dailyRows.reduce((sum,row)=>sum+row.playerCombatRelief,0)),
    totalNpcBossDefeats:dailyRows.reduce((sum,row)=>sum+row.npcBossDefeats,0), totalNpcBossRelief:25*dailyRows.reduce((sum,row)=>sum+row.npcBossDefeats,0),
    passiveResidualAfterNpcBoss:rounded(dailyRows.reduce((sum,row)=>sum+row.passiveResidualDelta,0)+25*dailyRows.reduce((sum,row)=>sum+row.npcBossDefeats,0)),
    meanDays:rounded(mean(dailyRows.map(row=>row.days))) } : null
  return { scenario: run.scenario, attempt: run.attempt, checkpoints: run.checkpoints.length,
  deaths: run.deaths.length, deathsByCause: Object.fromEntries(Object.entries(Object.groupBy(run.deaths,row=>row.cause)).map(([key,rows])=>[key,rows.length])),
  deathsByActivity: Object.fromEntries(Object.entries(Object.groupBy(run.deaths,row=>row.activity)).map(([key,rows])=>[key,rows.length])), successions: run.successions.length,
  deathsByCauseStats: Object.fromEntries(Object.entries(Object.groupBy(run.deaths,row=>row.cause)).map(([key,rows])=>[key,{count:rows.length,ageRange:[Math.min(...rows.map(row=>row.age)),Math.max(...rows.map(row=>row.age))],yearRange:[Math.min(...rows.map(row=>row.year)),Math.max(...rows.map(row=>row.year))]}])),
  combatDeathSamples: run.deaths.filter(row=>row.cause==='戰鬥傷勢').slice(0,6).map(({seed,age,year,activity})=>({seed,age,year,activity})),
  parity: { saveReload:run.checkpoints.filter(row=>row.saveReloadEqual).length, continuation:run.checkpoints.filter(row=>row.continuationEqual).length },
  crisisCount: run.summary.crisisCount, outcome100: run.summary.summaries[run.scenario]?.['100']?.outcomeDistribution ?? null,
  avgReadiness100: rounded(run.summary.summaries[run.scenario]?.['100']?.avgReadinessAtTrigger ?? null),
  dailyBalance,
  years: Object.fromEntries([10,50,100].map(year=>{ const rows=run.checkpoints.filter(row=>row.year===year); return [year,
    Object.fromEntries(['monsterPopulation','safety','food','prosperity','population','playerGold','bossSpawns'].map(key=>[key,rounded(mean(rows.map(row=>row[key])))])),
  ] })) }
}

const matrix = ['no-intervention','life-focused','adventure-focused','mixed','prosperous-controlled','struggling-controlled']
  .map(scenario=>latest(scenario,[10,50,100])).filter(Boolean)
const matrixSummary = await Promise.all(matrix.map(summarizeRun))
const compactMatrix = matrixSummary.map(row=>({scenario:row.scenario,attempt:row.attempt,checkpoints:row.checkpoints,deaths:row.deaths,successions:row.successions,
  deathCauses:row.deathsByCauseStats,combatDeathSamples:row.combatDeathSamples,crises:row.crisisCount,outcomes100:row.outcome100,avgReadiness100:row.avgReadiness100,
  parity:row.parity,dailyBalance:row.dailyBalance,years:row.years}))
const seasonal = latest('life-seasonal-sell',[10])
let cropSummary = null
if (seasonal) {
  const sales = JSON.parse(await readFile(join(root,seasonal.attempt,'crop-sales.json'),'utf8'))
  cropSummary = { attempt: seasonal.attempt, checkpoints: seasonal.checkpoints.map(({seed,playerGold,playerAlive,monsterPopulation,safety})=>({seed,playerGold,playerAlive,monsterPopulation,safety})),
    harvests: sales.length, byCrop: Object.fromEntries(Object.entries(Object.groupBy(sales,row=>row.crop)).map(([crop,rows])=>[crop,{harvests:rows.length,totalUnits:rows.reduce((n,row)=>n+row.unitsSold,0),totalGold:rows.reduce((n,row)=>n+row.goldProceeds,0),growthMinutes:rows[0].growthMinutes,legalSeasons:rows[0].legalSeasons,yieldRange:[Math.min(...rows.map(row=>row.amount)),Math.max(...rows.map(row=>row.amount))],sellEach:rows[0].sellEach,foodEach:rows[0].foodEach}])),
    bySeed:Object.fromEntries(Object.entries(Object.groupBy(sales,row=>row.seed)).map(([seed,rows])=>[seed,{harvests:rows.length,units:rows.reduce((n,row)=>n+row.unitsSold,0),gold:rows.reduce((n,row)=>n+row.goldProceeds,0)}])) }
}
const contribEntries = dirs.filter(entry=>entry.name.endsWith('-contributions')).sort((a,b)=>a.name.localeCompare(b.name))
const contrib = contribEntries.at(-1)
const probes = contrib ? JSON.parse(await readFile(join(root,contrib.name,'contribution-probes.json'),'utf8')).map(row=>({kind:row.kind,readinessBefore:rounded(row.before.readiness),readinessAfter:rounded(row.after.readiness),readinessDelta:rounded(row.readinessDelta),chanceBefore:rounded(row.before.successChance),chanceAfter:rounded(row.after.successChance),chanceDelta:rounded(row.successChanceDelta),foodShortage:rounded(row.before.food.shortage),goldShortage:row.before.needs.find(n=>n.id==='gold').shortage,equipmentShortage:row.before.needs.find(n=>n.id==='equipment').shortage,defenderShortage:row.before.needs.find(n=>n.id==='defenders').shortage,interventions:row.interventions})) : []
console.log(JSON.stringify({matrix:compactMatrix,cropSummary,contributionAttempt:contrib?.name,probes},null,2))
