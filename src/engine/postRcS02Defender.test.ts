import { expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import type { ItemInstance } from '../domain/reward'
import type { RegionalCrisisState } from '../domain/crisis'
import { rolledItemStats } from './gearStats'
import { contributeCrisisEquipment } from './crisisContributions'
import { civilDefenseGearEffect, deriveCivilDefense } from './civilDefense'
import { advanceRegionalCrisisState, tryStartRegionalCrisis } from './regionalCrisis'
import { chooseSuccessor, createGame, die, player, simulate } from './simulation'
import { deserialize, serialize } from '../services/saveService'

function item(instanceId: string, ownerId: string, baseId: ItemInstance['baseId']): ItemInstance {
  return { instanceId, ownerId, baseId, level: 1, material: null, rarity: 'common',
    rolledStats: rolledItemStats(baseId, 1, []), affixes: [], specialTrait: null, provenance: null, craftProvenance: null }
}

function crisisFixture(severity: 1 | 2 | 3 = 1) {
  const state = createGame(8216 + severity)
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = severity
  state.threat.campLevel = Math.max(2, severity)
  state.settlement.safety = 60
  expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
  if (state.regionalCrisis.phase !== 'warning') throw new Error('expected warning crisis')
  const crisis = state.regionalCrisis
  const character = player(state)
  character.position = { x: 8, y: 10 }
  character.currentRegion = 'village'
  state.party = []
  for (const npc of state.npcs) {
    npc.job = 'woodcutter'
    state.life.npcs[npc.id]!.careerJob = 'woodcutter'
  }
  for (const npc of state.npcs.slice(0, 9)) {
    npc.job = 'guard'
    npc.age = 30
    npc.isAlive = true
    npc.injuredUntil = state.worldTime
    npc.equipment.weapon = null
    npc.equipment.armor = null
    state.life.npcs[npc.id]!.career = 'worker'
    state.life.npcs[npc.id]!.careerJob = 'guard'
  }
  state.reward.nextInstanceId = 1000
  return { state, crisis, character, defenders: state.npcs.slice(0, 9) }
}

function equip(state: ReturnType<typeof createGame>, crisisId: string, defenderId: string, id: string) {
  const gear = item(id, player(state).id, 'shortSword')
  state.reward.instances.push(gear)
  expect(contributeCrisisEquipment(state, crisisId, defenderId, id)).toBe('')
  return gear
}

function crafted(instanceId: string, ownerId: string, creatorId: string): ItemInstance {
  // Controlled legal-shaped fixture: provenance mirrors a starterSpear output from the existing crafting tests.
  const affixes: ItemInstance['affixes'] = [{ id: 'piercing', tier: 1, value: 1 }]
  return { instanceId, ownerId, baseId: 'spear', level: 2, material: null, rarity: 'uncommon',
    rolledStats: rolledItemStats('spear', 2, affixes), affixes, specialTrait: null, provenance: null,
    craftProvenance: { recipeId: 'starterSpear', createdBy: creatorId, createdAt: 0, influenceMaterial: null, masterpiece: false } }
}

function currentCrisis(state: ReturnType<typeof createGame>): RegionalCrisisState {
  return state.regionalCrisis
}

it('records factual S-02 allocation behavior when an equipped defender dies', () => {
  const state = createGame(8216)
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 3
  state.threat.campLevel = 3
  state.settlement.safety = 60
  expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
  if (state.regionalCrisis.phase !== 'warning') throw new Error('expected warning crisis')
  const crisis = state.regionalCrisis
  const character = player(state)
  character.position = { x: 8, y: 10 }
  character.currentRegion = 'village'

  // Controlled fixture: create nine eligible guards; eight fill the modeled slots and one can replace a casualty.
  const defenders = state.npcs.slice(0, 9)
  expect(defenders).toHaveLength(9)
  state.party = []
  for (const npc of state.npcs) {
    npc.job = 'woodcutter'
    state.life.npcs[npc.id]!.careerJob = 'woodcutter'
  }
  for (const defender of defenders) {
    defender.job = 'guard'
    defender.age = 30
    defender.isAlive = true
    defender.injuredUntil = state.worldTime
    defender.equipment.weapon = null
    defender.equipment.armor = null
    state.life.npcs[defender.id]!.career = 'worker'
    state.life.npcs[defender.id]!.careerJob = 'guard'
  }

  const equippedDefenders = defenders.slice(0, 8)
  const allocations = equippedDefenders.flatMap((defender, index) => [
    item(`item-${index * 2 + 1}`, character.id, 'shortSword'),
    item(`item-${index * 2 + 2}`, character.id, 'hideArmor'),
  ])
  state.reward.instances.push(...allocations)
  state.reward.nextInstanceId = allocations.length + 1
  for (let index = 0; index < allocations.length; index++) {
    const defender = equippedDefenders[Math.floor(index / 2)]!
    expect(contributeCrisisEquipment(state, crisis.id, defender.id, allocations[index]!.instanceId)).toBe('')
  }

  const beforeLoss = deriveCivilDefense(state, crisis)!
  const priorEffect = beforeLoss.factors.find(factor => factor.id === 'equipment')!.observed
  const priorUsedSlots = beforeLoss.equippedDefenderSlots
  const priorAllocationCount = crisis.contributions.equipment.length
  expect(priorUsedSlots).toBe(16)
  expect(priorAllocationCount).toBe(16)
  expect(beforeLoss.targetDefenders).toBe(8)

  die(state, equippedDefenders[0]!, '測試中的危機傷亡')

  const afterLoss = deriveCivilDefense(state, crisis)!
  const remainingAllocatableByLedger = 16 - crisis.contributions.equipment.length
  const casualtyEffect = crisis.contributions.equipment
    .filter(allocation => allocation.defenderNpcId === equippedDefenders[0]!.id)
    .reduce((total, allocation) => total + civilDefenseGearEffect(
      allocation.sourceItem.rolledStats, allocation.slot, equippedDefenders[0]!.skills.combat.level), 0)
  state.reward.instances.push(item('item-17', character.id, 'shortSword'))
  state.reward.nextInstanceId = 18
  const snapshot = structuredClone(state)

  expect(state.regionalCrisis.contributions.equipment).toHaveLength(16)
  expect(afterLoss.availableDefenders).toBe(8)
  expect(afterLoss.equippedDefenderSlots).toBe(14)
  expect(afterLoss.needs.find(need => need.id === 'equipment')?.shortage).toBe(2)
  expect(priorEffect - afterLoss.factors.find(factor => factor.id === 'equipment')!.observed).toBeCloseTo(casualtyEffect)
  expect(remainingAllocatableByLedger).toBe(0)
  expect(contributeCrisisEquipment(state, crisis.id, defenders[8]!.id, 'item-17')).toBe('目前沒有可用的防衛裝備欄位。')
  expect(state).toEqual(snapshot)

  const loaded = deserialize(serialize(state, 8216)).state
  expect(loaded).toEqual(state)
  if (loaded.regionalCrisis.phase === 'dormant') throw new Error('expected persisted crisis allocation ledger')
  expect(loaded.regionalCrisis.contributions.equipment).toHaveLength(16)
  expect(loaded.regionalCrisis.contributions.equipment.filter(entry => entry.defenderNpcId === equippedDefenders[0]!.id))
    .toHaveLength(2)
  expect(casualtyEffect).toBeGreaterThan(0)
})

it('characterizes living, injured, recovering, and lower-severity replacement defenders', () => {
  const { state, crisis, defenders } = crisisFixture(1)
  const defender = defenders[0]!
  const gear = equip(state, crisis.id, defender.id, 'item-100')
  // Observed rule: a living eligible defender's allocated gear contributes readiness.
  const equipped = deriveCivilDefense(state, crisis)!
  expect(equipped.equippedDefenderSlots).toBe(1)
  const baseline = equipped.factors.find(factor => factor.id === 'equipment')!.observed

  defender.injuredUntil = state.worldTime + 2 * CONFIG.minutesPerDay
  // Observed rule: temporary injury pauses the effect but preserves its ledger row and slot is absent from current workforce.
  const injured = deriveCivilDefense(state, crisis)!
  expect(injured.equippedDefenderSlots).toBe(0)
  expect(crisis.contributions.equipment).toHaveLength(1)
  expect(injured.factors.find(factor => factor.id === 'equipment')!.observed).toBeLessThan(baseline)
  expect(deserialize(serialize(state)).state).toEqual(state)

  simulate(state, 2 * CONFIG.minutesPerDay)
  // Observed rule: once injury expires, the same historical row becomes effective again.
  expect(deriveCivilDefense(state, state.regionalCrisis)!.equippedDefenderSlots).toBe(1)
  expect(crisis.contributions.equipment[0]!.sourceItem.instanceId).toBe(gear.instanceId)

  die(state, defender as never, '測試傷亡')
  const replacement = defenders[4]!
  const replacementGear = item('item-101', player(state).id, 'shortSword')
  state.reward.instances.push(replacementGear)
  // Observed rule: at severity 1 the ledger is below 16, so death opens effective capacity and replacement accepts gear.
  expect(contributeCrisisEquipment(state, crisis.id, replacement.id, replacementGear.instanceId)).toBe('')
  expect(crisis.contributions.equipment).toHaveLength(2)
  expect(crisis.contributions.equipment[0]!.defenderNpcId).toBe(defender.id)
  expect(state.reward.instances.some(instance => instance.instanceId === gear.instanceId)).toBe(false)
})

it('rejects duplicate instance contribution without consuming another item or changing gold', () => {
  const { state, crisis, defenders, character } = crisisFixture()
  const gear = equip(state, crisis.id, defenders[0]!.id, 'item-100')
  state.reward.instances.push(gear)
  const beforeGold = character.gold
  const beforeRows = structuredClone(crisis.contributions.equipment)
  // Observed rule: an instanceId already present in the ledger is rejected atomically.
  expect(contributeCrisisEquipment(state, crisis.id, defenders[1]!.id, gear.instanceId)).toBe('這件裝備已經交付過。')
  expect(state.reward.instances).toContainEqual(gear)
  expect(character.gold).toBe(beforeGold)
  expect(crisis.contributions.equipment).toEqual(beforeRows)
})

it('counts dead defender craft rows toward recognition threshold without duplicate major reward', () => {
  const { state, crisis, defenders, character } = crisisFixture()
  const first = crafted('item-100', character.id, character.id)
  const second = crafted('item-101', character.id, character.id)
  state.reward.instances.push(first, second)
  // Observed rule: recognition totals immutable ledger history, including allocations belonging to a dead defender.
  expect(contributeCrisisEquipment(state, crisis.id, defenders[0]!.id, first.instanceId)).toBe('')
  die(state, defenders[0] as never, '測試傷亡')
  expect(contributeCrisisEquipment(state, crisis.id, defenders[1]!.id, second.instanceId)).toBe('')
  expect(state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(1)
  const reputationAfterThreshold = state.life.characters[character.id]!.reputation
  const third = crafted('item-102', character.id, character.id)
  state.reward.instances.push(third)
  expect(contributeCrisisEquipment(state, crisis.id, defenders[2]!.id, third.instanceId)).toBe('')
  // Observed rule: after the threshold has been crossed, later contributions do not award the major recognition again.
  expect(state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(1)
  expect(state.life.characters[character.id]!.reputation).toBe(reputationAfterThreshold)
})

it('records successor-chosen defender removal as lost capacity while retaining its row', () => {
  const { state, crisis, defenders, character } = crisisFixture()
  equip(state, crisis.id, defenders[0]!.id, 'item-100')
  die(state, character, '接班測試')
  // Observed rule: choosing an eligible defender as successor removes that NPC from the workforce; its crisis ledger row remains.
  expect(chooseSuccessor(state, defenders[0]!.id)).toBe(true)
  expect(state.npcs.some(npc => npc.id === defenders[0]!.id)).toBe(false)
  expect(crisis.contributions.equipment).toHaveLength(1)
  expect(deriveCivilDefense(state, state.regionalCrisis)!.equippedDefenderSlots).toBe(0)
  expect(deserialize(serialize(state)).state).toEqual(state)
})

it('keeps dead defender gear history through crisis resolution and deterministic reload replay', () => {
  const makeRun = (reloadMidway: boolean) => {
    const { state, crisis, defenders } = crisisFixture(1)
    equip(state, crisis.id, defenders[0]!.id, 'item-100')
    die(state, defenders[0] as never, '測試傷亡')
    const saveTime = 8216
    let loaded = state
    while (loaded.regionalCrisis.phase === 'warning' || loaded.regionalCrisis.phase === 'preparation') {
      loaded.worldTime = loaded.regionalCrisis.phaseEndsAt
      loaded.regionalCrisis = advanceRegionalCrisisState(loaded.regionalCrisis, loaded.worldTime)
    }
    if (loaded.regionalCrisis.phase !== 'active') throw new Error('expected active crisis')
    if (reloadMidway) loaded = deserialize(serialize(loaded, saveTime)).state
    if (loaded.regionalCrisis.phase !== 'active') throw new Error('expected active crisis after reload')
    simulate(loaded, Math.floor((loaded.regionalCrisis.phaseEndsAt - loaded.worldTime) / 2))
    if (reloadMidway) loaded = deserialize(serialize(loaded, saveTime)).state
    if (loaded.regionalCrisis.phase !== 'active') throw new Error('expected active crisis after mid-way reload')
    const endTime = loaded.regionalCrisis.phaseEndsAt
    simulate(loaded, endTime - loaded.worldTime)
    for (let step = 0; step < 2; step++) simulate(loaded, CONFIG.minutesPerDay)
    const resolved = structuredClone(currentCrisis(loaded))
    if (resolved.phase !== 'aftermath' && resolved.phase !== 'cooldown') throw new Error('expected crisis resolution')
    // Observed rule: a dead defender's contribution row remains in the resolution history.
    expect(resolved.contributions.equipment).toHaveLength(1)
    expect(resolved.contributions.equipment[0]!.defenderNpcId).toBe(defenders[0]!.id)
    expect(deserialize(serialize(loaded, saveTime)).state).toEqual(loaded)
    return { loaded, outcome: resolved.outcome }
  }
  // Observed rule: replaying the same seed and inputs gives identical serialized results, including after a mid-run reload.
  const a = makeRun(false)
  const b = makeRun(true)
  expect(a.outcome).toBe(b.outcome)
  expect(serialize(a.loaded, 8216)).toBe(serialize(b.loaded, 8216))
})
