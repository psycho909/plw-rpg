import type {
  ContentAffix, ContentCrop, ContentCropGood, ContentEquipment, ContentLootTable, ContentMaterial,
  ContentMonster, ContentMonsterFamily, ContentPack, ContentRecipe,
} from '../domain/content'
import { SLIME_CONTENT } from './content/slime'

/** Runtime registry entry point. Family modules remain isolated, authored-only packs. */
export const CONTENT_PACKS: readonly ContentPack[] = [SLIME_CONTENT]

function catalog<T extends { id: string }>(select: (pack: ContentPack) => readonly T[]): Record<string, T> {
  return Object.fromEntries(CONTENT_PACKS.flatMap(pack => select(pack).map(value => [value.id, value])))
}

export const CONTENT_FAMILIES: Record<string, ContentMonsterFamily> = catalog(pack => pack.families)
export const CONTENT_MONSTERS: Record<string, ContentMonster> = catalog(pack => pack.monsters)
export const CONTENT_LOOT_TABLES: Record<string, ContentLootTable> = catalog(pack => pack.lootTables)
export const CONTENT_EQUIPMENT: Record<string, ContentEquipment> = catalog(pack => pack.equipment)
export const CONTENT_MATERIALS: Record<string, ContentMaterial> = catalog(pack => pack.materials)
export const CONTENT_CROPS: Record<string, ContentCrop> = catalog(pack => pack.crops)
export const CONTENT_CROP_GOODS: Record<string, ContentCropGood> = catalog(pack => pack.cropGoods)
export const CONTENT_RECIPES: Record<string, ContentRecipe> = catalog(pack => pack.recipes)
export const CONTENT_AFFIXES: Record<string, ContentAffix> = catalog(pack => pack.affixes)

/** Crops already present before Phase7 stay addressable by their saved stable ID. */
export const LEGACY_CROP_IDS = ['wheat'] as const
export const KNOWN_CROP_IDS = [...LEGACY_CROP_IDS, ...Object.keys(CONTENT_CROPS)] as const

