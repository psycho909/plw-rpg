import type { ImportantMemory, Property } from '../domain/life'
import type { GameState, ItemId, Position } from '../domain/types'
import {
  FARM_BUSINESS_DAILY_FOOD_LIMIT, HOME_REST_MINUTES, MAX_FOOD_PER_SUPPLY,
  OWNERSHIP_MEMORY_LIMIT, PROPERTY_DEFINITIONS, STORAGE_PER_ITEM_LIMIT, type PropertyKind,
} from '../data/ownership'
import { BUILDINGS, ITEMS } from '../data/config'
import { IDENTITY_LIMITS } from '../data/identity'
import { emit } from './events'
import { changeReputation, meetsSettlementReputation, refreshIdentity } from './identity'
import { rememberNpc } from './npcLife'
import { distance, player, simulate, tileAt } from './simulation'

export type { PropertyKind } from '../data/ownership'

export interface PropertyEligibility {
  kind: PropertyKind
  label: string
  eligible: boolean
  cost: { gold: number; reputation: number }
  reasons: string[]
}

const stageOrder = ['hamlet', 'village', 'town'] as const
const blockedMessage = '目前無法進行這項活動。'
const deadMessage = '角色已離世，請選擇繼任者。'

function actorProperty(state: GameState, actorId: string, kind: PropertyKind) {
  return state.life.properties.find(property => property.ownerId === actorId && property.kind === kind)
}

function addMilestone(state: GameState, actorId: string, id: string, text: string) {
  const life = state.life.characters[actorId]
  if (!life || life.milestones.some(milestone => milestone.id === id)) return
  life.milestones.push({ id, at: state.worldTime, text })
  if (life.milestones.length > IDENTITY_LIMITS.milestones) {
    life.milestones.splice(0, life.milestones.length - IDENTITY_LIMITS.milestones)
  }
}

function informResidents(state: GameState, memory: ImportantMemory) {
  for (const npc of state.npcs) rememberNpc(state, npc.id, memory)
}

function actionBlocker(state: GameState) {
  const c = player(state)
  if (!c.isAlive || c.status === 'dead') return deadMessage
  if (state.combat || c.status === 'combat' || state.dungeon.inDungeon) return blockedMessage
  return ''
}

function near(state: GameState, position: Position) {
  const c = player(state)
  return distance(c.position, position) <= 1
}

function nearPropertySite(state: GameState, kind: PropertyKind) {
  const definition = PROPERTY_DEFINITIONS[kind]
  const building = BUILDINGS[definition.location]
  return tileAt(state, definition.position)?.walkable === true && near(state, building.position)
}

export function propertyEligibility(state: GameState, kind: PropertyKind): PropertyEligibility {
  const definition = PROPERTY_DEFINITIONS[kind]
  const c = player(state)
  const reasons: string[] = []
  const blocker = actionBlocker(state)
  if (blocker) reasons.push(blocker)
  if (actorProperty(state, c.id, kind)) reasons.push(`這一代已經擁有${definition.label}。`)
  if (!nearPropertySite(state, kind)) reasons.push(`請前往${BUILDINGS[definition.location].name}旁。`)
  if (definition.requiresLand && !actorProperty(state, c.id, 'land')) reasons.push('必須先取得農地。')
  if (stageOrder.indexOf(state.settlement.stage) < stageOrder.indexOf(definition.minimumStage)) {
    const stageLabel = definition.minimumStage === 'village' ? '村莊' : '城鎮'
    reasons.push(`橡谷尚未成長為${stageLabel}。`)
  }
  if (!meetsSettlementReputation(state, definition.cost.reputation, c.id)) {
    reasons.push(`地方聲望不足（需要 ${definition.cost.reputation}）。`)
  }
  if (c.gold < definition.cost.gold) reasons.push(`金幣不足（需要 ${definition.cost.gold}）。`)
  return { kind, label: definition.label, eligible: reasons.length === 0, cost: { ...definition.cost }, reasons }
}

export function buyProperty(state: GameState, kind: PropertyKind) {
  const eligibility = propertyEligibility(state, kind)
  if (!eligibility.eligible) return eligibility.reasons[0] ?? blockedMessage

  const definition = PROPERTY_DEFINITIONS[kind]
  const c = player(state)
  const ownerId = c.id
  c.gold -= definition.cost.gold
  simulate(state, definition.acquisitionMinutes)
  if (!c.isAlive) return deadMessage

  const property: Property = {
    id: `property:${kind}:${ownerId}`, kind, ownerId, acquiredAt: state.worldTime,
    position: { ...definition.position },
    storage: Object.fromEntries((Object.keys(ITEMS) as ItemId[]).map(item => [item, 0])) as Record<ItemId, number>,
    foodSupplied: 0, suppliedDay: Math.floor(state.worldTime / 1440), suppliedToday: 0,
  }
  state.life.properties.push(property)
  addMilestone(state, ownerId, `ownership:${kind}`, `取得${definition.label}`)
  emit(state, 'property.acquired', 'player', `${c.name}取得${definition.label}。`, true)
  if (kind === 'farmBusiness') {
    refreshIdentity(state, ownerId)
    informResidents(state, {
      kind: 'PLAYER_OWNS_FARM', actorId: ownerId, at: state.worldTime, detail: `${c.name}成為橡谷的農場主人。`,
    })
  }
  state.life.director.lastPlayerActivity = state.worldTime
  return ''
}

export function homeRest(state: GameState) {
  const blocker = actionBlocker(state)
  if (blocker) return blocker
  const c = player(state)
  const home = actorProperty(state, c.id, 'home')
  if (!home) return '這一代尚未擁有自宅。'
  if (!tileAt(state, home.position)?.walkable || !near(state, home.position)) return '請回到自宅旁休息。'

  simulate(state, HOME_REST_MINUTES)
  if (!c.isAlive) return deadMessage
  c.hp = c.maxHp
  c.stamina = c.maxStamina
  state.life.director.lastPlayerActivity = state.worldTime
  emit(state, 'player.rested', 'player', '在自宅休息後，生命與體力完全恢復。')
  return ''
}

export function transferStorage(state: GameState, item: ItemId, amount: number, deposit: boolean) {
  const blocker = actionBlocker(state)
  if (blocker) return blocker
  const c = player(state)
  const home = actorProperty(state, c.id, 'home')
  if (!home) return '這一代尚未擁有自宅。'
  if (!tileAt(state, home.position)?.walkable || !near(state, home.position)) return '請回到自宅旁使用儲物空間。'
  if (!Number.isSafeInteger(amount) || amount <= 0) return '數量必須是正整數。'
  if (!ITEMS[item]) return '物品種類無效。'

  const carried = c.inventory[item]
  const stored = home.storage[item] ?? 0
  if (!Number.isSafeInteger(carried) || carried < 0 || !Number.isSafeInteger(stored) || stored < 0 || stored > STORAGE_PER_ITEM_LIMIT) return '物品數量資料無效。'
  if (deposit) {
    if (carried < amount) return '背包裡沒有足夠數量。'
    const equipped = (item === 'sword' && c.equipment.weapon === item) || (item === 'armor' && c.equipment.armor === item)
    if (equipped && carried - amount < 1) return '已裝備的物品至少保留一件在背包中。'
    if (amount > STORAGE_PER_ITEM_LIMIT - stored) return '自宅儲物空間不足。'
    c.inventory[item] -= amount
    home.storage[item] = stored + amount
  } else {
    if (stored < amount) return '自宅沒有足夠數量。'
    if (amount > Number.MAX_SAFE_INTEGER - carried) return '背包數量超出安全上限。'
    home.storage[item] = stored - amount
    c.inventory[item] = carried + amount
  }
  state.life.director.lastPlayerActivity = state.worldTime
  emit(state, 'property.storageMoved', 'player', `${deposit ? '存入' : '取出'} ${amount} 份${ITEMS[item].name}。`)
  return ''
}

export function supplyFarmFood(state: GameState, amount: number): string {
  const blocker = actionBlocker(state)
  if (blocker) return blocker
  const c = player(state)
  if (!actorProperty(state, c.id, 'land')) return '這一代尚未擁有農地。'
  const business = actorProperty(state, c.id, 'farmBusiness')
  if (!business) return '這一代尚未經營農場事業。'
  if (!near(state, BUILDINGS.farm.position)) return '請前往農田旁供應食物。'
  if (!Number.isSafeInteger(amount) || amount <= 0) return '供應數量必須是正整數。'
  if (amount > MAX_FOOD_PER_SUPPLY) return `每次最多供應 ${MAX_FOOD_PER_SUPPLY} 份食物。`
  if (!Number.isSafeInteger(c.inventory.food) || c.inventory.food < amount) return '背包裡沒有足夠食物。'
  if (!Number.isSafeInteger(business.foodSupplied) || business.foodSupplied < 0) return '農場事業的供應紀錄無效。'
  const today = Math.floor(state.worldTime / 1440)
  if (!Number.isSafeInteger(business.suppliedDay) || business.suppliedDay < 0 || business.suppliedDay > today
    || !Number.isSafeInteger(business.suppliedToday) || business.suppliedToday < 0
    || business.suppliedToday > FARM_BUSINESS_DAILY_FOOD_LIMIT || business.suppliedToday > business.foodSupplied) {
    return '農場事業的每日供應紀錄無效。'
  }
  const suppliedToday = business.suppliedDay === today ? business.suppliedToday : 0
  if (amount > FARM_BUSINESS_DAILY_FOOD_LIMIT - suppliedToday) return '農場事業今日的食物供應已達上限。'
  if (!Number.isSafeInteger(business.foodSupplied + amount)) return '農場供應累計超出安全上限。'
  if (!Number.isFinite(state.settlement.food) || amount > Math.floor(100 - state.settlement.food)) return '聚落糧倉空間不足。'
  const life = state.life.characters[c.id]
  if (!life) return '目前無法記錄這段人生事蹟。'

  c.inventory.food -= amount
  business.foodSupplied += amount
  business.suppliedDay = today
  business.suppliedToday = suppliedToday + amount
  state.settlement.food += amount
  changeReputation(state, Math.max(1, Math.floor(amount / 2)), '向橡谷供應農產品', c.id)
  const memory: ImportantMemory = {
    kind: 'PLAYER_SUPPORTED_FOOD', actorId: c.id, at: state.worldTime,
    detail: `供應橡谷 ${amount} 份食物。`,
  }
  for (const memories of [state.life.settlementMemories, state.life.worldMemories]) {
    memories.push({ ...memory })
    if (memories.length > OWNERSHIP_MEMORY_LIMIT) memories.splice(0, memories.length - OWNERSHIP_MEMORY_LIMIT)
  }
  informResidents(state, memory)
  addMilestone(state, c.id, 'ownership:first-food-supply', '第一次為橡谷供應食物')
  emit(state, 'food.supplied', 'settlement', `${c.name}向橡谷供應 ${amount} 份食物。`, true)
  state.life.director.lastPlayerActivity = state.worldTime
  return ''
}
