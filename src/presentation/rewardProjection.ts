import { EQUIPMENT, ITEMS } from '../data/config'
import { ITEM_BASES } from '../data/rewards'
import type { EquipmentSlot, GearStats, RarityId } from '../domain/reward'
import type { GameState } from '../domain/types'

export const GEAR_PAGE_SIZE = 20
export const statLabels: Record<keyof GearStats, string> = {
  attack: '攻擊', defense: '防禦', critical: '暴擊率', penetration: '穿透', bleed: '裂傷傷害', block: '格擋率', reduction: '減傷率',
}
export const statKeys = Object.keys(statLabels) as (keyof GearStats)[]
export function statText(key: keyof GearStats, value: number) {
  return `${value}${['critical', 'block', 'reduction'].includes(key) ? '%' : ''}`
}

/** Detached bounded projection; paging never deletes owned equipment. */
export function projectGearPage(state: GameState, requestedPage: number, slot: EquipmentSlot | 'all' = 'all', rarity: RarityId | 'all' = 'all') {
  const owned = state.reward.instances.filter(item => item.ownerId === state.activeCharacterId
    && (slot === 'all' || ITEM_BASES[item.baseId].slot === slot) && (rarity === 'all' || item.rarity === rarity))
  const pages = Math.max(1, Math.ceil(owned.length / GEAR_PAGE_SIZE))
  const page = Math.max(0, Math.min(pages - 1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 0))
  return { items: structuredClone(owned.slice(page * GEAR_PAGE_SIZE, (page + 1) * GEAR_PAGE_SIZE)), total: owned.length, page, pages }
}

/** Comparison describes one physical slot, including existing fixed equipment. */
export function projectEquipmentSlot(state: GameState, slot: EquipmentSlot) {
  const empty: GearStats = { attack: 0, defense: 0, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 }
  const c = state.characters.find(character => character.id === state.activeCharacterId)!
  const ref = state.reward.equipped[c.id]?.[slot]
  const instance = state.reward.instances.find(item => item.instanceId === ref && item.ownerId === c.id)
  if (instance) return { name: ITEM_BASES[instance.baseId].name, stats: { ...instance.rolledStats } }
  const legacy = c.equipment[slot]
  if (legacy) return { name: ITEMS[legacy].name, stats: { ...empty, ...(slot === 'weapon' ? { attack: EQUIPMENT.sword.attack } : { defense: EQUIPMENT.armor.defense }) } }
  return { name: slot === 'weapon' ? '徒手' : '便服', stats: empty }
}
