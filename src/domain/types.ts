import type { WorldLife } from './life'
import type { FamilyEncounter, RewardState } from './reward'
import type { RegionalCrisisState } from './crisis'
export type RegionId = 'village' | 'farmland' | 'forest' | 'mine' | 'unknown'
export type LifeStage = 'child' | 'young' | 'adult' | 'middleAge' | 'elder'
export type SkillId = 'combat' | 'farming' | 'mining' | 'woodcutting' | 'smithing'
export type ItemId = 'wood' | 'stone' | 'iron' | 'food' | 'material' | 'potion' | 'sword' | 'armor'
export type JobId = 'farmer' | 'miner' | 'woodcutter' | 'blacksmith' | 'shopkeeper' | 'guard' | 'mercenary'
export type BuildingId = 'house' | 'farm' | 'store' | 'inn' | 'tavern' | 'blacksmith'
export type Category = 'player' | 'npc' | 'world' | 'monster' | 'settlement'
export type Activity = 'sleep' | 'work' | 'leisure' | 'travel'
export type Position = { x: number; y: number }
export interface Character {
  id: string; name: string; birthYear: number; age: number; lifeStage: LifeStage
  level: number; exp: number; hp: number; maxHp: number; stamina: number; maxStamina: number
  stats: { strength: number; vitality: number; dexterity: number; intelligence: number }
  skills: Record<SkillId, { level: number; exp: number }>
  gold: number; inventory: Record<ItemId, number>; equipment: { weapon: ItemId | null; armor: ItemId | null }
  position: Position; currentRegion: RegionId; status: 'idle' | 'combat' | 'dead'
  isAlive: boolean; deathYear: number | null; deathCause: string | null; lifespan: number
}
export interface NPC extends Character {
  job: JobId; home: Position; workplace: Position; currentActivity: Activity
  schedule: { start: number; activity: Activity; destination: 'home' | 'workplace' | 'square' }[]
  injuredUntil: number
}
export interface Tile extends Position { terrain: 'water' | 'grass' | 'forest' | 'field' | 'mountain' | 'road'; regionId: RegionId; discovered: boolean; walkable: boolean; building?: BuildingId }
export interface WorldEvent { id: number; at: number; type: string; category: Category; message: string; tier?: 'transient' | 'gameplay' | 'major' | 'debug' }
export interface RegionalCrisisCombatObjective {
  kind: 'camp_raid'
  crisisId: string
  startedAt: number
}
export interface CombatState {
  monsterId: string; hp: number; maxHp: number; attack: number; defense: number; exp: number; gold: number
  elite: boolean; dungeon: boolean; familyEncounter?: FamilyEncounter; regionalCrisisObjective?: RegionalCrisisCombatObjective
}
export interface GameState {
  reward: RewardState
  life: WorldLife
  saveVersion: number; worldSeed: number; rngState: number; worldTime: number; activeCharacterId: string
  characters: Character[]; npcs: NPC[]; tiles: Tile[]
  settlement: { name: string; stage: 'hamlet' | 'village' | 'town'; capacity: number; food: number; prosperity: number; safety: number; infrastructure: number; growth: number; buildings: BuildingId[] }
  regions: Record<RegionId, { discovered: boolean; remainingAmount: number; regenerationRate: number }>
  threat: { monsterPopulation: number; threatLevel: number; growthRate: number; bossProgress: number; campLevel: number; bossAlive: boolean; warningLevel: number }
  regionalCrisis: RegionalCrisisState
  dungeon: { discovered: boolean; threat: number; progress: number; runs: number; stage: number; inDungeon: boolean }
  crops: { id: number; plantedAt: number; growthDuration: number; matureAt: number; status: 'growing' | 'mature' }[]; preparedPlots: number
  party: { npcId: string; hireCost: number; dailyWage: number; contractEnd: number; archetype: 'fighter' | 'healer' }[]
  combat: CombatState | null
  events: WorldEvent[]; history: WorldEvent[]; eventSequence: number; nextNpcId: number
}
