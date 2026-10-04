import type { IdentityId } from '../domain/life'
import type { JobId, SkillId } from '../domain/types'

export interface IdentityRule {
  label: string
  skill?: SkillId
  careerJobs?: JobId[]
  minActions?: number
  minSkillLevel?: number
  property?: 'farmBusiness'
}

export const IDENTITY_RULES: Record<Exclude<IdentityId, 'resident'>, IdentityRule> = {
  farmer: { label: '農夫', skill: 'farming', careerJobs: ['farmer'], minActions: 10, minSkillLevel: 2 },
  skilledFarmer: { label: '熟練農夫', skill: 'farming', minActions: 40, minSkillLevel: 4 },
  miner: { label: '礦工', skill: 'mining', careerJobs: ['miner'], minActions: 10, minSkillLevel: 2 },
  skilledMiner: { label: '熟練礦工', skill: 'mining', minActions: 40, minSkillLevel: 4 },
  adventurer: { label: '冒險者', skill: 'combat', careerJobs: ['guard', 'mercenary'], minActions: 10, minSkillLevel: 2 },
  veteran: { label: '資深冒險者', skill: 'combat', minActions: 50, minSkillLevel: 5 },
  farmOwner: { label: '農場主人', property: 'farmBusiness' },
}

export const IDENTITY_LIMITS = { milestones: 32, reputationHistory: 64 } as const

export const REPUTATION_BOUNDS = { min: -100, max: 100 } as const

export const REPUTATION_LABELS = [
  { id: 'ostracized', min: -100, label: '不受歡迎' },
  { id: 'damaged', min: -25, label: '名聲受損' },
  { id: 'ordinary', min: 0, label: '普通居民' },
  { id: 'familiar', min: 25, label: '熟面孔' },
  { id: 'trusted', min: 60, label: '受信任' },
  { id: 'honored', min: 90, label: '深受敬重' },
] as const
