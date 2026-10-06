import { CONFIG } from '../data/config'
import { BOSS_VARIANTS, MONSTER_TRAITS, WOLF_ENCOUNTER_RULES, WOLF_MONSTERS } from '../data/rewards'
import type { BossVariantId, FamilyEncounter, MonsterDefinitionId, MonsterRank, MonsterTraitId } from '../domain/reward'
import type { GameState } from '../domain/types'
import { emit } from './events'
import { random } from './random'

export interface WolfEncounterOption {
  definitionId: MonsterDefinitionId
  label: string
  rank: MonsterRank
  eligible: boolean
  reason: string | null
}

export interface WolfCombatStats {
  maxHp: number
  attack: number
  defense: number
  exp: number
  gold: number
  elite: boolean
}

export interface WolfCombatPhase {
  rush: boolean
  heavyStrike: boolean
  armored: boolean
  howl: boolean
  moonCharge: boolean
}

const rankLabels: Record<MonsterRank, string> = { normal: '普通狼', elite: '精英狼', miniBoss: '小首領', boss: '狼族首領' }
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))

function activeCharacter(state: GameState) {
  return state.characters.find(character => character.id === state.activeCharacterId)
}

function globalBlockReason(state: GameState): string | null {
  const character = activeCharacter(state)
  if (!character?.isAlive) return '角色已離世，請先選擇繼任者。'
  if (state.combat) return '請先結束目前的戰鬥。'
  if (state.dungeon.inDungeon) return '離開礦坑後才能追蹤狼族。'
  if (character.currentRegion !== 'forest') return '請先前往北方森林。'
  if (character.stamina < WOLF_ENCOUNTER_RULES.staminaCost) return '體力不足，請先休息。'
  if (state.threat.monsterPopulation < 1) return '附近暫時沒有怪物。'
  return null
}

function cooldownReason(state: GameState): string | null {
  if (state.reward.wolfBossForm || state.reward.wolfBossDefeatedAt === null) return null
  const cooldown = WOLF_ENCOUNTER_RULES.bossCooldownDays * CONFIG.minutesPerDay
  const elapsed = state.worldTime - state.reward.wolfBossDefeatedAt
  if (elapsed >= cooldown) return null
  const days = Math.ceil((cooldown - elapsed) / CONFIG.minutesPerDay)
  return `狼王再次現身前還需等待 ${days} 日。`
}

/** Pure forest track projection. It never advances time or consumes random state. */
export function wolfEncounterOptions(state: GameState): WolfEncounterOption[] {
  const globalReason = globalBlockReason(state)
  const order = WOLF_ENCOUNTER_RULES.order
  return order.map((definitionId, index) => {
    const definition = WOLF_MONSTERS[definitionId]
    const previous = index === 0 ? null : order[index - 1]!
    const unlocked = previous === null || state.reward.collection.defeated.includes(previous)
    const reason = globalReason
      ?? (!unlocked ? `先擊退${WOLF_MONSTERS[previous!].name}，才能追蹤更深處的狼群。` : null)
      ?? (definition.rank === 'boss' ? cooldownReason(state) : null)
    return { definitionId, label: definition.name, rank: definition.rank, eligible: reason === null, reason }
  })
}

function encounterContext(state: GameState): FamilyEncounter['context'] {
  const actions = state.life.characters[state.activeCharacterId]?.actions
  const hunted = actions && Number.isSafeInteger(actions.combat) && actions.combat >= 0 ? actions.combat : 0
  return {
    population: clamp(Math.floor(state.threat.monsterPopulation), 0, 100),
    hunted,
    safety: clamp(Number.isFinite(state.settlement.safety) ? state.settlement.safety : 0, 0, 100),
  }
}

function sampleTraits(state: GameState, definitionId: MonsterDefinitionId): MonsterTraitId[] {
  const definition = WOLF_MONSTERS[definitionId]
  if (definition.rank === 'miniBoss') return ['swift', 'armored']
  const count = definition.rank === 'normal'
    ? Math.floor(random(state) * 2)
    : 1 + Math.floor(random(state) * 2)
  const available: MonsterTraitId[] = Object.keys(MONSTER_TRAITS) as MonsterTraitId[]
  const traits: MonsterTraitId[] = []
  for (let index = 0; index < count; index++) {
    const selected = Math.floor(random(state) * available.length)
    traits.push(available.splice(selected, 1)[0]!)
  }
  return traits
}

function sampleBossVariant(state: GameState, context: FamilyEncounter['context']): BossVariantId {
  const weights: { id: BossVariantId; weight: number }[] = [
    { id: 'wellFed', weight: 1 + context.population / 10 + context.safety / 40 },
    { id: 'starved', weight: 1 + Math.min(context.hunted, 100) / 10 + (100 - context.population) / 25 },
    { id: 'moonlit', weight: 1 + (100 - context.safety) / 20 },
  ]
  let roll = random(state) * weights.reduce((sum, candidate) => sum + candidate.weight, 0)
  for (const candidate of weights) {
    roll -= candidate.weight
    if (roll < 0) return candidate.id
  }
  return 'moonlit'
}

function formEncounter(state: GameState, definitionId: MonsterDefinitionId, context: FamilyEncounter['context']): FamilyEncounter {
  const definition = WOLF_MONSTERS[definitionId]
  const variant = definition.rank === 'boss' ? sampleBossVariant(state, context) : null
  return { definitionId, traits: sampleTraits(state, definitionId), variant, turn: 0, formedAt: state.worldTime,
    context: { ...context }, howlActive: false }
}

/** Pure, canonical combat derivation from the frozen encounter snapshot. */
export function resolveWolfCombatStats(snapshot: Pick<FamilyEncounter, 'definitionId' | 'traits' | 'variant' | 'context'>): WolfCombatStats {
  const definition = WOLF_MONSTERS[snapshot.definitionId]
  const population = clamp(snapshot.context.population, 0, 100)
  const safety = clamp(snapshot.context.safety, 0, 100)
  let maxHp = Math.round(definition.hp * (1 + population * WOLF_ENCOUNTER_RULES.contextScalePerPopulation))
  let attack = Math.round(definition.attack * (1 + (100 - safety) * WOLF_ENCOUNTER_RULES.attackScalePerUnsafePoint))
  let defense = definition.defense

  if (definition.role === 'fast') attack += 1
  if (definition.role === 'bruiser') maxHp = Math.round(maxHp * 1.1)
  if (snapshot.traits.includes('armored')) defense += WOLF_ENCOUNTER_RULES.armoredBaseDefense
  if (snapshot.variant === 'wellFed') {
    maxHp = Math.round(maxHp * 1.1)
    attack += 1
  } else if (snapshot.variant === 'starved') {
    maxHp = Math.max(1, Math.round(maxHp * .9))
  }

  return { maxHp, attack, defense, exp: definition.exp, gold: definition.gold, elite: definition.rank === 'elite' }
}

/** Start only after every eligibility check passes, so an invalid command consumes no state or RNG. */
export function encounterWolf(state: GameState, definitionId: string): string {
  const option = wolfEncounterOptions(state).find(candidate => candidate.definitionId === definitionId)
  if (!option) return '狼族追蹤目標無效。'
  if (!option.eligible) return option.reason ?? '目前無法追蹤這個目標。'

  const character = activeCharacter(state)!
  const definition = WOLF_MONSTERS[option.definitionId]
  let encounter: FamilyEncounter
  if (definition.rank === 'boss' && state.reward.wolfBossForm) {
    encounter = { ...structuredClone(state.reward.wolfBossForm), turn: 0, howlActive: false }
  } else {
    encounter = formEncounter(state, option.definitionId, encounterContext(state))
    if (definition.rank === 'boss') state.reward.wolfBossForm = structuredClone(encounter)
  }

  const stats = resolveWolfCombatStats(encounter)
  character.stamina -= WOLF_ENCOUNTER_RULES.staminaCost
  state.combat = { monsterId: 'wolf', ...stats, hp: stats.maxHp, dungeon: false, familyEncounter: encounter }
  character.status = 'combat'
  if (!state.reward.collection.seen.includes(option.definitionId)) state.reward.collection.seen.push(option.definitionId)
  const traits = encounter.traits.map(trait => MONSTER_TRAITS[trait].name).join('、')
  emit(state, 'combat.started', 'player', `遭遇${traits ? `${traits}的` : ''}${definition.name}。`)
  state.life.director.lastPlayerActivity = state.worldTime
  return ''
}

function due(turn: number, every: number) {
  return (turn + 1) % every === 0
}

function moonChargeDue(snapshot: FamilyEncounter, hp: number, maxHp: number) {
  const variant = snapshot.variant
  if (WOLF_MONSTERS[snapshot.definitionId].core !== 'moonCharge') return false
  const period = variant === 'starved' && hp <= maxHp / 2
    ? WOLF_ENCOUNTER_RULES.starvedChargeEvery
    : WOLF_ENCOUNTER_RULES.bossChargeEvery
  return due(snapshot.turn, period)
    || (variant === 'starved' && hp <= maxHp / 2 && due(snapshot.turn, WOLF_ENCOUNTER_RULES.bossChargeEvery))
}

export function wolfCombatPhase(snapshot: FamilyEncounter, hp: number, maxHp: number): WolfCombatPhase {
  const definition = WOLF_MONSTERS[snapshot.definitionId]
  return {
    rush: (definition.role === 'fast' && due(snapshot.turn, WOLF_ENCOUNTER_RULES.fastRushEvery))
      || (snapshot.traits.includes('swift') && due(snapshot.turn, WOLF_ENCOUNTER_RULES.traitRushEvery)),
    heavyStrike: definition.role === 'bruiser' && due(snapshot.turn, WOLF_ENCOUNTER_RULES.bruiserHeavyEvery),
    armored: snapshot.traits.includes('armored') && due(snapshot.turn, WOLF_ENCOUNTER_RULES.traitRushEvery),
    howl: definition.core === 'howl' && snapshot.howlActive,
    moonCharge: moonChargeDue(snapshot, hp, maxHp),
  }
}

export function wolfDefenseForTurn(defense: number, phase: WolfCombatPhase): number {
  return defense + (phase.armored ? WOLF_ENCOUNTER_RULES.periodicArmor : 0)
}

export function wolfAttackForTurn(snapshot: FamilyEncounter, attack: number, defending: boolean, phase: WolfCombatPhase): number {
  const definition = WOLF_MONSTERS[snapshot.definitionId]
  let result = attack
  if (phase.rush && !defending) {
    const roleBonus = definition.role === 'fast' ? WOLF_ENCOUNTER_RULES.rushRoleBonus : 0
    const traitBonus = snapshot.traits.includes('swift') ? WOLF_ENCOUNTER_RULES.rushTraitBonus : 0
    result = Math.ceil(result * (1 + roleBonus + traitBonus))
  }
  if (phase.heavyStrike) result = Math.ceil(result * (1 + WOLF_ENCOUNTER_RULES.heavyStrikeBonus))
  if (phase.howl) result = Math.ceil(result * (1 + WOLF_ENCOUNTER_RULES.howlAttackBonus))
  if (phase.moonCharge) {
    const variantBonus = snapshot.variant === 'wellFed' ? WOLF_ENCOUNTER_RULES.wellFedAttackBonus : 0
    result = Math.ceil(result * (1 + WOLF_ENCOUNTER_RULES.chargeAttackBonus + variantBonus))
  }
  return result
}

export function wolfChargeHealing(snapshot: FamilyEncounter, hp: number, maxHp: number, phase: WolfCombatPhase): number {
  return phase.moonCharge && snapshot.variant === 'moonlit'
    ? Math.min(WOLF_ENCOUNTER_RULES.moonlitHeal, Math.max(0, maxHp - hp))
    : 0
}

export function advanceWolfTurn(snapshot: FamilyEncounter) {
  snapshot.turn++
  snapshot.howlActive = WOLF_MONSTERS[snapshot.definitionId].core === 'howl'
    && snapshot.turn % WOLF_ENCOUNTER_RULES.howlEvery === WOLF_ENCOUNTER_RULES.howlEvery - 1
}

function cueFor(snapshot: FamilyEncounter, hp: number, maxHp: number): string | null {
  const phase = wolfCombatPhase(snapshot, hp, maxHp)
  const cues: string[] = []
  if (phase.moonCharge) {
    if (snapshot.variant === 'wellFed') cues.push('蓄勢：狼王本回合將打出更猛烈的月襲。')
    else if (snapshot.variant === 'starved') cues.push('飢餓：狼王半血後會提早月襲，正準備出手。')
    else cues.push('月影：狼王會在月襲前恢復生命。')
  }
  if (phase.howl) cues.push('狼群領袖本回合將戰吼，強化反擊。')
  if (phase.armored) cues.push('它要架起硬皮；穿透與裂傷可突破。')
  if (phase.rush) cues.push('迅捷狼本回合將急襲；防禦可化解急襲加成。')
  if (phase.heavyStrike) cues.push('傷痕狼準備重擊；防禦可減輕傷害。')
  return cues.length ? cues.join(' ') : null
}

/** Read-only projection of the same phases consumed by combatTurn. */
export function wolfCombatPresentation(state: GameState): null | {
  name: string
  level: number
  rankLabel: string
  traits: { id: MonsterTraitId; name: string; description: string }[]
  variant: { id: BossVariantId; name: string; description: string } | null
  cue: string | null
} {
  const combat = state.combat
  const snapshot = combat?.familyEncounter
  if (!combat || combat.monsterId !== 'wolf' || combat.dungeon || !snapshot
    || !Object.hasOwn(WOLF_MONSTERS, snapshot.definitionId)) return null
  const definition = WOLF_MONSTERS[snapshot.definitionId]
  const traitNames = snapshot.traits.map(trait => MONSTER_TRAITS[trait].name)
  const variant = snapshot.variant ? BOSS_VARIANTS[snapshot.variant] : null
  return {
    name: `${traitNames.length ? `${traitNames.join('、')}的` : ''}${definition.name}`,
    level: definition.level,
    rankLabel: rankLabels[definition.rank],
    traits: snapshot.traits.map(id => ({ ...MONSTER_TRAITS[id] })),
    variant: variant ? { ...variant } : null,
    cue: cueFor(snapshot, combat.hp, combat.maxHp),
  }
}
