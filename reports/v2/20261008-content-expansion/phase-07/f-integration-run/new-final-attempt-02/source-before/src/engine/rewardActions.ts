import { ITEM_BASES, MATERIALS, RARITIES } from '../data/rewards'
import { BUILDINGS } from '../data/config'
import type { BuildingId } from '../domain/types'
import type { EquipmentSlot, ItemInstance, MaterialId } from '../domain/reward'
import type { GameState } from '../domain/types'
import { calendar } from './calendar'
import { emit } from './events'
import { distance, player, preflightRegionalCrisisAction, simulate } from './simulation'

const SELL_MULTIPLIER: Record<keyof typeof RARITIES, number> = {
  common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5,
}

export function canVisit(state: GameState, building: BuildingId) {
  const character = player(state), definition = BUILDINGS[building], hour = calendar(state.worldTime).hour
  return character.isAlive && !state.combat && !state.dungeon.inDungeon && state.settlement.buildings.includes(building)
    && distance(character.position, definition.position) <= 1 && hour >= definition.opens && hour < definition.closes
}

export function equippedInstance(state: GameState, slot: EquipmentSlot, ownerId = state.activeCharacterId): ItemInstance | undefined {
  if (!state.characters.some(character => character.id === ownerId)) return undefined
  const instanceId = state.reward.equipped[ownerId]?.[slot]
  return instanceId ? state.reward.instances.find(item => item.instanceId === instanceId && item.ownerId === ownerId) : undefined
}

export function equipInstance(state: GameState, instanceId: string): string {
  const character = player(state)
  if (!character.isAlive || state.combat) return '目前無法更換裝備。'
  const item = state.reward.instances.find(candidate => candidate.instanceId === instanceId)
  if (!item || item.ownerId !== character.id || !Object.hasOwn(ITEM_BASES, item.baseId)) return '沒有這件可裝備的物品。'
  const slot = ITEM_BASES[item.baseId].slot
  const equipped = state.reward.equipped[character.id] ?? { weapon: null, armor: null }
  const removing = equipped[slot] === item.instanceId
  equipped[slot] = removing ? null : item.instanceId
  if (!removing) character.equipment[slot] = null
  state.reward.equipped[character.id] = equipped
  state.life.director.lastPlayerActivity = state.worldTime
  const action = removing ? '卸下' : '穿戴'
  emit(state, 'player.equipped', 'player', `${action}${RARITIES[item.rarity].name}${ITEM_BASES[item.baseId].name}。`)
  return ''
}

export function itemSellPrice(item: ItemInstance): number {
  const base = ITEM_BASES[item.baseId].sell
  const rarityPrice = Math.floor(base * SELL_MULTIPLIER[item.rarity])
  if (!item.craftProvenance) return Math.max(1, rarityPrice)

  const affixValue = item.affixes.reduce((sum, affix) => sum + 1 + Math.max(0, affix.tier - 1), 0)
  const affixPremium = Math.min(Math.floor(base * 0.15), affixValue)
  const masterpiecePremium = item.craftProvenance.masterpiece ? Math.ceil(base * 0.15) : 0
  const premium = Math.min(Math.floor(base * 0.25), affixPremium + masterpiecePremium)
  return Math.max(1, rarityPrice + premium)
}

function safePayout(gold: number, price: number) {
  return Number.isSafeInteger(gold) && Number.isSafeInteger(price) && price >= 0 && gold <= Number.MAX_SAFE_INTEGER - price
}

function finishTrade(state: GameState, message: string) {
  state.settlement.prosperity = Math.min(100, state.settlement.prosperity + .2)
  simulate(state, 5)
  emit(state, 'player.traded', 'player', message)
  state.life.director.lastPlayerActivity = state.worldTime
}

export function sellInstance(state: GameState, instanceId: string): string {
  preflightRegionalCrisisAction(state, 5, preview => sellInstanceInternal(preview, instanceId))
  return sellInstanceInternal(state, instanceId)
}
function sellInstanceInternal(state: GameState, instanceId: string): string {
  const character = player(state)
  if (!canVisit(state, 'blacksmith')) return `請在營業時間前往${BUILDINGS.blacksmith.name}旁。`
  const index = state.reward.instances.findIndex(item => item.instanceId === instanceId)
  const item = state.reward.instances[index]
  if (!item || item.ownerId !== character.id || !Object.hasOwn(ITEM_BASES, item.baseId) || !Object.hasOwn(RARITIES, item.rarity)) {
    return '沒有這件可出售的物品。'
  }
  const equipped = state.reward.equipped[character.id]
  if (equipped?.weapon === instanceId || equipped?.armor === instanceId) return '已裝備的物品無法出售。'
  const price = itemSellPrice(item)
  if (!safePayout(character.gold, price)) return '金幣數量已達安全上限。'
  state.reward.instances.splice(index, 1)
  character.gold += price
  finishTrade(state, `出售${RARITIES[item.rarity].name}${ITEM_BASES[item.baseId].name}，獲得 ${price} 金幣。`)
  return ''
}

export function tradeMaterial(state: GameState, materialId: MaterialId): string {
  preflightRegionalCrisisAction(state, 5, preview => tradeMaterialInternal(preview, materialId))
  return tradeMaterialInternal(state, materialId)
}
function tradeMaterialInternal(state: GameState, materialId: MaterialId): string {
  if (!Object.hasOwn(MATERIALS, materialId)) return '沒有這項可出售的素材。'
  const character = player(state)
  if (!canVisit(state, 'store')) return `請在營業時間前往${BUILDINGS.store.name}旁。`
  const counts = state.reward.materials[character.id]
  if (!counts || !Number.isSafeInteger(counts[materialId]) || counts[materialId] <= 0) return '沒有可出售的素材。'
  const price = MATERIALS[materialId].sell
  if (!safePayout(character.gold, price)) return '金幣數量已達安全上限。'
  counts[materialId]--
  character.gold += price
  finishTrade(state, `出售${MATERIALS[materialId].name}，獲得 ${price} 金幣。`)
  return ''
}
