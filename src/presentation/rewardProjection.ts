import { EQUIPMENT, ITEMS } from '../data/config'
import { CRAFTING_RECIPES } from '../data/crafting'
import { ITEM_BASES, RARITIES } from '../data/rewards'
import type { EquipmentSlot, GearStats, ItemInstance, RarityId } from '../domain/reward'
import type { GameState } from '../domain/types'
import { clockLabel } from '../engine/calendar'

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

/** Original maker and recipe stay attached to the physical crafted instance, independent of its current owner. */
export function projectCraftProvenance(state: GameState, item: ItemInstance) {
  const provenance = item.craftProvenance
  if (!provenance) return null
  const creator = state.characters.find(character => character.id === provenance.createdBy)
  return {
    masterpiece: provenance.masterpiece,
    creatorName: creator?.name ?? '不詳',
    createdAtLabel: clockLabel(provenance.createdAt),
    recipeName: CRAFTING_RECIPES[provenance.recipeId].name,
  }
}

/** Comparison describes one physical slot, including existing fixed equipment. */
export function projectEquipmentSlot(state: GameState, slot: EquipmentSlot) {
  const empty: GearStats = { attack: 0, defense: 0, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 }
  const c = state.characters.find(character => character.id === state.activeCharacterId)!
  const ref = state.reward.equipped[c.id]?.[slot]
  const instance = state.reward.instances.find(item => item.instanceId === ref && item.ownerId === c.id)
  if (instance) return {
    name: ITEM_BASES[instance.baseId].name, rarity: instance.rarity, stats: { ...instance.rolledStats },
    affixes: structuredClone(instance.affixes), specialTrait: instance.specialTrait,
  }
  const legacy = c.equipment[slot]
  if (legacy) return {
    name: ITEMS[legacy].name, rarity: null, stats: { ...empty, ...(slot === 'weapon' ? { attack: EQUIPMENT.sword.attack } : { defense: EQUIPMENT.armor.defense }) },
    affixes: [], specialTrait: null,
  }
  return { name: slot === 'weapon' ? '徒手' : '便服', rarity: null, stats: empty, affixes: [], specialTrait: null }
}

/** Detached comparison of an owned candidate with the real item occupying its slot. */
export function projectGearComparison(state: GameState, candidateId: ItemInstance['instanceId']) {
  const candidate = state.reward.instances.find(item => item.instanceId === candidateId && item.ownerId === state.activeCharacterId)
  if (!candidate) return null
  const slot = ITEM_BASES[candidate.baseId].slot
  const current = projectEquipmentSlot(state, slot)
  const stats = { ...candidate.rolledStats }
  const delta: GearStats = { attack: 0, defense: 0, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 }
  for (const key of statKeys) delta[key] = stats[key] - current.stats[key]
  return {
    slot,
    candidate: {
      name: ITEM_BASES[candidate.baseId].name, rarity: candidate.rarity, stats,
      affixes: structuredClone(candidate.affixes), specialTrait: candidate.specialTrait,
    },
    current,
    delta,
  }
}

export const affixMechanics: Record<keyof GearStats, string> = {
  attack: '每次攻擊直接增加傷害。',
  defense: '減少受到的攻擊傷害。',
  critical: '依暴擊率機率造成雙倍攻擊傷害。',
  penetration: '降低敵人防禦；狼族架起硬皮時穿透效果加倍。',
  bleed: '每次命中額外造成固定傷害，不會持續流血。',
  block: '依格擋率機率使來襲傷害減半。',
  reduction: '依減傷率百分比降低來襲傷害。',
}

export function statDeltaText(key: keyof GearStats, value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}${['critical', 'block', 'reduction'].includes(key) ? '%' : ''}`
}

/** Presents only the newest still-buffered wolf loot event; novelty comes from its authoritative event text. */
export function projectLatestLootFeedback(state: GameState) {
  const event = [...state.events].reverse().find(candidate => candidate.type === 'loot.item')
  if (!event) return null
  const isBossReward = state.events.some(candidate => candidate.type === 'wolf.boss.defeated'
    && candidate.at === event.at && candidate.id > event.id)
  const isNewDiscovery = event.message.startsWith('新發現：')
  const message = isNewDiscovery ? event.message.slice('新發現：'.length) : event.message
  const rarity = (Object.keys(RARITIES) as RarityId[]).find(id => message.includes(`獲得${RARITIES[id].name}`)) ?? null
  const isRare = rarity === 'rare' || rarity === 'epic' || rarity === 'legendary'
  const label = [isBossReward ? '首領獎勵' : isRare ? '稀有獵裝' : '狼族獵獲', ...(isNewDiscovery ? ['新發現'] : [])].join(' · ')
  const kind = `${isBossReward ? 'boss-' : ''}${isNewDiscovery ? 'new-' : ''}${isRare ? 'rare' : 'item'}`
  return { eventId: event.id, message, label, kind, rarity, isBossReward, isNewDiscovery }
}
