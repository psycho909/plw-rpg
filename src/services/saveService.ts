import { BUILDINGS, CONFIG, DUNGEON, ITEMS, JOBS, MONSTERS } from '../data/config'
import { IDENTITY_LIMITS, REPUTATION_BOUNDS } from '../data/identity'
import { NPC_LIFE_LIMITS } from '../data/npcLife'
import { FARM_BUSINESS_DAILY_FOOD_LIMIT, OWNERSHIP_MEMORY_LIMIT, STORAGE_PER_ITEM_LIMIT } from '../data/ownership'
import type { WorldLife } from '../domain/life'
import type { GameState, Position } from '../domain/types'
import { createGame } from '../engine/simulation'
import { initializeLife } from '../engine/lifeState'
import { emptyReward, migrateRewardV1 } from '../engine/rewardState'
import { validFamilyEncounter, validateReward, validateRewardV1 } from './rewardValidation'

export const SAVE_KEY = 'oakvale-v1'

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const entries = (v: unknown): [string, unknown][] => object(v) ? Object.entries(v) : []
const safeInt = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number =>
  Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max
const boundedNumber = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const shortString = (v: unknown, max: number, min = 0): v is string =>
  typeof v === 'string' && v.length >= min && v.length <= max
const enumValue = (value: unknown, values: readonly string[]): value is string =>
  typeof value === 'string' && values.includes(value)
const validPosition = (p: unknown): p is Position => object(p) && Number.isInteger(p.x) && Number(p.x) >= 0 && Number(p.x) < CONFIG.width
  && Number.isInteger(p.y) && Number(p.y) >= 0 && Number(p.y) < CONFIG.height

function matches(template: unknown, value: unknown): boolean {
  // Nullable V1 fields have different shapes; their concrete contracts are checked below.
  if (template === null) return true
  if (typeof template === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (Array.isArray(template)) return Array.isArray(value) && (template.length === 0 || value.every(v => matches(template[0], v)))
  if (object(template)) return object(value) && Object.entries(template).every(([k, v]) => matches(v, value[k]))
  return typeof template === typeof value
}

function exactShape(value: unknown, required: string[], optional: string[] = []): value is Record<string, unknown> {
  if (!object(value)) return false
  const allowed = new Set([...required, ...optional])
  return required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => allowed.has(key))
}

function validBase(value: unknown, version: 1 | 2 | 3): value is GameState {
  if (!object(value)) return false
  const currentTemplate = createGame()
  // Event tiers remain optional so historical V1 entries survive later-version round trips.
  for (const event of [...currentTemplate.events, ...currentTemplate.history]) delete event.tier
  if (version < 3) for (const actor of [...currentTemplate.characters, ...currentTemplate.npcs]) {
    delete (actor.skills as Record<string, unknown>).smithing
  }
  const { life: _life, reward: _reward, ...baseTemplate } = currentTemplate
  const template: Record<string, unknown> = { ...baseTemplate, saveVersion: version }
  if (version === 1) {
    // Life did not exist in native V1 saves; accepting it could overwrite unknown saved data.
    if (Object.hasOwn(value, 'life')) return false
  } else if (!Object.hasOwn(value, 'life')) {
    return false
  }
  if (!matches(template, value)) return false

  const s = value as unknown as GameState
  const ids = [...s.characters, ...s.npcs].map(c => c.id)
  const regions = Object.keys(currentTemplate.regions)
  return s.saveVersion === version && safeInt(s.worldTime) && Number.isSafeInteger(s.worldSeed) && Number.isSafeInteger(s.rngState)
    && s.characters.length > 0 && s.characters.length <= 1000 && s.npcs.length <= 1000 && new Set(ids).size === ids.length
    && ids.every(id => shortString(id, 128, 1) && (!/^npc-[1-9]\d*$/.test(id) || Number(id.slice(4)) < s.nextNpcId))
    && Number.isSafeInteger(s.nextNpcId) && s.nextNpcId > 0 && s.nextNpcId < Number.MAX_SAFE_INTEGER
    && s.characters.some(c => c.id === s.activeCharacterId)
    && [...s.characters, ...s.npcs].every(c => safeInt(c.age) && Number.isSafeInteger(c.level) && c.level >= 1 && c.exp >= 0 && c.exp < c.level * 30
      && exactShape(c.skills, version < 3 ? ['combat', 'farming', 'mining', 'woodcutting'] : ['combat', 'farming', 'mining', 'woodcutting', 'smithing'])
      && Object.values(c.skills).every(skill => Number.isSafeInteger(skill.level) && skill.level >= 1 && skill.exp >= 0 && skill.exp < skill.level * 20)
      && c.maxHp > 0 && c.maxStamina > 0 && c.gold >= 0 && regions.includes(c.currentRegion)
      && ['child', 'young', 'adult', 'middleAge', 'elder'].includes(c.lifeStage) && ['idle', 'combat', 'dead'].includes(c.status)
      && (c.deathYear === null || (safeInt(c.deathYear, 1) && c.deathYear <= Number.MAX_SAFE_INTEGER))
      && (c.deathCause === null || shortString(c.deathCause, 500)) && validPosition(c.position)
      && Object.values(c.inventory).every(n => safeInt(n))
      && (c.equipment.weapon === null || c.equipment.weapon === 'sword') && (c.equipment.armor === null || c.equipment.armor === 'armor'))
    && s.npcs.every(n => Object.hasOwn(JOBS, n.job) && validPosition(n.home) && validPosition(n.workplace)
      && n.schedule.length > 0 && n.schedule[0]!.start === 0
      && n.schedule.every((slot, i) => Number.isInteger(slot.start) && slot.start >= 0 && slot.start < CONFIG.minutesPerDay
        && (i === 0 || slot.start > n.schedule[i - 1]!.start)
        && ['sleep', 'travel', 'work', 'leisure'].includes(slot.activity) && ['home', 'workplace', 'square'].includes(slot.destination)))
    && ['hamlet', 'village', 'town'].includes(s.settlement.stage)
    && s.tiles.length === CONFIG.width * CONFIG.height && new Set(s.tiles.map(t => `${t.x},${t.y}`)).size === s.tiles.length
    && s.tiles.every(t => validPosition(t)
      && regions.includes(t.regionId) && ['water', 'grass', 'forest', 'field', 'mountain', 'road'].includes(t.terrain) && (t.building === undefined || Object.hasOwn(BUILDINGS, t.building)))
    && Number.isSafeInteger(s.preparedPlots) && s.preparedPlots >= 0 && s.crops.length + s.preparedPlots <= CONFIG.maxPlots
    && s.crops.every(c => exactShape(c, ['id', 'plantedAt', 'growthDuration', 'matureAt', 'status']) && safeInt(c.id, 1)
      && safeInt(c.plantedAt) && safeInt(c.growthDuration, 1) && safeInt(c.matureAt) && ['growing', 'mature'].includes(c.status))
    && new Set(s.crops.map(c => c.id)).size === s.crops.length
    && s.party.length <= 2 && s.party.every(p => exactShape(p, ['npcId', 'hireCost', 'dailyWage', 'contractEnd', 'archetype'])
      && ['fighter', 'healer'].includes(p.archetype) && s.npcs.some(n => n.id === p.npcId)
      && safeInt(p.hireCost) && safeInt(p.dailyWage) && safeInt(p.contractEnd))
    && (s.combat === null || (exactShape(s.combat, ['monsterId', 'hp', 'maxHp', 'attack', 'defense', 'exp', 'gold', 'elite', 'dungeon'], ['familyEncounter'])
      && Object.hasOwn(MONSTERS, s.combat.monsterId) && boundedNumber(s.combat.hp, 0, Number.MAX_SAFE_INTEGER)
      && boundedNumber(s.combat.maxHp, 1, Number.MAX_SAFE_INTEGER) && safeInt(s.combat.attack) && safeInt(s.combat.defense)
      && safeInt(s.combat.exp) && safeInt(s.combat.gold) && typeof s.combat.elite === 'boolean' && typeof s.combat.dungeon === 'boolean'
      && (!Object.hasOwn(s.combat, 'familyEncounter') || (Object.hasOwn(value, 'reward') && validFamilyEncounter(s.combat.familyEncounter, s)))))
    && safeInt(s.eventSequence) && s.eventSequence < Number.MAX_SAFE_INTEGER
    && [...s.events, ...s.history, ...s.crops].every(entry => object(entry) && safeInt(entry.id, 1) && entry.id <= s.eventSequence)
    && s.events.length <= 150 && s.history.length <= 20000 && Number.isInteger(s.dungeon.stage) && s.dungeon.stage >= 0 && s.dungeon.stage <= DUNGEON.encounters.length
    && (!s.dungeon.inDungeon || s.dungeon.stage < DUNGEON.encounters.length)
    && (s.combat === null || s.combat.dungeon === s.dungeon.inDungeon)
    && Number.isInteger(s.threat.threatLevel) && s.threat.threatLevel >= 1 && s.threat.threatLevel <= CONFIG.threatThresholds.length
    && [...s.events, ...s.history].every(e => object(e) && safeInt(e.at) && e.at <= s.worldTime
      && ['player', 'npc', 'world', 'monster', 'settlement'].includes(e.category)
      && (e.tier === undefined || enumValue(e.tier, ['transient', 'gameplay', 'major', 'debug'])))
    && s.settlement.buildings.every(b => Object.hasOwn(BUILDINGS, b))
}

const originKinds = ['OTHER_WORLD', 'LOCAL_WORLD']
const legacyIdentityKinds = ['resident', 'farmer', 'skilledFarmer', 'miner', 'skilledMiner', 'adventurer', 'veteran', 'farmOwner']
const identityKinds = [...legacyIdentityKinds, 'smith', 'masterpieceCrafter']
const traitKinds = ['brave', 'cautious', 'ambitious', 'content', 'hardworking', 'wanderer', 'social', 'solitary']
const careerKinds = ['resident', 'apprentice', 'worker', 'experienced', 'senior', 'owner', 'retired']
const memoryKinds = ['PLAYER_HELPED_ME', 'PLAYER_HIRED_ME', 'PLAYER_SAVED_ME', 'PLAYER_FAILED_ME', 'PLAYER_DEFENDED_OAKVALE',
  'PLAYER_OWNS_FARM', 'PLAYER_SUPPORTED_FOOD', 'GOBLIN_CHIEF_DEFEATED', 'DUNGEON_DISCOVERED', 'MAJOR_DISASTER']
const visitorKinds = ['elf', 'mage', 'knight', 'adventurer', 'merchant']
const legacySkillIds = ['combat', 'farming', 'mining', 'woodcutting']
const skillIds = [...legacySkillIds, 'smithing']
const itemIds = Object.keys(ITEMS)
const npcIdNumber = (id: string) => /^npc-([1-9]\d*)$/.exec(id)?.[1]

function validWorldEntityId(id: string, characterIds: Set<string>, npcLife: Record<string, unknown>, nextNpcId: number) {
  if (characterIds.has(id) || Object.hasOwn(npcLife, id)) return true
  const number = npcIdNumber(id)
  return number !== undefined && safeInt(Number(number), 1) && Number(number) < nextNpcId
}

function validMilestone(value: unknown, worldTime: number) {
  return exactShape(value, ['id', 'at', 'text']) && shortString(value.id, 128, 1) && safeInt(value.at) && value.at <= worldTime
    && shortString(value.text, 500, 1)
}

function validMemory(value: unknown, worldTime: number, validActor: (id: string) => boolean) {
  return exactShape(value, ['kind', 'actorId', 'at', 'detail']) && enumValue(value.kind, memoryKinds)
    && shortString(value.actorId, 128, 1) && validActor(value.actorId) && safeInt(value.at) && value.at <= worldTime
    && shortString(value.detail, 1000, 1)
}

function validCounts(value: unknown, keys: string[], maximum = Number.MAX_SAFE_INTEGER) {
  return exactShape(value, keys) && Object.values(value).every(count => safeInt(count, 0, maximum))
}

function validLife(value: unknown, s: GameState, version: 2 | 3): value is WorldLife {
  if (!exactShape(value, ['canon', 'openingSeen', 'characters', 'npcs', 'properties', 'settlementMemories', 'worldMemories', 'arcs', 'requests', 'news', 'director'])) return false
  if (value.canon !== 'OAKVALE_LIFE_EMERGENCE' || typeof value.openingSeen !== 'boolean' || !object(value.characters) || !object(value.npcs)) return false
  const savedNpcs = value.npcs

  const characterIds = new Set(s.characters.map(character => character.id))
  const npcIds = new Set(s.npcs.map(npc => npc.id))
  const characterEntries = entries(value.characters), npcEntries = entries(value.npcs)
  if (characterEntries.length !== s.characters.length || characterEntries.some(([id]) => !characterIds.has(id))
    || npcEntries.length > 1000 || s.npcs.some(npc => !Object.hasOwn(savedNpcs, npc.id))) return false
  for (const [id, npcLife] of npcEntries) {
    const number = npcIdNumber(id)
    if (number === undefined || !safeInt(Number(number), 1) || Number(number) >= s.nextNpcId || !object(npcLife)) return false
    if (!npcIds.has(id) && !characterIds.has(id) && npcLife.featured !== true) return false
  }

  const actorExists = (id: string) => validWorldEntityId(id, characterIds, value.npcs as Record<string, unknown>, s.nextNpcId)
  const allowedIdentityKinds = version === 2 ? legacyIdentityKinds : identityKinds
  const characterShape = ['origin', 'generation', 'identities', 'actions', 'reputation', 'reputationHistory', 'milestones']
  for (const [id, life] of characterEntries) {
    if (!exactShape(life, characterShape) || !enumValue(life.origin, originKinds)
      || !safeInt(life.generation, 1, s.characters.length) || !Array.isArray(life.identities) || life.identities.length < 1 || life.identities.length > allowedIdentityKinds.length
      || !life.identities.every(identity => enumValue(identity, allowedIdentityKinds)) || new Set(life.identities).size !== life.identities.length
      || !validCounts(life.actions, version === 2 ? legacySkillIds : skillIds) || !boundedNumber(life.reputation, REPUTATION_BOUNDS.min, REPUTATION_BOUNDS.max)
      || !Array.isArray(life.reputationHistory) || life.reputationHistory.length > IDENTITY_LIMITS.reputationHistory
      || !life.reputationHistory.every(record => exactShape(record, ['at', 'delta', 'reason']) && safeInt(record.at) && record.at <= s.worldTime
        && boundedNumber(record.delta, -200, 200) && shortString(record.reason, 500, 1))
      || !Array.isArray(life.milestones) || life.milestones.length > IDENTITY_LIMITS.milestones
      || !life.milestones.every(milestone => validMilestone(milestone, s.worldTime))) return false
    if (id.length > 128) return false
  }

  const npcShape = ['traits', 'career', 'careerJob', 'featured', 'concern', 'memories', 'milestones']
  const visitorShape = ['kind', 'until']
  for (const [id, life] of npcEntries) {
    if (!exactShape(life, npcShape, ['visitor']) || !Array.isArray(life.traits) || life.traits.length < 1 || life.traits.length > traitKinds.length
      || !life.traits.every(trait => enumValue(trait, traitKinds)) || new Set(life.traits).size !== life.traits.length
      || !enumValue(life.career, careerKinds) || typeof life.careerJob !== 'string' || !Object.hasOwn(JOBS, life.careerJob) || typeof life.featured !== 'boolean'
      || !shortString(life.concern, 500) || !Array.isArray(life.memories) || life.memories.length > NPC_LIFE_LIMITS.memories
      || !life.memories.every(memory => validMemory(memory, s.worldTime, actorExists))
      || !Array.isArray(life.milestones) || life.milestones.length > NPC_LIFE_LIMITS.milestones
      || !life.milestones.every(milestone => validMilestone(milestone, s.worldTime))) return false
    if (Object.hasOwn(life, 'visitor') && (!exactShape(life.visitor, visitorShape) || !enumValue(life.visitor.kind, visitorKinds) || !safeInt(life.visitor.until))) return false
    const npc = s.npcs.find(candidate => candidate.id === id)
    if (npc && life.careerJob !== npc.job) return false
  }

  if (!Array.isArray(value.properties) || value.properties.length > s.characters.length * 3
    || !Array.isArray(value.settlementMemories) || value.settlementMemories.length > OWNERSHIP_MEMORY_LIMIT
    || !value.settlementMemories.every(memory => validMemory(memory, s.worldTime, actorExists))
    || !Array.isArray(value.worldMemories) || value.worldMemories.length > OWNERSHIP_MEMORY_LIMIT
    || !value.worldMemories.every(memory => validMemory(memory, s.worldTime, actorExists))) return false
  const propertyIds = new Set<string>(), ownerKinds = new Set<string>()
  for (const property of value.properties) {
    if (!exactShape(property, ['id', 'kind', 'ownerId', 'acquiredAt', 'position', 'storage', 'foodSupplied', 'suppliedDay', 'suppliedToday'])
      || !shortString(property.id, 128, 1) || propertyIds.has(property.id)
      || !enumValue(property.kind, ['home', 'land', 'farmBusiness']) || !shortString(property.ownerId, 128, 1) || !characterIds.has(property.ownerId)
      || !safeInt(property.acquiredAt) || property.acquiredAt > s.worldTime || !validPosition(property.position)
      || !validCounts(property.storage, itemIds, STORAGE_PER_ITEM_LIMIT)
      || !safeInt(property.foodSupplied) || !safeInt(property.suppliedDay, 0, Math.floor(s.worldTime / 1440))
      || !safeInt(property.suppliedToday, 0, FARM_BUSINESS_DAILY_FOOD_LIMIT) || property.foodSupplied < property.suppliedToday
      || (property.kind !== 'farmBusiness' && (property.foodSupplied !== 0 || property.suppliedToday !== 0))) return false
    const ownerKind = `${property.ownerId}:${property.kind}`
    if (ownerKinds.has(ownerKind)) return false
    propertyIds.add(property.id); ownerKinds.add(ownerKind)
  }

  if (!Array.isArray(value.arcs) || value.arcs.length > 1000) return false
  const arcIds = new Set<string>()
  for (const arc of value.arcs) {
    if (!exactShape(arc, ['id', 'kind', 'stage', 'startedAt', 'stageAt', 'resolved', 'outcome', 'participants'])
      || !shortString(arc.id, 128, 1) || arcIds.has(arc.id) || !enumValue(arc.kind, ['road', 'food', 'iron'])
      || !enumValue(arc.stage, ['signal', 'development', 'reaction', 'outcome', 'consequence'])
      || !safeInt(arc.startedAt) || !safeInt(arc.stageAt) || arc.startedAt > arc.stageAt || arc.stageAt > s.worldTime
      || typeof arc.resolved !== 'boolean' || !enumValue(arc.outcome, ['pending', 'helped', 'ignored'])
      || !Array.isArray(arc.participants) || arc.participants.length > 1000
      || !arc.participants.every(id => shortString(id, 128, 1) && actorExists(id)) || new Set(arc.participants).size !== arc.participants.length) return false
    arcIds.add(arc.id)
  }

  if (!Array.isArray(value.requests) || value.requests.length > 100 || !Array.isArray(value.news) || value.news.length > 100) return false
  const requestIds = new Set<string>()
  for (const request of value.requests) {
    if (!exactShape(request, ['id', 'kind', 'npcId', 'arcId', 'createdAt', 'expiresAt', 'status', 'amount', 'progress'])
      || !shortString(request.id, 128, 1) || requestIds.has(request.id) || !enumValue(request.kind, ['food', 'hunt', 'iron', 'medicine'])
      || !(request.npcId === null || (shortString(request.npcId, 128, 1) && actorExists(request.npcId)))
      || !(request.arcId === null || (shortString(request.arcId, 128, 1) && arcIds.has(request.arcId)))
      || !safeInt(request.createdAt) || request.createdAt > s.worldTime || !safeInt(request.expiresAt) || request.expiresAt < request.createdAt
      || !enumValue(request.status, ['open', 'completed', 'expired']) || !safeInt(request.amount, 0, 100000)
      || !safeInt(request.progress, 0, Number(request.amount))) return false
    requestIds.add(request.id)
  }
  const newsIds = new Set<string>()
  for (const news of value.news) {
    if (!exactShape(news, ['id', 'at', 'scope', 'text']) || !shortString(news.id, 128, 1) || newsIds.has(news.id)
      || !safeInt(news.at) || news.at > s.worldTime || !enumValue(news.scope, ['local', 'regional', 'rumor', 'major'])
      || !shortString(news.text, 1000, 1)) return false
    newsIds.add(news.id)
  }

  const director = value.director
  if (!exactShape(director, ['lastEventAt', 'quietUntil', 'cooldowns', 'recentMajor', 'recentCrises', 'lastPlayerActivity',
    'stability', 'tradePenalty', 'ironReserve', 'sequence'])
    || !safeInt(director.lastEventAt) || director.lastEventAt > s.worldTime || !safeInt(director.quietUntil)
    || !safeInt(director.lastPlayerActivity) || director.lastPlayerActivity > s.worldTime
    || !object(director.cooldowns) || entries(director.cooldowns).length > 100
    || !entries(director.cooldowns).every(([key, at]) => shortString(key, 128, 1) && safeInt(at))
    || !Array.isArray(director.recentMajor) || director.recentMajor.length > 100 || !director.recentMajor.every(at => safeInt(at) && at <= s.worldTime)
    || !Array.isArray(director.recentCrises) || director.recentCrises.length > 100 || !director.recentCrises.every(at => safeInt(at) && at <= s.worldTime)
    || !boundedNumber(director.stability, 0, 100) || !boundedNumber(director.tradePenalty, 0, 100000)
    || !boundedNumber(director.ironReserve, 0, 100000) || !safeInt(director.sequence)) return false

  return true
}

export function serialize(state: GameState, now = Date.now()) {
  return JSON.stringify({ ...state, lastSavedAt: now })
}

export function deserialize(raw: string): { state: GameState; lastSavedAt: number } {
  const value: unknown = JSON.parse(raw)
  if (!object(value) || (value.saveVersion !== 1 && value.saveVersion !== 2 && value.saveVersion !== CONFIG.saveVersion)) throw new Error('存檔版本不支援。原始存檔已保留。')
  if (typeof value.lastSavedAt !== 'number' || !Number.isFinite(value.lastSavedAt) || value.lastSavedAt < 0) {
    throw new Error('存檔資料不完整。原始存檔已保留，請確認後重建世界。')
  }
  const { lastSavedAt, ...stateData } = value
  if (value.saveVersion === 1) {
    if (!validBase(stateData, 1)) throw new Error('存檔資料不完整。原始存檔已保留，請確認後重建世界。')
    const state = stateData as unknown as GameState
    if (Object.hasOwn(stateData, 'reward')) throw new Error('存檔資料不完整。原始存檔已保留。')
    // initializeLife uses a dedicated stream and must not consume the preserved V1 RNG.
    for (const actor of [...state.characters, ...state.npcs]) actor.skills.smithing = { level: 1, exp: 0 }
    initializeLife(state, true)
    state.reward = emptyReward()
    state.saveVersion = CONFIG.saveVersion
    return { state, lastSavedAt }
  }
  const sourceVersion = value.saveVersion as 2 | 3
  if (!validBase(stateData, sourceVersion) || !validLife(stateData.life, stateData as unknown as GameState, sourceVersion)) {
    throw new Error('存檔資料不完整。原始存檔已保留，請確認後重建世界。')
  }
  const state = stateData as unknown as GameState
  if (sourceVersion === 2) {
    if (Object.hasOwn(stateData, 'reward') && !validateRewardV1(stateData.reward, state)) {
      throw new Error('存檔資料不完整。原始存檔已保留。')
    }
    for (const actor of [...state.characters, ...state.npcs]) actor.skills.smithing = { level: 1, exp: 0 }
    for (const life of Object.values(state.life.characters)) life.actions.smithing = 0
    state.reward = Object.hasOwn(stateData, 'reward') ? migrateRewardV1(stateData.reward) : emptyReward()
    state.saveVersion = CONFIG.saveVersion
    return { state, lastSavedAt }
  }
  if (!Object.hasOwn(stateData, 'reward') || !validateReward(stateData.reward, state)) {
    throw new Error('存檔資料不完整。原始存檔已保留。')
  }
  return { state, lastSavedAt }
}
