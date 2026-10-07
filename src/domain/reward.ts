import type { RegionId } from './types'

export type EquipmentSlot = 'weapon' | 'armor'
export type RarityId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type ItemBaseId = 'shortSword' | 'axe' | 'spear' | 'hideArmor' | 'chainArmor' | 'moonFangSpear'
export type MaterialId = 'wolfFang' | 'wolfHide' | 'moonStone'
export type AffixId = 'striking' | 'keen' | 'piercing' | 'bleeding' | 'sturdy' | 'blocking' | 'warding'
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
export interface ItemInstance {
  instanceId: string; ownerId: string; baseId: ItemBaseId; level: number; material: MaterialId | null
  rarity: RarityId; rolledStats: GearStats; affixes: ItemAffix[]; specialTrait: SpecialTraitId | null
  provenance: { createdBy: string | null; createdAt: number; bossSource: MonsterDefinitionId | null; materialSource: MaterialId | null } | null
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
export interface RewardState {
  schemaVersion: 1; nextInstanceId: number; instances: ItemInstance[]
  equipped: Record<string, { weapon: string | null; armor: string | null }>
  materials: Record<string, Record<MaterialId, number>>
  collection: { seen: MonsterDefinitionId[]; defeated: MonsterDefinitionId[]; bases: ItemBaseId[]; materials: MaterialId[]; bosses: MonsterDefinitionId[]; rareBases: ItemBaseId[] }
  wolfBossDefeatedAt: number | null
  wolfBossForm: FamilyEncounter | null
}
