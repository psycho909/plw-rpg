// Engine playthrough; uses actual APIs, no resource injection. Not human Fun Gate evidence.
import { strict as assert } from 'node:assert'
import { writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { createGame, player, simulate, walkTo } from '../../../src/engine/simulation'
import { farm, gather, rest, trade } from '../../../src/engine/actions'
import { buyProperty } from '../../../src/engine/ownership'
import { talkNpc } from '../../../src/engine/npcLife'
import { fulfillRequest } from '../../../src/engine/livingEvents'
import { serialize, deserialize } from '../../../src/services/saveService'
import { captureEvents } from '../../../src/engine/events'
import { CONFIG, BUILDINGS } from '../../../src/data/config'

const out = 'reports/v2/20261004-life-emergence', day = CONFIG.minutesPerDay, year = day * CONFIG.daysPerSeason * 4
const source: Record<string, string> = {}
function hashes(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) hashes(path)
    else source[path] = createHash('sha256').update(readFileSync(path)).digest('hex')
  }
}
hashes('src')
const result = { source_sha256: source, method: 'actual engine APIs; no inventory/gold/skills/stat injections; explicit active time waits', play: [] as unknown[], worlds: [] as unknown[] }
function publish() {
  execFileSync('python3', ['scripts/recorded_reports.py', 'publish', `${out}/long-play.json`], { input: JSON.stringify(result, null, 2) })
}
const state = createGame(909)
const actions: unknown[] = []
function act(name: string, action: () => string | boolean | void) {
  const from = state.worldTime, captured = captureEvents(state, action)
  actions.push({ name, from, to: state.worldTime, outcome: captured.result ?? 'advanced', actor: state.activeCharacterId,
    important: captured.events.filter(event => event.tier === 'major').map(event => event.message) })
  return captured.result
}
function home() {
  act('walk home', () => walkTo(state, BUILDINGS.house.position))
  while (player(state).stamina < 60) act('rest', () => rest(state, 'rest'))
}
for (let index = 0; index < 30; index++) {
  const end = state.worldTime + day
  home()
  act('walk farm', () => walkTo(state, BUILDINGS.farm.position))
  while (state.crops.some(crop => crop.status === 'mature') && player(state).stamina >= 4) act('harvest', () => farm(state, 'harvest'))
  while (state.crops.length + state.preparedPlots < CONFIG.maxPlots && player(state).stamina >= 10) act('prepare', () => farm(state, 'prepare'))
  while (state.preparedPlots && player(state).stamina >= 4) act('plant', () => farm(state, 'plant'))
  home()
  act('walk mine', () => walkTo(state, { x: 19, y: 5 }))
  for (let i = 0; i < 3 && player(state).stamina >= 10; i++) act('mine iron', () => gather(state, 'iron'))
  act('walk store', () => walkTo(state, BUILDINGS.store.position))
  const minute = state.worldTime % day
  if (minute < 480 || minute >= 1200) act('wait for store opening', () => simulate(state, (480-minute+day)%day))
  for (const item of ['iron','food'] as const) {
    while (player(state).inventory[item] > (item === 'food' ? 3 : 0)) { if (act(`sell ${item}`, () => trade(state, item, false)) !== '') break }
  }
  const request = state.life.requests.find(candidate => candidate.status === 'open' && candidate.kind === 'medicine')
  const resident = state.npcs.find(npc => npc.id === request?.npcId)
  if (resident && player(state).inventory.potion > 0) {
    act('walk injured resident', () => walkTo(state, resident.position))
    act('help injured resident', () => fulfillRequest(state, request!.id))
  }
  const known = state.npcs.find(npc => state.life.npcs[npc.id]?.featured)
  if (known) {
    act('visit featured resident', () => walkTo(state, known.position))
    act('talk', () => talkNpc(state, known.id))
  }
  home()
  if (!state.life.properties.some(property => property.ownerId === state.activeCharacterId && property.kind === 'home') && player(state).gold >= 80) act('buy home', () => buyProperty(state, 'home'))
  if (state.worldTime < end) act('active idle until next day', () => simulate(state, end-state.worldTime))
  assert.deepEqual(deserialize(serialize(state)).state, state)
  result.play.push(structuredClone({ day: index+1, worldTime: state.worldTime, name: player(state).name, gold: player(state).gold,
    identity: state.life.characters[state.activeCharacterId], properties: state.life.properties,
    population: state.npcs.length, news: state.life.news.slice(-2), actions: actions.splice(0) }))
  publish()
}
assert(state.worldTime >= 30 * day)
for (const seed of [17,909,2026]) for (const years of [10,50,100]) {
  const started = performance.now(), a = createGame(seed), b = deserialize(serialize(a, 0)).state
  simulate(a, years * year)
  for (let elapsed = 0; elapsed < years * year; elapsed += 30*day) simulate(b, Math.min(30*day, years*year-elapsed))
  assert.deepEqual(a,b)
  const raw = serialize(a,0)
  assert.deepEqual(deserialize(raw).state,a)
  assert(a.history.length <= 20000 && a.life.news.length <= 60 && a.life.arcs.length <= 12 && a.life.requests.length <= 12)
  const ids = [...a.characters,...a.npcs].map(actor=>actor.id)
  assert(new Set(ids).size === ids.length)
  result.worlds.push({ seed, years, elapsedMs: performance.now()-started, saveBytes: Buffer.byteLength(raw),
    history:a.history.length, news:a.life.news.length, arcs:a.life.arcs.length, npcLife:Object.keys(a.life.npcs).length,
    playerAlive:player(a).isAlive, deterministic:true, roundtrip:true })
  publish()
}
writeFileSync('/tmp/plw-v2-long-completed', 'pass')
