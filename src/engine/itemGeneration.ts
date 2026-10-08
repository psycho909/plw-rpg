import { AFFIXES, ITEM_BASES, ITEM_GENERATION_RULES, LEGACY_MATERIALS, LOOT_TABLES, MATERIALS, RARITIES, WOLF_LOOT_RULES, WOLF_MONSTERS } from '../data/rewards'
import { CRAFTING_RECIPES } from '../data/crafting'
import { CONTENT_LOOT_TABLES, CONTENT_MONSTERS } from '../data/contentRegistry'
import type { AffixId, CraftGenerationContext, CraftRecipeId, ItemBaseId, ItemInstance, MaterialDefinition, MaterialId, MonsterDefinitionId, MonsterRank, RarityId } from '../domain/reward'
import type { GameState } from '../domain/types'
import { emit } from './events'
import { maximumAffixTier, rolledItemStats } from './gearStats'
import { random } from './random'

export interface GenerateItemOptions {
  baseId: ItemBaseId
  level: number
  material?: MaterialId | null
  bossSource?: string | null
  dropSource?: string | null
  context?: CraftGenerationContext
}

export interface AwardWolfLootOptions { definitionId: MonsterDefinitionId }
export interface AwardWolfLootResult { instance: ItemInstance | null; materials: Partial<Record<MaterialId, number>> }
export interface AwardContentLootOptions { definitionId: string }
export interface WolfRewardExpectation {
  definitionId: MonsterDefinitionId
  rank: MonsterRank
  exclusiveBase: ItemBaseId | null
  dropLevel: number
  gearChance: number
  rarityChances: Record<RarityId, number>
  guaranteedMaterials: Partial<Record<MaterialId, number>>
  chanceMaterials: Partial<Record<MaterialId, number>>
}

export interface CraftQualityProfile {
  floor: RarityId | null
  rarityWeights: Record<RarityId, number>
  nextFloor: RarityId | null
  nextFloorAtSmithing: number | null
}

/** Shared read-only craft preview and generation rule; ordinary loot keeps its existing pools. */
export function craftQualityProfile(recipeId: CraftRecipeId, smithingLevel: number | null): CraftQualityProfile {
  const recipe = CRAFTING_RECIPES[recipeId]
  const rarityIds = Object.keys(RARITIES) as RarityId[]
  const rarityWeights = Object.fromEntries(rarityIds.map(id => [id, RARITIES[id].weight])) as Record<RarityId, number>
  const { floorAtSmithing, minimumRarity } = recipe.qualityRules
  if (smithingLevel === null || smithingLevel < floorAtSmithing) {
    return { floor: null, rarityWeights, nextFloor: minimumRarity, nextFloorAtSmithing: floorAtSmithing }
  }

  const floorIndex = rarityIds.indexOf(minimumRarity)
  for (let index = 0; index < floorIndex; index++) {
    rarityWeights[minimumRarity] += rarityWeights[rarityIds[index]!]!
    rarityWeights[rarityIds[index]!] = 0
  }
  return { floor: minimumRarity, rarityWeights, nextFloor: null, nextFloorAtSmithing: null }
}

function catalogKey<T extends object>(catalog: T, value: unknown): value is keyof T & string {
  return typeof value === 'string' && Object.hasOwn(catalog, value)
}

function contentMonsterIsBoss(id: string) {
  return Object.hasOwn(CONTENT_MONSTERS, id) && CONTENT_MONSTERS[id]!.rank === 'boss'
}

function monsterIsBoss(id: string) {
  return (Object.hasOwn(WOLF_MONSTERS, id) && WOLF_MONSTERS[id as keyof typeof WOLF_MONSTERS]!.rank === 'boss')
    || contentMonsterIsBoss(id)
}

function isKnownMonster(id: string) {
  return Object.hasOwn(WOLF_MONSTERS, id) || Object.hasOwn(CONTENT_MONSTERS, id)
}

function monsterRank(id: string): MonsterRank | undefined {
  if (Object.hasOwn(WOLF_MONSTERS, id)) return WOLF_MONSTERS[id as keyof typeof WOLF_MONSTERS]!.rank
  return CONTENT_MONSTERS[id]?.rank
}

function bossExclusiveBase(id: string): string | null {
  if (Object.hasOwn(WOLF_MONSTERS, id) && WOLF_MONSTERS[id as keyof typeof WOLF_MONSTERS]!.rank === 'boss') {
    return WOLF_LOOT_RULES.bossExclusiveBase
  }
  const monster = CONTENT_MONSTERS[id]
  return monster?.rank === 'boss' ? monster.bossRules?.exclusiveEquipmentId ?? null : null
}

function rarityWeightsForDrop(id: string): Record<RarityId, number> {
  if (Object.hasOwn(WOLF_LOOT_RULES.profiles, id)) return WOLF_LOOT_RULES.profiles[id as keyof typeof WOLF_LOOT_RULES.profiles]!.rarityWeights
  const contentMonster = CONTENT_MONSTERS[id]
  if (contentMonster) return { ...contentMonster.lootProfile.rarityWeights }
  throw new RangeError('掉落來源無效。')
}

function weightedChoice<T extends string>(state: GameState, values: { value: T; weight: number }[]): T {
  const total = values.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = random(state) * total
  for (const entry of values) {
    roll -= entry.weight
    if (roll < 0) return entry.value
  }
  return values.at(-1)!.value
}

/** Pure, detached reward expectation for one wolf encounter target. Rates are fractions from 0 to 1. */
export function wolfRewardExpectation(definitionId: MonsterDefinitionId): WolfRewardExpectation {
  const definition = WOLF_MONSTERS[definitionId]
  const profile = WOLF_LOOT_RULES.profiles[definitionId]
  const table = LOOT_TABLES[definition.lootTable]
  const totalWeight = Object.values(profile.rarityWeights).reduce((sum, weight) => sum + weight, 0)
  const rarityChances = Object.fromEntries((Object.keys(RARITIES) as RarityId[])
    .map(rarity => [rarity, Number((profile.rarityWeights[rarity] / totalWeight).toPrecision(12))])) as Record<RarityId, number>
  const guaranteedMaterials: Partial<Record<MaterialId, number>> = {}
  for (const materialId of table.guaranteed) {
    guaranteedMaterials[materialId] = (guaranteedMaterials[materialId] ?? 0) + 1
  }
  if (definition.rank === 'boss') {
    guaranteedMaterials[table.bossGuaranteed] = (guaranteedMaterials[table.bossGuaranteed] ?? 0) + 1
  }
  const chanceMaterials: Partial<Record<MaterialId, number>> = {}
  if (WOLF_LOOT_RULES.hideChance > 0) chanceMaterials.wolfHide = WOLF_LOOT_RULES.hideChance
  if (definition.rank !== 'boss' && profile.rareMaterialChance > 0) {
    chanceMaterials[table.rare.materialId] = profile.rareMaterialChance
  }
  return {
    definitionId,
    rank: definition.rank,
    exclusiveBase: definition.rank === 'boss' ? WOLF_LOOT_RULES.bossExclusiveBase : null,
    dropLevel: profile.dropLevel,
    gearChance: definition.rank === 'normal' ? WOLF_LOOT_RULES.normalGearChance : 1,
    rarityChances,
    guaranteedMaterials,
    chanceMaterials,
  }
}

function availableInstanceSlot(state: GameState) {
  const owner = state.characters.find(character => character.id === state.activeCharacterId)
  const nextInstanceId = state.reward.nextInstanceId
  const instanceId = `item-${nextInstanceId}`
  if (!owner || !Number.isSafeInteger(state.worldTime) || state.worldTime < 0 || !Number.isSafeInteger(nextInstanceId)
    || nextInstanceId < 1 || nextInstanceId >= Number.MAX_SAFE_INTEGER - 1
    || !Array.isArray(state.reward.instances) || state.reward.instances.some(item => item.instanceId === instanceId)) {
    throw new RangeError('裝備編號或持有人狀態無效。')
  }
  return { ownerId: owner.id, instanceId, nextInstanceId }
}

function validateInput(state: GameState, options: GenerateItemOptions) {
  if (!state || !state.reward || !options || typeof options !== 'object' || Array.isArray(options)
    || Object.keys(options).some(key => !['baseId', 'level', 'material', 'bossSource', 'dropSource', 'context'].includes(key))) {
    throw new TypeError('無法產生裝備。')
  }
  const baseId = options.baseId
  if (!catalogKey(ITEM_BASES, baseId) || !Number.isSafeInteger(options.level) || options.level < 1 || options.level > 100) {
    throw new RangeError('裝備底材或等級無效。')
  }
  const material = options.material
  if (material !== undefined && material !== null && !catalogKey(MATERIALS, material)) throw new RangeError('裝備素材無效。')
  const bossSource = options.bossSource
  if (bossSource !== undefined && bossSource !== null
    && (!isKnownMonster(bossSource) || monsterRank(bossSource) !== 'boss')) {
    throw new RangeError('首領來源無效。')
  }
  const dropSource = options.dropSource
  if (dropSource !== undefined && dropSource !== null && !isKnownMonster(dropSource)) {
    throw new RangeError('掉落來源無效。')
  }
  if (dropSource && CONTENT_MONSTERS[dropSource] && !Object.hasOwn(CONTENT_LOOT_TABLES, CONTENT_MONSTERS[dropSource]!.lootTableId)) {
    throw new RangeError('掉落來源資料尚未完整。')
  }
  if (dropSource && bossSource && dropSource !== bossSource) throw new RangeError('掉落來源與首領來源不符。')
  const exclusiveSource = dropSource ?? bossSource
  if (exclusiveSource && Object.values(CONTENT_MONSTERS).some(monster => monster.bossRules?.exclusiveEquipmentId === baseId)
    && bossExclusiveBase(exclusiveSource) !== baseId) {
    throw new RangeError('首領專屬底材來源無效。')
  }
  if (baseId === WOLF_LOOT_RULES.bossExclusiveBase && exclusiveSource && bossExclusiveBase(exclusiveSource) !== baseId) {
    throw new RangeError('首領專屬底材來源無效。')
  }
  const hasContext = Object.hasOwn(options, 'context')
  let craftProvenance: ItemInstance['craftProvenance'] = null
  let craftRecipeId: CraftRecipeId | null = null
  let craftSmithingLevel: number | null = null
  let craftMasterpieceChance = 0
  if (hasContext) {
    const context = options.context
    if (!context || typeof context !== 'object' || Array.isArray(context)
      || Object.keys(context).length !== 2 || !Object.hasOwn(context, 'kind') || !Object.hasOwn(context, 'recipeId')
      || context.kind !== 'craft' || typeof context.recipeId !== 'string' || !Object.hasOwn(CRAFTING_RECIPES, context.recipeId)) {
      throw new TypeError('鍛造來源無效。')
    }
    const recipe = CRAFTING_RECIPES[context.recipeId]
    if (recipe.outputBase !== baseId || recipe.outputLevel !== options.level || recipe.category !== ITEM_BASES[baseId].slot
      || (material !== undefined && material !== null && !recipe.allowedBiasMaterials.includes(material))
      || (bossSource !== undefined && bossSource !== null) || (dropSource !== undefined && dropSource !== null)) {
      throw new RangeError('鍛造配方與裝備來源不符。')
    }
    const crafter = state.characters.find(character => character.id === state.activeCharacterId)
    const smithingLevel = crafter?.skills?.smithing?.level
    if (!Number.isSafeInteger(smithingLevel) || smithingLevel! < recipe.requiredSmithing) {
      throw new RangeError('鍛造熟練度不足。')
    }
    craftRecipeId = recipe.id
    craftSmithingLevel = smithingLevel as number
    craftMasterpieceChance = recipe.masterpieceRules && craftSmithingLevel >= recipe.masterpieceRules.requiredSmithing
      ? recipe.masterpieceRules.chance
      : 0
    craftProvenance = { recipeId: recipe.id, createdBy: state.activeCharacterId, createdAt: state.worldTime,
      influenceMaterial: material ?? null, masterpiece: false }
  }
  const slot = availableInstanceSlot(state)
  const resolvedBossSource = bossSource ?? (dropSource && monsterRank(dropSource) === 'boss' ? dropSource : null)
  return { baseId, level: options.level, material: material ?? null, bossSource: resolvedBossSource,
    dropSource: dropSource ?? null, craftProvenance, craftRecipeId, craftSmithingLevel, craftMasterpieceChance, ...slot }
}

export function generateItem(state: GameState, options: GenerateItemOptions): ItemInstance {
  // Check every caller-controlled value and the sequence boundary before the first RNG draw.
  const input = validateInput(state, options)
  const base = ITEM_BASES[input.baseId]
  const rarityWeights = input.dropSource
    ? rarityWeightsForDrop(input.dropSource)
    : input.bossSource
      ? Object.hasOwn(WOLF_MONSTERS, input.bossSource)
        ? WOLF_LOOT_RULES.bossRarityWeights
        : rarityWeightsForDrop(input.bossSource)
      : input.craftRecipeId
        ? craftQualityProfile(input.craftRecipeId, input.craftSmithingLevel).rarityWeights
        : Object.fromEntries(Object.values(RARITIES).map(definition => [definition.id, definition.weight]))
  const rarity: RarityId = weightedChoice(state, Object.entries(rarityWeights)
    .map(([value, weight]) => ({ value: value as RarityId, weight })))
  const rarityDefinition = RARITIES[rarity]
  const materialBias: MaterialDefinition['bias'] | undefined = input.material ? MATERIALS[input.material].bias : undefined
  const remaining: AffixId[] = base.affixes.filter(id => AFFIXES[id].slots.some(slot => slot === base.slot))
  const affixes = []
  const affixCount = Math.min(rarityDefinition.affixCount, remaining.length)

  for (let index = 0; index < affixCount; index++) {
    const affixId = weightedChoice(state, remaining.map(id => ({ value: id, weight: 1 + (materialBias?.[id] ?? 0) })))
    remaining.splice(remaining.indexOf(affixId), 1)
    const affix = AFFIXES[affixId]
    const tier = 1 + Math.floor(random(state) * Math.min(affix.tiers.length, maximumAffixTier(input.level, rarity)))
    affixes.push({ id: affixId, tier, value: affix.tiers[tier - 1]! })
  }

  const specialChance = Math.min(1, ITEM_GENERATION_RULES.legendaryWeaponSpecialChance
    + (input.material ? MATERIALS[input.material].specialBonus : 0))
  const specialTrait = rarityDefinition.specialEligible && base.slot === 'weapon' && random(state) < specialChance
    ? 'moonHunter' as const
    : null
  if (input.craftProvenance && input.craftMasterpieceChance > 0) {
    input.craftProvenance.masterpiece = random(state) < input.craftMasterpieceChance
  }
  const item: ItemInstance = {
    instanceId: input.instanceId, ownerId: input.ownerId, baseId: input.baseId, level: input.level,
    material: input.material, rarity, affixes, rolledStats: rolledItemStats(input.baseId, input.level, affixes),
    specialTrait,
    provenance: rarity === 'legendary' ? {
      createdBy: null, createdAt: state.worldTime, bossSource: input.bossSource, materialSource: input.material,
    } : null,
    craftProvenance: input.craftProvenance,
  }
  state.reward.nextInstanceId = input.nextInstanceId + 1
  return item
}

function materialCounts(state: GameState, ownerId: string): Record<MaterialId, number> {
  const counts = state.reward.materials[ownerId]
  const keys = Object.keys(MATERIALS)
  if (counts === undefined) return Object.fromEntries(keys.map(key => [key, 0]))
  const legacyKeys = Object.keys(LEGACY_MATERIALS)
  if (!counts || typeof counts !== 'object' || Object.keys(counts).some(key => !keys.includes(key))
    || !legacyKeys.every(key => Object.hasOwn(counts, key))
    || !Object.values(counts).every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new RangeError('素材堆疊資料無效。')
  }
  return Object.fromEntries(keys.map(key => [key, Object.hasOwn(counts, key) ? counts[key as MaterialId] : 0]))
}

function addUnique<T extends string>(items: T[], item: T) {
  if (!items.includes(item)) items.push(item)
}

export function awardWolfLoot(state: GameState, options: AwardWolfLootOptions): AwardWolfLootResult {
  if (!state || !state.reward || !options || typeof options !== 'object' || Array.isArray(options)
    || Object.keys(options).length !== 1 || !Object.hasOwn(options, 'definitionId')
    || !catalogKey(WOLF_MONSTERS, options.definitionId)) throw new RangeError('狼族掉落來源無效。')

  const definition = WOLF_MONSTERS[options.definitionId]
  const profile = WOLF_LOOT_RULES.profiles[options.definitionId]
  const slot = availableInstanceSlot(state)
  const counts = materialCounts(state, slot.ownerId)
  const table = LOOT_TABLES[definition.lootTable]
  const maximumAdds: Partial<Record<MaterialId, number>> = {}
  for (const materialId of table.guaranteed) maximumAdds[materialId] = (maximumAdds[materialId] ?? 0) + 1
  if (definition.rank === 'boss') maximumAdds[table.bossGuaranteed] = (maximumAdds[table.bossGuaranteed] ?? 0) + 1
  if (WOLF_LOOT_RULES.hideChance > 0) maximumAdds.wolfHide = (maximumAdds.wolfHide ?? 0) + 1
  if (definition.rank !== 'boss' && profile.rareMaterialChance > 0) maximumAdds[table.rare.materialId] = (maximumAdds[table.rare.materialId] ?? 0) + 1
  for (const [materialId, amount] of Object.entries(maximumAdds) as [MaterialId, number][]) {
    if (counts[materialId] > Number.MAX_SAFE_INTEGER - amount) throw new RangeError('素材堆疊已達安全上限。')
  }

  const dropped: Partial<Record<MaterialId, number>> = {}
  for (const materialId of table.guaranteed) dropped[materialId] = (dropped[materialId] ?? 0) + 1
  if (definition.rank === 'boss') dropped[table.bossGuaranteed] = (dropped[table.bossGuaranteed] ?? 0) + 1
  if (random(state) < WOLF_LOOT_RULES.hideChance) dropped.wolfHide = (dropped.wolfHide ?? 0) + 1
  if (definition.rank !== 'boss' && profile.rareMaterialChance > 0 && random(state) < profile.rareMaterialChance) {
    dropped[table.rare.materialId] = (dropped[table.rare.materialId] ?? 0) + 1
  }

  const gearDropped = definition.rank !== 'normal' || random(state) < WOLF_LOOT_RULES.normalGearChance
  const baseId = gearDropped
    ? definition.rank === 'boss'
      ? WOLF_LOOT_RULES.bossExclusiveBase
      : weightedChoice(state, table.weighted.map(entry => ({ value: entry.baseId, weight: entry.weight })))
    : null
  const bossSource: MonsterDefinitionId | null = definition.rank === 'boss' ? definition.id : null
  const itemMaterial = baseId && bossSource
    ? table.bossGuaranteed
    : baseId && ITEM_BASES[baseId].slot === 'armor'
      ? 'wolfHide'
      : table.guaranteed[0]!
  const item = baseId ? generateItem(state, { baseId, level: profile.dropLevel, material: itemMaterial, bossSource,
    dropSource: definition.id }) : null
  const firstBaseDiscovery = !!item && !state.reward.collection.bases.includes(item.baseId)

  const ownerMaterials = counts
  for (const [materialId, amount] of Object.entries(dropped) as [MaterialId, number][]) {
    ownerMaterials[materialId] += amount
    addUnique(state.reward.collection.materials, materialId)
  }
  state.reward.materials[slot.ownerId] = ownerMaterials
  addUnique(state.reward.collection.seen, definition.id)
  addUnique(state.reward.collection.defeated, definition.id)
  if (definition.rank === 'boss') {
    addUnique(state.reward.collection.bosses, definition.id)
    state.reward.wolfBossDefeatedAt = state.worldTime
    state.reward.wolfBossForm = null
  }
  if (item) {
    state.reward.instances.push(item)
    addUnique(state.reward.collection.bases, item.baseId)
    if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary') {
      addUnique(state.reward.collection.rareBases, item.baseId)
    }
  }

  for (const [materialId, amount] of Object.entries(dropped) as [MaterialId, number][]) {
    emit(state, 'loot.material', 'player', `獲得${MATERIALS[materialId].name} ×${amount}。`)
  }
  if (item) emit(state, 'loot.item', 'player', `${firstBaseDiscovery ? '新發現：' : ''}獲得${RARITIES[item.rarity].name}${ITEM_BASES[item.baseId].name}。`)
  return { instance: item, materials: dropped }
}

/** Awards authored-family loot from the monster's required selected table. Invalid references reject before RNG or mutation. */
export function awardContentLoot(state: GameState, options: AwardContentLootOptions): AwardWolfLootResult {
  if (!state || !state.reward || !options || typeof options !== 'object' || Array.isArray(options)
    || Object.keys(options).length !== 1 || !Object.hasOwn(options, 'definitionId')
    || typeof options.definitionId !== 'string' || !Object.hasOwn(CONTENT_MONSTERS, options.definitionId)) {
    throw new RangeError('內容怪物掉落來源無效。')
  }

  const definition = CONTENT_MONSTERS[options.definitionId]!
  const table = CONTENT_LOOT_TABLES[definition.lootTableId]
  if (!table || !Array.isArray(table.guaranteedMaterialIds) || !Array.isArray(table.weightedEquipment)
    || !Array.isArray(table.rareMaterials)) throw new RangeError('內容怪物掉落資料尚未完整。')
  const guaranteedIds = [...new Set([
    ...table.guaranteedMaterialIds,
    ...(definition.rank === 'boss' ? definition.bossRules?.guaranteedMaterialIds ?? [] : []),
  ])]
  if (guaranteedIds.some(id => !catalogKey(MATERIALS, id))
    || table.rareMaterials.some(entry => !catalogKey(MATERIALS, entry.materialId)
      || !Number.isFinite(entry.chance) || entry.chance < 0 || entry.chance > 1)
    || table.weightedEquipment.some(entry => !catalogKey(ITEM_BASES, entry.equipmentId)
      || !Number.isFinite(entry.weight) || entry.weight <= 0)) {
    throw new RangeError('內容怪物掉落資料無效。')
  }
  if (definition.rank === 'boss' && (!definition.bossRules
    || !catalogKey(ITEM_BASES, definition.bossRules.exclusiveEquipmentId))) {
    throw new RangeError('首領專屬獎勵資料尚未完整。')
  }

  const character = state.characters.find(candidate => candidate.id === state.activeCharacterId)
  if (!character) throw new RangeError('素材持有人狀態無效。')
  const counts = materialCounts(state, character.id)
  const slot = table.weightedEquipment.length > 0 || definition.rank === 'boss' && definition.bossRules
    ? availableInstanceSlot(state) : null

  const rareChances = new Map<string, number>()
  for (const entry of table.rareMaterials) {
    if (guaranteedIds.includes(entry.materialId)) continue
    if (!rareChances.has(entry.materialId)) rareChances.set(entry.materialId, entry.chance)
  }
  const maximumAdds: Partial<Record<MaterialId, number>> = {}
  for (const materialId of guaranteedIds) maximumAdds[materialId] = 1
  for (const materialId of rareChances.keys()) maximumAdds[materialId] = 1
  for (const [materialId, amount] of Object.entries(maximumAdds) as [MaterialId, number][]) {
    if (counts[materialId] > Number.MAX_SAFE_INTEGER - amount) throw new RangeError('素材堆疊已達安全上限。')
  }

  const dropped: Partial<Record<MaterialId, number>> = Object.fromEntries(guaranteedIds.map(id => [id, 1]))
  for (const [materialId, chance] of rareChances) {
    if (random(state) < chance) dropped[materialId] = 1
  }

  let baseId: ItemBaseId | null = null
  if (definition.rank === 'boss') {
    baseId = definition.bossRules!.exclusiveEquipmentId
  } else if (table.weightedEquipment.length > 0 && random(state) < definition.lootProfile.equipmentChance) {
    baseId = weightedChoice(state, table.weightedEquipment.map(entry => ({ value: entry.equipmentId, weight: entry.weight })))
  }
  const item = baseId && slot
    ? generateItem(state, { baseId, level: definition.lootProfile.dropLevel,
      material: guaranteedIds[0] ?? null, bossSource: definition.rank === 'boss' ? definition.id : null,
      dropSource: definition.id })
    : null
  const firstBaseDiscovery = !!item && !state.reward.collection.bases.includes(item.baseId)

  const ownerMaterials = counts
  for (const [materialId, amount] of Object.entries(dropped) as [MaterialId, number][]) {
    ownerMaterials[materialId] += amount
    addUnique(state.reward.collection.materials, materialId)
  }
  state.reward.materials[character.id] = ownerMaterials
  addUnique(state.reward.collection.seen, definition.id)
  addUnique(state.reward.collection.defeated, definition.id)
  if (definition.rank === 'boss') addUnique(state.reward.collection.bosses, definition.id)
  if (item) {
    state.reward.instances.push(item)
    addUnique(state.reward.collection.bases, item.baseId)
    if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary') {
      addUnique(state.reward.collection.rareBases, item.baseId)
    }
  }

  for (const [materialId, amount] of Object.entries(dropped) as [MaterialId, number][]) {
    emit(state, 'loot.material', 'player', `獲得${MATERIALS[materialId].name} ×${amount}。`)
  }
  if (item) emit(state, 'loot.item', 'player', `${firstBaseDiscovery ? '新發現：' : ''}獲得${RARITIES[item.rarity].name}${ITEM_BASES[item.baseId].name}。`)
  return { instance: item, materials: dropped }
}
