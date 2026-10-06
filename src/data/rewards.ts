import type { AffixDefinition, BossVariantDefinition, ItemBaseDefinition, LootTableDefinition, MaterialDefinition, MonsterDefinition, MonsterFamilyDefinition, MonsterTraitDefinition, RarityDefinition } from '../domain/reward'

export const ITEM_BASES = {
  shortSword: { id: 'shortSword', name: '短劍', slot: 'weapon', attack: 4, defense: 0, sell: 12, affixes: ['striking', 'keen', 'piercing', 'bleeding'] },
  axe: { id: 'axe', name: '獵斧', slot: 'weapon', attack: 6, defense: 0, sell: 16, affixes: ['striking', 'keen', 'piercing', 'bleeding'] },
  spear: { id: 'spear', name: '獵矛', slot: 'weapon', attack: 5, defense: 0, sell: 14, affixes: ['striking', 'keen', 'piercing', 'bleeding'] },
  hideArmor: { id: 'hideArmor', name: '獸皮衣', slot: 'armor', attack: 0, defense: 2, sell: 10, affixes: ['sturdy', 'blocking', 'warding'] },
  chainArmor: { id: 'chainArmor', name: '鎖甲', slot: 'armor', attack: 0, defense: 4, sell: 18, affixes: ['sturdy', 'blocking', 'warding'] },
} satisfies Record<string, ItemBaseDefinition>

export const AFFIXES = {
  striking: { id: 'striking', name: '強擊', stat: 'attack', slots: ['weapon'], tiers: [1, 2, 4] },
  keen: { id: 'keen', name: '銳利', stat: 'critical', slots: ['weapon'], tiers: [3, 6, 10] },
  piercing: { id: 'piercing', name: '穿透', stat: 'penetration', slots: ['weapon'], tiers: [1, 2, 3] },
  bleeding: { id: 'bleeding', name: '裂傷', stat: 'bleed', slots: ['weapon'], tiers: [1, 2, 3] },
  sturdy: { id: 'sturdy', name: '堅固', stat: 'defense', slots: ['armor'], tiers: [1, 2, 3] },
  blocking: { id: 'blocking', name: '格擋', stat: 'block', slots: ['armor'], tiers: [4, 8, 12] },
  warding: { id: 'warding', name: '守護', stat: 'reduction', slots: ['armor'], tiers: [3, 6, 9] },
} satisfies Record<string, AffixDefinition>

// Affix counts and tier access distinguish quality; rarity does not multiply raw stats.
export const RARITIES = {
  common: { id: 'common', name: '普通', weight: 60, affixCount: 0, maxTier: 1, specialEligible: false },
  uncommon: { id: 'uncommon', name: '精良', weight: 27, affixCount: 1, maxTier: 1, specialEligible: false },
  rare: { id: 'rare', name: '稀有', weight: 10, affixCount: 2, maxTier: 2, specialEligible: false },
  epic: { id: 'epic', name: '史詩', weight: 2.8, affixCount: 3, maxTier: 3, specialEligible: false },
  legendary: { id: 'legendary', name: '傳說', weight: .2, affixCount: 3, maxTier: 3, specialEligible: true },
} satisfies Record<string, RarityDefinition>

export const MATERIALS = {
  wolfFang: { id: 'wolfFang', name: '狼牙', sell: 5, bias: { bleeding: 4, piercing: 2 }, specialBonus: 0, description: '可出售；作為生成素材偏向裂傷與穿透。工坊製作將於後續階段開放。' },
  wolfHide: { id: 'wolfHide', name: '狼皮', sell: 5, bias: { sturdy: 3, blocking: 2 }, specialBonus: 0, description: '可出售；作為生成素材偏向堅固與格擋。工坊製作將於後續階段開放。' },
  moonStone: { id: 'moonStone', name: '月石', sell: 25, bias: { keen: 4 }, specialBonus: .15, description: '狼族首領的特殊素材；可出售，偏向銳利與傳說特性。' },
} satisfies Record<string, MaterialDefinition>

export const MONSTER_FAMILIES = {
  wolf: { id: 'wolf', name: '北林狼族', regions: ['forest'], lootTable: 'wolf', themeTags: ['beast', 'forest'], eventHooks: ['wolf.defeated', 'wolf.bossDefeated'] },
} satisfies Record<string, MonsterFamilyDefinition>
export const WOLF_MONSTERS = {
  grayWolf: { id: 'grayWolf', name: '灰狼', family: 'wolf', rank: 'normal', level: 2, hp: 28, attack: 7, defense: 1, exp: 25, gold: 10, role: 'fast', lootTable: 'wolf', core: 'bite' },
  scarredWolf: { id: 'scarredWolf', name: '傷痕灰狼', family: 'wolf', rank: 'normal', level: 3, hp: 34, attack: 8, defense: 1, exp: 30, gold: 12, role: 'bruiser', lootTable: 'wolf', core: 'bite' },
  alphaWolf: { id: 'alphaWolf', name: '精英頭狼', family: 'wolf', rank: 'elite', level: 4, hp: 54, attack: 10, defense: 2, exp: 55, gold: 24, role: 'fast', lootTable: 'wolf', core: 'bite' },
  packLeader: { id: 'packLeader', name: '狼群領袖', family: 'wolf', rank: 'miniBoss', level: 5, hp: 76, attack: 12, defense: 3, exp: 80, gold: 40, role: 'controller', lootTable: 'wolf', core: 'howl' },
  wolfKing: { id: 'wolfKing', name: '北林狼王', family: 'wolf', rank: 'boss', level: 7, hp: 120, attack: 16, defense: 4, exp: 130, gold: 75, role: 'controller', lootTable: 'wolf', core: 'moonCharge' },
} satisfies Record<string, MonsterDefinition>
export const MONSTER_TRAITS = {
  swift: { id: 'swift', name: '迅捷', description: '每三回合急襲；防禦可化解急襲加成。' },
  armored: { id: 'armored', name: '裝甲', description: '每三回合架起硬皮防線；穿透裝備與裂傷可突破。' },
} satisfies Record<string, MonsterTraitDefinition>
export const BOSS_VARIANTS = {
  wellFed: { id: 'wellFed', name: '蓄勢', description: '狼群繁盛；蓄力後的月襲更猛烈。' },
  starved: { id: 'starved', name: '飢餓', description: '玩家削弱狼群補給；半血後提早月襲。' },
  moonlit: { id: 'moonlit', name: '月影', description: '受月影庇護；月襲前短暫回復生命。' },
} satisfies Record<string, BossVariantDefinition>
export const LOOT_TABLES = {
  wolf: { id: 'wolf', guaranteed: ['wolfFang'], weighted: [{ baseId: 'shortSword', weight: 3 }, { baseId: 'axe', weight: 2 }, { baseId: 'spear', weight: 2 }, { baseId: 'hideArmor', weight: 3 }, { baseId: 'chainArmor', weight: 1 }], rare: { materialId: 'moonStone', chance: .03 }, bossGuaranteed: 'moonStone' },
} satisfies Record<string, LootTableDefinition>
