import { describe, expect, it } from 'vitest'
import { createGame, simulate, chooseSuccessor, die, player } from './simulation'
import { buyPrice, combatTurn, encounter, farm, gather, hire, trade } from './actions'
import { buyProperty, supplyFarmFood } from './ownership'
import { serialize, deserialize } from '../services/saveService'

const year = 120 * 1440
describe('V2 integrated life rules', () => {
  it('connects living trade penalties and supplies to actual transactions', () => {
    const state = createGame(), c = player(state)
    c.position = { x: 10, y: 9 }; c.gold = 100
    state.life.director.tradePenalty = .5
    const price = buyPrice(state, 'food'), food = state.settlement.food
    expect(trade(state, 'food', true)).toBe('')
    expect(c.gold).toBe(100 - price)
    expect(state.settlement.food).toBeCloseTo(food - .2)
    expect(state.life.director.lastPlayerActivity).toBe(state.worldTime)
  })
  it('records actual battle wins as life experience and keeps the boss story through reload', () => {
    const state = createGame(), c = player(state)
    c.currentRegion = 'forest'; c.position = { x: 7, y: 3 }
    c.stats.strength = 1000
    for (let i = 0; i < 10; i++) {
      c.stamina = c.maxStamina; state.threat.monsterPopulation = 100
      expect(encounter(state)).toBe(''); expect(combatTurn(state, 'attack')).toBe('')
    }
    expect(state.life.characters[c.id]!.identities).toContain('adventurer')
    state.threat.bossAlive = true; c.stamina = c.maxStamina
    expect(encounter(state, true)).toBe(''); expect(combatTurn(state, 'attack')).toBe('')
    expect(state.threat.bossAlive).toBe(false)
    expect(state.life.worldMemories.some(memory => memory.kind === 'GOBLIN_CHIEF_DEFEATED' && memory.actorId === c.id)).toBe(true)
    expect(deserialize(serialize(state)).state).toEqual(state)
  })
  it('preserves real property, supplies and its deceased owner when another life begins', () => {
    const state = createGame(), c = player(state)
    state.settlement.stage = 'village'; state.settlement.buildings.push('tavern', 'blacksmith')
    c.gold = 1000; state.life.characters[c.id]!.reputation = 80
    expect(buyProperty(state, 'home')).toBe('')
    c.position = { x: 16, y: 9 }; c.currentRegion = 'farmland'
    expect(buyProperty(state, 'land')).toBe(''); expect(buyProperty(state, 'farmBusiness')).toBe('')
    c.inventory.food = 5
    expect(supplyFarmFood(state, 5)).toBe('')
    const properties = structuredClone(state.life.properties)
    die(state, c, '測試傷勢')
    expect(chooseSuccessor(state, state.npcs[0]!.id)).toBe(true)
    expect(state.life.properties).toEqual(properties)
    expect(state.life.properties.every(property => property.ownerId === c.id)).toBe(true)
    expect(deserialize(serialize(state)).state.life.properties).toEqual(properties)
  })
  it('lets settlement reputation affect actual mercenary terms', () => {
    const state = createGame(), c = player(state), npc = state.npcs.find(n => n.job === 'mercenary')!
    state.settlement.stage = 'village'; state.settlement.buildings.push('tavern')
    state.worldTime = 17 * 60; c.position = { x: 11, y: 10 }; c.gold = 100
    state.life.characters[c.id]!.reputation = -26
    expect(hire(state, npc.id)).not.toBe('')
    expect(c.gold).toBe(100)
    state.life.characters[c.id]!.reputation = 80
    expect(hire(state, npc.id)).toBe('')
    expect(state.party[0]!.hireCost).toBe(22)
    expect(c.gold).toBe(78)
  })
  it('lets life actions form an identity without selecting a class', () => {
    const state = createGame(), c = player(state)
    c.currentRegion = 'mine'; c.position = { x: 19, y: 5 }
    for (let i = 0; i < 12; i++) { c.stamina = c.maxStamina; state.regions.mine.remainingAmount = 100; expect(gather(state, 'iron')).toBe('') }
    expect(state.life.characters[c.id]!.identities).toContain('miner')
    c.currentRegion = 'farmland'; c.stamina = c.maxStamina
    expect(farm(state, 'prepare')).toBe('')
    expect(state.life.characters[c.id]!.actions.farming).toBeGreaterThan(0)
  })
  it('retires elderly NPCs through daily evolution and stops their paid work schedule', () => {
    const state = createGame(), n = state.npcs[0]!
    n.birthYear = -67; n.age = 68; n.lifespan = 100
    state.life.npcs[n.id]!.traits = ['content', 'solitary']
    simulate(state, 1440)
    expect(state.life.npcs[n.id]!.career).toBe('retired')
    simulate(state, 8 * 60)
    expect(n.currentActivity).not.toBe('work')
  })
  it('successors are local residents and preserve the deceased generation and ownership', () => {
    const state = createGame(), first = player(state), npc = state.npcs[0]!
    state.life.characters[first.id]!.reputation = 20
    const oldLife = structuredClone(state.life.characters[first.id])
    die(state, first, '自然老化')
    const before = state.worldTime
    expect(chooseSuccessor(state, npc.id)).toBe(true)
    expect(state.worldTime).toBe(before)
    expect(state.life.characters[npc.id]!.origin).toBe('LOCAL_WORLD')
    expect(state.life.characters[npc.id]!.generation).toBe(2)
    expect(state.life.characters[first.id]!.reputationHistory).toEqual(oldLife!.reputationHistory)
    expect(state.life.characters[first.id]!.reputation).toBe(20)
    expect(state.life.characters[first.id]!.milestones.at(-1)?.id).toBe(`death-${first.id}`)
  })
  it('produces equal state for minute, hour, day and one-batch stepping', () => {
    const total = 3 * 1440, states = [1, 60, 1440, total].map(step => {
      const state = createGame(2026)
      for (let t = 0; t < total; t += step) simulate(state, Math.min(step, total - t))
      return state
    })
    states.slice(1).forEach(state => expect(state).toEqual(states[0]))
  })
  const assertLongWorldIsBoundedAndDeterministic = (years: number) => {
    const state = createGame(710), restored = deserialize(serialize(state, 10)).state
    simulate(state, years * year); simulate(restored, years * year)
    expect(restored).toEqual(state)
    expect(deserialize(serialize(state, 20)).state).toEqual(state)
    expect(state.history.length).toBeLessThanOrEqual(20000)
    expect(state.life.news.length).toBeLessThanOrEqual(100)
    expect(state.life.requests.length).toBeLessThanOrEqual(100)
    expect(Object.keys(state.life.npcs).length).toBeLessThanOrEqual(1000)
    expect(new Set([...state.npcs, ...state.characters].map(c => c.id)).size).toBe(state.npcs.length + state.characters.length)
  }
  it.each([10, 50])('keeps a %s-year world bounded, serializable and deterministic after save', years => {
    assertLongWorldIsBoundedAndDeterministic(years)
  })
  it('keeps a 100-year world bounded, serializable and deterministic after save', () => {
    assertLongWorldIsBoundedAndDeterministic(100)
  }, 15_000)
})
