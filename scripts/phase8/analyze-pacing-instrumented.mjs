import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { joinZeroXpCraftEventsToDecisions } from './pacing-analysis-core.mjs'

const attempt = resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw new Error('Usage: node scripts/phase8/analyze-pacing-instrumented.mjs <instrumented-attempt-directory>')
const files = await readdir(attempt)
const parseJsonl = async file => (await readFile(join(attempt, file), 'utf8')).trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
const rankOrder = { normal: 0, elite: 1, miniBoss: 2, boss: 3 }
const noProgressCounts = Object.fromEntries(['runner policy defect', 'runner-policy-limited', 'UI not visible or reachable', 'lacking resources', 'no understandable next goal', 'excessive wait-repeat cost', 'legitimate world wait'].map(category => [category, 0]))
const noProgressExamples = {}
const noProgressByRoute = {}
const choreRows = []
const bossMilestones = []
let decisionCount = 0, noProgressCount = 0

for (const file of files.filter(name => /^decisions-(life|adventure|hybrid)-\d+\.jsonl$/.test(name)).sort()) {
  const decisions = await parseJsonl(file)
  const [, route, seedText] = file.match(/^decisions-(life|adventure|hybrid)-(\d+)\.jsonl$/)
  const seed = Number(seedText)
  const seedData = JSON.parse(await readFile(join(attempt, `seed-${route}-${seed}.json`), 'utf8'))
  decisionCount += decisions.length
  const noops = decisions.filter(row => row.outcome === 'no-progress')
  noProgressCount += noops.length
  for (const row of noops) {
    const before = row.before, half = row.policyHalf, options = row.legalOptions
    const encounterOptions = [...options.encounterProjections.content, ...options.encounterProjections.wolves].filter(option => option.eligible)
    if (before.location.region === 'forest' && before.bossAlive && before.stamina >= 8) encounterOptions.push({ definitionId: 'chief', rank: 'boss', eligible: true })
    const legalRecipes = options.recipes.filter(recipe => recipe.recipeId === 'starterSpear')
    const matureCrop = before.crops.some(crop => crop.status === 'mature')
    const availableCrop = options.crops.some(crop => crop.status === 'available')
    const legalFarmAction = half === 'life' && before.location.region === 'farmland' && before.stamina >= 4
      && (matureCrop || (before.crops.length + before.preparedPlots < 3 && !before.crops.length && availableCrop)
        || (before.preparedPlots > 0 && availableCrop))
    const legalTrades = half === 'life' ? options.trades : []
    const policyCandidates = half === 'adventure' ? encounterOptions
      : [...legalRecipes, ...(legalFarmAction ? [{ recipeId: matureCrop ? 'harvest' : 'farm' }] : []), ...legalTrades]
    const encounterCountToday = seedData.encounters.filter(encounter => encounter.day === row.day && encounter.at <= before.worldTime).length
    const allNormalTargetsCapped = half === 'adventure' && encounterCountToday >= 3 && encounterOptions.length > 0
      && encounterOptions.every(option => option.rank === 'normal')
    const plantedButGrowing = half === 'life' && before.crops.some(crop => crop.status !== 'mature')
    const blockedByResources = (options.blockedRecipeReasons.materials_required ?? 0) > 0
      || (options.blockedRecipeReasons.gold_required ?? 0) > 0 || (options.blockedRecipeReasons.stamina_required ?? 0) > 0
      || before.stamina < (half === 'life' ? 4 : 8)
    let item
    if (allNormalTargetsCapped) item = { category: 'runner-policy-limited', confidence: 'high', reason: 'v3 daily encounter cap is consumed while eligible Normal targets remain; this is a runner limit, not a world wait' }
    else if (policyCandidates.length) item = { category: 'runner policy defect', confidence: 'medium', reason: `no action despite a policy-relevant public option: ${policyCandidates.map(option => option.definitionId ?? option.recipeId ?? option.item).slice(0, 8).join(', ')}` }
    else if (blockedByResources) item = { category: 'lacking resources', confidence: 'medium', reason: `snapshot records stamina ${before.stamina} and recipe blockers ${JSON.stringify(options.blockedRecipeReasons)}` }
    else if (plantedButGrowing) item = { category: 'legitimate world wait', confidence: 'medium', reason: 'a planted crop is still growing and no immediate policy action was projected at this location' }
    else item = { category: 'no understandable next goal', confidence: 'low', reason: 'no policy-relevant immediate option projected; player goal comprehension is outside this runner observation' }
    row.analysisCategory = item
    row.analysisPolicyOptions = policyCandidates
    const category = item.category
    noProgressCounts[category] = (noProgressCounts[category] ?? 0) + 1
    noProgressByRoute[route] ??= Object.fromEntries(Object.keys(noProgressCounts).map(name => [name, 0]))
    noProgressByRoute[route][category]++
    if (!noProgressExamples[category]) noProgressExamples[category] = []
    if (noProgressExamples[category].length < 3) noProgressExamples[category].push({ route, seed, at: before.worldTime,
      location: before.location, stamina: before.stamina, hp: before.hp, gold: before.gold,
      legalOptions: policyCandidates, confidence: item.confidence, reason: item.reason })
  }
  const seedCrafts = seedData.crafts ?? []
  const zeroXpCraftJoins = joinZeroXpCraftEventsToDecisions(seedCrafts, decisions)
  const zeroXpCrafts = zeroXpCraftJoins.map(row => row.event)
  let zeroXpAlternativeRecipes = 0, zeroXpAnyAlternative = 0
  for (const { event, decision } of zeroXpCraftJoins) {
    const alternatives = decision.legalOptions.recipes.filter(recipe => recipe.recipeId !== event.recipeId)
    if (alternatives.length) zeroXpAlternativeRecipes++
    const localAlternatives = decision.policyHalf === 'life' ? [
      ...(decision.before.location.region === 'farmland' ? decision.legalOptions.crops.filter(crop => ['available', 'mature'].includes(crop.status)) : []),
      ...decision.legalOptions.trades,
      ...(decision.before.location.region === 'forest' || decision.before.location.region === 'mine'
        ? decision.before.regions[decision.before.location.region].remainingAmount > 0 && decision.before.stamina >= 10 ? ['local-gather'] : [] : []),
    ] : []
    if (alternatives.length || localAlternatives.length) zeroXpAnyAlternative++
  }
  const encounterStarts = decisions.filter(row => row.chosenAction.some(action => /^(content-encounter-|wolf-track-|goblin-boss-challenge|forest-encounter)/.test(action.choice)))
  const sameTargetRepeats = []
  const encounters = seedData.encounters ?? []
  for (let index = 1; index < encounters.length; index++) {
    const current = encounters[index], previous = encounters[index - 1]
    if (current.definitionId !== previous.definitionId) continue
    const decision = encounterStarts[index]
    const selectedRank = rankOrder[current.rank] ?? -1
    const projections = decision?.legalOptions.encounterProjections ?? { content: [], wolves: [] }
    const higher = [...projections.content, ...projections.wolves].filter(option => option.eligible
      && option.definitionId !== current.definitionId && (rankOrder[option.rank] ?? -1) > selectedRank)
    const otherLegalTargets = [...projections.content, ...projections.wolves].filter(option => option.eligible && option.definitionId !== current.definitionId)
    if (decision?.before.location.region === 'forest' && decision.before.bossAlive && decision.before.stamina >= 8 && current.rank !== 'boss') {
      higher.push({ definitionId: 'goblin-boss', rank: 'boss', eligible: true })
      otherLegalTargets.push({ definitionId: 'goblin-boss', rank: 'boss', eligible: true })
    }
    sameTargetRepeats.push({ at: current.at, definitionId: current.definitionId, rank: current.rank,
      betterLegalHigherRankTarget: higher.length > 0, higherRankAlternatives: higher.map(option => option.definitionId),
      otherLegalTargets: otherLegalTargets.map(option => ({ definitionId: option.definitionId, rank: option.rank })) })
  }
  choreRows.push({ route, seed, zeroXpStarterSpearCrafts: zeroXpCrafts.length,
    zeroXpCraftsWithOtherLegalRecipeProjectedAtDecision: zeroXpAlternativeRecipes,
  zeroXpCraftsWithOtherLegalActionProjectedAtDecision: zeroXpAnyAlternative,
    repeatedSameEnemyAdjacentEncounters: sameTargetRepeats.length,
    repeatedEnemyMomentsWithHigherRankTargetLegal: sameTargetRepeats.filter(row => row.betterLegalHigherRankTarget).length,
    repeatedEnemyMomentsWithAnyOtherLegalTarget: sameTargetRepeats.filter(row => row.otherLegalTargets.length).length,
    otherLegalTargetExamples: sameTargetRepeats.filter(row => row.otherLegalTargets.length).slice(0, 5),
    higherRankExamples: sameTargetRepeats.filter(row => row.betterLegalHigherRankTarget).slice(0, 5),
    encounterStartDecisions: encounterStarts.length, encounterRows: encounters.length })
}

const visibility = JSON.parse(await readFile(join(attempt, 'boss-visibility.json'), 'utf8'))
for (const file of files.filter(name => /^seed-(life|adventure|hybrid)-\d+\.json$/.test(name)).sort()) {
  const data = JSON.parse(await readFile(join(attempt, file), 'utf8'))
  const { route, seed } = data.summary
  const encounters = data.encounters.filter(row => row.rank === 'boss')
  const seenRows = visibility.filter(row => row.route === route && row.seed === seed)
  const ids = new Set([...seenRows.flatMap(row => row.visible.map(option => option.id)), ...encounters.map(row => row.definitionId)])
  for (const definitionId of ids) {
    const visibleAt = seenRows.find(row => row.visible.some(option => option.id === definitionId))?.at ?? null
    const eligibleAt = seenRows.find(row => row.visible.some(option => option.id === definitionId && option.eligible))?.at ?? null
    const bossEncounters = encounters.filter(row => row.definitionId === definitionId)
    const engagedAt = bossEncounters[0]?.at ?? null
    const firstWin = bossEncounters.find(row => row.outcome === 'win')
    const winAt = firstWin ? firstWin.at + (firstWin.timeDeltaMinutes ?? 0) : null
    bossMilestones.push({ route, seed, definitionId, firstVisibleAt: visibleAt, firstEligibleAt: eligibleAt,
      firstEngagedAt: engagedAt, firstWinAt: winAt,
      visibilityToEligibilityMinutes: visibleAt !== null && eligibleAt !== null ? eligibleAt - visibleAt : null,
      encounterToWinMinutes: engagedAt !== null && winAt !== null ? winAt - engagedAt : null })
  }
}

const bossRouteProgression = [...new Set(bossMilestones.map(row => `${row.route}/${row.seed}`))].map(key => {
  const [route, seedText] = key.split('/')
  const rows = bossMilestones.filter(row => row.route === route && row.seed === Number(seedText))
  const first = field => rows.filter(row => row[field] !== null).sort((left, right) => left[field] - right[field])[0] ?? null
  const visible = first('firstVisibleAt'), eligible = first('firstEligibleAt'), engaged = first('firstEngagedAt'), won = first('firstWinAt')
  return { route, seed: Number(seedText), firstBossVisibleAt: visible?.firstVisibleAt ?? null, visibleDefinitionId: visible?.definitionId ?? null,
    firstBossEligibleAt: eligible?.firstEligibleAt ?? null, eligibleDefinitionId: eligible?.definitionId ?? null,
    firstBossEngagedAt: engaged?.firstEngagedAt ?? null, engagedDefinitionId: engaged?.definitionId ?? null,
    firstBossWinAt: won?.firstWinAt ?? null, winDefinitionId: won?.definitionId ?? null,
    visibilityToEligibilityMinutes: visible && eligible ? eligible.firstEligibleAt - visible.firstVisibleAt : null,
      routeElapsedFromFirstBossEngagementToFirstWinMinutes: engaged && won ? won.firstWinAt - engaged.firstEngagedAt : null }
})

const summary = { attempt, sourceHead: JSON.parse(await readFile(join(attempt, 'manifest.json'), 'utf8')).head,
  routeStatus: JSON.parse(await readFile(join(attempt, 'completion.json'), 'utf8')).status,
  decisionCount, noProgressCount, noProgressCounts, noProgressByRoute, noProgressExamples, choreRows, bossMilestones, bossRouteProgression,
  interpretation: { uiNotVisibleOrReachable: '0 assigned; the runner does not observe rendered UI/accessibility, so this category is NOT MEASURED rather than disproven',
    excessiveWaitRepeatCost: 'zero observed because the v3 runner stops after one policy no-op and the action log contains no repeated wait action' } }
await writeFile(join(attempt, 'analysis-summary-r9.json'), `${JSON.stringify(summary, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ attempt, decisionCount, noProgressCount, noProgressCounts, noProgressByRoute,
  chores: choreRows.map(({ route, seed, zeroXpStarterSpearCrafts, zeroXpCraftsWithOtherLegalRecipeProjectedAtDecision,
    zeroXpCraftsWithOtherLegalActionProjectedAtDecision, repeatedSameEnemyAdjacentEncounters,
    repeatedEnemyMomentsWithHigherRankTargetLegal, repeatedEnemyMomentsWithAnyOtherLegalTarget }) => ({ route, seed,
    zeroXpStarterSpearCrafts, zeroXpCraftsWithOtherLegalRecipeProjectedAtDecision, zeroXpCraftsWithOtherLegalActionProjectedAtDecision,
    repeatedSameEnemyAdjacentEncounters, repeatedEnemyMomentsWithHigherRankTargetLegal, repeatedEnemyMomentsWithAnyOtherLegalTarget })),
  bossRouteProgression }, null, 2))
