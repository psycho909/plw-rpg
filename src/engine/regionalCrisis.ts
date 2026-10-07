import { CONFIG } from '../data/config'
import {
  REGIONAL_CRISIS_OUTCOME_COOLDOWN_DAYS, type RegionalCrisisOutcome,
  type RegionalCrisisResolutionSummary, type RegionalCrisisState,
} from '../domain/crisis'
import { emptyRegionalCrisisContributions } from '../domain/crisis'
import type { GameState } from '../domain/types'
import { emit } from './events'
import { random } from './random'

const DAY = CONFIG.minutesPerDay
const { regionalCrisis: rules } = CONFIG

export function regionalCrisisId(worldSeed: number, sequence: number) {
  return `goblin-regional:${(worldSeed >>> 0).toString(16).padStart(8, '0')}:${sequence}`
}

export function isRegionalCrisisEligible(state: GameState) {
  const crisis = state.regionalCrisis
  return crisis.phase === 'dormant' && state.worldTime >= crisis.cooldownUntil
    && state.threat.monsterPopulation >= rules.minimumMonsterPopulation
    && state.threat.campLevel >= rules.minimumCampLevel
    && (state.settlement.safety <= rules.lowSafetyThreshold || state.settlement.food <= rules.lowFoodThreshold || state.threat.bossAlive)
}

function triggerConditions(state: GameState) {
  const conditions: ('low_safety' | 'low_food' | 'chief_present')[] = []
  if (state.settlement.safety <= rules.lowSafetyThreshold) conditions.push('low_safety')
  if (state.settlement.food <= rules.lowFoodThreshold) conditions.push('low_food')
  if (state.threat.bossAlive) conditions.push('chief_present')
  return conditions
}

function crisisSnapshot(state: GameState, sequence: number): RegionalCrisisState {
  const threatEnd = state.threat
  const severity = Math.min(3, Math.max(1, threatEnd.threatLevel)) as 1 | 2 | 3
  return {
    phase: 'warning',
    id: regionalCrisisId(state.worldSeed, sequence),
    sequence,
    type: 'goblin_regional',
    region: 'forest',
    severity,
    triggeredAt: state.worldTime,
    phaseStartedAt: state.worldTime,
    phaseEndsAt: state.worldTime + rules.warningDays * DAY,
    cause: {
      threatLevel: threatEnd.threatLevel,
      monsterPopulation: threatEnd.monsterPopulation,
      campLevel: threatEnd.campLevel,
      bossAlive: threatEnd.bossAlive,
      settlementSafety: state.settlement.safety,
      settlementFood: state.settlement.food,
      conditions: triggerConditions(state),
    },
    chiefOutcome: null,
    contributions: emptyRegionalCrisisContributions(),
    adventure: { campRaidAt: null },
  }
}

export function tryStartRegionalCrisis(state: GameState, roll: () => number = () => random(state)) {
  if (!isRegionalCrisisEligible(state)) return false
  const crisis = state.regionalCrisis
  const sequence = crisis.sequence + 1
  const phaseEndsAt = state.worldTime + rules.warningDays * DAY
  if (!Number.isSafeInteger(sequence) || sequence >= Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(phaseEndsAt)
    || !Number.isSafeInteger(state.eventSequence) || state.eventSequence >= Number.MAX_SAFE_INTEGER - 1) return false
  const chance = roll()
  if (!Number.isFinite(chance) || chance < 0 || chance >= 1) throw new RangeError('危機觸發抽樣必須介於 0（含）與 1（不含）之間。')
  if (chance >= rules.dailyTriggerChance) return false
  state.regionalCrisis = crisisSnapshot(state, sequence)
  emit(state, 'regional-crisis.warning', 'monster', '北方哥布林活動升高，橡谷居民開始為可能的危機做準備。', true)
  return true
}

export function advanceRegionalCrisisState(crisis: RegionalCrisisState, at: number): RegionalCrisisState {
  if (!Number.isSafeInteger(at)) return crisis
  switch (crisis.phase) {
    case 'dormant':
    case 'resolution':
      return crisis
    case 'warning':
      if (at < crisis.phaseEndsAt) return crisis
      if (!Number.isSafeInteger(crisis.phaseEndsAt + rules.preparationDays * DAY)) return crisis
      return { ...crisis, phase: 'preparation', phaseStartedAt: crisis.phaseEndsAt,
        phaseEndsAt: crisis.phaseEndsAt + rules.preparationDays * DAY }
    case 'preparation':
      if (at < crisis.phaseEndsAt) return crisis
      if (!Number.isSafeInteger(crisis.phaseEndsAt + rules.activeDays * DAY)) return crisis
      return { ...crisis, phase: 'active', phaseStartedAt: crisis.phaseEndsAt,
        phaseEndsAt: crisis.phaseEndsAt + rules.activeDays * DAY }
    case 'active':
      if (at < crisis.phaseEndsAt) return crisis
      {
        const { phaseEndsAt: _phaseEndsAt, ...instance } = crisis
        return { ...instance, phase: 'resolution', phaseStartedAt: crisis.phaseEndsAt }
      }
    case 'aftermath':
      if (at < crisis.phaseEndsAt) return crisis
      {
        const outcomeExtra = crisis.resolutionSummary === null ? 0 : REGIONAL_CRISIS_OUTCOME_COOLDOWN_DAYS[crisis.outcome]
        const pressureDays = crisis.resolutionSummary?.pressureDays ?? 0
        const cooldownDuration = rules.baseCooldownDays + crisis.severity * rules.severityCooldownDays + outcomeExtra + pressureDays
        if (!Number.isSafeInteger(crisis.phaseEndsAt + cooldownDuration * DAY)) return crisis
      return { ...crisis, phase: 'cooldown', phaseStartedAt: crisis.phaseEndsAt,
          phaseEndsAt: crisis.phaseEndsAt + cooldownDuration * DAY,
          cooldownUntil: crisis.phaseEndsAt + cooldownDuration * DAY }
      }
    case 'cooldown':
      if (at < crisis.cooldownUntil) return crisis
      return { phase: 'dormant', sequence: crisis.sequence, cooldownUntil: crisis.cooldownUntil, lastResolvedAt: crisis.resolvedAt }
  }
}

export function completeRegionalCrisisTransition(
  crisis: RegionalCrisisState, outcome: RegionalCrisisOutcome, at: number,
  resolutionSummary: RegionalCrisisResolutionSummary | null = null,
): RegionalCrisisState {
  if (crisis.phase !== 'resolution' || !Number.isSafeInteger(at) || at < crisis.phaseStartedAt) return crisis
  const phaseEndsAt = at + rules.aftermathDays * DAY
  if (!Number.isSafeInteger(phaseEndsAt)) return crisis
  return { ...crisis, phase: 'aftermath', outcome, resolvedAt: at, phaseStartedAt: at, phaseEndsAt, resolutionSummary }
}

export function recordRegionalChiefOutcome(
  crisis: RegionalCrisisState,
  outcome: { actorKind: 'player' | 'npc'; actorId: string; at: number },
): RegionalCrisisState {
  if (!('id' in crisis) || !['warning', 'preparation', 'active', 'resolution'].includes(crisis.phase)
    || crisis.chiefOutcome || !outcome.actorId || outcome.actorId.length > 128 || !Number.isSafeInteger(outcome.at)) return crisis
  return { ...crisis, chiefOutcome: { ...outcome } }
}

function phaseMessage(phase: RegionalCrisisState['phase']) {
  switch (phase) {
    case 'preparation': return '橡谷獲得了準備時間。'
    case 'active': return '哥布林危機已逼近橡谷。'
    case 'resolution': return '危機進入結算階段，世界狀態仍待評估。'
    case 'cooldown': return '危機進入休整期。'
    case 'dormant': return '危機後的休整期已結束。'
    case 'warning':
    case 'aftermath':
      return ''
  }
}

export function advanceRegionalCrisis(state: GameState) {
  if (state.regionalCrisis.phase === 'dormant') return tryStartRegionalCrisis(state)
  const prior = state.regionalCrisis
  const next = advanceRegionalCrisisState(prior, state.worldTime)
  if (next === prior) return false
  state.regionalCrisis = next
  const message = phaseMessage(next.phase)
  if (message && state.eventSequence < Number.MAX_SAFE_INTEGER - 1) {
    emit(state, `regional-crisis.${next.phase}`, 'settlement', message)
  }
  return true
}

export function recordRegionalChiefDefeat(state: GameState, actorKind: 'player' | 'npc', actorId: string) {
  const prior = state.regionalCrisis
  const next = recordRegionalChiefOutcome(prior, { actorKind, actorId, at: state.worldTime })
  if (next === prior) return false
  state.regionalCrisis = next
  return true
}
