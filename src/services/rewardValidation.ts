import { AFFIXES, BOSS_VARIANTS, ITEM_BASES, MATERIALS, MONSTER_TRAITS, RARITIES, WOLF_MONSTERS } from '../data/rewards'
import type { FamilyEncounter, ItemAffix, ItemBaseId, ItemInstance, RewardState } from '../domain/reward'
import type { GameState } from '../domain/types'
import { maximumAffixTier, rolledItemStats } from '../engine/gearStats'

const rewardKeys = ['schemaVersion', 'nextInstanceId', 'instances', 'equipped', 'materials', 'collection', 'wolfBossDefeatedAt', 'wolfBossForm']
const instanceKeys = ['instanceId', 'ownerId', 'baseId', 'level', 'material', 'rarity', 'rolledStats', 'affixes', 'specialTrait', 'provenance']
const statsKeys = ['attack', 'defense', 'critical', 'penetration', 'bleed', 'block', 'reduction']
const collectionKeys = ['seen', 'defeated', 'bases', 'materials', 'bosses', 'rareBases']
const encounterKeys = ['definitionId', 'traits', 'variant', 'turn', 'formedAt', 'context', 'howlActive']

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!record(value)) return false
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every(key => Object.hasOwn(value, key))
}

function catalogKey<T extends object>(catalog: T, value: unknown): value is keyof T & string {
  return typeof value === 'string' && Object.hasOwn(catalog, value)
}

function safeInt(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
}

function bounded(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
}

function characterMap(state: GameState): Map<string, Record<string, unknown>> | null {
  const rawState: unknown = state
  if (!record(rawState) || !Array.isArray(rawState.characters)) return null
  const result = new Map<string, Record<string, unknown>>()
  for (const candidate of rawState.characters) {
    if (!record(candidate) || typeof candidate.id !== 'string' || !candidate.id || result.has(candidate.id)) return null
    result.set(candidate.id, candidate)
  }
  return result
}

function validAffixes(value: unknown, baseId: ItemBaseId, rarityId: keyof typeof RARITIES, level: number): value is ItemAffix[] {
  const base = ITEM_BASES[baseId]
  const rarity = RARITIES[rarityId]
  if (!Array.isArray(value) || value.length !== rarity.affixCount) return false
  const ids = new Set<string>()
  for (const candidate of value) {
    if (!exactKeys(candidate, ['id', 'tier', 'value']) || !catalogKey(AFFIXES, candidate.id)) return false
    const affix = AFFIXES[candidate.id]
    if (ids.has(candidate.id) || !base.affixes.some(allowed => allowed === candidate.id) || !affix.slots.some(slot => slot === base.slot)
      || !safeInt(candidate.tier, 1, maximumAffixTier(level, rarityId)) || candidate.tier > affix.tiers.length
      || !safeInt(candidate.value, 1) || candidate.value !== affix.tiers[candidate.tier - 1]) return false
    ids.add(candidate.id)
  }
  return true
}

function validProvenance(value: unknown, rarityId: keyof typeof RARITIES, characters: Map<string, Record<string, unknown>>, worldTime: number): boolean {
  if (value === null) return true
  if (rarityId !== 'legendary' || !exactKeys(value, ['createdBy', 'createdAt', 'bossSource', 'materialSource'])) return false
  const creatorValid = value.createdBy === null || (typeof value.createdBy === 'string' && characters.has(value.createdBy))
  const bossValid = value.bossSource === null || (catalogKey(WOLF_MONSTERS, value.bossSource) && WOLF_MONSTERS[value.bossSource].rank === 'boss')
  const materialValid = value.materialSource === null || catalogKey(MATERIALS, value.materialSource)
  return creatorValid && safeInt(value.createdAt) && value.createdAt <= worldTime && bossValid && materialValid
}

function validInstance(
  value: unknown,
  characters: Map<string, Record<string, unknown>>,
  nextInstanceNumber: number,
  worldTime: number,
): value is ItemInstance {
  if (!exactKeys(value, instanceKeys) || typeof value.instanceId !== 'string' || typeof value.ownerId !== 'string'
    || !characters.has(value.ownerId) || !catalogKey(ITEM_BASES, value.baseId) || !catalogKey(RARITIES, value.rarity)
    || !safeInt(value.level, 1, 100) || !(value.material === null || catalogKey(MATERIALS, value.material))) return false

  const instanceMatch = /^item-([1-9]\d*)$/.exec(value.instanceId)
  if (!instanceMatch) return false
  const instanceNumber = Number(instanceMatch[1])
  if (!safeInt(instanceNumber, 1) || instanceNumber >= nextInstanceNumber) return false

  const base = ITEM_BASES[value.baseId]
  if (value.specialTrait !== null && (value.specialTrait !== 'moonHunter' || value.rarity !== 'legendary'
    || base.slot !== 'weapon' || !RARITIES[value.rarity].specialEligible)) return false
  if (value.provenance !== null && value.rarity !== 'legendary') return false
  if (!validProvenance(value.provenance, value.rarity, characters, worldTime)) return false
  if (!validAffixes(value.affixes, value.baseId, value.rarity, value.level)) return false
  const stats = value.rolledStats
  if (!exactKeys(stats, statsKeys) || !statsKeys.every(key => safeInt(stats[key], 0))) return false

  try {
    const expected = rolledItemStats(value.baseId, value.level, value.affixes)
    return statsKeys.every(key => stats[key] === expected[key as keyof typeof expected])
  } catch {
    return false
  }
}

function uniqueCatalogArray(value: unknown, catalog: readonly string[]): value is string[] {
  if (!Array.isArray(value) || value.length > catalog.length) return false
  const seen = new Set<string>()
  for (const id of value) {
    if (typeof id !== 'string' || !catalog.includes(id) || seen.has(id)) return false
    seen.add(id)
  }
  return true
}

function sameEncounter(left: FamilyEncounter, right: FamilyEncounter): boolean {
  if (left.definitionId !== right.definitionId || left.variant !== right.variant || left.turn !== right.turn
    || left.formedAt !== right.formedAt || left.howlActive !== right.howlActive
    || left.traits.length !== right.traits.length
    || !left.traits.every((trait, index) => trait === right.traits[index])) return false
  return left.context.population === right.context.population && left.context.hunted === right.context.hunted
    && left.context.safety === right.context.safety
}

function validEncounterShape(value: unknown, worldTime: number): value is FamilyEncounter {
  if (!exactKeys(value, encounterKeys) || !catalogKey(WOLF_MONSTERS, value.definitionId)
    || !Array.isArray(value.traits) || !safeInt(value.turn) || !safeInt(value.formedAt) || value.formedAt > worldTime
    || typeof value.howlActive !== 'boolean' || !exactKeys(value.context, ['population', 'hunted', 'safety'])) return false

  const definition = WOLF_MONSTERS[value.definitionId]
  const traitCount = value.traits.length
  const bounds = definition.rank === 'normal' ? [0, 1] : definition.rank === 'elite' ? [1, 2] : definition.rank === 'miniBoss' ? [2, 3] : [1, 2]
  if (traitCount < bounds[0]! || traitCount > bounds[1]! || traitCount > Object.keys(MONSTER_TRAITS).length) return false
  const traits = new Set<string>()
  for (const trait of value.traits) {
    if (!catalogKey(MONSTER_TRAITS, trait) || traits.has(trait)) return false
    traits.add(trait)
  }

  const validVariant = definition.rank === 'boss' ? catalogKey(BOSS_VARIANTS, value.variant) : value.variant === null
  return validVariant && safeInt(value.context.population, 0, 100) && safeInt(value.context.hunted)
    && bounded(value.context.safety, 0, 100)
}

/** Strict guard for a persisted reward extension. It never mutates state or throws on malformed values. */
export function validateReward(value: unknown, state: GameState): value is RewardState {
  if (!exactKeys(value, rewardKeys) || value.schemaVersion !== 1 || !safeInt(value.nextInstanceId, 1, Number.MAX_SAFE_INTEGER - 1)
    || !Array.isArray(value.instances) || !record(value.equipped) || !record(value.materials)
    || !exactKeys(value.collection, collectionKeys)) return false

  const rawState: unknown = state
  if (!record(rawState)) return false
  const characters = characterMap(state)
  if (!characters) return false
  const worldTime = rawState.worldTime
  if (!safeInt(worldTime)) return false

  const seenInstanceIds = new Set<string>()
  const instanceById = new Map<string, ItemInstance>()
  for (const candidate of value.instances) {
    if (!validInstance(candidate, characters, value.nextInstanceId, worldTime) || seenInstanceIds.has(candidate.instanceId)) return false
    seenInstanceIds.add(candidate.instanceId)
    instanceById.set(candidate.instanceId, candidate)
  }

  for (const [ownerId, stacks] of Object.entries(value.materials)) {
    if (!characters.has(ownerId) || !exactKeys(stacks, Object.keys(MATERIALS))
      || !Object.values(stacks).every(amount => safeInt(amount))) return false
  }

  const equippedInstanceIds = new Set<string>()
  for (const [ownerId, slots] of Object.entries(value.equipped)) {
    const character = characters.get(ownerId)
    if (!character || !exactKeys(slots, ['weapon', 'armor']) || !record(character.equipment)) return false
    for (const slot of ['weapon', 'armor'] as const) {
      const instanceId = slots[slot]
      if (instanceId === null) continue
      if (typeof instanceId !== 'string' || equippedInstanceIds.has(instanceId)) return false
      const instance = instanceById.get(instanceId)
      if (!instance || instance.ownerId !== ownerId || ITEM_BASES[instance.baseId].slot !== slot
        || character.equipment[slot] !== null) return false
      equippedInstanceIds.add(instanceId)
    }
  }

  const collection = value.collection
  const allMonsterIds = Object.keys(WOLF_MONSTERS)
  const bossIds = Object.values(WOLF_MONSTERS).filter(monster => monster.rank === 'boss').map(monster => monster.id)
  if (!uniqueCatalogArray(collection.seen, allMonsterIds) || !uniqueCatalogArray(collection.defeated, allMonsterIds)
    || !uniqueCatalogArray(collection.bases, Object.keys(ITEM_BASES))
    || !uniqueCatalogArray(collection.materials, Object.keys(MATERIALS))
    || !uniqueCatalogArray(collection.bosses, bossIds)
    || !uniqueCatalogArray(collection.rareBases, Object.keys(ITEM_BASES))) return false
  if (value.wolfBossDefeatedAt !== null && (!safeInt(value.wolfBossDefeatedAt) || value.wolfBossDefeatedAt > worldTime)) return false
  if (value.wolfBossForm === null) return true
  if (!validEncounterShape(value.wolfBossForm, worldTime)) return false
  return value.wolfBossForm.definitionId === 'wolfKing' && value.wolfBossForm.turn === 0 && !value.wolfBossForm.howlActive
}

/** Validates a family snapshot against its containing combat without re-forming it. */
export function validFamilyEncounter(snapshot: unknown, state: GameState): snapshot is FamilyEncounter {
  const stateRecord: unknown = state
  if (!record(stateRecord) || !safeInt(stateRecord.worldTime) || !validEncounterShape(snapshot, stateRecord.worldTime)) return false
  const combat = stateRecord.combat
  if (!record(combat)) return false
  const combatEncounter = combat.familyEncounter
  if (combat.monsterId !== 'wolf' || combat.dungeon !== false
    || !validEncounterShape(combatEncounter, stateRecord.worldTime)
    || !sameEncounter(snapshot, combatEncounter)) return false
  const definition = WOLF_MONSTERS[snapshot.definitionId]
  return combat.elite === (definition.rank === 'elite')
}
