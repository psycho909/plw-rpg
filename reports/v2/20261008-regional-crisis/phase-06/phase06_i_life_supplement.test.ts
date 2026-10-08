import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative, sep, resolve } from 'node:path'
import { expect, it, vi } from 'vitest'
import { CONFIG } from '../../../../src/data/config'
import { CRAFTING_RECIPES } from '../../../../src/data/crafting'
import { LIVING_EVENT_LIMITS } from '../../../../src/data/livingEvents'
import type { ItemInstance } from '../../../../src/domain/reward'
import { contributeCrisisEquipment, contributeCrisisFood, contributeCrisisGold } from '../../../../src/engine/crisisContributions'
import { deriveCivilDefense } from '../../../../src/engine/civilDefense'
import { generateItem } from '../../../../src/engine/itemGeneration'
import { advanceRegionalCrisisState, tryStartRegionalCrisis } from '../../../../src/engine/regionalCrisis'
import { createGame, player, simulate } from '../../../../src/engine/simulation'
import * as randomModule from '../../../../src/engine/random'
import { deserialize, serialize } from '../../../../src/services/saveService'

const ROOT = resolve(process.cwd())
const PHASE = join(ROOT, 'reports/v2/20261008-regional-crisis/phase-06')
const OUT = resolve(process.env.PHASE6_I_LIFE_OUT ?? join(PHASE, 'i-dry-life-supplement'))
const MODE = process.env.PHASE6_I_LIFE_MODE ?? 'dry'
const PAIRS = MODE === 'full' ? Number(process.env.PHASE6_I_LIFE_PAIRS ?? 500) : 3
const BASE_SEEDS = [0x71a11, 0x71b22, 0x71c33]
const DAY = CONFIG.minutesPerDay
const SOURCE_FILES = [
  'tickets/20261008-v2x-06i-simulation.md',
  'reports/v2/20261008-regional-crisis/phase-06/phase06_i_life_supplement.test.ts',
  'reports/v2/20261008-regional-crisis/phase-06/phase06_i_life_supplement.config.ts',
  'reports/v2/20261008-regional-crisis/phase-06/phase06_i_simulation.test.ts',
  'reports/v2/20261008-regional-crisis/phase-06/phase06_i_simulation.config.ts',
]

function sha(value: string | Buffer) { return createHash('sha256').update(value).digest('hex') }
function under(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? under(path) : [path]
  })
}
function fingerprint() {
  const source = Object.fromEntries(under(join(ROOT, 'src')).sort().map(path =>
    [relative(ROOT, path).split(sep).join('/'), sha(readFileSync(path))]))
  const helpers = Object.fromEntries([...SOURCE_FILES, 'reports/v2/20261008-regional-crisis/phase-06/phase06_i_reaggregate.py']
    .map(path => [path, sha(readFileSync(join(ROOT, path)))]))
  return { commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    sourceFingerprint: sha(JSON.stringify(source)), helperHashes: helpers }
}

function craftedGear(seed: number, ownerId: string): ItemInstance {
  const detached = createGame(seed)
  player(detached).skills.smithing.level = 1
  const recipe = CRAFTING_RECIPES.starterSpear!
  const item = generateItem(detached, { baseId: recipe.outputBase, level: recipe.outputLevel,
    context: { kind: 'craft', recipeId: 'starterSpear' } })
  if (item.craftProvenance?.recipeId !== 'starterSpear') throw new Error('supplement gear missing craft-context provenance')
  return { ...structuredClone(item), ownerId }
}

function preparationFixture(seed: number, pairIndex: number) {
  const state = createGame(seed)
  const character = player(state)
  character.position = { ...LIVING_EVENT_LIMITS.deliverySquare }
  character.currentRegion = 'village'
  character.inventory.food = 25
  character.gold = 200
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.threat.bossProgress = 50
  state.threat.bossAlive = true
  state.settlement.safety = 60
  state.settlement.food = 0
  for (const npc of state.npcs) {
    npc.job = 'guard'
    npc.age = 30
    npc.isAlive = true
    npc.injuredUntil = state.worldTime
    state.life.npcs[npc.id]!.career = 'worker'
    state.life.npcs[npc.id]!.careerJob = 'guard'
  }
  while (state.npcs.length < 52) {
    const source = state.npcs[0]!
    const npc = structuredClone(source)
    npc.id = `npc-${state.nextNpcId++}`
    npc.name = `guard-${npc.id}`
    state.npcs.push(npc)
    state.life.npcs[npc.id] = { ...structuredClone(state.life.npcs[source.id]!), careerJob: 'guard', career: 'worker' }
  }
  if (!tryStartRegionalCrisis(state, () => 0) || state.regionalCrisis.phase !== 'warning') {
    throw new Error(`pair ${pairIndex}: legal warning crisis failed to start`)
  }
  const crisisId = state.regionalCrisis.id
  const defender = state.npcs[0]!
  const gear = craftedGear(seed + 9_000_000, character.id)
  gear.instanceId = `item-${state.reward.nextInstanceId++}`
  return { state, crisisId, defenderId: defender.id, gear }
}

function resolveArm(seed: number, pairIndex: number, arm: 'NoPlayerAction' | 'LifePublicSupport') {
  const { state, crisisId, defenderId, gear } = preparationFixture(seed, pairIndex)
  const character = player(state)
  const initialState = structuredClone(state)
  const actions: Array<Record<string, unknown>> = []
  const baseline = deriveCivilDefense(state, state.regionalCrisis)
  if (!baseline) throw new Error(`pair ${pairIndex}/${arm}: missing warning-phase defense`)
  if (arm === 'LifePublicSupport') {
    state.reward.instances.push(gear)
    const foodBefore = character.inventory.food
    const foodStockBefore = state.settlement.food
    const foodError = contributeCrisisFood(state, crisisId, 25)
    actions.push({ action: 'contributeCrisisFood', requestedInventoryItems: 25, accepted: foodError === '', error: foodError,
      inventoryCost: foodBefore - character.inventory.food, settlementFoodChange: state.settlement.food - foodStockBefore })
    const goldBefore = character.gold
    const goldError = contributeCrisisGold(state, crisisId, 25)
    actions.push({ action: 'contributeCrisisGold', requestedGold: 25, accepted: goldError === '', error: goldError,
      goldCost: goldBefore - character.gold })
    const defenderBefore = structuredClone(state.npcs.find(npc => npc.id === defenderId)?.equipment)
    const equipmentError = contributeCrisisEquipment(state, crisisId, defenderId, gear.instanceId)
    const equipmentLedger = state.regionalCrisis.phase === 'dormant' ? undefined : state.regionalCrisis.contributions.equipment.at(-1)
    actions.push({ action: 'contributeCrisisEquipment', requestedInstanceId: gear.instanceId, accepted: equipmentError === '',
      error: equipmentError, itemConsumed: !state.reward.instances.some(item => item.instanceId === gear.instanceId),
      defenderEquipmentBefore: defenderBefore,
      defenderEquipmentAfter: structuredClone(state.npcs.find(npc => npc.id === defenderId)?.equipment),
      craftProvenance: gear.craftProvenance, ledgerSource: equipmentLedger?.sourceItem })
    if (actions.some(action => action.accepted !== true)) {
      throw new Error(`pair ${pairIndex}: treatment contribution not accepted: ${JSON.stringify(actions)}`)
    }
  }
  const crisisStart = state.regionalCrisis
  while (state.regionalCrisis.phase === 'warning' || state.regionalCrisis.phase === 'preparation') {
    state.worldTime = state.regionalCrisis.phaseEndsAt
    state.regionalCrisis = advanceRegionalCrisisState(state.regionalCrisis, state.worldTime)
  }
  if (state.regionalCrisis.phase !== 'active') throw new Error(`pair ${pairIndex}/${arm}: could not reach active phase`)
  const startWorld = { rngState: state.rngState, worldTime: state.worldTime }
  const preResolutionReload = deserialize(serialize(state, 9101)).state
  expect(preResolutionReload).toEqual(state)
  const activeCrisis = state.regionalCrisis
  const resolutionBoundary = Math.max(Math.ceil(activeCrisis.phaseEndsAt / DAY) * DAY, (Math.floor(state.worldTime / DAY) + 1) * DAY)
  const resolverDraws: Array<{ at: number; value: number }> = []
  const originalRandom = randomModule.random
  const randomSpy = vi.spyOn(randomModule, 'random').mockImplementation((target?: { rngState: number }) => {
    const value = originalRandom(target)
    if (target === state && state.regionalCrisis.phase === 'resolution') resolverDraws.push({ at: state.worldTime, value })
    return value
  })
  try { simulate(state, resolutionBoundary - state.worldTime) } finally { randomSpy.mockRestore() }
  const resolved = state.regionalCrisis
  if (resolved.phase !== 'aftermath' || !resolved.resolutionSummary) throw new Error(`pair ${pairIndex}/${arm}: canonical simulate did not resolve`)
  expect(resolverDraws).toHaveLength(1)
  const postResolutionReload = deserialize(serialize(state, 9102)).state
  expect(postResolutionReload).toEqual(state)
  // A load-and-save round trip must preserve the resolved state without applying another contribution or resolution.
  expect(deserialize(serialize(postResolutionReload, 9103)).state).toEqual(postResolutionReload)
  const actualSummary = resolved.resolutionSummary
  return {
    pairIndex, seed, arm, fixture: { phaseWhenActionsRan: crisisStart.phase, playerAlive: character.isAlive,
      npcCount: state.npcs.length, allGuardRoles: state.npcs.every(npc => npc.job === 'guard'),
      initialWorldTime: initialState.worldTime, initialWorldSha256: sha(JSON.stringify(initialState)),
      initialFood: initialState.settlement.food, initialInventoryFood: player(initialState).inventory.food,
      initialGold: player(initialState).gold, baselineReadiness: baseline.readiness,
      baselineActualProbability: baseline.successChance, initialCrisisId: crisisId,
      gearResourceWasControlled: true, gearGeneration: 'generateItem craft-context starterSpear; no full craft transaction',
      combatCalls: 0 }, actions, rngStart: startWorld.rngState, actualResolutionDraw: resolverDraws[0],
    rngStateAfterResolutionTick: state.rngState,
    actualProbability: actualSummary.successChance, outcome: resolved.outcome, resolutionSummary: actualSummary,
    final: { food: state.settlement.food, gold: character.gold, inventoryFood: character.inventory.food,
      contributions: resolved.contributions, foodLedger: resolved.contributions.food, goldLedger: resolved.contributions.gold,
      equipmentCount: resolved.contributions.equipment.length, worldTime: state.worldTime,
      population: state.threat.monsterPopulation, safety: state.settlement.safety,
      prosperity: state.settlement.prosperity, aliveNpcs: state.npcs.filter(npc => npc.isAlive).length },
    saveChecks: { preResolutionRoundTrip: true, postResolutionRoundTrip: true, loadedResaveNoReplay: true },
    durationDays: (state.worldTime - initialState.worldTime) / DAY,
  }
}

it('runs the paired public Life contribution supplement with resumable pair boundaries', () => {
  if (!Number.isSafeInteger(PAIRS) || PAIRS < 1) throw new Error('pair count must be positive')
  if (MODE === 'full') expect(PAIRS).toBe(500)
  mkdirSync(OUT, { recursive: true })
  const before = fingerprint()
  const metadata = { runId: MODE === 'full' ? 'phase6-i-life-public-500pairs' : 'phase6-i-life-public-dry', mode: MODE,
    pairCount: PAIRS, baseSeedSchedule: BASE_SEEDS, seedFormula: 'BASE_SEEDS[pairIndex % 3] + pairIndex',
    treatment: 'warning/preparation public crisis food + gold + generated craft-context gear contributions',
    comparison: 'matched living player with no crisis contribution actions', sourceFingerprint: before.sourceFingerprint,
    commit: before.commit, helperHashes: before.helperHashes }
  const manifestPath = join(OUT, 'life-run-manifest.json')
  if (existsSync(manifestPath)) expect(JSON.parse(readFileSync(manifestPath, 'utf8'))).toEqual(metadata)
  else writeFileSync(manifestPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' })
  const rowsPath = join(OUT, 'life-pairs.jsonl')
  const body = existsSync(rowsPath) ? readFileSync(rowsPath, 'utf8') : ''
  if (body && !body.endsWith('\n')) throw new Error('partial pair row found; preserve for diagnosis')
  const rows = body.trim() ? body.trim().split('\n').map(line => JSON.parse(line) as { pairIndex: number }) : []
  expect(rows.length).toBeLessThanOrEqual(PAIRS)
  rows.forEach((row, index) => expect(row.pairIndex).toBe(index))
  for (let pairIndex = rows.length; pairIndex < PAIRS; pairIndex++) {
    const seed = BASE_SEEDS[pairIndex % BASE_SEEDS.length]! + pairIndex
    const control = resolveArm(seed, pairIndex, 'NoPlayerAction')
    const treatment = resolveArm(seed, pairIndex, 'LifePublicSupport')
    expect(control.rngStart).toBe(treatment.rngStart)
    expect(control.fixture.initialCrisisId).toBe(treatment.fixture.initialCrisisId)
    expect(control.fixture.initialWorldTime).toBe(treatment.fixture.initialWorldTime)
    expect(control.fixture.initialWorldSha256).toBe(treatment.fixture.initialWorldSha256)
    const pair = { pairIndex, seed, control, treatment,
    matched: { initialWorldAndRngSame: true,
        actualResolutionDrawControl: control.actualResolutionDraw, actualResolutionDrawTreatment: treatment.actualResolutionDraw,
        treatmentActionsAllAccepted: treatment.actions.length === 3 && treatment.actions.every(action => action.accepted === true),
        noCombatCalls: control.fixture.combatCalls === 0 && treatment.fixture.combatCalls === 0 } }
    appendFileSync(rowsPath, `${JSON.stringify(pair)}\n`, { flag: 'a' })
  }
  const after = fingerprint()
  expect(after).toEqual(before)
  const result = { ...metadata, rows: PAIRS, resolutions: PAIRS * 2,
    actionAcceptance: { food: 0, gold: 0, gear: 0 },
    allSaveChecks: false, combatCalls: 0, seedSchedule: 'deterministic paired stratified; not IID; no naive confidence intervals',
    outcomes: { control: {}, treatment: {} }, actualProbabilityByArm: {},
    rawSha256: sha(readFileSync(rowsPath)), finalFingerprint: after }
  const outputRows = readFileSync(rowsPath, 'utf8').trim().split('\n').map(line => JSON.parse(line) as any)
  expect(outputRows).toHaveLength(PAIRS)
  result.actionAcceptance = { food: outputRows.filter(pair => pair.treatment.actions.some((action: any) => action.action === 'contributeCrisisFood' && action.accepted)).length,
    gold: outputRows.filter(pair => pair.treatment.actions.some((action: any) => action.action === 'contributeCrisisGold' && action.accepted)).length,
    gear: outputRows.filter(pair => pair.treatment.actions.some((action: any) => action.action === 'contributeCrisisEquipment' && action.accepted)).length }
  result.allSaveChecks = outputRows.every(pair => pair.control.saveChecks.preResolutionRoundTrip && pair.control.saveChecks.postResolutionRoundTrip
    && pair.control.saveChecks.loadedResaveNoReplay && pair.treatment.saveChecks.preResolutionRoundTrip
    && pair.treatment.saveChecks.postResolutionRoundTrip && pair.treatment.saveChecks.loadedResaveNoReplay)
  expect(result.actionAcceptance).toEqual({ food: PAIRS, gold: PAIRS, gear: PAIRS })
  expect(result.allSaveChecks).toBe(true)
  for (const arm of ['control', 'treatment'] as const) {
    const samples = outputRows.map(pair => pair[arm])
    result.outcomes[arm] = Object.fromEntries([...new Set(samples.map(sample => sample.outcome))]
      .sort().map(outcome => [outcome, samples.filter(sample => sample.outcome === outcome).length]))
    const probabilities = samples.map(sample => sample.actualProbability as number)
    result.actualProbabilityByArm[arm] = { mean: probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length,
      min: Math.min(...probabilities), max: Math.max(...probabilities) }
  }
  writeFileSync(join(OUT, 'life-summary.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: existsSync(join(OUT, 'life-summary.json')) ? 'w' : 'wx' })
})
