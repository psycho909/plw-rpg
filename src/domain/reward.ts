import type { ItemId, RegionId } from './types'

export type EquipmentSlot = 'weapon' | 'armor'
export type RarityId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type ItemBaseId = string
export type MaterialId = string
export type CraftRecipeId = string
export type CraftStationId = 'store' | 'blacksmith'
export type CraftInventoryItemId = Extract<ItemId, 'wood' | 'stone' | 'iron'>
export type AffixId = string
export type SpecialTraitId = 'moonHunter'
export type MonsterTraitId = 'swift' | 'armored'
export type MonsterRank = 'normal' | 'elite' | 'miniBoss' | 'boss'
export type MonsterDefinitionId = 'grayWolf' | 'scarredWolf' | 'alphaWolf' | 'packLeader' | 'wolfKing'
export type BossVariantId = 'wellFed' | 'starved' | 'moonlit'
export interface GearStats {
  attack: number; defense: number; critical: number; penetration: number
  bleed: number; block: number; reduction: number
}
export interface ItemAffix { id: AffixId; tier: number; value: number }
export type CraftingInput =
  | { source: 'inventory'; itemId: CraftInventoryItemId; amount: number }
  | { source: 'material'; materialId: MaterialId; amount: number }
export interface CraftingRecipeDefinition {
  id: CraftRecipeId
  name: string
  category: EquipmentSlot
  inputs: readonly CraftingInput[]
  goldCost: number
  staminaCost: number
  durationMinutes: number
  outputBase: ItemBaseId
  outputLevel: number
  requiredSmithing: number
  practiceCap: number
  station: CraftStationId
  opensAtHour: number
  closesAtHour: number
  allowedBiasMaterials: readonly MaterialId[]
  qualityRules: { floorAtSmithing: number; minimumRarity: RarityId }
  masterpieceRules?: { requiredSmithing: number; chance: number }
  affixRules: 'default'
}
export interface CraftGenerationContext {
  kind: 'craft'
  recipeId: CraftRecipeId
}
export interface CraftProvenance {
  recipeId: CraftRecipeId
  createdBy: string
  createdAt: number
  influenceMaterial: MaterialId | null
  masterpiece: boolean
}
export interface ItemInstance {
  instanceId: string; ownerId: string; baseId: ItemBaseId; level: number; material: MaterialId | null
  rarity: RarityId; rolledStats: GearStats; affixes: ItemAffix[]; specialTrait: SpecialTraitId | null
  provenance: { createdBy: string | null; createdAt: number; bossSource: string | null; materialSource: MaterialId | null } | null
  craftProvenance: CraftProvenance | null
}
export interface ItemBaseDefinition { id: ItemBaseId; name: string; slot: EquipmentSlot; attack: number; defense: number; sell: number; affixes: AffixId[]; penetration?: number }
export interface AffixDefinition { id: AffixId; name: string; stat: keyof GearStats; slots: EquipmentSlot[]; tiers: number[] }
export interface RarityDefinition { id: RarityId; name: string; weight: number; affixCount: number; maxTier: number; specialEligible: boolean }
export interface MaterialDefinition { id: MaterialId; name: string; sell: number; bias: Partial<Record<AffixId, number>>; specialBonus: number; description: string }
export interface MonsterFamilyDefinition { id: 'wolf'; name: string; regions: RegionId[]; lootTable: 'wolf'; themeTags: string[]; eventHooks: string[] }
export interface MonsterDefinition { id: MonsterDefinitionId; name: string; family: 'wolf'; rank: MonsterRank; level: number; hp: number; attack: number; defense: number; exp: number; gold: number; role: 'fast' | 'bruiser' | 'controller'; lootTable: 'wolf'; core: 'bite' | 'howl' | 'moonCharge' }
export interface MonsterTraitDefinition { id: MonsterTraitId; name: string; description: string }
export interface BossVariantDefinition { id: BossVariantId; name: string; description: string }
export interface LootTableDefinition { id: 'wolf'; guaranteed: MaterialId[]; weighted: { baseId: ItemBaseId; weight: number }[]; rare: { materialId: MaterialId; chance: number }; bossGuaranteed: MaterialId }
export interface FamilyEncounter {
  definitionId: MonsterDefinitionId; traits: MonsterTraitId[]; variant: BossVariantId | null
  turn: number; formedAt: number; context: { population: number; hunted: number; safety: number }; howlActive: boolean
}
/** Persisted identity for a Phase7-authored family encounter; definitions remain in catalogs. */
export interface ContentFamilyEncounter {
  familyId: string
  definitionId: string
  variantId: string | null
  turn: number
  formedAt: number
  context: { region: RegionId; population: number; hunted: number; safety: number; threatLevel: number }
}
export type ContentBossForm =
  | { kind: 'frozenEncounter'; encounter: ContentFamilyEncounter }
  | { kind: 'cooldownUntil'; availableAt: number }
export interface RewardState {
  schemaVersion: 3; nextInstanceId: number; instances: ItemInstance[]
  equipped: Record<string, { weapon: string | null; armor: string | null }>
  materials: Record<string, Record<string, number>>
  collection: { seen: string[]; defeated: string[]; bases: ItemBaseId[]; materials: MaterialId[]; bosses: string[]; rareBases: ItemBaseId[] }
  wolfBossDefeatedAt: number | null
  wolfBossForm: FamilyEncounter | null
  bossForms: Record<string, ContentBossForm>
}
