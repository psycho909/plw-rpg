import { CONFIG } from '../data/config'
import {
  CONTENT_CROPS, CONTENT_CROP_GOODS, CONTENT_FAMILIES, CONTENT_LOOT_TABLES, CONTENT_MONSTERS,
  CONTENT_RECIPES, CONTENT_EQUIPMENT, CONTENT_MATERIALS,
} from '../data/contentRegistry'
import type {
  ContentBossVariant, ContentCombatMechanic, ContentId, ContentMonster, ContentMonsterRank,
} from '../domain/content'
import type { ContentFamilyEncounter } from '../domain/reward'
import type { GameState, RegionId } from '../domain/types'
import { calendar } from './calendar'
import { emit } from './events'
import { random } from './random'

const ENCOUNTER_STAMINA_COST = 8
const RANK_LABELS: Record<ContentMonsterRank, string> = {
  normal: '普通', elite: '精英', miniBoss: '小首領', boss: '首領',
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export interface ContentEncounterOption {
  familyId: ContentId
  definitionId: ContentId
  label: string
  description: string
  rank: ContentMonsterRank
  region: RegionId
  eligible: boolean
  reason: string | null
}

export interface ContentCombatPhase {
  dueMechanics: readonly ContentCombatMechanic[]
  guardBonus: number
}

export interface ContentCombatPresentation {
  familyId: ContentId
  definitionId: ContentId
  name: string
  level: number
  rankLabel: string
  variant: ContentBossVariant | null
  cue: string | null
}

function activeCharacter(state: GameState) {
  return state.characters.find(character => character.id === state.activeCharacterId)
}

function hourMatches(hour: number, range: { start: number; end: number }) {
  return range.start <= range.end
    ? hour >= range.start && hour < range.end
    : hour >= range.start || hour < range.end
}

function predicateMatches(state: GameState, profile: { region: RegionId; minPlayerLevel?: number; maxPlayerLevel?: number;
  minThreatLevel?: number; maxThreatLevel?: number; settlementStages?: readonly string[]; seasons?: readonly string[];
  hours?: { start: number; end: number }; minSafety?: number; maxSafety?: number }) {
  const character = activeCharacter(state)
  if (!character) return false
  const date = calendar(state.worldTime)
  const season = CONFIG.seasons[date.season]
  return profile.region === character.currentRegion
    && (profile.minPlayerLevel === undefined || character.level >= profile.minPlayerLevel)
    && (profile.maxPlayerLevel === undefined || character.level <= profile.maxPlayerLevel)
    && (profile.minThreatLevel === undefined || state.threat.threatLevel >= profile.minThreatLevel)
    && (profile.maxThreatLevel === undefined || state.threat.threatLevel <= profile.maxThreatLevel)
    && (!profile.settlementStages || profile.settlementStages.includes(state.settlement.stage))
    && (!profile.seasons || profile.seasons.includes(season))
    && (!profile.hours || hourMatches(date.hour, profile.hours))
    && (profile.minSafety === undefined || state.settlement.safety >= profile.minSafety)
    && (profile.maxSafety === undefined || state.settlement.safety <= profile.maxSafety)
}

function definitionFor(id: string): ContentMonster | undefined {
  return Object.hasOwn(CONTENT_MONSTERS, id) ? CONTENT_MONSTERS[id] : undefined
}

function cooldownReason(state: GameState, definition: ContentMonster): string | null {
  const rules = definition.bossRules
  if (definition.rank !== 'boss' || !rules) return null
  const bossForm = state.reward.bossForms[definition.id]
  if (bossForm?.kind === 'frozenEncounter') return null
  const key = `content-boss:${definition.id}`
  const availableAt = Math.max(
    bossForm?.kind === 'cooldownUntil' ? bossForm.availableAt : 0,
    state.life.director.cooldowns[key] ?? 0,
  )
  if (availableAt <= state.worldTime) return null
  const days = Math.ceil((availableAt - state.worldTime) / CONFIG.minutesPerDay)
  return `首領再次現身前還需等待 ${days} 日。`
}

function worldBlockReason(state: GameState): string | null {
  const character = activeCharacter(state)
  if (!character?.isAlive) return '角色已離世，請先選擇繼任者。'
  if (state.combat) return '請先結束目前的戰鬥。'
  if (state.dungeon.inDungeon) return '離開礦坑後才能追蹤野外怪物。'
  if (!Object.hasOwn(state.regions, character.currentRegion) || !state.regions[character.currentRegion].discovered) {
    return '請先探索並解鎖所在區域。'
  }
  if (character.stamina < ENCOUNTER_STAMINA_COST) return '體力不足，請先休息。'
  return null
}

function monsterReason(state: GameState, definition: ContentMonster): string | null {
  const family = CONTENT_FAMILIES[definition.familyId]
  if (!family || !family.regions.includes(activeCharacter(state)?.currentRegion ?? 'village')) return '這個區域沒有此族群。'
  if (!CONTENT_LOOT_TABLES[definition.lootTableId]) return '此怪物的掉落資料尚未完整。'
  if (definition.rank === 'boss') {
    const until = state.worldTime + (definition.bossRules?.cooldownDays ?? 0) * CONFIG.minutesPerDay
    if (!Number.isSafeInteger(until)) return '首領冷卻日期已達安全上限。'
  }
  const region = activeCharacter(state)?.currentRegion
  if (!region || !state.regions[region].discovered || !family.regions.includes(region)) return '請先探索並解鎖此怪物棲息的區域。'
  const familyMatches = family.spawnProfiles.some(profile => predicateMatches(state, profile))
  const monsterMatches = definition.spawnProfiles === undefined || definition.spawnProfiles.some(profile => predicateMatches(state, profile))
  if (!familyMatches || !monsterMatches) return '目前的區域、季節、時段或聚落條件還不適合追蹤這個目標。'
  return cooldownReason(state, definition)
}

/** Pure canonical eligibility projection for authored family encounters. */
export function contentEncounterOptions(state: GameState, familyId?: string): ContentEncounterOption[] {
  const globalReason = worldBlockReason(state)
  return Object.values(CONTENT_MONSTERS)
    .filter(definition => familyId === undefined || definition.familyId === familyId)
    .map(definition => {
      const family = CONTENT_FAMILIES[definition.familyId]
      const reason = globalReason ?? monsterReason(state, definition)
      return {
        familyId: definition.familyId,
        definitionId: definition.id,
        label: definition.name['zh-TW'],
        description: definition.description['zh-TW'],
        rank: definition.rank,
        region: activeCharacter(state)?.currentRegion ?? family.regions[0]!,
        eligible: reason === null,
        reason,
      }
    })
}

function encounterContext(state: GameState, region: RegionId) {
  const actions = state.life.characters[state.activeCharacterId]?.actions
  const hunted = actions && Number.isSafeInteger(actions.combat) && actions.combat >= 0 ? actions.combat : 0
  return {
    region,
    population: clamp(Math.floor(state.threat.monsterPopulation), 0, 100),
    hunted,
    safety: clamp(Number.isFinite(state.settlement.safety) ? state.settlement.safety : 0, 0, 100),
    threatLevel: clamp(Math.floor(state.threat.threatLevel), 1, 3),
  }
}

function weightedVariant(state: GameState, variants: readonly ContentBossVariant[]): ContentBossVariant {
  const total = variants.reduce((sum, variant) => sum + variant.weight, 0)
  let roll = random(state) * total
  for (const variant of variants) {
    roll -= variant.weight
    if (roll < 0) return variant
  }
  return variants.at(-1)!
}

function formEncounter(state: GameState, definition: ContentMonster): ContentFamilyEncounter {
  const character = activeCharacter(state)!
  const variantId = definition.rank === 'boss' && definition.bossRules
    ? weightedVariant(state, definition.bossRules.variants).id
    : null
  return {
    familyId: definition.familyId,
    definitionId: definition.id,
    variantId,
    turn: 0,
    formedAt: state.worldTime,
    context: encounterContext(state, character.currentRegion),
  }
}

function mechanicFor(snapshot: ContentFamilyEncounter): readonly ContentCombatMechanic[] {
  const definition = definitionFor(snapshot.definitionId)
  if (!definition) return []
  const variant = definition.bossRules?.variants.find(candidate => candidate.id === snapshot.variantId)
  return variant ? [...definition.mechanics, ...variant.mechanics] : definition.mechanics
}

function due(turn: number, everyTurns: number) {
  return (turn + 1) % everyTurns === 0
}

export function contentCombatPhase(snapshot: ContentFamilyEncounter): ContentCombatPhase {
  const dueMechanics = mechanicFor(snapshot).filter(mechanic => due(snapshot.turn, mechanic.everyTurns))
  return {
    dueMechanics,
    guardBonus: dueMechanics.reduce((sum, mechanic) => sum + (mechanic.kind === 'guard' ? mechanic.defenseBonus : 0), 0),
  }
}

export function contentDefenseForTurn(defense: number, phase: ContentCombatPhase) {
  return defense + phase.guardBonus
}

export function contentAttackForTurn(attack: number, defending: boolean, phase: ContentCombatPhase) {
  let result = attack
  for (const mechanic of phase.dueMechanics) {
    if (mechanic.kind === 'guard' || (mechanic.kind === 'rush' && defending)) continue
    if (mechanic.kind === 'rush' || mechanic.kind === 'heavyStrike' || mechanic.kind === 'rally' || mechanic.kind === 'chargedAttack') {
      result = Math.ceil(result * (1 + mechanic.bonusFraction))
    }
  }
  return result
}

export function contentChargeHealing(snapshot: ContentFamilyEncounter, hp: number, maxHp: number, phase: ContentCombatPhase) {
  const requested = phase.dueMechanics.reduce((sum, mechanic) => sum + (mechanic.kind === 'chargedAttack' ? mechanic.healAmount ?? 0 : 0), 0)
  return Math.min(requested, Math.max(0, maxHp - hp))
}

export function advanceContentTurn(snapshot: ContentFamilyEncounter) {
  snapshot.turn++
}

/** Starts only after the pure canonical eligibility query passes. Invalid requests spend no stamina/RNG. */
export function encounterContentMonster(state: GameState, definitionId: string): string {
  const option = contentEncounterOptions(state).find(candidate => candidate.definitionId === definitionId)
  if (!option) return '追蹤目標無效。'
  if (!option.eligible) return option.reason ?? '目前無法追蹤這個目標。'
  const definition = definitionFor(option.definitionId)!
  const character = activeCharacter(state)!
  let snapshot: ContentFamilyEncounter
  const bossForm = state.reward.bossForms[definition.id]
  if (definition.rank === 'boss' && bossForm?.kind === 'frozenEncounter') {
    snapshot = { ...structuredClone(bossForm.encounter), turn: 0 }
  } else {
    snapshot = formEncounter(state, definition)
    if (definition.rank === 'boss') {
      state.reward.bossForms[definition.id] = { kind: 'frozenEncounter', encounter: structuredClone(snapshot) }
    }
  }
  character.stamina -= ENCOUNTER_STAMINA_COST
  character.status = 'combat'
  state.combat = {
    monsterId: 'content-family', hp: definition.stats.hp, maxHp: definition.stats.hp,
    attack: definition.stats.attack, defense: definition.stats.defense, exp: definition.stats.exp,
    gold: definition.stats.gold, elite: definition.rank === 'elite', dungeon: false,
    contentEncounter: snapshot,
  }
  if (!state.reward.collection.seen.includes(definition.id)) state.reward.collection.seen.push(definition.id)
  emit(state, 'combat.started', 'player', `遭遇${definition.name['zh-TW']}。`)
  state.life.director.lastPlayerActivity = state.worldTime
  return ''
}

/** Read-only cue projection. The returned telegraph is derived from mechanics used by combat. */
export function contentCombatPresentation(state: GameState): ContentCombatPresentation | null {
  const combat = state.combat
  const snapshot = combat?.contentEncounter
  const definition = snapshot ? definitionFor(snapshot.definitionId) : undefined
  if (!combat || combat.monsterId !== 'content-family' || combat.dungeon || !snapshot || !definition) return null
  const variant = definition.bossRules?.variants.find(candidate => candidate.id === snapshot.variantId) ?? null
  const phase = contentCombatPhase(snapshot)
  const cue = phase.dueMechanics.map(mechanic => mechanic.telegraph['zh-TW']).join(' ')
  return {
    familyId: definition.familyId,
    definitionId: definition.id,
    name: definition.name['zh-TW'],
    level: definition.level,
    rankLabel: RANK_LABELS[definition.rank],
    variant,
    cue: cue || null,
  }
}

/** Applies only the authored bounded settlement consequence and catalog-bounded cooldown state. */
export function recordContentBossDefeat(state: GameState, definitionId: string): boolean {
  const definition = definitionFor(definitionId)
  const rules = definition?.bossRules
  if (!definition || definition.rank !== 'boss' || !rules) return false
  const nextCooldown = Math.min(Number.MAX_SAFE_INTEGER, state.worldTime + rules.cooldownDays * CONFIG.minutesPerDay)
  const settlement = state.settlement
  const bounds = rules.worldConsequence.field === 'food' ? [0, 100]
    : rules.worldConsequence.field === 'safety' ? [25, 100] : [18, 100]
  const current = settlement[rules.worldConsequence.field]
  const delta = Number.isFinite(rules.worldConsequence.delta) ? rules.worldConsequence.delta : 0
  settlement[rules.worldConsequence.field] = clamp(current + delta, bounds[0]!, bounds[1]!)
  state.reward.bossForms[definition.id] = { kind: 'cooldownUntil', availableAt: nextCooldown }
  emit(state, 'content.boss.defeated', 'monster', `${definition.name['zh-TW']}已被擊敗，周邊${rules.worldConsequence.field === 'food' ? '糧食' : rules.worldConsequence.field === 'safety' ? '安全' : '繁榮'}受到影響。`, true)
  return true
}

export interface ContentSourceHints {
  id: ContentId
  sources: string[]
  uses: string[]
}

/** Pure source/use projection shared by future codex and inventory surfaces. */
export function contentSourceHints(contentId: string): ContentSourceHints | null {
  const sources = new Set<string>()
  const uses = new Set<string>()
  for (const monster of Object.values(CONTENT_MONSTERS)) {
    const table = CONTENT_LOOT_TABLES[monster.lootTableId]
    if (!table) continue
    if (table.guaranteedMaterialIds.includes(contentId) || table.rareMaterials.some(entry => entry.materialId === contentId)) {
      sources.add(`擊敗${monster.name['zh-TW']}`)
    }
    if (table.weightedEquipment.some(entry => entry.equipmentId === contentId)
      || monster.bossRules?.exclusiveEquipmentId === contentId) sources.add(`擊敗${monster.name['zh-TW']}`)
    if (monster.bossRules?.guaranteedMaterialIds.includes(contentId)) sources.add(`擊敗${monster.name['zh-TW']}`)
  }
  for (const crop of Object.values(CONTENT_CROPS)) {
    if (crop.harvestGoodId === contentId) sources.add(`收穫${crop.name['zh-TW']}`)
    if (crop.id === contentId) uses.add(`種植於${crop.regions.join('、')}`)
  }
  for (const recipe of Object.values(CONTENT_RECIPES)) {
    if (recipe.outputBase === contentId) uses.add(`製作${recipe.name['zh-TW']}`)
    if (recipe.inputs.some(input => input.source === 'material' && input.materialId === contentId)) uses.add(`配方：${recipe.name['zh-TW']}`)
    if (recipe.allowedBiasMaterials.includes(contentId)) uses.add(`影響配方：${recipe.name['zh-TW']}`)
  }
  const material = CONTENT_MATERIALS[contentId]
  if (material) uses.add(`出售（${material.sell} 金幣）`)
  const good = CONTENT_CROP_GOODS[contentId]
  if (good) uses.add(`食用（補充 ${good.foodValue} 糧食）`)
  const equipment = CONTENT_EQUIPMENT[contentId]
  if (equipment) uses.add(`穿戴（${equipment.slot === 'weapon' ? '武器' : '護甲'}）`)
  if (!sources.size && !uses.size) return null
  return { id: contentId, sources: [...sources], uses: [...uses] }
}

