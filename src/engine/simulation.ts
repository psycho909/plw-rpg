import { BOSS, BUILDINGS, CONFIG, JOBS, MONSTERS } from '../data/config'
import type { Character, GameState, JobId, NPC, Position, RegionId, SkillId, Tile } from '../domain/types'
import { calendar, lifeStage } from './calendar'
import { emit } from './events'
import { random } from './random'
import { emptyLife, initializeLife, newCharacterLife, newNpcLife } from './lifeState'
import { refreshIdentity } from './identity'
import { dailyNpcLife, npcCanWork, rememberNpc } from './npcLife'
import { dailyLivingEvents } from './livingEvents'
import { emptyReward } from './rewardState'
import {
  REGIONAL_CRISIS_OUTCOME_COOLDOWN_DAYS, dormantRegionalCrisis,
  type RegionalCrisisOutcome, type RegionalCrisisResolutionSummary,
} from '../domain/crisis'
import { advanceRegionalCrisis, completeRegionalCrisisTransition } from './regionalCrisis'
import { availableCivilDefenseDefenders, deriveCivilDefense } from './civilDefense'

export const player = (state: GameState) => state.characters.find(c => c.id === state.activeCharacterId)!
const bound = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
function appliedBoundedDelta(value: number, requested: number, min: number, max: number) {
  const target = value + requested
  const next = bound(target, min, max)
  return { value: next, delta: next === target ? requested : next - value }
}
export const population = (state: GameState) => state.npcs.filter(n => n.isAlive).length + state.characters.filter(c => c.isAlive).length
export const stageIndex = (state: GameState) => ['hamlet', 'village', 'town'].indexOf(state.settlement.stage)
export const distance = (a: Position, b: Position) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
export const tileAt = (state: GameState, p: Position) => state.tiles.find(t => t.x === p.x && t.y === p.y)
export const threatLevel = (amount: number) => CONFIG.threatThresholds.reduce((level, minimum, i) => amount >= minimum ? i + 1 : level, 1)

const CRISIS_CONSEQUENCES: Record<RegionalCrisisOutcome, {
  population: number; bossProgress: number; food: number; safety: number; prosperity: number; injuries: number; injuryDays: 2 | 3 | 5 | 0
}> = {
  decisive_success: { population: -12, bossProgress: -18, food: -4, safety: 4, prosperity: 2, injuries: 0, injuryDays: 0 },
  costly_success: { population: -6, bossProgress: -8, food: -8, safety: -2, prosperity: -2, injuries: 1, injuryDays: 2 },
  setback: { population: 4, bossProgress: 8, food: -8, safety: -5, prosperity: -4, injuries: 2, injuryDays: 3 },
  local_defeat: { population: 10, bossProgress: 16, food: -12, safety: -8, prosperity: -6, injuries: 3, injuryDays: 5 },
}

function outcomeFromRoll(successChance: number, roll: number): RegionalCrisisOutcome {
  if (roll < .60 * successChance) return 'decisive_success'
  if (roll < successChance) return 'costly_success'
  if (roll < successChance + .70 * (1 - successChance)) return 'setback'
  return 'local_defeat'
}

function pressureCooldownDays(state: GameState) {
  const populationPressure = 15 * bound((state.threat.monsterPopulation - 30) / 70, 0, 1)
  const safetyPressure = 15 * bound((80 - state.settlement.safety) / 55, 0, 1)
  return Math.round(populationPressure + safetyPressure)
}

function resolveRegionalCrisis(state: GameState) {
  const crisis = state.regionalCrisis
  if (crisis.phase !== 'resolution') return false
  const defense = deriveCivilDefense(state, crisis)
  if (!defense || !Number.isSafeInteger(state.worldTime + CONFIG.regionalCrisis.aftermathDays * CONFIG.minutesPerDay)) return false

  const defenders = availableCivilDefenseDefenders(state).sort((left, right) => left.id.localeCompare(right.id))
  const maximumInjuries = Math.min(CRISIS_CONSEQUENCES.local_defeat.injuries, defenders.length)
  const additionalEvents = 1 + maximumInjuries
  if (!Number.isSafeInteger(state.eventSequence)
    || BigInt(state.eventSequence) + BigInt(additionalEvents) >= BigInt(Number.MAX_SAFE_INTEGER)) return false
  const recoveryDueAt = population(state) === 0 && state.threat.bossAlive
    ? state.worldTime + 30 * CONFIG.minutesPerDay : null
  if (recoveryDueAt !== null && !Number.isSafeInteger(recoveryDueAt)) return false
  if (maximumInjuries > 0 && !Number.isSafeInteger(state.worldTime + 5 * CONFIG.minutesPerDay)) return false

  const outcome = outcomeFromRoll(defense.successChance, random(state))
  const effect = CRISIS_CONSEQUENCES[outcome]
  const injuryCount = Math.min(effect.injuries, defenders.length)
  const { threat, settlement } = state
  const monsterPopulation = appliedBoundedDelta(threat.monsterPopulation, effect.population, 0, 100)
  const bossProgress = appliedBoundedDelta(threat.bossProgress, effect.bossProgress, 0, CONFIG.bossThreshold)
  const food = appliedBoundedDelta(settlement.food, effect.food, 0, 100)
  const safety = appliedBoundedDelta(settlement.safety, effect.safety, 25, 100)
  const prosperity = appliedBoundedDelta(settlement.prosperity, effect.prosperity, 18, 100)
  threat.monsterPopulation = monsterPopulation.value
  threat.threatLevel = threatLevel(threat.monsterPopulation)
  threat.campLevel = threat.threatLevel
  threat.bossProgress = bossProgress.value
  settlement.food = food.value
  settlement.safety = safety.value
  settlement.prosperity = prosperity.value

  const injuries: RegionalCrisisResolutionSummary['injuries'] = []
  for (const npc of defenders.slice(0, injuryCount)) {
    npc.injuredUntil = state.worldTime + effect.injuryDays * CONFIG.minutesPerDay
    injuries.push({ npcId: npc.id, durationDays: effect.injuryDays as 2 | 3 | 5, injuredUntil: npc.injuredUntil })
    emit(state, 'npc.injured', 'npc', `${npc.name} 在危機中受傷，需要休養 ${effect.injuryDays} 日。`)
  }

  const recovery: RegionalCrisisResolutionSummary['recovery'] = recoveryDueAt === null
    ? { status: 'not_required', dueAt: null, npcId: null }
    : { status: 'pending', dueAt: recoveryDueAt, npcId: null }
  const summary: RegionalCrisisResolutionSummary = {
    readiness: defense.readiness,
    threatDemand: defense.threatDemand,
    successChance: defense.successChance,
    pressureDays: pressureCooldownDays(state),
    applied: {
      monsterPopulation: monsterPopulation.delta,
      bossProgress: bossProgress.delta,
      food: food.delta,
      safety: safety.delta,
      prosperity: prosperity.delta,
    },
    injuries,
    recovery,
  }
  const next = completeRegionalCrisisTransition(crisis, outcome, state.worldTime, summary)
  if (next === crisis) return false
  state.regionalCrisis = next
  emit(state, 'regional-crisis.resolved', 'settlement', `北方危機以「${outcome}」告終，聚落承受了持續影響。`, true)
  return true
}

function processRegionalCrisisRecovery(state: GameState) {
  const crisis = state.regionalCrisis
  if (crisis.phase !== 'aftermath' && crisis.phase !== 'cooldown') return false
  const summary = crisis.resolutionSummary
  if (!summary || summary.recovery.status !== 'pending' || summary.recovery.dueAt === null) return false
  if (state.worldTime < summary.recovery.dueAt) return false
  if (population(state) > 0 || !state.threat.bossAlive) {
    summary.recovery.status = 'cancelled'
    return true
  }
  if (state.npcs.length >= 1000 || Object.keys(state.life.npcs).length >= 1000
    || population(state) >= state.settlement.capacity || !Number.isSafeInteger(state.nextNpcId)
    || BigInt(state.nextNpcId) + 1n >= BigInt(Number.MAX_SAFE_INTEGER)
    || !Number.isSafeInteger(state.eventSequence)
    || BigInt(state.eventSequence) + 1n >= BigInt(Number.MAX_SAFE_INTEGER)) return false
  const npc = addNpc(state, 18, 'immigration')
  summary.recovery.status = 'granted'
  summary.recovery.npcId = npc.id
  return true
}

function character(id: string, name: string, age: number, year: number): Character {
  const stage = lifeStage(age)
  const maxStamina = Math.round(80 * CONFIG.stamina[stage])
  return {
    id, name, birthYear: year - age, age, lifeStage: stage, level: 1, exp: 0, hp: 100, maxHp: 100,
    stamina: maxStamina, maxStamina, stats: { strength: 8, vitality: 8, dexterity: 6, intelligence: 5 },
    skills: { combat: { level: 1, exp: 0 }, farming: { level: 1, exp: 0 }, mining: { level: 1, exp: 0 }, woodcutting: { level: 1, exp: 0 }, smithing: { level: 1, exp: 0 } },
    gold: 45, inventory: { wood: 0, stone: 0, iron: 0, food: 3, material: 0, potion: 2, sword: 0, armor: 0 },
    equipment: { weapon: null, armor: null }, position: { ...BUILDINGS.house.position }, currentRegion: 'village', status: 'idle',
    isAlive: true, deathYear: null, deathCause: null, lifespan: 80,
  }
}

function addNpc(state: GameState, age: number, cause: 'initial' | 'birth' | 'immigration' | 'visitor') {
  const id = state.nextNpcId++
  const jobs = Object.keys(JOBS) as JobId[]
  const job = age < 15 ? 'farmer' : jobs[(id - 1) % jobs.length]!
  const names = ['米拉', '羅恩', '艾妲', '芬恩', '諾拉', '雨果', '露西', '西蒙', '艾琳', '奧斯卡']
  const home = { x: 6 + id % 4, y: 9 + id % 3 }
  const npc: NPC = {
    ...character(`npc-${id}`, `${names[(id - 1) % names.length]} ${id}`, age, calendar(state.worldTime).year),
    job, home, workplace: { ...JOBS[job].workplace }, position: { ...home }, currentActivity: 'sleep', injuredUntil: 0,
    schedule: [
      { start: 0, activity: 'sleep', destination: 'home' },
      { start: 420, activity: 'travel', destination: 'workplace' },
      { start: 480, activity: 'work', destination: 'workplace' },
      { start: 720, activity: 'leisure', destination: 'workplace' },
      { start: 780, activity: 'work', destination: 'workplace' },
      { start: 1020, activity: 'travel', destination: 'square' },
      { start: 1080, activity: 'leisure', destination: 'square' },
      { start: 1260, activity: 'travel', destination: 'home' },
      { start: 1320, activity: 'sleep', destination: 'home' },
    ],
    lifespan: 72 + Math.floor(random(state) * 18),
  }
  state.npcs.push(npc)
  state.life.npcs[npc.id] = newNpcLife(state, npc.id, npc.job, state.npcs.length - 1)
  state.life.npcs[npc.id]!.featured = state.npcs.filter(n => n.id !== npc.id && n.isAlive && state.life.npcs[n.id]?.featured).length < 6
  if (cause === 'birth' || cause === 'immigration') emit(state, cause === 'birth' ? 'npc.born' : 'npc.immigrated', 'npc', cause === 'birth' ? `${npc.name} 出生了。` : `${npc.name} 搬進橡谷，成為${JOBS[job].name}。`, true)
  return npc
}

export function spawnTraveler(state: GameState, visitor: { kind: 'elf' | 'mage' | 'knight' | 'adventurer' | 'merchant'; durationDays: number; rumor: string }): boolean {
  if (population(state) >= state.settlement.capacity || state.npcs.filter(n => (state.life.npcs[n.id]?.visitor?.until ?? 0) > state.worldTime).length >= 2) return false
  const npc = addNpc(state, 20 + Math.floor(random(state) * 25), 'visitor')
  const labels = { elf: '精靈旅人', mage: '魔法學者', knight: '遠方騎士', adventurer: '行腳冒險者', merchant: '旅行商人' }
  npc.name = `${labels[visitor.kind]} ${npc.name}`
  npc.job = visitor.kind === 'merchant' || visitor.kind === 'elf' ? 'shopkeeper' : visitor.kind === 'mage' ? 'blacksmith' : 'guard'
  npc.home = { ...BUILDINGS.inn.position }; npc.workplace = { ...BUILDINGS.store.position }; npc.position = { ...npc.home }
  const life = state.life.npcs[npc.id]!
  life.careerJob = npc.job; life.career = 'experienced'; life.featured = false
  life.visitor = { kind: visitor.kind, until: state.worldTime + visitor.durationDays * CONFIG.minutesPerDay }
  life.concern = visitor.rumor
  emit(state, 'npc.visitorArrived', 'npc', `${npc.name} 暫住旅店，帶來邊境之外的消息。`, true)
  return true
}

export function createGame(seed = 909): GameState {
  const state: GameState = {
    reward: emptyReward(),
    life: emptyLife(8 * 60),
    saveVersion: CONFIG.saveVersion, worldSeed: seed >>> 0, rngState: seed >>> 0, worldTime: 8 * 60, activeCharacterId: 'alden',
    characters: [character('alden', '奧登', 16, 1)], npcs: [], tiles: [],
    settlement: { name: '橡谷', stage: 'hamlet', capacity: 40, food: 78, prosperity: 52, safety: 88, infrastructure: 25, growth: 0, buildings: ['house', 'farm', 'store', 'inn'] },
    regions: { village: { discovered: true, remainingAmount: 0, regenerationRate: 0 }, farmland: { discovered: true, remainingAmount: 0, regenerationRate: 0 }, forest: { discovered: true, remainingAmount: 100, regenerationRate: 10 }, mine: { discovered: true, remainingAmount: 80, regenerationRate: 8 }, unknown: { discovered: false, remainingAmount: 30, regenerationRate: 2 } },
    threat: { monsterPopulation: 12, threatLevel: 1, growthRate: .65, bossProgress: 0, campLevel: 1, bossAlive: false, warningLevel: 0 },
    regionalCrisis: dormantRegionalCrisis(),
    dungeon: { discovered: false, threat: 1, progress: 0, runs: 0, stage: 0, inDungeon: false },
    crops: [], preparedPlots: 0, party: [], combat: null, events: [], history: [], eventSequence: 0, nextNpcId: 1,
  }
  for (let i = 0; i < CONFIG.initialPopulation - 1; i++) addNpc(state, 18 + i * 2 % 51, 'initial')
  for (let y = 0; y < CONFIG.height; y++) for (let x = 0; x < CONFIG.width; x++) {
    const regionId: RegionId = x >= 19 && y <= 4 ? 'unknown' : x >= 18 && y < 9 ? 'mine' : y <= 6 ? 'forest' : x >= 14 ? 'farmland' : 'village'
    const water = x === 0 || y === 0 || x === CONFIG.width - 1 || y === CONFIG.height - 1
    const road = y === 7 || x === 13 || (regionId === 'village' && y === 10)
    const terrain: Tile['terrain'] = water ? 'water' : road ? 'road' : regionId === 'forest' ? 'forest' : regionId === 'mine' ? 'mountain' : regionId === 'farmland' ? 'field' : 'grass'
    const building = (Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[]).find(id => BUILDINGS[id].position.x === x && BUILDINGS[id].position.y === y)
    state.tiles.push({ x, y, terrain, regionId, discovered: state.regions[regionId].discovered, walkable: !water, ...(building ? { building } : {}) })
  }
  initializeLife(state)
  emit(state, 'world.founded', 'world', '陌生的天空下，橡谷的炊煙升起。你將在這片邊境開始新的人生。', true)
  syncNpcs(state)
  return state
}

export function gainExp(state: GameState, c: Character, amount: number, skill?: SkillId) {
  c.exp += amount
  while (c.exp >= c.level * 30) {
    c.exp -= c.level * 30; c.level++
    c.stats.strength += 2; c.stats.vitality++; c.maxHp += 6; c.hp = Math.min(c.maxHp, c.hp + 6)
    if (c.id === state.activeCharacterId) emit(state, 'character.levelUp', 'player', `${c.name} 升到 Lv.${c.level}。`)
  }
  if (skill) {
    const s = c.skills[skill]; s.exp += amount
    while (s.exp >= s.level * 20) {
      s.exp -= s.level * 20; s.level++
      if (c.id === state.activeCharacterId) emit(state, 'character.skillUp', 'player', `${{ combat: '戰鬥', farming: '耕作', mining: '採礦', woodcutting: '伐木', smithing: '鍛造' }[skill]}熟練度升到 Lv.${s.level}。`)
    }
  }
}

export function die(state: GameState, c: Character, cause: string) {
  if (!c.isAlive) return
  c.isAlive = false; c.hp = 0; c.status = 'dead'; c.deathCause = cause; c.deathYear = calendar(state.worldTime).year
  if (c.id === state.activeCharacterId) { state.combat = null; state.dungeon.inDungeon = false }
  state.party = state.party.filter(p => p.npcId !== c.id)
  const life = state.life.characters[c.id] ?? state.life.npcs[c.id]
  if (life) {
    life.milestones.push({ id: `death-${c.id}`, at: state.worldTime, text: `${c.name} 因${cause}離世，享年${c.age}歲。` })
    life.milestones = life.milestones.slice(-32)
  }
  emit(state, 'npc.died', c.id === state.activeCharacterId ? 'player' : 'npc', `${c.name} 因${cause}離世，享年 ${c.age} 歲。世界仍會延續。`, true)
}

function ageCharacter(state: GameState, c: Character) {
  if (!c.isAlive) return
  c.age = calendar(state.worldTime).year - c.birthYear; c.lifeStage = lifeStage(c.age)
  c.maxStamina = Math.round(80 * CONFIG.stamina[c.lifeStage]); c.stamina = Math.min(c.stamina, c.maxStamina)
  if (c.age >= c.lifespan) die(state, c, '自然老化')
}

export function syncNpcs(state: GameState) {
  const minute = state.worldTime % CONFIG.minutesPerDay
  for (const n of state.npcs) {
    if (!n.isAlive) continue
    if (!npcCanWork(state, n.id) || n.injuredUntil > state.worldTime) { n.currentActivity = minute >= 1320 || minute < 420 ? 'sleep' : 'leisure'; n.position = { ...n.home }; continue }
    if (state.party.some(p => p.npcId === n.id)) { n.currentActivity = 'travel'; n.position = { ...player(state).position }; continue }
    const slot = [...n.schedule].reverse().find(s => s.start <= minute)!
    n.currentActivity = slot.activity
    const dest = slot.destination === 'home' ? n.home : slot.destination === 'workplace' ? n.workplace : { x: 10, y: 10 }
    if (slot.activity !== 'travel') { n.position = { ...dest }; continue }
    const source = slot.start === 420 ? n.home : slot.start === 1020 ? n.workplace : { x: 10, y: 10 }
    // ponytail: fixed open-grid routes; use BFS for NPCs if interior obstacles are added.
    const steps = Math.floor((minute - slot.start) / 60 * distance(source, dest))
    const dx = Math.min(Math.abs(dest.x - source.x), steps)
    const dy = Math.min(Math.abs(dest.y - source.y), steps - dx)
    n.position = { x: source.x + Math.sign(dest.x - source.x) * dx, y: source.y + Math.sign(dest.y - source.y) * dy }
  }
  for (const n of state.npcs) if (n.isAlive) n.currentRegion = tileAt(state, n.position)?.regionId ?? n.currentRegion
}

function dailyTick(state: GameState) {
  const s = state.settlement, t = state.threat
  const day = Math.floor(state.worldTime / CONFIG.minutesPerDay)
  const leaving = state.npcs.filter(n => (state.life.npcs[n.id]?.visitor?.until ?? Infinity) <= state.worldTime)
  for (const n of leaving) emit(state, 'npc.visitorLeft', 'npc', `${n.name} 繼續旅程，離開橡谷。`, true)
  const leavingIds = new Set(leaving.map(n => n.id))
  state.npcs = state.npcs.filter(n => !leavingIds.has(n.id))
  if (day % (CONFIG.daysPerSeason * 4) === 0) {
    for (const c of [...state.characters, ...state.npcs]) ageCharacter(state, c)
    emit(state, 'world.newYear', 'world', `第 ${calendar(state.worldTime).year} 年開始了。每個人都長了一歲。`, true)
  }
  dailyNpcLife(state)
  const workers = state.npcs.filter(n => npcCanWork(state, n.id) && n.injuredUntil <= state.worldTime && !state.party.some(p => p.npcId === n.id))
  for (const n of workers) gainExp(state, n, 2, JOBS[n.job].skill)
  const farmers = workers.filter(n => n.job === 'farmer').length
  const guards = workers.filter(n => n.job === 'guard').length
  s.food = bound(s.food + farmers * 1.4 + 1.8 - population(state) * .12 - (t.bossAlive ? 1 : 0), 0, 100)
  s.prosperity = bound(s.prosperity + workers.length * .022 + s.food * .003 - (t.bossAlive ? .8 : .1), 18, 100)
  s.safety = bound(s.safety + guards * .1 - t.threatLevel * .15 - (t.bossAlive ? .4 : 0), 25, 100)
  s.infrastructure = bound(s.infrastructure + workers.length * .008, 0, 100)
  s.growth += (population(state) / s.capacity + s.food / 100 + s.prosperity / 100 + s.safety / 100 + s.infrastructure / 100) * .32
  if (s.stage === 'hamlet' && s.growth >= CONFIG.stageGrowth.village) {
    s.stage = 'village'; s.capacity = 60; s.buildings.push('tavern', 'blacksmith')
    emit(state, 'settlement.grew', 'settlement', '橡谷成長為村莊。酒館與鐵匠鋪開始營業。', true)
  }
  if (s.stage === 'village' && s.growth >= CONFIG.stageGrowth.town) {
    s.stage = 'town'; s.capacity = CONFIG.maxPopulation
    emit(state, 'settlement.grew', 'settlement', '橡谷成為城鎮。商店貨源增加，更多冒險者前來。', true)
  }
  if (population(state) < s.capacity && s.food >= 30 && s.prosperity >= 20 && day % 15 === 0) addNpc(state, 18 + Math.floor(random(state) * 16), 'immigration')
  if (population(state) < s.capacity && s.food >= 40 && s.prosperity >= 30 && day % 30 === 0) addNpc(state, 0, 'birth')
  // Retain every deceased player; inactive NPCs are represented by permanent history.
  state.npcs = state.npcs.filter(n => n.isAlive)
  const retainedIds = new Set([...state.npcs, ...state.characters].map(c => c.id))
  for (const [id, life] of Object.entries(state.life.npcs)) if (!retainedIds.has(id) && !life.featured) delete state.life.npcs[id]
  const priorLevel = t.threatLevel
  t.monsterPopulation = bound(t.monsterPopulation + t.growthRate - guards * .035, 0, 100)
  t.threatLevel = threatLevel(t.monsterPopulation)
  t.campLevel = t.threatLevel
  t.bossProgress = bound(t.bossProgress + t.threatLevel * .55 - guards * .04, 0, CONFIG.bossThreshold)
  if (t.threatLevel > priorLevel) emit(state, 'monster.threatIncreased', 'monster', `北方森林威脅升到 Lv.${t.threatLevel}；哥布林營地擴張了。`, true)
  BOSS.warnings.forEach((warning, i) => {
    if (t.bossProgress >= warning.progress && t.warningLevel <= i) { t.warningLevel = i + 1; emit(state, 'boss.warning', 'monster', warning.message, true) }
  })
  if (t.bossProgress >= CONFIG.bossThreshold && !t.bossAlive) {
    t.bossAlive = true; emit(state, 'boss.spawned', 'monster', `${MONSTERS[BOSS.monsterId].name}出現。商路受阻，聚落的安全與收入開始下降。`, true)
  }
  if (t.bossAlive && day % 7 === 0 && workers.length) {
    const injured = workers[Math.floor(random(state) * workers.length)]!
    injured.injuredUntil = state.worldTime + 2 * CONFIG.minutesPerDay
    emit(state, 'npc.injured', 'npc', `${injured.name} 在北方道路受傷，需要休養兩日。`)
  }
  advanceRegionalCrisis(state)
  resolveRegionalCrisis(state)
  const oldDungeon = state.dungeon.threat
  state.dungeon.progress = bound(state.dungeon.progress + .4, 0, 100)
  state.dungeon.threat = threatLevel(state.dungeon.progress)
  if (oldDungeon < state.dungeon.threat) emit(state, 'dungeon.threatIncreased', 'monster', `廢棄礦坑的威脅升到 Lv.${state.dungeon.threat}。`, true)
  for (const region of Object.values(state.regions)) region.remainingAmount = Math.min(100, region.remainingAmount + region.regenerationRate)
  for (const contract of [...state.party]) {
    if (contract.contractEnd <= state.worldTime || !state.npcs.some(n => n.id === contract.npcId && n.isAlive)) {
      state.party = state.party.filter(p => p !== contract); emit(state, 'party.expired', 'player', '一位同行者的契約已到期。')
    } else if (player(state).gold >= contract.dailyWage && player(state).isAlive) player(state).gold -= contract.dailyWage
    else { state.party = state.party.filter(p => p !== contract); emit(state, 'party.unpaid', 'player', '無法支付日薪，傭兵結束了契約。') }
  }
  dailyLivingEvents(state, { spawnTraveler })
  processRegionalCrisisRecovery(state)
}

function advanceCanonicalBoundary(state: GameState, at: number) {
  state.worldTime = at
  for (const crop of state.crops) if (crop.status === 'growing' && crop.matureAt <= at) {
    crop.status = 'mature'; emit(state, 'crop.matured', 'player', '小麥已成熟，可以前往農田收割。')
  }
  if (at % CONFIG.minutesPerDay === 0) { syncNpcs(state); dailyTick(state) }
}

function needsRegionalCrisisBoundaryPreflight(state: GameState, at: number) {
  const crisis = state.regionalCrisis
  if (crisis.phase === 'active' && at >= crisis.phaseEndsAt) return true
  if (crisis.phase === 'resolution') return true
  return (crisis.phase === 'aftermath' || crisis.phase === 'cooldown')
    && crisis.resolutionSummary?.recovery.status === 'pending'
    && crisis.resolutionSummary.recovery.dueAt !== null
    && at >= crisis.resolutionSummary.recovery.dueAt
}

function hasRegionalCrisisActionBoundary(state: GameState, minutes: number) {
  const end = state.worldTime + Math.floor(minutes)
  if (!Number.isSafeInteger(end) || end <= state.worldTime) return false
  for (let at = (Math.floor(state.worldTime / CONFIG.minutesPerDay) + 1) * CONFIG.minutesPerDay; at <= end; at += CONFIG.minutesPerDay) {
    if (needsRegionalCrisisBoundaryPreflight(state, at)) return true
  }
  return false
}

/** Preview the complete public action only when it can reach a crisis resolution or recovery day. */
export function preflightRegionalCrisisAction<T>(state: GameState, minutes: number, action: (preview: GameState) => T) {
  if (!Number.isFinite(minutes) || minutes < 0) throw new Error('模擬時間必須是非負有限數值。')
  if (!Number.isSafeInteger(state.worldTime + Math.floor(minutes))) throw new Error('模擬時間超出安全範圍。')
  if (!hasRegionalCrisisActionBoundary(state, minutes)) return
  const preview = structuredClone(state)
  action(preview)
  if (preview.eventSequence >= Number.MAX_SAFE_INTEGER || preview.nextNpcId >= Number.MAX_SAFE_INTEGER
    || !Number.isSafeInteger(preview.life.director.sequence)) throw new Error('危機結算或恢復超出安全容量。')
}

function preflightRegionalCrisisBoundary(state: GameState, at: number) {
  const initial = state.regionalCrisis
  const resolving = initial.phase === 'resolution' || (initial.phase === 'active' && at >= initial.phaseEndsAt)
  const recoveryDue = (initial.phase === 'aftermath' || initial.phase === 'cooldown')
    && initial.resolutionSummary?.recovery.status === 'pending'
    && initial.resolutionSummary.recovery.dueAt !== null
    && at >= initial.resolutionSummary.recovery.dueAt
  const preview = structuredClone(state)
  advanceCanonicalBoundary(preview, at)

  if (preview.eventSequence >= Number.MAX_SAFE_INTEGER || preview.nextNpcId >= Number.MAX_SAFE_INTEGER
    || !Number.isSafeInteger(preview.life.director.sequence)) throw new Error('危機結算或恢復超出安全容量。')
  if (resolving && preview.regionalCrisis.phase === 'resolution') throw new Error('危機結算超出安全容量或時間範圍。')
  if (recoveryDue && (preview.regionalCrisis.phase === 'aftermath' || preview.regionalCrisis.phase === 'cooldown')
    && preview.regionalCrisis.resolutionSummary?.recovery.status === 'pending') {
    throw new Error('危機恢復超出安全容量。')
  }
  const resolved = preview.regionalCrisis
  if ((resolved.phase === 'aftermath' || resolved.phase === 'cooldown') && resolved.resolutionSummary) {
    const cooldownDays = CONFIG.regionalCrisis.baseCooldownDays + resolved.severity * CONFIG.regionalCrisis.severityCooldownDays
      + REGIONAL_CRISIS_OUTCOME_COOLDOWN_DAYS[resolved.outcome] + resolved.resolutionSummary.pressureDays
    if (!Number.isSafeInteger(resolved.phaseEndsAt + cooldownDays * CONFIG.minutesPerDay)) {
      throw new Error('危機休整時間超出安全範圍。')
    }
  }
}

export function simulate(state: GameState, gameMinutes: number) {
  if (!Number.isFinite(gameMinutes) || gameMinutes < 0) throw new Error('模擬時間必須是非負有限數值。')
  const end = state.worldTime + Math.floor(gameMinutes)
  if (!Number.isSafeInteger(end)) throw new Error('模擬時間超出安全範圍。')
  // Canonical daily boundaries keep live and headless simulation deterministic.
  while (state.worldTime < end) {
    const cropBoundary = Math.min(...state.crops.filter(c => c.status === 'growing').map(c => Math.max(state.worldTime + 1, c.matureAt)))
    const nextTime = Math.min(end, cropBoundary, (Math.floor(state.worldTime / CONFIG.minutesPerDay) + 1) * CONFIG.minutesPerDay)
    if (nextTime % CONFIG.minutesPerDay === 0 && needsRegionalCrisisBoundaryPreflight(state, nextTime)) {
      preflightRegionalCrisisBoundary(state, nextTime)
    }
    advanceCanonicalBoundary(state, nextTime)
  }
  syncNpcs(state)
}

export function reveal(state: GameState, region: RegionId) {
  if (state.regions[region].discovered) return
  state.regions[region].discovered = true
  for (const tile of state.tiles) if (tile.regionId === region) tile.discovered = true
  state.dungeon.discovered = true
  gainExp(state, player(state), 25)
  emit(state, 'region.discovered', 'world', '迷霧散開。你發現了山谷中的廢棄礦坑。', true)
  const memory = { kind: 'DUNGEON_DISCOVERED' as const, actorId: state.activeCharacterId, at: state.worldTime, detail: '山谷中的廢棄礦坑重新被發現。' }
  state.life.worldMemories.push(memory)
  if (state.life.worldMemories.length > 100) state.life.worldMemories.shift()
  for (const npc of state.npcs) rememberNpc(state, npc.id, memory)
}

export function movePlayer(state: GameState, dx: number, dy: number) {
  preflightRegionalCrisisAction(state, 5, preview => movePlayerInternal(preview, dx, dy))
  return movePlayerInternal(state, dx, dy)
}

function movePlayerInternal(state: GameState, dx: number, dy: number) {
  const c = player(state)
  if (!c.isAlive || state.combat || state.dungeon.inDungeon || Math.abs(dx) + Math.abs(dy) !== 1) return false
  const destination = { x: c.position.x + dx, y: c.position.y + dy }
  const tile = tileAt(state, destination)
  if (!tile?.walkable) return false
  c.position = destination; c.currentRegion = tile.regionId
  reveal(state, tile.regionId)
  simulate(state, 5)
  state.life.director.lastPlayerActivity = state.worldTime
  return true
}

function pathTo(state: GameState, destination: Position) {
  const c = player(state)
  if (!c.isAlive || state.combat || state.dungeon.inDungeon || !tileAt(state, destination)?.walkable) return null
  const key = (p: Position) => `${p.x},${p.y}`
  const queue: Position[] = [c.position], previous = new Map<string, Position | null>([[key(c.position), null]])
  let found: Position | undefined
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!
    if (distance(current, destination) === 0) { found = current; break }
    for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      const next = { x: current.x + d.x, y: current.y + d.y }
      if (!previous.has(key(next)) && tileAt(state, next)?.walkable) { previous.set(key(next), current); queue.push(next) }
    }
  }
  if (!found) return null
  const path: Position[] = []
  while (previous.get(key(found))) { path.unshift(found); found = previous.get(key(found))! }
  return path
}

export function walkTo(state: GameState, destination: Position) {
  const path = pathTo(state, destination)
  if (!path) return false
  preflightRegionalCrisisAction(state, path.length * 5, preview => walkToInternal(preview, destination))
  return walkToInternal(state, destination)
}

function walkToInternal(state: GameState, destination: Position) {
  const path = pathTo(state, destination)
  if (!path) return false
  const c = player(state)
  for (const step of path) if (!movePlayerInternal(state, step.x - c.position.x, step.y - c.position.y)) return false
  return true
}

export function chooseSuccessor(state: GameState, npcId: string) {
  if (player(state).isAlive) return false
  const npc = state.npcs.find(n => n.id === npcId && n.isAlive && n.age >= 15)
  if (!npc) return false
  state.characters.push({ ...npc, position: { ...npc.position }, currentRegion: tileAt(state, npc.position)!.regionId, inventory: { ...npc.inventory },
    skills: { combat: { ...npc.skills.combat }, farming: { ...npc.skills.farming }, mining: { ...npc.skills.mining }, woodcutting: { ...npc.skills.woodcutting }, smithing: { ...npc.skills.smithing } }, status: 'idle' })
  state.npcs = state.npcs.filter(n => n.id !== npcId); state.activeCharacterId = npcId; state.party = []; state.combat = null
  const generation = Math.max(...Object.values(state.life.characters).map(life => life.generation)) + 1
  state.life.characters[npcId] = newCharacterLife(generation, 'LOCAL_WORLD')
  refreshIdentity(state, npcId)
  emit(state, 'character.successor', 'player', `${npc.name} 接續了旅程。橡谷的歷史繼續書寫。`, true)
  return true
}
