import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import type { ArcKind, EventArc, WorldRequest } from '../domain/life'
import type { GameState } from '../domain/types'
import { createGame, player } from './simulation'
import { dailyLivingEvents, fulfillRequest, livingEventWeights, projectLivingNews, recordHunt, tradePriceMultiplier } from './livingEvents'
import { deserialize, serialize } from '../services/saveService'

const day = 1440

function atMidnight(state: GameState) {
  state.worldTime = (Math.floor(state.worldTime / day) + 1) * day
  dailyLivingEvents(state)
}

function prepareArc(state: GameState, kind: ArcKind) {
  state.life.director.quietUntil = 0
  state.life.director.cooldowns[kind] = 0
  if (kind === 'road') {
    state.threat.monsterPopulation = 80
    state.threat.threatLevel = 3
    state.settlement.safety = 35
    state.life.director.ironReserve = 40
    state.settlement.food = 80
  } else if (kind === 'food') {
    state.settlement.food = 8
    state.life.director.ironReserve = 40
    state.threat.monsterPopulation = 10
  } else {
    state.settlement.stage = 'village'
    state.settlement.buildings.push('blacksmith')
    state.life.director.ironReserve = 5
    state.settlement.food = 80
    state.threat.monsterPopulation = 10
  }
}

function advanceUntil<T>(state: GameState, find: () => T | undefined, maximumDays = 180): T {
  for (let i = 0; i < maximumDays; i++) {
    const value = find()
    if (value) return value
    atMidnight(state)
  }
  throw new Error('living event did not reach the requested state')
}

function requestFor(state: GameState, kind: ArcKind): WorldRequest {
  const arc = state.life.arcs.find(a => a.kind === kind && !a.resolved)
  expect(arc).toBeDefined()
  return state.life.requests.find(request => request.arcId === arc!.id && request.status === 'open')!
}

function startArcAtReaction(state: GameState, kind: ArcKind): EventArc {
  prepareArc(state, kind)
  const arc = advanceUntil(state, () => state.life.arcs.find(a => a.kind === kind && !a.resolved))
  advanceUntil(state, () => arc.stage === 'reaction' ? arc : undefined, 8)
  return arc
}

function deliverAtVillageSquare(state: GameState) {
  const c = player(state)
  c.currentRegion = 'village'
  c.position = { x: 10, y: 10 }
}

function resolveArc(state: GameState, kind: ArcKind, helped: boolean) {
  const arc = startArcAtReaction(state, kind)
  const request = requestFor(state, kind)
  const baseline = { safety: state.settlement.safety, prosperity: state.settlement.prosperity, food: state.settlement.food, infrastructure: state.settlement.infrastructure }
  deliverAtVillageSquare(state)
  if (helped) {
    if (request.kind === 'food') player(state).inventory.food = Math.max(player(state).inventory.food, request.amount)
    if (request.kind === 'iron') player(state).inventory.iron = Math.max(player(state).inventory.iron, request.amount)
    if (request.kind === 'hunt') {
      player(state).currentRegion = 'forest'
      for (let i = 0; i < request.amount; i++) {
        state.combat = { monsterId: 'wolf', hp: 0, maxHp: 30, attack: 8, defense: 1, exp: 10, gold: 4, elite: false, dungeon: false }
        expect(recordHunt(state)).toBe(1)
        expect(recordHunt(state)).toBe(0)
        state.combat = null
        state.worldTime++
      }
      deliverAtVillageSquare(state)
    }
    expect(fulfillRequest(state, request.id)).toBe('')
    expect(request.status).toBe('completed')
    expect(arc.outcome).toBe('helped')
  } else {
    const expiresAt = request.expiresAt
    while (state.worldTime < expiresAt) atMidnight(state)
    expect(request.status).toBe('expired')
    expect(arc.outcome).toBe('ignored')
  }

  advanceUntil(state, () => arc.resolved ? arc : undefined, 5)
  expect(arc.stage).toBe('consequence')
  return { arc, baseline }
}

describe('living event arcs', () => {
  it('prunes request references together with old arcs and stays reloadable at every intermediate phase', () => {
    const state = createGame(1901)
    for (let index = 0; index < 12; index++) {
      state.life.arcs.push({ id: `old-${index}`, kind: 'food', stage: 'consequence', startedAt: 0, stageAt: 0,
        resolved: true, outcome: 'ignored', participants: [] })
      state.life.requests.push({ id: `req-${index}`, kind: 'food', npcId: null, arcId: `old-${index}`,
        createdAt: 0, expiresAt: 1, status: 'expired', amount: 3, progress: 0 })
    }
    prepareArc(state, 'food')
    for (let index = 0; index < 180; index++) {
      atMidnight(state)
      expect(deserialize(serialize(state)).state).toEqual(state)
    }
    expect(state.life.arcs.some(arc => !arc.id.startsWith('old-'))).toBe(true)
  })
  it.each(['road', 'food', 'iron'] as const)('completes the %s arc with lasting helped and ignored consequences', kind => {
    const helped = createGame(1901), ignored = createGame(1901)
    const helpedResult = resolveArc(helped, kind, true), ignoredResult = resolveArc(ignored, kind, false)
    expect(helped.life.arcs.find(a => a.kind === kind)?.outcome).toBe('helped')
    expect(ignored.life.arcs.find(a => a.kind === kind)?.outcome).toBe('ignored')
    if (kind === 'road') {
      expect(helped.settlement.safety).toBeGreaterThan(helpedResult.baseline.safety)
      expect(ignored.settlement.safety).toBeLessThan(ignoredResult.baseline.safety)
      expect(tradePriceMultiplier(ignored)).toBeGreaterThan(tradePriceMultiplier(helped))
    } else if (kind === 'food') {
      expect(helped.settlement.food).toBeGreaterThan(helpedResult.baseline.food)
      expect(ignored.settlement.prosperity).toBeLessThan(ignoredResult.baseline.prosperity)
      expect(helped.life.settlementMemories.some(memory => memory.kind === 'PLAYER_SUPPORTED_FOOD')).toBe(true)
    } else {
      expect(helped.life.director.ironReserve).toBeGreaterThan(5)
      expect(helped.settlement.infrastructure).toBeGreaterThan(helpedResult.baseline.infrastructure)
      expect(ignored.life.director.tradePenalty).toBeGreaterThan(0)
    }
  })

  it('gates candidates by world conditions, threat weight, player activity, cooldown and recovery', () => {
    const state = createGame()
    state.life.director.quietUntil = 0
    state.life.director.lastPlayerActivity = state.worldTime
    const noThreat = livingEventWeights(state)['arc:road'] ?? 0
    state.threat.monsterPopulation = 35
    const mildThreat = livingEventWeights(state)['arc:road']!
    state.threat.monsterPopulation = 80
    const severeThreat = livingEventWeights(state)['arc:road']!
    expect(noThreat).toBe(0)
    expect(severeThreat).toBeGreaterThan(mildThreat)

    state.life.director.cooldowns.road = state.worldTime + 10 * day
    expect(livingEventWeights(state)['arc:road'] ?? 0).toBe(0)
    state.worldTime += 11 * day
    state.life.director.quietUntil = state.worldTime + 3 * day
    expect(livingEventWeights(state)['arc:road'] ?? 0).toBe(0)
    state.life.director.quietUntil = 0
    const recentlyActive = livingEventWeights(state)['arc:road']!
    state.life.director.lastPlayerActivity = state.worldTime - 30 * day
    expect(livingEventWeights(state)['arc:road']!).toBeLessThan(recentlyActive)
  })

  it('uses seeded randomness and bounds retained event data over 100 simulated years', () => {
    const a = createGame(72), b = structuredClone(a)
    for (const state of [a, b]) {
      state.settlement.stage = 'village'
      state.settlement.buildings.push('blacksmith')
      state.settlement.food = 7
      state.settlement.safety = 25
      state.threat.monsterPopulation = 80
      state.threat.threatLevel = 3
      state.life.director.ironReserve = 4
      state.life.director.quietUntil = 0
    }
    for (let i = 0; i < 100 * CONFIG.daysPerSeason * 4; i++) {
      atMidnight(a)
      atMidnight(b)
    }
    expect(a.life.news).toEqual(b.life.news)
    expect(a.life.arcs).toEqual(b.life.arcs)
    expect(a.rngState).toBe(b.rngState)
    expect(a.life.arcs.length).toBeLessThanOrEqual(12)
    expect(a.life.requests.length).toBeLessThanOrEqual(12)
    expect(a.life.news.length).toBeLessThanOrEqual(60)
    expect(a.events.length).toBeLessThanOrEqual(150)
  })
})

describe('world-driven requests', () => {
  it('rejects missing items, remote delivery, uninjured targets and unearned hunting progress without mutation', () => {
    const state = createGame()
    state.settlement.food = 8
    startArcAtReaction(state, 'food')
    const food = requestFor(state, 'food')
    player(state).inventory.food = 0
    deliverAtVillageSquare(state)
    const before = structuredClone(state)
    expect(fulfillRequest(state, food.id)).not.toBe('')
    expect(state).toEqual(before)

    const huntState = createGame()
    const huntArc = startArcAtReaction(huntState, 'road')
    const hunt = requestFor(huntState, 'road')
    deliverAtVillageSquare(huntState)
    expect(fulfillRequest(huntState, hunt.id)).not.toBe('')
    expect(recordHunt(huntState)).toBe(0)
    expect(huntState.life.arcs.find(a => a.id === huntArc.id)?.outcome).toBe('pending')

    const distant = createGame()
    const ironArc = startArcAtReaction(distant, 'iron')
    const iron = requestFor(distant, 'iron')
    player(distant).inventory.iron = iron.amount
    player(distant).currentRegion = 'mine'
    expect(fulfillRequest(distant, iron.id)).not.toBe('')
    expect(iron.status).toBe('open')
    expect(ironArc.outcome).toBe('pending')
  })

  it('requires a real active defeated outdoor combat and records each kill once', () => {
    const state = createGame()
    const arc = startArcAtReaction(state, 'road')
    const request = requestFor(state, 'road')
    const before = request.progress
    state.combat = { monsterId: 'wolf', hp: 1, maxHp: 30, attack: 8, defense: 1, exp: 10, gold: 4, elite: false, dungeon: false }
    player(state).currentRegion = 'forest'
    expect(recordHunt(state)).toBe(0)
    state.combat.hp = 0
    expect(recordHunt(state)).toBe(1)
    expect(recordHunt(state)).toBe(0)
    state.combat = { ...state.combat, hp: 0, dungeon: true }
    state.worldTime++
    expect(recordHunt(state)).toBe(0)
    expect(request.progress).toBe(before + 1)
    expect(arc.outcome).toBe('pending')
  })

  it('consumes medicine only beside a currently injured NPC and removes the injury', () => {
    const state = createGame()
    const npc = state.npcs.find(n => n.isAlive)!
    npc.injuredUntil = state.worldTime + 2 * day
    atMidnight(state)
    const request = state.life.requests.find(candidate => candidate.kind === 'medicine' && candidate.status === 'open')!
    expect(request).toBeDefined()
    const c = player(state)
    c.inventory.potion = 1
    c.position = { ...npc.position }
    c.currentRegion = npc.currentRegion
    expect(fulfillRequest(state, request.id)).toBe('')
    expect(c.inventory.potion).toBe(0)
    expect(npc.injuredUntil).toBe(state.worldTime)
    expect(state.life.npcs[npc.id]!.memories.some(memory => memory.kind === 'PLAYER_HELPED_ME')).toBe(true)
  })
})

describe('living news and trade projection', () => {
  it('lets working brave NPCs attempt the boss without claiming player credit or involving retirees', () => {
    const state = createGame(72)
    state.threat.bossAlive = true
    state.life.director.quietUntil = 0
    const guards = state.npcs.filter(npc => ['guard', 'mercenary'].includes(npc.job))
    guards.forEach(npc => { state.life.npcs[npc.id]!.traits = ['brave']; state.life.npcs[npc.id]!.career = 'retired' })
    expect(livingEventWeights(state)['medium:independent_boss_attempt']).toBeUndefined()
    guards.forEach(npc => { state.life.npcs[npc.id]!.career = 'worker' })
    expect(livingEventWeights(state)['medium:independent_boss_attempt']).toBeGreaterThan(0)
    const gold = player(state).gold
    for (let index = 0; index < 2000 && state.threat.bossAlive; index++) atMidnight(state)
    expect(state.threat.bossAlive).toBe(false)
    const memory = state.life.worldMemories.find(item => item.kind === 'GOBLIN_CHIEF_DEFEATED')!
    expect(guards.some(npc => npc.id === memory.actorId)).toBe(true)
    expect(memory.actorId).not.toBe(state.activeCharacterId)
    expect(player(state).gold).toBe(gold)
    expect(state.life.characters[state.activeCharacterId]!.reputation).toBe(0)
  })
  it('projects only bounded newest news and exposes the current buy-price penalty', () => {
    const state = createGame()
    state.life.news = Array.from({ length: 80 }, (_, index) => ({ id: `n${index}`, at: index, scope: 'rumor' as const, text: `rumor ${index}` }))
    const news = projectLivingNews(state, 5)
    expect(news).toHaveLength(5)
    expect(news[0]!.id).toBe('n79')
    expect(news[0]).not.toBe(state.life.news[79])
    expect(projectLivingNews(state, 0)).toEqual([])
    expect(tradePriceMultiplier(state)).toBe(1)
    state.life.director.tradePenalty = 0.4
    expect(tradePriceMultiplier(state)).toBe(1.4)
  })

  it('creates a traveler only through the bounded spawn hook and sends the spawn definition', () => {
    const state = createGame(28)
    state.settlement.stage = 'village'
    state.settlement.capacity = 100
    state.settlement.prosperity = 90
    state.settlement.food = 90
    state.settlement.safety = 95
    state.life.director.stability = 90
    state.life.director.quietUntil = 0
    const visits: { kind: string; durationDays: number; rumor: string }[] = []
    for (let i = 0; i < 5000 && !visits.length; i++) {
      state.worldTime = (Math.floor(state.worldTime / day) + 1) * day
      dailyLivingEvents(state, { spawnTraveler: (_world, visitor) => { visits.push(visitor); return true } })
    }
    expect(visits.length).toBeLessThanOrEqual(1)
    expect(visits[0]?.durationDays).toBeGreaterThan(0)
    expect(state.life.news.some(item => item.scope === 'rumor')).toBe(true)
  })
})
