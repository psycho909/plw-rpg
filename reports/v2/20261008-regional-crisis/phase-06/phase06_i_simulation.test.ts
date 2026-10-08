import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative, resolve, sep } from 'node:path'
import { expect, it } from 'vitest'
import { CONFIG } from '../../../../src/data/config'
import { LIVING_EVENT_LIMITS } from '../../../../src/data/livingEvents'
import { CRAFTING_RECIPES } from '../../../../src/data/crafting'
import type { ItemInstance } from '../../../../src/domain/reward'
import type { RegionalCrisisOutcome, RegionalCrisisState } from '../../../../src/domain/crisis'
import { combatTurn, startRegionalCampRaid } from '../../../../src/engine/actions'
import { contributeCrisisEquipment, contributeCrisisFood, contributeCrisisGold } from '../../../../src/engine/crisisContributions'
import { deriveCivilDefense } from '../../../../src/engine/civilDefense'
import { generateItem } from '../../../../src/engine/itemGeneration'
import { recordRegionalChiefDefeat, tryStartRegionalCrisis, advanceRegionalCrisisState } from '../../../../src/engine/regionalCrisis'
import { createGame, die, player, simulate } from '../../../../src/engine/simulation'
import { random } from '../../../../src/engine/random'
import { deserialize, serialize } from '../../../../src/services/saveService'

const ROOT = resolve(process.cwd())
const PHASE = join(ROOT, 'reports/v2/20261008-regional-crisis/phase-06')
const DAY = CONFIG.minutesPerDay
const OUT = resolve(process.env.PHASE6_I_OUT ?? join(PHASE, 'i-dry'))
const MODE = process.env.PHASE6_I_MODE ?? 'dry'
const RUN_ID = process.env.PHASE6_I_RUN_ID ?? 'phase6-i-dry'
const SAMPLE_COUNT = MODE === 'full' ? Number(process.env.PHASE6_I_SAMPLES ?? 10_000) : 10
const LONG_YEARS = Number(process.env.PHASE6_I_LONG_YEARS ?? 100)
const SEEDS = [0x61a11, 0x61b22, 0x61c33]
const OUTCOMES: RegionalCrisisOutcome[] = ['decisive_success', 'costly_success', 'setback', 'local_defeat']
const PROFILES = ['NoPlayer', 'LifeOnly', 'AdventureOnly', 'Mixed', 'Prepared', 'Underprepared', 'StrongGear', 'WeakGear', 'CheapSpam', 'ChiefOnly'] as const

function sha(text: string | Buffer) { return createHash('sha256').update(text).digest('hex') }
function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })
}
function fingerprint() {
  const source = Object.fromEntries(filesUnder(join(ROOT, 'src')).sort().map(path =>
    [relative(ROOT, path).split(sep).join('/'), sha(readFileSync(path))]))
  const inputs = [
    'tickets/20261008-v2x-06i-simulation.md',
    'docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md',
    'reports/v2/20261008-regional-crisis/phase-06/qa-runner-plan.md',
    'reports/v2/20261008-regional-crisis/phase-06/phase06_i_simulation.test.ts',
    'reports/v2/20261008-regional-crisis/phase-06/phase06_i_simulation.config.ts',
  ]
  const helperHashes = Object.fromEntries(inputs.map(path => [path, sha(readFileSync(join(ROOT, path)))]))
  return { source, sourceFingerprint: sha(JSON.stringify(source)), helperHashes,
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() }
}
function craftedFixture(seed: number, strength: 'weak' | 'strong'): ItemInstance {
  const detached = createGame(seed)
  const recipeId = strength === 'strong' ? 'ironShortSword' : 'starterSpear'
  const smithingLevel = strength === 'strong' ? 6 : 1
  player(detached).skills.smithing.level = smithingLevel
  detached.reward.nextInstanceId = 1
  const recipe = CRAFTING_RECIPES[recipeId]
  const crafted = generateItem(detached, { baseId: recipe.outputBase, level: recipe.outputLevel,
    material: strength === 'strong' ? 'wolfFang' : null, context: { kind: 'craft', recipeId } })
  if (crafted.craftProvenance?.recipeId !== recipeId) throw new Error(`${strength} gear lacks canonical craft provenance`)
  return crafted
}
function profileFixture(seed: number, index: number) {
  const profile = PROFILES[index % PROFILES.length]!
  const state = createGame(seed)
  state.threat.monsterPopulation = profile === 'Underprepared' ? 100 : 30 + index % 71
  state.threat.threatLevel = state.threat.monsterPopulation >= 70 ? 3 : 2
  state.threat.campLevel = state.threat.threatLevel
  state.threat.bossProgress = 50
  state.threat.bossAlive = profile === 'ChiefOnly' || index % 7 === 0
  state.settlement.safety = profile === 'Underprepared' ? 25 : 60
  state.settlement.food = profile === 'Underprepared' ? 10 : profile === 'CheapSpam' ? 0 : 60
  const character = player(state)
  character.position = { ...LIVING_EVENT_LIMITS.deliverySquare }
  character.currentRegion = 'village'
  const defender = state.npcs[0]!
  defender.job = 'guard'; defender.age = 30; defender.isAlive = true; defender.injuredUntil = state.worldTime
  defender.equipment.weapon = null; defender.equipment.armor = null
  state.life.npcs[defender.id]!.career = 'worker'; state.life.npcs[defender.id]!.careerJob = 'guard'
  character.inventory.food = 30
  character.gold = 250
  if (!tryStartRegionalCrisis(state, () => 0)) throw new Error(`fixture start failed for ${profile}`)
  if (state.regionalCrisis.phase === 'dormant') throw new Error('crisis fixture unexpectedly dormant')
  const crisisId = state.regionalCrisis.id
  const actionLog: string[] = []
  if (profile === 'NoPlayer') {
    die(state, character, 'controlled NoPlayer scenario')
    state.npcs = []
    state.life.npcs = {}
    state.threat.bossAlive = true
    state.settlement.food = 0
    actionLog.push('canonical die(player) with controlled empty settlement; verifies Chief recovery path')
  }
  if (profile === 'LifeOnly' || profile === 'Mixed' || profile === 'Prepared' || profile === 'CheapSpam') {
    for (const npc of state.npcs.slice(0, 8)) { npc.job = 'guard'; state.life.npcs[npc.id]!.careerJob = 'guard' }
    const farmerCount = profile === 'CheapSpam' ? 1 : 4
    for (const npc of state.npcs.slice(8, 8 + farmerCount)) { npc.job = 'farmer'; state.life.npcs[npc.id]!.careerJob = 'farmer' }
    actionLog.push('fixture: assigned guard/farmer jobs')
  }
  if (profile === 'AdventureOnly' || profile === 'Mixed') {
    const forest = state.tiles.find(tile => tile.regionId === 'forest' && tile.walkable)!
    character.position = { x: forest.x, y: forest.y }; character.currentRegion = 'forest'; character.stats.strength = 500
    if (startRegionalCampRaid(state, crisisId) !== '') throw new Error('canonical camp raid action rejected fixture')
    let turns = 0
    while (state.combat && turns < 100) {
      const err = combatTurn(state, 'attack')
      if (err) throw new Error(`camp raid action failed: ${err}`)
      turns++
    }
    if (state.combat || state.regionalCrisis.adventure.campRaidAt === null) {
      throw new Error('camp raid did not complete through canonical combat actions')
    }
    actionLog.push(`canonical startRegionalCampRaid + combatTurn attack x${turns}`)
    character.position = { ...LIVING_EVENT_LIMITS.deliverySquare }
    character.currentRegion = 'village'
  }
  if (profile === 'ChiefOnly') {
    const actorId = state.npcs[0]!.id
    if (!recordRegionalChiefDefeat(state, 'npc', actorId)) throw new Error('chief-only outcome was rejected')
    actionLog.push('canonical recordRegionalChiefDefeat npc')
  }
  if (profile === 'StrongGear' || profile === 'WeakGear' || profile === 'Prepared' || profile === 'Mixed') {
    const strength = profile === 'WeakGear' ? 'weak' : 'strong'
    const gear = craftedFixture(seed + index, strength)
    gear.ownerId = character.id
    state.reward.instances.push(gear)
    state.reward.nextInstanceId = Math.max(state.reward.nextInstanceId, Number(gear.instanceId.slice('item-'.length)) + 1)
    const equipmentError = contributeCrisisEquipment(state, crisisId, defender.id, gear.instanceId)
    if (equipmentError) throw new Error(`${strength} gear rejected: ${equipmentError}; position=${JSON.stringify(character.position)} region=${character.currentRegion}`)
    actionLog.push(`detached generateItem craft fixture (${gear.craftProvenance?.recipeId}, Smithing ${strength === 'strong' ? 6 : 1}) + canonical contributeCrisisEquipment`)
  }
  if (profile === 'CheapSpam' || profile === 'Prepared' || profile === 'Mixed') {
    // Exercise repeated legal bounded contributions; stop when the canonical action reports no need.
    for (let n = 0; n < 25; n++) {
      if (character.inventory.food < 1) break
      const err = contributeCrisisFood(state, crisisId, 1)
      if (err) { actionLog.push(`canonical contributeCrisisFood x1 rejected: ${err}`); break }
      actionLog.push('canonical contributeCrisisFood x1')
    }
    for (const amount of [1, 1, 1, 1, 1]) {
      if (character.gold < amount) break
      const err = contributeCrisisGold(state, crisisId, amount)
      if (err) { actionLog.push(`canonical contributeCrisisGold x1 rejected: ${err}`); break }
      actionLog.push('canonical contributeCrisisGold x1')
    }
  }
  if (profile !== 'Underprepared' && profile !== 'NoPlayer' && profile !== 'ChiefOnly' && profile !== 'AdventureOnly' && profile !== 'LifeOnly' && profile !== 'StrongGear' && profile !== 'WeakGear' && profile !== 'CheapSpam' && profile !== 'Mixed' && profile !== 'Prepared') {
    throw new Error(`unknown profile ${profile}`)
  }
  let crisis: RegionalCrisisState = state.regionalCrisis
  while (crisis.phase === 'warning' || crisis.phase === 'preparation') {
    state.worldTime = crisis.phaseEndsAt
    crisis = advanceRegionalCrisisState(crisis, state.worldTime)
    state.regionalCrisis = crisis
  }
  if (crisis.phase !== 'active') throw new Error(`expected active phase for ${profile}, got ${crisis.phase}`)
  state.rngState = Math.floor((index + 0.5) * 0x1_0000_0000 / SAMPLE_COUNT) >>> 0
  state.life.director.quietUntil = crisis.phaseEndsAt + 100 * DAY
  const defense = deriveCivilDefense(state, crisis)
  if (!defense) throw new Error(`defense unavailable for ${profile}`)
  return { state, profile, actionLog, readiness: defense.readiness, successChance: defense.successChance }
}
function jsonlRows(path: string) {
  if (!existsSync(path)) return [] as Record<string, unknown>[]
  const body = readFileSync(path, 'utf8')
  if (!body.endsWith('\n')) throw new Error(`partial JSONL line found; preserving for diagnosis: ${path}`)
  return body.trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as Record<string, unknown>)
}
function runResolutions() {
  if (!Number.isSafeInteger(SAMPLE_COUNT) || SAMPLE_COUNT < 1) throw new Error('sample count must be a positive safe integer')
  if (MODE === 'full') expect(SAMPLE_COUNT).toBeGreaterThanOrEqual(10_000)
  mkdirSync(OUT, { recursive: true })
  const rowsPath = join(OUT, 'resolutions.jsonl'), metaPath = join(OUT, 'run-manifest.json')
  const before = fingerprint()
  const metadata = { runId: RUN_ID, mode: MODE, sampleCount: SAMPLE_COUNT, profileCycle: PROFILES,
    seedCycle: SEEDS, sourceFingerprint: before.sourceFingerprint, commit: before.commit, helperHashes: before.helperHashes }
  if (existsSync(metaPath)) expect(JSON.parse(readFileSync(metaPath, 'utf8'))).toEqual(metadata)
  else writeFileSync(metaPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' })
  const rows = jsonlRows(rowsPath)
  expect(rows.length).toBeLessThanOrEqual(SAMPLE_COUNT)
  for (let i = 0; i < rows.length; i++) expect(rows[i]?.index).toBe(i)
  for (let index = rows.length; index < SAMPLE_COUNT; index++) {
    const { state, profile, actionLog, readiness, successChance } = profileFixture(SEEDS[index % SEEDS.length]! + index, index)
    const initial = structuredClone(state)
  const expectedRng = { rngState: state.rngState }; const rngDraw = random(expectedRng)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('resolution sample is not active')
    const initialWorld = { monsterPopulation: state.threat.monsterPopulation, bossProgress: state.threat.bossProgress,
      food: state.settlement.food, safety: state.settlement.safety, prosperity: state.settlement.prosperity,
      aliveNpcs: state.npcs.filter(npc => npc.isAlive).length }
    let preReload: ReturnType<typeof createGame>
    try { preReload = deserialize(serialize(state, 7701)).state }
    catch (error) { throw new Error(`pre-resolution save round-trip failed index=${index} profile=${profile}: ${String(error)}`) }
    expect(preReload).toEqual(state)
    const resolutionBoundary = Math.max(Math.ceil(crisis.phaseEndsAt / DAY) * DAY, (Math.floor(state.worldTime / DAY) + 1) * DAY)
    simulate(state, resolutionBoundary - state.worldTime)
    const after = state.regionalCrisis
    if (after.phase !== 'aftermath' || !after.resolutionSummary) throw new Error(`canonical simulate failed to resolve sample ${index}: phase=${after.phase} worldTime=${state.worldTime} start=${initial.worldTime} boundary=${resolutionBoundary} phaseEnd=${crisis.phaseEndsAt}`)
    expect(state.rngState).toBe(expectedRng.rngState)
    const reloadedAfter = deserialize(serialize(state, 7702)).state
    expect(reloadedAfter).toEqual(state)
    let recoveryResult: unknown = after.resolutionSummary.recovery
    let recoveryReloadEqual = true
    if (profile === 'NoPlayer') {
      simulate(state, 31 * DAY)
      simulate(reloadedAfter, 31 * DAY)
      expect(reloadedAfter).toEqual(state)
      if (state.regionalCrisis.phase === 'aftermath' || state.regionalCrisis.phase === 'cooldown') {
        recoveryResult = state.regionalCrisis.resolutionSummary?.recovery
      }
      expect(recoveryResult).toMatchObject({ status: 'granted', npcId: expect.any(String) })
      recoveryReloadEqual = true
    }
    const row = { index, seed: initial.worldSeed, profile, actionLog, readiness, successChance,
      rngStart: initial.rngState, rngDraw, outcome: after.outcome, outcomeProbabilities: {
        decisive_success: .60 * successChance, costly_success: .40 * successChance,
        setback: .70 * (1 - successChance), local_defeat: .30 * (1 - successChance),
      }, resolutionSummary: after.resolutionSummary,
      initial: initialWorld, fixture: { playerAlive: player(initial).isAlive,
        npcAlive: initial.npcs.filter(npc => npc.isAlive).length, bossAlive: initial.threat.bossAlive,
        threatLevel: initial.threat.threatLevel, campLevel: initial.threat.campLevel,
        crisisCause: crisis.cause, chiefOutcome: crisis.chiefOutcome, campRaidAt: crisis.adventure.campRaidAt,
        contributions: crisis.contributions, jobs: Object.fromEntries([...new Set(initial.npcs.map(npc => npc.job))]
          .map(job => [job, initial.npcs.filter(npc => npc.isAlive && npc.job === job).length])) },
      final: { monsterPopulation: state.threat.monsterPopulation, bossProgress: state.threat.bossProgress,
        food: state.settlement.food, safety: state.settlement.safety, prosperity: state.settlement.prosperity,
        aliveNpcs: state.npcs.filter(npc => npc.isAlive).length,
        injuryCount: after.resolutionSummary.injuries.length,
        lossBounds: { monsterPopulation: [0, 100], food: [0, 100], safety: [25, 100], prosperity: [18, 100] },
      }, recoveryResult, saveChecks: { preResolutionRoundTrip: true, postResolutionRoundTrip: true, stateEqual: true, recoveryReloadEqual },
      durationDays: (state.worldTime - initial.worldTime) / DAY }
    appendFileSync(rowsPath, `${JSON.stringify(row)}\n`, { flag: 'a' })
  }
  const after = fingerprint()
  expect(after).toEqual(before)
  const rowsOut = jsonlRows(rowsPath)
  const counts = Object.fromEntries(OUTCOMES.map(outcome => [outcome, rowsOut.filter(row => row.outcome === outcome).length]))
  const profiles = Object.fromEntries(PROFILES.map(profile => [profile, rowsOut.filter(row => row.profile === profile).length]))
  const outcomesBySeed = Object.fromEntries(SEEDS.map(seed => [seed, Object.fromEntries(OUTCOMES.map(outcome => [outcome,
    rowsOut.filter(row => row.seed === seed && row.outcome === outcome).length]))]))
  writeFileSync(join(OUT, 'resolution-summary.json'), `${JSON.stringify({ ...metadata, count: rowsOut.length, counts, profiles,
    outcomesBySeed,
    sourceFingerprint: before.sourceFingerprint, sourceManifest: before.source, helperHashes: before.helperHashes,
    sourceFingerprintPost: after.sourceFingerprint, sourceManifestPost: after.source, helperHashesPost: after.helperHashes,
    commitPost: after.commit,
    finishedAt: new Date().toISOString(), allRowsDurable: true }, null, 2)}\n`)
  expect(rowsOut).toHaveLength(SAMPLE_COUNT)
  expect(Object.values(counts).reduce((sum, count) => sum + Number(count), 0)).toBe(SAMPLE_COUNT)
  if (MODE === 'full') {
    expect(Object.values(counts).every(count => count > 0)).toBe(true)
    expect(Object.values(profiles).every(count => count > 0)).toBe(true)
  }
}

function runLongWorld() {
  if (!Number.isSafeInteger(LONG_YEARS) || LONG_YEARS < 1 || LONG_YEARS > 100) throw new Error('long-world horizon must be 1..100 years')
  mkdirSync(OUT, { recursive: true })
  const before = fingerprint(), path = join(OUT, 'long-world-checkpoints.jsonl')
  const annualPath = join(OUT, 'long-world-annual.jsonl')
  const targetYears = LONG_YEARS === 100 ? [10, 50, 100] : [LONG_YEARS]
  const manifestPath = join(OUT, 'long-world-run-manifest.json')
  const metadata = { runId: RUN_ID, mode: MODE, years: LONG_YEARS, seeds: SEEDS, targetYears,
    sourceFingerprint: before.sourceFingerprint, helperHashes: before.helperHashes, commit: before.commit }
  if (existsSync(manifestPath)) expect(JSON.parse(readFileSync(manifestPath, 'utf8'))).toEqual(metadata)
  else writeFileSync(manifestPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' })
  const checkpoints: Record<string, unknown>[] = []
  for (const seed of SEEDS) {
    const progressPath = join(OUT, `long-world-progress-${seed}.json`)
    let state = createGame(seed)
    const initialWorldTime = state.worldTime
    let completedYear = 0
    if (existsSync(progressPath)) {
      const progress = JSON.parse(readFileSync(progressPath, 'utf8')) as { seed: number; year: number; sourceFingerprint: string; save: string }
      expect(progress.seed).toBe(seed)
      expect(progress.sourceFingerprint).toBe(before.sourceFingerprint)
      expect(Number.isSafeInteger(progress.year) && progress.year >= 1 && progress.year <= LONG_YEARS).toBe(true)
      state = deserialize(progress.save).state
      expect(state.worldTime - initialWorldTime).toBe(progress.year * 120 * DAY)
      completedYear = progress.year
    }
    for (let year = completedYear + 1; year <= LONG_YEARS; year++) {
      simulate(state, 120 * DAY)
      if (state.worldTime - initialWorldTime !== year * 120 * DAY) throw new Error(`calendar mismatch seed=${seed} year=${year}`)
      completedYear = year
      if (targetYears.includes(year)) {
        const saved = serialize(state, 7703)
        const loaded = deserialize(saved).state
        expect(loaded).toEqual(state)
        const uninterrupted = structuredClone(state), resumed = structuredClone(loaded)
        simulate(uninterrupted, DAY); simulate(resumed, DAY)
        expect(resumed).toEqual(uninterrupted)
        const history = state.history.length + state.events.length
        const row = { seed, year, expectedDays: year * 120, elapsedDays: (state.worldTime - initialWorldTime) / DAY, worldTime: state.worldTime, population: state.npcs.filter(npc => npc.isAlive).length + state.characters.filter(c => c.isAlive).length,
          aliveNpcs: state.npcs.filter(npc => npc.isAlive).length,
          succession: { characters: state.characters.length, deadCharacters: state.characters.filter(character => !character.isAlive).length,
            activeCharacterId: state.activeCharacterId, activeCharacterExists: state.characters.some(character => character.id === state.activeCharacterId) },
          economy: { characterGold: state.characters.reduce((sum, character) => sum + character.gold, 0), food: state.settlement.food,
            prosperity: state.settlement.prosperity, populationCapacity: state.settlement.capacity },
          threat: structuredClone(state.threat), crisisSequence: state.regionalCrisis.sequence,
          crisisPhase: state.regionalCrisis.phase, lastOutcome: 'outcome' in state.regionalCrisis ? state.regionalCrisis.outcome : null,
          settlement: structuredClone(state.settlement), historyEvents: history, eventRows: state.events.length, historyRows: state.history.length,
          saveBytes: Buffer.byteLength(saved), idIntegrity: { nextNpcId: state.nextNpcId, uniqueActorIds: new Set([...state.npcs, ...state.characters].map(actor => actor.id)).size === state.npcs.length + state.characters.length,
            finiteWorldTime: Number.isFinite(state.worldTime), eventSequenceSafe: Number.isSafeInteger(state.eventSequence) },
          reloadEqual: true, reloadContinuationEqual: true, completedYear }
        const prior = jsonlRows(path)
        if (!prior.some(existing => existing.seed === seed && existing.year === year)) appendFileSync(path, `${JSON.stringify(row)}\n`)
        checkpoints.push(row)
      }
      const save = serialize(state, 7703)
      const annual = jsonlRows(annualPath)
      if (!annual.some(existing => existing.seed === seed && existing.year === year)) {
        const annualRow = { seed, year, elapsedDays: (state.worldTime - initialWorldTime) / DAY,
          population: state.npcs.filter(npc => npc.isAlive).length + state.characters.filter(character => character.isAlive).length,
          aliveNpcs: state.npcs.filter(npc => npc.isAlive).length, threat: structuredClone(state.threat),
          settlement: { food: state.settlement.food, prosperity: state.settlement.prosperity, safety: state.settlement.safety },
          characterGold: state.characters.reduce((sum, character) => sum + character.gold, 0),
          historyRows: state.history.length, eventRows: state.events.length, saveBytes: Buffer.byteLength(save),
          nextNpcId: state.nextNpcId, crisisSequence: state.regionalCrisis.sequence,
          activeCharacterId: state.activeCharacterId, actorIdIntegrity: new Set([...state.npcs, ...state.characters].map(actor => actor.id)).size === state.npcs.length + state.characters.length }
        appendFileSync(annualPath, `${JSON.stringify(annualRow)}\n`)
      }
      const progress = { seed, year, sourceFingerprint: before.sourceFingerprint, save }
      writeFileSync(`${progressPath}.tmp`, `${JSON.stringify(progress)}\n`)
      renameSync(`${progressPath}.tmp`, progressPath)
    }
  }
  expect(fingerprint()).toEqual(before)
  const durable = jsonlRows(path)
  const annual = jsonlRows(annualPath)
  expect(durable).toHaveLength(SEEDS.length * targetYears.length)
  expect(new Set(durable.map(row => `${row.seed}/${row.year}`)).size).toBe(durable.length)
  expect(durable.every(row => row.reloadEqual === true && row.reloadContinuationEqual === true)).toBe(true)
  expect(annual).toHaveLength(SEEDS.length * LONG_YEARS)
  expect(new Set(annual.map(row => `${row.seed}/${row.year}`)).size).toBe(annual.length)
  const after = fingerprint()
  writeFileSync(join(OUT, 'long-world-summary.json'), `${JSON.stringify({ seeds: SEEDS, targetYears, daysPerYear: 120,
    expectedDays: targetYears.map(year => year * 120), checkpoints: durable, sourceFingerprint: before.sourceFingerprint,
    sourceManifest: before.source, helperHashes: before.helperHashes, sourceFingerprintPost: after.sourceFingerprint,
    sourceManifestPost: after.source, helperHashesPost: after.helperHashes, commit: before.commit, commitPost: after.commit,
    annualRows: annual.length }, null, 2)}\n`)
}

it('runs released Phase 6-I canonical crisis simulation', () => {
  if (MODE === 'long') runLongWorld()
  else runResolutions()
}, 3_600_000)
