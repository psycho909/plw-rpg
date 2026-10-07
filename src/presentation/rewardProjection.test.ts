import { expect, it } from 'vitest'
import type { ItemInstance } from '../domain/reward'
import { combatTurn } from '../engine/actions'
import { emit } from '../engine/events'
import { encounterWolf } from '../engine/wolfFamily'
import { createGame } from '../engine/simulation'
import { affixMechanics, projectCraftProvenance, projectEquipmentSlot, projectGearComparison, projectGearPage, projectLatestLootFeedback, statDeltaText } from './rewardProjection'

const gear = (id: number, ownerId = 'alden'): ItemInstance => ({ instanceId: `item-${id}`, ownerId,
  baseId: id % 2 ? 'shortSword' : 'hideArmor', level: 1, material: null, rarity: 'common',
  rolledStats: { attack: id % 2 ? 4 : 0, defense: id % 2 ? 0 : 2, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 },
  affixes: [], specialTrait: null, provenance: null, craftProvenance: null })

it('bounds owned gear pages, clamps stale pages and filters without discarding inventory', () => {
  const state = createGame()
  state.reward.instances = Array.from({ length: 45 }, (_, i) => gear(i + 1))
  state.reward.instances.push(gear(46, 'previous-life'))
  const page = projectGearPage(state, 99)
  expect(page).toMatchObject({ total: 45, page: 2, pages: 3 })
  expect(page.items).toHaveLength(5)
  expect(projectGearPage(state, 0, 'armor').total).toBe(22)
  expect(projectGearPage(state, 7, 'all', 'rare')).toMatchObject({ total: 0, page: 0, pages: 1, items: [] })
  expect(state.reward.instances).toHaveLength(46)
  page.items[0]!.rolledStats.attack = 999
  expect(state.reward.instances[40]!.rolledStats.attack).toBe(4)
})

it('projects a masterpiece as an identity label with its original maker, creation time, and recipe', () => {
  const state = createGame()
  const creator = state.characters[0]!
  const item = gear(99)
  item.ownerId = 'later-holder'
  item.craftProvenance = {
    recipeId: 'ironShortSword', createdBy: creator.id, createdAt: 0,
    influenceMaterial: null, masterpiece: true,
  }

  expect(projectCraftProvenance(state, item)).toMatchObject({
    masterpiece: true, creatorName: creator.name, createdAtLabel: '第 1 年 春 1 日 00:00', recipeName: '鐵短劍',
  })
})

it('projects the actual physical slot and preserves the other slot comparison', () => {
  const state = createGame()
  const c = state.characters[0]!
  c.equipment.weapon = 'sword'
  c.inventory.sword = 1
  expect(projectEquipmentSlot(state, 'weapon').name).toBe('鐵劍')
  expect(projectEquipmentSlot(state, 'weapon').stats.attack).toBe(7)
  state.reward.instances.push(gear(2))
  state.reward.equipped.alden = { weapon: null, armor: 'item-2' }
  expect(projectEquipmentSlot(state, 'armor').name).toBe('獸皮衣')
  expect(projectEquipmentSlot(state, 'armor').stats.defense).toBe(2)
  expect(projectEquipmentSlot(state, 'weapon').stats.defense).toBe(0)
})

it('compares an owned candidate with the current same-slot item, including affixes and signed deltas', () => {
  const state = createGame()
  const c = state.characters[0]!
  c.equipment.weapon = 'sword'
  c.inventory.sword = 1
  const candidate = gear(11)
  candidate.rarity = 'rare'
  candidate.affixes = [{ id: 'piercing', tier: 2, value: 2 }]
  candidate.rolledStats = { attack: 4, defense: 0, critical: 0, penetration: 2, bleed: 0, block: 0, reduction: 0 }
  state.reward.instances.push(candidate)

  const comparison = projectGearComparison(state, candidate.instanceId)!
  expect(comparison).toMatchObject({
    slot: 'weapon',
    candidate: { name: '短劍', rarity: 'rare', stats: { attack: 4, penetration: 2 }, affixes: candidate.affixes },
    current: { name: '鐵劍', rarity: null, stats: { attack: 7 }, affixes: [], specialTrait: null },
    delta: { attack: -3, penetration: 2 },
  })
  expect(statDeltaText('attack', comparison.delta.attack)).toBe('-3')
  expect(statDeltaText('penetration', comparison.delta.penetration)).toBe('+2')
  expect(affixMechanics.bleed).toContain('不會持續流血')
  comparison.candidate.affixes[0]!.value = 999
  expect(candidate.affixes[0]!.value).toBe(2)
  expect(projectGearComparison(state, 'other-life-item')).toBeNull()
})

it('includes intrinsic base stats and current generated affix/special identity', () => {
  const state = createGame()
  const current = { ...gear(12), baseId: 'moonFangSpear' as const, rarity: 'epic' as const,
    rolledStats: { attack: 5, defense: 0, critical: 0, penetration: 2, bleed: 0, block: 0, reduction: 0 },
    affixes: [{ id: 'keen' as const, tier: 1, value: 3 }], specialTrait: 'moonHunter' as const }
  state.reward.instances.push(current)
  state.reward.equipped.alden = { weapon: current.instanceId, armor: null }
  const slot = projectEquipmentSlot(state, 'weapon')
  expect(slot).toMatchObject({ name: '月牙獵矛', rarity: 'epic', stats: { attack: 5, penetration: 2 },
    affixes: current.affixes, specialTrait: 'moonHunter' })
  const candidate = gear(13)
  state.reward.instances.push(candidate)
  expect(projectGearComparison(state, candidate.instanceId)?.current).toMatchObject({
    name: '月牙獵矛', rarity: 'epic', stats: { attack: 5, penetration: 2 }, specialTrait: 'moonHunter',
  })
})

it('presents a real boss first-discovery event and never reconstructs it after the bounded event leaves', () => {
  const state = createGame(773)
  const c = state.characters[0]!
  c.currentRegion = 'forest'
  c.stamina = c.maxStamina
  state.threat.monsterPopulation = 20
  state.reward.collection.defeated = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader']
  expect(encounterWolf(state, 'wolfKing')).toBe('')
  state.combat!.hp = 1
  combatTurn(state, 'attack')

  expect(projectLatestLootFeedback(state)).toMatchObject({
    label: '首領獎勵 · 新發現', kind: 'boss-new-rare', rarity: expect.any(String), isBossReward: true, isNewDiscovery: true,
  })
  expect(state.reward.collection.bases).toContain('moonFangSpear')
  for (let index = 0; index < 151; index++) emit(state, 'test.buffered', 'world', `buffer ${index}`)
  expect(state.events.some(event => event.type === 'loot.item')).toBe(false)
  expect(projectLatestLootFeedback(state)).toBeNull()
  expect(state.reward.collection.bases).toContain('moonFangSpear')
})
