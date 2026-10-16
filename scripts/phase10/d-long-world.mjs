import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const reportRoot = join(root, 'reports/v2/20261016-final-qa-rc/phase-10/d-runner')
const args = new Map(process.argv.slice(2).map(argument => {
  const [key, ...rest] = argument.replace(/^--/, '').split('=')
  return [key, rest.join('=')]
}))
const seeds = (args.get('seeds') ?? '40131,40132,40133').split(',').map(Number)
const years = (args.get('years') ?? '10,50,100').split(',').map(Number).sort((a, b) => a - b)
const dayMinutes = 1440
if (!seeds.length || seeds.some(seed => !Number.isSafeInteger(seed))
  || !years.length || years.some(year => !Number.isSafeInteger(year) || year < 1)) {
  throw new Error('seeds and years must be comma-separated positive safe integers')
}

const started = new Date()
const attemptName = `attempt-${started.toISOString().replaceAll(':', '').replaceAll('-', '').replaceAll('.', '')}`
const attempt = join(reportRoot, attemptName)
await mkdir(attempt, { recursive: true })

async function trackedSourceFingerprint() {
  const paths = execFileSync('git', ['ls-files', 'src'], { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean).sort()
  const rows = []
  for (const path of paths) {
    const bytes = await readFile(join(root, path))
    rows.push(`${path.replaceAll('\\', '/')}:${createHash('sha256').update(bytes).digest('hex')}`)
  }
  return { fileCount: paths.length, sha256: createHash('sha256').update(rows.join('\n')).digest('hex') }
}

const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const source = await trackedSourceFingerprint()
const manifest = {
  command: `node scripts/phase10/d-long-world.mjs ${process.argv.slice(2).join(' ')}`.trim(),
  startedAt: started.toISOString(), head, source,
  scenario: 'No Intervention', scenarioType: 'normal fresh-save; createGame(seed), no fixture overrides or player actions',
  horizon: 'Elapsed years from each fresh save: target worldTime = createGame(seed).worldTime + year * 360 * minutesPerDay.',
  seeds, years, dayMinutes,
  model: 'Public simulation.simulate() advanced to canonical day boundaries; serialize/deserialize at each horizon; compare one-day live and reloaded continuations.',
  comparedState: 'Full GameState JSON, including rngState, worldTime, reward, characters, NPCs, crisis state, events and history. Save lastSavedAt is fixed at 0 and is persistence metadata, not game state.',
  referenceAudit: 'Explicit actor, party, property, arc/request, memory, crisis-contribution/recovery, and reward-owner references; strict deserialize validation also runs at every checkpoint.',
  runtime: { platform: process.platform, node: process.version },
}
await writeFile(join(attempt, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })

function actorReferenceExists(state, id) {
  if (state.characters.some(character => character.id === id) || state.npcs.some(npc => npc.id === id)) return true
  const historicalNpc = /^npc-([1-9]\d*)$/.exec(id)
  return !!historicalNpc && Number(historicalNpc[1]) < state.nextNpcId
}

function orphanReferences(state) {
  const orphans = []
  const characterIds = new Set(state.characters.map(character => character.id))
  const npcIds = new Set(state.npcs.map(npc => npc.id))
  const arcIds = new Set(state.life.arcs.map(arc => arc.id))
  const add = (path, id) => orphans.push({ path, id })

  if (!characterIds.has(state.activeCharacterId)) add('activeCharacterId', state.activeCharacterId)
  state.party.forEach((member, index) => { if (!npcIds.has(member.npcId)) add(`party[${index}].npcId`, member.npcId) })
  Object.keys(state.life.characters).forEach(id => { if (!characterIds.has(id)) add(`life.characters.${id}`, id) })
  Object.keys(state.life.npcs).forEach(id => { if (!actorReferenceExists(state, id)) add(`life.npcs.${id}`, id) })
  state.life.properties.forEach((property, index) => { if (!characterIds.has(property.ownerId)) add(`life.properties[${index}].ownerId`, property.ownerId) })
  state.life.arcs.forEach((arc, index) => arc.participants.forEach(id => {
    if (!actorReferenceExists(state, id)) add(`life.arcs[${index}].participants`, id)
  }))
  state.life.requests.forEach((request, index) => {
    if (request.npcId && !actorReferenceExists(state, request.npcId)) add(`life.requests[${index}].npcId`, request.npcId)
    if (request.arcId && !arcIds.has(request.arcId)) add(`life.requests[${index}].arcId`, request.arcId)
  })
  const memories = [
    ...state.life.settlementMemories.map((memory, index) => ({ path: `life.settlementMemories[${index}]`, id: memory.actorId })),
    ...state.life.worldMemories.map((memory, index) => ({ path: `life.worldMemories[${index}]`, id: memory.actorId })),
    ...Object.entries(state.life.npcs).flatMap(([npcId, life]) => life.memories.map((memory, index) => ({ path: `life.npcs.${npcId}.memories[${index}]`, id: memory.actorId }))),
  ]
  memories.forEach(({ path, id }) => { if (!actorReferenceExists(state, id)) add(path, id) })
  const crisis = state.regionalCrisis
  if ('contributions' in crisis) {
    crisis.contributions.food.credits.forEach((credit, index) => {
      if (!characterIds.has(credit.donorId)) add(`regionalCrisis.contributions.food.credits[${index}]`, credit.donorId)
    })
    crisis.contributions.gold.credits.forEach((credit, index) => {
      if (!characterIds.has(credit.donorId)) add(`regionalCrisis.contributions.gold.credits[${index}]`, credit.donorId)
    })
    crisis.contributions.equipment.forEach((item, index) => {
      if (!characterIds.has(item.donorId)) add(`regionalCrisis.contributions.equipment[${index}].donorId`, item.donorId)
      if (!actorReferenceExists(state, item.defenderNpcId)) add(`regionalCrisis.contributions.equipment[${index}].defenderNpcId`, item.defenderNpcId)
    })
    const summary = crisis.phase === 'aftermath' || crisis.phase === 'cooldown' ? crisis.resolutionSummary : null
    summary?.injuries.forEach((injury, index) => {
      if (!actorReferenceExists(state, injury.npcId)) add(`regionalCrisis.resolutionSummary.injuries[${index}]`, injury.npcId)
    })
    if (summary?.recovery.npcId && !actorReferenceExists(state, summary.recovery.npcId)) {
      add('regionalCrisis.resolutionSummary.recovery.npcId', summary.recovery.npcId)
    }
  }
  state.reward.instances.forEach((item, index) => {
    if (!actorReferenceExists(state, item.ownerId)) add(`reward.instances[${index}].ownerId`, item.ownerId)
  })
  return orphans
}

function checkpoint(state, seed, year, serialize, deserialize, simulate, population, crisisRecords) {
  const raw = serialize(state, 0)
  const loaded = deserialize(raw).state
  const saveReloadEqual = JSON.stringify(loaded) === JSON.stringify(state)
  let continuationEqual = false
  if (saveReloadEqual) {
    const liveNext = structuredClone(state)
    const loadedNext = structuredClone(loaded)
    simulate(liveNext, dayMinutes)
    simulate(loadedNext, dayMinutes)
    continuationEqual = JSON.stringify(liveNext) === JSON.stringify(loadedNext)
  }
  const active = state.characters.find(character => character.id === state.activeCharacterId)
  const crisis = state.regionalCrisis
  const outcomeCounts = { decisive_success: 0, costly_success: 0, setback: 0, local_defeat: 0 }
  const recoveryCounts = { not_required: 0, pending: 0, granted: 0, cancelled: 0 }
  const observedCrises = [...crisisRecords.values()].sort((left, right) => left.sequence - right.sequence)
  for (const row of observedCrises) {
    if (row.outcome && row.outcome in outcomeCounts) outcomeCounts[row.outcome]++
    if (row.recovery?.status && row.recovery.status in recoveryCounts) recoveryCounts[row.recovery.status]++
  }
  const latestCrisis = observedCrises.at(-1)
  const result = {
    seed, year, worldTime: state.worldTime, rngState: state.rngState,
    population: population(state), livingNpcs: state.npcs.filter(npc => npc.isAlive).length,
    livingCharacters: state.characters.filter(character => character.isAlive).length,
    settlement: { stage: state.settlement.stage, capacity: state.settlement.capacity, food: state.settlement.food,
      safety: state.settlement.safety, prosperity: state.settlement.prosperity, infrastructure: state.settlement.infrastructure, growth: state.settlement.growth },
    economy: { totalActorGold: [...state.characters, ...state.npcs].reduce((sum, actor) => sum + actor.gold, 0),
      activeCharacterGold: active?.gold ?? null, activeCharacterInventory: active ? { ...active.inventory } : null,
      materialUnits: Object.values(state.reward.materials).flatMap(owner => Object.values(owner)).reduce((sum, count) => sum + count, 0) },
    threat: { level: state.threat.threatLevel, monsterPopulation: state.threat.monsterPopulation, bossAlive: state.threat.bossAlive,
      bossProgress: state.threat.bossProgress, campLevel: state.threat.campLevel,
      bossSpawns: state.history.filter(event => event.type === 'boss.spawned').length,
      bossDefeats: state.history.filter(event => ['boss.defeated', 'boss.killed', 'wolf.boss.defeated', 'content.boss.defeated'].includes(event.type)).length },
    crisis: { sequence: crisis.sequence, phase: crisis.phase, outcome: latestCrisis?.outcome ?? null,
      cooldownUntil: crisis.cooldownUntil, observedCount: observedCrises.length,
      resolvedHistoryEvents: state.history.filter(event => event.type === 'regional-crisis.resolved').length,
      outcomeCounts, recoveryCounts, latestRecovery: latestCrisis?.recovery ?? null },
    history: { events: state.events.length, retainedHistory: state.history.length, eventSequence: state.eventSequence,
      successionEvents: state.history.filter(event => event.type === 'character.successor').length },
    succession: { characterRecords: state.characters.length, activeCharacterId: state.activeCharacterId,
      activeCharacterAlive: active?.isAlive ?? false, playerSuccessionPolicy: 'No Intervention; no player succession action is issued.' },
    inventoryState: { rewardInstances: state.reward.instances.length, rewardMaterialsOwners: Object.keys(state.reward.materials).length,
      openRequests: state.life.requests.filter(request => request.status === 'open').length, arcs: state.life.arcs.length },
    saveBytes: Buffer.byteLength(raw), saveReloadEqual, continuationEqual,
    orphanReferences: orphanReferences(state),
  }
  return result
}

let vite
const checkpoints = []
let runnerFailure = null
const progressPath = join(attempt, 'progress.jsonl')
const checkpointsPath = join(attempt, 'checkpoints.json')
await writeFile(progressPath, '', { flag: 'wx' })
await writeFile(checkpointsPath, '[]\n', { flag: 'wx' })
try {
  vite = await createServer({ configFile: false, root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error',
    optimizeDeps: { noDiscovery: true, include: [] } })
  const [simulation, save, data] = await Promise.all([
    vite.ssrLoadModule('/src/engine/simulation.ts'),
    vite.ssrLoadModule('/src/services/saveService.ts'),
    vite.ssrLoadModule('/src/data/config.ts'),
  ])
  const { createGame, simulate, population } = simulation
  const { serialize, deserialize } = save
  const minutesPerDay = data.CONFIG.minutesPerDay
  if (minutesPerDay !== dayMinutes) throw new Error(`unexpected canonical day length: ${minutesPerDay}`)

  for (const seed of seeds) {
    const state = createGame(seed)
    const startAt = state.worldTime
    const yearMinutes = 360 * minutesPerDay
    const horizons = new Set(years)
    const crisisRecords = new Map()
    const endAt = startAt + Math.max(...years) * yearMinutes
    await appendFile(progressPath, `${JSON.stringify({ phase: 'world-start', seed, years })}\n`)
    while (state.worldTime < endAt) {
      simulate(state, Math.min(minutesPerDay, endAt - state.worldTime))
      const crisis = state.regionalCrisis
      if (crisis.sequence > 0) {
        const previous = crisisRecords.get(crisis.sequence) ?? { sequence: crisis.sequence, outcome: null, recovery: null }
        const outcome = 'outcome' in crisis ? crisis.outcome : previous.outcome
        const recovery = (crisis.phase === 'aftermath' || crisis.phase === 'cooldown') && crisis.resolutionSummary
          ? { ...crisis.resolutionSummary.recovery } : previous.recovery
        crisisRecords.set(crisis.sequence, { ...previous, phase: crisis.phase, outcome, recovery, cooldownUntil: crisis.cooldownUntil })
      }
      const completedYears = [...horizons].filter(year => state.worldTime >= startAt + year * yearMinutes).sort((a, b) => a - b)
      for (const year of completedYears) {
        const row = checkpoint(state, seed, year, serialize, deserialize, simulate, population, crisisRecords)
        checkpoints.push(row)
        await writeFile(checkpointsPath, `${JSON.stringify(checkpoints, null, 2)}\n`)
        await appendFile(progressPath, `${JSON.stringify({ phase: 'checkpoint', seed, year, saveReloadEqual: row.saveReloadEqual,
          continuationEqual: row.continuationEqual, saveBytes: row.saveBytes, orphanCount: row.orphanReferences.length })}\n`)
        if (!row.saveReloadEqual || !row.continuationEqual || row.orphanReferences.length) {
          throw new Error(`checkpoint failed for seed ${seed}, year ${year}: ${JSON.stringify({ saveReloadEqual: row.saveReloadEqual,
            continuationEqual: row.continuationEqual, orphanReferences: row.orphanReferences })}`)
        }
        horizons.delete(year)
      }
    }
    await appendFile(progressPath, `${JSON.stringify({ phase: 'world-complete', seed, worldTime: state.worldTime })}\n`)
  }
} catch (error) {
  runnerFailure = { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null }
  await writeFile(join(attempt, 'failure.json'), `${JSON.stringify(runnerFailure, null, 2)}\n`, { flag: 'wx' })
} finally {
  if (vite) await vite.close()
}

const expectedCheckpoints = seeds.length * years.length
const result = { status: !runnerFailure && checkpoints.length === expectedCheckpoints
    && checkpoints.every(row => row.saveReloadEqual && row.continuationEqual && !row.orphanReferences.length) ? 'PASS' : 'FAIL', expectedCheckpoints,
  checkpointCount: checkpoints.length, seeds, years,
  allSaveReloadEqual: checkpoints.every(row => row.saveReloadEqual),
  allContinuationEqual: checkpoints.every(row => row.continuationEqual),
  orphanReferenceCount: checkpoints.reduce((sum, row) => sum + row.orphanReferences.length, 0),
  saveBytes: { min: Math.min(...checkpoints.map(row => row.saveBytes)), max: Math.max(...checkpoints.map(row => row.saveBytes)) },
}
const summaryPath = join(attempt, 'summary.json')
await writeFile(summaryPath, `${JSON.stringify({ ...result, failure: runnerFailure }, null, 2)}\n`, { flag: 'wx' })

const evidenceFiles = ['manifest.json', 'checkpoints.json', 'progress.jsonl', 'summary.json', ...(runnerFailure ? ['failure.json'] : [])]
const manifestRows = []
for (const name of evidenceFiles) {
  const bytes = await readFile(join(attempt, name))
  manifestRows.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}  ${bytes.length} bytes`)
}
await writeFile(join(attempt, 'manifest.sha256'), `${manifestRows.join('\n')}\n`, { flag: 'wx' })
console.log(JSON.stringify({ attempt: relative(root, attempt).replaceAll('\\', '/'), ...result, failure: runnerFailure }))
if (result.status !== 'PASS') process.exitCode = 1
