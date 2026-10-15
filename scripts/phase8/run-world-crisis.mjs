import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WORLD_SCENARIOS, WORLD_SEEDS, WORLD_YEARS, summarizeWorld, validateWorldRun } from './world-crisis-core.mjs'

const args = new Map(process.argv.slice(2).map(value => {
  const [key, ...rest] = value.replace(/^--/, '').split('=')
  return [key, rest.join('=')]
}))
const scenarios = args.has('scenario') ? args.get('scenario').split(',') : WORLD_SCENARIOS
const seeds = args.has('seed') ? args.get('seed').split(',').map(Number) : WORLD_SEEDS
const years = args.has('years') ? args.get('years').split(',').map(Number) : WORLD_YEARS
const runYears = years.length ? Math.max(...years) : Math.max(...WORLD_YEARS)
const growthRate = args.has('growth-rate') ? Number(args.get('growth-rate')) : null
const guardCoefficient = args.has('guard-coefficient') ? Number(args.get('guard-coefficient')) : 0.035
const comparisonLabel = args.get('comparison') ?? 'baseline'
const outputName = args.get('output') ?? ''
if (growthRate !== null && (!Number.isFinite(growthRate) || growthRate < 0)) throw new Error('growth-rate must be a finite non-negative number')
if (!Number.isFinite(guardCoefficient) || guardCoefficient < 0) throw new Error('guard-coefficient must be a finite non-negative number')
if (!/^[a-z0-9_-]*$/i.test(outputName)) throw new Error('output must be a simple directory name')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const reportBase = join(root, 'reports/v2/20261014-balance-tuning/phase-08/d-runner')
const reportRoot = outputName ? join(reportBase, outputName) : reportBase
const started = new Date()
const attempt = join(reportRoot, `attempt-${started.toISOString().replaceAll(':','').replaceAll('-','').replaceAll('.','')}`)
await mkdir(reportRoot, { recursive: true }); await mkdir(attempt, { recursive: false })

async function headHash() {
  const head = (await readFile(join(root, '.git/HEAD'), 'utf8')).trim()
  if (!head.startsWith('ref: ')) return head
  const ref = head.slice(5)
  try { return (await readFile(join(root, '.git', ref), 'utf8')).trim() }
  catch { return (await readFile(join(root, '.git/packed-refs'), 'utf8')).split(/\r?\n/).find(row => row.endsWith(` ${ref}`))?.split(' ')[0] ?? 'unknown' }
}
const srcFiles = []
async function walk(dir) {
  const { readdir } = await import('node:fs/promises')
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await walk(path); else srcFiles.push(path)
  }
}
await walk(join(root, 'src')); srcFiles.sort()
const fingerprint = createHash('sha256')
for (const path of srcFiles) { fingerprint.update(path.slice(join(root,'src').length).replaceAll('\\','/')+'\0'); fingerprint.update(await readFile(path)); fingerprint.update('\0') }
const manifest = { command: `node scripts/phase8/run-world-crisis.mjs ${process.argv.slice(2).join(' ')}`.trim(), startedAt: started.toISOString(), head: await headHash(), srcFingerprint: fingerprint.digest('hex'), seeds, years, scenarios,
  parameterComparison: { label: comparisonLabel, growthRate: growthRate ?? 'state-default', guardCoefficient, overrideScope: 'in-memory only; simulation.ts transformed by runner; src files unchanged' },
  policy: 'Normal fresh-save worlds. Life uses legal in-season farm crops and public farm actions; seasonal crop sale variant sells harvest goods through the public material trade action. Adventure periodically enters public forest encounters and fights by public combatTurn; Mixed alternates both. Only active-policy scenarios perform succession after death: choose the first living adult NPC in state order, matching App.vue successor-list filtering, then call public chooseSuccessor. No-intervention and settlement control fixtures do not take succession as a player action.', timeModel: 'Real simulation.simulate(); records the tracked live state across outer intervals and action-internal calls, with daily budgets observed at every canonical boundary; no parallel world model.' }
await writeFile(join(attempt, 'manifest.json'), JSON.stringify(manifest, null, 2)+'\n', { flag: 'wx' })
let vite
const checkpoints = [], transitions = [], actionRows = [], crisisRows = [], donationRows = [], deaths = [], successions = [], cropSales = [], dailyBalanceRows = []
try {
  vite = await createServer({ configFile: false, root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{ name: 'phase8-in-memory-budget-instrumentation', enforce: 'pre', transform(code, id) {
      if (!id.replaceAll('\\', '/').split('?')[0].endsWith('/src/engine/simulation.ts')) return null
      const guardFormula = /t\.monsterPopulation = bound\(t\.monsterPopulation \+ t\.growthRate - guards \* \.035, 0, 100\)/g
      const formulaMatches = [...code.matchAll(guardFormula)]
      const dailySignature = 'function dailyTick(state: GameState) {'
      const simulateSignature = 'export function simulate(state: GameState, gameMinutes: number) {'
      if (formulaMatches.length !== 1) throw new Error(`expected one daily monster budget formula in simulation.ts, found ${formulaMatches.length}`)
      if (code.split(dailySignature).length !== 2) throw new Error('expected one dailyTick function in simulation.ts')
      if (code.split(simulateSignature).length !== 2) throw new Error('expected one exported simulate function in simulation.ts')
      let transformed = code.replace(guardFormula, `globalThis["__phase8CaptureDailyBudget"]?.(state, { day: Math.floor(state.worldTime / CONFIG.minutesPerDay), growthRate: t.growthRate, guards, monsterPopulationBefore: t.monsterPopulation });\n  t.monsterPopulation = bound(t.monsterPopulation + t.growthRate - guards * ${guardCoefficient}, 0, 100)`)
      transformed = transformed.replace(dailySignature, `function dailyTick(state: GameState) {
  const __phase8Snapshot = { worldTime: state.worldTime, monsterPopulationBefore: state.threat.monsterPopulation,
    crisisSequence: state.regionalCrisis.sequence, crisisResolvedAt: state.regionalCrisis.resolvedAt };
  globalThis["__phase8DailyBudgetContext"] = null;
  const __phase8Result = dailyTickOriginal(state);
  globalThis["__phase8ObserveDailyBudget"]?.(state, __phase8Snapshot, globalThis["__phase8DailyBudgetContext"]);
  globalThis["__phase8DailyBudgetContext"] = null;
  return __phase8Result;
}

function dailyTickOriginal(state: GameState) {`)
      transformed = transformed.replace(simulateSignature, `export function simulate(state: GameState, gameMinutes: number) {
  const __phase8Start = state.worldTime;
  const __phase8Result = simulateOriginal(state, gameMinutes);
  globalThis["__phase8ObserveSimulation"]?.(state, __phase8Start, state.worldTime, gameMinutes);
  return __phase8Result;
}

function simulateOriginal(state: GameState, gameMinutes: number) {`)
      return transformed
    } }] })
  const [sim, actions, cropApi, crisisApi, defense, save, rewardApi, itemGeneration, data, npcLife] = await Promise.all([
    vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/engine/actions.ts'),
    vite.ssrLoadModule('/src/engine/crops.ts'), vite.ssrLoadModule('/src/engine/crisisContributions.ts'),
    vite.ssrLoadModule('/src/engine/civilDefense.ts'), vite.ssrLoadModule('/src/services/saveService.ts'),
    vite.ssrLoadModule('/src/engine/rewardActions.ts'), vite.ssrLoadModule('/src/engine/itemGeneration.ts'),
    vite.ssrLoadModule('/src/data/config.ts'), vite.ssrLoadModule('/src/engine/npcLife.ts'),
  ])
  const { createGame, player, simulate, population, distance } = sim
  const { walkTo } = sim
  const { farm, encounter, combatTurn, rest } = actions
  const { farmCropChoices } = cropApi
  const { contributeCrisisFood } = crisisApi
  const { tradeMaterial } = rewardApi
  const { deriveCivilDefense } = defense
  const { npcCanWork } = npcLife
  const { serialize, deserialize } = save
  const { BUILDINGS, CONFIG } = data
  const D = CONFIG.minutesPerDay
  const fieldTarget = state => state.tiles.find(t => t.regionId === 'farmland' && t.walkable)
  const forestTarget = state => state.tiles.find(t => t.regionId === 'forest' && t.walkable)

  function fixture(state, scenario) {
    if (scenario === 'prosperous-controlled') Object.assign(state.settlement, { stage: 'town', capacity: CONFIG.maxPopulation, food: 100, safety: 100, prosperity: 100, infrastructure: 100, growth: 260 })
    if (scenario === 'struggling-controlled') Object.assign(state.settlement, { stage: 'hamlet', capacity: Math.max(state.settlement.capacity, population(state)), food: 0, safety: 25, prosperity: 18, infrastructure: 0, growth: 0 })
  }
  function act(state, kind, fn) {
    const before = state.worldTime, monsterBefore = state.threat.monsterPopulation, result = fn()
    const monsterDelta = state.threat.monsterPopulation - monsterBefore
    actionRows.push({ scenario: currentScenario, seed: currentSeed, day: Math.floor(before/D), characterId: state.activeCharacterId, kind, result: typeof result === 'string' ? result : result, success: result === '' || result === true, monsterDelta,
      worldTimeBefore: before, worldTimeAfter: state.worldTime, simulatedMinutesElapsed: state.worldTime - before })
    if (kind === 'combat-attack' && monsterDelta < 0 && currentBalance) currentBalance.playerCombatRelief += -monsterDelta
    if (result === '' || result === true) lastActivityByCharacter.set(state.activeCharacterId, kind)
    return result
  }
  let currentScenario = '', currentSeed = 0, currentBalance = null
  let trackedState = null
  let currentNpcBossMemoryKeys = new Set()
  globalThis.__phase8CaptureDailyBudget = (state, inputs) => {
    if (state === trackedState) globalThis.__phase8DailyBudgetContext = inputs
  }
  globalThis.__phase8ObserveSimulation = (state, before, after) => {
    if (state !== trackedState) return
    if (!currentBalance) throw new Error('simulation advanced without an active daily budget')
    currentBalance.simulatedMinutes += after - before
    currentBalance.simulationCalls++
  }
  globalThis.__phase8ObserveDailyBudget = (state, snapshot, inputs) => {
    if (state !== trackedState) return
    if (!currentBalance || !inputs) throw new Error('daily tick was not captured by budget instrumentation')
    currentBalance.days++
    currentBalance.growthAdded += inputs.growthRate
    currentBalance.guardReduction += inputs.guards * guardCoefficient
    const crisisResolved = state.regionalCrisis.resolvedAt != null && state.regionalCrisis.resolvedAt !== snapshot.crisisResolvedAt
    const crisisDelta = crisisResolved ? state.regionalCrisis.resolutionSummary?.applied.monsterPopulation ?? 0 : 0
    currentBalance.crisisOutcomeDelta += crisisDelta
    const expectedDaily = Math.max(0, Math.min(100, inputs.monsterPopulationBefore + inputs.growthRate - inputs.guards * guardCoefficient)) - inputs.monsterPopulationBefore
    currentBalance.passiveResidualDelta += state.threat.monsterPopulation - inputs.monsterPopulationBefore - expectedDaily - crisisDelta
    currentBalance.threatBandDays[state.threat.threatLevel]++
    const pop = state.threat.monsterPopulation
    currentBalance.monsterPopulationDays[pop >= 100 ? '100' : `${Math.floor(pop / 25) * 25}-${Math.floor(pop / 25) * 25 + 24}`]++
    const safety = state.settlement.safety
    currentBalance.safetyDays[safety <= 25 ? '0-25' : safety <= 50 ? '26-50' : safety <= 75 ? '51-75' : '76-100']++
    if (safety <= 25) currentBalance.safetyFloorDays++
    for (const memory of state.life.worldMemories.filter(entry => entry.kind === 'GOBLIN_CHIEF_DEFEATED'
      && !state.characters.some(character => character.id === entry.actorId))) {
      const key = `${memory.actorId}:${memory.at}`
      if (!currentNpcBossMemoryKeys.has(key)) { currentNpcBossMemoryKeys.add(key); currentBalance.npcBossDefeats++ }
    }
  }
  const lastActivityByCharacter = new Map()
  const lastHarvestByState = new WeakMap()
  const pendingSaleByState = new WeakMap()
  function lifeStep(state, donatedCrises = new Set()) {
    const p = player(state)
    if (!p.isAlive || state.combat || state.dungeon.inDungeon) return
    if (p.stamina < 30) {
      if (p.currentRegion !== 'village') act(state, 'walk-to-settlement-rest', () => walkTo(state, BUILDINGS.house.position))
      else act(state, 'rest', () => rest(state, 'rest'))
      return
    }
    const crisis = state.regionalCrisis
    if (!donatedCrises.has(crisis.id) && ['warning','preparation'].includes(crisis.phase) && p.inventory.food > 0) {
      const currentReadiness = deriveCivilDefense(state, crisis)
      if (!currentReadiness || currentReadiness.food.shortage < 5) { donatedCrises.add(crisis.id) }
      else {
      const handoff = { x: 10, y: 10 }
      if (p.currentRegion !== 'village' || distance(p.position, handoff) > 2) {
        act(state, 'walk-to-crisis-handoff', () => walkTo(state, handoff)); return
      }
      const before = currentReadiness.readiness
      const result = act(state, 'player-food-donation', () => contributeCrisisFood(state, crisis.id, 1))
      const after = deriveCivilDefense(state, state.regionalCrisis)?.readiness ?? null
      donationRows.push({ scenario: currentScenario, seed: currentSeed, crisisId: crisis.id, day: Math.floor(state.worldTime/D), units: 1,
        outcome: result === '' ? 'success' : 'rejected', rejection: result || null, readinessBefore: before, readinessAfter: after,
        readinessDelta: before !== null && after !== null ? after - before : null,
        suppliedFood: state.regionalCrisis.contributions.food.supplied })
      donatedCrises.add(crisis.id)
      if (result === '') return
      }
    }
    if (Math.floor(state.worldTime/D) % 30 !== 2) return
    const mature = state.crops.find(crop => crop.status === 'mature')
    if (mature) {
      if (p.currentRegion !== 'farmland') { const target = fieldTarget(state); if (target) act(state, 'walk-to-farm', () => walkTo(state, target)); return }
      const selectedCrop = farmCropChoices(state).find(choice => choice.id === mature.cropId)
      const goodBefore = selectedCrop?.harvestGoodId ? (state.reward.materials[p.id]?.[selectedCrop.harvestGoodId] ?? 0) : 0
      const result = act(state, 'farm-harvest', () => farm(state, 'harvest'))
      if (result === '' && currentScenario === 'life-seasonal-sell' && selectedCrop?.harvestGoodId) {
        lastHarvestByState.set(state, { crop: selectedCrop.id, goodId: selectedCrop.harvestGoodId, amount: (state.reward.materials[p.id]?.[selectedCrop.harvestGoodId] ?? 0) - goodBefore,
          growthMinutes: selectedCrop.growthMinutes, sellEach: selectedCrop.sell, foodEach: selectedCrop.foodValue, legalSeasons: selectedCrop.seasons })
      }
      return
    }
    if (!state.crops.length && !state.preparedPlots) {
      if (p.currentRegion !== 'farmland') { const target = fieldTarget(state); if (target) act(state, 'walk-to-farm', () => walkTo(state, target)); return }
      const choices = farmCropChoices(state).filter(choice => choice.status === 'available')
      const crop = currentScenario === 'life-seasonal-sell'
        ? choices.filter(choice => choice.id !== 'wheat').sort((a,b) => b.sell * b.harvestAmount / b.growthMinutes - a.sell * a.harvestAmount / a.growthMinutes)[0]
        : choices.find(choice => choice.id === 'wheat' || choice.status === 'available')
      if (!crop) return
      act(state, 'farm-prepare', () => farm(state, 'prepare')); return
    }
    if (state.preparedPlots) {
      if (p.currentRegion !== 'farmland') { const target = fieldTarget(state); if (target) act(state, 'walk-to-farm', () => walkTo(state, target)); return }
      const choices = farmCropChoices(state).filter(choice => choice.status === 'available')
      const crop = currentScenario === 'life-seasonal-sell'
        ? choices.filter(choice => choice.id !== 'wheat').sort((a,b) => b.sell * b.harvestAmount / b.growthMinutes - a.sell * a.harvestAmount / a.growthMinutes)[0]
        : choices.find(choice => choice.id === 'wheat' || choice.status === 'available')
      if (!crop) return
      act(state, `farm-plant:${crop.id}`, () => farm(state, 'plant', crop.id))
    }
  }
  function adventureStep(state, completedCycles) {
    const p = player(state)
    const day = Math.floor(state.worldTime/D), cycle = Math.floor(day/60)
    if (!p.isAlive || state.dungeon.inDungeon || cycle < 1 || completedCycles.has(cycle)) return
    if (state.combat) {
      act(state, 'combat-attack', () => combatTurn(state, 'attack'))
      if (!state.combat) completedCycles.add(cycle)
      return
    }
    if (p.stamina < 8) {
      if (p.currentRegion !== 'village') act(state, 'walk-to-settlement-rest', () => walkTo(state, BUILDINGS.house.position))
      else act(state, 'rest', () => rest(state, 'rest'))
      return
    }
    if (p.currentRegion !== 'forest') { const target = forestTarget(state); if (target) act(state, 'walk-to-forest', () => walkTo(state, target)); return }
    const result = act(state, 'encounter', () => encounter(state))
    if (result === '') {
      for (let turns = 0; state.combat && turns < 20 && p.isAlive; turns++) act(state, 'combat-attack', () => combatTurn(state, 'attack'))
      if (!state.combat) completedCycles.add(cycle)
    } else completedCycles.add(cycle)
  }
  function checkpoint(state, scenario, seed, year, seenCrises) {
    const raw = serialize(state, Math.floor(state.worldTime))
    const loaded = deserialize(raw).state
    const equal = JSON.stringify(loaded) === JSON.stringify(state)
    let continuationEqual = false
    if (equal) {
      const liveNext = structuredClone(state), loadedNext = structuredClone(loaded)
      simulate(liveNext, D); simulate(loadedNext, D)
      continuationEqual = JSON.stringify(liveNext) === JSON.stringify(loadedNext)
    }
    const recent = [...seenCrises.values()]
    const row = { scenario, seed, year, day: Math.floor(state.worldTime/D), population: population(state), livingNpcs: state.npcs.filter(n=>n.isAlive).length,
      livingCharacters: state.characters.filter(c=>c.isAlive).length, settlementStage: state.settlement.stage, food: state.settlement.food,
      prosperity: state.settlement.prosperity, safety: state.settlement.safety, infrastructure: state.settlement.infrastructure,
      threatLevel: state.threat.threatLevel, monsterPopulation: state.threat.monsterPopulation, bossAlive: state.threat.bossAlive,
      bossProgress: state.threat.bossProgress, crisisSequence: state.regionalCrisis.sequence, crisisPhase: state.regionalCrisis.phase,
      crisisCount: recent.length, crisisOutcomes: recent.filter(c=>c.outcome).length, playerGold: player(state).gold,
      playerAlive: player(state).isAlive, unresolvedPlayerDeath: !player(state).isAlive, activeCharacterId: state.activeCharacterId, characters: state.characters.length,
      bossSpawns: state.history.filter(event=>event.type==='boss.spawned').length,
      bossDefeats: state.history.filter(event=>event.type==='boss.defeated'||event.type==='boss.killed').length,
      saveBytes: Buffer.byteLength(raw), saveReloadEqual: equal, continuationEqual, historyEvents: state.history.length }
    checkpoints.push(row); return row
  }

  for (const scenario of scenarios) for (const seed of seeds) {
    console.log(JSON.stringify({ phase: 'world-start', scenario, seed, years: runYears }))
    currentScenario = scenario; currentSeed = seed
    const state = createGame(seed); trackedState = state; fixture(state, scenario)
    if (growthRate !== null) state.threat.growthRate = growthRate
    const seenCrises = new Map(), donatedCrises = new Set(), completedAdventureCycles = new Set(); let lastCrisisKey = ''
    const horizons = new Set(years)
    const endAt = 360 * runYears * D
    lastActivityByCharacter.set(state.activeCharacterId, 'idle/start')
    currentBalance = { scenario, seed, startWorldTime: state.worldTime, endAt, days: 0, simulatedMinutes: 0, simulationCalls: 0,
      growthAdded: 0, guardReduction: 0, crisisOutcomeDelta: 0, passiveResidualDelta: 0, playerCombatRelief: 0, npcBossDefeats: 0,
      threatBandDays: [0,0,0,0], monsterPopulationDays: { '0-24':0, '25-49':0, '50-74':0, '75-99':0, '100':0 },
      safetyDays: { '0-25':0, '26-50':0, '51-75':0, '76-100':0 }, safetyFloorDays: 0 }
    const seenNpcBossMemories = new Set()
    currentNpcBossMemoryKeys = seenNpcBossMemories
    while (state.worldTime < endAt) {
      const priorNpcBossKeys = new Set(state.life.worldMemories.filter(memory => memory.kind === 'GOBLIN_CHIEF_DEFEATED'
        && !state.characters.some(character => character.id === memory.actorId)).map(memory => `${memory.actorId}:${memory.at}`))
      simulate(state, Math.min(D, endAt - state.worldTime))
      for (const memory of state.life.worldMemories.filter(entry => entry.kind === 'GOBLIN_CHIEF_DEFEATED'
        && !state.characters.some(character => character.id === entry.actorId))) {
        const key = `${memory.actorId}:${memory.at}`
        if (!priorNpcBossKeys.has(key) && !seenNpcBossMemories.has(key)) { seenNpcBossMemories.add(key); currentBalance.npcBossDefeats++ }
      }
      for (const character of state.characters.filter(candidate => !candidate.isAlive && candidate.deathCause && !deaths.some(row => row.scenario === scenario && row.seed === seed && row.characterId === candidate.id))) {
        const activity = character.deathCause === '自然老化' ? `annual aging tick during simulation; no player action; active policy=${scenario}` : lastActivityByCharacter.get(character.id) ?? 'world simulation (passive event)'
        const death = { scenario, seed, characterId: character.id, name: character.name, cause: character.deathCause, age: character.age, year: character.deathYear, day: Math.floor(state.worldTime/D), activity }
        deaths.push(death)
        if (character.id === state.activeCharacterId && ['life-focused', 'adventure-focused', 'mixed', 'life-seasonal-sell'].includes(scenario)) {
          const heir = state.npcs.find(npc => npc.isAlive && npc.age >= 15)
          if (heir && sim.chooseSuccessor(state, heir.id)) {
            successions.push({ scenario, seed, deceasedId: character.id, successorId: heir.id, successorAge: heir.age, day: Math.floor(state.worldTime/D), policyContinued: true })
            lastActivityByCharacter.set(heir.id, 'successor/continued-policy')
          }
        }
      }
      const crisis = state.regionalCrisis
      if (crisis.sequence > 0) {
        let record = seenCrises.get(crisis.sequence)
        if (!record && crisis.phase !== 'dormant') {
          const readiness = deriveCivilDefense(state, crisis)
          record = { scenario, seed, sequence: crisis.sequence, id: crisis.id, triggeredAt: crisis.triggeredAt, severity: crisis.severity,
            cause: crisis.cause, readinessAtTrigger: readiness?.readiness ?? null, threatDemandAtTrigger: readiness?.threatDemand ?? null }
          seenCrises.set(crisis.sequence, record)
        }
        const key = `${crisis.sequence}:${crisis.phase}:${crisis.outcome ?? ''}`
        if (key !== lastCrisisKey && crisis.phase !== 'dormant') {
          transitions.push({ scenario, seed, sequence: crisis.sequence, phase: crisis.phase, at: state.worldTime,
            outcome: crisis.outcome ?? null, readiness: deriveCivilDefense(state, crisis)?.readiness ?? crisis.resolutionSummary?.readiness ?? null,
            contribution: structuredClone(crisis.contributions), summary: crisis.resolutionSummary ? structuredClone(crisis.resolutionSummary) : null,
            chiefOutcome: crisis.chiefOutcome })
          lastCrisisKey = key
        } else if (crisis.phase === 'dormant') lastCrisisKey = ''
        if (record && crisis.outcome && !record.outcome) Object.assign(record, { outcome: crisis.outcome, resolvedAt: crisis.resolvedAt,
          resolutionSummary: structuredClone(crisis.resolutionSummary), chiefOutcome: crisis.chiefOutcome,
          contributions: structuredClone(crisis.contributions) })
      }
      if (scenario === 'life-focused' || scenario === 'life-seasonal-sell' || scenario === 'mixed') lifeStep(state, donatedCrises)
      const harvest = lastHarvestByState.get(state)
      if (scenario === 'life-seasonal-sell' && harvest && !pendingSaleByState.has(state)) {
        pendingSaleByState.set(state, { ...harvest, harvestedDay: Math.floor(state.worldTime/D), goldBefore: player(state).gold })
        lastHarvestByState.delete(state)
      }
      if (scenario === 'life-seasonal-sell' && pendingSaleByState.has(state)) {
        const record = pendingSaleByState.get(state)
        if (player(state).currentRegion !== 'village') {
          const target = BUILDINGS.store.position
          act(state, 'walk-to-store', () => walkTo(state, target))
        } else if (distance(player(state).position, BUILDINGS.store.position) <= 2) {
          const amountBefore = state.reward.materials[player(state).id]?.[record.goodId] ?? 0
          const beforeGold = player(state).gold
          let sold = 0
          while ((state.reward.materials[player(state).id]?.[record.goodId] ?? 0) > 0) {
            const result = act(state, `sell-crop-good:${record.goodId}`, () => tradeMaterial(state, record.goodId))
            if (result !== '') break
            sold++
          }
          if (sold > 0) { record.goldProceeds = player(state).gold - beforeGold; record.amountBeforeSale = amountBefore; record.unitsSold = sold; record.soldDay = Math.floor(state.worldTime/D); cropSales.push({ scenario, seed, ...record }); pendingSaleByState.delete(state) }
        } else act(state, 'walk-to-store-handoff', () => walkTo(state, BUILDINGS.store.position))
      }
      if (scenario === 'adventure-focused' || scenario === 'mixed') adventureStep(state, completedAdventureCycles)
      const completedYears = [...horizons].filter(year => state.worldTime >= year * 360 * D).sort((a,b)=>a-b)
      for (const year of completedYears) { checkpoint(state, scenario, seed, year, seenCrises); horizons.delete(year) }
    }
    crisisRows.push(...seenCrises.values())
    currentBalance.endWorldTime = state.worldTime
    currentBalance.elapsedMinutes = state.worldTime - currentBalance.startWorldTime
    currentBalance.elapsedDays = currentBalance.elapsedMinutes / D
    currentBalance.expectedDailyTicks = Math.floor(state.worldTime / D) - Math.floor(currentBalance.startWorldTime / D)
    currentBalance.simulatedMinutesCovered = currentBalance.simulatedMinutes === currentBalance.elapsedMinutes
    currentBalance.dailyTicksCovered = currentBalance.days === currentBalance.expectedDailyTicks
    const rawCrisisDelta = [...seenCrises.values()].reduce((sum, row) => sum + (row.resolutionSummary?.applied.monsterPopulation ?? 0), 0)
    currentBalance.crisisOutcomeDeltaFromRaw = rawCrisisDelta
    currentBalance.crisisDeltaReconciles = Math.abs(currentBalance.crisisOutcomeDelta - rawCrisisDelta) < 1e-9
    currentBalance.npcBossMemoryCount = seenNpcBossMemories.size
    currentBalance.averageGrowthPerDay = currentBalance.days ? currentBalance.growthAdded/currentBalance.days : null
    currentBalance.averageGuardReductionPerDay = currentBalance.days ? currentBalance.guardReduction/currentBalance.days : null
    dailyBalanceRows.push({ ...currentBalance })
    if (!currentBalance.simulatedMinutesCovered || !currentBalance.dailyTicksCovered || !currentBalance.crisisDeltaReconciles) {
      throw new Error(`incomplete budget accounting for ${scenario} seed ${seed}: ${JSON.stringify({ minutes: currentBalance.simulatedMinutesCovered, ticks: currentBalance.dailyTicksCovered, crisis: currentBalance.crisisDeltaReconciles })}`)
    }
    console.log(JSON.stringify({ phase: 'world-complete', scenario, seed, checkpoints: checkpoints.filter(row => row.scenario === scenario && row.seed === seed).length, deaths: deaths.filter(row => row.scenario === scenario && row.seed === seed).length }))
  }
} finally { if (vite) await vite.close() }

const validity = validateWorldRun({ seeds, years, scenarios, checkpoints, transitions })
const summaries = Object.fromEntries(scenarios.map(scenario => [scenario, Object.fromEntries(years.map(year => {
  const rows = crisisRows.filter(row => row.scenario === scenario && row.triggeredAt <= year * 360 * 1440)
  return [year, summarizeWorld(rows)]
}))]))
await writeFile(join(attempt, 'checkpoints.json'), JSON.stringify(checkpoints, null, 2)+'\n', { flag: 'wx' })
await writeFile(join(attempt, 'crisis-transitions.json'), JSON.stringify(transitions, null, 2)+'\n', { flag: 'wx' })
await writeFile(join(attempt, 'crises.json'), JSON.stringify(crisisRows, null, 2)+'\n', { flag: 'wx' })
await writeFile(join(attempt, 'actions.json'), JSON.stringify(actionRows, null, 2)+'\n', { flag: 'wx' })
await writeFile(join(attempt, 'player-donations.json'), JSON.stringify(donationRows, null, 2)+'\n', { flag: 'wx' })
await writeFile(join(attempt, 'deaths.json'), JSON.stringify(deaths, null, 2)+'\n', { flag: 'wx' })
await writeFile(join(attempt, 'successions.json'), JSON.stringify(successions, null, 2)+'\n', { flag: 'wx' })
await writeFile(join(attempt, 'crop-sales.json'), JSON.stringify(cropSales, null, 2)+'\n', { flag: 'wx' })
await writeFile(join(attempt, 'daily-balance.json'), JSON.stringify(dailyBalanceRows, null, 2)+'\n', { flag: 'wx' })
await writeFile(join(attempt, 'summary.json'), JSON.stringify({ validity, summaries, checkpointCount: checkpoints.length, crisisCount: crisisRows.length,
  transitionCount: transitions.length, actionCount: actionRows.length }, null, 2)+'\n', { flag: 'wx' })
console.log(JSON.stringify({ attempt, validity, checkpointCount: checkpoints.length, crisisCount: crisisRows.length, transitionCount: transitions.length, actionCount: actionRows.length }))
if (validity.status !== 'VALID') process.exitCode = 1
