import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { completeRegionalCrisisTransition, advanceRegionalCrisisState, tryStartRegionalCrisis } from './regionalCrisis'
import { createGame } from './simulation'
import { deriveCivilDefense } from './civilDefense'

function warningState(seed = 6101) {
  const state = createGame(seed)
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.settlement.safety = 60
  expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
  if (state.regionalCrisis.phase !== 'warning') throw new Error('expected a warning crisis')
  return { state, crisis: state.regionalCrisis }
}

describe('civil defense derivation', () => {
  it('returns bounded deterministic readiness without mutating world state or RNG', () => {
    const { state, crisis } = warningState()
    const before = structuredClone(state)

    const first = deriveCivilDefense(state, crisis)
    const second = deriveCivilDefense(state, crisis)

    expect(first).not.toBeNull()
    if (!first) return
    expect(second).toEqual(first)
    expect(state).toEqual(before)
    expect(Number.isFinite(first.readiness)).toBe(true)
    expect(first.readiness).toBeGreaterThanOrEqual(0)
    expect(first.readiness).toBeLessThanOrEqual(100)
    expect(Number.isFinite(first.threatDemand)).toBe(true)
    expect(first.threatDemand).toBeGreaterThanOrEqual(0)
    expect(first.threatDemand).toBeLessThanOrEqual(100)
    expect(Number.isFinite(first.successChance)).toBe(true)
    expect(first.successChance).toBeGreaterThanOrEqual(0.1)
    expect(first.successChance).toBeLessThanOrEqual(0.9)
    expect(first.factors.every(factor => Number.isFinite(factor.points) && Number.isFinite(factor.observed))).toBe(true)
    expect(first.needs.every(need => Number.isFinite(need.shortage))).toBe(true)
  })

  it('counts only available local guards and mercenaries, and caps gear to their slots', () => {
    const { state, crisis } = warningState()
    state.party = []
    state.npcs = state.npcs.slice(0, 7)

    const guard = state.npcs[0]!
    guard.job = 'guard'
    guard.isAlive = true
    guard.age = 20
    guard.injuredUntil = state.worldTime
    guard.equipment.weapon = 'sword'

    const mercenary = state.npcs[1]!
    mercenary.job = 'mercenary'
    mercenary.isAlive = true
    mercenary.age = 20
    mercenary.injuredUntil = state.worldTime
    mercenary.equipment.armor = 'armor'

    const deadGuard = state.npcs[2]!
    deadGuard.job = 'guard'
    deadGuard.isAlive = false
    deadGuard.equipment.weapon = 'sword'
    const childGuard = state.npcs[3]!
    childGuard.job = 'guard'
    childGuard.age = 14
    childGuard.equipment.armor = 'armor'
    const retiredGuard = state.npcs[4]!
    retiredGuard.job = 'guard'
    state.life.npcs[retiredGuard.id]!.career = 'retired'
    retiredGuard.equipment.weapon = 'sword'
    const injuredGuard = state.npcs[5]!
    injuredGuard.job = 'guard'
    injuredGuard.injuredUntil = state.worldTime + 1
    injuredGuard.equipment.armor = 'armor'
    const partyGuard = state.npcs[6]!
    partyGuard.job = 'guard'
    partyGuard.equipment.weapon = 'sword'
    state.party = [{ npcId: partyGuard.id, hireCost: 0, dailyWage: 0,
      contractEnd: state.worldTime + CONFIG.minutesPerDay, archetype: 'fighter' }]

    const result = deriveCivilDefense(state, crisis)

    expect(result?.availableDefenders).toBe(2)
    expect(result?.targetDefenders).toBe(6)
    expect(result?.equippedDefenderSlots).toBe(2)
    expect(result?.capacity.equipmentSlots).toBe(4)
    expect(result?.needs.find(need => need.id === 'defenders')).toEqual({
      id: 'defenders', current: 2, required: 6, shortage: 4,
    })
  })

  it('projects food from the simulation daily net across each remaining crisis phase', () => {
    const { state, crisis } = warningState()
    state.npcs = state.npcs.slice(0, 5)
    state.npcs[0]!.job = 'farmer'
    state.npcs[1]!.job = 'farmer'
    state.npcs[2]!.job = 'guard'
    state.npcs[3]!.job = 'mercenary'
    state.npcs[4]!.job = 'farmer'
    state.npcs[4]!.isAlive = false
    state.party = [{ npcId: state.npcs[1]!.id, hireCost: 0, dailyWage: 0,
      contractEnd: state.worldTime + CONFIG.minutesPerDay, archetype: 'fighter' }]
    state.threat.bossAlive = true
    state.settlement.food = 30

    const warning = deriveCivilDefense(state, crisis)!
    expect(warning.timeline).toEqual({
      remainingWarningDays: 2,
      remainingPreparationDays: 5,
      remainingActiveDays: 2,
      foodForecastDays: 9,
      defenseWindowDays: 7,
    })
    expect(warning.food.dailyNet).toBeCloseTo(1.6)
    expect(warning.food.projectedAtResolution).toBeCloseTo(44.4)
    expect(warning.food.shortage).toBeCloseTo(10.6)
    expect(warning.food.coverage).toBeCloseTo(44.4 / 55)

    const preparation = advanceRegionalCrisisState(crisis, crisis.phaseEndsAt)
    if (preparation.phase !== 'preparation') throw new Error('expected preparation phase')
    state.worldTime = preparation.phaseStartedAt
    expect(deriveCivilDefense(state, preparation)?.timeline).toEqual({
      remainingWarningDays: 0,
      remainingPreparationDays: 5,
      remainingActiveDays: 2,
      foodForecastDays: 7,
      defenseWindowDays: 7,
    })

    const active = advanceRegionalCrisisState(preparation, preparation.phaseEndsAt)
    if (active.phase !== 'active') throw new Error('expected active phase')
    state.worldTime = active.phaseStartedAt
    expect(deriveCivilDefense(state, active)?.timeline).toEqual({
      remainingWarningDays: 0,
      remainingPreparationDays: 0,
      remainingActiveDays: 2,
      foodForecastDays: 2,
      defenseWindowDays: 2,
    })

    const resolution = advanceRegionalCrisisState(active, active.phaseEndsAt)
    if (resolution.phase !== 'resolution') throw new Error('expected resolution phase')
    state.worldTime = resolution.phaseStartedAt
    expect(deriveCivilDefense(state, resolution)?.timeline).toEqual({
      remainingWarningDays: 0,
      remainingPreparationDays: 0,
      remainingActiveDays: 0,
      foodForecastDays: 0,
      defenseWindowDays: 0,
    })
    expect(deriveCivilDefense(state, resolution)?.food.projectedAtResolution).toBe(state.settlement.food)
  })

  it('retains the trigger-time threat floor after ordinary threat reduction', () => {
    const { state, crisis } = warningState()
    state.threat.threatLevel = 1
    state.threat.monsterPopulation = 0
    state.threat.bossAlive = false

    const hunted = deriveCivilDefense(state, crisis)!
    expect(hunted.threatTrace.selected).toBe('cause')
    expect(hunted.threatDemand).toBe(hunted.threatTrace.causeFloor)
    expect(hunted.threatDemand).toBeGreaterThan(hunted.threatTrace.currentPressure)

    state.threat.threatLevel = 3
    state.threat.monsterPopulation = 100
    state.threat.bossAlive = true
    const escalated = deriveCivilDefense(state, crisis)!
    expect(escalated.threatTrace.selected).toBe('current')
    expect(escalated.threatDemand).toBe(escalated.threatTrace.currentPressure)
    expect(escalated.threatDemand).toBeGreaterThan(hunted.threatDemand)
  })

  it('allows a naturally prepared town to outperform an underprepared hamlet without player aid', () => {
    const prepared = warningState(6102)
    prepared.state.npcs = prepared.state.npcs.slice(0, 7)
    prepared.state.party = []
    for (const npc of prepared.state.npcs) {
      npc.job = 'guard'
      npc.isAlive = true
      npc.age = 30
      npc.injuredUntil = prepared.state.worldTime
      npc.skills.combat.level = 10
      npc.equipment.weapon = 'sword'
      npc.equipment.armor = 'armor'
    }
    prepared.state.settlement.stage = 'town'
    prepared.state.settlement.food = 100
    prepared.state.settlement.safety = 100
    prepared.state.settlement.prosperity = 100
    prepared.state.settlement.infrastructure = 100
    const ready = deriveCivilDefense(prepared.state, prepared.crisis)!

    const underprepared = warningState(6103)
    underprepared.state.npcs = underprepared.state.npcs.slice(0, 7)
    underprepared.state.party = []
    for (const npc of underprepared.state.npcs) {
      npc.job = 'woodcutter'
      npc.skills.combat.level = 1
      npc.equipment.weapon = null
      npc.equipment.armor = null
    }
    underprepared.state.threat.threatLevel = 3
    underprepared.state.threat.monsterPopulation = 100
    underprepared.state.threat.bossAlive = true
    underprepared.state.settlement.stage = 'hamlet'
    underprepared.state.settlement.food = 0
    underprepared.state.settlement.safety = 0
    underprepared.state.settlement.prosperity = 0
    underprepared.state.settlement.infrastructure = 0
    const unready = deriveCivilDefense(underprepared.state, underprepared.crisis)!

    expect(ready.availableDefenders).toBe(7)
    expect(ready.readiness).toBeGreaterThan(90)
    expect(ready.successChance).toBe(0.9)
    expect(unready.availableDefenders).toBe(0)
    expect(unready.readiness).toBeLessThan(5)
    expect(unready.successChance).toBe(0.1)
    expect(ready.successChance - unready.successChance).toBeGreaterThanOrEqual(0.8)
    expect(ready.factors.reduce((total, item) => total + item.maximum, 0)).toBe(100)
  })

  it('does not make player equipment or combat stats a readiness source', () => {
    const { state, crisis } = warningState()
    const baseline = deriveCivilDefense(state, crisis)
    const player = state.characters.find(character => character.id === state.activeCharacterId)!
    player.skills.combat.level = 10
    player.equipment.weapon = 'sword'
    player.equipment.armor = 'armor'
    expect(deriveCivilDefense(state, crisis)).toEqual(baseline)
  })

  it('returns no model for dormant or completed aftermath crises', () => {
    const { state, crisis } = warningState()
    expect(deriveCivilDefense(state, { phase: 'dormant', sequence: 0, cooldownUntil: 0, lastResolvedAt: null })).toBeNull()
    const resolution = { ...crisis, phase: 'resolution' as const, phaseStartedAt: crisis.phaseEndsAt }
    const aftermath = completeRegionalCrisisTransition(resolution, 'costly_success', resolution.phaseStartedAt)
    expect(aftermath.phase).toBe('aftermath')
    expect(deriveCivilDefense(state, aftermath)).toBeNull()
  })
})
