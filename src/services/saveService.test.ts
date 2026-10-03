import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { combatTurn, encounter, equip, farm } from '../engine/actions'
import { createGame, die, player, simulate, walkTo } from '../engine/simulation'
import { deserialize, offlineProgress, serialize } from './saveService'

describe('versioned saves and deterministic continuation', () => {
  it('round trips a living world and preserves future simulation', () => {
    const s = createGame(32); simulate(s, 100 * 1440)
    const saved = deserialize(serialize(s, 1000))
    expect(saved.state).toEqual(s); expect(saved.lastSavedAt).toBe(1000)
    simulate(s, 1440); simulate(saved.state, 1440); expect(saved.state).toEqual(s)
  })
  it('round trips a deceased character instead of discarding the world', () => {
    const s = createGame(); die(s, player(s), '戰鬥傷勢')
    expect(deserialize(serialize(s, 1000)).state).toEqual(s)
  })
  it('round trips an equipped character in active combat and continues the encounter', () => {
    const s = createGame(); walkTo(s, { x: 5, y: 4 }); player(s).inventory.sword = 1; equip(s, 'sword'); encounter(s)
    const loaded = deserialize(serialize(s, 1000)).state
    expect(loaded).toEqual(s)
    combatTurn(s, 'attack'); combatTurn(loaded, 'attack'); expect(loaded).toEqual(s)
  })
  it('rejects unsupported versions, missing fields and invalid JSON', () => {
    const s = createGame(), raw = JSON.parse(serialize(s, 1000))
    raw.saveVersion = 99; expect(() => deserialize(JSON.stringify(raw))).toThrow('版本')
    raw.saveVersion = 1; delete raw.npcs; expect(() => deserialize(JSON.stringify(raw))).toThrow('資料')
    expect(() => deserialize('{')).toThrow()
  })
  it('rejects fractional prepared plots on the first load (PT-001)', () => {
    const s = createGame()
    s.preparedPlots = 0.5
    expect(() => deserialize(serialize(s, 1000))).toThrow('原始存檔已保留')
  })
  it.each([0, 1, 2, 3, 4])('round trips %s whole prepared plots', preparedPlots => {
    const s = createGame()
    s.preparedPlots = preparedPlots
    expect(deserialize(serialize(s, 1000)).state).toEqual(s)
  })
  it('round trips normal farming at capacity and continues planting', () => {
    const s = createGame()
    walkTo(s, { x: 16, y: 10 })
    for (let i = 0; i < 4; i++) expect(farm(s, 'prepare')).toBe('')
    expect(s.preparedPlots).toBe(4)
    expect(farm(s, 'plant')).toBe('')
    expect(s.preparedPlots).toBe(3)
    expect(s.crops).toHaveLength(1)
    const loaded = deserialize(serialize(s, 1000)).state
    expect(loaded).toEqual(s)
    expect(farm(loaded, 'plant')).toBe('')
    expect(loaded.preparedPlots).toBe(2)
    expect(loaded.crops).toHaveLength(2)
    expect(deserialize(serialize(loaded, 2000)).state).toEqual(loaded)
  })
  it.each(['invalid-calendar', 'invalid-character-stage', 'invalid-event', 'invalid-combat'])('rejects a corrupt %s save', kind => {
    const raw = JSON.parse(serialize(createGame(), 1000))
    if (kind === 'invalid-calendar') raw.worldTime = -10
    if (kind === 'invalid-character-stage') raw.characters[0].lifeStage = 'unknown-stage'
    if (kind === 'invalid-event') raw.events[0].category = 'bogus'
    if (kind === 'invalid-combat') raw.combat = 'not-a-combat-object'
    expect(() => deserialize(JSON.stringify(raw))).toThrow()
  })
  it('matures crops at the same instant in batch and minute-by-minute simulation', () => {
    const s = createGame(); walkTo(s, { x: 16, y: 10 }); farm(s, 'prepare'); farm(s, 'plant')
    const granular = deserialize(serialize(s, 1000)).state
    simulate(s, 3000)
    for (let i = 0; i < 3000; i++) simulate(granular, 1)
    expect(granular).toEqual(s)
  })
  it.each(['character-exp', 'npc-skill-exp', 'skill-level', 'schedule-midnight', 'schedule-order', 'schedule-start', 'dungeon-stage', 'dungeon-combat'])('rejects unsafe continuation: %s', kind => {
    const raw = JSON.parse(serialize(createGame(), 1000))
    if (kind === 'character-exp') raw.characters[0].exp = 1e308
    if (kind === 'npc-skill-exp') raw.npcs[0].skills.farming.exp = 1e308
    if (kind === 'skill-level') raw.npcs[0].skills.farming.level = -1e100
    if (kind === 'schedule-midnight') raw.npcs[0].schedule = [{ start: 500, activity: 'work', destination: 'workplace' }]
    if (kind === 'schedule-order') raw.npcs[0].schedule[2].start = 400
    if (kind === 'schedule-start') raw.npcs[0].schedule[1].start = 420.5
    if (kind === 'dungeon-stage') { raw.dungeon.stage = 3; raw.dungeon.inDungeon = true }
    if (kind === 'dungeon-combat') raw.combat = { monsterId: 'slime', hp: 18, maxHp: 18, attack: 4, defense: 0, exp: 10, gold: 5, elite: false, dungeon: true }
    expect(() => deserialize(JSON.stringify(raw))).toThrow('資料')
  })
  it.each([CONFIG.width, 0.5])('rejects an incomplete grid caused by tile x=%s', x => {
    const raw = JSON.parse(serialize(createGame(), 1000))
    raw.tiles.find((tile: { x: number; y: number }) => tile.x === 7 && tile.y === 10).x = x
    expect(() => deserialize(JSON.stringify(raw))).toThrow('資料')
  })
  it.each(['player', 'npc', 'home', 'workplace', 'threat'])('rejects invalid world locations or encounter levels: %s', kind => {
    const raw = JSON.parse(serialize(createGame(), 1000))
    if (kind === 'player') raw.characters[0].position.x = 7.5
    if (kind === 'npc') raw.npcs[0].position.y = CONFIG.height
    if (kind === 'home') raw.npcs[0].home.x = 7.5
    if (kind === 'workplace') raw.npcs[0].workplace.y = -1
    if (kind === 'threat') raw.threat.threatLevel = 0
    expect(() => deserialize(JSON.stringify(raw))).toThrow('資料')
  })
})

describe('bounded offline progress', () => {
  it('advances crops, population, threats and settlement with a return summary', () => {
    const s = createGame(); walkTo(s, { x: 16, y: 10 }); farm(s, 'prepare'); farm(s, 'plant')
    const start = s.worldTime, growth = s.settlement.growth
    const summary = offlineProgress(s, 1000, 1000 + 8 * 3600000)!
    expect(summary.minutes).toBe(57600); expect(s.worldTime - start).toBe(57600)
    expect(summary.matured).toBe(1); expect(summary.populationChange).toBeGreaterThan(0)
    expect(s.settlement.growth).toBeGreaterThan(growth); expect(summary.threatAfter).toBe(2)
  })
  it('caps elapsed time at eight real hours and ignores negative elapsed time', () => {
    const a = createGame(), b = createGame()
    offlineProgress(a, 1000, 1000 + 8 * 3600000); offlineProgress(b, 1000, 1000 + 30 * 3600000)
    expect(a).toEqual(b)
    const snapshot = JSON.stringify(a); expect(offlineProgress(a, 2000, 1000)).toBeNull(); expect(JSON.stringify(a)).toBe(snapshot)
  })
  it('ages people on year rollover and expires mercenary contracts offline', () => {
    const s = createGame(), npc = s.npcs.find(n => n.job === 'mercenary')!
    s.worldTime = CONFIG.daysPerSeason * 4 * 1440 - 1440
    s.party.push({ npcId: npc.id, hireCost: 25, dailyWage: 4, contractEnd: s.worldTime + 1440, archetype: 'fighter' })
    const summary = offlineProgress(s, 1000, 1000 + 3600000)!
    expect(player(s).age).toBe(17); expect(summary.contractsEnded).toBe(1); expect(summary.years).toBe(1)
  })
})
