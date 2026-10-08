import {
  REGIONAL_CRISIS_CONTRIBUTION_LIMITS,
  type RegionalCrisisState,
} from '../domain/crisis'
import type { EquipmentSlot, ItemInstance } from '../domain/reward'
import type { GameState } from '../domain/types'
import { changeReputation } from './identity'
import { civilDefenseGearEffect } from './civilDefense'
import { emit } from './events'

const SUPPLY_CREDIT_THRESHOLD = 5
const CRAFT_EFFECT_THRESHOLD = 1
const MAJOR_CONTRIBUTION_REPUTATION = 3
const MAX_CONTRIBUTION_EMITS = 3

type MajorContributionKind = 'supply' | 'craft' | 'camp'

function crisisContributions(crisis: RegionalCrisisState) {
  return crisis.phase === 'dormant' ? null : crisis.contributions
}

function creditedSupply(crisis: RegionalCrisisState, donorId: string, kind: 'food' | 'gold') {
  const contributions = crisisContributions(crisis)
  if (!contributions) return 0
  return contributions[kind].credits.find(credit => credit.donorId === donorId)?.amount ?? 0
}

/** Tests whether this public contribution crosses the donor's normalized supply threshold. */
export function regionalCrisisSupplyThresholdCrossed(
  state: GameState,
  donorId: string,
  contribution: { food: number; gold: number },
) {
  const crisis = state.regionalCrisis
  if (crisis.phase === 'dormant') return false
  const before = creditedSupply(crisis, donorId, 'food') / REGIONAL_CRISIS_CONTRIBUTION_LIMITS.foodPerInventoryItem
    + creditedSupply(crisis, donorId, 'gold') / REGIONAL_CRISIS_CONTRIBUTION_LIMITS.goldPerLogisticsWorker
  const after = (creditedSupply(crisis, donorId, 'food') + contribution.food)
      / REGIONAL_CRISIS_CONTRIBUTION_LIMITS.foodPerInventoryItem
    + (creditedSupply(crisis, donorId, 'gold') + contribution.gold)
      / REGIONAL_CRISIS_CONTRIBUTION_LIMITS.goldPerLogisticsWorker
  return before < SUPPLY_CREDIT_THRESHOLD && after >= SUPPLY_CREDIT_THRESHOLD
}

function creatorEquipmentEffect(crisis: RegionalCrisisState, creatorId: string) {
  const contributions = crisisContributions(crisis)
  if (!contributions) return 0
  return contributions.equipment.reduce((total, allocation) => {
    if (allocation.sourceItem.craftProvenance?.createdBy !== creatorId) return total
    return total + civilDefenseGearEffect(allocation.sourceItem.rolledStats, allocation.slot, 10)
  }, 0)
}

/** Uses the immutable original crafter and rolled slot effect, never the item's later owner. */
export function regionalCrisisCraftThresholdCrossed(
  state: GameState,
  item: ItemInstance,
  slot: EquipmentSlot,
) {
  const creatorId = item.craftProvenance?.createdBy
  const crisis = state.regionalCrisis
  if (!creatorId || crisis.phase === 'dormant'
    || !state.characters.some(character => character.id === creatorId)
    || !state.life.characters[creatorId]) return false
  const before = creatorEquipmentEffect(crisis, creatorId)
  const after = before + civilDefenseGearEffect(item.rolledStats, slot, 10)
  return before < CRAFT_EFFECT_THRESHOLD && after >= CRAFT_EFFECT_THRESHOLD
}

/** Reserves the complete public contribution path before any asset or ledger mutation. */
export function hasRegionalContributionEventCapacity(state: GameState, crossesMajorThreshold: boolean) {
  const requiredEmits = crossesMajorThreshold ? MAX_CONTRIBUTION_EMITS : 1
  return Number.isSafeInteger(state.eventSequence)
    && state.eventSequence <= Number.MAX_SAFE_INTEGER - requiredEmits - 1
}

const contributionDetails: Record<MajorContributionKind, { reason: string; description: (name: string) => string }> = {
  supply: {
    reason: '供應物資支援危機',
    description: name => `${name}供應物資達到危機支援門檻。`,
  },
  craft: {
    reason: '鍛造裝備支援危機',
    description: name => `${name}鍛造的防衛裝備達到危機防衛門檻。`,
  },
  camp: {
    reason: '擊退危機營地哥布林',
    description: name => `${name}成功擊退危機營地的哥布林。`,
  },
}

/** Records one threshold crossing through the existing bounded reputation and major-history paths. */
export function recordMajorRegionalCrisisContribution(
  state: GameState,
  actorId: string,
  kind: MajorContributionKind,
) {
  const actor = state.characters.find(character => character.id === actorId)
  if (!actor || !state.life.characters[actorId]) return false
  const detail = contributionDetails[kind]
  changeReputation(state, MAJOR_CONTRIBUTION_REPUTATION, detail.reason, actorId)
  emit(state, 'regional-crisis.contribution.major', 'settlement',
    detail.description(`${actor.name}（${actor.id}${actor.isAlive ? '' : '，已故'}）`), true)
  return true
}
