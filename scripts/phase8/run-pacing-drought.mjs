import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyNoProgress, gapSummary, percentile } from './pacing-analysis-core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const attempt = join(root, 'reports/v2/20261014-balance-tuning/phase-08/a-baseline-run/attempt-20261014T040039340Z')
const out = join(root, 'reports/v2/20261014-balance-tuning/phase-08/e-runner')
const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('-', '').replaceAll('.', '')
const seeds = [61101, 61102, 61103], routes = ['life', 'adventure', 'hybrid']
const parsed = []
for (const route of routes) for (const seed of seeds) {
  const path = join(attempt, `seed-${route}-${seed}.json.gz`)
  const evidence = JSON.parse(gunzipSync(await readFile(path)))
  const { summary, actions, daily, encounters, gearChanges, recipeUnlocks } = evidence
  const orderedActions = [...actions].sort((a, b) => a.at - b.at)
  const actionIndex = at => orderedActions.findIndex(row => row.at >= at) < 0 ? orderedActions.length
    : orderedActions.findIndex(row => row.at >= at)
  const events = {
    meaningfulItem: gearChanges.map(row => ({ at: row.at, actionIndex: actionIndex(row.at), evidence: row.next })),
    skillLevel: [], newEnemy: [], wealthStep: [], newRecipeGoal: recipeUnlocks.map(row => ({ at: row.firstLegalAt, actionIndex: actionIndex(row.firstLegalAt), evidence: row.recipeId })),
  }
  let priorSkills = { combat: 1, farming: 1, mining: 1, woodcutting: 1, smithing: 1 }
  for (const row of daily) {
    for (const skill of ['combat', 'farming', 'mining', 'woodcutting', 'smithing']) if ((row[skill] ?? 1) > (priorSkills[skill] ?? 1)) {
      events.skillLevel.push({ at: row.worldTime, actionIndex: actionIndex(row.worldTime), evidence: `${skill}:${row[skill]}` })
    }
    priorSkills = row
  }
  const seenEnemies = new Set()
  for (const row of encounters) if (!seenEnemies.has(row.definitionId)) {
    seenEnemies.add(row.definitionId); events.newEnemy.push({ at: row.at, actionIndex: actionIndex(row.at), evidence: row.definitionId })
  }
  // Analyst-defined wealth bands are descriptive bins, not product targets or authored rewards.
  const wealthBands = [100, 500, 1000, 5000, 10000]
  let highWater = summary.final?.gold ?? 0
  for (const row of [...daily].sort((a, b) => a.worldTime - b.worldTime)) {
    const crossed = wealthBands.filter(value => value <= row.gold && value > (events.wealthStep.at(-1)?.band ?? 0))
    for (const band of crossed) events.wealthStep.push({ at: row.worldTime, actionIndex: actionIndex(row.worldTime), band, evidence: `gold high-water ${band}` })
    highWater = Math.max(highWater, row.gold)
  }
  const noProgress = actions.filter(row => row.noProgress).map(row => {
    const snapshot = daily.find(candidate => candidate.day === row.day)
    return { ...row, ...classifyNoProgress(row, { stamina: snapshot?.stamina, gold: snapshot?.gold }),
      sampledState: snapshot ? { at: snapshot.worldTime, ageMinutes: snapshot.worldTime - row.at,
        stamina: snapshot.stamina, hp: snapshot.hp, gold: snapshot.gold,
        gameHourAtAction: Math.floor((row.at % 1440) / 60), settlementStage: snapshot.settlementStage } : null }
  })
  const craftRows = evidence.crafts
  const sameLowCraft = craftRows.filter(row => row.recipeId === 'starterSpear' && row.practiceXpAward === 0).length
  const gatherRuns = orderedActions.reduce((acc, row) => {
    if (row.choice === 'gather') { if (acc.last === 'gather') acc.current++; else { acc.current = 1; acc.runs.push(1) } acc.last = 'gather'; acc.runs[acc.runs.length - 1] = acc.current }
    else { acc.last = row.choice; acc.current = 0 }
    return acc
  }, { last: '', current: 0, runs: [] }).runs
  const gatherActions = orderedActions.filter(row => row.choice === 'gather').length
  const waitRepeats = orderedActions.reduce((n, row, i) => n + (/wait|world-wait/i.test(row.choice) && row.choice === orderedActions[i - 1]?.choice ? 1 : 0), 0)
  const streaks = []
  for (let i = 0; i < encounters.length;) {
    let j = i + 1
    while (j < encounters.length && encounters[j].definitionId === encounters[i].definitionId) j++
    streaks.push({ definitionId: encounters[i].definitionId, length: j - i, from: encounters[i].at, to: encounters[j - 1].at })
    i = j
  }
  parsed.push({ route, seed, policy: summary.policyVersion, window: { start: summary.startedAt, end: summary.completedAt },
    actionCount: actions.length, events, gaps: Object.fromEntries(Object.entries(events).map(([kind, rows]) => [kind,
      gapSummary(rows, summary.startedAt, summary.completedAt, actionIndex)])),
    choreRisk: { lowTierCraftsAfterPracticeCap: sameLowCraft, gatherActions, consecutiveGatherRepeats: gatherActions - gatherRuns.length,
      maxConsecutiveGatherActions: Math.max(0, ...gatherRuns), repeatedSameWaitActions: waitRepeats,
      sameEnemyStreaks: streaks.filter(row => row.length > 1), betterLegalOptionAtAction: 'NOT RECORDED in A-v3 action evidence; cannot infer.' },
    noProgress: { count: noProgress.length, byClass: Object.fromEntries([...new Set(noProgress.map(row => row.category))]
      .map(category => [category, noProgress.filter(row => row.category === category).length])),
      lowConfidenceOrUnknown: noProgress.filter(row => row.confidence === 'low').length,
      sameDayStateContext: { snapshots: noProgress.filter(row => row.sampledState).length,
        medianSnapshotAgeMinutes: percentile(noProgress.map(row => row.sampledState?.ageMinutes).filter(Number.isFinite), .5),
        dailySnapshotStaminaBelow10: noProgress.filter(row => row.sampledState && row.sampledState.stamina < 10).length,
        dailySnapshotGoldBelow100: noProgress.filter(row => row.sampledState && row.sampledState.gold < 100).length } },
    goalEvidence: { recipeUnlocks: recipeUnlocks.map(row => ({ at: row.firstLegalAt, recipeId: row.recipeId })),
      rankUnlocks: 'NOT TIME-INDEXED in retained A-v3 files', bossEligibility: 'NOT TIME-INDEXED in retained A-v3 files' },
    wealthHighWater: highWater })
}
await mkdir(out, { recursive: true })
const outputFile = `route-pacing-attempt-${stamp}.json`
await writeFile(join(out, outputFile), `${JSON.stringify({ sourceAttempt: attempt, policy: 'A v3 normal scripted policies', routes: parsed,
  limitations: ['No human play evidence.', 'Action evidence has no full per-action state snapshots; legal-option-at-moment judgments are unavailable.',
    'Rank unlock and Boss eligibility timestamps are not retained in the A-v3 seed files.', 'Gold bands are analyst bins only, not product targets.'] }, null, 2)}\n`, { flag: 'wx' })
console.log(`route pacing analyzed: ${parsed.length} route/seed samples; ${outputFile}`)
