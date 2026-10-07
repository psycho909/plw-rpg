import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { recordRegionalChiefDefeat, tryStartRegionalCrisis, advanceRegionalCrisisState, completeRegionalCrisisTransition } from './regionalCrisis'
import { createGame, die, player, simulate, chooseSuccessor } from './simulation'
import { random } from './random'
import { deserialize, serialize } from '../services/saveService'

function eligibleState(seed = 42) {
  const state = createGame(seed)
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.settlement.safety = 60
  state.rngState = 1972
  return state
}

describe('regional crisis state', () => {
  it('starts each new world dormant with a zeroed deterministic sequence', () => {
    expect(createGame(42).regionalCrisis).toEqual({
      phase: 'dormant',
      sequence: 0,
      cooldownUntil: 0,
      lastResolvedAt: null,
    })
  })

  it('starts one warning after an eligible daily threat roll succeeds', () => {
    const state = createGame(42)
    state.threat.monsterPopulation = 30
    state.threat.threatLevel = 2
    state.threat.campLevel = 2
    state.threat.growthRate = 1
    state.settlement.safety = 60
    state.rngState = 1972

    state.worldTime = CONFIG.minutesPerDay - 480
    simulate(state, CONFIG.minutesPerDay - state.worldTime % CONFIG.minutesPerDay)

    expect(state.regionalCrisis).toMatchObject({ phase: 'warning', sequence: 1, type: 'goblin_regional' })
    expect(state.history.filter(event => event.type === 'regional-crisis.warning')).toHaveLength(1)
  })

  it('does not consume shared RNG when a daily crisis trigger is ineligible', () => {
    const state = createGame(71)
    const before = state.rngState
    expect(tryStartRegionalCrisis(state)).toBe(false)
    expect(state.rngState).toBe(before)
  })

  it('does not draw or start a crisis when its warning event cannot receive a safe id', () => {
    const state = eligibleState()
    state.eventSequence = Number.MAX_SAFE_INTEGER - 1
    const before = state.rngState
    expect(tryStartRegionalCrisis(state)).toBe(false)
    expect(state.rngState).toBe(before)
    expect(state.regionalCrisis.phase).toBe('dormant')
  })

  it('uses exactly one shared RNG draw for an eligible trigger', () => {
    const state = eligibleState()
    const expected = structuredClone(state)
    random(expected)

    expect(tryStartRegionalCrisis(state)).toBe(true)
    expect(state.rngState).toBe(expected.rngState)
    expect(state.regionalCrisis).toMatchObject({ phase: 'warning', sequence: 1, id: 'goblin-regional:0000002a:1' })
  })

  it('advances through fixed phases once and waits at resolution for a real outcome', () => {
    const state = eligibleState()
    expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
    const warning = state.regionalCrisis
    if (warning.phase !== 'warning') throw new Error('expected warning')

    const preparation = advanceRegionalCrisisState(warning, warning.phaseEndsAt)
    expect(preparation.phase).toBe('preparation')
    if (preparation.phase !== 'preparation') throw new Error('expected preparation')
    const active = advanceRegionalCrisisState(preparation, preparation.phaseEndsAt)
    expect(active.phase).toBe('active')
    if (active.phase !== 'active') throw new Error('expected active')
    const resolution = advanceRegionalCrisisState(active, active.phaseEndsAt)
    expect(resolution.phase).toBe('resolution')
    if (resolution.phase !== 'resolution') throw new Error('expected resolution')
    expect(advanceRegionalCrisisState(resolution, resolution.phaseStartedAt)).toBe(resolution)
    const summary = {
      readiness: 60, threatDemand: 60, successChance: 0.5, pressureDays: 17,
      applied: { monsterPopulation: -6, bossProgress: -8, food: -8, safety: -2, prosperity: -2 },
      injuries: [], recovery: { status: 'not_required' as const, dueAt: null, npcId: null },
    }
    const aftermath = completeRegionalCrisisTransition(resolution, 'costly_success', resolution.phaseStartedAt, summary)
    expect(aftermath).toMatchObject({ phase: 'aftermath', outcome: 'costly_success' })
    if (aftermath.phase !== 'aftermath') throw new Error('expected aftermath')
    expect(completeRegionalCrisisTransition(aftermath, 'decisive_success', resolution.phaseStartedAt)).toBe(aftermath)
    const cooldown = advanceRegionalCrisisState(aftermath, aftermath.phaseEndsAt)
    expect(cooldown).toMatchObject({ phase: 'cooldown', cooldownUntil: aftermath.phaseEndsAt + (360 + 2 * 30 + 30 + 17) * CONFIG.minutesPerDay })
    if (cooldown.phase !== 'cooldown') throw new Error('expected cooldown')
    expect(advanceRegionalCrisisState(cooldown, cooldown.cooldownUntil)).toMatchObject({
      phase: 'dormant', sequence: 1, lastResolvedAt: resolution.phaseStartedAt,
    })
  })

  it('round trips every crisis phase and keeps chunked and reloaded simulation deterministic', () => {
    const chunked = eligibleState()
    chunked.worldTime = CONFIG.minutesPerDay
    const hourly = structuredClone(chunked)
    expect(tryStartRegionalCrisis(chunked, () => 0)).toBe(true)
    expect(tryStartRegionalCrisis(hourly, () => 0)).toBe(true)
    const assertReload = () => expect(deserialize(serialize(chunked)).state).toEqual(chunked)
    assertReload()

    simulate(chunked, 2 * CONFIG.minutesPerDay)
    for (let index = 0; index < 2 * 24; index++) simulate(hourly, 60)
    expect(chunked.regionalCrisis.phase).toBe('preparation')
    expect(hourly).toEqual(chunked)
    assertReload()
    simulate(chunked, 5 * CONFIG.minutesPerDay)
    for (let index = 0; index < 5 * 24; index++) simulate(hourly, 60)
    expect(chunked.regionalCrisis.phase).toBe('active')
    expect(hourly).toEqual(chunked)
    assertReload()
    const active = chunked.regionalCrisis
    if (active.phase !== 'active') throw new Error('expected active crisis')
    const resolutionProbe = structuredClone(chunked)
    resolutionProbe.worldTime = active.phaseEndsAt
    resolutionProbe.regionalCrisis = advanceRegionalCrisisState(active, active.phaseEndsAt)
    expect(resolutionProbe.regionalCrisis.phase).toBe('resolution')
    expect(deserialize(serialize(resolutionProbe)).state).toEqual(resolutionProbe)

    simulate(chunked, 2 * CONFIG.minutesPerDay)
    for (let index = 0; index < 2 * 24; index++) simulate(hourly, 60)
    expect(chunked.regionalCrisis.phase).toBe('aftermath')
    expect(hourly).toEqual(chunked)
    assertReload()

    const aftermath = chunked.regionalCrisis
    if (aftermath.phase !== 'aftermath') throw new Error('expected aftermath')
    const cooldown = advanceRegionalCrisisState(aftermath, aftermath.phaseEndsAt)
    chunked.worldTime = aftermath.phaseEndsAt
    chunked.regionalCrisis = cooldown
    assertReload()
    if (cooldown.phase !== 'cooldown') throw new Error('expected cooldown')
    const dormant = advanceRegionalCrisisState(cooldown, cooldown.cooldownUntil)
    chunked.worldTime = cooldown.cooldownUntil
    chunked.regionalCrisis = dormant
    assertReload()

    const loaded = deserialize(serialize(chunked)).state
    simulate(chunked, 3 * CONFIG.minutesPerDay)
    simulate(loaded, 3 * CONFIG.minutesPerDay)
    expect(loaded).toEqual(chunked)
  })

  it('keeps crisis state across player death and succession', () => {
    const state = eligibleState()
    expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
    const before = structuredClone(state.regionalCrisis)
    const successor = state.npcs.find(npc => npc.isAlive && npc.age >= 15)!
    die(state, player(state), '測試中的世界事故')
    expect(chooseSuccessor(state, successor.id)).toBe(true)
    expect(state.regionalCrisis).toEqual(before)
  })

  it('accepts a Chief record for a valid historical NPC id after the NPC leaves the world', () => {
    const state = eligibleState()
    expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
    const npc = state.npcs[0]!
    expect(recordRegionalChiefDefeat(state, 'npc', npc.id)).toBe(true)
    state.npcs = state.npcs.filter(candidate => candidate.id !== npc.id)
    delete state.life.npcs[npc.id]
    expect(deserialize(serialize(state)).state.regionalCrisis).toEqual(state.regionalCrisis)
  })
})
