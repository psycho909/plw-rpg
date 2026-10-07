import type { RewardState } from '../domain/reward'

// Migration is deliberately pure: no world construction, time advancement or RNG consumption.
export function emptyReward(): RewardState {
  return { schemaVersion: 2, nextInstanceId: 1, instances: [], equipped: {}, materials: {},
    collection: { seen: [], defeated: [], bases: [], materials: [], bosses: [], rareBases: [] }, wolfBossDefeatedAt: null, wolfBossForm: null }
}

/** Called only after a v1 reward object has passed the v1 strict validator. */
export function migrateRewardV1(value: unknown): RewardState {
  const legacy = value as Omit<RewardState, 'schemaVersion' | 'instances'> & {
    schemaVersion: 1
    instances: Omit<RewardState['instances'][number], 'craftProvenance'>[]
  }
  return {
    ...legacy,
    schemaVersion: 2,
    instances: legacy.instances.map(item => ({ ...item, craftProvenance: null })),
  }
}
