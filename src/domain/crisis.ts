import type { EquipmentSlot, ItemInstance } from './reward'

export type RegionalCrisisOutcome = 'decisive_success' | 'costly_success' | 'setback' | 'local_defeat'
export type RegionalCrisisTriggerCondition = 'low_safety' | 'low_food' | 'chief_present'

export interface RegionalCrisisCause {
  threatLevel: number
  monsterPopulation: number
  campLevel: number
  bossAlive: boolean
  settlementSafety: number
  settlementFood: number
  conditions: RegionalCrisisTriggerCondition[]
}

export interface RegionalCrisisChiefOutcome {
  actorKind: 'player' | 'npc'
  actorId: string
  at: number
}

export interface CrisisContributionCredit {
  donorId: string
  amount: number
}

export interface CrisisEquipmentAllocation {
  defenderNpcId: string
  slot: EquipmentSlot
  donorId: string
  contributedAt: number
  sourceItem: ItemInstance
}

export interface RegionalCrisisContributions {
  equipment: CrisisEquipmentAllocation[]
  food: { supplied: number; credits: CrisisContributionCredit[] }
  gold: { spent: number; credits: CrisisContributionCredit[] }
}

export const REGIONAL_CRISIS_CONTRIBUTION_LIMITS = {
  equipmentAllocations: 16,
  foodSupply: 100,
  gold: 100,
  foodPerInventoryItem: 4,
  goldPerLogisticsWorker: 5,
  logisticsWorkers: 20,
} as const

export function emptyRegionalCrisisContributions(): RegionalCrisisContributions {
  return { equipment: [], food: { supplied: 0, credits: [] }, gold: { spent: 0, credits: [] } }
}

interface CrisisInstance {
  id: string
  sequence: number
  type: 'goblin_regional'
  region: 'forest'
  severity: 1 | 2 | 3
  triggeredAt: number
  cause: RegionalCrisisCause
  chiefOutcome: RegionalCrisisChiefOutcome | null
  contributions: RegionalCrisisContributions
}

export type RegionalCrisisState =
  | { phase: 'dormant'; sequence: number; cooldownUntil: number; lastResolvedAt: number | null }
  | (CrisisInstance & { phase: 'warning'; phaseStartedAt: number; phaseEndsAt: number })
  | (CrisisInstance & { phase: 'preparation'; phaseStartedAt: number; phaseEndsAt: number })
  | (CrisisInstance & { phase: 'active'; phaseStartedAt: number; phaseEndsAt: number })
  | (CrisisInstance & { phase: 'resolution'; phaseStartedAt: number })
  | (CrisisInstance & { phase: 'aftermath'; phaseStartedAt: number; phaseEndsAt: number; outcome: RegionalCrisisOutcome; resolvedAt: number })
  | (CrisisInstance & { phase: 'cooldown'; phaseStartedAt: number; phaseEndsAt: number; cooldownUntil: number; outcome: RegionalCrisisOutcome; resolvedAt: number })

export function dormantRegionalCrisis(sequence = 0, cooldownUntil = 0, lastResolvedAt: number | null = null): RegionalCrisisState {
  return { phase: 'dormant', sequence, cooldownUntil, lastResolvedAt }
}
