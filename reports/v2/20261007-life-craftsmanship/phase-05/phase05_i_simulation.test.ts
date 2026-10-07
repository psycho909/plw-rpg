import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { expect, it } from 'vitest'
import { CRAFTING_RECIPES } from '../../../../src/data/crafting'
import { BUILDINGS } from '../../../../src/data/config'
import { PROPERTY_DEFINITIONS } from '../../../../src/data/ownership'
import { AFFIXES, ITEM_BASES, ITEM_GENERATION_RULES, MATERIALS, RARITIES, WOLF_LOOT_RULES, WOLF_MONSTERS } from '../../../../src/data/rewards'
import { craftQualityProfile, generateItem, awardWolfLoot } from '../../../../src/engine/itemGeneration'
import { rolledItemStats } from '../../../../src/engine/gearStats'
import { createGame, gainExp, player } from '../../../../src/engine/simulation'
import { buyPrice, combatTurn } from '../../../../src/engine/actions'
import { planCraft } from '../../../../src/engine/crafting'
import { buyProperty } from '../../../../src/engine/ownership'
import { encounterWolf, resolveWolfCombatStats, wolfCombatPhase, wolfCombatPresentation, wolfChargeHealing, wolfDefenseForTurn } from '../../../../src/engine/wolfFamily'
import { playerAttackDamage } from '../../../../src/engine/combatStats'
import { equipInstance, equippedInstance, itemSellPrice } from '../../../../src/engine/rewardActions'
import { deserialize, serialize } from '../../../../src/services/saveService'
import type { GameState } from '../../../../src/domain/types'
import type { BossVariantId, ItemBaseId, ItemInstance, MonsterDefinitionId, MonsterTraitId, RarityId } from '../../../../src/domain/reward'

const root = process.cwd(), out = `${root}/reports/v2/20261007-life-craftsmanship/phase-05`
const releasePath = `${out}/i-release.json`
const hybridAcceptancePath = 'reports/v2/20261007-life-craftsmanship/phase-05/hybrid-acceptance.json'
const release = existsSync(releasePath) ? JSON.parse(readFileSync(releasePath, 'utf8')) as Record<string, unknown> : null
const releasedIt = release ? it : it.skip
const requestedSeedCount = Number(release?.combatSeedCount ?? 8)
const seeds = Array.isArray(release?.combatSeeds) ? release!.combatSeeds as number[] : [10009, 10037, 10061, 10067, 10069, 10079, 10091, 10099]
const runId = typeof release?.runId === 'string' ? release.runId : 'unreleased'
const runLabel = `i-${runId}`
const distributionSeed = Number(release?.distributionSeed ?? 20261007)
const distributionBudget = 100_000
const powerbands = ['early', 'edge', 'ready'] as const
const builds = ['legacy', 'earlygear', 'raw', 'crit', 'bleed', 'penetration', 'affixControl', 'defense', 'common', 'rare', 'epic', 'eliteDrop', 'miniBossDrop', 'boss', 'bossStandardBody',
  'craftSpearNeutral', 'craftSpearFang', 'craftSpearMoon', 'craftFieldArmorNeutral', 'craftFieldArmorHide', 'craftHighSword', 'craftHighSwordMP', 'craftHighSwordMPControl'] as const
const policies = ['attack', 'cue'] as const
type Build = typeof builds[number]
type Powerband = typeof powerbands[number]
type Target = { id: MonsterDefinitionId; variant?: BossVariantId; traits?: MonsterTraitId[]; fixture?: string }
const targets: Target[] = [
  { id: 'grayWolf' }, { id: 'alphaWolf' }, { id: 'alphaWolf', traits: ['armored'], fixture: 'controlled-armored-elite' },
  { id: 'wolfKing', variant: 'wellFed' }, { id: 'wolfKing', variant: 'starved' }, { id: 'wolfKing', variant: 'moonlit' },
]
const focus: Partial<Record<Build, string>> = { crit: 'keen', bleed: 'bleeding', penetration: 'piercing', defense: 'warding' }
const rarityFor: Partial<Record<Build, RarityId>> = { earlygear: 'common', raw: 'common', common: 'common', rare: 'rare', epic: 'epic' }
function allSourceFiles(directory = `${root}/src`): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...allSourceFiles(absolute))
    else if (entry.isFile() || (entry.isSymbolicLink() && statSync(absolute).isFile())) {
      files.push(relative(root, absolute).split(sep).join('/'))
    }
  }
  return files.sort()
}
function sourceSnapshot() {
  const rootBuildInputs = readdirSync(root).filter(name => /^(?:package(?:\..+)?\.json|.+lock(?:\.yaml|\.yml|\.json)?|tsconfig.*\.json|vite\.config\..+|vitest\.config\..+|\.npmrc|\.nvmrc|eslint\.config\..*)$/.test(name)
    && statSync(join(root, name)).isFile())
  const explicit = ['reports/v2/20261007-life-craftsmanship/phase-05/phase05_i_simulation.test.ts',
    'reports/v2/20261006-reward-core/phase-04/combat_simulation.test.ts', 'reports/v2/20261006-reward-core/phase-04/final-combat-balance.json',
    'docs/specs/V2X-PHASE5-LIFE-CRAFTSMANSHIP.md', 'reports/v2/20261007-life-craftsmanship/phase-05/slice-decisions.md',
    'reports/v2/20261007-life-craftsmanship/phase-05/g-economy-proposal.md', 'reports/v2/20261007-life-craftsmanship/phase-05/runner-reuse.md',
    'reports/v2/20261007-life-craftsmanship/phase-05/i-runner-design.md',
    'vitest.phase05-i.config.ts',
    'scripts/recorded_reports.py'].filter(path => existsSync(`${root}/${path}`))
  if (existsSync(`${root}/${hybridAcceptancePath}`)) {
    const acceptance = JSON.parse(readFileSync(`${root}/${hybridAcceptancePath}`, 'utf8')) as Record<string, unknown>
    const resultPath = typeof acceptance.resultPath === 'string' ? acceptance.resultPath : ''
    if (resultPath && !resultPath.startsWith('/') && !resultPath.split('/').includes('..') && existsSync(`${root}/${resultPath}`)) {
      explicit.push(hybridAcceptancePath, resultPath)
    } else explicit.push(hybridAcceptancePath)
  }
  explicit.push(...rootBuildInputs)
  const sourceFiles = [...new Set([...allSourceFiles(), ...explicit])].sort()
  const sourceSha256 = Object.fromEntries(sourceFiles.map(path => [path, createHash('sha256').update(readFileSync(`${root}/${path}`)).digest('hex')]))
  return { commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceSha256,
    fingerprint: createHash('sha256').update(JSON.stringify(sourceSha256)).digest('hex') }
}
function gitStatus() {
  return execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8' }).trimEnd()
}
function checkHybridAcceptance(snapshot: ReturnType<typeof sourceSnapshot>) {
  const path = typeof release?.hybridAcceptancePath === 'string' ? release.hybridAcceptancePath : ''
  expect(path, 'I release must pin the accepted H artifact path').toBe(hybridAcceptancePath)
  expect(existsSync(`${root}/${hybridAcceptancePath}`), 'H acceptance must exist before I release').toBe(true)
  const acceptanceBytes = readFileSync(`${root}/${hybridAcceptancePath}`)
  expect(createHash('sha256').update(acceptanceBytes).digest('hex'), 'I release must pin the exact H acceptance hash')
    .toBe(release?.hybridAcceptanceSha256)
  const acceptance = JSON.parse(acceptanceBytes.toString('utf8')) as Record<string, unknown>
  expect(acceptance.status).toBe('ACCEPTED')
  expect(acceptance.acceptedBy).toBe('g61-sol-med-orchestrator')
  expect(acceptance.sourceCommitBase, 'accepted H must use the current source HEAD').toBe(snapshot.commit)
  expect(acceptance.resultStatus).toBe('PASS')
  const resultPath = typeof acceptance.resultPath === 'string' ? acceptance.resultPath : ''
  expect(resultPath.length > 0 && !resultPath.startsWith('/') && !resultPath.split('/').includes('..'), 'H resultPath must be root-relative and stay within the repository').toBe(true)
  expect(existsSync(`${root}/${resultPath}`), 'accepted H result must exist').toBe(true)
  const resultBytes = readFileSync(`${root}/${resultPath}`)
  expect(createHash('sha256').update(resultBytes).digest('hex')).toBe(acceptance.resultSha256)
  expect(JSON.parse(resultBytes.toString('utf8')).status).toBe('PASS')
  const srcManifest = Object.fromEntries(Object.entries(snapshot.sourceSha256).filter(([file]) => file.startsWith('src/')))
  expect(acceptance.sourceSha256, 'accepted H must pin the complete recursive src/ file map, including untracked files').toEqual(srcManifest)
  expect(snapshot.sourceSha256[hybridAcceptancePath], 'H acceptance must be included in the I source manifest').toBe(acceptance.sha256 ?? createHash('sha256').update(acceptanceBytes).digest('hex'))
  expect(snapshot.sourceSha256[resultPath], 'accepted H result must be included in the I source manifest').toBe(acceptance.resultSha256)
}
function checkSourceGuard(snapshot: ReturnType<typeof sourceSnapshot>) {
  expect(release?.status, 'Phase 5-I requires an explicit Root release file').toBe('released')
  expect(release?.ticket, 'release must pin the Phase 5 ticket').toBe('20261007-v2x-05')
  expect(release?.phase, 'release must identify Phase 5-I').toBe('I')
  expect(release?.acceptedSlices, 'I requires accepted F/G/H').toEqual(expect.arrayContaining(['F', 'G', 'H']))
  expect(release?.sourceCommit, 'release must pin current HEAD').toBe(snapshot.commit)
  expect(release?.sourceFingerprint, 'release must pin current input fingerprint').toBe(snapshot.fingerprint)
  checkHybridAcceptance(snapshot)
  expect(release?.combatSeedCount).toBe(8)
  expect(typeof release?.distributionSeed).toBe('number')
  expect(Number.isSafeInteger(Number(release?.distributionSeed))).toBe(true)
  expect(Array.isArray(release?.combatSeeds)).toBe(true)
  expect(Number.isSafeInteger(requestedSeedCount) && requestedSeedCount === 8).toBe(true)
  expect(seeds).toHaveLength(8)
  expect(new Set(seeds).size).toBe(8)
  expect(seeds.every(seed => Number.isSafeInteger(seed) && seed > 0 && seed <= 0xffffffff)).toBe(true)
  expect(seeds.some(seed => [17, 42, 77, 909, 2026, 2027, 8191, 9981].includes(seed))).toBe(false)
  expect(typeof release?.runId).toBe('string')
  expect(CRAFTING_RECIPES.ironShortSword.masterpieceRules).toEqual({ requiredSmithing: 6, chance: 0.25 })
}
function harnessHash() { return createHash('sha256').update(readFileSync(`${out}/phase05_i_simulation.test.ts`)).digest('hex') }

type RecipeId = keyof typeof CRAFTING_RECIPES
type DistributionProfile = { recipeId: RecipeId; smithingLevel: number; material: keyof typeof MATERIALS | null; samples: number }
type Count = Record<string, number>
type Observation = { rarity: string; affixIds: string[]; affixes: { id: string; tier: number; value: number }[]; special: boolean; masterpiece: boolean; sell: number }
type Online = { n: number; mean: number; m2: number }

function derivedSeed(seed: number, label: string) {
  const digest = createHash('sha256').update(`${seed}|${label}`).digest()
  return digest.readUInt32LE(0) || 1
}
function wilson95(successes: number, n: number) {
  if (!n) return { low: null, high: null }
  const z = 1.959963984540054, p = successes / n, denom = 1 + z * z / n
  const center = (p + z * z / (2 * n)) / denom
  const half = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / denom
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) }
}
function addOnline(value: Online, sample: number) {
  value.n++
  const delta = sample - value.mean
  value.mean += delta / value.n
  value.m2 += delta * (sample - value.mean)
}
function meanInterval(value: Online) {
  const variance = value.n > 1 ? value.m2 / (value.n - 1) : 0
  const half = value.n ? 1.959963984540054 * Math.sqrt(variance / value.n) : 0
  return { n: value.n, mean: value.mean, low95: value.mean - half, high95: value.mean + half }
}
function observe(item: ItemInstance): Observation {
  return { rarity: item.rarity, affixIds: item.affixes.map(affix => affix.id), affixes: item.affixes.map(({ id, tier, value }) => ({ id, tier, value })), special: item.specialTrait !== null,
    masterpiece: item.craftProvenance?.masterpiece === true, sell: itemSellPrice(item) }
}
function emptyProfile(profile: DistributionProfile) {
  return { ...profile, rarity: Object.fromEntries(Object.keys(RARITIES).map(key => [key, 0])) as Count,
    affixCount: {} as Count, affixType: {} as Count, affixTier: {} as Count, special: 0, masterpiece: 0, sells: new Map<number, number>(),
    sellTotal: 0, sellMoments: { n: 0, mean: 0, m2: 0 } as Online, sellMin: Number.POSITIVE_INFINITY, sellMax: 0 }
}
function increment(counts: Count, key: string) { counts[key] = (counts[key] ?? 0) + 1 }
function recordObservation(summary: ReturnType<typeof emptyProfile>, item: ItemInstance, raw: Observation) {
  increment(summary.rarity, raw.rarity)
  increment(summary.affixCount, String(item.affixes.length))
  for (const affix of item.affixes) {
    increment(summary.affixType, affix.id)
    increment(summary.affixTier, `${affix.id}|tier-${affix.tier}`)
  }
  if (raw.special) summary.special++
  if (raw.masterpiece) summary.masterpiece++
  summary.sellTotal += raw.sell
  addOnline(summary.sellMoments, raw.sell)
  summary.sellMin = Math.min(summary.sellMin, raw.sell)
  summary.sellMax = Math.max(summary.sellMax, raw.sell)
  summary.sells.set(raw.sell, (summary.sells.get(raw.sell) ?? 0) + 1)
}
function medianFromHistogram(histogram: Map<number, number>, n: number) {
  const wanted = [Math.floor((n - 1) / 2), Math.floor(n / 2)], values = [...histogram].sort(([a], [b]) => a - b)
  const result: number[] = []
  let position = 0
  for (const [value, count] of values) {
    while (result.length < 2 && wanted[result.length]! < position + count) result.push(value)
    position += count
  }
  return result.length === 2 ? (result[0]! + result[1]!) / 2 : 0
}
function profileSummary(summary: ReturnType<typeof emptyProfile>, expectedWeights: Record<string, number>, cost: ReturnType<typeof marketCostBreakdown>) {
  const n = summary.samples
  const weightTotal = Object.values(expectedWeights).reduce((sum, weight) => sum + weight, 0)
  const recipe = CRAFTING_RECIPES[summary.recipeId]
  const legendaryProbability = weightTotal ? (expectedWeights.legendary ?? 0) / weightTotal : 0
  const expectedSpecial = ITEM_BASES[recipe.outputBase].slot === 'weapon'
    ? legendaryProbability * Math.min(1, ITEM_GENERATION_RULES.legendaryWeaponSpecialChance
      + (summary.material ? MATERIALS[summary.material].specialBonus : 0))
    : 0
  const masterpieceRule = recipe.masterpieceRules
  const expectedMasterpiece = masterpieceRule && summary.smithingLevel >= masterpieceRule.requiredSmithing ? masterpieceRule.chance : 0
  const rarity = Object.fromEntries(Object.entries(summary.rarity).map(([key, value]) => [key,
    { count: value, rate: value / n, interval95: wilson95(value, n), expectedProbability: weightTotal ? (expectedWeights[key] ?? 0) / weightTotal : null }]))
  const affixCount = Object.fromEntries(Object.entries(summary.affixCount).map(([key, value]) => [key,
    { count: value, rate: value / n, interval95: wilson95(value, n) }]))
  const affixType = Object.fromEntries(Object.entries(summary.affixType).map(([key, value]) => [key,
    { count: value, rate: value / n, interval95: wilson95(value, n) }]))
  const affixTier = Object.fromEntries(Object.entries(summary.affixTier).map(([key, value]) => [key,
    { count: value, rate: value / n, interval95: wilson95(value, n) }]))
  return { recipeId: summary.recipeId, smithingLevel: summary.smithingLevel, material: summary.material, samples: n,
    rarity, affixCount, affixType, affixTier,
    special: { count: summary.special, rate: summary.special / n, interval95: wilson95(summary.special, n), expectedProbability: expectedSpecial },
    masterpiece: { count: summary.masterpiece, rate: summary.masterpiece / n, interval95: wilson95(summary.masterpiece, n), expectedProbability: expectedMasterpiece },
    sell: { ...meanInterval(summary.sellMoments), median: medianFromHistogram(summary.sells, n), min: summary.sellMin, max: summary.sellMax,
      plannedFeeGold: cost.plannedFeeGold, plannedSite: cost.plannedSite,
      storeFeeGold: cost.storeFeeGold, storeSite: cost.storeSite,
      purchasedRecipeInputsGold: cost.purchasedRecipeInputsGold,
      influenceMaterialOpportunityCostGold: cost.influenceMaterialOpportunityCostGold,
      homePropertyAcquisitionGoldSeparate: cost.homePropertyAcquisitionGoldSeparate,
      plannedTotalInputCostGold: cost.plannedTotalGold,
      expectedMarginAtPlannedCostGold: summary.sellTotal / n - cost.plannedTotalGold,
      minimumObservedMarginAtPlannedCostGold: summary.sellMin - cost.plannedTotalGold,
      maximumObservedMarginAtPlannedCostGold: summary.sellMax - cost.plannedTotalGold,
      expectedMarginIncludingOneTimeHomePurchaseOnFirstCraftGold:
        summary.sellTotal / n - cost.plannedTotalGold - cost.homePropertyAcquisitionGoldSeparate,
      storeTotalInputCostGold: cost.storeTotalGold,
      expectedMarginAtStoreCostGold: summary.sellTotal / n - cost.storeTotalGold } }
}
function makeDistributionProfiles(): DistributionProfile[] {
  const levels: Record<RecipeId, number[]> = { starterSpear: [1, 3, 6], fieldSpear: [2, 3, 6], fieldArmor: [2, 3, 6], ironShortSword: [5, 6] }
  const profiles = (Object.keys(CRAFTING_RECIPES) as RecipeId[]).flatMap(recipeId => levels[recipeId].flatMap(smithingLevel =>
    [null, ...CRAFTING_RECIPES[recipeId].allowedBiasMaterials].map(material => ({ recipeId, smithingLevel, material, samples: 0 }))))
  const base = Math.floor(distributionBudget / profiles.length), extra = distributionBudget % profiles.length
  return profiles.map((profile, index) => ({ ...profile, samples: base + Number(index < extra) }))
}
function craftPlanAtSite(recipeId: RecipeId, smithingLevel: number, material: DistributionProfile['material'], site: 'home' | 'store' | 'blacksmith') {
  const state = createGame(0x50484135)
  const c = player(state)
  c.skills.smithing.level = smithingLevel
  c.gold = 10_000
  c.stamina = 10_000
  c.inventory.wood = 100
  c.inventory.stone = 100
  c.inventory.iron = 100
  state.reward.materials[c.id] = { wolfFang: 100, wolfHide: 100, moonStone: 100 }
  state.worldTime = 10 * 60
  state.settlement.stage = 'town'
  state.life.director.tradePenalty = 0
  const recipe = CRAFTING_RECIPES[recipeId]
  if (site === 'home') {
    c.position = { ...BUILDINGS.house.position }
    expect(buyProperty(state, 'home'), 'controlled owned-home fixture acquisition should be legal').toBe('')
    c.position = { x: 7, y: 10 }
  } else {
    if (site === 'blacksmith' && !state.settlement.buildings.includes('blacksmith')) state.settlement.buildings.push('blacksmith')
    c.position = { ...BUILDINGS[recipe.station].position }
  }
  const plan = planCraft(state, { recipeId, influenceMaterial: material })
  expect(plan.ok, `${recipeId}/${site} cost fixture must be a legal craft plan: ${plan.reasonCode}`).toBe(true)
  expect(plan.station.site).toBe(site)
  expect(plan.gold.required).toBe(site === 'home' ? Math.max(3, recipe.goldCost - 1) : recipe.goldCost)
  expect(plan.gold.required).not.toBeNull()
  return { site: plan.station.site!, feeGold: plan.gold.required!,
    propertyAcquisitionGold: site === 'home' ? PROPERTY_DEFINITIONS.home.cost.gold : 0 }
}
function marketCostBreakdown(recipeId: RecipeId, smithingLevel: number, material: DistributionProfile['material']) {
  const market = createGame(0x50484135)
  market.settlement.stage = 'town'
  market.life.director.tradePenalty = 0
  const recipe = CRAFTING_RECIPES[recipeId]
  const purchasedRecipeInputsGold = recipe.inputs.reduce((total, input) => total + (input.source === 'inventory'
    ? input.amount * buyPrice(market, input.itemId)
    : input.amount * MATERIALS[input.materialId].sell), 0)
  const influenceMaterialOpportunityCostGold = material ? MATERIALS[material].sell : 0
  const storeSite: 'store' | 'blacksmith' = recipe.station
  const storePlan = craftPlanAtSite(recipeId, smithingLevel, material, storeSite)
  const useHome = recipe.station === 'store'
  const planned = useHome ? craftPlanAtSite(recipeId, smithingLevel, material, 'home') : storePlan
  return { plannedFeeGold: planned.feeGold, plannedSite: planned.site,
    storeFeeGold: storePlan.feeGold, storeSite: storePlan.site,
    purchasedRecipeInputsGold, influenceMaterialOpportunityCostGold,
    homePropertyAcquisitionGoldSeparate: planned.propertyAcquisitionGold,
    plannedTotalGold: planned.feeGold + purchasedRecipeInputsGold + influenceMaterialOpportunityCostGold,
    storeTotalGold: storePlan.feeGold + purchasedRecipeInputsGold + influenceMaterialOpportunityCostGold }
}
function runCraftDistribution() {
  const profiles = makeDistributionProfiles()
  expect(profiles.reduce((sum, profile) => sum + profile.samples, 0)).toBe(distributionBudget)
  expect(profiles).toHaveLength(30)
  const groups = new Map<string, DistributionProfile[]>()
  for (const profile of profiles) {
    const key = `${profile.recipeId}|${profile.smithingLevel}`
    groups.set(key, [...(groups.get(key) ?? []), profile])
  }
  const summaries = new Map<string, ReturnType<typeof emptyProfile>>()
  for (const profile of profiles) summaries.set(`${profile.recipeId}|${profile.smithingLevel}|${profile.material ?? 'neutral'}`, emptyProfile(profile))
  const costs = new Map<string, ReturnType<typeof marketCostBreakdown>>()
  for (const profile of profiles) {
    const key = `${profile.recipeId}|${profile.smithingLevel}|${profile.material ?? 'neutral'}`
    const recipe = CRAFTING_RECIPES[profile.recipeId]
    expect(profile.smithingLevel).toBeGreaterThanOrEqual(recipe.requiredSmithing)
    costs.set(key, marketCostBreakdown(profile.recipeId, profile.smithingLevel, profile.material))
  }
  const generationStates = new Map<string, GameState>()
  for (const profile of profiles) {
    const profileKey = `${profile.recipeId}|${profile.smithingLevel}|${profile.material ?? 'neutral'}`
    const state = createGame(derivedSeed(distributionSeed, `profile-fixture|${profileKey}`))
    player(state).skills.smithing.level = profile.smithingLevel
    generationStates.set(profileKey, state)
  }
  const generateSample = (profile: DistributionProfile, seed: number) => {
    const profileKey = `${profile.recipeId}|${profile.smithingLevel}|${profile.material ?? 'neutral'}`
    const state = generationStates.get(profileKey)!
    const recipe = CRAFTING_RECIPES[profile.recipeId]
    const before = { time: state.worldTime, gold: player(state).gold, stamina: player(state).stamina,
      events: state.events.length, eventSequence: state.eventSequence, instances: state.reward.instances.length }
    state.rngState = seed
    state.reward.nextInstanceId = 1
    const item = generateItem(state, { baseId: recipe.outputBase, level: recipe.outputLevel,
      material: profile.material, context: { kind: 'craft', recipeId: profile.recipeId } })
    expect(state.worldTime).toBe(before.time)
    expect(player(state).gold).toBe(before.gold)
    expect(player(state).stamina).toBe(before.stamina)
    expect(state.events).toHaveLength(before.events)
    expect(state.eventSequence).toBe(before.eventSequence)
    expect(state.reward.instances).toHaveLength(before.instances)
    return item
  }
  type PairStats = { targetAffix: Online; special: Online; masterpiece: Online; saleGold: Online;
    targetBiasedHits: number; targetControlHits: number; specialBiasedHits: number; specialControlHits: number;
    masterpieceBiasedHits: number; masterpieceControlHits: number; rarity: Record<string, { biasedHits: number; controlHits: number; difference: Online }>;
    rarityChanged: number; pairs: number }
  const contrasts: Record<string, Record<string, PairStats>> = {}
  const runDirectory = `${out}/i-runs/${runId}`
  mkdirSync(runDirectory, { recursive: true })
  const rawPath = `${runDirectory}/craft-observations.jsonl`
  const rawFd = openSync(rawPath, 'wx')
  let chunk: string[] = [], generated = 0
  const flush = () => { if (chunk.length) { appendFileSync(rawFd, chunk.join('')); chunk = [] } }
  try {
    for (const [groupKey, group] of groups) {
      const neutralProfile = group.find(profile => profile.material === null)
      expect(neutralProfile, `${groupKey} needs a neutral paired control`).toBeTruthy()
      const n = Math.min(...group.map(profile => profile.samples))
      const paired = Object.fromEntries(group.filter(profile => profile.material !== null).map(profile => {
        const material = profile.material!
        return [material, { targetAffix: { n: 0, mean: 0, m2: 0 }, special: { n: 0, mean: 0, m2: 0 },
          masterpiece: { n: 0, mean: 0, m2: 0 }, saleGold: { n: 0, mean: 0, m2: 0 },
          targetBiasedHits: 0, targetControlHits: 0, specialBiasedHits: 0, specialControlHits: 0,
          masterpieceBiasedHits: 0, masterpieceControlHits: 0,
          rarity: Object.fromEntries(Object.keys(RARITIES).map(rarity => [rarity,
            { biasedHits: 0, controlHits: 0, difference: { n: 0, mean: 0, m2: 0 } }])) as PairStats['rarity'],
          rarityChanged: 0, pairs: 0 } satisfies PairStats]
      }))
      contrasts[groupKey] = paired
      for (let index = 0; index < n; index++) {
        const seed = derivedSeed(distributionSeed, `${groupKey}|${index}`)
        const observations: Record<string, { item: ItemInstance; value: Observation }> = {}
        for (const profile of group) {
          if (index >= profile.samples) continue
          const item = generateSample(profile, seed)
          expect(item.craftProvenance?.recipeId, 'generator must mark this as a craft-context item').toBe(profile.recipeId)
          const value = observe(item)
          observations[profile.material ?? 'neutral'] = { item, value }
          const summary = summaries.get(`${profile.recipeId}|${profile.smithingLevel}|${profile.material ?? 'neutral'}`)!
          recordObservation(summary, item, value)
          chunk.push(`${JSON.stringify({ group: groupKey, material: profile.material, sample: index, seed, ...value })}\n`)
          generated++
          if (chunk.length >= 256) flush()
        }
        const neutral = observations.neutral?.value
        if (!neutral) continue
        for (const [material, current] of Object.entries(observations)) {
          if (material === 'neutral') continue
          const profile = group.find(candidate => candidate.material === material)!
          const biasKeys = Object.keys(MATERIALS[profile.material!].bias).filter(key =>
            ITEM_BASES[CRAFTING_RECIPES[profile.recipeId].outputBase].affixes.includes(key as never))
          const summary = paired[material]!
          const target = current.value.affixIds.some(affix => biasKeys.includes(affix))
          const control = neutral.affixIds.some(affix => biasKeys.includes(affix))
          addOnline(summary.targetAffix, Number(target) - Number(control))
          addOnline(summary.special, Number(current.value.special) - Number(neutral.special))
          addOnline(summary.masterpiece, Number(current.value.masterpiece) - Number(neutral.masterpiece))
          addOnline(summary.saleGold, current.value.sell - neutral.sell)
          summary.targetBiasedHits += Number(target)
          summary.targetControlHits += Number(control)
          summary.specialBiasedHits += Number(current.value.special)
          summary.specialControlHits += Number(neutral.special)
          summary.masterpieceBiasedHits += Number(current.value.masterpiece)
          summary.masterpieceControlHits += Number(neutral.masterpiece)
          for (const rarity of Object.keys(RARITIES)) {
            const biasedHasRarity = current.value.rarity === rarity, controlHasRarity = neutral.rarity === rarity
            summary.rarity[rarity]!.biasedHits += Number(biasedHasRarity)
            summary.rarity[rarity]!.controlHits += Number(controlHasRarity)
            addOnline(summary.rarity[rarity]!.difference, Number(biasedHasRarity) - Number(controlHasRarity))
          }
          summary.rarityChanged += Number(current.value.rarity !== neutral.rarity)
          summary.pairs++
        }
      }
      // Profiles can differ by one sample to hit exactly 100,000; finish the extra draw in larger profiles.
      for (const profile of group) for (let index = n; index < profile.samples; index++) {
        const seed = derivedSeed(distributionSeed, `${groupKey}|${index}`)
        const item = generateSample(profile, seed)
        const value = observe(item)
        recordObservation(summaries.get(`${profile.recipeId}|${profile.smithingLevel}|${profile.material ?? 'neutral'}`)!, item, value)
        chunk.push(`${JSON.stringify({ group: groupKey, material: profile.material, sample: index, seed, ...value })}\n`)
        generated++
        if (chunk.length >= 256) flush()
      }
    }
  } finally {
    flush()
    closeSync(rawFd)
  }
  expect(generated).toBe(distributionBudget)
  const results = profiles.map(profile => {
    const recipe = CRAFTING_RECIPES[profile.recipeId]
    const weights = craftQualityProfile(profile.recipeId, profile.smithingLevel).rarityWeights
    const cost = costs.get(`${profile.recipeId}|${profile.smithingLevel}|${profile.material ?? 'neutral'}`)!
    return profileSummary(summaries.get(`${profile.recipeId}|${profile.smithingLevel}|${profile.material ?? 'neutral'}`)!, weights, cost)
  })
  const pairedResults = Object.fromEntries(Object.entries(contrasts).map(([groupKey, arms]) => [groupKey,
    Object.fromEntries(Object.entries(arms).map(([material, value]) => [material, {
      pairs: value.pairs,
      targetBiasedAffix: { biasedHits: value.targetBiasedHits, controlHits: value.targetControlHits,
        pairedRateDifference95: meanInterval(value.targetAffix) },
      special: { biasedHits: value.specialBiasedHits, controlHits: value.specialControlHits,
        pairedRateDifference95: meanInterval(value.special) },
      masterpiece: { biasedHits: value.masterpieceBiasedHits, controlHits: value.masterpieceControlHits,
        pairedRateDifference95: meanInterval(value.masterpiece) },
      rarity: Object.fromEntries(Object.entries(value.rarity).map(([rarity, counts]) => [rarity, {
        biasedHits: counts.biasedHits, controlHits: counts.controlHits, pairedRateDifference95: meanInterval(counts.difference),
      }])),
      saleGoldDifference95: meanInterval(value.saleGold), rarityChangedPairs: value.rarityChanged,
    }]))]))
  return { budget: distributionBudget, outputsGenerated: generated, transactionCount: 0,
    transactionOmittedReason: 'This runner calls real generateItem in a craft context; it does not execute legal craft transactions that deduct inventory/gold/stamina, advance time, or append events/history.',
    rawPath: relative(root, rawPath).split(sep).join('/'), rawSha256: createHash('sha256').update(readFileSync(rawPath)).digest('hex'),
    masterSeed: distributionSeed, profiles: results, matchedMaterialContrasts: pairedResults }
}

type Result = {
  seed: number; powerband: Powerband; build: Build; policy: string; target: string; targetFixture: string
  variant: string | null; traits: MonsterTraitId[]; heroLevel: number; combatLevel: number
  startingRngState: number; initialHp: number
  enemyMaxHp: number; finalEnemyHp: number; won: boolean; died: boolean; turns: number
  damageDealt: number; enemyHpNetRemoval: number; damageTakenGross: number; enemyHealing: number
  potionsUsed: number; potionHealing: number; potionCost: number; goldEarned: number
  armorContextChecks: number; reloads: number; commands: string[]; gearFixture: unknown; outcomeVsLegacy?: string
}

function applyProgression(state: GameState, band: Powerband) {
  const c = player(state)
  if (band === 'edge') gainExp(state, c, 180, 'combat')
  if (band === 'ready') gainExp(state, c, 300, 'combat')
}
function fixture(seed: number, powerband: Powerband) {
  const state = createGame(seed), c = player(state)
  c.currentRegion = 'forest'; c.position = { x: 7, y: 6 }
  applyProgression(state, powerband)
  state.reward.collection.defeated = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader']
  state.threat.monsterPopulation = 75; state.settlement.safety = 55
  return state
}
function setRankContexts(seed: number, band: Powerband, id: MonsterDefinitionId, ownerId: string) {
  // This detached fixture shares the paired hero progression and world context, with its own RNG stream.
  const observed = fixture(seed, band)
  const result = awardWolfLoot(observed, { definitionId: id })
  expect(result.instance, `${id} actual rank award must contain gear`).toBeTruthy()
  return { ...result.instance!, ownerId }
}
const craftedFixtureCache = new Map<string, ItemInstance>()
function generatedCraftFixture(seed: number, recipeId: RecipeId, smithingLevel: number,
  material: keyof typeof MATERIALS | null, requireMasterpiece = false): ItemInstance {
  const key = `${seed}|${recipeId}|${smithingLevel}|${material ?? 'neutral'}|${requireMasterpiece}`
  const cached = craftedFixtureCache.get(key)
  if (cached) return structuredClone(cached)
  const recipe = CRAFTING_RECIPES[recipeId]
  for (let attempt = 0; attempt < (requireMasterpiece ? 128 : 1); attempt++) {
    // Material arms share the same detached RNG seed; only the generator's bias differs.
    const state = createGame(derivedSeed(seed, `combat-gear|${recipeId}|${smithingLevel}|${attempt}`))
    player(state).skills.smithing.level = smithingLevel
    const item = generateItem(state, { baseId: recipe.outputBase, level: recipe.outputLevel, material,
      context: { kind: 'craft', recipeId } })
    if (requireMasterpiece && item.craftProvenance?.masterpiece !== true) continue
    expect(item.craftProvenance?.recipeId).toBe(recipeId)
    craftedFixtureCache.set(key, item)
    return structuredClone(item)
  }
  throw new Error(`No genuine generated Masterpiece found for ${recipeId} seed ${seed} in 128 deterministic attempts`)
}
function generatedPair(seed: number, powerband: Powerband, build: Build, ownerId: string, itemLevel: number): ItemInstance[] {
  const sourceBuild: Build = build === 'affixControl' ? 'penetration' : build
  const gearState = createGame((seed ^ (powerband === 'early' ? 0x101 : powerband === 'edge' ? 0x202 : 0x303)) >>> 0)
  const wantedRarity = rarityFor[sourceBuild], items: ItemInstance[] = []
  for (const [slot, baseId] of [['weapon', sourceBuild === 'raw' ? 'axe' : 'shortSword'], ['armor', sourceBuild === 'earlygear' ? 'hideArmor' : 'chainArmor']] as const) {
    const wantedAffix = (slot === 'weapon' && ['crit', 'bleed', 'penetration'].includes(sourceBuild))
      || (slot === 'armor' && sourceBuild === 'defense') ? focus[sourceBuild] : undefined
    let selected: ItemInstance | undefined
    for (let attempt = 0; attempt < 1000 && !selected; attempt++) {
      const item = generateItem(gearState, { baseId: baseId as ItemBaseId, level: itemLevel,
        material: sourceBuild === 'crit' ? 'moonStone' : sourceBuild === 'bleed' || sourceBuild === 'penetration' ? 'wolfFang' : sourceBuild === 'defense' ? 'wolfHide' : undefined })
      if (wantedRarity && item.rarity !== wantedRarity) continue
      if (wantedAffix && !item.affixes.some(affix => affix.id === wantedAffix)) continue
      if (sourceBuild === 'penetration' && item.affixes.some(affix => affix.id === 'bleeding')) continue
      selected = { ...item, ownerId }
    }
    expect(selected, `${sourceBuild} ${slot} legal fixture must be obtainable`).toBeDefined()
    items.push(selected!)
  }
  if (build === 'affixControl') {
    const [weapon] = items
    const piercing = weapon.affixes.find(affix => affix.id === 'piercing')
    expect(piercing, 'matched control requires a piercing affix to replace').toBeDefined()
    piercing!.id = 'bleeding'
    piercing!.value = AFFIXES.bleeding.tiers[piercing!.tier - 1]!
    weapon.rolledStats = rolledItemStats(weapon.baseId, weapon.level, weapon.affixes)
  }
  return items
}
function gearFor(seed: number, powerband: Powerband, build: Build, ownerId: string, itemLevel: number): ItemInstance[] {
  if (build === 'legacy') return []
  if (build === 'craftSpearNeutral' || build === 'craftSpearFang' || build === 'craftSpearMoon') {
    const material = build === 'craftSpearFang' ? 'wolfFang' : build === 'craftSpearMoon' ? 'moonStone' : null
    return [{ ...generatedCraftFixture(seed ^ 0x91a, 'starterSpear', 3, material), ownerId }]
  }
  if (build === 'craftFieldArmorNeutral' || build === 'craftFieldArmorHide') {
    const material = build === 'craftFieldArmorHide' ? 'wolfHide' : null
    return [{ ...generatedCraftFixture(seed ^ 0x91b, 'fieldArmor', 3, material), ownerId }]
  }
  if (build === 'craftHighSword' || build === 'craftHighSwordMP' || build === 'craftHighSwordMPControl') {
    const item = generatedCraftFixture(seed ^ 0x91c, 'ironShortSword', 6, null, build !== 'craftHighSword')
    const selected = structuredClone(item)
    if (build === 'craftHighSwordMPControl') {
      expect(selected.craftProvenance?.masterpiece).toBe(true)
      selected.craftProvenance!.masterpiece = false
    }
    return [{ ...selected, ownerId }]
  }
  if (build === 'eliteDrop') return [setRankContexts(seed ^ 0x451, powerband, 'alphaWolf', ownerId)]
  if (build === 'miniBossDrop') return [setRankContexts(seed ^ 0x551, powerband, 'packLeader', ownerId)]
  if (build === 'boss' || build === 'bossStandardBody') {
    const actual = setRankContexts(seed ^ 0x751, powerband, 'wolfKing', ownerId)
    expect(actual.baseId).toBe(WOLF_LOOT_RULES.bossExclusiveBase)
    expect(actual.level).toBe(WOLF_MONSTERS.wolfKing.level)
    if (build === 'boss') return [actual]
    const standardBody = structuredClone(actual)
    standardBody.baseId = 'spear'
    standardBody.rolledStats = rolledItemStats('spear', standardBody.level, standardBody.affixes)
    return [standardBody]
  }
  return generatedPair(seed, powerband, build, ownerId, build === 'earlygear' ? 1 : itemLevel)
}
function equipBuild(state: GameState, seed: number, powerband: Powerband, build: Build) {
  const c = player(state)
  if (build === 'legacy') {
    c.equipment.weapon = 'sword'; c.equipment.armor = 'armor'
    return { items: [], description: 'fixed legacy sword/armor' }
  }
  const items = gearFor(seed, powerband, build, c.id, c.level)
  state.reward.instances.push(...items)
  state.reward.nextInstanceId = Math.max(state.reward.nextInstanceId, ...items.map(item => Number(item.instanceId.slice('item-'.length)) + 1))
  for (const item of items) {
    if (!state.reward.collection.bases.includes(item.baseId)) state.reward.collection.bases.push(item.baseId)
    if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary') {
      if (!state.reward.collection.rareBases.includes(item.baseId)) state.reward.collection.rareBases.push(item.baseId)
    }
    expect(equipInstance(state, item.instanceId)).toBe('')
  }
  return { items, description: build === 'bossStandardBody' ? 'controlled matched-body clone of actual level-7 boss award; base changed to spear, other rolled data retained/recomputed' : build }
}
function setup(seed: number, powerband: Powerband, build: Build, target: Target): GameState {
  const state = fixture(seed, powerband), c = player(state)
  if (powerband === 'ready') {
    expect(c.level).toBe(5)
    expect(c.skills.combat.level).toBe(6)
  }
  equipBuild(state, seed, powerband, build)
  expect(encounterWolf(state, target.id)).toBe('')
  const family = state.combat!.familyEncounter!
  if (target.variant) family.variant = target.variant
  if (target.traits) family.traits = [...target.traits]
  if (target.variant || target.traits) {
    if (state.reward.wolfBossForm) Object.assign(state.reward.wolfBossForm, family)
    const stats = resolveWolfCombatStats(family)
    Object.assign(state.combat!, stats, { hp: stats.maxHp })
  }
  expect(player(state).hp).toBe(c.hp)
  return state
}
function gearSummary(state: GameState) {
  const character = player(state)
  return ['weapon', 'armor'].map(slot => {
    const item = equippedInstance(state, slot as 'weapon' | 'armor')
    return item ? { slot, baseId: item.baseId, level: item.level, rarity: item.rarity, affixes: item.affixes,
      rolledStats: item.rolledStats, material: item.material, provenance: item.provenance, craftProvenance: item.craftProvenance,
      specialTrait: item.specialTrait }
      : { slot, baseId: character.equipment[slot as 'weapon' | 'armor'] }
  })
}
function scenarioKey(row: Pick<Result, 'seed' | 'powerband' | 'policy' | 'target' | 'targetFixture' | 'variant'>) {
  return [row.seed, row.powerband, row.policy, row.target, row.targetFixture, row.variant ?? 'none'].join('|')
}
function run(seed: number, powerband: Powerband, build: Build, policy: typeof policies[number], target: Target, reload: boolean) {
  let state = setup(seed, powerband, build, target)
  const heroLevel = player(state).level, combatLevel = player(state).skills.combat.level
  const initialHp = player(state).hp, enemyMaxHp = state.combat!.maxHp, startingRngState = state.rngState
  const family = state.combat!.familyEncounter!, formation = structuredClone(family), gear = gearSummary(state), commands: string[] = []
  const initialPotions = player(state).inventory.potion, initialGold = player(state).gold
  let damageDealt = 0, enemyHpNetRemoval = 0, damageTakenGross = 0, enemyHealing = 0, potionHealing = 0, reloads = 0, armorContextChecks = 0
  let finalEnemyHp = state.combat!.hp
  for (let turn = 0; turn < 100 && state.combat && player(state).isAlive; turn++) {
    const c = player(state), cue = wolfCombatPresentation(state)?.cue ?? '', monster = state.combat!
    const command = c.hp <= c.maxHp * .45 && c.inventory.potion ? 'potion'
      : policy === 'cue' && /急襲|月襲|重擊/.test(cue) ? 'defend' : 'attack'
    const heroHpBefore = c.hp, potionHeal = command === 'potion' ? Math.min(45, c.maxHp - c.hp) : 0
    const enemyHpBefore = monster.hp, phase = wolfCombatPhase(monster.familyEncounter!, monster.hp, monster.maxHp)
    const effectiveDefense = wolfDefenseForTurn(monster.defense, phase)
    const armorContext = { wolfArmoredPhase: phase?.armored === true }
    if (armorContext.wolfArmoredPhase) armorContextChecks++
    const liveRngBeforeDiagnostic = state.rngState, diagnosticState = structuredClone(state)
    const formulaDamage = command === 'attack'
      ? Math.min(enemyHpBefore, playerAttackDamage(diagnosticState, effectiveDefense, true, armorContext)) : 0
    const enemyHpAfterHit = Math.max(0, enemyHpBefore - formulaDamage)
    const expectedEnemyHeal = enemyHpAfterHit > 0 ? wolfChargeHealing(monster.familyEncounter!, enemyHpAfterHit, monster.maxHp, phase) : 0
    expect(state.rngState).toBe(liveRngBeforeDiagnostic)
    commands.push(command)
    expect(combatTurn(state, command)).toBe('')
    const wonOnTurn = state.events.some(event => event.type === 'combat.won')
    damageDealt += formulaDamage
    if (!wonOnTurn) enemyHealing += expectedEnemyHeal
    enemyHpNetRemoval += enemyHpBefore - monster.hp
    finalEnemyHp = monster.hp
    expect(enemyHpBefore - monster.hp).toBe(formulaDamage - (wonOnTurn ? 0 : expectedEnemyHeal))
    potionHealing += potionHeal
    if (state.combat || !wonOnTurn) damageTakenGross += Math.max(0, heroHpBefore + potionHeal - player(state).hp)
    if (reload && state.combat && turn % 3 === 2) {
      try { state = deserialize(serialize(state, 777)).state }
      catch (error) { throw new Error(`reload failed seed=${seed} band=${powerband} build=${build} target=${target.id}/${target.fixture ?? target.variant ?? 'natural'} turn=${turn}: ${String(error)}`) }
      reloads++
    }
  }
  const c = player(state), won = state.events.some(event => event.type === 'combat.won')
  return { state, result: {
    seed, powerband, build, policy, target: target.id, targetFixture: target.fixture ?? 'public-natural',
    variant: target.variant ?? null, traits: formation.traits, heroLevel, combatLevel, startingRngState, initialHp, enemyMaxHp, finalEnemyHp,
    won, died: !c.isAlive, turns: commands.length, damageDealt, enemyHpNetRemoval, damageTakenGross, enemyHealing,
    potionsUsed: initialPotions - c.inventory.potion, potionHealing, potionCost: (initialPotions - c.inventory.potion) * 20,
    goldEarned: c.gold - initialGold, armorContextChecks, reloads, commands, gearFixture: gear,
  } as Result }
}

const quantile = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((xs.length - 1) * q))] ?? 0
const dominates = (a: Result, b: Result) => Number(a.won) >= Number(b.won) && Number(a.died) <= Number(b.died)
  && a.turns <= b.turns && a.damageTakenGross <= b.damageTakenGross && a.potionsUsed <= b.potionsUsed
function pairedClassification(row: Result, legacy: Result) {
  const equal = row.won === legacy.won && row.died === legacy.died && row.turns === legacy.turns
    && row.damageTakenGross === legacy.damageTakenGross && row.potionsUsed === legacy.potionsUsed
  if (equal) return 'equivalent-to-legacy'
  if (dominates(row, legacy)) return 'outcome-upgrade'
  if (dominates(legacy, row)) return 'low-value-vs-legacy'
  return 'sidegrade-tradeoff'
}

releasedIt('runs deterministic craft distribution, economy, and extended combat matrix after explicit release', () => {
  expect(Number.isSafeInteger(requestedSeedCount) && requestedSeedCount === 8).toBe(true)
  expect(targets).toHaveLength(6)
  expect(builds).toHaveLength(23)
  const startSource = sourceSnapshot(), startHarness = harnessHash(), startStatus = gitStatus()
  checkSourceGuard(startSource)
  expect(/^[A-Za-z0-9._-]{1,80}$/.test(runId)).toBe(true)
  const releaseSha256 = createHash('sha256').update(readFileSync(releasePath)).digest('hex')
  const started = performance.now(), distribution = runCraftDistribution(), rows: Result[] = []
  for (const seed of seeds) for (const powerband of powerbands) for (const target of targets) for (const policy of policies) for (const build of builds) {
    const first = run(seed, powerband, build, policy, target, false), replay = run(seed, powerband, build, policy, target, true)
    expect(replay.state).toEqual(first.state)
    expect(replay.result.commands).toEqual(first.result.commands)
    expect(replay.result.startingRngState).toBe(first.result.startingRngState)
    rows.push(first.result)
  }
  const legacy = new Map(rows.filter(row => row.build === 'legacy').map(row => [scenarioKey(row), row]))
  for (const row of rows) if (row.build !== 'legacy') {
    const paired = legacy.get(scenarioKey(row))
    expect(paired).toBeDefined()
    expect(row.startingRngState).toBe(paired!.startingRngState)
    expect(row.initialHp).toBe(paired!.initialHp)
    expect(row.enemyMaxHp).toBe(paired!.enemyMaxHp)
    expect(row.traits).toEqual(paired!.traits)
    row.outcomeVsLegacy = pairedClassification(row, paired!)
  }
  const masterpiece = new Map(rows.filter(row => row.build === 'craftHighSwordMP').map(row => [scenarioKey(row), row]))
  const masterpieceControl = new Map(rows.filter(row => row.build === 'craftHighSwordMPControl').map(row => [scenarioKey(row), row]))
  expect(masterpiece.size).toBe(seeds.length * powerbands.length * targets.length * policies.length)
  expect(masterpieceControl.size).toBe(masterpiece.size)
  for (const [key, row] of masterpiece) {
    const control = masterpieceControl.get(key)
    expect(control, `marker-only Masterpiece control missing for ${key}`).toBeDefined()
    expect(row.startingRngState).toBe(control!.startingRngState)
    expect(row.initialHp).toBe(control!.initialHp)
    expect(row.enemyMaxHp).toBe(control!.enemyMaxHp)
    expect(row.won).toBe(control!.won)
    expect(row.died).toBe(control!.died)
    expect(row.turns).toBe(control!.turns)
    expect(row.damageDealt).toBe(control!.damageDealt)
    expect(row.damageTakenGross).toBe(control!.damageTakenGross)
    expect(row.potionsUsed).toBe(control!.potionsUsed)
  }
  const groups: Record<string, object> = {}
  for (const powerband of powerbands) for (const build of builds) for (const policy of policies) for (const target of targets) {
    const subset = rows.filter(row => row.powerband === powerband && row.build === build && row.policy === policy
      && row.target === target.id && row.targetFixture === (target.fixture ?? 'public-natural') && row.variant === (target.variant ?? null))
    const gold = subset.reduce((n, row) => n + row.goldEarned, 0), potionCost = subset.reduce((n, row) => n + row.potionCost, 0)
    const key = `${powerband}|${build}|${policy}|${target.fixture ?? target.id}|${target.variant ?? 'none'}`
    groups[key] = {
      fights: subset.length, wins: subset.filter(row => row.won).length, deaths: subset.filter(row => row.died).length,
      winRate: subset.filter(row => row.won).length / subset.length,
      winRateInterval95: wilson95(subset.filter(row => row.won).length, subset.length),
      turnsP10: quantile(subset.map(row => row.turns), .1), turnsP50: quantile(subset.map(row => row.turns), .5), turnsP90: quantile(subset.map(row => row.turns), .9),
      damageDealtMedian: quantile(subset.map(row => row.damageDealt), .5), enemyHpNetRemovalMedian: quantile(subset.map(row => row.enemyHpNetRemoval), .5),
      grossDamageTakenMedian: quantile(subset.map(row => row.damageTakenGross), .5), enemyHealingMedian: quantile(subset.map(row => row.enemyHealing), .5),
      potionsMedian: quantile(subset.map(row => row.potionsUsed), .5), potionHealingMedian: quantile(subset.map(row => row.potionHealing), .5),
      potionCostPerGold: gold > 0 ? potionCost / gold : null, potionCostGold: potionCost, goldEarned: gold,
      fightsWithGold: subset.filter(row => row.goldEarned > 0).length,
      outcomeVsLegacy: Object.fromEntries(['outcome-upgrade', 'equivalent-to-legacy', 'low-value-vs-legacy', 'sidegrade-tradeoff']
        .map(label => [label, subset.filter(row => row.outcomeVsLegacy === label).length])),
    }
    expect(subset.length).toBe(seeds.length)
  }
  const finalSource = sourceSnapshot(), finalHarness = harnessHash(), finalStatus = gitStatus()
  expect(finalSource).toEqual(startSource)
  expect(finalHarness).toBe(startHarness)
  expect(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()).toBe(startSource.commit)
  const report = {
    schemaVersion: 1, phase: 'Phase5-I', ticket: '20261007-v2x-05', releaseStatus: 'released', releaseSha256,
    runId, sourceCommit: startSource.commit, sourceSha256: startSource.sourceSha256, sourceFingerprint: startSource.fingerprint,
    harnessSha256: startHarness,
    sourceManifestAlgorithm: 'Sorted relative POSIX path→SHA256 manifest of every file recursively under src, without Git-ignore filtering (including untracked files), plus explicit runner/Phase4 evidence/Phase5 spec and decisions/package locks/config/build inputs/recorded-report helper. Release file and unique run output tree are excluded from the input fingerprint and are recorded separately. Fingerprint is SHA256(JSON.stringify(path-to-file-SHA256 map)).',
    workingTreeStatusBefore: startStatus, workingTreeStatusAfter: finalStatus,
    seeds, powerbands: {
      early: 'fresh engine character (Lv1/100 HP); controlled initial forest position',
      edge: 'engine gainExp(180) progression (Lv4 / combat Lv4); no injected gold/world resources',
      ready: 'actual engine gainExp(300) progression; assertions require hero Lv5 and combat Lv6; every row records both levels',
    },
    builds, policies, targets, readyFixtureMetadata: { heroLevel: 5, combatLevel: 6, assertedInRunner: true },
    matrixSizing: { originalPhase4Rows: 4320, originalPhase4Fights: 8640,
      addedCraftBuilds: builds.length - 15, totalRows: rows.length, uninterruptedAndReplayFightRuns: rows.length * 2 },
    repeatedFightPairs: rows.length, actualFightRuns: rows.length * 2, metricRows: rows.length,
    distribution, groups, rows, economy: { potionShopPriceGold: 20,
      potionCostPerGold: 'null when group earns zero gold; otherwise sum potion cost / sum combat gold; raw gold is recorded only on wins.' },
    pairedOutcomeClassification: 'Same seed, powerband, target snapshot, and action policy versus legacy. Upgrade means no worse win, survival, turns, gross damage taken, or potion count and strict improvement on one or more; low-value is reverse dominance; exact equality is equivalent; other outcomes are tradeoffs.',
    harnessPreflight: [
      'Public playerAttackDamage diagnostic passes explicit { wolfArmoredPhase } exactly as combatTurn does; cloned state must preserve live RNG.',
      'Public combatTurn attack HP changes are asserted against cloned-formula damage minus separately expected boss healing, including death/state-clear cases.',
      'Gross incoming damage uses turn HP delta adjusted by actual potion healing; winning turn receives no incoming attack.',
      'Rank-profile and canonical boss equipment are awarded through awardWolfLoot on detached, same-powerband hero-equivalent state before encounter; fight RNG remains untouched.',
      'Boss standard-body comparison is an explicitly controlled clone of the actual level-7 moonFangSpear award, with only base changed to spear and rolled stats recomputed.',
      'Craft builds call the actual craft-context generateItem API with detached deterministic states and approved recipe/material/Smithing fixtures; they do not deduct transaction resources or advance time.',
      'The high-skill Masterpiece arm is a genuine generated eligible item found by deterministic retries; its paired QA control clones that same output and clears only the Masterpiece marker.',
      'The three starter spear craft builds and field-armor builds compare neutral material to legal Fang/Moonstone/Wolf Hide modes; exact item generation is isolated from combat RNG.',
      'Each case has exact uninterrupted versus save/reload-every-three-turn state and command equality; source manifest and runner hash are checked before/after.',
    ],
    fixtureNotes: [
      'Target matrix: natural gray wolf, natural alpha elite, controlled armored-only alpha, and three wolfKing variants set before turn one.',
      'Rank builds eliteDrop/miniBossDrop/boss use actual detached awardWolfLoot profiles; boss uses fixed Wolf King dropLevel 7 and exclusive moonFangSpear.',
      'bossStandardBody is a labeled counterfactual matched standard spear body; it is not another actual Wolf King drop.',
      'affixControl reuses the exact penetration gear fixture and replaces only piercing with same-tier bleeding; legal matched affix counterfactual.',
      'Phase 5 adds craftSpearNeutral/Fang/Moon, craftFieldArmorNeutral/Hide, craftHighSword, craftHighSwordMP, and craftHighSwordMPControl to the unchanged 15-build Phase 4 matrix.',
      'The marker-only Masterpiece control must match its genuine generated counterpart on all measured combat outcomes; it is a QA counterfactual, not a legal gameplay output.',
      'Ready is engine progression gainExp(300): hero Lv5/combat Lv6, asserted and recorded in every row.',
      'No party healer or companion fixture; no manual changes during a fight. All item setup occurs before encounter creation.',
    ],
    armorContext: { API: 'playerAttackDamage(state, effectiveDefense, true, { wolfArmoredPhase })',
      note: 'The boolean is computed from the same public wolfCombatPhase snapshot used by combatTurn; armor context is not inferred from target ID.' },
    elapsedMs: performance.now() - started,
    harnessGuard: { sourceStable: true, runnerStable: true, headStable: true, inputManifestStable: true,
      releaseSha256, sourceCommit: startSource.commit, sourceFingerprint: startSource.fingerprint,
      outputDirectoryExcludedFromInputs: `reports/v2/20261007-life-craftsmanship/phase-05/i-runs/${runId}`,
      releaseFileExcludedFromInputs: 'reports/v2/20261007-life-craftsmanship/phase-05/i-release.json' },
    limitations: 'Headless craft-context generation omits resource/gold/stamina/time transaction costs; those costs are represented analytically from the live recipe and buy/sell helpers. Headless combat and controlled marker/material fixtures are not browser or human evidence. Boss award profile is sampled once per seed/powerband, and observed fight outcomes must be interpreted with paired metadata. Human validation remains deferred.',
  }
  execFileSync('python3', ['scripts/recorded_reports.py', 'publish', `${out}/${runLabel}-results.json`, '--producer', 'g6-luna-med-phase5-simulation-engineer'],
    { cwd: root, input: `${JSON.stringify(report, null, 2)}\n`, stdio: ['pipe', 'inherit', 'inherit'] })
}, 3_600_000)
