import type { ItemId, JobId, Position, SkillId } from './types'

export type Origin = 'OTHER_WORLD' | 'LOCAL_WORLD'
export type Trait = 'brave' | 'cautious' | 'ambitious' | 'content' | 'hardworking' | 'wanderer' | 'social' | 'solitary'
export type CareerStage = 'resident' | 'apprentice' | 'worker' | 'experienced' | 'senior' | 'owner' | 'retired'
export type IdentityId = 'resident' | 'farmer' | 'skilledFarmer' | 'miner' | 'skilledMiner' | 'adventurer' | 'veteran' | 'farmOwner'
export interface LifeMilestone { id: string; at: number; text: string }
export interface ImportantMemory {
  kind: 'PLAYER_HELPED_ME' | 'PLAYER_HIRED_ME' | 'PLAYER_SAVED_ME' | 'PLAYER_FAILED_ME' | 'PLAYER_DEFENDED_OAKVALE' | 'PLAYER_OWNS_FARM' | 'PLAYER_SUPPORTED_FOOD' | 'GOBLIN_CHIEF_DEFEATED' | 'DUNGEON_DISCOVERED' | 'MAJOR_DISASTER'
  actorId: string; at: number; detail: string
}
export interface CharacterLife {
  origin: Origin; generation: number; identities: IdentityId[]
  actions: Record<SkillId, number>; reputation: number
  reputationHistory: { at: number; delta: number; reason: string }[]
  milestones: LifeMilestone[]
}
export interface NpcLife {
  visitor?: { kind: 'elf' | 'mage' | 'knight' | 'adventurer' | 'merchant'; until: number }
  traits: Trait[]; career: CareerStage; careerJob: JobId; featured: boolean
  concern: string; memories: ImportantMemory[]; milestones: LifeMilestone[]
}
export interface Property {
  id: string; kind: 'home' | 'land' | 'farmBusiness'; ownerId: string
  acquiredAt: number; position: Position; storage: Record<ItemId, number>
  foodSupplied: number; suppliedDay: number; suppliedToday: number
}
export type ArcKind = 'road' | 'food' | 'iron'
export type ArcStage = 'signal' | 'development' | 'reaction' | 'outcome' | 'consequence'
export interface EventArc {
  id: string; kind: ArcKind; stage: ArcStage; startedAt: number; stageAt: number
  resolved: boolean; outcome: 'pending' | 'helped' | 'ignored'; participants: string[]
}
export interface WorldRequest {
  id: string; kind: 'food' | 'hunt' | 'iron' | 'medicine'; npcId: string | null
  arcId: string | null; createdAt: number; expiresAt: number
  status: 'open' | 'completed' | 'expired'; amount: number; progress: number
}
export interface WorldNews {
  id: string; at: number; scope: 'local' | 'regional' | 'rumor' | 'major'; text: string
}
export interface WorldLife {
  canon: 'OAKVALE_LIFE_EMERGENCE'; openingSeen: boolean
  characters: Record<string, CharacterLife>; npcs: Record<string, NpcLife>
  properties: Property[]; settlementMemories: ImportantMemory[]; worldMemories: ImportantMemory[]
  arcs: EventArc[]; requests: WorldRequest[]; news: WorldNews[]
  director: {
    lastEventAt: number; quietUntil: number; cooldowns: Record<string, number>
    recentMajor: number[]; recentCrises: number[]; lastPlayerActivity: number
    stability: number; tradePenalty: number; ironReserve: number; sequence: number
  }
}
