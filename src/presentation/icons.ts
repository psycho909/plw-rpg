import type { BuildingId, ItemId, JobId, RegionId } from '../domain/types'

export const terrainIcons = { water: '≈', grass: '·', forest: '♣', field: '≋', mountain: '▲', road: '' }
export const buildingIcons: Record<BuildingId, string> = { house: '🏠', farm: '🌾', store: '🏪', inn: '🛏️', tavern: '🍺', blacksmith: '⚒️' }
export const jobIcons: Record<JobId, string> = { farmer: '👨‍🌾', miner: '⛏️', woodcutter: '🪓', blacksmith: '⚒️', shopkeeper: '🧺', guard: '🛡️', mercenary: '⚔️' }
export const itemIcons: Record<ItemId, string> = { wood: '🪵', stone: '🪨', iron: '⛏️', food: '🌾', material: '🦴', potion: '🧪', sword: '⚔️', armor: '🦺' }
export const regionIcons: Record<RegionId, string> = { village: '🏘️', farmland: '🌾', forest: '🌲', mine: '⛰️', unknown: '🕳️' }
export const monsterIcons = { slime: '🟢', wolf: '🐺', goblin: '👺', chief: '👹' }
export const stages = { hamlet: '小聚落', village: '村莊', town: '城鎮' }
export const activities = { sleep: '睡眠', work: '工作', leisure: '休閒', travel: '移動' }
export const lifeStages = { child: '孩童', young: '青年', adult: '成年', middleAge: '中年', elder: '長者' }
