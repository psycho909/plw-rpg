import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createServer } from 'vite'

const WORLD_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(WORLD_DIR, '../../../..')
const SOURCE_ROOT = '/tmp/plw-rpg-qa-source-738bc00'
const MANIFEST_PATH = join(REPO_ROOT, 'reports/playtests/20261004-deep-qa/baseline/manifest.json')
const WRITER_PATH = join(REPO_ROOT, 'scripts/recorded_reports.py')
const MAX_DAYS = 1440
const DEFAULT_SEEDS = [411, 912, 2026, 6124, 99173]
const MILESTONES = [30, 120, 360, 1440]
const STRATEGIES = ['abandon', 'clear', 'normal']
const SOURCE_FILES = [
  'src/data/config.ts',
  'src/domain/types.ts',
  'src/engine/actions.ts',
  'src/engine/calendar.ts',
  'src/engine/events.ts',
  'src/engine/random.ts',
  'src/engine/simulation.ts',
  'src/services/saveService.ts',
]

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
const reportState = {
  startedAt: new Date().toISOString(),
  sourceCommit: manifest.sourceCommit,
  sourceRoot: SOURCE_ROOT,
  phase: 'startup',
}
let activeState = null
let activeWorldState = null
let engineRuntime = null

function publish(name, value) {
  const body = typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`
  const result = spawnSync('python3', ['-B', WRITER_PATH, 'publish', join(WORLD_DIR, name), '--producer', 'deep-qa-world'], {
    cwd: REPO_ROOT,
    input: body,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  if (result.error || result.status !== 0) {
    throw new Error(`recorded_reports.write_recorded failed for ${name}: ${result.error?.message ?? result.stderr ?? result.status}`)
  }
}

function sourceFingerprint() {
  assert.equal(manifest.sourceCommit, '738bc0010c549fa3fb2420437d171f5aa2a043a0', 'baseline source commit mismatch')
  const files = {}
  for (const file of SOURCE_FILES) {
    const actual = sha256(readFileSync(join(SOURCE_ROOT, file)))
    const expected = manifest.sourceHashes[file]
    assert.ok(expected, `baseline manifest lacks ${file}`)
    assert.equal(actual, expected, `frozen source hash differs from baseline manifest for ${file}`)
    files[file] = actual
  }
  return { sourceCommit: manifest.sourceCommit, root: SOURCE_ROOT, files }
}

function parseArgs(argv) {
  const options = { days: MAX_DAYS, seedCount: DEFAULT_SEEDS.length, strategies: [...STRATEGIES] }
  for (const arg of argv) {
    const [key, value] = arg.split('=', 2)
    if (key === '--days') options.days = Number(value)
    else if (key === '--seeds') options.seedCount = Number(value)
    else if (key === '--strategies') options.strategies = value.split(',')
    else throw new Error(`Unknown argument: ${arg}`)
  }
  assert.ok(Number.isInteger(options.days) && options.days >= 30 && options.days <= MAX_DAYS, `--days must be an integer from 30 to ${MAX_DAYS}`)
  assert.ok(Number.isInteger(options.seedCount) && options.seedCount >= 1 && options.seedCount <= DEFAULT_SEEDS.length, `--seeds must be an integer from 1 to ${DEFAULT_SEEDS.length}`)
  assert.ok(options.strategies.length > 0 && options.strategies.every((s) => STRATEGIES.includes(s)), 'unsupported strategy')
  return { ...options, seeds: DEFAULT_SEEDS.slice(0, options.seedCount), milestones: MILESTONES.filter((day) => day <= options.days) }
}

function phase(level) {
  return level >= 3 ? 'critical' : level >= 2 ? 'rising' : 'low'
}

function livePopulation(state) {
  return state.npcs.filter((n) => n.isAlive).length + state.characters.filter((c) => c.isAlive).length
}

function player(state) {
  return state.characters.find((c) => c.id === state.activeCharacterId)
}

function countGuards(state) {
  const contracted = new Set(state.party.map((p) => p.npcId))
  return state.npcs.filter((n) => n.isAlive && n.job === 'guard' && n.age >= 15 && n.injuredUntil <= state.worldTime && !contracted.has(n.id)).length
}

function assertRegistry(state, context) {
  const ids = [...state.characters, ...state.npcs].map((c) => c.id)
  const active = state.characters.filter((c) => c.id === state.activeCharacterId)
  const npcIds = state.npcs.map((n) => n.id)
  assert.equal(new Set(ids).size, ids.length, `${context}: duplicate character/NPC id`)
  assert.equal(active.length, 1, `${context}: active character missing or duplicated`)
  assert.ok(!npcIds.includes(state.activeCharacterId), `${context}: active resident also remains in NPC table`)
  assert.ok(state.nextNpcId > 0 && Number.isSafeInteger(state.nextNpcId), `${context}: invalid nextNpcId`)
  for (const npc of state.npcs) {
    const match = /^npc-([1-9]\d*)$/.exec(npc.id)
    if (match) assert.ok(Number(match[1]) < state.nextNpcId, `${context}: nextNpcId can collide with ${npc.id}`)
  }
  for (const contract of state.party) assert.ok(state.npcs.some((n) => n.id === contract.npcId && n.isAlive), `${context}: party references a missing/dead NPC`)
}

function roundTrip(state, label, context) {
  assertRegistry(state, `${context}/${label}/before-serialize`)
  const savedAt = state.worldTime + 123456
  const raw = context.save.serialize(state, savedAt)
  const restored = context.save.deserialize(raw)
  assert.equal(restored.lastSavedAt, savedAt, `${label}: lastSavedAt changed`)
  assert.deepStrictEqual(restored.state, state, `${label}: state changed across serialize/deserialize`)
  assertRegistry(restored.state, `${context}/${label}/after-deserialize`)
  return { passed: true, bytes: Buffer.byteLength(raw), sha256: sha256(raw), savedAt }
}

function perform(state, operation, dailyEvents) {
  const captured = engineRuntime.helpers.captureEvents(state, operation)
  dailyEvents.push(...captured.events)
  return captured.result
}

function trySuccessor(state, daily, context) {
  if (player(state).isAlive) return false
  const candidate = state.npcs.find((n) => n.isAlive && n.age >= 15)
  if (!candidate) return false
  const selected = perform(state, () => engineRuntime.sim.chooseSuccessor(state, candidate.id), daily.events)
  assert.equal(selected, true, `${context}: valid adult successor rejected`)
  daily.successions += 1
  return true
}

function recordKill(state, beforeThreat, daily, events, context) {
  const wins = events.filter((event) => event.type === 'combat.won')
  for (const event of wins) {
    const afterThreat = state.threat.monsterPopulation
    assert.equal(afterThreat, Math.max(0, beforeThreat - 5), `${context}: public world fight did not apply expected kill reduction`)
    daily.effectiveKills += 1
    daily.monsterPopulationRemoved += beforeThreat - afterThreat
    beforeThreat = afterThreat
  }
  return beforeThreat
}

function finishFight(state, daily, context, usePotionThreshold) {
  let turns = 0
  let threatBefore = state.threat.monsterPopulation
  while (state.combat && turns < 100) {
    const c = player(state)
    const command = c.inventory.potion > 0 && c.hp <= usePotionThreshold ? 'potion' : 'attack'
    const actionEvents = []
    const error = perform(state, () => engineRuntime.actions.combatTurn(state, command), actionEvents)
    assert.equal(error, '', `${context}: public combatTurn(${command}) rejected`)
    turns += 1
    daily.events.push(...actionEvents)
    threatBefore = recordKill(state, threatBefore, daily, actionEvents, context)
  }
  assert.ok(turns < 100, `${context}: public combat did not terminate within 100 finite turns`)
  if (turns > 0) daily.combatTurns += turns
  return turns
}

function goToForest(state, daily, context) {
  if (player(state).currentRegion === 'forest') return true
  const moved = perform(state, () => engineRuntime.sim.walkTo(state, { x: 5, y: 4 }), daily.events)
  assert.equal(moved, true, `${context}: could not reach public forest encounter location`)
  return true
}

function goHome(state, daily, context) {
  if (!player(state).isAlive || player(state).currentRegion === 'village') return
  const moved = perform(state, () => engineRuntime.sim.walkTo(state, { x: 7, y: 9 }), daily.events)
  assert.equal(moved, true, `${context}: could not return to village after activity`)
}

function attemptEncounter(state, daily, context, boss = false, potionThreshold = 45) {
  if (!player(state).isAlive || player(state).stamina < 8) return false
  if (!boss && state.threat.monsterPopulation < 1) return false
  goToForest(state, daily, context)
  const before = state.threat.monsterPopulation
  const error = perform(state, () => engineRuntime.actions.encounter(state, boss), daily.events)
  if (error) {
    if (error === '附近暫時沒有怪物。') return false
    if (error === '體力不足，請先休息。') return false
    if (error === '目前沒有哥布林酋長。') return false
    throw new Error(`${context}: public encounter rejected: ${error}`)
  }
  daily.encounters += 1
  const beforeKills = daily.effectiveKills
  // The event capture must wrap each combat turn, so it records combat.won as well as historic events.
  finishFight(state, daily, context, potionThreshold)
  if (daily.effectiveKills > beforeKills) {
    assert.equal(state.threat.monsterPopulation, Math.max(0, before - 5), `${context}: kill did not reduce the world threat population through combat`)
  }
  return daily.effectiveKills > beforeKills
}

function maybeRest(state, daily, context, threshold) {
  const c = player(state)
  if (!c.isAlive || (c.stamina >= threshold && c.hp >= 55)) return false
  goHome(state, daily, context)
  const result = perform(state, () => engineRuntime.actions.rest(state, 'rest'), daily.events)
  assert.equal(result, '', `${context}: public village rest rejected`)
  daily.rests += 1
  return true
}

function runStrategyAction(state, strategy, elapsedDay, daily, context) {
  trySuccessor(state, daily, context)
  if (!player(state).isAlive) return

  if (strategy === 'abandon') return

  if (strategy === 'clear') {
    // Aggressive policy: at most two public encounters per day; no equipment, direct threat edits, or automatic healing.
    maybeRest(state, daily, context, 8)
    if (!player(state).isAlive) return
    for (let attempt = 0; attempt < 2 && player(state).isAlive; attempt += 1) {
      if (player(state).stamina < 8) break
      const boss = state.threat.bossAlive
      const won = attemptEncounter(state, daily, `${context}/encounter-${attempt + 1}`, boss, 35)
      if (!won && !player(state).isAlive) {
        trySuccessor(state, daily, context)
        if (!player(state).isAlive) break
      }
      if (!state.threat.bossAlive && state.threat.monsterPopulation < 1) break
    }
    goHome(state, daily, context)
    maybeRest(state, daily, context, 8)
    trySuccessor(state, daily, context)
    return
  }

  // Reproducible ordinary schedule: one forest encounter each seven-day cycle, one wood gathering day,
  // and a town rest only when stamina or health calls for it. All other days are autonomous simulation.
  const cycleDay = (elapsedDay - 1) % 7
  if (cycleDay === 0) {
    if (player(state).stamina >= 8 && player(state).hp >= 25) {
      attemptEncounter(state, daily, `${context}/weekly-adventure`, state.threat.bossAlive, 50)
      goHome(state, daily, context)
      trySuccessor(state, daily, context)
    }
  } else if (cycleDay === 3) {
    if (player(state).stamina >= 10) {
      goToForest(state, daily, context)
      const result = perform(state, () => engineRuntime.actions.gather(state, 'wood'), daily.events)
      if (!result) daily.workActions += 1
      else if (result !== '體力不足，請先回聚落休息。' && result !== '資源暫時耗盡，隔日會恢復。') throw new Error(`${context}: public gather rejected: ${result}`)
      goHome(state, daily, context)
    }
  } else if (cycleDay === 5) {
    maybeRest(state, daily, context, 35)
  }
}

function createDailyCounters() {
  return {
    effectiveKills: 0,
    monsterPopulationRemoved: 0,
    encounters: 0,
    combatTurns: 0,
    rests: 0,
    workActions: 0,
    successions: 0,
    events: [],
  }
}

function countEvents(events, type) {
  return events.filter((event) => event.type === type).length
}

function dailySample(state, strategy, seed, elapsedDay, daily, before, context, engine) {
  assertRegistry(state, `${context}/day-${elapsedDay}`)
  const active = player(state)
  const deaths = daily.events.filter((event) => event.type === 'npc.died')
  const damages = daily.events.filter((event) => event.type === 'npc.injured')
  const destructionEvents = daily.events.filter((event) => /destroy|damage|破壞|損壞/i.test(event.type))
  const guards = countGuards(state)
  return {
    strategy,
    seed,
    elapsedDay,
    worldTime: state.worldTime,
    gameDate: engine.helpers.calendar(state.worldTime),
    effectiveKills: daily.effectiveKills,
    monsterPopulationRemoved: daily.monsterPopulationRemoved,
    encounters: daily.encounters,
    combatTurns: daily.combatTurns,
    restActions: daily.rests,
    workActions: daily.workActions,
    warnings: countEvents(daily.events, 'boss.warning'),
    bossSpawned: countEvents(daily.events, 'boss.spawned'),
    bossDefeated: countEvents(daily.events, 'boss.defeated'),
    bossAlive: state.threat.bossAlive,
    threat: {
      monsterPopulation: Number(state.threat.monsterPopulation.toFixed(3)),
      level: state.threat.threatLevel,
      phase: phase(state.threat.threatLevel),
      bossProgress: Number(state.threat.bossProgress.toFixed(3)),
      warningLevel: state.threat.warningLevel,
    },
    population: livePopulation(state),
    capacity: state.settlement.capacity,
    settlementStage: state.settlement.stage,
    overCapacity: livePopulation(state) > state.settlement.capacity,
    guards,
    safety: Number(state.settlement.safety.toFixed(3)),
    safetyDelta: Number((state.settlement.safety - before.safety).toFixed(3)),
    settlementProsperity: Number(state.settlement.prosperity.toFixed(3)),
    prosperityDelta: Number((state.settlement.prosperity - before.prosperity).toFixed(3)),
    food: Number(state.settlement.food.toFixed(3)),
    infrastructure: Number(state.settlement.infrastructure.toFixed(3)),
    infrastructureDelta: Number((state.settlement.infrastructure - before.infrastructure).toFixed(3)),
    activeCharacterId: active.id,
    activeCharacterAlive: active.isAlive,
    activeCharacterHp: active.hp,
    activeCharacterStamina: active.stamina,
    activeCharacterGold: active.gold,
    activeCharacterGoldDelta: before.activeCharacterId === active.id ? active.gold - before.activeCharacterGold : null,
    playerDeaths: deaths.filter((event) => event.category === 'player').length,
    npcDeaths: deaths.filter((event) => event.category === 'npc').length,
    deaths: deaths.length,
    naturalDeaths: deaths.filter((event) => event.message.includes('自然老化')).length,
    battleDeaths: deaths.filter((event) => event.message.includes('戰鬥傷勢')).length,
    injuries: damages.length,
    destructionEvents: destructionEvents.length,
    successionThisDay: daily.successions,
    populationArrivals: countEvents(daily.events, 'npc.immigrated') + countEvents(daily.events, 'npc.born'),
    stageChanges: countEvents(daily.events, 'settlement.grew'),
    historyLength: state.history.length,
    eventRingLength: state.events.length,
  }
}

function dailyBefore(state) {
  const c = player(state)
  return {
    safety: state.settlement.safety,
    prosperity: state.settlement.prosperity,
    infrastructure: state.settlement.infrastructure,
    activeCharacterId: c.id,
    activeCharacterGold: c.gold,
  }
}

function summaryAt(state, dailySeries, strategy, seed, roundTripResult) {
  const latest = dailySeries.at(-1)
  const warnings = dailySeries.reduce((n, row) => n + row.warnings, 0)
  const spawned = dailySeries.reduce((n, row) => n + row.bossSpawned, 0)
  const defeated = dailySeries.reduce((n, row) => n + row.bossDefeated, 0)
  const deaths = dailySeries.reduce((n, row) => n + row.deaths, 0)
  const playerDeaths = dailySeries.reduce((n, row) => n + row.playerDeaths, 0)
  const kills = dailySeries.reduce((n, row) => n + row.effectiveKills, 0)
  return {
    strategy,
    seed,
    elapsedDays: latest.elapsedDay,
    worldTime: state.worldTime,
    population: livePopulation(state),
    capacity: state.settlement.capacity,
    settlementStage: state.settlement.stage,
    guards: countGuards(state),
    safety: state.settlement.safety,
    prosperityProxy: state.settlement.prosperity,
    threat: { monsterPopulation: state.threat.monsterPopulation, level: state.threat.threatLevel, phase: phase(state.threat.threatLevel), bossProgress: state.threat.bossProgress, warningLevel: state.threat.warningLevel, bossAlive: state.threat.bossAlive },
    effectiveKills: kills,
    warnings,
    bossesSpawned: spawned,
    bossesDefeated: defeated,
    deaths,
    playerDeaths,
    successions: dailySeries.reduce((n, row) => n + row.successionThisDay, 0),
    roundTrip: roundTripResult,
    activeCharacterId: player(state).id,
    activeCharacterAlive: player(state).isAlive,
    historyLength: state.history.length,
    lastDay: latest,
  }
}

async function loadEngine() {
  const vite = await createServer({
    root: SOURCE_ROOT,
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
  })
  try {
    const [sim, actions, save, events, calendar, config] = await Promise.all([
      vite.ssrLoadModule('/src/engine/simulation.ts'),
      vite.ssrLoadModule('/src/engine/actions.ts'),
      vite.ssrLoadModule('/src/services/saveService.ts'),
      vite.ssrLoadModule('/src/engine/events.ts'),
      vite.ssrLoadModule('/src/engine/calendar.ts'),
      vite.ssrLoadModule('/src/data/config.ts'),
    ])
    return {
      vite,
      sim,
      actions,
      save,
      helpers: { captureEvents: events.captureEvents, calendar: calendar.calendar },
      config: config.CONFIG,
    }
  } catch (error) {
    await vite.close()
    throw error
  }
}

function runPopulationCases(engine, output) {
  const cases = []
  const state = engine.sim.createGame(73004)
  const templates = state.npcs.map((n) => structuredClone(n))
  assert.ok(templates.length > 0, 'initial world must provide an NPC fixture template')
  while (state.npcs.length < 1000) {
    const source = templates[(state.npcs.length - templates.length) % templates.length]
    const clone = structuredClone(source)
    const id = state.nextNpcId++
    clone.id = `npc-${id}`
    clone.name = `QA overcapacity resident ${id}`
    state.npcs.push(clone)
  }
  state.settlement.stage = 'hamlet'
  state.settlement.capacity = 40
  const beforeStress = {
    kind: 'controlled-fixture',
    source: 'createGame(73004) plus schema-shaped clones of its initial NPC rows; no in-game action creates these residents',
    legalAsSavedState: null,
    naturallyPlayerReachable: false,
    elapsedDays: 0,
    population: livePopulation(state),
    npcRows: state.npcs.length,
    capacity: state.settlement.capacity,
  }
  const roundTripAtStart = roundTrip(state, 'overcapacity-start', engine)
  beforeStress.legalAsSavedState = true
  beforeStress.roundTrip = roundTripAtStart
  cases.push(beforeStress)
  publish('population-cases.json', { sourceCommit: manifest.sourceCommit, cases })

  const boundary = Math.floor(state.worldTime / engine.config.minutesPerDay)
  const dailySamples = []
  for (let day = 1; day <= 30; day += 1) {
    const target = (boundary + day) * engine.config.minutesPerDay
    engine.sim.simulate(state, target - state.worldTime)
    const current = {
      day,
      worldTime: state.worldTime,
      population: livePopulation(state),
      capacity: state.settlement.capacity,
      settlementStage: state.settlement.stage,
      immigrants: state.history.filter((event) => event.type === 'npc.immigrated').length,
      births: state.history.filter((event) => event.type === 'npc.born').length,
      guards: countGuards(state),
      threatPopulation: state.threat.monsterPopulation,
      safety: state.settlement.safety,
      overCapacity: livePopulation(state) > state.settlement.capacity,
    }
    dailySamples.push(current)
    assertRegistry(state, `overcapacity-stress/day-${day}`)
  }
  const afterStressRoundTrip = roundTrip(state, 'overcapacity-day-30', engine)
  const afterStress = {
    kind: 'controlled-fixture',
    source: beforeStress.source,
    legalAsSavedState: true,
    naturallyPlayerReachable: false,
    elapsedDays: 30,
    population: livePopulation(state),
    npcRows: state.npcs.length,
    capacity: state.settlement.capacity,
    settlementStage: state.settlement.stage,
    arrivalsDuringFixture: state.history.filter((event) => event.type === 'npc.immigrated' || event.type === 'npc.born').length,
    remainedOverCapacity: livePopulation(state) > state.settlement.capacity,
    dailySamples,
    roundTrip: afterStressRoundTrip,
  }
  cases.push(afterStress)
  publish('population-cases.json', { sourceCommit: manifest.sourceCommit, cases })

  const overLimit = structuredClone(state)
  const extra = structuredClone(templates[0])
  const overLimitId = overLimit.nextNpcId++
  extra.id = `npc-${overLimitId}`
  extra.name = `QA validator-overlimit resident ${overLimitId}`
  overLimit.npcs.push(extra)
  let rejected = false
  let rejectionMessage = ''
  try {
    engine.save.deserialize(engine.save.serialize(overLimit, overLimit.worldTime))
  } catch (error) {
    rejected = true
    rejectionMessage = error.message
  }
  assert.equal(rejected, true, 'the validator should reject more than 1000 NPC rows; this is an expected invalid fixture')
  assert.ok(rejectionMessage.includes('存檔資料不完整'), `unexpected over-limit rejection message: ${rejectionMessage}`)
  cases.push({
    kind: 'invalid-fixture-expected-rejection',
    source: 'valid 1000-NPC-row controlled fixture plus one extra schema-shaped NPC',
    naturallyPlayerReachable: false,
    npcRows: overLimit.npcs.length,
    population: livePopulation(overLimit),
    validator: 'rejected as expected because NPC rows exceed saveService valid() limit of 1000',
    rejectionMessage,
    classifiedAsBug: false,
  })
  publish('population-cases.json', { sourceCommit: manifest.sourceCommit, cases })

  const zero = engine.sim.createGame(73005)
  for (const character of [...zero.characters, ...zero.npcs]) engine.sim.die(zero, character, 'controlled zero-population fixture')
  assert.equal(livePopulation(zero), 0)
  const zeroRoundTrip = roundTrip(zero, 'zero-population-at-setup', engine)
  const zeroStart = {
    kind: 'controlled-fixture',
    source: 'createGame(73005) followed by exported die() on every current resident; no direct population counter edit',
    naturallyPlayerReachable: false,
    legalAsSavedState: true,
    population: livePopulation(zero),
    activeCharacterAlive: player(zero).isAlive,
    activeCharacterId: player(zero).id,
    eligibleHeirs: zero.npcs.filter((n) => n.isAlive && n.age >= 15).length,
    roundTrip: zeroRoundTrip,
  }
  cases.push(zeroStart)
  publish('population-cases.json', { sourceCommit: manifest.sourceCommit, cases })

  const staleId = zero.npcs[0]?.id ?? 'npc-1'
  const rejectedEarlySuccessor = engine.sim.chooseSuccessor(zero, staleId)
  assert.equal(rejectedEarlySuccessor, false, 'successor selection must reject when there is no alive adult candidate')
  const startDay = Math.floor(zero.worldTime / engine.config.minutesPerDay)
  const noCandidateTarget = (startDay + 14) * engine.config.minutesPerDay
  engine.sim.simulate(zero, noCandidateTarget - zero.worldTime)
  assert.equal(livePopulation(zero), 0, 'zero population should remain zero before first scheduled immigration')
  assert.equal(zero.npcs.length, 0, 'dead NPC rows should be culled by daily evolution')
  const zeroAtDay14RoundTrip = roundTrip(zero, 'zero-population-day-14', engine)
  const day14 = {
    kind: 'controlled-fixture-checkpoint',
    elapsedDays: 14,
    population: livePopulation(zero),
    npcRows: zero.npcs.length,
    eligibleHeirs: zero.npcs.filter((n) => n.isAlive && n.age >= 15).length,
    noCandidateSuccessorRejected: !rejectedEarlySuccessor,
    roundTrip: zeroAtDay14RoundTrip,
  }
  cases.push(day14)
  publish('population-cases.json', { sourceCommit: manifest.sourceCommit, cases })

  const immigrationTarget = (startDay + 15) * engine.config.minutesPerDay
  engine.sim.simulate(zero, immigrationTarget - zero.worldTime)
  const heirs = zero.npcs.filter((n) => n.isAlive && n.age >= 15)
  assert.ok(heirs.length > 0, 'scheduled day-15 immigration should restore an adult successor candidate with baseline food/prosperity')
  const candidateId = heirs[0].id
  const successionEvents = []
  const selected = perform(zero, () => engine.sim.chooseSuccessor(zero, candidateId), successionEvents)
  assert.equal(selected, true, 'legitimate adult immigrant succession rejected')
  assert.equal(zero.activeCharacterId, candidateId)
  assert.ok(!zero.npcs.some((n) => n.id === candidateId), 'inherited resident must be removed from the NPC table')
  assertRegistry(zero, 'zero-population/after-successor')
  const day15RoundTrip = roundTrip(zero, 'zero-population-day-15-after-successor', engine)
  const day15 = {
    kind: 'controlled-fixture-checkpoint',
    elapsedDays: 15,
    population: livePopulation(zero),
    npcRows: zero.npcs.length,
    immigrantEvents: zero.history.filter((event) => event.type === 'npc.immigrated').length,
    birthEvents: zero.history.filter((event) => event.type === 'npc.born').length,
    selectedSuccessor: candidateId,
    selected: true,
    activeCharacterId: zero.activeCharacterId,
    activeCharacterAlive: player(zero).isAlive,
    roundTrip: day15RoundTrip,
  }
  cases.push(day15)
  publish('population-cases.json', { sourceCommit: manifest.sourceCommit, cases })

  const day30Target = (startDay + 30) * engine.config.minutesPerDay
  engine.sim.simulate(zero, day30Target - zero.worldTime)
  const day30 = {
    kind: 'controlled-fixture-checkpoint',
    elapsedDays: 30,
    population: livePopulation(zero),
    capacity: zero.settlement.capacity,
    immigrantEvents: zero.history.filter((event) => event.type === 'npc.immigrated').length,
    birthEvents: zero.history.filter((event) => event.type === 'npc.born').length,
    activeCharacterId: zero.activeCharacterId,
    roundTrip: roundTrip(zero, 'zero-population-day-30-natural-recovery', engine),
  }
  assert.ok(day30.population >= day15.population, 'population should not lose the recovered successor in this 30-day fixture')
  cases.push(day30)
  publish('population-cases.json', { sourceCommit: manifest.sourceCommit, cases })
  return cases
}

async function run() {
  const options = parseArgs(process.argv.slice(2))
  reportState.options = options
  reportState.phase = 'source-fingerprint'
  const source = sourceFingerprint()
  const harnessHash = sha256(readFileSync(fileURLToPath(import.meta.url)))
  reportState.sourceFiles = source.files
  reportState.harnessSha256 = harnessHash

  const engine = await loadEngine()
  engineRuntime = engine
  const checkpointRecords = []
  const completedRuns = []
  const allSeries = []
  const result = {
    schemaVersion: 1,
    runId: `world-${Date.now()}-${process.pid}`,
    startedAt: reportState.startedAt,
    sourceCommit: source.sourceCommit,
    sourceRoot: source.root,
    sourceHashes: source.files,
    baselineManifest: 'reports/playtests/20261004-deep-qa/baseline/manifest.json',
    baselineManifestSha256: sha256(readFileSync(MANIFEST_PATH)),
    harnessSha256: harnessHash,
    method: {
      engineLoading: 'Vite SSR from the frozen source snapshot, with middleware mode and no listen(); the 5191 browser build was not needed for pure engine simulation.',
      elapsedTime: 'Each iteration calls public simulate() to a real game-day boundary; no worldTime/timer injection.',
      strategies: {
        abandon: 'No player actions for up to 1440 days; only autonomous simulate() runs.',
        clear: 'At most two public forest encounters/day; every win must be emitted by combatTurn() and reduce threat.monsterPopulation by max(0, 5). Uses a public village rest when HP <55 or stamina <8 and a public potion turn when HP <=35; no equipment, hired party, or threat edits.',
        normal: 'One encounter every seven in-game days; one wood gathering day every seven-day cycle; recovery rest when HP <55 or stamina <35, and a public potion turn at HP <=50; no equipment, hired party, or threat edits.',
      },
      seededRuns: options.seeds,
      checkpoints: options.milestones,
      maximumDays: MAX_DAYS,
      registryAndPersistence: 'Active character must occur exactly once in characters and never in npcs; combined ids unique; party ids valid; every milestone passes serialize()/deserialize() exact state comparison.',
    },
    constraints: {
      income: 'There is no numerical settlement income field in this engine; record active-character gold and settlement prosperity as the available economic proxy.',
      destruction: 'The engine has no tile/building destruction state or event. Injury, death, infrastructure change, and explicit destruction/damage event count are recorded.',
      overcapacity: 'Admin-created schema-valid stress fixture, never claimed as naturally player-reachable.',
      zeroPopulation: 'Fixture created by exported die() for every resident; no population counter was edited.',
      invalidInput: 'Validator-rejected over-limit fixture is recorded as expected rejection, not a game bug.',
    },
    checkpoints: [],
    completedRuns: [],
    populationCases: [],
    errors: [],
  }

  try {
    for (const strategy of options.strategies) {
      for (const seed of options.seeds) {
        reportState.phase = 'strategy-run'
        activeState = { strategy, seed, elapsedDay: 0 }
        const state = engine.sim.createGame(seed)
        activeWorldState = state
        const dailySeries = []
        const startDay = Math.floor(state.worldTime / engine.config.minutesPerDay)
        for (let elapsedDay = 1; elapsedDay <= options.days; elapsedDay += 1) {
          activeState = { strategy, seed, elapsedDay }
          assertRegistry(state, `${strategy}/seed-${seed}/start-day-${elapsedDay}`)
          const daily = createDailyCounters()
          const before = dailyBefore(state)
          const context = `${strategy}/seed-${seed}/day-${elapsedDay}`
          runStrategyAction(state, strategy, elapsedDay, daily, context)
          const targetTime = (startDay + elapsedDay) * engine.config.minutesPerDay
          assert.ok(state.worldTime <= targetTime, `${context}: player schedule crossed the next daily boundary`)
          const tickEvents = []
          const delta = targetTime - state.worldTime
          const tickCaptured = engine.helpers.captureEvents(state, () => engine.sim.simulate(state, delta))
          tickEvents.push(...tickCaptured.events)
          daily.events.push(...tickEvents)
          assert.equal(state.worldTime, targetTime, `${context}: world did not reach the planned game-day checkpoint`)
          trySuccessor(state, daily, context)
          const row = dailySample(state, strategy, seed, elapsedDay, daily, before, context, engine)
          dailySeries.push(row)

          if (options.milestones.includes(elapsedDay)) {
            reportState.phase = 'serialize-deserialize-checkpoint'
            const rt = roundTrip(state, `day-${elapsedDay}`, engine)
            const checkpoint = {
              runId: result.runId,
              sourceCommit: source.sourceCommit,
              sourceHashes: source.files,
              harnessSha256: harnessHash,
              strategy,
              seed,
              elapsedDay,
              snapshot: summaryAt(state, dailySeries, strategy, seed, rt),
            }
            checkpointRecords.push(checkpoint)
            result.checkpoints = checkpointRecords
            publish('checkpoints.json', result.checkpoints)
          }
        }

        const runSummary = {
          strategy,
          seed,
          days: options.days,
          dailyRows: dailySeries.length,
          initial: dailySeries[0],
          final: dailySeries.at(-1),
          maximumPopulation: Math.max(...dailySeries.map((row) => row.population)),
          maximumThreatPopulation: Math.max(...dailySeries.map((row) => row.threat.monsterPopulation)),
          maximumThreatLevel: Math.max(...dailySeries.map((row) => row.threat.level)),
          totalEffectiveKills: dailySeries.reduce((n, row) => n + row.effectiveKills, 0),
          totalEncounters: dailySeries.reduce((n, row) => n + row.encounters, 0),
          totalCombatTurns: dailySeries.reduce((n, row) => n + row.combatTurns, 0),
          totalRestActions: dailySeries.reduce((n, row) => n + row.restActions, 0),
          totalWorkActions: dailySeries.reduce((n, row) => n + row.workActions, 0),
          totalInjuries: dailySeries.reduce((n, row) => n + row.injuries, 0),
          totalWarnings: dailySeries.reduce((n, row) => n + row.warnings, 0),
          totalBossesSpawned: dailySeries.reduce((n, row) => n + row.bossSpawned, 0),
          totalBossesDefeated: dailySeries.reduce((n, row) => n + row.bossDefeated, 0),
          totalPlayerDeaths: dailySeries.reduce((n, row) => n + row.playerDeaths, 0),
          totalNpcDeaths: dailySeries.reduce((n, row) => n + row.npcDeaths, 0),
          totalSuccessions: dailySeries.reduce((n, row) => n + row.successionThisDay, 0),
          overCapacityDays: dailySeries.filter((row) => row.overCapacity).length,
          endRoundTrip: roundTrip(state, `final-day-${options.days}`, engine),
          summary: summaryAt(state, dailySeries, strategy, seed, null),
        }
        completedRuns.push(runSummary)
        allSeries.push({ strategy, seed, daily: dailySeries })
        result.completedRuns = completedRuns
        publish('daily-series.json', {
          runId: result.runId,
          sourceCommit: source.sourceCommit,
          sourceHashes: source.files,
          harnessSha256: harnessHash,
          constraints: result.constraints,
          completedRuns: completedRuns.map(({ ...run }) => run),
          series: allSeries,
        })
      }
    }

    reportState.phase = 'population-fixtures'
    result.populationCases = runPopulationCases(engine, result)
    result.finishedAt = new Date().toISOString()
    result.elapsedMs = Date.parse(result.finishedAt) - Date.parse(result.startedAt)
    result.checkpoints = checkpointRecords
    result.completedRuns = completedRuns
    result.configuration = options
    result.environment = {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      viteVersion: JSON.parse(readFileSync(join(SOURCE_ROOT, 'node_modules/vite/package.json'), 'utf8')).version,
      browserUsed: false,
      productionUrlUsed: false,
    }
    result.populationCaseCounts = {
      overcapacityValid: result.populationCases.filter((item) => item.kind === 'controlled-fixture').length,
      expectedValidatorReject: result.populationCases.filter((item) => item.kind === 'invalid-fixture-expected-rejection').length,
      zeroPopulationStages: result.populationCases.filter((item) => item.kind.includes('zero') || item.kind.includes('controlled-fixture-checkpoint')).length,
    }
    publish('results.json', result)
    console.log(JSON.stringify({ runId: result.runId, finishedAt: result.finishedAt, runs: completedRuns.length, dailyRows: completedRuns.reduce((n, run) => n + run.dailyRows, 0), checkpoints: checkpointRecords.length, populationCases: result.populationCases.length, result: join(WORLD_DIR, 'results.json') }, null, 2))
  } finally {
    await engine.vite.close()
    activeState = null
    activeWorldState = null
  }
}

run().catch((error) => {
  const failure = {
    ...reportState,
    activeState,
    failedAt: new Date().toISOString(),
    error: error?.stack ?? String(error),
    stateSummary: activeWorldState ? {
      worldTime: activeWorldState.worldTime,
      population: livePopulation(activeWorldState),
      activeCharacterId: activeWorldState.activeCharacterId,
      activeCharacterAlive: player(activeWorldState).isAlive,
      nextNpcId: activeWorldState.nextNpcId,
    } : undefined,
  }
  try {
    publish('failure.json', failure)
  } catch (publishError) {
    console.error(`Could not archive failure checkpoint: ${publishError.message}`)
  }
  console.error(JSON.stringify(failure, null, 2))
  process.exitCode = 1
})
