import { expect, it } from 'vitest'
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createGame, chooseSuccessor, player, population, simulate } from '../../../../src/engine/simulation'
import { CONFIG } from '../../../../src/data/config'
import { encounterWolf } from '../../../../src/engine/wolfFamily'
import { combatTurn } from '../../../../src/engine/actions'
import { generateItem } from '../../../../src/engine/itemGeneration'
import { deserialize, serialize } from '../../../../src/services/saveService'

const year = CONFIG.minutesPerDay * CONFIG.daysPerSeason * 4
const root = process.cwd()
const output = root + '/reports/v2/20261006-reward-core/long-term'
mkdirSync(output, { recursive: true })
const run = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '')
const rawPath = output + '/samples-' + run + '.jsonl'
function finite(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (value && typeof value === 'object') return Object.values(value).every(finite)
  return true
}
it.each([17, 909, 2026])('preserves reward and living-world data over 10/50/100 years, seed %s', seed => {
  let state = createGame(seed)
  const initialSeed = state.worldSeed
  const owner = state.activeCharacterId
  const beforeWorld = JSON.stringify(state.characters)
  // Headless data-volume fixture: generated through canonical API, not a browser-play claim.
  for (let i = 0; i < 500; i++) state.reward.instances.push(generateItem(state, { baseId: i % 2 ? 'axe' : 'chainArmor', level: 1 + i % 10, material: i % 2 ? 'wolfFang' : 'wolfHide' }))
  expect(JSON.stringify(state.characters)).toBe(beforeWorld)
  const originalItems = structuredClone(state.reward.instances)
  // Controlled progression/location fixture; formation is produced only by canonical encounter API.
  state.reward.collection.seen = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader']
  state.reward.collection.defeated = [...state.reward.collection.seen]
  player(state).position = { x: 7, y: 6 }; player(state).currentRegion = 'forest'
  expect(encounterWolf(state, 'wolfKing')).toBe('')
  const originalBossForm = structuredClone(state.reward.wolfBossForm)
  expect(originalBossForm).not.toBeNull()
  for (let attempt = 0; attempt < 20 && state.combat; attempt++) expect(combatTurn(state, 'run')).toBe('')
  expect(state.combat).toBeNull()
  const startingWorldTime = state.worldTime
  const began = performance.now()
  for (let elapsedYears = 1; elapsedYears <= 100; elapsedYears++) {
    simulate(state, year)
    if (!player(state).isAlive) {
      const successor = state.npcs.filter(npc => npc.isAlive && npc.age >= 15 && npc.age < 50).sort((a, b) => a.age - b.age)[0]
      if (successor) expect(chooseSuccessor(state, successor.id)).toBe(true)
    }
    if (![10, 50, 100].includes(elapsedYears)) continue
    expect(state.worldSeed).toBe(initialSeed)
    expect(state.worldTime).toBe(startingWorldTime + elapsedYears * year)
    expect(state.reward.wolfBossForm).toEqual(originalBossForm)
    expect(state.reward.instances).toEqual(originalItems)
    expect(state.reward.instances.every(item => item.ownerId === owner)).toBe(true)
    expect(new Set(state.reward.instances.map(item => item.instanceId)).size).toBe(500)
    expect(finite(state)).toBe(true)
    expect(state.events.length).toBeLessThanOrEqual(150)
    expect(state.history.length).toBeLessThanOrEqual(20000)
    expect(new Set(state.npcs.map(npc => npc.id)).size).toBe(state.npcs.length)
    const saveStarted = performance.now()
    const json = serialize(state, 12345)
    const saveMs = performance.now() - saveStarted
    const loadStarted = performance.now()
    const loaded = deserialize(json)
    const loadMs = performance.now() - loadStarted
    expect(loaded.state).toEqual(state)
    expect(deserialize(serialize(loaded.state, 12345)).state).toEqual(state)
    const sample = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      harnessSha256: createHash('sha256').update(readFileSync(output + '/long_world.test.ts')).digest('hex'),
      seed, elapsedYears, worldTime: state.worldTime, rngState: state.rngState, population: population(state),
      npcTotal: state.npcs.length, livingNPC: state.npcs.filter(npc => npc.isAlive).length,
      deadNPC: state.npcs.filter(npc => !npc.isAlive).length, generations: state.characters.length,
      careers: Object.values(state.life.npcs).reduce((sum, npc) => sum + npc.milestones.length, 0),
      identities: Object.values(state.life.characters).map(life => life.identities),
      reputation: Object.values(state.life.characters).map(life => life.reputation),
      ownership: state.life.properties.length, arcs: state.life.arcs.length, news: state.life.news.length,
      memories: Object.values(state.life.npcs).reduce((sum, npc) => sum + npc.memories.length, 0),
      threat: state.threat, economy: state.settlement, events: state.events.length, history: state.history.length,
      bossForm: state.reward.wolfBossForm, startingWorldTime, instances: state.reward.instances.length, saveBytes: Buffer.byteLength(json), saveMs, loadMs,
      elapsedMs: performance.now() - began, playerAlive: player(state).isAlive,
      limitation: 'Headless simulation; 500 generated gear fixtures retained by their original owner; controlled prior family progress/location with canonically formed and fled boss persisted across generations. Not normal-play elapsed browser time and not human Fun Gate.' }
    appendFileSync(rawPath, JSON.stringify(sample) + '\n')
    // Immutable, timestamped raw file; root recorded_reports publishes final projections after runner completes.
  }
}, 60000)
