import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { advanceRegionalCrisisState, tryStartRegionalCrisis } from './regionalCrisis'
import { chooseSuccessor, createGame, die, movePlayer, player, simulate, walkTo } from './simulation'
import { random } from './random'
import { combatTurn, rest } from './actions'
import { homeRest } from './ownership'
import type { RegionalCrisisOutcome } from '../domain/crisis'
import { deserialize, serialize } from '../services/saveService'

const DAY = CONFIG.minutesPerDay

function activeCrisis(rngState = 1) {
  const state = createGame(7311)
  state.worldTime = DAY
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.threat.bossProgress = 50
  state.settlement.safety = 60
  expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)

  let crisis = state.regionalCrisis
  while (crisis.phase === 'warning' || crisis.phase === 'preparation') {
    state.worldTime = crisis.phaseEndsAt
    crisis = advanceRegionalCrisisState(crisis, state.worldTime)
    state.regionalCrisis = crisis
  }
  if (crisis.phase !== 'active') throw new Error('expected active crisis')
  state.rngState = rngState
  state.life.director.quietUntil = crisis.phaseEndsAt + 100 * DAY
  return state
}

function currentCrisis(state: ReturnType<typeof createGame>) {
  return state.regionalCrisis
}

describe('regional crisis resolution and recovery', () => {
  it('settles all four outcomes during canonical simulation with only the world RNG', () => {
    const counts: Record<RegionalCrisisOutcome, number> = {
      decisive_success: 0, costly_success: 0, setback: 0, local_defeat: 0,
    }
    const effects: Record<RegionalCrisisOutcome, {
      applied: { monsterPopulation: number; bossProgress: number; food: number; safety: number; prosperity: number }
      injuryDays: number; injuries: number
    }> = {
      decisive_success: { applied: { monsterPopulation: -12, bossProgress: -18, food: -4, safety: 4, prosperity: 2 }, injuryDays: 0, injuries: 0 },
      costly_success: { applied: { monsterPopulation: -6, bossProgress: -8, food: -8, safety: -2, prosperity: -2 }, injuryDays: 2, injuries: 1 },
      setback: { applied: { monsterPopulation: 4, bossProgress: 8, food: -8, safety: -5, prosperity: -4 }, injuryDays: 3, injuries: 2 },
      local_defeat: { applied: { monsterPopulation: 10, bossProgress: 16, food: -12, safety: -8, prosperity: -6 }, injuryDays: 5, injuries: 3 },
    }
    let successChance: number | null = null
    let historicalInjurySurvivedPruning = false
    for (let index = 0; index < 1024; index++) {
      const initialRng = Math.floor(index * 0x100000000 / 1024) >>> 0
      const state = activeCrisis(initialRng)
      const crisis = state.regionalCrisis
      if (crisis.phase !== 'active') throw new Error('expected active crisis')
      const expectedRng = { rngState: initialRng }
      random(expectedRng)

      simulate(state, crisis.phaseEndsAt - state.worldTime)

      if (state.regionalCrisis.phase === 'aftermath' || state.regionalCrisis.phase === 'cooldown') {
        const { outcome, resolutionSummary } = state.regionalCrisis
        expect(resolutionSummary).not.toBeNull()
        if (!resolutionSummary) throw new Error('expected a measured resolution summary')
        counts[outcome]++
        expect(resolutionSummary.applied).toEqual(effects[outcome].applied)
        expect(resolutionSummary.injuries).toHaveLength(effects[outcome].injuries)
        expect(resolutionSummary.injuries.every(injury => injury.durationDays === effects[outcome].injuryDays)).toBe(true)
        expect(resolutionSummary.recovery).toEqual({ status: 'not_required', dueAt: null, npcId: null })
        successChance ??= resolutionSummary.successChance
        expect(resolutionSummary.successChance).toBe(successChance)
        expect(resolutionSummary.pressureDays).toBeGreaterThanOrEqual(0)
        expect(resolutionSummary.pressureDays).toBeLessThanOrEqual(30)
        if (!historicalInjurySurvivedPruning && outcome === 'local_defeat' && resolutionSummary.injuries.length > 0) {
          const historical = structuredClone(state)
          const injuredId = resolutionSummary.injuries[0]!.npcId
          historical.npcs = historical.npcs.filter(npc => npc.id !== injuredId)
          delete historical.life.npcs[injuredId]
          expect(deserialize(serialize(historical)).state).toEqual(historical)
          historicalInjurySurvivedPruning = true
        }
      } else throw new Error(`expected a completed crisis, received ${state.regionalCrisis.phase}`)
      expect(state.rngState).toBe(expectedRng.rngState)
    }

    expect(successChance).not.toBeNull()
    if (successChance === null) throw new Error('expected a measured success chance')
    expect(counts.decisive_success / 1024).toBeCloseTo(.60 * successChance, 2)
    expect(counts.costly_success / 1024).toBeCloseTo(.40 * successChance, 2)
    expect(counts.setback / 1024).toBeCloseTo(.70 * (1 - successChance), 2)
    expect(counts.local_defeat / 1024).toBeCloseTo(.30 * (1 - successChance), 2)
    expect(historicalInjurySurvivedPruning).toBe(true)
  })

  it('provides one persisted adult relief immigrant after 30 days at zero population with a live Chief', () => {
    const state = activeCrisis(203)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('expected active crisis')

    die(state, player(state), '測試中的世界事故')
    state.npcs = []
    state.life.npcs = {}
    state.threat.bossAlive = true
    state.threat.monsterPopulation = 65
    state.threat.threatLevel = 3
    state.threat.campLevel = 3
    state.settlement.food = 0
    state.settlement.prosperity = 18
    state.settlement.safety = 25

    simulate(state, crisis.phaseEndsAt - state.worldTime)
    const resolutionAt = state.worldTime
    if (state.regionalCrisis.phase !== 'aftermath' || !state.regionalCrisis.resolutionSummary) {
      throw new Error('expected resolved crisis with a recovery record')
    }
    expect(state.regionalCrisis.resolutionSummary.recovery).toMatchObject({ status: 'pending', dueAt: resolutionAt + 30 * DAY, npcId: null })
    simulate(state, 10 * DAY)
    const reloadedBeforeDue = deserialize(serialize(state, 7000)).state
    simulate(state, 21 * DAY)
    simulate(reloadedBeforeDue, 21 * DAY)
    expect(reloadedBeforeDue).toEqual(state)

    expect(state.npcs.filter(npc => npc.isAlive && npc.age >= 15)).toHaveLength(1)
    expect(state.npcs.filter(npc => npc.isAlive)).toHaveLength(1)
    expect(state.settlement.prosperity).toBe(18)
    expect(state.threat.bossAlive).toBe(true)
    expect(resolutionAt).toBe(crisis.phaseEndsAt)
    const completed = currentCrisis(state)
    if (completed.phase !== 'cooldown' || !completed.resolutionSummary) {
      throw new Error('expected recovery state to persist through cooldown')
    }
    const reliefId = completed.resolutionSummary.recovery.npcId
    expect(completed.resolutionSummary.recovery.status).toBe('granted')
    expect(state.npcs[0]?.id).toBe(reliefId)
    expect(state.events.filter(event => event.type === 'npc.immigrated')).toHaveLength(1)
    const prunedRelief = structuredClone(state)
    prunedRelief.npcs = prunedRelief.npcs.filter(npc => npc.id !== reliefId)
    delete prunedRelief.life.npcs[reliefId!]
    expect(deserialize(serialize(prunedRelief)).state).toEqual(prunedRelief)
    const afterReliefReload = deserialize(serialize(state, 7001)).state
    simulate(afterReliefReload, 10 * DAY)
    expect(afterReliefReload.npcs.filter(npc => npc.isAlive)).toHaveLength(1)
    expect(afterReliefReload.events.filter(event => event.type === 'npc.immigrated')).toHaveLength(1)
    expect(chooseSuccessor(afterReliefReload, reliefId!)).toBe(true)
    expect(movePlayer(afterReliefReload, 0, 1)).toBe(true)
  })

  it('keeps relief pending until its due date, then cancels if population has recovered', () => {
    const state = activeCrisis(257)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('expected active crisis')
    die(state, player(state), '測試中的世界事故')
    state.npcs = []
    state.life.npcs = {}
    state.threat.bossAlive = true
    state.threat.monsterPopulation = 65
    state.threat.threatLevel = 3
    state.threat.campLevel = 3
    state.settlement.food = 0
    state.settlement.prosperity = 18
    state.settlement.safety = 25
    simulate(state, crisis.phaseEndsAt - state.worldTime)

    simulate(state, 10 * DAY)
    if ((state.regionalCrisis.phase !== 'aftermath' && state.regionalCrisis.phase !== 'cooldown')
      || !state.regionalCrisis.resolutionSummary) throw new Error('expected a pending recovery record')
    expect(state.regionalCrisis.resolutionSummary.recovery.status).toBe('pending')
    const dueAt = state.regionalCrisis.resolutionSummary.recovery.dueAt
    if (dueAt === null) throw new Error('expected recovery due date')
    simulate(state, dueAt - 1 - state.worldTime)
    const resident = player(state)
    resident.isAlive = true
    resident.status = 'idle'
    resident.deathYear = null
    resident.deathCause = null
    simulate(state, 1)

    if (state.regionalCrisis.phase !== 'cooldown' || !state.regionalCrisis.resolutionSummary) {
      throw new Error('expected a resolved recovery record')
    }
    expect(state.regionalCrisis.resolutionSummary.recovery).toEqual({ status: 'cancelled', dueAt, npcId: null })
    expect(state.events.filter(event => event.type === 'npc.immigrated')).toHaveLength(0)
  })

  it('rejects an event-capacity-exhausted resolution boundary before changing time or state', () => {
    const state = activeCrisis(307)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('expected active crisis')
    state.worldTime = crisis.phaseEndsAt - 1
    state.eventSequence = Number.MAX_SAFE_INTEGER - 2
    const before = structuredClone(state)

    expect(() => simulate(state, 1)).toThrow()
    expect(state).toEqual(before)
  })

  it('keeps paid rest atomic when resolution capacity rejects its daily boundary', () => {
    const state = activeCrisis(307)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('expected active crisis')
    state.worldTime = crisis.phaseEndsAt - 8 * 60
    player(state).position = { x: 7, y: 10 }
    player(state).currentRegion = 'village'
    player(state).gold = 20
    state.eventSequence = Number.MAX_SAFE_INTEGER - 2
    const before = structuredClone(state)

    expect(() => rest(state, 'inn')).toThrow()
    expect(state).toEqual(before)
  })

  it('keeps a lethal combat turn and its rewards atomic when resolution capacity rejects', () => {
    const state = activeCrisis(331)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('expected active crisis')
    state.worldTime = crisis.phaseEndsAt - 1
    state.combat = { monsterId: 'goblin', hp: 1, maxHp: 42, attack: 10, defense: 2, exp: 35, gold: 18, elite: false, dungeon: false }
    player(state).status = 'combat'
    state.eventSequence = Number.MAX_SAFE_INTEGER - 2
    const before = structuredClone(state)

    expect(() => combatTurn(state, 'attack')).toThrow()
    expect(state).toEqual(before)
  })

  it('keeps a composite walk atomic when a later step reaches a rejected resolution boundary', () => {
    const state = activeCrisis(353)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('expected active crisis')
    state.worldTime = crisis.phaseEndsAt - 6
    state.eventSequence = Number.MAX_SAFE_INTEGER - 2
    const before = structuredClone(state)

    expect(() => walkTo(state, { x: 9, y: 9 })).toThrow()
    expect(state).toEqual(before)
  })

  it('keeps home rest atomic when its trailing event would exhaust resolution capacity', () => {
    const state = activeCrisis(379)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('expected active crisis')
    die(state, player(state), '測試中的世界事故')
    state.npcs = []
    state.life.npcs = {}
    state.threat.bossAlive = true
    state.threat.monsterPopulation = 65
    state.threat.threatLevel = 3
    state.threat.campLevel = 3
    state.settlement.food = 0
    state.settlement.prosperity = 18
    state.settlement.safety = 25
    simulate(state, crisis.phaseEndsAt - state.worldTime)
    const resolved = state.regionalCrisis
    if ((resolved.phase !== 'aftermath' && resolved.phase !== 'cooldown') || !resolved.resolutionSummary) {
      throw new Error('expected a pending recovery record')
    }
    const dueAt = resolved.resolutionSummary.recovery.dueAt
    if (dueAt === null) throw new Error('expected recovery due date')
    const character = player(state)
    state.life.properties.push({ id: `property:home:${character.id}`, kind: 'home', ownerId: character.id,
      acquiredAt: state.worldTime, position: { x: 7, y: 10 },
      storage: { wood: 0, stone: 0, iron: 0, food: 0, material: 0, potion: 0, sword: 0, armor: 0 },
      foodSupplied: 0, suppliedDay: Math.floor(state.worldTime / DAY), suppliedToday: 0 })
    character.position = { x: 7, y: 9 }
    state.worldTime = dueAt - 8 * 60
    character.isAlive = true
    character.status = 'idle'
    character.deathYear = null
    character.deathCause = null
    state.eventSequence = Number.MAX_SAFE_INTEGER - 1
    const before = structuredClone(state)

    expect(() => homeRest(state)).toThrow()
    expect(state).toEqual(before)
  })

  it('rejects a resolution whose future cooldown would exceed the safe world-time range atomically', () => {
    const state = activeCrisis(401)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('expected active crisis')
    const resolutionAt = Math.floor((Number.MAX_SAFE_INTEGER - 10 * DAY) / DAY) * DAY
    state.worldTime = resolutionAt - 1
    state.regionalCrisis = { ...crisis, phaseEndsAt: resolutionAt }
    const before = structuredClone(state)

    expect(() => simulate(state, 1)).toThrow()
    expect(state).toEqual(before)
  })

  it('preflights a legacy resolution-phase save before paid action costs', () => {
    const state = activeCrisis(419)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('expected active crisis')
    const { phaseEndsAt, ...instance } = crisis
    state.regionalCrisis = { ...instance, phase: 'resolution', phaseStartedAt: phaseEndsAt }
    state.worldTime = phaseEndsAt + DAY - 8 * 60
    player(state).position = { x: 7, y: 10 }
    player(state).currentRegion = 'village'
    player(state).gold = 20
    state.eventSequence = Number.MAX_SAFE_INTEGER - 2
    const before = structuredClone(state)

    expect(() => rest(state, 'inn')).toThrow()
    expect(state).toEqual(before)
  })

  it('keeps paid rest atomic when its resulting world time is outside the safe integer range', () => {
    const state = createGame(431)
    player(state).position = { x: 7, y: 10 }
    player(state).currentRegion = 'village'
    player(state).gold = 20
    state.worldTime = Number.MAX_SAFE_INTEGER - 100
    const before = structuredClone(state)

    expect(() => rest(state, 'inn')).toThrow()
    expect(state).toEqual(before)
  })

  it.each(['eventSequence', 'nextNpcId'] as const)('rejects a due relief immigrant when %s has no safe capacity', counter => {
    const state = activeCrisis(503)
    const crisis = state.regionalCrisis
    if (crisis.phase !== 'active') throw new Error('expected active crisis')
    die(state, player(state), '測試中的世界事故')
    state.npcs = []
    state.life.npcs = {}
    state.threat.bossAlive = true
    state.threat.monsterPopulation = 65
    state.threat.threatLevel = 3
    state.threat.campLevel = 3
    state.settlement.food = 0
    state.settlement.prosperity = 18
    state.settlement.safety = 25

    simulate(state, crisis.phaseEndsAt - state.worldTime)
    const resolved = state.regionalCrisis
    if (resolved.phase !== 'aftermath' || !resolved.resolutionSummary) throw new Error('expected a pending relief record')
    simulate(state, 10 * DAY)
    const summary = state.regionalCrisis
    if (summary.phase !== 'cooldown' || !summary.resolutionSummary) throw new Error('expected cooldown before relief')
    expect(summary.resolutionSummary.recovery.status).toBe('pending')
    const dueAt = summary.resolutionSummary.recovery.dueAt
    if (dueAt === null) throw new Error('expected relief due date')
    state.worldTime = dueAt - 1
    if (counter === 'eventSequence') state.eventSequence = Number.MAX_SAFE_INTEGER - 1
    else state.nextNpcId = Number.MAX_SAFE_INTEGER - 1
    const before = structuredClone(state)

    expect(() => simulate(state, 1)).toThrow()
    expect(state).toEqual(before)
  })
})
