import type { GearStats } from './reward'
import type { RegionId } from './types'

/** Stable, author-controlled catalog key. The validator enforces uniqueness across its namespace. */
export type ContentId = string

/** Oakvale's currently supported authored locale. Keep every field explicit for completeness checks. */
export type ContentLocalizedText = Readonly<Record<'zh-TW', string>>

export type ContentMonsterRank = 'normal' | 'elite' | 'miniBoss' | 'boss'
export type ContentSeason = '春' | '夏' | '秋' | '冬'
export type ContentSettlementStage = 'hamlet' | 'village' | 'town'
export type ContentRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type ContentEquipmentSlot = 'weapon' | 'armor'

/**
 * Finite world-state predicate. Each predicate is conjunctive; a profile list is disjunctive.
 * `region` must be discovered to count as a reachable witness (especially `unknown`).
 */
export interface ContentSpawnPredicate {
  region: RegionId
  minPlayerLevel?: number
  maxPlayerLevel?: number
  minThreatLevel?: number
  maxThreatLevel?: number
  settlementStages?: readonly ContentSettlementStage[]
  seasons?: readonly ContentSeason[]
  hours?: { start: number; end: number }
  minSafety?: number
  maxSafety?: number
}

/** One implemented, telegraphed combat effect; this is data, never executable script. */
export type ContentCombatMechanic =
  | { kind: 'rush'; everyTurns: number; bonusFraction: number; telegraph: ContentLocalizedText }
  | { kind: 'guard'; everyTurns: number; defenseBonus: number; telegraph: ContentLocalizedText }
  | { kind: 'heavyStrike'; everyTurns: number; bonusFraction: number; telegraph: ContentLocalizedText }
  | { kind: 'rally'; everyTurns: number; bonusFraction: number; telegraph: ContentLocalizedText }
  | { kind: 'chargedAttack'; everyTurns: number; bonusFraction: number; healAmount?: number; telegraph: ContentLocalizedText }

export interface ContentMonsterStats {
  hp: number
  attack: number
  defense: number
  exp: number
  gold: number
}

export interface ContentLootProfile {
  dropLevel: number
  equipmentChance: number
  rarityWeights: Readonly<Record<ContentRarity, number>>
}

export interface ContentBossVariant {
  id: ContentId
  name: ContentLocalizedText
  description: ContentLocalizedText
  weight: number
  /** Additional bounded mechanics that distinguish this frozen form. */
  mechanics: readonly ContentCombatMechanic[]
  spawnProfiles?: readonly ContentSpawnPredicate[]
}

/** Bounded effect on an existing settlement value; it never writes Goblin threat or crisis state. */
export interface ContentBossWorldConsequence {
  trigger: 'bossDefeated'
  field: 'food' | 'safety' | 'prosperity'
  delta: number
}

export interface ContentBossRules {
  cooldownDays: number
  guaranteedMaterialIds: readonly ContentId[]
  exclusiveEquipmentId: ContentId
  variants: readonly ContentBossVariant[]
  worldConsequence: ContentBossWorldConsequence
}

export interface ContentMonster {
  id: ContentId
  name: ContentLocalizedText
  description: ContentLocalizedText
  familyId: ContentId
  rank: ContentMonsterRank
  level: number
  stats: ContentMonsterStats
  role: 'fast' | 'bruiser' | 'controller'
  mechanics: readonly ContentCombatMechanic[]
  lootTableId: ContentId
  lootProfile: ContentLootProfile
  /** When omitted, the family profiles apply unchanged. Otherwise these further restrict them. */
  spawnProfiles?: readonly ContentSpawnPredicate[]
  /** Required exactly for bosses. */
  bossRules?: ContentBossRules
}

export interface ContentMonsterFamily {
  id: ContentId
  name: ContentLocalizedText
  description: ContentLocalizedText
  regions: readonly RegionId[]
  spawnProfiles: readonly ContentSpawnPredicate[]
  monsterIds: readonly ContentId[]
  eliteIds: readonly ContentId[]
  miniBossIds: readonly ContentId[]
  bossIds: readonly ContentId[]
  lootTableId: ContentId
  /** Phase 7 ecology is region-local and must not mutate Phase 6's Goblin global threat. */
  threatChannel: 'regional_ecology'
}

export interface ContentLootTable {
  id: ContentId
  guaranteedMaterialIds: readonly ContentId[]
  weightedEquipment: readonly { equipmentId: ContentId; weight: number }[]
  rareMaterials: readonly { materialId: ContentId; chance: number }[]
}

export interface ContentEquipment {
  id: ContentId
  name: ContentLocalizedText
  description: ContentLocalizedText
  slot: ContentEquipmentSlot
  attack: number
  defense: number
  sell: number
  affixIds: readonly ContentId[]
  penetration?: number
}

export interface ContentMaterial {
  id: ContentId
  name: ContentLocalizedText
  description: ContentLocalizedText
  sell: number
  bias: Readonly<Partial<Record<ContentId, number>>>
  specialBonus?: number
}

export interface ContentCrop {
  id: ContentId
  name: ContentLocalizedText
  description: ContentLocalizedText
  regions: readonly RegionId[]
  seasons: readonly ContentSeason[]
  growthMinutes: number
  harvestAmount: number
  harvestGoodId: ContentId
}

/**
 * A crop good retains its own Reward material ID. `foodValue` is consumed by the existing
 * settlement food/supply path; recipe inputs and sale may provide additional uses.
 */
export interface ContentCropGood {
  id: ContentId
  name: ContentLocalizedText
  description: ContentLocalizedText
  sourceCropId: ContentId
  foodValue: number
  sell: number
}

export type ContentCraftingInput =
  | { source: 'inventory'; itemId: ContentId; amount: number }
  | { source: 'material'; materialId: ContentId; amount: number }

export interface ContentRecipe {
  id: ContentId
  name: ContentLocalizedText
  description: ContentLocalizedText
  category: ContentEquipmentSlot
  inputs: readonly ContentCraftingInput[]
  goldCost: number
  staminaCost: number
  durationMinutes: number
  outputBase: ContentId
  outputLevel: number
  requiredSmithing: number
  practiceCap: number
  station: 'store' | 'blacksmith'
  opensAtHour: number
  closesAtHour: number
  allowedBiasMaterials: readonly ContentId[]
  qualityRules: { floorAtSmithing: number; minimumRarity: ContentRarity }
  masterpieceRules?: { requiredSmithing: number; chance: number }
  affixRules: 'default'
}

export interface ContentAffix {
  id: ContentId
  name: ContentLocalizedText
  description: ContentLocalizedText
  stat: keyof GearStats
  slots: readonly ContentEquipmentSlot[]
  tiers: readonly number[]
}

/** All existing IDs are supplied for collision/reference checks; excluded IDs never count as additions. */
export interface ContentBaselineIds {
  familyIds: readonly ContentId[]
  monsterIds: readonly ContentId[]
  bossVariantIds: readonly ContentId[]
  lootTableIds: readonly ContentId[]
  equipmentIds: readonly ContentId[]
  materialIds: readonly ContentId[]
  cropIds: readonly ContentId[]
  recipeIds: readonly ContentId[]
  affixIds: readonly ContentId[]
  baselineAffixSlots: readonly { id: ContentId; slots: readonly ContentEquipmentSlot[] }[]
  excludedLegacyMonsterIds: readonly ContentId[]
  excludedLegacyItemIds: readonly ContentId[]
  excludedProceduralIds: readonly ContentId[]
}

/** One new authoring batch. Baseline content is referenced by ID, never copied into this pack. */
export interface ContentPack {
  families: readonly ContentMonsterFamily[]
  monsters: readonly ContentMonster[]
  lootTables: readonly ContentLootTable[]
  equipment: readonly ContentEquipment[]
  materials: readonly ContentMaterial[]
  crops: readonly ContentCrop[]
  cropGoods: readonly ContentCropGood[]
  recipes: readonly ContentRecipe[]
  affixes: readonly ContentAffix[]
}
