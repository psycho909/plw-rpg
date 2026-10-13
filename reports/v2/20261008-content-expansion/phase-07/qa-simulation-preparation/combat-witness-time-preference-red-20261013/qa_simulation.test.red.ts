import { createHash } from 'node:crypto'
import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative, sep } from 'node:path'
import { expect, it } from 'vitest'
import { BUILDINGS, CONFIG, ITEMS } from '../../../../src/data/config'
import {
  CONTENT_AFFIXES, CONTENT_CROPS, CONTENT_CROP_GOODS, CONTENT_EQUIPMENT, CONTENT_FAMILIES,
  CONTENT_MATERIALS, CONTENT_MONSTERS, CONTENT_RECIPES,
} from '../../../../src/data/contentRegistry'
import { CRAFTING_RECIPES } from '../../../../src/data/crafting'
import { combatTurn } from '../../../../src/engine/actions'
import { craft, planCraft } from '../../../../src/engine/crafting'
import { awardContentLoot, generateItem } from '../../../../src/engine/itemGeneration'
import { equipInstance } from '../../../../src/engine/rewardActions'
import { contentEncounterOptions, encounterContentMonster } from '../../../../src/engine/contentFamilies'
import type { ContentSeason, ContentSpawnPredicate } from '../../../../src/domain/content'
import { calendar } from '../../../../src/engine/calendar'
import { createGame, player, simulate } from '../../../../src/engine/simulation'
import { deserialize, serialize } from '../../../../src/services/saveService'

const ROOT = process.cwd()
const PHASE = 'reports/v2/20261008-content-expansion/phase-07'
const OUT = join(ROOT, process.env.PHASE7_QA_OUT ?? `${PHASE}/qa-simulation-preparation/active-run`)
const LANE = process.env.PHASE7_QA_LANE ?? 'inventory'
const SEEDS = (process.env.PHASE7_QA_SEEDS ?? '40131,40132,40133').split(',').map(Number)
const LOOT_AWARDS = Number(process.env.PHASE7_QA_LOOT_AWARDS ?? 100_000)
const COMBAT_PER_CELL = Number(process.env.PHASE7_QA_COMBAT_PER_CELL ?? 100)
const CHECKPOINT_YEARS = [10, 50, 100] as const
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

function sourceFiles(directory = join(ROOT, 'src')): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (entry.isFile() || (entry.isSymbolicLink() && statSync(path).isFile())) return [relative(ROOT, path).split(sep).join('/')]
    return []
  }).sort()
}
function snapshot() {
  const files = Object.fromEntries(sourceFiles().map(path => [path, hash(readFileSync(join(ROOT, path)))]))
  return { commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), files,
    fingerprint: hash(JSON.stringify(files)) }
}
function runnerSnapshot() {
  const files = [`${PHASE}/qa_simulation.test.ts`, `${PHASE}/qa_simulation.config.ts`, `${PHASE}/qa_simulation.json`,
    `${PHASE}/qa_simulation.tsconfig.json`, `${PHASE}/qa-simulation-preparation/node-shims.d.ts`]
  return Object.fromEntries(files.map(path => [path, hash(readFileSync(join(ROOT, path)))]))
}
function guardSource(before: ReturnType<typeof snapshot>) {
  const expectedCommit = process.env.PHASE7_QA_EXPECT_COMMIT
  const expectedFingerprint = process.env.PHASE7_QA_EXPECT_FINGERPRINT
  if (LANE !== 'inventory') {
    expect(expectedCommit, '正式 QA lane 需提供凍結的 PHASE7_QA_EXPECT_COMMIT').toBeTruthy()
    expect(expectedFingerprint, '正式 QA lane 需提供凍結的 PHASE7_QA_EXPECT_FINGERPRINT').toBeTruthy()
  }
  if (expectedCommit) expect(before.commit).toBe(expectedCommit)
  if (expectedFingerprint) expect(before.fingerprint).toBe(expectedFingerprint)
}
function capture(kind: string, row: unknown) {
  appendFileSync(join(OUT, `${kind}.jsonl`), `${JSON.stringify(row)}\n`, { encoding: 'utf8', flag: 'a' })
}
function initRun() {
  mkdirSync(OUT, { recursive: true })
  const before = snapshot()
  guardSource(before)
  const runnerBefore = runnerSnapshot()
  const manifest = { schema: 1, lane: LANE, seeds: SEEDS, startedAt: new Date().toISOString(), source: before, runner: runnerBefore,
    catalogCounts: { families: Object.keys(CONTENT_FAMILIES).length, monsters: Object.keys(CONTENT_MONSTERS).length,
      equipment: Object.keys(CONTENT_EQUIPMENT).length, materials: Object.keys(CONTENT_MATERIALS).length,
      recipes: Object.keys(CONTENT_RECIPES).length, crops: Object.keys(CONTENT_CROPS).length,
      cropGoods: Object.keys(CONTENT_CROP_GOODS).length, affixes: Object.keys(CONTENT_AFFIXES).length },
    workload: { lootAwards: LOOT_AWARDS, combatPerCell: COMBAT_PER_CELL,
      longYears: 100, checkpoints: CHECKPOINT_YEARS },
    limits: ['controlled fixtures are diagnostic and do not estimate natural encounters',
      'catalog definitions and controlled reachability are separate from content actually encountered in long worlds'] }
  writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  return { source: before, runner: runnerBefore }
}
function finishRun(before: ReturnType<typeof snapshot>, runnerBefore: ReturnType<typeof runnerSnapshot>, successful: boolean) {
  const after = snapshot()
  const runnerAfter = runnerSnapshot()
  const stable = JSON.stringify(before) === JSON.stringify(after), runnerStable = JSON.stringify(runnerBefore) === JSON.stringify(runnerAfter)
  writeFileSync(join(OUT, 'completion.json'), `${JSON.stringify({ completedAt: new Date().toISOString(), laneSucceeded: successful, sourceStable: stable, runnerStable,
    sourceAfter: after, runnerAfter }, null, 2)}\n`, { flag: 'wx' })
  expect(after).toEqual(before)
  expect(runnerAfter).toEqual(runnerBefore)
}
function countBy<T extends string>(key: T, source: Record<string, number>) { source[key] = (source[key] ?? 0) + 1 }
function assertPositiveSafeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${label} must be a positive safe integer`)
}
function assertDistinctSeeds(seeds: readonly number[]) {
  if (seeds.length !== 3 || seeds.some(seed => !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff)
    || new Set(seeds).size !== seeds.length) {
    throw new RangeError('formal lanes require exactly three distinct unsigned 32-bit seeds')
  }
}
function validateLaneSettings(lane: string, lootAwards: number, combatPerCell: number, seeds: readonly number[]) {
  if (!['inventory', 'loot', 'combat', 'combat-preflight', 'economy', 'long'].includes(lane)) throw new RangeError(`unknown lane: ${lane}`)
  if (lane !== 'inventory') assertDistinctSeeds(seeds)
  if (lane === 'combat') assertPositiveSafeInteger(combatPerCell, 'combat samples per cell')
  if (lane === 'loot') assertPositiveSafeInteger(lootAwards, 'loot award count')
}
function groupedLootCohorts() {
  const groups = new Map<string, string[]>()
  for (const monster of Object.values(CONTENT_MONSTERS)) {
    const key = `${monster.familyId}/${monster.rank}`
    groups.set(key, [...(groups.get(key) ?? []), monster.id])
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([key, ids]) => ({ key, ids: ids.sort() }))
}

it('runner configuration guards reject empty combat samples and invalid seed cycles', () => {
  expect(() => assertPositiveSafeInteger(0, 'combat samples per cell')).toThrow(/positive safe integer/)
  expect(() => assertPositiveSafeInteger(Number.NaN, 'combat samples per cell')).toThrow(/positive safe integer/)
  expect(() => assertDistinctSeeds([40131, 40131, 40133])).toThrow(/three distinct/)
  expect(() => assertDistinctSeeds([40131, 40132])).toThrow(/three distinct/)
  expect(() => assertDistinctSeeds([40131, 40132, Number.NaN])).toThrow(/three distinct/)
  expect(assertPositiveSafeInteger(100, 'combat samples per cell')).toBeUndefined()
  expect(assertDistinctSeeds([40131, 40132, 40133])).toBeUndefined()
  expect(() => validateLaneSettings('combat', LOOT_AWARDS, 0, [40131, 40132, 40133])).toThrow(/combat samples/)
  expect(() => validateLaneSettings('long', LOOT_AWARDS, COMBAT_PER_CELL, [40131, 40131, 40133])).toThrow(/three distinct/)
})

it(`Phase 7 simulation lane: ${LANE}`, () => {
  const before = initRun()
  let successful = false
  try {
    validateLaneSettings(LANE, LOOT_AWARDS, COMBAT_PER_CELL, SEEDS)
    if (LANE === 'inventory') {
      expect(Object.keys(CONTENT_FAMILIES).length).toBeGreaterThan(0)
      expect(Object.keys(CONTENT_MONSTERS).length).toBeGreaterThan(0)
      capture('inventory', { groups: groupedLootCohorts(), counts: {
        families: Object.keys(CONTENT_FAMILIES).length, monsters: Object.keys(CONTENT_MONSTERS).length,
        equipment: Object.keys(CONTENT_EQUIPMENT).length, materials: Object.keys(CONTENT_MATERIALS).length,
        recipes: Object.keys(CONTENT_RECIPES).length, crops: Object.keys(CONTENT_CROPS).length,
        cropGoods: Object.keys(CONTENT_CROP_GOODS).length, affixes: Object.keys(CONTENT_AFFIXES).length,
      } })
    } else if (LANE === 'loot') runLoot()
    else if (LANE === 'combat') runCombat()
    else if (LANE === 'combat-preflight') preflightCombatWitnesses()
    else if (LANE === 'economy') runEconomy()
    else if (LANE === 'long') runLongWorlds()
    else throw new Error(`unknown PHASE7_QA_LANE=${LANE}`)
    successful = true
  } catch (error) {
    capture('failures', { at: new Date().toISOString(), lane: LANE, error: String(error), stack: error instanceof Error ? error.stack : null })
    throw error
  } finally {
    finishRun(before.source, before.runner, successful)
  }
})

function runLoot() {
  const total = LOOT_AWARDS
  const cohorts = groupedLootCohorts()
  expect(Number.isSafeInteger(total) && total >= cohorts.length && total % cohorts.length === 0).toBe(true)
  const each = total / cohorts.length
  for (const [groupIndex, group] of cohorts.entries()) {
    const state = createGame(0x710000 + groupIndex), mirror = createGame(0x710000 + groupIndex)
    const stats = { group: group.key, definitions: group.ids, awards: 0, gear: 0, materials: {} as Record<string, number>,
      rarity: {} as Record<string, number>, affixes: {} as Record<string, number>, equipment: {} as Record<string, number>, mirrorAwards: 0 }
    for (const [definitionIndex, id] of group.ids.entries()) {
      const definitionAwards = Math.floor(each / group.ids.length) + (definitionIndex < each % group.ids.length ? 1 : 0)
      for (let i = 0; i < definitionAwards; i++) {
      const drop = awardContentLoot(state, { definitionId: id })
      const mirrored = stats.mirrorAwards < 50 ? awardContentLoot(mirror, { definitionId: id }) : null
      if (mirrored) {
        expect(mirrored).toEqual(drop)
        expect({ rng: mirror.rngState, instanceId: mirror.reward.nextInstanceId }).toEqual({ rng: state.rngState, instanceId: state.reward.nextInstanceId })
        stats.mirrorAwards++
      }
      stats.awards++
      for (const [material, amount] of Object.entries(drop.materials)) stats.materials[material] = (stats.materials[material] ?? 0) + (amount ?? 0)
      if (drop.instance) {
        stats.gear++
        countBy(drop.instance.rarity, stats.rarity)
        countBy(drop.instance.baseId, stats.equipment)
        for (const affix of drop.instance.affixes) countBy(`${affix.id}:T${affix.tier}`, stats.affixes)
        state.reward.instances.pop()
      }
      state.events.length = 0
      if (mirrored?.instance) mirror.reward.instances.pop()
      if (mirrored) mirror.events.length = 0
      capture('loot-raw', { group: group.key, definitionId: id, index: i, instance: drop.instance, materials: drop.materials })
      }
    }
    expect(stats.awards).toBe(each)
    capture('loot-summary', stats)
  }
}

interface ControlledCombatFixture {
  state: ReturnType<typeof createGame>
  band: 'early' | 'mid' | 'late'
  build: string
  requestedPlayerLevel: number
  effectivePlayerLevel: number
  spawnAdjustment: { reason: string; baseline: Record<string, string | number>; effective: Record<string, string | number>;
    adjustments: Array<{ field: string; requested: string | number; effective: string | number; reason: string }> }
  playerLevelAdjustment: { levels: number; reason: string | null }
  controlledRecipe: { id: string; outputLevel: number; playerLevelDelta: number; selectionReason: string | null;
    smithingGate: number | null; generatedItemLevel: number | null; characterLevel: number;
    masterpieceChance: number | null; masterpiece: boolean | null; comparisonLimitation: string | null } | null
}

const COMBAT_BANDS = ['early', 'mid', 'late'] as const
const ALL_STAGES = ['hamlet', 'village', 'town'] as const

function legalSpawnWitness(state: ReturnType<typeof createGame>, definitionId: string, requestedLevel: number) {
  const monster = CONTENT_MONSTERS[definitionId]!, family = CONTENT_FAMILIES[monster.familyId]!
  const monsterProfiles = monster.spawnProfiles ?? family.spawnProfiles
  const choices: Array<{ region: string; level: number; threat: number; stage: string; safety: number; time: number;
    minThreat: number; maxThreat: number; stages: readonly string[]; minSafety: number; maxSafety: number;
    timeConstraints: string[] }> = []
  for (const familyProfile of family.spawnProfiles) for (const monsterProfile of monsterProfiles) {
    if (familyProfile.region !== monsterProfile.region || !family.regions.includes(familyProfile.region)) continue
    const minLevel = Math.max(1, familyProfile.minPlayerLevel ?? 1, monsterProfile.minPlayerLevel ?? 1)
    const maxLevel = Math.min(10_000, familyProfile.maxPlayerLevel ?? 10_000, monsterProfile.maxPlayerLevel ?? 10_000)
    const minThreat = Math.max(1, familyProfile.minThreatLevel ?? 1, monsterProfile.minThreatLevel ?? 1)
    const maxThreat = Math.min(3, familyProfile.maxThreatLevel ?? 3, monsterProfile.maxThreatLevel ?? 3)
    const stages = ALL_STAGES.filter(stage => (!familyProfile.settlementStages || familyProfile.settlementStages.includes(stage))
      && (!monsterProfile.settlementStages || monsterProfile.settlementStages.includes(stage)))
    const minSafety = Math.max(0, familyProfile.minSafety ?? 0, monsterProfile.minSafety ?? 0)
    const maxSafety = Math.min(100, familyProfile.maxSafety ?? 100, monsterProfile.maxSafety ?? 100)
    if (minLevel > maxLevel || minThreat > maxThreat || !stages.length || minSafety > maxSafety) continue
    const level = Math.max(minLevel, Math.min(maxLevel, requestedLevel))
    const threat = Math.max(minThreat, Math.min(maxThreat, monster.rank === 'normal' ? 1 : monster.rank === 'elite' ? 2 : 3))
    const stage = stages.includes('village') ? 'village' : stages[0]!
    const safety = Math.max(minSafety, Math.min(maxSafety, 60))
    const yearMinutes = CONFIG.daysPerSeason * CONFIG.seasons.length * CONFIG.minutesPerDay
    for (let hourOffset = 0; hourOffset < CONFIG.daysPerSeason * CONFIG.seasons.length * 24; hourOffset++) {
      const time = hourOffset * 60
      const date = calendar(time), season = CONFIG.seasons[date.season] as ContentSeason
      const matches = (profile: ContentSpawnPredicate) => (!profile.seasons || profile.seasons.includes(season))
        && (!profile.hours || (profile.hours.start <= profile.hours.end
          ? date.hour >= profile.hours.start && date.hour < profile.hours.end
          : date.hour >= profile.hours.start || date.hour < profile.hours.end))
      if (matches(familyProfile) && matches(monsterProfile)) {
        const timeConstraints = [familyProfile, monsterProfile].flatMap(profile => [
          ...(profile.seasons ? [`season in ${profile.seasons.join('/')}`] : []),
          ...(profile.hours ? [`hour ${profile.hours.start}-${profile.hours.end}`] : []),
        ])
        choices.push({ region: familyProfile.region, level, threat, stage, safety, time: time % yearMinutes,
          minThreat, maxThreat, stages, minSafety, maxSafety, timeConstraints: [...new Set(timeConstraints)] }); break
      }
    }
  }
  choices.sort((a, b) => Math.abs(a.level - requestedLevel) - Math.abs(b.level - requestedLevel)
    || a.region.localeCompare(b.region) || a.level - b.level || a.threat - b.threat || a.time - b.time)
  for (const choice of choices) {
    const c = player(state)
    c.currentRegion = choice.region as typeof c.currentRegion
    c.level = choice.level; c.exp = 0
    state.regions[c.currentRegion].discovered = true
    state.threat.threatLevel = choice.threat
    state.settlement.stage = choice.stage as typeof state.settlement.stage
    state.settlement.safety = choice.safety
    state.worldTime = choice.time
    const option = contentEncounterOptions(state).find(candidate => candidate.definitionId === definitionId)
    if (option?.eligible) {
      const baseline = { region: family.regions[0]!, playerLevel: requestedLevel,
        threatLevel: monster.rank === 'normal' ? 1 : monster.rank === 'elite' ? 2 : 3,
        settlementStage: 'village', safety: 60, worldTime: 8 * 60 }
      const describeTime = (time: number) => {
        const date = calendar(time)
        return `${CONFIG.seasons[date.season]} hour ${date.hour}`
      }
      const adjustments: ControlledCombatFixture['spawnAdjustment']['adjustments'] = []
      const addAdjustment = (field: string, requested: string | number, effective: string | number, reason: string) => {
        if (requested !== effective) adjustments.push({ field, requested, effective, reason })
      }
      addAdjustment('region', baseline.region, choice.region,
        `default region ${baseline.region} has no shared family/monster profile; choose their shared region`)
      addAdjustment('playerLevel', requestedLevel, choice.level,
        `requested level ${requestedLevel} is outside the shared family/monster spawn range; clamp to ${choice.level}`)
      addAdjustment('threatLevel', baseline.threatLevel, choice.threat,
        `rank threat ${baseline.threatLevel} is outside the shared profile range ${choice.minThreat}-${choice.maxThreat}; clamp into range`)
      addAdjustment('settlementStage', baseline.settlementStage, choice.stage,
        `default stage is excluded by the shared profile stages ${choice.stages.join('/')}; choose an allowed stage`)
      addAdjustment('safety', baseline.safety, choice.safety,
        `default safety is outside the shared profile range ${choice.minSafety}-${choice.maxSafety}; clamp into range`)
      addAdjustment('worldTime', baseline.worldTime, choice.time,
        `default ${describeTime(baseline.worldTime)} fails profile time predicates (${choice.timeConstraints.join(', ')}); choose ${describeTime(choice.time)} satisfying them`)
      const reason = adjustments.length ? adjustments.map(adjustment => `${adjustment.field}: ${adjustment.reason}`).join('; ')
        : 'requested context already satisfies the shared family/monster spawn profiles'
      return { ...choice, baseline, adjustments, reason }
    }
  }
  throw new Error(`no finite legal controlled spawn witness for ${definitionId}, requestedLevel=${requestedLevel}`)
}

function controlledCombatState(seed: number, definitionId: string, band: 'early' | 'mid' | 'late', build: string): ControlledCombatFixture {
  const state = createGame(seed), c = player(state), monster = CONTENT_MONSTERS[definitionId]!
  const requestedLevel = band === 'early' ? Math.max(1, monster.level - 2) : band === 'mid' ? Math.max(5, monster.level) : Math.max(12, monster.level)
  const spawn = legalSpawnWitness(state, definitionId, requestedLevel)
  c.position = { x: 7, y: 6 }
  let recipeSelectionReason: string | null = null
  let controlledRecipe: ControlledCombatFixture['controlledRecipe'] = null
  state.threat.monsterPopulation = state.threat.threatLevel === 1 ? 20 : state.threat.threatLevel === 2 ? 50 : 80
  if (build === 'attack') c.stats.strength += band === 'early' ? 0 : band === 'mid' ? 5 : 15
  else if (build === 'defense') { c.inventory.armor = 1; c.equipment.armor = 'armor'; c.inventory.potion = 8 }
  else if (build === 'crafted') {
    const recipes = Object.values(CRAFTING_RECIPES)
    let candidate = recipes.find(recipe => recipe.outputLevel <= c.level)
    if (!candidate && recipes.length > 0) {
      // Craft legality is gated by skill, station, inputs, gold, and stamina, not player level.
      // Retain the early-band player level and use the lowest-output real recipe when none is level-matched.
      candidate = [...recipes].sort((a, b) => a.outputLevel - b.outputLevel || a.id.localeCompare(b.id))[0]!
      recipeSelectionReason = 'minimum_public_recipe_fallback'
    }
    if (candidate) {
      controlledRecipe = { id: candidate.id, outputLevel: candidate.outputLevel,
        playerLevelDelta: candidate.outputLevel - c.level, selectionReason: recipeSelectionReason,
        smithingGate: null, generatedItemLevel: candidate.outputLevel, characterLevel: c.level,
        masterpieceChance: null, masterpiece: null, comparisonLimitation: null }
      c.skills.smithing.level = Math.max(c.skills.smithing.level, candidate.requiredSmithing)
      c.position = { ...BUILDINGS[candidate.station].position }
      state.settlement.buildings = [...new Set([...state.settlement.buildings, candidate.station])]
      c.gold = 1000; c.stamina = c.maxStamina
      // Materials and station access are explicit controlled setup; the production craft function performs generation/cost/time.
      for (const input of candidate.inputs) {
        if (input.source === 'material') state.reward.materials[c.id]![input.materialId] = input.amount
        else (c.inventory as Record<string, number>)[input.itemId] = input.amount
      }
      state.worldTime = candidate.opensAtHour * 60
      const result = craft(state, { recipeId: candidate.id })
      if (!result.ok) throw new Error(`controlled craft fixture rejected: ${result.reasonCode}`)
      const item = state.reward.instances.find(entry => entry.instanceId === result.instanceId)!
      item.ownerId = c.id
      if (equipInstance(state, item.instanceId) !== '') throw new Error('crafted legal equipment could not be equipped')
    } else throw new Error('no legal recipe found for controlled crafted build')
  } else if (build === 'generated' || build === 'masterpiece') {
    const recipe = build === 'masterpiece'
      ? Object.values(CRAFTING_RECIPES).filter(candidate => !!candidate.masterpieceRules)
        .sort((a, b) => a.masterpieceRules!.requiredSmithing - b.masterpieceRules!.requiredSmithing
          || a.outputLevel - b.outputLevel || a.id.localeCompare(b.id))[0]
      : Object.values(CRAFTING_RECIPES).find(candidate => candidate.outputLevel <= c.level)
    if (build === 'masterpiece' && !recipe) throw new Error('no masterpiece-enabled recipe is legal at this fixture level')
    if (recipe && build === 'masterpiece') c.skills.smithing.level = Math.max(c.skills.smithing.level, recipe.masterpieceRules!.requiredSmithing)
    const generatedItemLevel = build === 'masterpiece' && recipe ? recipe.outputLevel : Math.max(1, c.level)
    const item = generateItem(state, { baseId: recipe?.outputBase ?? 'shortSword', level: generatedItemLevel,
      ...(build === 'masterpiece' && recipe ? { context: { kind: 'craft' as const, recipeId: recipe.id } } : {}) })
    item.ownerId = c.id
    state.reward.instances.push(item)
    if (equipInstance(state, item.instanceId) !== '') throw new Error(`${build} legal equipment could not be equipped`)
    if (build === 'masterpiece' && recipe) controlledRecipe = { id: recipe.id, outputLevel: recipe.outputLevel,
      playerLevelDelta: generatedItemLevel - c.level, selectionReason: 'minimum_masterpiece_smithing_gate',
      smithingGate: recipe.masterpieceRules!.requiredSmithing, generatedItemLevel, characterLevel: c.level,
      masterpieceChance: recipe.masterpieceRules!.chance, masterpiece: item.craftProvenance?.masterpiece ?? false,
      comparisonLimitation: generatedItemLevel === c.level ? null
        : `generated item level ${generatedItemLevel} differs from early-band character level ${c.level}; combat comparison includes item-level difference` }
  } else if (build !== 'legacy') throw new Error(`unsupported combat build ${build}`)
  // Controlled item generation may advance time or need an open station; restore the proven encounter context.
  state.worldTime = spawn.time
  if (encounterContentMonster(state, definitionId) !== '') throw new Error(`controlled content encounter rejected for ${definitionId}`)
  return {
    state, band, build, requestedPlayerLevel: requestedLevel, effectivePlayerLevel: c.level,
    playerLevelAdjustment: { levels: c.level - requestedLevel,
      reason: c.level === requestedLevel ? null : `requested level ${requestedLevel} is outside the shared family/monster spawn range; clamp to ${c.level}` },
    spawnAdjustment: { reason: spawn.reason, baseline: spawn.baseline,
      effective: { region: spawn.region, playerLevel: spawn.level, threatLevel: spawn.threat,
        settlementStage: spawn.stage, safety: spawn.safety, worldTime: spawn.time }, adjustments: spawn.adjustments }, controlledRecipe,
  }
}

function combatFixtureSetup(fixture: ControlledCombatFixture) {
  const controlledRecipe = fixture.controlledRecipe && {
    id: fixture.controlledRecipe.id,
    outputLevel: fixture.controlledRecipe.outputLevel,
    playerLevelDelta: fixture.controlledRecipe.playerLevelDelta,
    selectionReason: fixture.controlledRecipe.selectionReason,
    smithingGate: fixture.controlledRecipe.smithingGate,
    generatedItemLevel: fixture.controlledRecipe.generatedItemLevel,
    characterLevel: fixture.controlledRecipe.characterLevel,
    masterpieceChance: fixture.controlledRecipe.masterpieceChance,
    comparisonLimitation: fixture.controlledRecipe.comparisonLimitation,
  }
  return { band: fixture.band, requestedPlayerLevel: fixture.requestedPlayerLevel,
    effectivePlayerLevel: fixture.effectivePlayerLevel, playerLevelAdjustment: fixture.playerLevelAdjustment,
    spawnAdjustment: fixture.spawnAdjustment,
    controlledRecipe }
}

it('early crafted combat fixture uses a legal public recipe without changing the combat band level', () => {
  const fixture = controlledCombatState(0x720000, 'slime_slick', 'early', 'crafted')
  expect(fixture.band).toBe('early')
  expect(fixture.build).toBe('crafted')
  expect(fixture.requestedPlayerLevel).toBe(1)
  expect(fixture.effectivePlayerLevel).toBe(1)
  expect(fixture.playerLevelAdjustment).toEqual({ levels: 0, reason: null })
  expect(fixture.controlledRecipe).toMatchObject({
    id: 'starterSpear', outputLevel: 2, playerLevelDelta: 1, selectionReason: 'minimum_public_recipe_fallback',
  })
  expect(player(fixture.state).level).toBe(1)
  expect(fixture.state.combat?.contentEncounter?.definitionId).toBe('slime_slick')
  expect(fixture.state.reward.instances.some(item => item.baseId === CRAFTING_RECIPES[fixture.controlledRecipe!.id].outputBase
    && item.level === fixture.controlledRecipe!.outputLevel && item.ownerId === player(fixture.state).id)).toBe(true)
})

it('mid combat fixture clamps slime_slick to a shared legal spawn profile and encounters through public APIs', () => {
  const fixture = controlledCombatState(0x720000, 'slime_slick', 'mid', 'legacy')
  expect(fixture.requestedPlayerLevel).toBe(5)
  expect(fixture.effectivePlayerLevel).toBe(3)
  expect(fixture.playerLevelAdjustment).toEqual({ levels: -2,
    reason: 'requested level 5 is outside the shared family/monster spawn range; clamp to 3' })
  expect(fixture.spawnAdjustment).toMatchObject({ baseline: { region: 'farmland', playerLevel: 5,
    threatLevel: 1, settlementStage: 'village', safety: 60, worldTime: 480 },
    effective: { region: 'farmland', playerLevel: 3, threatLevel: 1, settlementStage: 'village', safety: 60, worldTime: 360 },
    adjustments: expect.arrayContaining([
      expect.objectContaining({ field: 'playerLevel', requested: 5, effective: 3 }),
      expect.objectContaining({ field: 'worldTime', requested: 480, effective: 360 }),
    ]) })
  expect(fixture.state.combat?.contentEncounter?.definitionId).toBe('slime_slick')
})

it('preserves the default spring 08:00 when slime_slick time predicates already allow it', () => {
  const fixture = controlledCombatState(0x720000, 'slime_slick', 'mid', 'legacy')
  expect(fixture.spawnAdjustment.effective.worldTime).toBe(480)
  expect(fixture.spawnAdjustment.adjustments.some(adjustment => adjustment.field === 'worldTime')).toBe(false)
})

it('records non-level context adjustments required by seasonal and hourly spawn predicates', () => {
  const fixture = controlledCombatState(0x720000, 'slime_amber', 'mid', 'legacy')
  expect(fixture.spawnAdjustment).toMatchObject({
    baseline: { region: 'farmland', playerLevel: 5, threatLevel: 1, settlementStage: 'village', safety: 60, worldTime: 480 },
    effective: { region: 'farmland', playerLevel: 4, threatLevel: 1, settlementStage: 'village', safety: 60, worldTime: 43_680 },
  })
  expect(fixture.spawnAdjustment.adjustments).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: 'playerLevel', requested: 5, effective: 4 }),
    expect.objectContaining({ field: 'worldTime', requested: 480, effective: 43_680,
      reason: expect.stringContaining('season in 夏/秋, hour 8-18') }),
  ]))
})

it('early masterpiece combat fixture uses a smithing-eligible public recipe without changing the combat band level', () => {
  const fixture = controlledCombatState(0x720000, 'slime_slick', 'early', 'masterpiece')
  expect(fixture.band).toBe('early')
  expect(fixture.build).toBe('masterpiece')
  expect(fixture.requestedPlayerLevel).toBe(1)
  expect(fixture.effectivePlayerLevel).toBe(1)
  expect(fixture.playerLevelAdjustment).toEqual({ levels: 0, reason: null })
  expect(fixture.controlledRecipe?.id).toBe('ironShortSword')
  const recipe = CRAFTING_RECIPES.ironShortSword
  expect(recipe.masterpieceRules?.requiredSmithing).toBe(6)
  const item = fixture.state.reward.instances.find(entry => entry.craftProvenance?.recipeId === recipe.id)
  expect(item).toMatchObject({ baseId: recipe.outputBase, level: recipe.outputLevel,
    craftProvenance: { recipeId: recipe.id, masterpiece: expect.any(Boolean) } })
  expect(fixture.controlledRecipe).toMatchObject({ outputLevel: 6, generatedItemLevel: 6,
    characterLevel: 1, playerLevelDelta: 5, smithingGate: 6, masterpieceChance: 0.25,
    masterpiece: item?.craftProvenance?.masterpiece,
    comparisonLimitation: 'generated item level 6 differs from early-band character level 1; combat comparison includes item-level difference' })
})

it('masterpiece roll is per-seed data while combat setup remains invariant', () => {
  const first = controlledCombatState(0x720000, 'slime_slick', 'early', 'masterpiece')
  const differentRoll = Array.from({ length: 100 }, (_, offset) => controlledCombatState(0x720001 + offset,
    'slime_slick', 'early', 'masterpiece')).find(fixture => fixture.controlledRecipe?.masterpiece !== first.controlledRecipe?.masterpiece)
  const repeatedSeed = controlledCombatState(0x720000, 'slime_slick', 'early', 'masterpiece')
  expect(differentRoll).toBeDefined()
  expect(differentRoll!.controlledRecipe?.masterpiece).not.toBe(first.controlledRecipe?.masterpiece)
  expect(combatFixtureSetup(differentRoll!)).toEqual(combatFixtureSetup(first))
  expect(repeatedSeed.controlledRecipe?.masterpiece).toBe(first.controlledRecipe?.masterpiece)
})

function runCombat() {
  const reps = COMBAT_PER_CELL
  const builds = ['legacy', 'attack', 'defense', 'generated', 'crafted', 'masterpiece']
  const rows: unknown[] = []
  preflightCombatWitnesses()
  for (const monster of Object.values(CONTENT_MONSTERS)) for (const band of COMBAT_BANDS) for (const build of builds) {
    let wins = 0, deaths = 0, turns = 0
    let fixtureSetup: ReturnType<typeof combatFixtureSetup> | null = null
    for (let sample = 0; sample < reps; sample++) {
      const fixture = controlledCombatState(0x720000 + sample, monster.id, band, build)
      const { state } = fixture
      const setup = combatFixtureSetup(fixture)
      if (fixtureSetup) expect(setup).toEqual(fixtureSetup)
      else fixtureSetup = setup
      let count = 0
      while (state.combat && count < 200) {
        const error = combatTurn(state, player(state).hp < player(state).maxHp * .45 && player(state).inventory.potion > 0 ? 'potion' : 'attack')
        if (error) throw new Error(`combat action rejected ${monster.id}: ${error}`)
        count++
      }
      wins += state.combat === null && player(state).isAlive ? 1 : 0
      deaths += player(state).isAlive ? 0 : 1
      turns += count
      const row = { definitionId: monster.id, rank: monster.rank, band, build, sample, won: state.combat === null && player(state).isAlive,
        died: !player(state).isAlive, turns: count, hp: player(state).hp, remainingEnemyHp: state.combat?.hp ?? 0,
        fixtureClass: 'CONTROLLED_LEGAL_FIXTURE_NOT_NATURAL_PLAY', seed: state.worldSeed,
        requestedPlayerLevel: fixture.requestedPlayerLevel, effectivePlayerLevel: fixture.effectivePlayerLevel,
        playerLevelAdjustment: fixture.playerLevelAdjustment, spawnAdjustment: fixture.spawnAdjustment,
        controlledRecipe: fixture.controlledRecipe }
      rows.push(row); capture('combat-raw', row)
    }
    capture('combat-summary', { definitionId: monster.id, rank: monster.rank, band, build, samples: reps, wins, deaths, meanTurns: turns / reps,
      fixtureClass: 'CONTROLLED_LEGAL_FIXTURE_NOT_NATURAL_PLAY', fixtureSetup })
  }
  expect(rows.length).toBe(Object.keys(CONTENT_MONSTERS).length * 3 * builds.length * reps)
}

function preflightCombatWitnesses() {
  let checked = 0
  for (const monster of Object.values(CONTENT_MONSTERS)) for (const band of COMBAT_BANDS) {
    const requestedLevel = band === 'early' ? Math.max(1, monster.level - 2)
      : band === 'mid' ? Math.max(5, monster.level) : Math.max(12, monster.level)
    const witness = legalSpawnWitness(createGame(0x72f000), monster.id, requestedLevel)
    capture('combat-witness-preflight', { definitionId: monster.id, band, requestedPlayerLevel: requestedLevel,
      effectivePlayerLevel: witness.level, adjustmentReason: witness.reason,
      baselineContext: witness.baseline,
      effectiveContext: { region: witness.region, playerLevel: witness.level, threatLevel: witness.threat,
        settlementStage: witness.stage, safety: witness.safety, worldTime: witness.time },
      adjustments: witness.adjustments,
      verifiedBy: 'contentEncounterOptions' })
    checked++
  }
  expect(checked, 'every actual monster × band must have one finite public spawn witness')
    .toBe(Object.keys(CONTENT_MONSTERS).length * COMBAT_BANDS.length)
}

function runEconomy() {
  const recipeResults = []
  for (const recipe of Object.values(CONTENT_RECIPES)) {
    const translated = CRAFTING_RECIPES[recipe.id]
    if (!translated) throw new Error(`public runtime recipe missing: ${recipe.id}`)
    const state = createGame(0x730000 + recipe.id.length), c = player(state)
    c.position = { ...BUILDINGS[recipe.station].position }
    state.settlement.buildings = [...new Set([...state.settlement.buildings, recipe.station])]
    state.worldTime = recipe.opensAtHour * 60
    c.skills.smithing.level = Math.max(c.skills.smithing.level, recipe.requiredSmithing)
    for (const input of recipe.inputs) if (input.source === 'material') {
      state.reward.materials[c.id]![input.materialId] = (state.reward.materials[c.id]![input.materialId] ?? 0) + input.amount
    }
    // Inventory inputs are intentionally seeded only within a controlled fixture.
    for (const input of recipe.inputs) if (input.source === 'inventory') (c.inventory as Record<string, number>)[input.itemId] = input.amount
    c.gold = Math.max(c.gold, recipe.goldCost + 1000)
    c.stamina = c.maxStamina
    const beforeGold = c.gold
    const influenceMaterial = recipe.allowedBiasMaterials[0] ?? null
    if (influenceMaterial) state.reward.materials[c.id]![influenceMaterial] = (state.reward.materials[c.id]![influenceMaterial] ?? 0) + 1
    const request = { recipeId: recipe.id, influenceMaterial }
    const plan = planCraft(state, request)
    if (!plan.ok) throw new Error(`public planCraft rejected controlled fixture ${recipe.id}: ${plan.reasonCode}`)
    const consumption = new Map<string, { source: 'material' | 'inventory'; id: string; required: number; before: number }>()
    for (const input of plan.inputs) {
      const id = input.source === 'material' ? input.materialId : input.itemId
      const key = `${input.source}:${id}`
      const current = input.source === 'material'
        ? state.reward.materials[c.id]![input.materialId] ?? 0
        : (c.inventory as Record<string, number>)[input.itemId] ?? 0
      const existing = consumption.get(key)
      consumption.set(key, { source: input.source, id, required: (existing?.required ?? 0) + input.required,
        before: existing?.before ?? current })
    }
    const result = craft(state, request)
    if (!result.ok) throw new Error(`public craft action rejected ${recipe.id}: ${result.reasonCode}`)
    const output = state.reward.instances.find(item => item.instanceId === result.instanceId) ?? null
    const consumedResources = [...consumption.values()].map(input => {
      const after = input.source === 'material' ? state.reward.materials[c.id]![input.id] ?? 0
        : (c.inventory as Record<string, number>)[input.id] ?? 0
      const consumed = input.before - after
      expect(consumed, `${recipe.id} must consume planned ${input.source} ${input.id}`).toBe(input.required)
      return { ...input, after, consumed }
    })
    recipeResults.push({ recipeId: recipe.id, result, acceptedByPlan: true, goldSpent: beforeGold - c.gold,
      inputConsumption: plan.inputs, selectedBiasMaterial: influenceMaterial, consumedResources,
      output, outputSellPrice: CONTENT_EQUIPMENT[recipe.outputBase]?.sell ?? null,
      source: 'CONTROLLED_PUBLIC_CRAFT_FIXTURE' })
    capture('craft-raw', recipeResults.at(-1))
  }
  const audits = Object.values(CONTENT_RECIPES).map(recipe => {
    const output = CONTENT_EQUIPMENT[recipe.outputBase]
    const inputSell = recipe.inputs.reduce((sum, input) => sum + (input.source === 'material'
      ? (CONTENT_MATERIALS[input.materialId]?.sell ?? 0) * input.amount
      : (ITEMS[input.itemId as keyof typeof ITEMS]?.sell ?? 0) * input.amount), 0)
    return { recipeId: recipe.id, outputBase: recipe.outputBase, outputSell: output?.sell ?? null,
      inputs: recipe.inputs.map(input => ({ ...input, unitSell: input.source === 'material'
        ? CONTENT_MATERIALS[input.materialId]?.sell ?? null
        : ITEMS[input.itemId as keyof typeof ITEMS]?.sell ?? null })),
      inputSell, goldCost: recipe.goldCost, staminaCost: recipe.staminaCost, durationMinutes: recipe.durationMinutes,
      catalogResaleOpportunityMargin: output ? output.sell - inputSell - recipe.goldCost : null,
      economicFieldVerification: 'pending-phase7-j: merchant purchase price and source availability are not established for content inputs' }
  })
  capture('economy-summary', { recipeResults, audits,
    scope: 'catalog sell-price opportunity margin and accepted public craft input consumption; does not establish actual merchant acquisition prices, merchant supply, market restock, or naturally available volume; no arbitrage pass claim' })
}

function runLongWorlds() {
  for (const seed of SEEDS) {
    const state = createGame(seed), start = state.worldTime
    let yearsDone = 0
    for (const year of CHECKPOINT_YEARS) {
      const target = start + year * 365 * CONFIG.minutesPerDay
      simulate(state, target - state.worldTime)
      const raw = serialize(state, 8110 + year), loaded = deserialize(raw).state
      expect(loaded).toEqual(state)
      const ahead = structuredClone(state), aheadReloaded = deserialize(serialize(state, 8111 + year)).state
      simulate(ahead, CONFIG.minutesPerDay); simulate(aheadReloaded, CONFIG.minutesPerDay)
      expect(aheadReloaded).toEqual(ahead)
      const checkpoint = { seed, year, elapsedMinutes: state.worldTime - start, alivePopulation: state.npcs.filter(npc => npc.isAlive).length,
        totalPopulation: state.npcs.length + state.characters.length, monsterPopulation: state.threat.monsterPopulation,
        threatLevel: state.threat.threatLevel, bossAlive: state.threat.bossAlive, worldTime: state.worldTime,
        npcIdNext: state.nextNpcId, eventSequence: state.eventSequence, eventCount: state.events.length, historyCount: state.history.length,
        cooldowns: state.life.director.cooldowns, crisis: state.regionalCrisis, saveBytes: Buffer.byteLength(raw),
        reloadEqual: true, continuationEqual: true,
        naturalContentBossDefeats: state.history.filter(event => event.type === 'content.boss.defeated').map(event => ({ at: event.at, message: event.message })),
        playerEncounterActionsSimulated: false,
        controlledReachabilityMeasuredSeparately: true }
      capture('long-checkpoints', checkpoint)
      yearsDone = year
    }
    expect(yearsDone).toBe(100)
  }
}
