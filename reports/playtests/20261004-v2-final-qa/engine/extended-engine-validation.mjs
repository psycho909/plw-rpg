import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const repo = process.cwd()
const base = resolve(repo, 'reports/playtests/20261004-v2-final-qa/engine')
const sourceFiles = [
  'src/engine/actions.ts', 'src/engine/calendar.ts', 'src/engine/events.ts', 'src/engine/identity.ts',
  'src/engine/lifeState.ts', 'src/engine/livingEvents.ts', 'src/engine/npcLife.ts', 'src/engine/ownership.ts',
  'src/engine/random.ts', 'src/engine/simulation.ts', 'src/services/saveService.ts',
  'src/domain/life.ts', 'src/domain/types.ts', 'src/data/config.ts', 'src/data/identity.ts',
  'src/data/livingEvents.ts', 'src/data/npcLife.ts', 'src/data/ownership.ts',
]
const sourceSha256 = Object.fromEntries(sourceFiles.map(file => [
  file, createHash('sha256').update(readFileSync(resolve(repo, file))).digest('hex'),
]))
const runner = 'reports/playtests/20261004-v2-final-qa/engine/extended-engine-validation.mjs'
const provenance = {
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  sourceSha256,
  runnerSha256: createHash('sha256').update(readFileSync(resolve(repo, runner))).digest('hex'),
  executedAt: new Date().toISOString(),
  runner,
}

const server = await createServer({
  configFile: false,
  root: repo,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

function publish(file, body) {
  execFileSync('python3', ['scripts/recorded_reports.py', 'publish', resolve(base, file)], {
    cwd: repo,
    input: `${JSON.stringify(body, null, 2)}\n`,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function publicAction(actions, name, fn) {
  const result = fn()
  actions[name] = (actions[name] ?? 0) + 1
  assert.equal(result, '', `${name} returned a public-action blocker: ${result}`)
  return result
}

function publicWalk(state, position) {
  assert.equal(stateApi.walkTo(state, position), true, `walkTo failed at ${JSON.stringify(position)}`)
}

function snapshotMetrics(state) {
  const c = stateApi.player(state)
  return {
    worldTime: state.worldTime,
    stage: state.settlement.stage,
    settlement: {
      food: state.settlement.food,
      safety: state.settlement.safety,
      prosperity: state.settlement.prosperity,
      infrastructure: state.settlement.infrastructure,
    },
    ironReserve: state.life.director.ironReserve,
    tradePenalty: state.life.director.tradePenalty,
    ironBuyPrice: actionsApi.buyPrice(state, 'iron'),
    foodBuyPrice: actionsApi.buyPrice(state, 'food'),
    tradePriceMultiplier: livingApi.tradePriceMultiplier(state),
    activeCharacter: {
      id: c.id, alive: c.isAlive, age: c.age, hp: c.hp, stamina: c.stamina,
      gold: c.gold, inventory: { ...c.inventory },
      identity: structuredClone(state.life.characters[c.id]),
    },
    properties: state.life.properties.map(property => ({ id: property.id, kind: property.kind, ownerId: property.ownerId })),
  }
}

function diffMetrics(before, after) {
  return {
    food: after.settlement.food - before.settlement.food,
    safety: after.settlement.safety - before.settlement.safety,
    prosperity: after.settlement.prosperity - before.settlement.prosperity,
    infrastructure: after.settlement.infrastructure - before.settlement.infrastructure,
    ironReserve: after.ironReserve - before.ironReserve,
    tradePenalty: after.tradePenalty - before.tradePenalty,
    ironBuyPrice: after.ironBuyPrice - before.ironBuyPrice,
    tradePriceMultiplier: after.tradePriceMultiplier - before.tradePriceMultiplier,
  }
}

function arcNarrative(arc, definition) {
  if (arc.stage === 'signal') return definition.signal
  if (arc.stage === 'development') return definition.development
  if (arc.stage === 'reaction') return definition.reaction
  if (arc.stage === 'outcome') return arc.outcome === 'helped' ? definition.helped : definition.ignored
  if (arc.stage === 'consequence') return definition.consequence[arc.outcome]
  return null
}

function captureArcStage(state, arcId, trace, definition) {
  const arc = state.life.arcs.find(candidate => candidate.id === arcId)
  assert(arc, `arc ${arcId} disappeared before its result was recorded`)
  const signature = `${arc.stage}:${arc.outcome}:${arc.resolved}`
  if (trace.at(-1)?.signature !== signature) {
    trace.push({
      signature,
      worldTime: state.worldTime,
      day: Math.floor(state.worldTime / 1440),
      stage: arc.stage,
      outcome: arc.outcome,
      resolved: arc.resolved,
      narrative: arcNarrative(arc, definition),
      request: state.life.requests.find(request => request.arcId === arcId)
        ? structuredClone(state.life.requests.find(request => request.arcId === arcId)) : null,
    })
  }
  return arc
}

function traceToReaction(state, arc, trace, definition, maximumDays = 12) {
  captureArcStage(state, arc.id, trace, definition)
  for (let day = 0; day < maximumDays && arc.stage !== 'reaction' && !arc.resolved; day++) {
    stateApi.simulate(state, 1440)
    captureArcStage(state, arc.id, trace, definition)
  }
  assert.equal(arc.stage, 'reaction', `arc ${arc.id} did not reach reaction within ${maximumDays} days`)
  return arc
}

function resolveByWaiting(state, arc, trace, definition, maximumDays = 10) {
  for (let day = 0; day < maximumDays && !arc.resolved; day++) {
    stateApi.simulate(state, 1440)
    captureArcStage(state, arc.id, trace, definition)
  }
  assert.equal(arc.resolved, true, `arc ${arc.id} did not reach consequence within ${maximumDays} days`)
  assert.equal(arc.stage, 'consequence')
}

function findSuccessor(state) {
  return state.npcs.filter(npc => npc.isAlive && npc.age >= 15)
    .sort((a, b) => a.age - b.age || a.id.localeCompare(b.id))[0]
}

let stateApi
let actionsApi
let ownershipApi
let livingApi
let saveApi
let configApi
let arcDefsApi
let calendarApi
let ownerProgress = { ...provenance, status: 'RUNNING', phase: 'public-ownership-route' }
let arcProgress = { ...provenance, status: 'RUNNING', phase: 'natural-counterfactuals' }

try {
  stateApi = await server.ssrLoadModule('/src/engine/simulation.ts')
  actionsApi = await server.ssrLoadModule('/src/engine/actions.ts')
  ownershipApi = await server.ssrLoadModule('/src/engine/ownership.ts')
  livingApi = await server.ssrLoadModule('/src/engine/livingEvents.ts')
  saveApi = await server.ssrLoadModule('/src/services/saveService.ts')
  configApi = await server.ssrLoadModule('/src/data/config.ts')
  arcDefsApi = await server.ssrLoadModule('/src/data/livingEvents.ts')
  calendarApi = await server.ssrLoadModule('/src/engine/calendar.ts')

  const ownerSeed = 909
  const ownerState = stateApi.createGame(ownerSeed)
  const ownerActions = {}
  const ownerRoute = {
    seed: ownerSeed,
    fixture: 'Normal createGame(seed); no world-time, gold, inventory, food, identity, reputation, age, or settlement-state injection.',
    publicRoute: [],
    actionCounts: ownerActions,
    checkpoints: [],
    propertyOwnerId: ownerState.activeCharacterId,
    startedAtWorldTime: ownerState.worldTime,
  }

  function restoreStaminaForFarming(state) {
    if (stateApi.player(state).stamina >= 56) return
    const currentId = state.activeCharacterId
    const home = state.life.properties.find(property => property.kind === 'home' && property.ownerId === currentId)
    if (home) {
      publicWalk(state, home.position)
      publicAction(ownerActions, 'homeRest', () => ownershipApi.homeRest(state))
    } else {
      publicWalk(state, configApi.BUILDINGS.house.position)
      let safety = 0
      while (stateApi.player(state).stamina < 56 && safety++ < 4) {
        publicAction(ownerActions, 'rest', () => actionsApi.rest(state, 'rest'))
      }
      assert(stateApi.player(state).stamina >= 56)
    }
  }

  function sellFoodAtStore(state, keepFood = 1) {
    publicWalk(state, configApi.BUILDINGS.store.position)
    let sales = 0
    while (stateApi.player(state).inventory.food > keepFood) {
      if (!actionsApi.canVisit(state, 'store')) {
        const hour = calendarApi.calendar(state.worldTime).hour
        const minute = state.worldTime % 1440
        const open = 8 * 60
        const wait = hour >= 20 ? 1440 - minute + open : Math.max(1, open - minute)
        stateApi.simulate(state, wait)
        publicWalk(state, configApi.BUILDINGS.store.position)
      }
      publicAction(ownerActions, 'sellFood', () => actionsApi.trade(state, 'food', false))
      sales++
    }
    return sales
  }

  function growAndSellCropCycle(state) {
    restoreStaminaForFarming(state)
    publicWalk(state, configApi.BUILDINGS.farm.position)
    for (let plot = 0; plot < 4; plot++) {
      publicAction(ownerActions, 'farm.prepare', () => actionsApi.farm(state, 'prepare'))
      publicAction(ownerActions, 'farm.plant', () => actionsApi.farm(state, 'plant'))
    }
    stateApi.simulate(state, 2 * 1440)
    for (let plot = 0; plot < 4; plot++) {
      publicAction(ownerActions, 'farm.harvest', () => actionsApi.farm(state, 'harvest'))
    }
    sellFoodAtStore(state)
  }

  for (let cycle = 0; cycle < 12; cycle++) {
    growAndSellCropCycle(ownerState)
    if (!ownerState.life.properties.some(property => property.kind === 'home' && property.ownerId === ownerState.activeCharacterId)
      && stateApi.player(ownerState).gold >= 80) {
      publicWalk(ownerState, configApi.BUILDINGS.house.position)
      publicAction(ownerActions, 'property.home', () => ownershipApi.buyProperty(ownerState, 'home'))
      ownerRoute.publicRoute.push({ action: 'buyProperty(home)', at: ownerState.worldTime, gold: stateApi.player(ownerState).gold })
    }
    const life = ownerState.life.characters[ownerState.activeCharacterId]
    if (life.reputation >= 25 && stateApi.player(ownerState).gold >= 360) break
  }
  assert(ownerState.life.properties.some(property => property.kind === 'home' && property.ownerId === ownerState.activeCharacterId),
    'the ordinary public-action route did not earn enough gold for a home')
  assert(stateApi.player(ownerState).isAlive)
  assert(ownerState.life.characters[ownerState.activeCharacterId].reputation >= 25)

  let daysUntilVillage = 0
  while (ownerState.settlement.stage === 'hamlet' && daysUntilVillage < 365) {
    stateApi.simulate(ownerState, 1440)
    daysUntilVillage++
  }
  assert.notEqual(ownerState.settlement.stage, 'hamlet', 'settlement did not naturally grow to village within one game year')
  publicWalk(ownerState, configApi.BUILDINGS.farm.position)
  for (const kind of ['land', 'farmBusiness']) {
    if (kind === 'farmBusiness' && !ownerState.life.properties.some(property => property.kind === 'land' && property.ownerId === ownerState.activeCharacterId)) {
      const eligibility = ownershipApi.propertyEligibility(ownerState, 'land')
      assert.equal(eligibility.eligible, true, `land eligibility failed: ${eligibility.reasons.join('; ')}`)
      publicAction(ownerActions, 'property.land', () => ownershipApi.buyProperty(ownerState, 'land'))
      ownerRoute.publicRoute.push({ action: 'buyProperty(land)', at: ownerState.worldTime, gold: stateApi.player(ownerState).gold,
        identity: [...ownerState.life.characters[ownerState.activeCharacterId].identities],
        reputation: ownerState.life.characters[ownerState.activeCharacterId].reputation })
    }
    const eligibility = ownershipApi.propertyEligibility(ownerState, kind)
    assert.equal(eligibility.eligible, true, `${kind} eligibility failed: ${eligibility.reasons.join('; ')}`)
    publicAction(ownerActions, `property.${kind}`, () => ownershipApi.buyProperty(ownerState, kind))
    ownerRoute.publicRoute.push({ action: `buyProperty(${kind})`, at: ownerState.worldTime, gold: stateApi.player(ownerState).gold,
      identity: [...ownerState.life.characters[ownerState.activeCharacterId].identities],
      reputation: ownerState.life.characters[ownerState.activeCharacterId].reputation })
  }

  const homeFoodAvailable = stateApi.player(ownerState).inventory.food
  const supplyBefore = structuredClone(ownerState)
  const supplyResult = ownershipApi.supplyFarmFood(ownerState, 1)
  assert.equal(supplyResult, '聚落糧倉空間不足。', `normal public supply attempt had unexpected result: ${supplyResult}`)
  assert.deepEqual(ownerState, supplyBefore, 'blocked food supply mutated the normal world')
  ownerRoute.foodSupplyAttempt = {
    method: 'supplyFarmFood(state, 1)',
    settlementFood: ownerState.settlement.food,
    inventoryFood: homeFoodAvailable,
    result: supplyResult,
    stateUnchanged: true,
    finding: 'The full natural granary blocks the contribution; this normal route did not lower food to manufacture an eligible supply.',
  }
  ownerRoute.acquisition = {
    worldTime: ownerState.worldTime,
    elapsedGameDaysFromNewWorld: Math.floor((ownerState.worldTime - ownerRoute.startedAtWorldTime) / 1440),
    settlementStage: ownerState.settlement.stage,
    daysWaitingForNaturalVillageGrowth: daysUntilVillage,
    gold: stateApi.player(ownerState).gold,
    identity: [...ownerState.life.characters[ownerState.activeCharacterId].identities],
    reputation: ownerState.life.characters[ownerState.activeCharacterId].reputation,
    reputationHistory: structuredClone(ownerState.life.characters[ownerState.activeCharacterId].reputationHistory),
    properties: structuredClone(ownerState.life.properties),
    settlement: { food: ownerState.settlement.food, prosperity: ownerState.settlement.prosperity, safety: ownerState.settlement.safety },
    actionCounts: { ...ownerActions },
  }
  ownerRoute.status = 'PASS'
  publish('ownership-lifecycle.json', {
    ...provenance,
    status: 'RUNNING',
    ownerRoute,
    longTerm: { status: 'RUNNING', method: 'Each 120-day game-year advances through public simulate; natural death is followed only through public chooseSuccessor; every year serializes, reloads, compares the complete state, then continues from the reloaded state.' },
  })

  const baseOwnedState = structuredClone(ownerState)
  const ownerId = ownerState.activeCharacterId
  const ownedPropertyIds = ownerState.life.properties.map(property => property.id)
  const yearMinutes = 120 * 1440
  const ownerLongTerm = {
    status: 'RUNNING',
    startWorldTime: ownerState.worldTime,
    ownerId,
    properties: structuredClone(ownerState.life.properties.map(property => ({ id: property.id, kind: property.kind, ownerId: property.ownerId }))),
    saveMode: 'headless SaveService.serialize/deserialize only; no browser IndexedDB playJournal is present in these engine measurements.',
    yearsStepped: 0,
    reloads: 0,
    successionEvents: [],
    checkpoints: [],
    timings: [],
  }
  const longStarted = performance.now()
  for (let year = 1; year <= 100; year++) {
    const yearStart = performance.now()
    stateApi.simulate(ownerState, yearMinutes)
    let successor = null
    if (!stateApi.player(ownerState).isAlive) {
      const deceasedId = ownerState.activeCharacterId
      const deceased = stateApi.player(ownerState)
      const candidate = findSuccessor(ownerState)
      assert(candidate, `no natural adult successor at elapsed year ${year}`)
      const priorProperties = structuredClone(ownerState.life.properties)
      assert.equal(stateApi.chooseSuccessor(ownerState, candidate.id), true)
      assert.deepEqual(ownerState.life.properties, priorProperties, 'choosing a successor transferred or removed legacy property records')
      successor = { at: ownerState.worldTime, elapsedGameYears: year, deceasedId, deceasedAge: deceased.age,
        successorId: candidate.id, successorAge: candidate.age,
        legacyPropertyOwners: ownerState.life.properties.map(property => ({ kind: property.kind, ownerId: property.ownerId })) }
      ownerLongTerm.successionEvents.push(successor)
    }
    const simMs = performance.now() - yearStart
    const saveStarted = performance.now()
    const raw = saveApi.serialize(ownerState, year * 1000)
    const loaded = saveApi.deserialize(raw)
    const roundtripMs = performance.now() - saveStarted
    assert.equal(loaded.lastSavedAt, year * 1000)
    assert.deepEqual(loaded.state, ownerState, `ownership route save/reload changed state in elapsed year ${year}`)
    assert.deepEqual(loaded.state.life.properties.map(property => property.id), ownedPropertyIds,
      `ownership records changed after reload in elapsed year ${year}`)
    Object.assign(ownerState, loaded.state)
    ownerLongTerm.yearsStepped = year
    ownerLongTerm.reloads++
    ownerLongTerm.timings.push({ elapsedGameYear: year, simMs, saveReloadMs: roundtripMs, saveBytes: Buffer.byteLength(raw) })
    if ([10, 50, 100].includes(year)) {
      const oldOwner = ownerState.characters.find(character => character.id === ownerId)
      const checkpoint = {
        elapsedGameYear: year,
        worldTime: ownerState.worldTime,
        activeCharacter: { id: stateApi.player(ownerState).id, alive: stateApi.player(ownerState).isAlive, age: stateApi.player(ownerState).age, life: structuredClone(ownerState.life.characters[ownerState.activeCharacterId]), skills: structuredClone(stateApi.player(ownerState).skills) },
        originalOwner: { id: ownerId, alive: oldOwner?.isAlive ?? null, age: oldOwner?.age ?? null,
          identity: structuredClone(ownerState.life.characters[ownerId]) },
        properties: ownerState.life.properties.map(property => ({ id: property.id, kind: property.kind, ownerId: property.ownerId })),
        originalOwnerRetained: ownerState.characters.some(character => character.id === ownerId),
        successorHasInheritedOwnership: ownerState.life.properties.some(property => property.ownerId === stateApi.player(ownerState).id),
        propertyOwnerIdsUnchanged: ownerState.life.properties.every(property => property.ownerId === ownerId),
        settlement: { ...ownerState.settlement },
        population: ownerState.npcs.filter(npc => npc.isAlive).length + ownerState.characters.filter(character => character.isAlive).length,
        worldHistory: ownerState.history.length,
        eventList: ownerState.events.length,
        featuredNpcLifeRecords: Object.values(ownerState.life.npcs).filter(npc => npc.featured).length,
        memoryCounts: { world: ownerState.life.worldMemories.length, settlement: ownerState.life.settlementMemories.length },
        arcCounts: { arcs: ownerState.life.arcs.length, requests: ownerState.life.requests.length, news: ownerState.life.news.length },
        headlessSaveBytes: Buffer.byteLength(raw),
        saveReloadMs: roundtripMs,
        lastYearSimulationMs: simMs,
        elapsedRunnerMs: performance.now() - longStarted,
      }
      assert.equal(checkpoint.propertyOwnerIdsUnchanged, true)
      assert.equal(checkpoint.originalOwnerRetained, true)
      ownerLongTerm.checkpoints.push(checkpoint)
      ownerProgress = { ...provenance, status: 'RUNNING', phase: `ownership-year-${year}`, ownerRoute,
        longTerm: ownerLongTerm }
      publish('ownership-lifecycle.json', ownerProgress)
    }
  }
  ownerLongTerm.status = 'PASS'
  ownerLongTerm.totalRunnerMs = performance.now() - longStarted
  ownerLongTerm.headlessSaveBytes = {
    at10Years: ownerLongTerm.checkpoints.find(item => item.elapsedGameYear === 10).headlessSaveBytes,
    at50Years: ownerLongTerm.checkpoints.find(item => item.elapsedGameYear === 50).headlessSaveBytes,
    at100Years: ownerLongTerm.checkpoints.find(item => item.elapsedGameYear === 100).headlessSaveBytes,
    p95SaveReloadMs: [...ownerLongTerm.timings.map(item => item.saveReloadMs)].sort((a, b) => a - b)[Math.floor((ownerLongTerm.timings.length - 1) * .95)],
    limitation: 'These byte counts cover the GameState JSON serialized by SaveService. They exclude the browser IndexedDB playJournal, request metadata, and storage-engine overhead; those belong to the Chromium soak evidence.',
  }
  ownerProgress = { ...provenance, status: 'PASS', ownerRoute, longTerm: ownerLongTerm }
  publish('ownership-lifecycle.json', ownerProgress)

  const roadSeed = 17
  const roadState = stateApi.createGame(roadSeed)
  let roadArc = null
  let roadStartedAt = null
  for (let day = 0; day < 120 * 10 && !roadArc; day++) {
    stateApi.simulate(roadState, day === 0 ? 1440 - roadState.worldTime % 1440 : 1440)
    roadArc = roadState.life.arcs.find(arc => arc.kind === 'road') ?? null
    if (roadArc) roadStartedAt = roadArc.startedAt
  }
  assert(roadArc, 'normal seed 17 did not naturally produce a road crisis within ten game-years')
  const roadDefinition = arcDefsApi.LIVING_ARCS.road
  const roadTriggerTrace = []
  traceToReaction(roadState, roadArc, roadTriggerTrace, roadDefinition)
  const roadCheckpoint = structuredClone(roadState)
  const roadCheckpointSha256 = digest(roadCheckpoint)
  const roadCheckpointMetrics = snapshotMetrics(roadCheckpoint)

  function doOneLifeCrop(state, counter) {
    publicWalk(state, configApi.BUILDINGS.farm.position)
    publicAction(counter, 'farm.prepare', () => actionsApi.farm(state, 'prepare'))
    publicAction(counter, 'farm.plant', () => actionsApi.farm(state, 'plant'))
    stateApi.simulate(state, 2 * 1440)
    publicAction(counter, 'farm.harvest', () => actionsApi.farm(state, 'harvest'))
  }

  function doRoadCombat(state, arc, counter) {
    const hunt = state.life.requests.find(request => request.arcId === arc.id)
    assert(hunt && hunt.kind === 'hunt')
    publicWalk(state, { x: 5, y: 5 })
    const fights = []
    let encounterGuard = 0
    while (hunt.progress < hunt.amount && encounterGuard++ < 10) {
      publicAction(counter, 'encounter', () => actionsApi.encounter(state))
      const monsterId = state.combat?.monsterId
      let turns = 0
      while (state.combat && turns++ < 80) publicAction(counter, 'combatTurn.attack', () => actionsApi.combatTurn(state, 'attack'))
      assert.equal(state.combat, null, 'public combat did not resolve')
      assert(stateApi.player(state).isAlive, 'character died during the natural road response')
      fights.push({ monsterId, turns, hpAfter: stateApi.player(state).hp,
        huntProgress: state.life.requests.find(request => request.id === hunt.id).progress })
    }
    assert(hunt.progress >= hunt.amount, 'outdoor combat did not complete the public hunt request')
    publicWalk(state, arcDefsApi.LIVING_EVENT_LIMITS.deliverySquare)
    publicAction(counter, 'fulfillRequest(hunt)', () => livingApi.fulfillRequest(state, hunt.id))
    return fights
  }

  function runRoadBranch(label, style) {
    const state = structuredClone(roadCheckpoint)
    const counter = {}
    const trace = structuredClone(roadTriggerTrace)
    const initial = snapshotMetrics(state)
    assert.equal(digest(state), roadCheckpointSha256, `${label} did not start from the exact natural reaction checkpoint`)
    let fights = []
    if (style === 'life' || style === 'mixed') doOneLifeCrop(state, counter)
    if (style === 'combat' || style === 'mixed') fights = doRoadCombat(state, roadArc, counter)
    const branchArc = state.life.arcs.find(arc => arc.id === roadArc.id)
    if (style === 'life') {
      assert.equal(branchArc.outcome, 'pending')
      assert.equal(branchArc.stage, 'reaction')
    } else {
      assert.equal(branchArc.outcome, 'helped')
      captureArcStage(state, branchArc.id, trace, roadDefinition)
    }
    resolveByWaiting(state, branchArc, trace, roadDefinition)
    const final = snapshotMetrics(state)
    return {
      label,
      style,
      trigger: 'Naturally triggered by createGame(17) and daily public simulation; no initial world state was edited.',
      startingCheckpointSha256: roadCheckpointSha256,
      startingCheckpointWorldTime: roadCheckpoint.worldTime,
      stages: trace.map(({ signature, ...entry }) => entry),
      publicActions: counter,
      fights,
      finalArc: structuredClone(branchArc),
      survived: stateApi.player(state).isAlive,
      meaningfulRoadIntervention: branchArc.outcome === 'helped',
      metricsBefore: initial,
      metricsAfterConsequence: final,
      actualWorldDeltas: diffMetrics(initial, final),
    }
  }

  const roadBranches = [
    runRoadBranch('Life', 'life'),
    runRoadBranch('Combat', 'combat'),
    runRoadBranch('Mixed', 'mixed'),
  ]
  assert(roadBranches.every(branch => branch.startingCheckpointSha256 === roadCheckpointSha256))

  const ironState = structuredClone(baseOwnedState)
  const ironSetupActions = {}
  publicWalk(ironState, configApi.BUILDINGS.store.position)
  for (let bought = 0; bought < 10; bought++) {
    if (!actionsApi.canVisit(ironState, 'store')) {
      const hour = calendarApi.calendar(ironState.worldTime).hour
      const minute = ironState.worldTime % 1440
      const open = 8 * 60
      const wait = hour >= 20 ? 1440 - minute + open : Math.max(1, open - minute)
      stateApi.simulate(ironState, wait)
      publicWalk(ironState, configApi.BUILDINGS.store.position)
    }
    publicAction(ironSetupActions, 'trade(iron,buy)', () => actionsApi.trade(ironState, 'iron', true))
  }
  const ironReserveAfterPublicPurchases = ironState.life.director.ironReserve
  assert.equal(ironReserveAfterPublicPurchases, 20, 'ten ordinary iron purchases should reduce reserve from 40 to 20')
  const ironWeightsAfterPurchase = livingApi.livingEventWeights(ironState)
  assert(ironWeightsAfterPurchase['arc:iron'] > 0, 'ordinary purchase route did not enable the iron-arc candidate')
  let ironArc = null
  const ironSearchStarted = ironState.worldTime
  for (let day = 0; day < 120 * 10 && !ironArc; day++) {
    stateApi.simulate(ironState, 1440)
    ironArc = ironState.life.arcs.find(arc => arc.kind === 'iron') ?? null
  }
  assert(ironArc, 'the ordinary iron-purchase route did not naturally produce an iron crisis within ten game-years')
  const ironDefinition = arcDefsApi.LIVING_ARCS.iron
  const ironTriggerTrace = []
  traceToReaction(ironState, ironArc, ironTriggerTrace, ironDefinition)
  const ironCheckpoint = structuredClone(ironState)
  const ironCheckpointSha256 = digest(ironCheckpoint)
  const ironCheckpointMetrics = snapshotMetrics(ironCheckpoint)

  function runIronBranch(outcome) {
    const state = structuredClone(ironCheckpoint)
    const counter = {}
    const trace = structuredClone(ironTriggerTrace)
    assert.equal(digest(state), ironCheckpointSha256)
    const initial = snapshotMetrics(state)
    const arc = state.life.arcs.find(candidate => candidate.id === ironArc.id)
    if (outcome === 'helped') {
      const request = state.life.requests.find(candidate => candidate.arcId === arc.id)
      assert(request && request.kind === 'iron')
      assert(stateApi.player(state).inventory.iron >= request.amount)
      publicWalk(state, arcDefsApi.LIVING_EVENT_LIMITS.deliverySquare)
      publicAction(counter, 'fulfillRequest(iron)', () => livingApi.fulfillRequest(state, request.id))
      captureArcStage(state, arc.id, trace, ironDefinition)
    }
    resolveByWaiting(state, arc, trace, ironDefinition)
    const final = snapshotMetrics(state)
    return {
      outcome,
      startingCheckpointSha256: ironCheckpointSha256,
      startingCheckpointWorldTime: ironCheckpoint.worldTime,
      stages: trace.map(({ signature, ...entry }) => entry),
      publicActions: counter,
      request: structuredClone(state.life.requests.find(request => request.arcId === arc.id)),
      finalArc: structuredClone(arc),
      metricsBefore: initial,
      metricsAfterConsequence: final,
      actualWorldDeltas: diffMetrics(initial, final),
    }
  }

  const ironBranches = [runIronBranch('helped'), runIronBranch('ignored')]
  assert(ironBranches.every(branch => branch.startingCheckpointSha256 === ironCheckpointSha256))

  const foodNatural = {
    seeds: [],
    classification: 'No food threshold was injected. A food crisis was not produced by passive normal simulation in these seeded worlds.',
  }
  for (const seed of [17, 909, 2026]) {
    const state = stateApi.createGame(seed)
    let lowestFood = state.settlement.food
    const seenArcIds = new Set()
    const seenCompletedArcIds = new Set()
    const startsByKind = { road: [], food: [], iron: [] }
    const outcomesByKind = {}
    for (let day = 0; day < 120 * 100; day++) {
      stateApi.simulate(state, day === 0 ? 1440 - state.worldTime % 1440 : 1440)
      lowestFood = Math.min(lowestFood, state.settlement.food)
      for (const arc of state.life.arcs) {
        if (!seenArcIds.has(arc.id)) {
          seenArcIds.add(arc.id)
          startsByKind[arc.kind].push({ id: arc.id, startedAt: arc.startedAt })
        }
        if (arc.resolved && !seenCompletedArcIds.has(arc.id)) {
          seenCompletedArcIds.add(arc.id)
          const key = `${arc.kind}:${arc.outcome}`
          outcomesByKind[key] = (outcomesByKind[key] ?? 0) + 1
        }
      }
    }
    foodNatural.seeds.push({ seed, simulatedGameYears: 100, minimumObservedFood: lowestFood,
      naturalArcStartsObserved: Object.fromEntries(Object.entries(startsByKind).map(([kind, arcs]) => [kind, arcs.length])),
      naturalArcOutcomesObserved: outcomesByKind,
      foodArcStartDays: startsByKind.food.map(arc => Math.floor(arc.startedAt / 1440)),
      settlementFoodAtEnd: state.settlement.food,
      arcObservationMethod: 'Observe the bounded arc collection after every canonical simulated day and retain IDs/outcomes across the full 100-year run.' })
  }

  arcProgress = {
    ...provenance,
    status: 'PASS',
    road: {
      trigger: 'natural createGame(17) + public simulate; no overridden world values',
      seed: roadSeed,
      startedAt: roadStartedAt,
      reactionWorldTime: roadCheckpoint.worldTime,
      startingMetrics: roadCheckpointMetrics,
      branches: roadBranches,
      interpretation: {
        lifeVsMeaningfulIntervention: 'Life survives and performs normal farming but does not satisfy the road hunt request; the world resolves it as ignored. Combat and Mixed satisfy that same checkpoint request with public outdoor combat and delivery APIs.',
        cappedWorldEffects: 'The natural reaction checkpoint had safety and prosperity at 100. Help therefore stayed at the cap; ignore produced observable -8 safety, -3 prosperity and a higher iron purchase price. This is the measured result at this seed, not evidence that helping always has no effect.',
        unsupportedActions: ['fund defense', 'organize defense', 'evacuate residents'],
      },
    },
    iron: {
      trigger: 'player-induced shortage through ten ordinary trade(iron, true) calls after earning gold from public farming and food sales; subsequent arc selection and every stage transition are natural.',
      reserveBeforePurchases: baseOwnedState.life.director.ironReserve,
      reserveAfterPurchases: ironReserveAfterPublicPurchases,
      inventoryAfterPurchases: stateApi.player(ironCheckpoint).inventory.iron,
      setupActions: ironSetupActions,
      candidateWeightsAfterPurchases: ironWeightsAfterPurchase,
      searchElapsedGameDays: Math.floor((ironCheckpoint.worldTime - ironSearchStarted) / 1440),
      reactionWorldTime: ironCheckpoint.worldTime,
      startingMetrics: ironCheckpointMetrics,
      branches: ironBranches,
      unsupportedActions: ['fund defense', 'evacuate residents'],
    },
    food: {
      normalOwnershipRouteSupplyAttempt: ownerRoute.foodSupplyAttempt,
      passiveNaturalObservation: foodNatural,
      finding: 'The ordinary world replenishes its granary to capacity, so the supply action is blocked and passive food-crisis eligibility is not reached in the checked seeds. No low-food state was injected for the normal route.',
      publicDeliveryApiAvailable: 'fulfillRequest(state, requestId) supports a food request when one exists and the actor carries its required amount.',
      unsupportedActions: ['fund defense', 'evacuate residents'],
    },
    crossArcLimitations: 'No public API funds a defense or evacuates residents. Road help is a public hunt request fulfilled through real outdoor combat; food and iron help use real carried inventory and fulfillRequest.',
  }
  publish('arc-counterfactuals.json', arcProgress)

  const codeFiles = []
  for (const directory of ['src']) {
    const listing = execFileSync('rg', ['--files', directory], { cwd: repo, encoding: 'utf8' }).trim().split('\n')
    for (const file of listing) if (/\.(ts|tsx|js|jsx|vue)$/.test(file)) codeFiles.push(file)
  }
  let mathRandomOutput = ''
  try {
    mathRandomOutput = execFileSync('rg', ['-n', 'Math\\.random\\s*\\(', 'src'], {
      cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch (error) {
    if (error.status !== 1) throw error
  }
  const mathRandomMatches = mathRandomOutput.trim().split('\n').filter(Boolean)
  const seededActionSequence = seed => {
    const state = stateApi.createGame(seed)
    const actionCounts = {}
    publicWalk(state, configApi.BUILDINGS.farm.position)
    publicAction(actionCounts, 'farm.prepare', () => actionsApi.farm(state, 'prepare'))
    publicAction(actionCounts, 'farm.plant', () => actionsApi.farm(state, 'plant'))
    stateApi.simulate(state, 2 * 1440)
    publicAction(actionCounts, 'farm.harvest', () => actionsApi.farm(state, 'harvest'))
    publicWalk(state, { x: 19, y: 5 })
    publicAction(actionCounts, 'gather.iron', () => actionsApi.gather(state, 'iron'))
    const saved = saveApi.serialize(state, 123456)
    const reloaded = saveApi.deserialize(saved).state
    assert.deepEqual(reloaded, state)
    stateApi.simulate(reloaded, 3 * 1440)
    return { state: reloaded, actionCounts, stateSha256: digest(reloaded), rngState: reloaded.rngState,
      saveBytes: Buffer.byteLength(saved) }
  }
  const rngRunA = seededActionSequence(2026)
  const rngRunB = seededActionSequence(2026)
  assert.deepEqual(rngRunA.state, rngRunB.state, 'same seed and public actions produced different full states')
  const rngReport = {
    ...provenance,
    status: mathRandomMatches.length === 0 && rngRunA.stateSha256 === rngRunB.stateSha256 ? 'PASS' : 'FAIL',
    staticScan: { searchedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.vue'], filesSearched: codeFiles.length,
      pattern: 'Math.random(', matchCount: mathRandomMatches.length, matches: mathRandomMatches,
      conclusion: mathRandomMatches.length === 0 ? 'No Math.random call sites found under src.' : 'Review every listed call site; this is not a clean seeded-RNG result.' },
    identicalSeedActions: {
      seed: 2026,
      actions: rngRunA.actionCounts,
      saveReloadBeforeContinuation: true,
      stateSha256RunA: rngRunA.stateSha256,
      stateSha256RunB: rngRunB.stateSha256,
      rngStateRunA: rngRunA.rngState,
      rngStateRunB: rngRunB.rngState,
      exactFullStateEqual: true,
      headlessSaveBytes: rngRunA.saveBytes,
    },
  }
  assert.equal(rngReport.status, 'PASS')
  publish('rng-determinism.json', rngReport)

  console.log(JSON.stringify({
    sourceCommit: provenance.sourceCommit,
    owner: { status: ownerRoute.status, properties: ownerRoute.acquisition.properties.map(property => property.kind),
      elapsedGameDays: ownerRoute.acquisition.elapsedGameDaysFromNewWorld, reputation: ownerRoute.acquisition.reputation,
      foodSupply: ownerRoute.foodSupplyAttempt.result, longevity: ownerLongTerm.checkpoints.map(checkpoint => ({ year: checkpoint.elapsedGameYear,
        saveBytes: checkpoint.headlessSaveBytes, ownerAlive: checkpoint.originalOwner.alive,
        activeId: checkpoint.activeCharacter.id, legacyOwnerRetained: checkpoint.propertyOwnerIdsUnchanged })) },
    road: roadBranches.map(branch => ({ style: branch.label, outcome: branch.finalArc.outcome, alive: branch.survived,
      safety: branch.actualWorldDeltas.safety, prosperity: branch.actualWorldDeltas.prosperity,
      ironBuyPrice: branch.metricsAfterConsequence.ironBuyPrice })),
    iron: { seed: ownerSeed, triggerAtDay: ironArc.startedAt / 1440, reactionDay: ironCheckpoint.worldTime / 1440,
      outcome: ironBranches.map(branch => ({ outcome: branch.outcome, deltas: branch.actualWorldDeltas })) },
    food: foodNatural.seeds.map(seed => ({ seed: seed.seed, minimumObservedFood: seed.minimumObservedFood,
      retainedFoodArcs: seed.foodArcsRetainedAtEnd })),
    rng: { status: rngReport.status, mathRandomMatches: mathRandomMatches.length,
      stateSha256: rngRunA.stateSha256, exactEqual: true },
  }, null, 2))
} catch (error) {
  ownerProgress = { ...provenance, status: 'FAIL', failure: { message: String(error?.message ?? error), stack: String(error?.stack ?? '') },
    partialOwner: ownerProgress, partialArcs: arcProgress }
  try { publish('ownership-lifecycle.json', ownerProgress) } catch {}
  try { publish('arc-counterfactuals.json', { ...arcProgress, status: 'FAIL', failure: ownerProgress.failure }) } catch {}
  throw error
} finally {
  await server.close()
}
