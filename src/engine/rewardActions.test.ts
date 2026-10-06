import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../data/config'
import { MATERIALS } from '../data/rewards'
import type { ItemInstance, MaterialId } from '../domain/reward'
import { equip } from './actions'
import { createGame, player } from './simulation'
import { equippedInstance, equipInstance, itemSellPrice, sellInstance, tradeMaterial } from './rewardActions'

function instance(instanceId: string, ownerId: string, slot: 'weapon' | 'armor' = 'weapon'): ItemInstance {
  const armor = slot === 'armor'
  return {
    instanceId, ownerId, baseId: armor ? 'hideArmor' : 'shortSword', level: 1, material: null, rarity: 'common',
    rolledStats: { attack: armor ? 0 : 4, defense: armor ? 2 : 0, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 },
    affixes: [], specialTrait: null, provenance: null,
  }
}

function atSmith(state: ReturnType<typeof createGame>) {
  const character = player(state)
  if (!state.settlement.buildings.includes('blacksmith')) state.settlement.buildings.push('blacksmith')
  character.position = { ...BUILDINGS.blacksmith.position }
  state.worldTime = 10 * 60
  return character
}

function atStore(state: ReturnType<typeof createGame>) {
  const character = player(state)
  character.position = { ...BUILDINGS.store.position }
  state.worldTime = 10 * 60
  return character
}

describe('procedural equipment actions', () => {
  it('equips by active owner, clears legacy gear in that slot and supports unequipping', () => {
    const state = createGame(), character = player(state), weapon = instance('item-1', character.id), armor = instance('item-2', character.id, 'armor')
    state.reward.instances.push(weapon, armor)
    character.equipment.weapon = 'sword'
    character.equipment.armor = 'armor'

    expect(equipInstance(state, weapon.instanceId)).toBe('')
    expect(equippedInstance(state, 'weapon')).toEqual(weapon)
    expect(character.equipment.weapon).toBeNull()
    expect(state.reward.equipped[character.id]).toEqual({ weapon: 'item-1', armor: null })
    expect(equipInstance(state, armor.instanceId)).toBe('')
    expect(character.equipment.armor).toBeNull()
    expect(equipInstance(state, weapon.instanceId)).toBe('')
    expect(equippedInstance(state, 'weapon')).toBeUndefined()
    expect(state.reward.instances).toHaveLength(2)
  })

  it('clears a procedural reference when legacy equipment is equipped', () => {
    const state = createGame(), character = player(state), weapon = instance('item-1', character.id)
    state.reward.instances.push(weapon)
    state.reward.equipped[character.id] = { weapon: weapon.instanceId, armor: null }
    character.inventory.sword = 1

    expect(equip(state, 'sword')).toBe('')
    expect(state.reward.equipped[character.id]).toEqual({ weapon: null, armor: null })
    expect(character.equipment.weapon).toBe('sword')
    expect(state.reward.instances).toContainEqual(weapon)
  })

  it.each(['missing', 'foreign', 'combat', 'dead'] as const)('rejects %s equipment changes without mutation', kind => {
    const state = createGame(), character = player(state), item = instance('item-1', kind === 'foreign' ? 'someone-else' : character.id)
    state.reward.instances.push(item)
    if (kind === 'combat') state.combat = { monsterId: 'wolf', hp: 1, maxHp: 1, attack: 1, defense: 0, exp: 0, gold: 0, elite: false, dungeon: false }
    if (kind === 'dead') character.isAlive = false
    const target = kind === 'missing' ? 'item-99' : item.instanceId
    const before = structuredClone(state)
    expect(equipInstance(state, target)).not.toBe('')
    expect(state).toEqual(before)
  })

  it('never sums legacy and procedural gear and resolves an owner-specific equipped instance', () => {
    const state = createGame(), character = player(state), item = instance('item-1', character.id)
    state.reward.instances.push(item)
    state.reward.equipped[character.id] = { weapon: item.instanceId, armor: null }
    character.equipment.weapon = 'sword'
    expect(equippedInstance(state, 'weapon', character.id)).toEqual(item)
  })
})

describe('procedural equipment sales', () => {
  it('sells owned un-equipped gear at the smith for its rarity-adjusted price and records the trade', () => {
    const state = createGame(), character = atSmith(state), item = instance('item-1', player(state).id)
    state.reward.instances.push(item)
    const price = itemSellPrice(item), startingGold = character.gold, startingTime = state.worldTime

    expect(price).toBeGreaterThan(0)
    expect(sellInstance(state, item.instanceId)).toBe('')
    expect(character.gold).toBe(startingGold + price)
    expect(state.worldTime).toBe(startingTime + 5)
    expect(state.reward.instances).toEqual([])
    expect(state.life.director.lastPlayerActivity).toBe(state.worldTime)
    expect(state.events.some(event => event.type === 'player.traded')).toBe(true)
  })

  it.each(['equipped', 'foreign', 'missing', 'closed-shop', 'unsafe-gold'] as const)('blocks %s sales without consuming an instance', kind => {
    const state = createGame(), character = atSmith(state), item = instance('item-1', kind === 'foreign' ? 'someone-else' : player(state).id)
    state.reward.instances.push(item)
    if (kind === 'equipped') state.reward.equipped[character.id] = { weapon: item.instanceId, armor: null }
    if (kind === 'closed-shop') state.worldTime = 19 * 60
    if (kind === 'unsafe-gold') character.gold = Number.MAX_SAFE_INTEGER
    const target = kind === 'missing' ? 'item-99' : item.instanceId
    const before = structuredClone(state)
    expect(sellInstance(state, target)).not.toBe('')
    expect(state).toEqual(before)
  })

  it('sells one owned material through the store with a safe payout and five-minute activity event', () => {
    const state = createGame(), character = atStore(state), material: MaterialId = 'wolfFang'
    state.reward.materials[character.id] = { wolfFang: 2, wolfHide: 0, moonStone: 0 }
    const startingGold = character.gold, startingTime = state.worldTime
    expect(tradeMaterial(state, material)).toBe('')
    expect(state.reward.materials[character.id]!.wolfFang).toBe(1)
    expect(character.gold).toBe(startingGold + MATERIALS[material].sell)
    expect(state.worldTime).toBe(startingTime + 5)
    expect(state.events.some(event => event.type === 'player.traded')).toBe(true)
  })

  it('rejects absent materials and payouts that would exceed safe gold', () => {
    const absent = createGame(); atStore(absent)
    const beforeAbsent = structuredClone(absent)
    expect(tradeMaterial(absent, 'wolfFang')).not.toBe('')
    expect(absent).toEqual(beforeAbsent)

    const overflow = createGame(), overflowCharacter = atStore(overflow)
    overflow.reward.materials[overflowCharacter.id] = { wolfFang: 1, wolfHide: 0, moonStone: 0 }
    overflowCharacter.gold = Number.MAX_SAFE_INTEGER - MATERIALS.wolfFang.sell + 1
    const beforeOverflow = structuredClone(overflow)
    expect(tradeMaterial(overflow, 'wolfFang')).not.toBe('')
    expect(overflow).toEqual(beforeOverflow)
  })

  it('does not sell materials at the blacksmith when the store is unavailable', () => {
    const state = createGame(), character = atSmith(state)
    state.settlement.buildings = state.settlement.buildings.filter(building => building !== 'store')
    state.reward.materials[character.id] = { wolfFang: 1, wolfHide: 0, moonStone: 0 }
    const before = structuredClone(state)
    expect(tradeMaterial(state, 'wolfFang')).not.toBe('')
    expect(state).toEqual(before)
  })
})
