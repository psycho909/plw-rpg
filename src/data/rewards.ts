import type { AffixDefinition, BossVariantDefinition, ItemBaseDefinition, LootTableDefinition, MaterialDefinition, MonsterDefinition, MonsterDefinitionId, MonsterFamilyDefinition, MonsterTraitDefinition, RarityDefinition, RarityId } from '../domain/reward'
import { CONTENT_AFFIXES, CONTENT_CROP_GOODS, CONTENT_EQUIPMENT, CONTENT_MATERIALS } from './contentRegistry'

export const LEGACY_ITEM_BASES = {
  shortSword: { id: 'shortSword', name: '短劍', slot: 'weapon', attack: 4, defense: 0, sell: 12, affixes: ['striking', 'keen', 'piercing', 'bleeding'] },
  axe: { id: 'axe', name: '獵斧', slot: 'weapon', attack: 6, defense: 0, sell: 16, affixes: ['striking', 'keen', 'piercing', 'bleeding'] },
  spear: { id: 'spear', name: '獵矛', slot: 'weapon', attack: 5, defense: 0, sell: 14, affixes: ['striking', 'keen', 'piercing', 'bleeding'] },
  moonFangSpear: { id: 'moonFangSpear', name: '月牙獵矛', slot: 'weapon', attack: 5, defense: 0, sell: 20,
    affixes: ['keen', 'piercing', 'bleeding'], penetration: 2 },
  hideArmor: { id: 'hideArmor', name: '獸皮衣', slot: 'armor', attack: 0, defense: 2, sell: 10, affixes: ['sturdy', 'blocking', 'warding'] },
  chainArmor: { id: 'chainArmor', name: '鎖甲', slot: 'armor', attack: 0, defense: 4, sell: 18, affixes: ['sturdy', 'blocking', 'warding'] },
} satisfies Record<string, ItemBaseDefinition>
const contentItemBases = Object.fromEntries(Object.values(CONTENT_EQUIPMENT).map(item => [item.id, {
  id: item.id, name: item.name['zh-TW'], slot: item.slot, attack: item.attack, defense: item.defense,
  sell: item.sell, affixes: [...item.affixIds], ...(item.penetration === undefined ? {} : { penetration: item.penetration }),
}])) as Record<string, ItemBaseDefinition>
export const ITEM_BASES: Record<string, ItemBaseDefinition> = { ...LEGACY_ITEM_BASES, ...contentItemBases }

export const LEGACY_AFFIXES = {
  striking: { id: 'striking', name: '強擊', stat: 'attack', slots: ['weapon'], tiers: [1, 2, 4] },
  keen: { id: 'keen', name: '銳利', stat: 'critical', slots: ['weapon'], tiers: [3, 6, 10] },
  piercing: { id: 'piercing', name: '穿透', stat: 'penetration', slots: ['weapon'], tiers: [1, 2, 3] },
  bleeding: { id: 'bleeding', name: '裂傷', stat: 'bleed', slots: ['weapon'], tiers: [1, 2, 3] },
  sturdy: { id: 'sturdy', name: '堅固', stat: 'defense', slots: ['armor'], tiers: [1, 2, 3] },
  blocking: { id: 'blocking', name: '格擋', stat: 'block', slots: ['armor'], tiers: [4, 8, 12] },
  warding: { id: 'warding', name: '守護', stat: 'reduction', slots: ['armor'], tiers: [3, 6, 9] },
} satisfies Record<string, AffixDefinition>
const contentAffixes = Object.fromEntries(Object.values(CONTENT_AFFIXES).map(affix => [affix.id, {
  id: affix.id, name: affix.name['zh-TW'], stat: affix.stat, slots: [...affix.slots], tiers: [...affix.tiers],
}])) as Record<string, AffixDefinition>
export const AFFIXES: Record<string, AffixDefinition> = { ...LEGACY_AFFIXES, ...contentAffixes }

// Affix counts and tier access distinguish quality; rarity does not multiply raw stats.
export const RARITIES = {
  common: { id: 'common', name: '普通', weight: 60, affixCount: 0, maxTier: 1, specialEligible: false },
  uncommon: { id: 'uncommon', name: '精良', weight: 27, affixCount: 1, maxTier: 1, specialEligible: false },
  rare: { id: 'rare', name: '稀有', weight: 10, affixCount: 2, maxTier: 2, specialEligible: false },
  epic: { id: 'epic', name: '史詩', weight: 2.8, affixCount: 3, maxTier: 3, specialEligible: false },
  legendary: { id: 'legendary', name: '傳說', weight: .2, affixCount: 3, maxTier: 3, specialEligible: true },
} satisfies Record<string, RarityDefinition>

export const LEGACY_MATERIALS = {
  wolfFang: { id: 'wolfFang', name: '狼牙', sell: 5, bias: { bleeding: 4, piercing: 2 }, specialBonus: 0, description: '可出售；作為獵矛或鐵短劍影響素材時偏向裂傷與穿透詞綴。' },
  wolfHide: { id: 'wolfHide', name: '狼皮', sell: 5, bias: { sturdy: 3, blocking: 2 }, specialBonus: 0, description: '可出售；鍛造鎖甲時作為影響素材，偏向堅固與格擋詞綴。' },
  moonStone: { id: 'moonStone', name: '月石', sell: 25, bias: { keen: 4 }, specialBonus: .15, description: '狼族首領的特殊素材；可出售；作為獵矛或鐵短劍影響素材時偏向銳利，並提高傳說武器的月狩特性機率。' },
} satisfies Record<string, MaterialDefinition>
const contentMaterials = Object.fromEntries([
  ...Object.values(CONTENT_MATERIALS).map(material => [material.id, {
    id: material.id, name: material.name['zh-TW'], sell: material.sell, bias: material.bias,
    specialBonus: material.specialBonus ?? 0, description: material.description['zh-TW'],
  }] as const),
  ...Object.values(CONTENT_CROP_GOODS).map(good => [good.id, {
    id: good.id, name: good.name['zh-TW'], sell: good.sell, bias: {}, specialBonus: 0,
    description: good.description['zh-TW'],
  }] as const),
]) as Record<string, MaterialDefinition>
export const MATERIALS: Record<string, MaterialDefinition> = { ...LEGACY_MATERIALS, ...contentMaterials }

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
  armored: { id: 'armored', name: '裝甲', description: '每三回合架起硬皮防線；防線啟動時穿透效力加倍，裂傷仍會造成額外傷害。' },
} satisfies Record<string, MonsterTraitDefinition>
export const BOSS_VARIANTS = {
  wellFed: { id: 'wellFed', name: '蓄勢', description: '狼群繁盛；蓄力後的月襲更猛烈。' },
  starved: { id: 'starved', name: '飢餓', description: '玩家削弱狼群補給；半血後提早月襲。' },
  moonlit: { id: 'moonlit', name: '月影', description: '受月影庇護；月襲前短暫回復生命。' },
} satisfies Record<string, BossVariantDefinition>
export const LOOT_TABLES = {
  wolf: { id: 'wolf', guaranteed: ['wolfFang'], weighted: [{ baseId: 'shortSword', weight: 3 }, { baseId: 'axe', weight: 2 }, { baseId: 'spear', weight: 2 }, { baseId: 'hideArmor', weight: 3 }, { baseId: 'chainArmor', weight: 1 }], rare: { materialId: 'moonStone', chance: .03 }, bossGuaranteed: 'moonStone' },
} satisfies Record<string, LootTableDefinition>

const wolfRarityWeights = {
  normal: { common: 60, uncommon: 27, rare: 10, epic: 2.8, legendary: .2 },
  scarred: { common: 45, uncommon: 35, rare: 16, epic: 3.6, legendary: .4 },
  elite: { common: 20, uncommon: 45, rare: 28, epic: 6.5, legendary: .5 },
  miniBoss: { common: 0, uncommon: 35, rare: 50, epic: 14, legendary: 1 },
  boss: { common: 0, uncommon: 0, rare: 85, epic: 14, legendary: 1 },
} satisfies Record<string, Record<RarityId, number>>

export const WOLF_LOOT_RULES = {
  normalGearChance: .65,
  hideChance: .25,
  bossRarityWeights: { rare: 85, epic: 14, legendary: 1 },
  bossExclusiveBase: 'moonFangSpear',
  profiles: {
    grayWolf: { dropLevel: WOLF_MONSTERS.grayWolf.level, rarityWeights: wolfRarityWeights.normal, rareMaterialChance: LOOT_TABLES.wolf.rare.chance },
    scarredWolf: { dropLevel: WOLF_MONSTERS.scarredWolf.level, rarityWeights: wolfRarityWeights.scarred, rareMaterialChance: .04 },
    alphaWolf: { dropLevel: 5, rarityWeights: wolfRarityWeights.elite, rareMaterialChance: .08 },
    packLeader: { dropLevel: 7, rarityWeights: wolfRarityWeights.miniBoss, rareMaterialChance: .15 },
    wolfKing: { dropLevel: WOLF_MONSTERS.wolfKing.level, rarityWeights: wolfRarityWeights.boss, rareMaterialChance: 0 },
  } satisfies Record<MonsterDefinitionId, { dropLevel: number; rarityWeights: Record<RarityId, number>; rareMaterialChance: number }>,
} as const

export const WOLF_ENCOUNTER_RULES = {
  order: ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader', 'wolfKing'],
  staminaCost: 8,
  bossCooldownDays: 7,
  contextScalePerPopulation: .001,
  attackScalePerUnsafePoint: .002,
  armoredBaseDefense: 1,
  periodicArmor: 3,
  fastRushEvery: 2,
  traitRushEvery: 3,
  bruiserHeavyEvery: 3,
  howlEvery: 3,
  bossChargeEvery: 4,
  starvedChargeEvery: 3,
  rushRoleBonus: .3,
  rushTraitBonus: .5,
  heavyStrikeBonus: .4,
  howlAttackBonus: .3,
  chargeAttackBonus: .6,
  wellFedAttackBonus: .5,
  moonlitHeal: 8,
} as const

export const ITEM_GENERATION_RULES = {
  legendaryWeaponSpecialChance: .1,
} as const
