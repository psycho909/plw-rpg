import type { IdentityId } from '../domain/life'
import type { GameState, SkillId } from '../domain/types'
import { IDENTITY_LIMITS, IDENTITY_RULES, REPUTATION_BOUNDS, REPUTATION_LABELS } from '../data/identity'
import { emit } from './events'

function boundedValue(value: number) {
  return Math.max(REPUTATION_BOUNDS.min, Math.min(REPUTATION_BOUNDS.max, value))
}

function reputationTier(reputation: number) {
  const value = Number.isFinite(reputation) ? boundedValue(reputation) : 0
  return [...REPUTATION_LABELS].reverse().find(tier => value >= tier.min) ?? REPUTATION_LABELS[0]
}

export function reputationLabel(reputation: number): string {
  return reputationTier(reputation).label
}

function addMilestone(state: GameState, characterId: string, id: string, text: string) {
  const life = state.life.characters[characterId]
  if (!life || life.milestones.some(milestone => milestone.id === id)) return false
  life.milestones.push({ id, at: state.worldTime, text })
  if (life.milestones.length > IDENTITY_LIMITS.milestones) {
    life.milestones.splice(0, life.milestones.length - IDENTITY_LIMITS.milestones)
  }
  return true
}

function qualifies(state: GameState, characterId: string, id: Exclude<IdentityId, 'resident'>) {
  const life = state.life.characters[characterId]!
  const character = state.characters.find(candidate => candidate.id === characterId)!
  const rule = IDENTITY_RULES[id]
  if (rule.property) {
    return state.life.properties.some(property => property.ownerId === characterId && property.kind === rule.property)
  }

  const career = state.life.npcs[characterId]?.careerJob
  const careerMatches = rule.careerJobs?.includes(career!) ?? false
  const skillMatches = rule.skill !== undefined && rule.minActions !== undefined && rule.minSkillLevel !== undefined
    && life.actions[rule.skill] >= rule.minActions && character.skills[rule.skill].level >= rule.minSkillLevel
  return careerMatches || skillMatches
}

export function refreshIdentity(state: GameState, characterId = state.activeCharacterId): IdentityId[] {
  const character = state.characters.find(candidate => candidate.id === characterId)
  const life = state.life.characters[characterId]
  if (!character || !life || !character.isAlive) return []

  const added: IdentityId[] = []
  for (const id of Object.keys(IDENTITY_RULES) as Exclude<IdentityId, 'resident'>[]) {
    if (life.identities.includes(id) || !qualifies(state, characterId, id)) continue
    if (awardIdentity(state, characterId, id)) added.push(id)
  }
  return added
}

/** Record one permanent identity through the same bounded milestone/event path. */
export function awardIdentity(state: GameState, characterId: string, id: Exclude<IdentityId, 'resident'>): boolean {
  const character = state.characters.find(candidate => candidate.id === characterId)
  const life = state.life.characters[characterId]
  if (!character || !life || !character.isAlive || life.identities.includes(id)) return false
  life.identities.push(id)
  const label = IDENTITY_RULES[id].label
  addMilestone(state, characterId, `identity:${id}`, `成為${label}`)
  emit(state, 'identity.formed', characterId === state.activeCharacterId ? 'player' : 'npc', `${character.name}成為${label}。`, true)
  return true
}

export function recordLifeAction(state: GameState, skill: SkillId, amount = 1, characterId = state.activeCharacterId): IdentityId[] {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new RangeError('人生行為次數必須是正 safe integer。')
  const character = state.characters.find(candidate => candidate.id === characterId)
  const life = state.life.characters[characterId]
  if (!character || !life || !character.isAlive) return []
  const total = life.actions[skill] + amount
  if (!Number.isSafeInteger(total)) throw new RangeError('人生行為次數超出 safe integer 範圍。')
  life.actions[skill] = total
  return refreshIdentity(state, characterId)
}

export function changeReputation(state: GameState, delta: number, reason: string, actorId = state.activeCharacterId): number {
  if (!Number.isFinite(delta)) throw new RangeError('聲望變化必須是有限數字。')
  const character = state.characters.find(candidate => candidate.id === actorId)
  const life = state.life.characters[actorId]
  if (!character || !life || !character.isAlive) return life?.reputation ?? 0

  const previousReputation = boundedValue(life.reputation)
  const nextReputation = boundedValue(previousReputation + delta)
  const actualDelta = nextReputation - previousReputation
  if (actualDelta === 0) return previousReputation

  const previousTier = reputationTier(previousReputation)
  life.reputation = nextReputation
  life.reputationHistory.push({ at: state.worldTime, delta: actualDelta, reason: reason.trim() || '地方聲望變化' })
  if (life.reputationHistory.length > IDENTITY_LIMITS.reputationHistory) {
    life.reputationHistory.splice(0, life.reputationHistory.length - IDENTITY_LIMITS.reputationHistory)
  }

  const nextTier = reputationTier(nextReputation)
  if (previousTier.id !== nextTier.id) {
    const firstReachedTier = addMilestone(state, actorId, `reputation:${nextTier.id}`, `在橡谷的名聲成為${nextTier.label}`)
    if (firstReachedTier) {
      emit(state, 'reputation.rankChanged', actorId === state.activeCharacterId ? 'settlement' : 'npc',
        `${character.name}在橡谷的名聲從「${previousTier.label}」轉為「${nextTier.label}」。`, true)
    }
  }
  return nextReputation
}

export function meetsSettlementReputation(state: GameState, minimum: number, characterId = state.activeCharacterId): boolean {
  const reputation = state.life.characters[characterId]?.reputation
  return Number.isFinite(minimum) && reputation !== undefined && boundedValue(reputation) >= minimum
}
