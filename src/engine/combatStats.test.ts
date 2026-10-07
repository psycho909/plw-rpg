import { describe, expect, it } from 'vitest'
import { ITEM_BASES, RARITIES } from '../data/rewards'
import type { GearStats, ItemAffix, ItemBaseId, ItemInstance, MonsterTraitId, SpecialTraitId } from '../domain/reward'
import { combatTurn } from './actions'
import { rolledItemStats } from './gearStats'
import { createGame, player } from './simulation'
import { equipmentStats, incomingDamage, playerAttackDamage } from './combatStats'
import { resolveWolfCombatStats } from './wolfFamily'

const zeroStats: GearStats = { attack: 0, defense: 0, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 }

function gear(ownerId: string, instanceId: string, baseId: ItemBaseId, stats: Partial<GearStats>, specialTrait: SpecialTraitId | null = null): ItemInstance {
  return {
    instanceId, ownerId, baseId, level: 1, material: null, rarity: specialTrait ? 'legendary' : 'common',
    rolledStats: { ...zeroStats, ...stats }, affixes: [], specialTrait, provenance: null,
  }
}

function controlledWolfFight(seed: number, affix: 'piercing' | 'bleeding', traits: MonsterTraitId[], turn: number) {
  const state = createGame(seed), character = player(state)
  const affixes: ItemAffix[] = [
    { id: 'striking', tier: 1, value: 1 },
    { id: affix, tier: 2, value: 2 },
  ]
  const weapon: ItemInstance = {
    instanceId: 'item-1', ownerId: character.id, baseId: 'shortSword', level: 5, material: null, rarity: 'rare',
    rolledStats: rolledItemStats('shortSword', 5, affixes), affixes, specialTrait: null, provenance: null,
  }
  state.reward.instances.push(weapon)
  state.reward.nextInstanceId = 2
  state.reward.equipped[character.id] = { weapon: weapon.instanceId, armor: null }
  const encounter = {
    definitionId: 'scarredWolf' as const, traits, variant: null, turn,
    formedAt: state.worldTime - turn, context: { population: 12, hunted: 0, safety: 88 }, howlActive: false,
  }
  const combat = resolveWolfCombatStats(encounter)
  state.combat = { monsterId: 'wolf', ...combat, hp: combat.maxHp, dungeon: false, familyEncounter: structuredClone(encounter) }
  character.status = 'combat'
  return state
}

function combatDamage(state: ReturnType<typeof createGame>) {
  const before = state.combat!.hp
  expect(combatTurn(state, 'attack')).toBe('')
  return before - state.combat!.hp
}

describe('equipment stats and damage', () => {
  it('preserves legacy damage results and consumes no RNG with zero proc chances', () => {
    const state = createGame(909), character = player(state), rngBefore = state.rngState
    character.equipment.weapon = 'sword'
    character.equipment.armor = 'armor'
    const attack = Math.max(1, character.stats.strength + character.skills.combat.level + 7 - 5)
    const rawIncoming = Math.max(1, 25 - Math.floor(character.stats.vitality / 3) - 5 - 2)

    expect(playerAttackDamage(state, 5)).toBe(attack)
    expect(incomingDamage(state, 25, false, 2)).toBe(rawIncoming)
    expect(incomingDamage(state, 25, true, 2)).toBe(Math.max(1, Math.floor(rawIncoming * .3)))
    expect(state.rngState).toBe(rngBefore)
  })

  it('uses one source per physical slot while combining different legacy and instance slots', () => {
    const state = createGame(), character = player(state), weapon = gear(character.id, 'item-1', 'shortSword', { attack: 4, penetration: 2 })
    state.reward.instances.push(weapon)
    state.reward.equipped[character.id] = { weapon: weapon.instanceId, armor: null }
    character.equipment.weapon = 'sword'
    character.equipment.armor = 'armor'

    expect(equipmentStats(state)).toEqual({ attack: 4, defense: 5, critical: 0, penetration: 2, bleed: 0, block: 0, reduction: 0 })
    expect(playerAttackDamage(state, 5)).toBe(Math.max(1, character.stats.strength + character.skills.combat.level + 4 - 3))
  })

  it('applies penetration, per-hit bleed, critical chance and wolf-only Moon Hunter damage', () => {
    const state = createGame(53), character = player(state)
    const weapon = gear(character.id, 'item-1', 'shortSword', { attack: 5, critical: 100, penetration: 2, bleed: 3 }, 'moonHunter')
    state.reward.instances.push(weapon)
    state.reward.equipped[character.id] = { weapon: weapon.instanceId, armor: null }
    const withoutWolfBonus = Math.max(1, character.stats.strength + character.skills.combat.level + 5 + 3 - 5)
    const beforeCritRng = state.rngState

    expect(playerAttackDamage(state, 7)).toBe(withoutWolfBonus * 2)
    expect(state.rngState).not.toBe(beforeCritRng)
    state.rngState = 53
    const wolfDamage = playerAttackDamage(state, 7, true)
    expect(wolfDamage).toBe((withoutWolfBonus + 3) * 2)
  })

  it('doubles penetration only during an active wolf hard-skin phase and preserves other damage formulas', () => {
    const lowPen = controlledWolfFight(48041, 'piercing', [], 0)
    const lowBleed = controlledWolfFight(48041, 'bleeding', [], 0)
    const armoredPen = controlledWolfFight(48041, 'piercing', ['armored'], 2)
    const armoredBleed = controlledWolfFight(48041, 'bleeding', ['armored'], 2)

    expect(lowPen.combat).toEqual(lowBleed.combat)
    expect(armoredPen.combat).toEqual(armoredBleed.combat)
    expect(lowPen.rngState).toBe(lowBleed.rngState)
    expect(armoredPen.rngState).toBe(armoredBleed.rngState)
    expect(playerAttackDamage(armoredPen, 5)).toBe(12)
    expect(playerAttackDamage(armoredPen, 5, false, { wolfArmoredPhase: true })).toBe(14)
    expect(combatDamage(lowPen)).toBe(15)
    expect(combatDamage(lowBleed)).toBe(16)
    expect(combatDamage(armoredPen)).toBe(14)
    expect(combatDamage(armoredBleed)).toBe(12)
  })

  it('keeps bleed and Moon Hunter as extra per-hit damage through very high defense', () => {
    const state = createGame(), character = player(state), bleeding = gear(character.id, 'item-1', 'shortSword', { bleed: 3 })
    state.reward.instances.push(bleeding)
    state.reward.equipped[character.id] = { weapon: bleeding.instanceId, armor: null }
    expect(playerAttackDamage(state, 100)).toBe(4)

    const hunter = gear(character.id, 'item-2', 'shortSword', {}, 'moonHunter')
    state.reward.instances.push(hunter)
    state.reward.equipped[character.id]!.weapon = hunter.instanceId
    expect(playerAttackDamage(state, 100, true)).toBe(4)
  })

  it('routes player and incoming combat damage through the gear-aware helpers', () => {
    const state = createGame(65), character = player(state), weapon = gear(character.id, 'item-1', 'shortSword', { attack: 4 })
    state.reward.instances.push(weapon)
    state.reward.equipped[character.id] = { weapon: weapon.instanceId, armor: null }
    state.combat = { monsterId: 'goblin', hp: 200, maxHp: 200, attack: 6, defense: 3, exp: 1, gold: 0, elite: false, dungeon: false }
    character.hp = character.maxHp
    const expectedAttack = playerAttackDamage(state, 3), expectedIncoming = incomingDamage(state, 6, false)
    const expectedHp = character.hp, expectedSeed = state.rngState

    expect(combatTurn(state, 'attack')).toBe('')
    expect(state.combat?.hp).toBe(200 - expectedAttack)
    expect(character.hp).toBe(expectedHp - expectedIncoming)
    expect(state.rngState).toBe(expectedSeed)
  })

  it('keeps wolf family drops separate from legacy payouts and shows gear in victory messages', () => {
    const wolf = createGame(1), wolfPlayer = player(wolf)
    wolf.rngState = 1
    wolfPlayer.stats.strength = 100
    wolf.combat = { monsterId: 'wolf', hp: 1, maxHp: 1, attack: 0, defense: 0, exp: 0, gold: 0, elite: false, dungeon: false }
    expect(combatTurn(wolf, 'attack')).toBe('')
    expect(wolfPlayer.inventory.material).toBe(0)
    expect(wolf.reward.collection.defeated).toContain('grayWolf')
    expect(wolf.reward.materials[wolfPlayer.id]?.wolfFang).toBe(1)
    const wolfVictory = wolf.events.at(-1)!
    expect(wolfVictory.type).toBe('combat.won')
    const drop = wolf.reward.instances[0]
    expect(drop).toBeDefined()
    expect(wolfVictory.message).toContain(RARITIES[drop!.rarity].name)
    expect(wolfVictory.message).toContain(ITEM_BASES[drop!.baseId].name)
    expect(wolfVictory.message).toContain('物品視窗')

    const goblin = createGame(1), goblinPlayer = player(goblin)
    goblin.rngState = 1
    goblinPlayer.stats.strength = 100
    goblin.combat = { monsterId: 'goblin', hp: 1, maxHp: 1, attack: 0, defense: 0, exp: 0, gold: 0, elite: false, dungeon: false }
    const goblinSeed = goblin.rngState
    expect(combatTurn(goblin, 'attack')).toBe('')
    expect(goblin.reward.instances).toEqual([])
    expect(goblin.reward.materials).toEqual({})
    expect(goblin.rngState).toBe(goblinSeed)
    expect(goblinPlayer.inventory.material).toBe(1)
    expect(goblin.events.at(-1)?.message).toBe('戰鬥勝利！獲得 0 經驗與 0 金幣。')

    const dungeonWolf = createGame(1), dungeonWolfPlayer = player(dungeonWolf)
    dungeonWolf.rngState = 1
    dungeonWolfPlayer.stats.strength = 100
    dungeonWolfPlayer.inventory.material = 4
    dungeonWolf.dungeon.inDungeon = true
    dungeonWolf.combat = { monsterId: 'wolf', hp: 1, maxHp: 1, attack: 0, defense: 0, exp: 0, gold: 0, elite: false, dungeon: true }
    const dungeonSeed = dungeonWolf.rngState
    expect(combatTurn(dungeonWolf, 'attack')).toBe('')
    expect(dungeonWolfPlayer.inventory.material).toBe(5)
    expect(dungeonWolf.reward.collection.defeated).toEqual([])
    expect(dungeonWolf.reward.materials).toEqual({})
    expect(dungeonWolf.rngState).toBe(dungeonSeed)
  })

  it('halves blocked hits and applies percentage reduction without drawing when chances are zero', () => {
    const state = createGame(85), character = player(state), armor = gear(character.id, 'item-1', 'hideArmor', { defense: 2, block: 100, reduction: 20 })
    state.reward.instances.push(armor)
    state.reward.equipped[character.id] = { weapon: null, armor: armor.instanceId }
    const unblockedBase = Math.max(1, 30 - Math.floor(character.stats.vitality / 3) - 2 - 3)
    const beforeBlockRng = state.rngState

    expect(incomingDamage(state, 30, false, 3)).toBe(Math.max(1, Math.floor(unblockedBase * .5 * .8)))
    expect(state.rngState).not.toBe(beforeBlockRng)
    armor.rolledStats.block = 0
    armor.rolledStats.reduction = 0
    const beforeZeroRng = state.rngState
    expect(incomingDamage(state, 30, false, 3)).toBe(unblockedBase)
    expect(state.rngState).toBe(beforeZeroRng)
  })
})
