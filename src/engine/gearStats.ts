import { AFFIXES, ITEM_BASES, RARITIES } from '../data/rewards'
import type { GearStats, ItemAffix, ItemBaseId, RarityId } from '../domain/reward'

export const maximumAffixTier = (level: number, rarity: RarityId) => Math.min(RARITIES[rarity].maxTier, 1 + Math.floor(level / 5))

export function rolledItemStats(baseId: ItemBaseId, level: number, affixes: ItemAffix[]): GearStats {
  const base = ITEM_BASES[baseId], growth = Math.floor((level - 1) / 3)
  const stats: GearStats = { attack: base.attack ? base.attack + growth : 0, defense: base.defense ? base.defense + growth : 0,
    critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 }
  for (const affix of affixes) stats[AFFIXES[affix.id].stat] += affix.value
  return stats
}
