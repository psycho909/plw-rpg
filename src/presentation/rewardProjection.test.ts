import { expect, it } from 'vitest'
import type { ItemInstance } from '../domain/reward'
import { createGame } from '../engine/simulation'
import { projectEquipmentSlot, projectGearPage } from './rewardProjection'

const gear = (id: number, ownerId = 'alden'): ItemInstance => ({ instanceId: `item-${id}`, ownerId,
  baseId: id % 2 ? 'shortSword' : 'hideArmor', level: 1, material: null, rarity: 'common',
  rolledStats: { attack: id % 2 ? 4 : 0, defense: id % 2 ? 0 : 2, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 },
  affixes: [], specialTrait: null, provenance: null })

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
