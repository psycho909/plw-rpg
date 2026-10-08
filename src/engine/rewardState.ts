import type { RewardState } from '../domain/reward'
import { LEGACY_MATERIALS, MATERIALS } from '../data/rewards'

function zeroMaterialStacks(stacks: Record<string, number>) {
  return Object.fromEntries(Object.keys(MATERIALS).map(id => [id, stacks[id] ?? 0]))
}

function normalizeBossForms(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value).map(([bossId, form]) => {
    if (form && typeof form === 'object' && !Array.isArray(form) && Object.hasOwn(form, 'kind')) return [bossId, form]
    // Reward3 saves from the first C build stored the frozen encounter directly.
    return [bossId, { kind: 'frozenEncounter', encounter: form }]
  }))
}

// Migration is deliberately pure: no world construction, time advancement or RNG consumption.
export function emptyReward(): RewardState {
  return { schemaVersion: 3, nextInstanceId: 1, instances: [], equipped: {}, materials: {},
    collection: { seen: [], defeated: [], bases: [], materials: [], bosses: [], rareBases: [] },
    wolfBossDefeatedAt: null, wolfBossForm: null, bossForms: {} }
}

/** Called only after a v1 reward object has passed the v1 strict validator. */
export function migrateRewardV1(value: unknown): RewardState {
  const legacy = value as Omit<RewardState, 'schemaVersion' | 'instances'> & {
    schemaVersion: 1
    instances: Omit<RewardState['instances'][number], 'craftProvenance'>[]
  }
  return {
    ...legacy,
    schemaVersion: 3,
    instances: legacy.instances.map(item => ({ ...item, craftProvenance: null })),
    materials: Object.fromEntries(Object.entries(legacy.materials).map(([ownerId, stacks]) => [ownerId,
      zeroMaterialStacks(stacks as unknown as Record<string, number>)])),
    bossForms: {},
  }
}

/** Called only after a V2 reward object has passed its legacy strict validator. */
export function migrateRewardV2(value: unknown): RewardState {
  const legacy = value as Omit<RewardState, 'schemaVersion' | 'bossForms'> & { schemaVersion: 2 }
  return {
    ...legacy,
    schemaVersion: 3,
    materials: Object.fromEntries(Object.entries(legacy.materials).map(([ownerId, stacks]) => [ownerId,
      zeroMaterialStacks(stacks as unknown as Record<string, number>)])),
    bossForms: {},
  }
}

/**
 * Catalog growth is a narrow Reward3 normalization: only new Phase7 materials are defaulted,
 * and the previous raw frozen-boss form gets its deterministic discriminator. Other fields stay strict.
 * Legacy core material keys remain required, all supplied values are preserved, and unknown keys reject.
 */
export function normalizeRewardV3MaterialKeys(value: unknown): RewardState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const reward = value as Record<string, unknown>
  const materials = reward.materials
  const bossForms = normalizeBossForms(reward.bossForms)
  if (reward.schemaVersion !== 3 || !materials || typeof materials !== 'object' || Array.isArray(materials) || !bossForms) return null
  const currentIds = Object.keys(MATERIALS)
  const legacyIds = Object.keys(LEGACY_MATERIALS)
  const normalized: Record<string, Record<string, number>> = {}
  for (const [ownerId, rawStacks] of Object.entries(materials)) {
    if (!rawStacks || typeof rawStacks !== 'object' || Array.isArray(rawStacks)) return null
    const stacks = rawStacks as Record<string, unknown>
    if (Object.keys(stacks).some(id => !currentIds.includes(id))
      || legacyIds.some(id => !Object.hasOwn(stacks, id))
      || Object.values(stacks).some(amount => !Number.isSafeInteger(amount) || Number(amount) < 0)) return null
    normalized[ownerId] = Object.fromEntries(currentIds.map(id => [id, Object.hasOwn(stacks, id) ? stacks[id] as number : 0]))
  }
  return { ...reward, materials: normalized, bossForms } as unknown as RewardState
}
