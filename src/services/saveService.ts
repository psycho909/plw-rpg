import { BUILDINGS, CONFIG, DUNGEON, JOBS, MONSTERS } from '../data/config'
import type { GameState, Position } from '../domain/types'
import { createGame, population, simulate } from '../engine/simulation'

export const SAVE_KEY = 'oakvale-v1'
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const validPosition = (p: Position) => Number.isInteger(p.x) && p.x >= 0 && p.x < CONFIG.width && Number.isInteger(p.y) && p.y >= 0 && p.y < CONFIG.height
function matches(template: unknown, value: unknown): boolean {
  // Nullable fields have different shapes; validate their concrete contracts below.
  if (template === null) return true
  if (typeof template === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (Array.isArray(template)) return Array.isArray(value) && (template.length === 0 || value.every(v => matches(template[0], v)))
  if (object(template)) return object(value) && Object.entries(template).every(([k, v]) => matches(v, value[k]))
  return typeof template === typeof value
}
function valid(state: unknown): state is GameState {
  const template = createGame()
  if (!matches(template, state)) return false
  const s = state as GameState
  const ids = [...s.characters, ...s.npcs].map(c => c.id)
  const regions = Object.keys(template.regions)
  return s.saveVersion === CONFIG.saveVersion && Number.isSafeInteger(s.worldTime) && s.worldTime >= 0
    && s.characters.length > 0 && s.characters.length <= 1000 && s.npcs.length <= 1000 && new Set(ids).size === ids.length
    && Number.isSafeInteger(s.nextNpcId) && s.nextNpcId > 0 && s.nextNpcId < Number.MAX_SAFE_INTEGER
    && ids.every(id => !/^npc-[1-9]\d*$/.test(id) || Number(id.slice(4)) < s.nextNpcId)
    && s.characters.some(c => c.id === s.activeCharacterId)
    && [...s.characters, ...s.npcs].every(c => c.age >= 0 && Number.isSafeInteger(c.level) && c.level >= 1 && c.exp >= 0 && c.exp < c.level * 30
      && Object.values(c.skills).every(skill => Number.isSafeInteger(skill.level) && skill.level >= 1 && skill.exp >= 0 && skill.exp < skill.level * 20)
      && c.maxHp > 0 && c.maxStamina > 0 && c.gold >= 0 && regions.includes(c.currentRegion)
      && ['child', 'young', 'adult', 'middleAge', 'elder'].includes(c.lifeStage) && ['idle', 'combat', 'dead'].includes(c.status)
      && (c.deathYear === null || (Number.isSafeInteger(c.deathYear) && c.deathYear >= 1)) && (c.deathCause === null || typeof c.deathCause === 'string')
      && validPosition(c.position)
      && Object.values(c.inventory).every(n => Number.isSafeInteger(n) && n >= 0)
      && (c.equipment.weapon === null || c.equipment.weapon === 'sword') && (c.equipment.armor === null || c.equipment.armor === 'armor'))
    && s.npcs.every(n => Object.hasOwn(JOBS, n.job) && validPosition(n.home) && validPosition(n.workplace)
      && n.schedule.length > 0 && n.schedule[0]!.start === 0
      && n.schedule.every((slot, i) => Number.isInteger(slot.start) && slot.start >= 0 && slot.start < CONFIG.minutesPerDay
        && (i === 0 || slot.start > n.schedule[i - 1]!.start)
        && ['sleep', 'travel', 'work', 'leisure'].includes(slot.activity) && ['home', 'workplace', 'square'].includes(slot.destination)))
    && ['hamlet', 'village', 'town'].includes(s.settlement.stage)
    && s.tiles.length === CONFIG.width * CONFIG.height && new Set(s.tiles.map(t => `${t.x},${t.y}`)).size === s.tiles.length
    && s.tiles.every(t => validPosition(t)
      && regions.includes(t.regionId) && ['water', 'grass', 'forest', 'field', 'mountain', 'road'].includes(t.terrain) && (t.building === undefined || Object.hasOwn(BUILDINGS, t.building)))
    && Number.isSafeInteger(s.preparedPlots) && s.preparedPlots >= 0 && s.crops.length + s.preparedPlots <= CONFIG.maxPlots
    && s.crops.every(c => matches({ id: 0, plantedAt: 0, growthDuration: 0, matureAt: 0, status: '' }, c) && Number.isSafeInteger(c.id) && c.id > 0 && ['growing', 'mature'].includes(c.status))
    && new Set(s.crops.map(c => c.id)).size === s.crops.length
    && s.party.length <= 2 && s.party.every(p => matches({ npcId: '', hireCost: 0, dailyWage: 0, contractEnd: 0, archetype: '' }, p) && ['fighter', 'healer'].includes(p.archetype) && s.npcs.some(n => n.id === p.npcId))
    && (s.combat === null || (matches({ monsterId: '', hp: 0, maxHp: 0, attack: 0, defense: 0, exp: 0, gold: 0, elite: false, dungeon: false }, s.combat) && Object.hasOwn(MONSTERS, s.combat.monsterId)))
    && Number.isSafeInteger(s.eventSequence) && s.eventSequence >= 0 && s.eventSequence < Number.MAX_SAFE_INTEGER
    && [...s.events, ...s.history, ...s.crops].every(entry => object(entry) && Number.isSafeInteger(entry.id) && entry.id > 0 && entry.id <= s.eventSequence)
    && s.events.length <= 150 && s.history.length <= 20000 && Number.isInteger(s.dungeon.stage) && s.dungeon.stage >= 0 && s.dungeon.stage <= DUNGEON.encounters.length
    && (!s.dungeon.inDungeon || s.dungeon.stage < DUNGEON.encounters.length)
    && (s.combat === null || s.combat.dungeon === s.dungeon.inDungeon)
    && Number.isInteger(s.threat.threatLevel) && s.threat.threatLevel >= 1 && s.threat.threatLevel <= CONFIG.threatThresholds.length
    && [...s.events, ...s.history].every(e => ['player', 'npc', 'world', 'monster', 'settlement'].includes(e.category))
    && s.settlement.buildings.every(b => Object.hasOwn(BUILDINGS, b))
}

export function serialize(state: GameState, now = Date.now()) {
  return JSON.stringify({ ...state, lastSavedAt: now })
}
export function deserialize(raw: string): { state: GameState; lastSavedAt: number } {
  const value: unknown = JSON.parse(raw)
  if (!object(value) || value.saveVersion !== CONFIG.saveVersion) throw new Error('存檔版本不支援。原始存檔已保留。')
  if (!valid(value) || typeof value.lastSavedAt !== 'number' || !Number.isFinite(value.lastSavedAt) || value.lastSavedAt < 0) throw new Error('存檔資料不完整。原始存檔已保留，請確認後重建世界。')
  const { lastSavedAt, ...state } = value
  return { state: state as unknown as GameState, lastSavedAt }
}
export function offlineProgress(state: GameState, lastSavedAt: number, now = Date.now()) {
  const realMs = Math.min(CONFIG.offlineHours * 3600000, Math.max(0, now - lastSavedAt))
  const minutes = Math.floor(realMs / 1000 * CONFIG.realSecondMinutes)
  const before = { population: population(state), mature: state.crops.filter(c => c.status === 'mature').length, threat: state.threat.threatLevel, stage: state.settlement.stage, contracts: state.party.length, year: Math.floor(state.worldTime / (CONFIG.daysPerSeason * 4 * CONFIG.minutesPerDay)) }
  if (minutes < 2) return null
  simulate(state, minutes)
  return { minutes, populationChange: population(state) - before.population, matured: state.crops.filter(c => c.status === 'mature').length - before.mature, threatBefore: before.threat, threatAfter: state.threat.threatLevel, stageBefore: before.stage, stageAfter: state.settlement.stage, contractsEnded: before.contracts - state.party.length, years: Math.floor(state.worldTime / (CONFIG.daysPerSeason * 4 * CONFIG.minutesPerDay)) - before.year }
}
