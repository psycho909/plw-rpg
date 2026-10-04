import {
  LIVING_ARCS, LIVING_EVENT_LIMITS, MEDIUM_LIVING_EVENTS, MINOR_LIVING_EVENTS, RARE_TRAVELERS,
} from '../data/livingEvents'
import type { ArcKind, EventArc, ImportantMemory, NpcLife, WorldNews, WorldRequest } from '../domain/life'
import type { GameState, ItemId, NPC } from '../domain/types'
import { emit } from './events'
import { changeReputation } from './identity'
import { rememberNpc } from './npcLife'
import { random } from './random'

const DAY = 1440
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

export interface TravelerSpawn {
  kind: (typeof RARE_TRAVELERS)[number]['kind']
  durationDays: number
  rumor: string
}

export interface LivingEventHooks {
  /** Return true only when a temporary, visible NPC was actually added to this world. */
  spawnTraveler?: (state: GameState, visitor: TravelerSpawn) => boolean
}

function activeCharacter(state: GameState) {
  return state.characters.find(character => character.id === state.activeCharacterId)
}

function stability(state: GameState) {
  const { safety, food, prosperity, infrastructure } = state.settlement
  return clamp(safety * 0.42 + food * 0.28 + prosperity * 0.2 + infrastructure * 0.1, 0, 100)
}

function activityFactor(state: GameState) {
  const idleFor = Math.max(0, state.worldTime - state.life.director.lastPlayerActivity)
  if (idleFor <= 3 * DAY) return 1.18
  if (idleFor >= 21 * DAY) return 0.72
  return 1 - (idleFor - 3 * DAY) / (18 * DAY) * 0.46
}

function trimDirectorHistory(state: GameState) {
  const cutoff = state.worldTime - 90 * DAY
  const director = state.life.director
  director.recentMajor = director.recentMajor.filter(at => at >= cutoff).slice(-LIVING_EVENT_LIMITS.recentEvents)
  director.recentCrises = director.recentCrises.filter(at => at >= cutoff).slice(-LIVING_EVENT_LIMITS.recentEvents)
  for (const [key, at] of Object.entries(director.cooldowns)) {
    if (key.startsWith('hunt-recorded:') && at < state.worldTime - 2 * DAY) delete director.cooldowns[key]
  }
}

function nextId(state: GameState, prefix: string) {
  state.life.director.sequence++
  return `${prefix}-${state.life.director.sequence}`
}

function addNews(state: GameState, scope: WorldNews['scope'], text: string, major = false) {
  const item: WorldNews = { id: nextId(state, 'news'), at: state.worldTime, scope, text }
  state.life.news.push(item)
  if (state.life.news.length > LIVING_EVENT_LIMITS.news) state.life.news.splice(0, state.life.news.length - LIVING_EVENT_LIMITS.news)
  state.life.director.lastEventAt = state.worldTime
  emit(state, major ? 'living.major' : 'living.news', 'world', text, major)
  if (major) {
    state.life.director.recentMajor.push(state.worldTime)
    state.life.director.recentCrises.push(state.worldTime)
  }
  return item
}

function remember(memoryList: ImportantMemory[], memory: ImportantMemory) {
  memoryList.push(memory)
  if (memoryList.length > LIVING_EVENT_LIMITS.memories) memoryList.splice(0, memoryList.length - LIVING_EVENT_LIMITS.memories)
}

function npcLife(state: GameState, npcId: string): NpcLife | undefined {
  return state.life.npcs[npcId]
}

function rememberHelpedNpc(state: GameState, npcId: string | null, detail: string, kind: ImportantMemory['kind'] = 'PLAYER_HELPED_ME') {
  if (!npcId) return
  rememberNpc(state, npcId, { kind, actorId: state.activeCharacterId, at: state.worldTime, detail })
}

function memory(state: GameState, kind: ImportantMemory['kind'], detail: string, world = false, actorId = state.activeCharacterId) {
  const record: ImportantMemory = { kind, actorId, at: state.worldTime, detail }
  remember(world ? state.life.worldMemories : state.life.settlementMemories, record)
  return record
}

function chooseRequester(state: GameState, kind: ArcKind): NPC | undefined {
  const jobs: Record<ArcKind, NPC['job'][]> = {
    road: ['guard', 'woodcutter'], food: ['farmer', 'shopkeeper'], iron: ['blacksmith', 'miner'],
  }
  return state.npcs.find(npc => npc.isAlive && jobs[kind].includes(npc.job))
}

function arcRequestAmount(state: GameState, kind: ArcKind) {
  if (kind === 'food') return state.settlement.food <= 12 ? 3 : 2
  return LIVING_ARCS[kind].requestAmount
}

function pruneRequests(state: GameState) {
  const requests = state.life.requests
  while (requests.length > LIVING_EVENT_LIMITS.requests) {
    const removable = requests.findIndex(request => request.status !== 'open')
    if (removable < 0) break
    requests.splice(removable, 1)
  }
}

function createArcRequest(state: GameState, arc: EventArc) {
  const openCount = state.life.requests.filter(request => request.status === 'open').length
  if (openCount >= LIVING_EVENT_LIMITS.maxOpenRequests) return undefined
  const definition = LIVING_ARCS[arc.kind]
  const requester = chooseRequester(state, arc.kind)
  const request: WorldRequest = {
    id: nextId(state, 'request'), kind: definition.requestKind, npcId: requester?.id ?? null,
    arcId: arc.id, createdAt: state.worldTime,
    expiresAt: state.worldTime + definition.stageDays.request * DAY,
    status: 'open', amount: arcRequestAmount(state, arc.kind), progress: 0,
  }
  state.life.requests.push(request)
  pruneRequests(state)
  if (requester && !arc.participants.includes(requester.id)) arc.participants.push(requester.id)
  addNews(state, 'local', definition.reaction)
  return request
}

function startArc(state: GameState, kind: ArcKind) {
  const definition = LIVING_ARCS[kind]
  const arc: EventArc = {
    id: nextId(state, 'arc'), kind, stage: 'signal', startedAt: state.worldTime, stageAt: state.worldTime,
    resolved: false, outcome: 'pending', participants: [],
  }
  const requester = chooseRequester(state, kind)
  if (requester) arc.participants.push(requester.id)
  state.life.arcs.push(arc)
  if (state.life.arcs.length > LIVING_EVENT_LIMITS.arcs) {
    const removable = state.life.arcs.findIndex(item => item.resolved)
    if (removable >= 0) {
      const removed = state.life.arcs.splice(removable, 1)[0]!
      state.life.requests = state.life.requests.filter(request => request.arcId !== removed.id)
    }
  }
  state.life.director.cooldowns[kind] = state.worldTime + definition.cooldownDays * DAY
  state.life.director.quietUntil = state.worldTime + LIVING_EVENT_LIMITS.activeArcQuietDays * DAY
  addNews(state, 'regional', definition.signal)
  return arc
}

function setArcOutcome(state: GameState, arc: EventArc, outcome: 'helped' | 'ignored') {
  if (arc.resolved || arc.stage !== 'reaction' || arc.outcome !== 'pending') return
  arc.outcome = outcome
  arc.stage = 'outcome'
  arc.stageAt = state.worldTime
  const text = LIVING_ARCS[arc.kind][outcome]
  addNews(state, outcome === 'helped' ? 'local' : 'regional', text)
}

function updateThreatLevel(state: GameState) {
  const thresholds = [0, 30, 65]
  state.threat.threatLevel = thresholds.reduce((level, threshold, index) => state.threat.monsterPopulation >= threshold ? index + 1 : level, 1)
  state.threat.campLevel = state.threat.threatLevel
}

function applyArcConsequence(state: GameState, arc: EventArc) {
  const settlement = state.settlement
  const director = state.life.director
  const helped = arc.outcome === 'helped'
  if (arc.kind === 'road') {
    settlement.safety = clamp(settlement.safety + (helped ? 7 : -8), 0, 100)
    settlement.prosperity = clamp(settlement.prosperity + (helped ? 2 : -3), 0, 100)
    director.tradePenalty = clamp(director.tradePenalty + (helped ? -0.12 : 0.25), 0, 0.75)
    if (helped) memory(state, 'PLAYER_DEFENDED_OAKVALE', '清理北方道路周圍的獸群。')
  } else if (arc.kind === 'food') {
    settlement.food = clamp(settlement.food + (helped ? 3 : -6), 0, 100)
    settlement.prosperity = clamp(settlement.prosperity + (helped ? 3 : -4), 0, 100)
    settlement.safety = clamp(settlement.safety + (helped ? 1 : -2), 0, 100)
    if (helped) memory(state, 'PLAYER_SUPPORTED_FOOD', '向橡谷補充食物。')
    else memory(state, 'MAJOR_DISASTER', '橡谷長期缺糧。', true)
  } else {
    director.ironReserve = clamp(director.ironReserve + (helped ? 3 : -4), 0, 100)
    settlement.infrastructure = clamp(settlement.infrastructure + (helped ? 3 : -3), 0, 100)
    settlement.prosperity = clamp(settlement.prosperity + (helped ? 2 : -2), 0, 100)
    director.tradePenalty = clamp(director.tradePenalty + (helped ? -0.1 : 0.18), 0, 0.75)
  }
  arc.stage = 'consequence'
  arc.stageAt = state.worldTime
  arc.resolved = true
  addNews(state, 'major', LIVING_ARCS[arc.kind].consequence[arc.outcome === 'helped' ? 'helped' : 'ignored'], true)
  director.quietUntil = state.worldTime + LIVING_EVENT_LIMITS.consequenceQuietDays * DAY
}

function advanceArc(state: GameState, arc: EventArc) {
  if (arc.resolved) return
  const definition = LIVING_ARCS[arc.kind]
  const elapsed = state.worldTime - arc.stageAt
  if (arc.stage === 'signal' && elapsed >= definition.stageDays.signal * DAY) {
    arc.stage = 'development'; arc.stageAt = state.worldTime
    addNews(state, 'regional', definition.development)
  } else if (arc.stage === 'development' && elapsed >= definition.stageDays.development * DAY) {
    arc.stage = 'reaction'; arc.stageAt = state.worldTime
    createArcRequest(state, arc)
  } else if (arc.stage === 'reaction') {
    const request = state.life.requests.find(candidate => candidate.arcId === arc.id)
    if (!request || request.status === 'expired' || request.expiresAt <= state.worldTime) {
      if (request) request.status = 'expired'
      setArcOutcome(state, arc, 'ignored')
    }
  } else if (arc.stage === 'outcome' && elapsed >= definition.stageDays.outcome * DAY) {
    applyArcConsequence(state, arc)
  }
}

function activeArc(state: GameState) {
  return state.life.arcs.find(arc => !arc.resolved)
}

function adultByJob(state: GameState, jobs: readonly NPC['job'][]): NPC[] {
  return state.npcs.filter(npc => npc.isAlive && npc.age >= 15 && npc.injuredUntil <= state.worldTime
    && npcLife(state, npc.id)?.career !== 'retired' && jobs.includes(npc.job))
}

function livingPopulation(state: GameState) {
  return state.characters.filter(character => character.isAlive).length + state.npcs.filter(npc => npc.isAlive).length
}

function arcWeight(state: GameState, kind: ArcKind, playerActivity: number, stable: number) {
  const now = state.worldTime
  if (state.life.director.cooldowns[kind] > now) return 0
  let severity = 0
  let base = 0
  if (kind === 'road') {
    if (!state.threat.bossAlive && state.threat.monsterPopulation < 30) return 0
    severity = Math.max(0, state.threat.monsterPopulation - 30) + (state.threat.bossAlive ? 18 : 0)
    base = 5 + severity * 0.18 + Math.max(0, 60 - state.settlement.safety) * 0.08
  } else if (kind === 'food') {
    if (state.settlement.food > 24) return 0
    severity = 24 - state.settlement.food
    base = 5 + severity * 0.32
  } else {
    if (state.life.director.ironReserve > 22 || !state.settlement.buildings.includes('blacksmith')) return 0
    severity = 22 - state.life.director.ironReserve
    base = 5 + severity * 0.32
  }
  const stabilityWeight = 0.74 + (100 - stable) / 100 * 0.6
  return Math.max(0.1, base * playerActivity * stabilityWeight)
}

function candidateWeights(state: GameState) {
  const director = state.life.director
  const now = state.worldTime
  const stable = stability(state)
  const recentMajor = director.recentMajor.filter(at => at >= now - 30 * DAY).length
  const recentCrises = director.recentCrises.filter(at => at >= now - 60 * DAY).length
  const quietWeight = 220 + recentMajor * 45 + recentCrises * 25 + Math.max(0, stable - 70) * 0.35
  const weights: Record<string, number> = { quiet: quietWeight }
  if (director.quietUntil > now || activeArc(state)) return weights

  const activity = activityFactor(state)
  for (const kind of ['road', 'food', 'iron'] as const) {
    const weight = arcWeight(state, kind, activity, stable)
    if (weight > 0) weights[`arc:${kind}`] = weight
  }

  if ((director.cooldowns.market_bustle ?? 0) <= now && state.settlement.stage !== 'hamlet' && stable >= 60 && state.settlement.food >= 55 && state.settlement.prosperity >= 55) {
    weights['minor:market_bustle'] = MINOR_LIVING_EVENTS.find(event => event.id === 'market_bustle')!.weight * activity
  }
  if ((director.cooldowns.watch_patrol ?? 0) <= now && state.threat.monsterPopulation >= 20 && state.threat.monsterPopulation < 35 && adultByJob(state, ['guard']).length > 0) {
    weights['minor:watch_patrol'] = MINOR_LIVING_EVENTS.find(event => event.id === 'watch_patrol')!.weight * activity
  }

  const braveGuards = adultByJob(state, ['guard', 'mercenary']).filter(npc =>
    !state.party.some(member => member.npcId === npc.id) && npcLife(state, npc.id)?.traits.includes('brave'),
  )
  if ((director.cooldowns.independent_boss_attempt ?? 0) <= now && state.threat.bossAlive && !state.combat && braveGuards.length > 0) {
    weights['medium:independent_boss_attempt'] = MEDIUM_LIVING_EVENTS.independent_boss_attempt.weight * activity
  }

  const capacity = livingPopulation(state) < state.settlement.capacity
  const visitorCount = state.npcs.filter(npc => {
    const visitor = (npcLife(state, npc.id) as (NpcLife & { visitor?: { until: number } }) | undefined)?.visitor
    return npc.isAlive && visitor !== undefined && visitor.until > now
  }).length
  const travelerWorldReady = capacity && visitorCount < LIVING_EVENT_LIMITS.maxActiveVisitors && !state.threat.bossAlive &&
    state.settlement.stage !== 'hamlet' && stable >= 60 && state.settlement.prosperity >= 55 && state.settlement.food >= 45 &&
    (director.cooldowns.traveler ?? 0) <= now
  if (travelerWorldReady) {
    for (const traveler of RARE_TRAVELERS) {
      if ((director.cooldowns[`traveler:${traveler.kind}`] ?? 0) <= now) weights[`rare:${traveler.kind}`] = traveler.weight * activity
    }
  }
  return weights
}

/** A read-only weight projection used by targeted engine verification and director diagnostics. */
export function livingEventWeights(state: GameState): Readonly<Record<string, number>> {
  return { ...candidateWeights(state) }
}

function chooseCandidate(state: GameState, weights: Readonly<Record<string, number>>): string {
  const entries = Object.entries(weights)
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let point = random(state) * total
  for (const [id, weight] of entries) {
    point -= weight
    if (point < 0) return id
  }
  return entries.at(-1)?.[0] ?? 'quiet'
}

function applyMinorEvent(state: GameState, eventId: string) {
  const event = MINOR_LIVING_EVENTS.find(candidate => candidate.id === eventId)
  if (!event) return
  state.life.director.cooldowns[event.id] = state.worldTime + event.cooldownDays * DAY
  if (event.id === 'market_bustle') state.settlement.prosperity = clamp(state.settlement.prosperity + 0.35, 0, 100)
  else {
    state.threat.monsterPopulation = Math.max(0, state.threat.monsterPopulation - 1)
    state.settlement.safety = clamp(state.settlement.safety + 0.35, 0, 100)
    updateThreatLevel(state)
  }
  addNews(state, 'local', event.text)
}

function applyMediumBossAttempt(state: GameState) {
  const definition = MEDIUM_LIVING_EVENTS.independent_boss_attempt
  state.life.director.cooldowns.independent_boss_attempt = state.worldTime + definition.cooldownDays * DAY
  const candidates = adultByJob(state, ['guard', 'mercenary']).filter(npc =>
    !state.party.some(member => member.npcId === npc.id) && npcLife(state, npc.id)?.traits.includes('brave'),
  )
  if (!candidates.length || !state.threat.bossAlive || state.combat) return
  const npc = candidates[Math.floor(random(state) * candidates.length)]!
  const chance = clamp(definition.successChance + (state.settlement.safety - 50) / 250, 0.2, 0.68)
  if (random(state) < chance) {
    state.threat.bossAlive = false
    state.threat.bossProgress = 0
    state.threat.warningLevel = 0
    state.threat.monsterPopulation = Math.max(0, state.threat.monsterPopulation - 25)
    updateThreatLevel(state)
    state.settlement.safety = clamp(state.settlement.safety + 6, 0, 100)
    const feat = memory(state, 'GOBLIN_CHIEF_DEFEATED', `${npc.name} 帶領守衛擊退哥布林酋長。`, true, npc.id)
    for (const resident of state.npcs) rememberNpc(state, resident.id, feat)
    addNews(state, 'major', definition.success, true)
  } else {
    npc.injuredUntil = state.worldTime + 2 * DAY
    state.settlement.safety = clamp(state.settlement.safety - 2, 0, 100)
    addNews(state, 'regional', definition.failure)
  }
}

function applyTraveler(state: GameState, kind: TravelerSpawn['kind'], hooks: LivingEventHooks | undefined) {
  const definition = RARE_TRAVELERS.find(traveler => traveler.kind === kind)
  if (!definition) return
  const visitor: TravelerSpawn = { kind, durationDays: definition.durationDays, rumor: definition.text }
  const spawned = hooks?.spawnTraveler ? hooks.spawnTraveler(state, visitor) : false
  if (hooks?.spawnTraveler && !spawned) return
  state.life.director.cooldowns.traveler = state.worldTime + LIVING_EVENT_LIMITS.travelerQuietDays * DAY
  state.life.director.cooldowns[`traveler:${kind}`] = state.worldTime + definition.cooldownDays * DAY
  const text = hooks?.spawnTraveler ? definition.text : `旅人傳聞：${definition.text}`
  addNews(state, 'rumor', text)
}

function applyCandidate(state: GameState, candidate: string, hooks?: LivingEventHooks) {
  if (candidate.startsWith('arc:')) {
    startArc(state, candidate.slice(4) as ArcKind)
    return
  }
  if (candidate.startsWith('minor:')) {
    applyMinorEvent(state, candidate.slice(6))
    return
  }
  if (candidate === 'medium:independent_boss_attempt') {
    applyMediumBossAttempt(state)
    return
  }
  if (candidate.startsWith('rare:')) applyTraveler(state, candidate.slice(5) as TravelerSpawn['kind'], hooks)
}

function createMedicineRequest(state: GameState) {
  if (state.life.requests.some(request => request.status === 'open' && request.kind === 'medicine')) return
  if (state.life.requests.filter(request => request.status === 'open').length >= LIVING_EVENT_LIMITS.maxOpenRequests) return
  const npc = state.npcs.find(candidate => candidate.isAlive && candidate.injuredUntil > state.worldTime)
  if (!npc) return
  const request: WorldRequest = {
    id: nextId(state, 'request'), kind: 'medicine', npcId: npc.id, arcId: null,
    createdAt: state.worldTime, expiresAt: state.worldTime + 5 * DAY, status: 'open', amount: 1, progress: 0,
  }
  state.life.requests.push(request)
  pruneRequests(state)
  addNews(state, 'local', `${npc.name} 仍在養傷，身邊的人正在尋找一瓶治療藥水。`)
}

function reconcileMedicineRequests(state: GameState) {
  for (const request of state.life.requests) {
    if (request.kind !== 'medicine' || request.status !== 'open') continue
    const npc = state.npcs.find(candidate => candidate.id === request.npcId && candidate.isAlive)
    if (!npc || npc.injuredUntil <= state.worldTime) request.status = 'expired'
  }
}

function expireOldRequests(state: GameState) {
  for (const request of state.life.requests) {
    if (request.status === 'open' && request.expiresAt <= state.worldTime) request.status = 'expired'
  }
}

/** Called once at the daily world-time boundary; all event choices use the world's seeded RNG. */
export function dailyLivingEvents(state: GameState, hooks?: LivingEventHooks) {
  if (state.worldTime % DAY !== 0) return
  const director = state.life.director
  if (director.cooldowns['director:lastDailyTick'] === state.worldTime) return
  director.cooldowns['director:lastDailyTick'] = state.worldTime
  director.stability = stability(state)
  trimDirectorHistory(state)
  expireOldRequests(state)
  reconcileMedicineRequests(state)
  createMedicineRequest(state)

  const arc = activeArc(state)
  if (arc) advanceArc(state, arc)
  director.tradePenalty = clamp(director.tradePenalty - 0.0025, 0, 0.75)
  if (arc) return
  if (director.quietUntil > state.worldTime) return

  const weights = candidateWeights(state)
  if (Object.keys(weights).length <= 1) return
  const choice = chooseCandidate(state, weights)
  if (choice !== 'quiet') applyCandidate(state, choice, hooks)
}

function atDeliverySquare(state: GameState) {
  const character = activeCharacter(state)
  return !!character && character.isAlive && !state.combat && !state.dungeon.inDungeon &&
    character.currentRegion === 'village' && manhattan(character.position, LIVING_EVENT_LIMITS.deliverySquare) <= LIVING_EVENT_LIMITS.deliveryDistance
}

function targetNpc(state: GameState, request: WorldRequest) {
  return state.npcs.find(npc => npc.id === request.npcId && npc.isAlive)
}

function requestArc(state: GameState, request: WorldRequest) {
  return request.arcId ? state.life.arcs.find(arc => arc.id === request.arcId) : undefined
}

function requestFailure(state: GameState, request: WorldRequest): string {
  const character = activeCharacter(state)
  if (!character?.isAlive) return '目前的角色無法交付這項請求。'
  if (state.combat || state.dungeon.inDungeon) return '離開戰鬥與礦坑後才能交付。'
  if (request.expiresAt <= state.worldTime) return '這項請求已經過期。'
  if (request.kind === 'medicine') {
    const npc = targetNpc(state, request)
    if (!npc || npc.injuredUntil <= state.worldTime) return '這名居民目前已不需要藥物。'
    if (manhattan(character.position, npc.position) > 1) return '請走到受傷居民身邊再交付藥水。'
    if (character.inventory.potion < request.amount) return '背包裡沒有足夠的治療藥水。'
    return ''
  }
  if (!atDeliverySquare(state)) return '請回到橡谷廣場附近交付物資。'
  if (request.kind === 'food' && character.inventory.food < request.amount) return '背包裡沒有足夠的食物。'
  if (request.kind === 'iron' && character.inventory.iron < request.amount) return '背包裡沒有足夠的鐵礦。'
  if (request.kind === 'hunt' && request.progress < request.amount) return `還需要在北方森林擊退 ${request.amount - request.progress} 隻獸群。`
  if (request.arcId) {
    const arc = requestArc(state, request)
    if (!arc || arc.stage !== 'reaction' || arc.outcome !== 'pending') return '這項請求目前無法再完成。'
  }
  return ''
}

/** Fulfil a current world request, consuming real inventory or real combat progress. */
export function fulfillRequest(state: GameState, id: string): '' | string {
  const request = state.life.requests.find(candidate => candidate.id === id)
  if (!request || request.status !== 'open') return '找不到仍有效的世界請求。'
  const failure = requestFailure(state, request)
  if (failure) return failure

  const character = activeCharacter(state)!
  if (request.kind === 'food') {
    character.inventory.food -= request.amount
    state.settlement.food = clamp(state.settlement.food + request.amount * 4, 0, 100)
  } else if (request.kind === 'iron') {
    character.inventory.iron -= request.amount
    state.life.director.ironReserve = clamp(state.life.director.ironReserve + request.amount * 5, 0, 100)
  } else if (request.kind === 'medicine') {
    character.inventory.potion -= request.amount
    const npc = targetNpc(state, request)!
    npc.injuredUntil = state.worldTime
    rememberHelpedNpc(state, npc.id, '玩家帶來治療藥水，幫助我從傷勢中恢復。')
    npcLife(state, npc.id)!.concern = '傷勢已經好轉'
  }

  request.status = 'completed'
  if (request.arcId) {
    const arc = requestArc(state, request)!
    if (arc.kind === 'road') {
      memory(state, 'PLAYER_DEFENDED_OAKVALE', '完成清理北方道路獸群的狩獵請求。')
      rememberHelpedNpc(state, request.npcId, '玩家協助清理了北方道路。', 'PLAYER_DEFENDED_OAKVALE')
    } else if (arc.kind === 'food') {
      memory(state, 'PLAYER_SUPPORTED_FOOD', '將食物送到橡谷廣場，支援聚落糧食。')
      rememberHelpedNpc(state, request.npcId, '玩家協助補上橡谷的食物。', 'PLAYER_SUPPORTED_FOOD')
    } else {
      rememberHelpedNpc(state, request.npcId, '玩家送來鐵料，鐵匠鋪可以繼續工作。')
    }
    setArcOutcome(state, arc, 'helped')
  }
  changeReputation(state, request.kind === 'medicine' ? 3 : 5,
    request.kind === 'medicine' ? '幫助受傷居民' : '完成橡谷生活請求')
  state.life.director.lastPlayerActivity = state.worldTime
  addNews(state, 'local', request.kind === 'medicine' ? '受傷居民收到藥水，傷勢得到照料。' : '一項由橡谷現況引出的請求已經完成。')
  return ''
}

/** Count only an actual successful outdoor fight while its defeated combat record is still present. */
export function recordHunt(state: GameState): number {
  const character = activeCharacter(state)
  const combat = state.combat
  if (!character?.isAlive || character.currentRegion !== 'forest' || !combat || combat.hp > 0 || combat.dungeon) return 0
  const requests = state.life.requests.filter(request => {
    if (request.kind !== 'hunt' || request.status !== 'open' || request.progress >= request.amount) return false
    const arc = requestArc(state, request)
    return arc?.kind === 'road' && arc.stage === 'reaction' && arc.outcome === 'pending'
  })
  if (!requests.length) return 0
  const key = `hunt-recorded:${state.worldTime}:${combat.monsterId}`
  if (state.life.director.cooldowns[key] === state.worldTime) return 0
  state.life.director.cooldowns[key] = state.worldTime
  for (const request of requests) request.progress = Math.min(request.amount, request.progress + 1)
  return requests.length
}

/** Price multiplier for successful purchases; the caller decides whether a buy is being priced. */
export function tradePriceMultiplier(state: GameState): number {
  return Number((1 + clamp(state.life.director.tradePenalty, 0, 0.75)).toFixed(2))
}

/** Call only after a trade succeeds so actual traded supplies feed future request conditions. */
export function recordLivingTrade(state: GameState, item: ItemId, buying: boolean, amount = 1) {
  if (!Number.isSafeInteger(amount) || amount <= 0) return
  const director = state.life.director
  if (item === 'iron') director.ironReserve = clamp(director.ironReserve + amount * (buying ? -2 : 2), 0, 100)
  if (item === 'food') state.settlement.food = clamp(state.settlement.food + amount * (buying ? -0.2 : 0.5), 0, 100)
}

/** A bounded, UI-safe copy of recent news; callers never receive the full mutable simulation state. */
export function projectLivingNews(state: GameState, limit = 12): WorldNews[] {
  const count = Number.isFinite(limit) ? Math.max(0, Math.min(LIVING_EVENT_LIMITS.news, Math.floor(limit))) : 12
  if (!count) return []
  return state.life.news.slice(-count).reverse().map(item => ({ ...item }))
}
