import type { BuildingId, ItemId, JobId, LifeStage, Position, RegionId } from '../domain/types'

export const CONFIG = {
  daysPerSeason: 30, seasons: ['春', '夏', '秋', '冬'], minutesPerDay: 1440,
  realSecondMinutes: 2, saveVersion: 7 as const,
  width: 24, height: 16, initialPopulation: 30, maxPopulation: 80,
  stamina: { child: .9, young: 1.05, adult: 1, middleAge: .95, elder: .85 } satisfies Record<LifeStage, number>,
  ages: { young: 15, adult: 25, middleAge: 50, elder: 65 },
  cropMinutes: 2 * 1440, maxPlots: 4, contractDays: 3,
  stageGrowth: { village: 85, town: 230 }, threatThresholds: [0, 30, 65], bossThreshold: 100,
  regionalCrisis: {
    minimumMonsterPopulation: 30, minimumCampLevel: 2, dailyTriggerChance: .18,
    lowSafetyThreshold: 80, lowFoodThreshold: 55,
    warningDays: 2, preparationDays: 5, activeDays: 2, aftermathDays: 7,
    baseCooldownDays: 360, severityCooldownDays: 30,
  },
}
export const REGIONS: Record<RegionId, { name: string; subtitle: string }> = {
  village: { name: '橡谷聚落', subtitle: '你的生活，從這裡開始' },
  farmland: { name: '東方農田', subtitle: '種下今天，收穫明天' },
  forest: { name: '北方森林', subtitle: '林間的腳步聲愈來愈多' },
  mine: { name: '灰石礦場', subtitle: '石塊與鐵礦，藏在山腳下' },
  unknown: { name: '迷霧山谷', subtitle: '地圖之外，還有故事' },
}
export const BUILDINGS: Record<BuildingId, { name: string; position: Position; opens: number; closes: number }> = {
  house: { name: '家', position: { x: 7, y: 9 }, opens: 0, closes: 24 },
  farm: { name: '農田', position: { x: 16, y: 10 }, opens: 0, closes: 24 },
  store: { name: '雜貨店', position: { x: 10, y: 8 }, opens: 8, closes: 20 },
  inn: { name: '旅店', position: { x: 7, y: 11 }, opens: 0, closes: 24 },
  tavern: { name: '酒館', position: { x: 11, y: 11 }, opens: 17, closes: 24 },
  blacksmith: { name: '鐵匠鋪', position: { x: 12, y: 8 }, opens: 8, closes: 18 },
}
export const ITEMS: Record<ItemId, { name: string; price: number; sell: number; minStage: number }> = {
  wood: { name: '木材', price: 8, sell: 4, minStage: 0 }, stone: { name: '石材', price: 6, sell: 3, minStage: 0 },
  iron: { name: '鐵礦', price: 16, sell: 8, minStage: 0 }, food: { name: '食物', price: 10, sell: 5, minStage: 0 },
  material: { name: '怪物素材', price: 20, sell: 10, minStage: 0 }, potion: { name: '治療藥水', price: 20, sell: 10, minStage: 0 },
  sword: { name: '鐵劍', price: 70, sell: 35, minStage: 1 }, armor: { name: '皮甲', price: 55, sell: 27, minStage: 1 },
}
export const MONSTERS = {
  slime: { name: '史萊姆', level: 1, spawnLevel: 1, boss: false, hp: 18, attack: 5, defense: 0, exp: 15, gold: 8, loot: 'material' as ItemId },
  wolf: { name: '灰狼', level: 2, spawnLevel: 1, boss: false, hp: 30, attack: 8, defense: 1, exp: 25, gold: 12, loot: 'material' as ItemId },
  goblin: { name: '哥布林', level: 3, spawnLevel: 3, boss: false, hp: 42, attack: 10, defense: 2, exp: 35, gold: 18, loot: 'material' as ItemId },
  chief: { name: '哥布林酋長', level: 8, spawnLevel: 3, boss: true, hp: 110, attack: 17, defense: 5, exp: 150, gold: 100, loot: 'material' as ItemId },
}
export const BOSS = {
  monsterId: 'chief' as keyof typeof MONSTERS,
  warnings: [
    { progress: 35, message: '林間哥布林活動增加。樵夫帶回不安的消息。' },
    { progress: 75, message: '北方商路接連遇襲，哥布林正在聚集。' },
  ],
}
export const JOBS: Record<JobId, { name: string; skill: 'farming' | 'mining' | 'woodcutting' | 'combat'; workplace: Position }> = {
  farmer: { name: '農夫', skill: 'farming', workplace: BUILDINGS.farm.position },
  miner: { name: '礦工', skill: 'mining', workplace: { x: 19, y: 5 } },
  woodcutter: { name: '樵夫', skill: 'woodcutting', workplace: { x: 5, y: 4 } },
  blacksmith: { name: '鐵匠', skill: 'mining', workplace: BUILDINGS.blacksmith.position },
  shopkeeper: { name: '店主', skill: 'farming', workplace: BUILDINGS.store.position },
  guard: { name: '守衛', skill: 'combat', workplace: { x: 8, y: 6 } },
  mercenary: { name: '傭兵', skill: 'combat', workplace: BUILDINGS.tavern.position },
}
export const CROP = { name: '小麥', duration: CONFIG.cropMinutes, yield: 5 }
export const EQUIPMENT = { sword: { attack: 7 }, armor: { defense: 5 } }
export const ARCHETYPES = { fighter: { damage: 4, guard: 3 }, healer: { heal: 8 } }
export const DUNGEON = { name: '廢棄礦坑', position: { x: 20, y: 3 }, encounters: ['slime', 'goblin', 'chief'] as const }
