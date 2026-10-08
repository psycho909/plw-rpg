import { AFFIXES, BOSS_VARIANTS, ITEM_BASES, LEGACY_AFFIXES, LEGACY_ITEM_BASES, LEGACY_MATERIALS, MATERIALS, MONSTER_TRAITS, RARITIES, WOLF_ENCOUNTER_RULES, WOLF_MONSTERS } from '../data/rewards'
import { CRAFTING_RECIPES, LEGACY_CRAFTING_RECIPES } from '../data/crafting'
import { CONTENT_FAMILIES, CONTENT_MONSTERS } from '../data/contentRegistry'
import type { AffixDefinition, ContentBossForm, ContentFamilyEncounter, FamilyEncounter, ItemAffix, ItemBaseDefinition, ItemBaseId, ItemInstance, RewardState } from '../domain/reward'
import type { GameState } from '../domain/types'
import { maximumAffixTier, rolledItemStats } from '../engine/gearStats'
import { resolveWolfCombatStats } from '../engine/wolfFamily'

const rewardKeys = ['schemaVersion', 'nextInstanceId', 'instances', 'equipped', 'materials', 'collection', 'wolfBossDefeatedAt', 'wolfBossForm']
const rewardKeysV3 = [...rewardKeys, 'bossForms']
const legacyInstanceKeys = ['instanceId', 'ownerId', 'baseId', 'level', 'material', 'rarity', 'rolledStats', 'affixes', 'specialTrait', 'provenance']
const instanceKeys = [...legacyInstanceKeys, 'craftProvenance']
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

function validAffixes(value: unknown, baseId: ItemBaseId, rarityId: keyof typeof RARITIES, level: number, version: 1 | 2 | 3): value is ItemAffix[] {
  const bases: Record<string, ItemBaseDefinition> = version === 3 ? ITEM_BASES : LEGACY_ITEM_BASES
  const affixes: Record<string, AffixDefinition> = version === 3 ? AFFIXES : LEGACY_AFFIXES
  const base = bases[baseId]
  const rarity = RARITIES[rarityId]
  const eligibleAffixCount = base.affixes.filter(id => affixes[id]?.slots.includes(base.slot)).length
  if (!Array.isArray(value) || value.length !== Math.min(rarity.affixCount, eligibleAffixCount)) return false
  const ids = new Set<string>()
  for (const candidate of value) {
    if (!exactKeys(candidate, ['id', 'tier', 'value']) || !catalogKey(affixes, candidate.id)) return false
    const affix = affixes[candidate.id]
    if (ids.has(candidate.id) || !base.affixes.some(allowed => allowed === candidate.id) || !affix.slots.some(slot => slot === base.slot)
      || !safeInt(candidate.tier, 1, maximumAffixTier(level, rarityId)) || candidate.tier > affix.tiers.length
      || !safeInt(candidate.value, 1) || candidate.value !== affix.tiers[candidate.tier - 1]) return false
    ids.add(candidate.id)
  }
  return true
}

function validProvenance(value: unknown, rarityId: keyof typeof RARITIES, characters: Map<string, Record<string, unknown>>, worldTime: number, version: 1 | 2 | 3): boolean {
  if (value === null) return true
  if (rarityId !== 'legendary' || !exactKeys(value, ['createdBy', 'createdAt', 'bossSource', 'materialSource'])) return false
  const creatorValid = value.createdBy === null || (typeof value.createdBy === 'string' && characters.has(value.createdBy))
  const bossValid = value.bossSource === null || (catalogKey(WOLF_MONSTERS, value.bossSource) && WOLF_MONSTERS[value.bossSource].rank === 'boss')
    || (version === 3 && catalogKey(CONTENT_MONSTERS, value.bossSource) && CONTENT_MONSTERS[value.bossSource].rank === 'boss')
  const materials = version === 3 ? MATERIALS : LEGACY_MATERIALS
  const materialValid = value.materialSource === null || catalogKey(materials, value.materialSource)
  return creatorValid && safeInt(value.createdAt) && value.createdAt <= worldTime && bossValid && materialValid
}

function validCraftProvenance(value: unknown, item: Record<string, unknown>, characters: Map<string, Record<string, unknown>>, worldTime: number, version: 1 | 2 | 3): boolean {
  if (value === null) return true
  const recipes = version === 3 ? CRAFTING_RECIPES : LEGACY_CRAFTING_RECIPES
  const materials = version === 3 ? MATERIALS : LEGACY_MATERIALS
  if (!exactKeys(value, ['recipeId', 'createdBy', 'createdAt', 'influenceMaterial', 'masterpiece'])
    || !catalogKey(recipes, value.recipeId)) return false
  const recipe = recipes[value.recipeId]
  const creatorValid = typeof value.createdBy === 'string' && characters.has(value.createdBy)
  const influenceValid = value.influenceMaterial === null
    || (catalogKey(materials, value.influenceMaterial) && recipe.allowedBiasMaterials.includes(value.influenceMaterial))
  return creatorValid && safeInt(value.createdAt) && value.createdAt <= worldTime && influenceValid && value.influenceMaterial === item.material
    && (value.masterpiece === false || (value.masterpiece === true && recipe.masterpieceRules !== undefined))
    && item.baseId === recipe.outputBase && item.level === recipe.outputLevel
}

function validInstance(
  value: unknown,
  characters: Map<string, Record<string, unknown>>,
  nextInstanceNumber: number,
  worldTime: number,
  version: 1 | 2 | 3,
): boolean {
  const bases = version === 3 ? ITEM_BASES : LEGACY_ITEM_BASES
  const materials = version === 3 ? MATERIALS : LEGACY_MATERIALS
  if (!exactKeys(value, version === 1 ? legacyInstanceKeys : instanceKeys) || typeof value.instanceId !== 'string' || typeof value.ownerId !== 'string'
    || !characters.has(value.ownerId) || !catalogKey(bases, value.baseId) || !catalogKey(RARITIES, value.rarity)
    || !safeInt(value.level, 1, 100)) return false

  const instanceMatch = /^item-([1-9]\d*)$/.exec(value.instanceId)
  if (!instanceMatch) return false
  const instanceNumber = Number(instanceMatch[1])
  if (!safeInt(instanceNumber, 1) || instanceNumber >= nextInstanceNumber) return false

  const base = bases[value.baseId]
  if (value.specialTrait !== null && (value.specialTrait !== 'moonHunter' || value.rarity !== 'legendary'
    || base.slot !== 'weapon' || !RARITIES[value.rarity].specialEligible)) return false
  if (value.provenance !== null && value.rarity !== 'legendary') return false
  if (!(value.material === null || catalogKey(materials, value.material))) return false
  if (!validProvenance(value.provenance, value.rarity, characters, worldTime, version)) return false
  if (version >= 2 && !validCraftProvenance(value.craftProvenance, value, characters, worldTime, version)) return false
  if (version >= 2 && value.craftProvenance !== null && value.provenance !== null
    && (!record(value.provenance) || value.provenance.bossSource !== null)) return false
  if (!validAffixes(value.affixes, value.baseId, value.rarity, value.level, version)) return false
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
  if (left.definitionId !== right.definitionId || left.variant !== right.variant || left.formedAt !== right.formedAt
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
  if (traitCount < bounds[0]! || traitCount > bounds[1]! || traitCount > Object.keys(MONSTER_TRAITS).length
    || value.turn > worldTime - value.formedAt) return false
  const traits = new Set<string>()
  for (const trait of value.traits) {
    if (!catalogKey(MONSTER_TRAITS, trait) || traits.has(trait)) return false
    traits.add(trait)
  }
  if (definition.rank === 'miniBoss' && (traitCount !== 2 || !traits.has('swift') || !traits.has('armored'))) return false

  const validVariant = definition.rank === 'boss' ? catalogKey(BOSS_VARIANTS, value.variant) : value.variant === null
  const expectedHowl = definition.core === 'howl' && value.turn % WOLF_ENCOUNTER_RULES.howlEvery === WOLF_ENCOUNTER_RULES.howlEvery - 1
  return validVariant && value.howlActive === expectedHowl && safeInt(value.context.population, 0, 100)
    && safeInt(value.context.hunted) && bounded(value.context.safety, 0, 100)
}

const contentEncounterKeys = ['familyId', 'definitionId', 'variantId', 'turn', 'formedAt', 'context']
const contentEncounterContextKeys = ['region', 'population', 'hunted', 'safety', 'threatLevel']
const regions = ['village', 'farmland', 'forest', 'mine', 'unknown']

function validContentEncounterShape(value: unknown, worldTime: number): value is ContentFamilyEncounter {
  if (!exactKeys(value, contentEncounterKeys) || !catalogKey(CONTENT_MONSTERS, value.definitionId)
    || !catalogKey(CONTENT_FAMILIES, value.familyId) || !safeInt(value.turn) || !safeInt(value.formedAt)
    || value.formedAt > worldTime || value.turn > worldTime - value.formedAt
    || !exactKeys(value.context, contentEncounterContextKeys)) return false
  const monster = CONTENT_MONSTERS[value.definitionId]
  const family = CONTENT_FAMILIES[value.familyId]
  if (monster.familyId !== family.id || !regions.includes(String(value.context.region))
    || !family.regions.includes(value.context.region as never)) return false
  const validVariant = monster.rank === 'boss'
    ? monster.bossRules?.variants.some(variant => variant.id === value.variantId) === true
    : value.variantId === null
  return validVariant && safeInt(value.context.population, 0, 100) && safeInt(value.context.hunted)
    && bounded(value.context.safety, 0, 100) && safeInt(value.context.threatLevel, 1, 3)
}

function sameContentEncounter(left: ContentFamilyEncounter, right: ContentFamilyEncounter): boolean {
  return left.familyId === right.familyId && left.definitionId === right.definitionId && left.variantId === right.variantId
    && left.formedAt === right.formedAt && left.context.region === right.context.region
    && left.context.population === right.context.population && left.context.hunted === right.context.hunted
    && left.context.safety === right.context.safety && left.context.threatLevel === right.context.threatLevel
}

function validContentBossForms(value: unknown, worldTime: number): value is Record<string, ContentBossForm> {
  if (!record(value)) return false
  const bossIds = Object.values(CONTENT_MONSTERS).filter(monster => monster.rank === 'boss').map(monster => monster.id)
  if (Object.keys(value).length > bossIds.length) return false
  for (const [bossId, bossForm] of Object.entries(value)) {
    if (!bossIds.includes(bossId) || !record(bossForm)) return false
    if (bossForm.kind === 'frozenEncounter') {
      const encounter = bossForm.encounter
      if (!exactKeys(bossForm, ['kind', 'encounter']) || !validContentEncounterShape(encounter, worldTime)
        || encounter.definitionId !== bossId || encounter.turn !== 0) return false
    } else if (bossForm.kind === 'cooldownUntil') {
      if (!exactKeys(bossForm, ['kind', 'availableAt']) || !safeInt(bossForm.availableAt)) return false
    } else return false
  }
  return true
}

function validContentBossCooldowns(state: GameState): boolean {
  // Older Reward3 saves used these director keys; current boss defeats are stored in bossForms.
  const stateRecord: unknown = state
  if (!record(stateRecord) || !record(stateRecord.life) || !record(stateRecord.life.director)
    || !record(stateRecord.life.director.cooldowns)) return false
  for (const [key, at] of Object.entries(stateRecord.life.director.cooldowns)) {
    if (!key.startsWith('content-boss:')) continue
    const bossId = key.slice('content-boss:'.length)
    if (!catalogKey(CONTENT_MONSTERS, bossId) || CONTENT_MONSTERS[bossId].rank !== 'boss' || !safeInt(at)) return false
  }
  return true
}

function validateRewardVersion(value: unknown, state: GameState, version: 1 | 2 | 3): boolean {
  const expectedRewardKeys = version === 3 ? rewardKeysV3 : rewardKeys
  if (!exactKeys(value, expectedRewardKeys) || value.schemaVersion !== version || !safeInt(value.nextInstanceId, 1, Number.MAX_SAFE_INTEGER - 1)
    || !Array.isArray(value.instances) || !record(value.equipped) || !record(value.materials)
    || !exactKeys(value.collection, collectionKeys)) return false

  const rawState: unknown = state
  if (!record(rawState)) return false
  const characters = characterMap(state)
  if (!characters) return false
  const worldTime = rawState.worldTime
  if (!safeInt(worldTime)) return false

  const seenInstanceIds = new Set<string>()
  const instanceById = new Map<string, Record<string, unknown>>()
  for (const candidate of value.instances) {
    if (!record(candidate) || !validInstance(candidate, characters, value.nextInstanceId, worldTime, version)
      || typeof candidate.instanceId !== 'string' || seenInstanceIds.has(candidate.instanceId)) return false
    seenInstanceIds.add(candidate.instanceId)
    instanceById.set(candidate.instanceId, candidate)
  }

  const bases = version === 3 ? ITEM_BASES : LEGACY_ITEM_BASES
  const materialsCatalog = version === 3 ? MATERIALS : LEGACY_MATERIALS
  for (const [ownerId, stacks] of Object.entries(value.materials)) {
    if (!characters.has(ownerId) || !exactKeys(stacks, Object.keys(materialsCatalog))
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
      if (!instance || instance.ownerId !== ownerId || !catalogKey(bases, instance.baseId) || bases[instance.baseId].slot !== slot
        || character.equipment[slot] !== null) return false
      equippedInstanceIds.add(instanceId)
    }
  }

  const collection = value.collection
  const allMonsterIds = version === 3 ? [...Object.keys(WOLF_MONSTERS), ...Object.keys(CONTENT_MONSTERS)] : Object.keys(WOLF_MONSTERS)
  const bossIds = [
    ...Object.values(WOLF_MONSTERS).filter(monster => monster.rank === 'boss').map(monster => monster.id),
    ...(version === 3 ? Object.values(CONTENT_MONSTERS).filter(monster => monster.rank === 'boss').map(monster => monster.id) : []),
  ]
  if (!uniqueCatalogArray(collection.seen, allMonsterIds) || !uniqueCatalogArray(collection.defeated, allMonsterIds)
    || !uniqueCatalogArray(collection.bases, Object.keys(bases))
    || !uniqueCatalogArray(collection.materials, Object.keys(materialsCatalog))
    || !uniqueCatalogArray(collection.bosses, bossIds)
    || !uniqueCatalogArray(collection.rareBases, Object.keys(bases))) return false
  if (value.wolfBossDefeatedAt !== null && (!safeInt(value.wolfBossDefeatedAt) || value.wolfBossDefeatedAt > worldTime)) return false
  const validWolfForm = value.wolfBossForm === null || (validEncounterShape(value.wolfBossForm, worldTime)
    && value.wolfBossForm.definitionId === 'wolfKing' && value.wolfBossForm.turn === 0 && !value.wolfBossForm.howlActive)
  if (!validWolfForm) return false
  return version !== 3 || (validContentBossForms(value.bossForms, worldTime) && validContentBossCooldowns(state))
}

/** Strict guard for a persisted V1 reward extension. It never mutates state or throws. */
export function validateRewardV1(value: unknown, state: GameState): boolean {
  return validateRewardVersion(value, state, 1)
}

/** Strict guard for the legacy V2 reward extension. It never mutates state or throws. */
export function validateRewardV2(value: unknown, state: GameState): boolean {
  return validateRewardVersion(value, state, 2)
}

/** Strict guard for the current V3 reward extension. It never mutates state or throws. */
export function validateReward(value: unknown, state: GameState): value is RewardState {
  return validateRewardVersion(value, state, 3)
}

/** Validates a consumed item snapshot with the same strict facts as a live reward instance. */
export function validateRewardInstanceSnapshot(value: unknown, state: GameState): value is ItemInstance {
  const characters = characterMap(state)
  const rawState: unknown = state
  if (!characters || !record(rawState) || !record(rawState.reward) || !safeInt(rawState.worldTime)
    || !safeInt(rawState.reward.nextInstanceId, 1, Number.MAX_SAFE_INTEGER - 1)) return false
  return validInstance(value, characters, rawState.reward.nextInstanceId, rawState.worldTime, 3)
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
    || !bounded(combat.hp, 0, Number.MAX_SAFE_INTEGER) || !bounded(combat.maxHp, 1, Number.MAX_SAFE_INTEGER)
    || !sameEncounter(snapshot, combatEncounter)) return false
  const definition = WOLF_MONSTERS[snapshot.definitionId]
  const derived = resolveWolfCombatStats(snapshot)
  if (combat.hp > combat.maxHp || combat.maxHp !== derived.maxHp || combat.attack !== derived.attack
    || combat.defense !== derived.defense || combat.exp !== derived.exp || combat.gold !== derived.gold
    || combat.elite !== derived.elite) return false

  if (definition.rank !== 'boss') return true
  const reward = stateRecord.reward
  if (!record(reward) || !validEncounterShape(reward.wolfBossForm, stateRecord.worldTime)) return false
  const form = reward.wolfBossForm
  return form.definitionId === 'wolfKing' && form.turn === 0 && !form.howlActive && sameEncounter(form, snapshot)
}

/** Validates an authored-family combat snapshot against the frozen reward form and derived stats. */
export function validContentFamilyEncounter(snapshot: unknown, state: GameState): snapshot is ContentFamilyEncounter {
  const stateRecord: unknown = state
  if (!record(stateRecord) || !safeInt(stateRecord.worldTime) || !validContentEncounterShape(snapshot, stateRecord.worldTime)) return false
  const combat = stateRecord.combat
  if (!record(combat) || combat.monsterId !== 'content-family' || combat.dungeon !== false
    || !validContentEncounterShape(combat.contentEncounter, stateRecord.worldTime)
    || !bounded(combat.hp, 0, Number.MAX_SAFE_INTEGER) || !bounded(combat.maxHp, 1, Number.MAX_SAFE_INTEGER)
    || !sameContentEncounter(snapshot, combat.contentEncounter)) return false
  const monster = CONTENT_MONSTERS[snapshot.definitionId]
  const stats = monster.stats
  if (combat.hp > combat.maxHp || combat.maxHp !== stats.hp || combat.attack !== stats.attack
    || combat.defense !== stats.defense || combat.exp !== stats.exp || combat.gold !== stats.gold
    || combat.elite !== (monster.rank === 'elite')) return false
  if (monster.rank !== 'boss') return true
  const reward = stateRecord.reward
  if (!record(reward) || !record(reward.bossForms)) return false
  const bossForm = reward.bossForms[monster.id]
  if (!record(bossForm) || !exactKeys(bossForm, ['kind', 'encounter']) || bossForm.kind !== 'frozenEncounter'
    || !validContentEncounterShape(bossForm.encounter, stateRecord.worldTime)) return false
  const form = bossForm.encounter as ContentFamilyEncounter
  return form.definitionId === monster.id && form.turn === 0 && sameContentEncounter(form, snapshot)
}
