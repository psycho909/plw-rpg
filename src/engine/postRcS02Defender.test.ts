import { expect, it } from 'vitest'
import type { ItemInstance } from '../domain/reward'
import { rolledItemStats } from './gearStats'
import { contributeCrisisEquipment } from './crisisContributions'
import { civilDefenseGearEffect, deriveCivilDefense } from './civilDefense'
import { tryStartRegionalCrisis } from './regionalCrisis'
import { createGame, die, player } from './simulation'
import { deserialize, serialize } from '../services/saveService'

function item(instanceId: string, ownerId: string, baseId: ItemInstance['baseId']): ItemInstance {
  return { instanceId, ownerId, baseId, level: 1, material: null, rarity: 'common',
    rolledStats: rolledItemStats(baseId, 1, []), affixes: [], specialTrait: null, provenance: null, craftProvenance: null }
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
