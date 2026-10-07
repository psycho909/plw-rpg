import { LIVING_EVENT_LIMITS } from '../data/livingEvents'
import { ITEM_BASES } from '../data/rewards'
import {
  REGIONAL_CRISIS_CONTRIBUTION_LIMITS,
  type CrisisContributionCredit,
  type CrisisEquipmentAllocation,
  type RegionalCrisisState,
} from '../domain/crisis'
import type { EquipmentSlot, ItemInstance } from '../domain/reward'
import type { GameState } from '../domain/types'
import { emit } from './events'
import { availableCivilDefenseDefenders, deriveCivilDefense } from './civilDefense'
import { distance, tileAt } from './simulation'

type PreparationCrisis = Extract<RegionalCrisisState, { phase: 'warning' | 'preparation' }>

interface ContributionContext {
  crisis: PreparationCrisis
  character: GameState['characters'][number]
  model: NonNullable<ReturnType<typeof deriveCivilDefense>>
}

const COMMUNITY_HANDOFF_RADIUS = LIVING_EVENT_LIMITS.deliveryDistance

function contextFor(state: GameState, crisisId: string): ContributionContext | string {
  const crisis = state.regionalCrisis
  if ((crisis.phase !== 'warning' && crisis.phase !== 'preparation') || crisis.id !== crisisId) {
    return '這場危機目前不接受準備物資。'
  }
  const character = state.characters.find(candidate => candidate.id === state.activeCharacterId)
  if (!character?.isAlive || character.status !== 'idle' || state.combat || state.dungeon.inDungeon) {
    return '離開戰鬥並以存活角色返回聚落後才能支援。'
  }
  const handoff = LIVING_EVENT_LIMITS.deliverySquare
  if (character.currentRegion !== 'village' || tileAt(state, character.position)?.regionId !== 'village'
    || distance(character.position, handoff) > COMMUNITY_HANDOFF_RADIUS) {
    return '請回到橡谷廣場附近再交付支援。'
  }
  if (!Number.isSafeInteger(state.eventSequence) || state.eventSequence >= Number.MAX_SAFE_INTEGER - 1) {
    return '世界事件記錄已達安全上限，目前無法登記支援。'
  }
  const model = deriveCivilDefense(state, crisis)
  if (!model) return '這場危機目前無法評估支援需求。'
  return { crisis, character, model }
}

function addCredit(credits: CrisisContributionCredit[], donorId: string, amount: number) {
  const existing = credits.find(credit => credit.donorId === donorId)
  if (existing) existing.amount += amount
  else credits.push({ donorId, amount })
}

function sourceSnapshot(item: ItemInstance): ItemInstance {
  return {
    ...item,
    rolledStats: { ...item.rolledStats },
    affixes: item.affixes.map(affix => ({ ...affix })),
    provenance: item.provenance ? { ...item.provenance } : null,
    craftProvenance: item.craftProvenance ? { ...item.craftProvenance } : null,
  }
}

function emitContribution(state: GameState, kind: 'equipment' | 'food' | 'gold', message: string) {
  state.life.director.lastPlayerActivity = state.worldTime
  emit(state, `regional-crisis.contribution.${kind}`, 'player', message)
}

/** Atomically consumes one owned, unequipped reward item into an available local defender slot. */
export function contributeCrisisEquipment(state: GameState, crisisId: string, defenderNpcId: string, instanceId: string): string {
  const context = contextFor(state, crisisId)
  if (typeof context === 'string') return context
  const { crisis, character, model } = context
  const allocations = crisis.contributions.equipment
  if (allocations.length >= REGIONAL_CRISIS_CONTRIBUTION_LIMITS.equipmentAllocations
    || model.needs.find(need => need.id === 'equipment')?.shortage === 0) {
    return '目前沒有可用的防衛裝備欄位。'
  }

  const itemIndex = state.reward.instances.findIndex(candidate => candidate.instanceId === instanceId)
  const item = state.reward.instances[itemIndex]
  if (!item || item.ownerId !== character.id || !Object.hasOwn(ITEM_BASES, item.baseId)) {
    return '沒有這件可支援聚落的裝備。'
  }
  const equipped = state.reward.equipped[character.id]
  if (equipped?.weapon === instanceId || equipped?.armor === instanceId) return '已穿戴的裝備不能交付。'

  const slot: EquipmentSlot = ITEM_BASES[item.baseId].slot
  const defenders = availableCivilDefenseDefenders(state).slice(0, model.targetDefenders)
  const defender = defenders.find(candidate => candidate.id === defenderNpcId)
  if (!defender || (slot === 'weapon' ? defender.equipment.weapon : defender.equipment.armor) !== null
    || allocations.some(allocation => allocation.defenderNpcId === defenderNpcId && allocation.slot === slot)) {
    return '這名防衛者目前沒有可用的對應裝備欄位。'
  }
  if (allocations.some(allocation => allocation.sourceItem.instanceId === instanceId)) return '這件裝備已經交付過。'

  const allocation: CrisisEquipmentAllocation = {
    defenderNpcId, slot, donorId: character.id, contributedAt: state.worldTime, sourceItem: sourceSnapshot(item),
  }
  state.reward.instances.splice(itemIndex, 1)
  allocations.push(allocation)
  emitContribution(state, 'equipment', `交付${ITEM_BASES[item.baseId].name}，支援${defender.name}的防衛裝備。`)
  return ''
}

/** Adds real settlement food while respecting forecast need, physical capacity and the crisis cap. */
export function contributeCrisisFood(state: GameState, crisisId: string, inventoryItems: number): string {
  const context = contextFor(state, crisisId)
  if (typeof context === 'string') return context
  const { crisis, character, model } = context
  const ledger = crisis.contributions.food
  if (!Number.isSafeInteger(inventoryItems) || inventoryItems < 1
    || !Number.isSafeInteger(inventoryItems * REGIONAL_CRISIS_CONTRIBUTION_LIMITS.foodPerInventoryItem)) {
    return '請選擇有效的食物數量。'
  }
  if (!Number.isSafeInteger(character.inventory.food) || character.inventory.food < inventoryItems) {
    return '背包裡沒有足夠的食物。'
  }
  const supply = inventoryItems * REGIONAL_CRISIS_CONTRIBUTION_LIMITS.foodPerInventoryItem
  const rawForecast = model.food.rawProjectedAtResolution
  const neededStock = Math.max(0, model.capacity.foodPoints - rawForecast)
  const stockroomSpace = 100 - state.settlement.food
  const perCrisisSpace = REGIONAL_CRISIS_CONTRIBUTION_LIMITS.foodSupply - ledger.supplied
  const needCapacity = Math.floor(neededStock / REGIONAL_CRISIS_CONTRIBUTION_LIMITS.foodPerInventoryItem)
    * REGIONAL_CRISIS_CONTRIBUTION_LIMITS.foodPerInventoryItem
  if (!Number.isFinite(rawForecast) || supply > stockroomSpace || supply > perCrisisSpace || supply > needCapacity) {
    return rawForecast < 0 && rawForecast + supply <= 0
      ? '目前糧食消耗快於補給；需要更多農夫或防衛協助，單靠存糧無法補足需求。'
      : '目前的預測缺糧不足以接收這麼多食物。'
  }
  const projectedBefore = Math.max(0, Math.min(100, rawForecast))
  const projectedAfter = Math.max(0, Math.min(100, rawForecast + supply))
  if (projectedAfter <= projectedBefore) {
    return rawForecast < 0 && rawForecast + supply <= 0
      ? '目前糧食消耗快於補給；需要更多農夫或防衛協助，單靠存糧無法補足需求。'
      : '這批食物無法改善危機結束時的供糧預測。'
  }

  state.settlement.food += supply
  character.inventory.food -= inventoryItems
  ledger.supplied += supply
  addCredit(ledger.credits, character.id, supply)
  emitContribution(state, 'food', `交付 ${inventoryItems} 份食物，橡谷存糧增加 ${supply}。`)
  return ''
}

/** Transfers bounded real character gold into the crisis emergency-logistics reserve. */
export function contributeCrisisGold(state: GameState, crisisId: string, amount: number): string {
  const context = contextFor(state, crisisId)
  if (typeof context === 'string') return context
  const { crisis, character, model } = context
  const ledger = crisis.contributions.gold
  const need = model.needs.find(candidate => candidate.id === 'gold')
  if (!Number.isSafeInteger(amount) || amount < 1) return '請選擇有效的金幣數量。'
  if (!Number.isSafeInteger(character.gold) || character.gold < amount) return '身上沒有足夠的金幣。'
  if (!need || amount > need.shortage) return '目前沒有足夠的後勤缺口接收這筆金幣。'

  character.gold -= amount
  ledger.spent += amount
  addCredit(ledger.credits, character.id, amount)
  emitContribution(state, 'gold', `投入 ${amount} 枚金幣支援危機後勤。`)
  return ''
}
