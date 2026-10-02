import { BOSS, BUILDINGS, CONFIG, JOBS, MONSTERS } from '../data/config'
import type { Character, GameState, JobId, NPC, Position, RegionId, SkillId, Tile } from '../domain/types'
import { calendar, lifeStage } from './calendar'
import { emit } from './events'
import { random } from './random'

export const player = (state: GameState) => state.characters.find(c => c.id === state.activeCharacterId)!
const bound = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
export const population = (state: GameState) => state.npcs.filter(n => n.isAlive).length + state.characters.filter(c => c.isAlive).length
export const stageIndex = (state: GameState) => ['hamlet', 'village', 'town'].indexOf(state.settlement.stage)
export const distance = (a: Position, b: Position) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
export const tileAt = (state: GameState, p: Position) => state.tiles.find(t => t.x === p.x && t.y === p.y)
export const threatLevel = (amount: number) => CONFIG.threatThresholds.reduce((level, minimum, i) => amount >= minimum ? i + 1 : level, 1)

function character(id: string, name: string, age: number, year: number): Character {
  const stage = lifeStage(age)
  const maxStamina = Math.round(80 * CONFIG.stamina[stage])
  return {
    id, name, birthYear: year - age, age, lifeStage: stage, level: 1, exp: 0, hp: 100, maxHp: 100,
    stamina: maxStamina, maxStamina, stats: { strength: 8, vitality: 8, dexterity: 6, intelligence: 5 },
    skills: { combat: { level: 1, exp: 0 }, farming: { level: 1, exp: 0 }, mining: { level: 1, exp: 0 }, woodcutting: { level: 1, exp: 0 } },
    gold: 45, inventory: { wood: 0, stone: 0, iron: 0, food: 3, material: 0, potion: 2, sword: 0, armor: 0 },
    equipment: { weapon: null, armor: null }, position: { ...BUILDINGS.house.position }, currentRegion: 'village', status: 'idle',
    isAlive: true, deathYear: null, deathCause: null, lifespan: 80,
  }
}

function addNpc(state: GameState, age: number, cause: 'initial' | 'birth' | 'immigration') {
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
  if (cause !== 'initial') emit(state, cause === 'birth' ? 'npc.born' : 'npc.immigrated', 'npc', cause === 'birth' ? `${npc.name} 出生了。` : `${npc.name} 搬進橡谷，成為${JOBS[job].name}。`, true)
}

export function createGame(seed = 909): GameState {
  const state: GameState = {
    saveVersion: CONFIG.saveVersion, worldSeed: seed >>> 0, rngState: seed >>> 0, worldTime: 8 * 60, activeCharacterId: 'alden',
    characters: [character('alden', '奧登', 16, 1)], npcs: [], tiles: [],
    settlement: { name: '橡谷', stage: 'hamlet', capacity: 40, food: 78, prosperity: 52, safety: 88, infrastructure: 25, growth: 0, buildings: ['house', 'farm', 'store', 'inn'] },
    regions: { village: { discovered: true, remainingAmount: 0, regenerationRate: 0 }, farmland: { discovered: true, remainingAmount: 0, regenerationRate: 0 }, forest: { discovered: true, remainingAmount: 100, regenerationRate: 10 }, mine: { discovered: true, remainingAmount: 80, regenerationRate: 8 }, unknown: { discovered: false, remainingAmount: 30, regenerationRate: 2 } },
    threat: { monsterPopulation: 12, threatLevel: 1, growthRate: .65, bossProgress: 0, campLevel: 1, bossAlive: false, warningLevel: 0 },
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
  emit(state, 'world.founded', 'world', '橡谷聚落建立。奧登，今天起這裡就是你的家。', true)
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
      if (c.id === state.activeCharacterId) emit(state, 'character.skillUp', 'player', `${{ combat: '戰鬥', farming: '耕作', mining: '採礦', woodcutting: '伐木' }[skill]}熟練度升到 Lv.${s.level}。`)
    }
  }
}

export function die(state: GameState, c: Character, cause: string) {
  if (!c.isAlive) return
  c.isAlive = false; c.hp = 0; c.status = 'dead'; c.deathCause = cause; c.deathYear = calendar(state.worldTime).year
  if (c.id === state.activeCharacterId) { state.combat = null; state.dungeon.inDungeon = false }
  state.party = state.party.filter(p => p.npcId !== c.id)
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
    if (n.age < 15 || n.injuredUntil > state.worldTime) { n.currentActivity = minute >= 1320 || minute < 420 ? 'sleep' : 'leisure'; n.position = { ...n.home }; continue }
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
}

function dailyTick(state: GameState) {
  const s = state.settlement, t = state.threat
  const day = Math.floor(state.worldTime / CONFIG.minutesPerDay)
  if (day % (CONFIG.daysPerSeason * 4) === 0) {
    for (const c of [...state.characters, ...state.npcs]) ageCharacter(state, c)
    emit(state, 'world.newYear', 'world', `第 ${calendar(state.worldTime).year} 年開始了。每個人都長了一歲。`, true)
  }
  const workers = state.npcs.filter(n => n.isAlive && n.age >= 15 && n.injuredUntil <= state.worldTime && !state.party.some(p => p.npcId === n.id))
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
}

export function simulate(state: GameState, gameMinutes: number) {
  if (!Number.isFinite(gameMinutes) || gameMinutes < 0) throw new Error('模擬時間必須是非負有限數值。')
  const end = state.worldTime + Math.floor(gameMinutes)
  if (!Number.isSafeInteger(end)) throw new Error('模擬時間超出安全範圍。')
  // Daily boundaries give offline and headless simulation the same rules as live time.
  while (state.worldTime < end) {
    const cropBoundary = Math.min(...state.crops.filter(c => c.status === 'growing').map(c => Math.max(state.worldTime + 1, c.matureAt)))
    state.worldTime = Math.min(end, cropBoundary, (Math.floor(state.worldTime / CONFIG.minutesPerDay) + 1) * CONFIG.minutesPerDay)
    for (const crop of state.crops) if (crop.status === 'growing' && crop.matureAt <= state.worldTime) {
      crop.status = 'mature'; emit(state, 'crop.matured', 'player', '小麥已成熟，可以前往農田收割。')
    }
    if (state.worldTime % CONFIG.minutesPerDay === 0) dailyTick(state)
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
}

export function movePlayer(state: GameState, dx: number, dy: number) {
  const c = player(state)
  if (!c.isAlive || state.combat || state.dungeon.inDungeon || Math.abs(dx) + Math.abs(dy) !== 1) return false
  const destination = { x: c.position.x + dx, y: c.position.y + dy }
  const tile = tileAt(state, destination)
  if (!tile?.walkable) return false
  c.position = destination; c.currentRegion = tile.regionId
  reveal(state, tile.regionId)
  simulate(state, 5)
  return true
}

export function walkTo(state: GameState, destination: Position) {
  const c = player(state)
  if (!c.isAlive || state.combat || state.dungeon.inDungeon || !tileAt(state, destination)?.walkable) return false
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
  if (!found) return false
  const path: Position[] = []
  while (previous.get(key(found))) { path.unshift(found); found = previous.get(key(found))! }
  for (const step of path) if (!movePlayer(state, step.x - c.position.x, step.y - c.position.y)) return false
  return true
}

export function chooseSuccessor(state: GameState, npcId: string) {
  if (player(state).isAlive) return false
  const npc = state.npcs.find(n => n.id === npcId && n.isAlive && n.age >= 15)
  if (!npc) return false
  state.characters.push({ ...npc, position: { ...npc.position }, currentRegion: tileAt(state, npc.position)!.regionId, inventory: { ...npc.inventory }, skills: { combat: { ...npc.skills.combat }, farming: { ...npc.skills.farming }, mining: { ...npc.skills.mining }, woodcutting: { ...npc.skills.woodcutting } }, status: 'idle' })
  state.npcs = state.npcs.filter(n => n.id !== npcId); state.activeCharacterId = npcId; state.party = []; state.combat = null
  emit(state, 'character.successor', 'player', `${npc.name} 接續了旅程。橡谷的歷史繼續書寫。`, true)
  return true
}
