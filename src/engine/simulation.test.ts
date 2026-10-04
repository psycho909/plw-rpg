import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { calendar, lifeStage } from './calendar'
import { chooseSuccessor, createGame, die, gainExp, movePlayer, player, population, simulate, syncNpcs, walkTo } from './simulation'
import { random } from './random'

const day = 1440, year = 120 * day

it('uses additional configured threat levels for population and camp growth', () => {
  const s = createGame(); s.threat.monsterPopulation = 95
  CONFIG.threatThresholds.push(90)
  try { simulate(s, day); expect(s.threat.threatLevel).toBe(4); expect(s.threat.campLevel).toBe(4) }
  finally { CONFIG.threatThresholds.pop() }
})

describe('calendar and seeded world', () => {
  it('rolls days, seasons and years at their exact boundaries', () => {
    expect(calendar(1439)).toEqual({ year: 1, season: 0, day: 1, hour: 23, minute: 59 })
    expect(calendar(1440)).toEqual({ year: 1, season: 0, day: 2, hour: 0, minute: 0 })
    expect(calendar(30 * day)).toEqual({ year: 1, season: 1, day: 1, hour: 0, minute: 0 })
    expect(calendar(year)).toEqual({ year: 2, season: 0, day: 1, hour: 0, minute: 0 })
    expect(calendar(40 * day, 10).year).toBe(2)
  })
  it('reproduces the same seed and serializable RNG continuation', () => {
    const a = createGame(42), b = createGame(42)
    expect(a).toEqual(b)
    const snapshot = JSON.parse(JSON.stringify(a))
    expect(random(a)).toBe(random(snapshot))
    expect(createGame(43).rngState).not.toBe(b.rngState)
  })
  it('is independent of simulation call size', () => {
    const a = createGame(), b = createGame()
    simulate(a, 20 * day)
    for (let i = 0; i < 20 * 24; i++) simulate(b, 60)
    expect(a).toEqual(b)
  })
  it.each([NaN, Infinity, -1])('rejects invalid elapsed minutes %s', amount => {
    expect(() => simulate(createGame(), amount)).toThrow()
  })
})

describe('characters, movement and autonomous residents', () => {
  it('moves only the active character and respects water / cardinal steps', () => {
    const state = createGame(), npcPosition = { ...state.npcs[0]!.position }
    expect(movePlayer(state, 1, 0)).toBe(true)
    expect(player(state).position).toEqual({ x: 8, y: 9 })
    expect(state.npcs[0]!.position).toEqual(npcPosition)
    expect(movePlayer(state, 1, 1)).toBe(false)
    expect(walkTo(state, { x: 0, y: 9 })).toBe(false)
    expect(walkTo(state, { x: 20, y: 3 })).toBe(true)
    expect(state.dungeon.discovered).toBe(true)
    expect(state.history.some(e => e.type === 'region.discovered')).toBe(true)
  })
  it('accumulates character and skill EXP with level ups', () => {
    const s = createGame(), c = player(s)
    gainExp(s, c, 95, 'mining')
    expect(c.level).toBe(3); expect(c.exp).toBe(5)
    expect(c.skills.mining.level).toBe(3); expect(c.skills.mining.exp).toBe(35)
    expect(c.stats.strength).toBe(12)
  })
  it.each([[14, 'child'], [15, 'young'], [24, 'young'], [25, 'adult'], [49, 'adult'], [50, 'middleAge'], [64, 'middleAge'], [65, 'elder']] as const)('maps age %s to %s', (age, stage) => expect(lifeStage(age)).toBe(stage))
  it('runs sleep, travel, work and leisure without a player action', () => {
    const s = createGame(), n = s.npcs[0]!, start = { ...player(s).position }
    s.worldTime = 6 * 60; syncNpcs(s); expect(n.currentActivity).toBe('sleep'); expect(n.position).toEqual(n.home)
    simulate(s, 90); expect(n.currentActivity).toBe('travel'); expect(n.position).not.toEqual(n.home)
    simulate(s, 30); expect(n.currentActivity).toBe('work'); expect(n.position).toEqual(n.workplace)
    simulate(s, 10 * 60); expect(n.currentActivity).toBe('leisure')
    simulate(s, 4 * 60); expect(n.currentActivity).toBe('sleep')
    expect(player(s).position).toEqual(start)
    simulate(s, day); expect(n.skills.farming.exp).toBeGreaterThan(0)
  })
  it('ages characters annually and applies stamina modifiers', () => {
    const s = createGame(), c = player(s), npcAge = s.npcs[0]!.age
    simulate(s, 9 * year)
    expect(c.age).toBe(25); expect(c.lifeStage).toBe('adult'); expect(c.maxStamina).toBe(80)
    expect(s.npcs[0]!.age).toBe(npcAge + 9)
  })
  it('records births, immigration and natural deaths while preserving the world', () => {
    const s = createGame(), n = s.npcs[0]!
    n.lifespan = n.age + 1
    simulate(s, year)
    expect(s.history.some(e => e.type === 'npc.born')).toBe(true)
    expect(s.history.some(e => e.type === 'npc.immigrated')).toBe(true)
    expect(n.isAlive).toBe(false); expect(n.deathCause).toBe('自然老化')
    const xp = n.exp; simulate(s, day); expect(n.exp).toBe(xp)
  })
  it('allows a successor only after death without resetting time or history', () => {
    const s = createGame(), id = s.npcs[0]!.id
    expect(chooseSuccessor(s, id)).toBe(false)
    die(s, player(s), '測試傷勢'); simulate(s, day)
    const time = s.worldTime, history = structuredClone(s.history)
    expect(chooseSuccessor(s, id)).toBe(true)
    expect(s.worldTime).toBe(time); expect(s.history.slice(0, history.length)).toEqual(history)
    expect(s.history.at(-1)?.type).toBe('character.successor')
    expect(s.history.slice(history.length).every(event => ['character.successor', 'identity.formed'].includes(event.type))).toBe(true)
    expect(s.activeCharacterId).toBe(id); expect(s.npcs.some(n => n.id === id)).toBe(false)
    expect(s.characters[0]!.isAlive).toBe(false)
  })
  it('starts a successor in the region where the resident actually lives', () => {
    const s = createGame(), miner = s.npcs.find(n => n.job === 'miner')!
    expect(miner.position).toEqual({ x: 19, y: 5 })
    die(s, player(s), '戰鬥傷勢'); chooseSuccessor(s, miner.id)
    expect(player(s).currentRegion).toBe('mine')
  })
})

describe('settlements and threats', () => {
  it('grows through both settlement stages without an upgrade button', () => {
    const s = createGame()
    simulate(s, 3 * year)
    expect(s.settlement.stage).toBe('town')
    expect(s.settlement.buildings).toContain('tavern'); expect(s.settlement.buildings).toContain('blacksmith')
    expect(s.history.filter(e => e.type === 'settlement.grew')).toHaveLength(2)
    expect(s.settlement.capacity).toBe(80)
  })
  it('grows the camp, warns before a threat-driven boss, and harms settlement safety', () => {
    const s = createGame(), safety = s.settlement.safety
    simulate(s, 3 * year)
    expect(s.threat.threatLevel).toBe(3); expect(s.threat.campLevel).toBe(3)
    expect(s.threat.bossAlive).toBe(true); expect(s.dungeon.threat).toBe(3)
    const warnings = s.history.filter(e => e.type === 'boss.warning'), boss = s.history.find(e => e.type === 'boss.spawned')!
    expect(warnings).toHaveLength(2); expect(warnings.every(e => e.at < boss.at)).toBe(true)
    expect(s.settlement.safety).toBeLessThan(safety); expect(player(s).isAlive).toBe(true)
  })
  it('spawns based on accumulated threat instead of elapsed date', () => {
    const slow = createGame(), fast = createGame()
    slow.threat.growthRate = 0; fast.threat.growthRate = 20
    simulate(slow, 100 * day); simulate(fast, 100 * day)
    expect(slow.threat.bossAlive).toBe(false); expect(fast.threat.bossAlive).toBe(true)
  })
  it.each([1, 10, 50])('survives a %s-year headless simulation', years => {
    const s = createGame(321); simulate(s, years * year)
    expect(calendar(s.worldTime).year).toBe(years + 1)
    expect(player(s).age).toBe(16 + years)
    expect(population(s)).toBeGreaterThan(0); expect(population(s)).toBeLessThanOrEqual(CONFIG.maxPopulation)
    expect(s.npcs.every(n => n.isAlive)).toBe(true)
    expect(s.threat.monsterPopulation).toBeLessThanOrEqual(100); expect(s.threat.bossProgress).toBeLessThanOrEqual(100)
    expect(s.events.length).toBeLessThanOrEqual(150)
    const checkNumbers = (value: unknown): void => {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
      else if (value && typeof value === 'object') Object.values(value).forEach(checkNumbers)
    }
    checkNumbers(s)
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  }, 10000)
})
