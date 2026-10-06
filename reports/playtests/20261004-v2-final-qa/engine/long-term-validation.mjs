import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { createServer } from 'vite'

const repo = '/workspace/plw-rpg'
const base = resolve(repo, 'reports/playtests/20261004-v2-final-qa/engine')
const longOut = resolve(base, 'long-term-results.json')
const npcOut = resolve(base, 'featured-npc-lifecycle.json')
const sourceFiles = [
  'src/engine/actions.ts', 'src/engine/calendar.ts', 'src/engine/events.ts', 'src/engine/identity.ts',
  'src/engine/lifeState.ts', 'src/engine/livingEvents.ts', 'src/engine/npcLife.ts', 'src/engine/ownership.ts',
  'src/engine/random.ts', 'src/engine/simulation.ts', 'src/services/saveService.ts', 'src/domain/types.ts',
  'src/domain/life.ts', 'src/data/config.ts', 'src/data/identity.ts', 'src/data/livingEvents.ts',
  'src/data/npcLife.ts', 'src/data/ownership.ts',
]
const sourceSha256 = Object.fromEntries(sourceFiles.map(file => [
  file, createHash('sha256').update(readFileSync(resolve(repo, file))).digest('hex'),
]))
const runnerSha256 = createHash('sha256').update(readFileSync(resolve(base, 'long-term-validation.mjs'))).digest('hex')
const yearMinutes = 120 * 1440
const dayMinutes = 1440
const metadata = {
  sourceCommit: execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceSha256,
  runnerSha256,
  executedAt: new Date().toISOString(),
  method: '3 normal V2 seeds; 10/50/100 game-year checkpoints; yearly single-call run compared exactly with a daily-call run which serializes and reloads at every year; the active character is succeeded only through chooseSuccessor after natural death.',
  seedRuns: [],
  batching: null,
  status: 'RUNNING',
  preservedHarnessFailures: [
    { attempt: "boss evidence snapshot", scope: "QA instrumentation only", failure: "10/50-year boss counters were sampled at the checkpoint, but arrays were retained by reference and later contained 100-year events.", correction: "Copy event arrays per checkpoint; previous projections preserved in playlog; rerun full 3-seed matrix, no app source modification." },
    {
      attempt: 1,
      at: '2026-10-05T00:17:41.515Z',
      scope: 'long-term runner harness; no product source was exercised to completion',
      failure: 'At the first 10-year checkpoint, summarize() referenced serialize outside the function scope and stopped with ReferenceError: serialize is not defined.',
      artifactWriterFailure: 'The QA writer CLI reads report content from stdin. The first attempt supplied only the output path, so the writer recorded and projected an empty 0-byte artifact. The zero-byte playlog version is retained as the original failed artifact attempt.',
      corrected: 'serialize is now passed into summarize; the report writer receives the exact just-written bytes on stdin. This result is re-executed from fresh normal seeds.',
    },
    {
      attempt: 2,
      at: '2026-10-05T00:20:48.527Z',
      scope: 'long-term runner harness; seed 17 before the first checkpoint was emitted',
      failure: 'The 10-year summarize() helper referenced player outside the helper scope and stopped with ReferenceError: player is not defined.',
      artifactWriter: 'The report body was correctly supplied on stdin and the complete failing report (including stack and active run) is preserved in playlog.jsonl.',
      correction: 'player is now passed into summarize; the year number is written to activeRun before each yearly step.',
    },
    {
      attempt: 3,
      at: '2026-10-05T00:21:50.034Z',
      scope: 'first complete long-term report, measurement fields only',
      failure: 'The first completed report passed all state assertions but labeled performance.now() minus an elapsed duration as annualSimMs. That value is not a valid elapsed measurement.',
      evidence: 'Original complete report version is preserved in playlog.jsonl. Its test status is PASS, but every annualSimMs field is withdrawn from performance interpretation.',
      correction: 'The rerun records direct per-year elapsed durations and accumulated yearly/daily runner time from monotonic start marks.',
    },
  ],
}
const npcTracking = {
  sourceCommit: metadata.sourceCommit,
  sourceSha256,
  executedAt: metadata.executedAt,
  scope: 'First six Featured NPCs in each seed; no state injection. Hourly stepping during game year 1 observes schedule movement; daily stepping and public simulation thereafter track years, skill-level changes, career/job changes, memories, injury/recovery, and death.',
  measurementCorrection: {
    previousArtifactId: 'b80c3b46-3aa2-42e5-836b-b29a89dc38c2',
    reason: 'The prior tracker used String.includes(name), so a short featured name such as "米拉 1" matched messages naming "米拉 11" or "米拉 101". Its death totals (8/9/9) and any affected injury evidence are withdrawn as invalid QA counts, not game findings.',
    correctedRule: 'Match death messages only when they start with the exact full name plus " 因"; match injury messages only when they start with the exact full name plus " 在".',
  },
  seeds: [],
}
const bossEvidenceDefinitionSource = '/src/data/livingEvents.ts'
const server = await createServer({
  configFile: false,
  root: repo,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

let activeRun = null
function publish(path, body) {
  execFileSync('python3', ['scripts/recorded_reports.py', 'publish', path], {
    cwd: repo, input: body, stdio: ['pipe', 'inherit', 'inherit'],
  })
}
function saveProgress() {
  publish(longOut, `${JSON.stringify(metadata, null, 2)}\n`)
  publish(npcOut, `${JSON.stringify(npcTracking, null, 2)}\n`)
}
function findSuccessor(state) {
  return state.npcs.filter(npc => npc.isAlive && npc.age >= 15)
    .sort((a, b) => a.age - b.age || a.id.localeCompare(b.id))[0]
}
function stateIds(state) {
  return [...state.characters, ...state.npcs].map(actor => actor.id)
}
function assertFinite(value, path = '$') {
  if (typeof value === 'number') assert(Number.isFinite(value), `${path} is not finite: ${value}`)
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) assertFinite(item, `${path}.${key}`)
  }
}
function assertBounds(state) {
  const ids = stateIds(state)
  assert.equal(new Set(ids).size, ids.length, 'duplicate living entity IDs')
  assert(state.history.length <= 20000)
  assert(state.events.length <= 150)
  assert(state.life.news.length <= 60)
  assert(state.life.arcs.length <= 12)
  assert(state.life.requests.length <= 12)
  assert(state.life.settlementMemories.length <= 100)
  assert(state.life.worldMemories.length <= 100)
  for (const life of Object.values(state.life.npcs)) {
    assert(life.memories.length <= 32)
    assert(life.milestones.length <= 32)
  }
  for (const life of Object.values(state.life.characters)) {
    assert(life.reputation >= -100 && life.reputation <= 100)
    assert(life.reputationHistory.length <= 64)
    assert(life.milestones.length <= 32)
  }
  assert(state.npcs.length + state.characters.filter(character => character.isAlive).length <= 80)
  assertFinite(state)
}

const plainSnapshot = (state, npcId) => {
  const actor = state.npcs.find(candidate => candidate.id === npcId)
    ?? state.characters.find(candidate => candidate.id === npcId)
  const life = state.life.npcs[npcId]
  if (!actor) return null
  return {
    id: npcId, name: actor.name, alive: actor.isAlive, age: actor.age, job: actor.job ?? life?.careerJob ?? null,
    career: life?.career ?? null, traits: life?.traits ?? [], skills: Object.fromEntries(Object.entries(actor.skills).map(([id, skill]) => [id, skill.level])),
    concern: life?.concern ?? null, memoryCount: life?.memories.length ?? 0,
    lastMemory: life?.memories.at(-1)?.kind ?? null, milestones: life?.milestones.length ?? 0,
    position: { ...actor.position }, currentRegion: actor.currentRegion, currentActivity: actor.currentActivity ?? actor.status,
    injuredUntil: actor.injuredUntil ?? 0,
  }
}
function recordNpcDelta(run, previous, current, beforeTime, afterTime, events) {
  if (!current) return
  if (!previous) {
    run.updates.push({ at: afterTime, id: current.id, type: 'reappeared-as-character', state: current })
    return
  }
  const id = current.id
  if (current.position.x !== previous.position.x || current.position.y !== previous.position.y) {
    run.movementCount++
    if (run.movementExamples.filter(event => event.id === id).length < 8) {
      run.movementExamples.push({ at: afterTime, id, from: previous.position, to: current.position, region: current.currentRegion, activity: current.currentActivity })
    }
  }
  if (current.age !== previous.age) run.updates.push({ at: afterTime, id, type: 'age', from: previous.age, to: current.age })
  for (const [skill, level] of Object.entries(current.skills)) {
    if (level !== previous.skills[skill]) {
      run.skillChangeCount++
      run.updates.push({ at: afterTime, id, type: 'skill-level', skill, from: previous.skills[skill], to: level })
    }
  }
  if (current.job !== previous.job || current.career !== previous.career) {
    run.careerChangeCount++
    if (current.career === 'retired' && previous.career !== 'retired') run.retirementCount++
    run.updates.push({ at: afterTime, id, type: 'career-or-job', from: { job: previous.job, career: previous.career }, to: { job: current.job, career: current.career } })
  }
  if (current.memoryCount !== previous.memoryCount || current.lastMemory !== previous.lastMemory) {
    run.updates.push({ at: afterTime, id, type: 'memory', count: current.memoryCount, latestKind: current.lastMemory })
  }
  if (previous.injuredUntil <= beforeTime && current.injuredUntil > afterTime) {
    run.injuryCount++
    run.updates.push({ at: afterTime, id, type: 'injured', injuredUntil: current.injuredUntil,
      evidence: events.filter(event => event.type === 'npc.injured' && event.message.startsWith(`${current.name} 在`)).map(event => event.message) })
  }
  if (previous.injuredUntil > beforeTime && current.injuredUntil <= afterTime) {
    run.recoveryCount++
    run.updates.push({ at: afterTime, id, type: 'recovered', priorInjuredUntil: previous.injuredUntil })
  }
  for (const event of events) {
    if (event.type === 'npc.died' && event.category === 'npc' && event.message.startsWith(`${current.name} 因`)) {
      run.deathCount++
      run.updates.push({ at: event.at, id, type: 'died', message: event.message })
    }
  }
}
function featuredTracker(state, seed) {
  const initialNpcs = state.npcs.filter(npc => state.life.npcs[npc.id]?.featured).slice(0, 6)
  assert.equal(initialNpcs.length, 6)
  return {
    seed,
    initial: initialNpcs.map(npc => plainSnapshot(state, npc.id)),
    ids: initialNpcs.map(npc => npc.id),
    previous: new Map(initialNpcs.map(npc => [npc.id, plainSnapshot(state, npc.id)])),
    updates: [], movementCount: 0, movementExamples: [], skillChangeCount: 0, careerChangeCount: 0,
    retirementCount: 0, injuryCount: 0, recoveryCount: 0, deathCount: 0,
    checkpoints: [],
  }
}
function newArcTracker() {
  return {
    seen: new Set(), completed: new Set(),
    startedByKind: { road: 0, food: 0, iron: 0 },
    completedByKindOutcome: {},
  }
}
function observeArcs(tracker, state) {
  for (const arc of state.life.arcs) {
    if (!tracker.seen.has(arc.id)) {
      tracker.seen.add(arc.id)
      tracker.startedByKind[arc.kind]++
    }
    if (arc.resolved && !tracker.completed.has(arc.id)) {
      tracker.completed.add(arc.id)
      const key = `${arc.kind}:${arc.outcome}`
      tracker.completedByKindOutcome[key] = (tracker.completedByKindOutcome[key] ?? 0) + 1
    }
  }
}
function arcTrackerSnapshot(tracker) {
  return {
    naturalTriggerCounts: { ...tracker.startedByKind },
    naturalOutcomeCounts: { ...tracker.completedByKindOutcome },
  }
}
function newBossEvidenceTracker(definition) {
  return {
    seenEventIds: new Set(),
    bossSpawned: [],
    attempts: [],
    successMessage: definition.success,
    failureMessage: definition.failure,
  }
}
function observeBossEvidence(tracker, events) {
  for (const event of events) {
    if (tracker.seenEventIds.has(event.id)) continue
    tracker.seenEventIds.add(event.id)
    if (event.type === 'boss.spawned') {
      tracker.bossSpawned.push({ id: event.id, at: event.at, message: event.message })
      continue
    }
    if (event.message === tracker.successMessage) {
      tracker.attempts.push({ id: event.id, at: event.at, outcome: 'success', message: event.message })
    } else if (event.message === tracker.failureMessage) {
      tracker.attempts.push({ id: event.id, at: event.at, outcome: 'failure', message: event.message })
    }
  }
}
function bossEvidenceSnapshot(tracker) {
  const successes = tracker.attempts.filter(event => event.outcome === 'success').length
  const failures = tracker.attempts.filter(event => event.outcome === 'failure').length
  const attempts = successes + failures
  return {
    detection: 'Each captured WorldEvent ID is counted once. Attempt outcome uses exact equality to MEDIUM_LIVING_EVENTS success/failure message; boss spawn uses event.type === boss.spawned.',
    bossSpawnedCount: tracker.bossSpawned.length,
    attemptSuccessCount: successes,
    attemptFailureCount: failures,
    attemptCount: attempts,
    observedSuccessRate: attempts ? successes / attempts : null,
    sampleInterpretation: attempts ? 'Observed from this seed’s emitted attempts only; not an estimate of the configured chance.' : 'No independent boss attempt was observed in this seed; no empirical rate is reported.',
    bossSpawnedEvents: tracker.bossSpawned.map(event => ({ ...event })),
    attempts: tracker.attempts.map(event => ({ ...event })),
  }
}
function observeStep(run, state, beforeTime, afterTime, events) {
  for (const id of run.ids) {
    const previous = run.previous.get(id)
    const current = plainSnapshot(state, id)
    if (current) recordNpcDelta(run, previous, current, beforeTime, afterTime, events)
    if (current) run.previous.set(id, current)
    else if (previous?.alive) {
      const death = events.find(event => event.type === 'npc.died' && event.category === 'npc' && event.message.startsWith(`${previous.name} 因`))
      if (death) {
        run.deathCount++
        run.updates.push({ at: death.at, id, type: 'died', message: death.message })
      }
      run.previous.set(id, { ...previous, alive: false })
    }
  }
}
function summarize(state, year, cumulativeEvents, batchElapsedMs, dailyElapsedMs, elapsedMs, batchElapsedTotalMs,
  dailyElapsedTotalMs, saveLatencies, reloads, successorCount, serialize, player) {
  const lifeCareers = Object.values(state.life.npcs).reduce((counts, npc) => {
    counts[npc.career] = (counts[npc.career] ?? 0) + 1
    return counts
  }, {})
  const jobCounts = state.npcs.reduce((counts, npc) => {
    counts[npc.job] = (counts[npc.job] ?? 0) + 1
    return counts
  }, {})
  const eventCounts = cumulativeEvents.reduce((counts, event) => {
    counts[event.type] = (counts[event.type] ?? 0) + 1
    return counts
  }, {})
  const serialized = serialize(state, 0)
  return {
    gameYear: year,
    worldTime: state.worldTime,
    population: state.npcs.filter(npc => npc.isAlive).length + state.characters.filter(character => character.isAlive).length,
    livingNpcCount: state.npcs.filter(npc => npc.isAlive).length,
    deadCharacterCount: state.characters.filter(character => !character.isAlive).length,
    retainedFeaturedNpcMetadata: Object.values(state.life.npcs).filter(npc => npc.featured).length,
    careerMetadataCounts: lifeCareers,
    activeNpcJobCounts: jobCounts,
    settlement: { ...state.settlement },
    activeCharacter: {
      id: state.activeCharacterId, alive: player(state).isAlive, age: player(state).age,
      gold: player(state).gold, inventory: { ...player(state).inventory },
      life: structuredClone(state.life.characters[state.activeCharacterId]),
    },
    worldMemories: state.life.worldMemories.length,
    settlementMemories: state.life.settlementMemories.length,
    properties: state.life.properties.length,
    reputationRecords: Object.values(state.life.characters).reduce((sum, life) => sum + life.reputationHistory.length, 0),
    identityCounts: Object.values(state.life.characters).flatMap(life => life.identities).reduce((counts, identity) => {
      counts[identity] = (counts[identity] ?? 0) + 1
      return counts
    }, {}),
    threat: { ...state.threat },
    dungeon: { ...state.dungeon },
    arcSummary: state.life.arcs.reduce((summary, arc) => {
      summary[`${arc.kind}:${arc.outcome}:${arc.stage}`] = (summary[`${arc.kind}:${arc.outcome}:${arc.stage}`] ?? 0) + 1
      return summary
    }, {}),
    eventsCount: cumulativeEvents.length,
    eventTypes: eventCounts,
    eventList: state.events.length,
    historySize: state.history.length,
    newsSize: state.life.news.length,
    arcSize: state.life.arcs.length,
    requestSize: state.life.requests.length,
    npcLifeSize: Object.keys(state.life.npcs).length,
    saveBytes: Buffer.byteLength(serialized),
    saveLatencyP95Ms: [...saveLatencies].sort((a, b) => a - b)[Math.floor((saveLatencies.length - 1) * .95)] ?? 0,
    lastYearBatchMs: batchElapsedMs,
    lastYearDailyMs: dailyElapsedMs,
    elapsedSinceSeedStartMs: elapsedMs,
    cumulativeBatchSimMs: batchElapsedTotalMs,
    cumulativeDailySimMs: dailyElapsedTotalMs,
    reloads,
    successorCount,
    stateSha256: createHash('sha256').update(JSON.stringify(state)).digest('hex'),
  }
}

try {
  const { createGame, chooseSuccessor, player, simulate } = await server.ssrLoadModule('/src/engine/simulation.ts')
  const { serialize, deserialize } = await server.ssrLoadModule('/src/services/saveService.ts')
  const { captureEvents } = await server.ssrLoadModule('/src/engine/events.ts')
  const { MEDIUM_LIVING_EVENTS } = await server.ssrLoadModule(bossEvidenceDefinitionSource)
  const seeds = [17, 909, 2026]

  // Small but real canonical stepping matrix complements the 10/50/100-year multi-seed checks.
  const totalMinutes = 3 * 1440
  const steppingStates = []
  for (const step of [1, 60, 1440, totalMinutes]) {
    const state = createGame(2026)
    for (let elapsed = 0; elapsed < totalMinutes; elapsed += step) simulate(state, Math.min(step, totalMinutes - elapsed))
    steppingStates.push({ stepMinutes: step, state, digest: createHash('sha256').update(JSON.stringify(state)).digest('hex') })
  }
  for (const run of steppingStates.slice(1)) assert.deepEqual(run.state, steppingStates[0].state, `3-day batch ${run.stepMinutes} minutes`)
  metadata.batching = steppingStates.map(({ stepMinutes, digest }) => ({ stepMinutes, stateSha256: digest, exactlyEqual: true }))

  for (const seed of seeds) {
    const batchState = createGame(seed)
    const dailyStateInitial = createGame(seed)
    assert.deepEqual(dailyStateInitial, batchState)
    const npcTrack = featuredTracker(dailyStateInitial, seed)
    const arcTrack = newArcTracker()
    const bossTrack = newBossEvidenceTracker(MEDIUM_LIVING_EVENTS.independent_boss_attempt)
    observeArcs(arcTrack, dailyStateInitial)
    const cumulativeEvents = []
    const saveLatencies = []
    const seedStarted = performance.now()
    let batchElapsedTotalMs = 0
    let dailyElapsedTotalMs = 0
    let reloads = 0
    let successorCount = 0
    const seedResult = { seed, checkpoints: [], initiallySelectedSuccessors: [] }
    activeRun = { seed, year: 0, mode: 'yearly-vs-daily-with-reload' }

    for (let year = 1; year <= 100; year++) {
      activeRun = { seed, year, checkpoint: [10, 50, 100].includes(year), mode: 'yearly-vs-daily-with-reload' }
      const startTime = batchState.worldTime
      const batchStart = performance.now()
      const batchCapture = captureEvents(batchState, () => simulate(batchState, yearMinutes))
      let batchEvents = [...batchCapture.events]
      const batchSuccessor = !player(batchState).isAlive ? findSuccessor(batchState) : undefined
      if (!player(batchState).isAlive) {
        assert(batchSuccessor, `seed ${seed} year ${year}: no eligible successor`)
        const succession = captureEvents(batchState, () => chooseSuccessor(batchState, batchSuccessor.id))
        assert.equal(succession.result, true)
        batchEvents.push(...succession.events)
      }
      const batchElapsed = performance.now() - batchStart

      const dailyStart = performance.now()
      const dailyEvents = []
      if (year === 1) {
        // Observe real schedule changes with an hour cadence for the first game year.
        for (let day = 0; day < 120; day++) {
          for (let hour = 0; hour < 24; hour++) {
            const beforeTime = dailyStateInitial.worldTime
            const step = captureEvents(dailyStateInitial, () => simulate(dailyStateInitial, 60))
            dailyEvents.push(...step.events)
            observeBossEvidence(bossTrack, step.events)
            observeStep(npcTrack, dailyStateInitial, beforeTime, dailyStateInitial.worldTime, step.events)
            observeArcs(arcTrack, dailyStateInitial)
          }
        }
      } else {
        for (let day = 0; day < 120; day++) {
          const beforeTime = dailyStateInitial.worldTime
          const step = captureEvents(dailyStateInitial, () => simulate(dailyStateInitial, dayMinutes))
          dailyEvents.push(...step.events)
          observeBossEvidence(bossTrack, step.events)
          observeStep(npcTrack, dailyStateInitial, beforeTime, dailyStateInitial.worldTime, step.events)
          observeArcs(arcTrack, dailyStateInitial)
        }
      }
      const dailySuccessor = !player(dailyStateInitial).isAlive ? findSuccessor(dailyStateInitial) : undefined
      if (!player(dailyStateInitial).isAlive) {
        assert(dailySuccessor, `seed ${seed} year ${year}: no eligible successor in daily branch`)
        const beforeTime = dailyStateInitial.worldTime
        const succession = captureEvents(dailyStateInitial, () => chooseSuccessor(dailyStateInitial, dailySuccessor.id))
        assert.equal(succession.result, true)
        dailyEvents.push(...succession.events)
        observeBossEvidence(bossTrack, succession.events)
        observeStep(npcTrack, dailyStateInitial, beforeTime, dailyStateInitial.worldTime, succession.events)
      }
      const dailyElapsed = performance.now() - dailyStart
      batchElapsedTotalMs += batchElapsed
      dailyElapsedTotalMs += dailyElapsed

      assert.equal(batchState.worldTime, startTime + yearMinutes)
      assert.deepEqual(batchEvents, dailyEvents, `seed ${seed} year ${year}: event stream differs by call chunk`)
      assert.deepEqual(batchState, dailyStateInitial, `seed ${seed} year ${year}: state differs by call chunk`)
      assertBounds(batchState)
      assertBounds(dailyStateInitial)
      cumulativeEvents.push(...batchEvents)

      // Full canonical serialization/reload each simulated year, then continue from the reloaded state.
      const saveStart = performance.now()
      const roundtripRaw = serialize(dailyStateInitial, year * 1000)
      const roundtrip = deserialize(roundtripRaw)
      saveLatencies.push(performance.now() - saveStart)
      assert.deepEqual(roundtrip.state, dailyStateInitial, `seed ${seed} year ${year}: save/reload changed state`)
      assert.equal(roundtrip.lastSavedAt, year * 1000)
      dailyStateInitial.worldTime = roundtrip.state.worldTime
      Object.assign(dailyStateInitial, roundtrip.state)
      reloads++
      assert.deepEqual(dailyStateInitial, batchState, `seed ${seed} year ${year}: post-reload continuation differs`)

      if (batchSuccessor) {
        successorCount++
        seedResult.initiallySelectedSuccessors.push({ at: batchState.worldTime, id: batchSuccessor.id, age: batchSuccessor.age })
      }
      if ([10, 50, 100].includes(year)) {
        const sample = summarize(batchState, year, cumulativeEvents, batchElapsed, dailyElapsed,
          performance.now() - seedStarted, batchElapsedTotalMs, dailyElapsedTotalMs,
          saveLatencies, reloads, successorCount, serialize, player)
        sample.naturalArcObservation = arcTrackerSnapshot(arcTrack)
        sample.independentBossAttemptObservation = bossEvidenceSnapshot(bossTrack)
        seedResult.checkpoints.push(sample)
        npcTrack.checkpoints.push({ gameYear: year, featured: npcTrack.ids.map(id => plainSnapshot(dailyStateInitial, id) ?? npcTrack.previous.get(id)) })
        activeRun = { seed, year, checkpoint: true, mode: 'yearly-vs-daily-with-reload' }
        metadata.seedRuns = metadata.seedRuns.filter(existing => existing.seed !== seed)
        metadata.seedRuns.push(seedResult)
        if (!npcTracking.seeds.some(existing => existing.seed === seed)) npcTracking.seeds.push(npcTrack)
        saveProgress()
      }
    }
  }

  metadata.status = 'PASS'
  metadata.failingTest = null
  npcTracking.status = 'PASS'
  publish(longOut, `${JSON.stringify(metadata, null, 2)}\n`)
  publish(npcOut, `${JSON.stringify(npcTracking, null, 2)}\n`)
  console.log(JSON.stringify({ status: metadata.status, sourceCommit: metadata.sourceCommit,
      batching: metadata.batching, checkpoints: metadata.seedRuns.map(run => ({ seed: run.seed, years: run.checkpoints.map(c => c.gameYear) })),
    npcTracker: npcTracking.seeds.map(run => ({ seed: run.seed, ids: run.ids,
      featuredNames: run.initial.map(npc => ({ id: npc.id, name: npc.name })), updateCount: run.updates.length,
      movementCount: run.movementCount, skillChangeCount: run.skillChangeCount,
      careerChangeCount: run.careerChangeCount, retirementCount: run.retirementCount,
      injuryCount: run.injuryCount, recoveryCount: run.recoveryCount, deathCount: run.deathCount })) }, null, 2))
} catch (error) {
  metadata.status = 'FAIL'
  metadata.failingRun = activeRun
  metadata.failingTest = { message: String(error?.message ?? error), stack: String(error?.stack ?? '') }
  publish(longOut, `${JSON.stringify(metadata, null, 2)}\n`)
  publish(npcOut, `${JSON.stringify(npcTracking, null, 2)}\n`)
  throw error
} finally {
  await server.close()
}
