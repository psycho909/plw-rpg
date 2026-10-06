import type { RewardState } from '../domain/reward'

// Migration is deliberately pure: no world construction, time advancement or RNG consumption.
export function emptyReward(): RewardState {
  return { schemaVersion: 1, nextInstanceId: 1, instances: [], equipped: {}, materials: {},
    collection: { seen: [], defeated: [], bases: [], materials: [], bosses: [], rareBases: [] }, wolfBossDefeatedAt: null, wolfBossForm: null }
}
