import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = '/workspace/plw-rpg'
const snapshotRoot = '/tmp/plw-rpg-qa-source-738bc00'
const sourceCommit = '738bc0010c549fa3fb2420437d171f5aa2a043a0'
const manifestPath = path.join(repoRoot, 'reports/playtests/20261004-deep-qa/baseline/manifest.json')
const outputDir = path.join(repoRoot, 'reports/playtests/20261004-deep-qa/balance')
const outputJson = path.join(outputDir, 'raw-runs.json')
const seedsDefault = [101, 202, 303, 404, 505, 606]
const horizonsDefault = [30, 120, 360]
const policyMaxIterations = 30000
const actionMaxCount = 50000
const sameRejectLimit = 3
const maxActionsInEncounter = 50
const traceMaxPerRun = 50000

const sourceFiles = [
  'src/data/config.ts',
  'src/domain/types.ts',
  'src/engine/actions.ts',
  'src/engine/calendar.ts',
  'src/engine/events.ts',
  'src/engine/random.ts',
  'src/engine/simulation.ts',
  'src/services/saveService.ts',
]
const cli = new Map()
for (let i = 2; i < process.argv.length; i++) {
  const raw = process.argv[i]
  const split = raw.indexOf('=')
  if (raw.startsWith('--') && split > 2) cli.set(raw.slice(2, split), raw.slice(split + 1))
  else if (raw.startsWith('--')) cli.set(raw.slice(2), 'true')
}
const smoke = cli.get('smoke') === 'true'
const seeds = (cli.get('seeds') || (smoke ? '101' : seedsDefault.join(','))).split(',').map(Number)
const horizons = (cli.get('days') || (smoke ? '30' : horizonsDefault.join(','))).split(',').map(Number)
const selectedStrategies = cli.get('strategies') || (smoke ? 'iron_mining_sale' : 'farming_sale,woodcutting_sale,stone_mining_sale,iron_mining_sale,combat_bare,combat_gear,combat_gear_hire_once')
const strategies = selectedStrategies.split(',').filter(Boolean)

function nowIso() { return new Date().toISOString() }
function sha256(value) { return createHash('sha256').update(value).digest('hex') }
function sum(list, mapper) { return list.reduce((total, value) => total + mapper(value), 0) }
function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
function stats(values) {
  if (!values.length) return { mean: null, median: null, min: null, max: null }
  return { mean: sum(values, x => x) / values.length, median: median(values), min: Math.min(...values), max: Math.max(...values) }
}
function csvCell(value) {
  const text = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  return '"' + text.replaceAll('"', '""') + '"'
}
function publishRecorded(filePath, body, producer) {
  const relative = path.relative(repoRoot, filePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('拒絕寫入 balance/ 範圍外：' + filePath)
  const result = spawnSync('python3', ['-B', 'scripts/recorded_reports.py', 'publish', relative, '--producer', producer], {
    cwd: repoRoot, input: body, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  })
  if (result.status !== 0) throw new Error('write_recorded 失敗 ' + relative + ': ' + (result.stderr || result.stdout || 'unknown error'))
  return { file: relative, bytes: Buffer.byteLength(body, 'utf8'), sha256: sha256(body) }
}
function safeNumbers(value, at = '$', seen = new Set()) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('非有限數值：' + at + '=' + value)
    return
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) safeNumbers(value[i], at + '[' + i + ']', seen)
  } else {
    for (const [key, child] of Object.entries(value)) safeNumbers(child, at + '.' + key, seen)
  }
}
function deepClone(value) { return JSON.parse(JSON.stringify(value)) }
function playerSnapshot(state, player) {
  return {
    worldTime: state.worldTime,
    gold: player.gold,
    hp: player.hp,
    maxHp: player.maxHp,
    stamina: player.stamina,
    maxStamina: player.maxStamina,
    alive: player.isAlive,
    position: { ...player.position },
    currentRegion: player.currentRegion,
    inventory: { ...player.inventory },
    equipment: { ...player.equipment },
    exp: player.exp,
    level: player.level,
    combat: state.combat ? { monsterId: state.combat.monsterId, hp: state.combat.hp, gold: state.combat.gold } : null,
    stage: state.settlement.stage,
    threat: state.threat.threatLevel,
    monsters: state.threat.monsterPopulation,
    party: state.party.map(p => ({ npcId: p.npcId, archetype: p.archetype, dailyWage: p.dailyWage, contractEnd: p.contractEnd })),
  }
}
function worldDigest(state) { return sha256(JSON.stringify(state)) }
function inventoryValue(state, ITEMS) {
  return Object.entries(state.characters.find(c => c.id === state.activeCharacterId).inventory)
    .reduce((total, [item, quantity]) => total + quantity * ITEMS[item].sell, 0)
}
function markWorth(state, ITEMS) {
  const c = state.characters.find(character => character.id === state.activeCharacterId)
  return c.gold + inventoryValue(state, ITEMS)
}
function minutesToNextDay(worldTime) {
  const mod = worldTime % 1440
  return mod === 0 ? 1440 : 1440 - mod
}
function manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) }
function expectedPathMinutes(state, destination, player) { return manhattan(player.position, destination) * 5 }
function finiteInt(value) { return Number.isSafeInteger(value) && value >= 0 }

const startedAt = nowIso()
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.sourceCommit !== sourceCommit) throw new Error('Baseline manifest sourceCommit 不符。')
const actualHashes = {}
for (const relative of sourceFiles) actualHashes[relative] = sha256(await readFile(path.join(snapshotRoot, relative)))
const expectedHashes = {}
for (const relative of sourceFiles) expectedHashes[relative] = manifest.sourceHashes[relative]
for (const relative of sourceFiles) {
  if (actualHashes[relative] !== expectedHashes[relative]) throw new Error('Snapshot hash 與 baseline 不符：' + relative)
}
const packageInfo = JSON.parse(await readFile(path.join(snapshotRoot, 'package.json'), 'utf8'))
const vitePackage = JSON.parse(await readFile(path.join(repoRoot, 'node_modules/vite/package.json'), 'utf8'))
const runnerPath = fileURLToPath(import.meta.url)
const server = await createServer({
  root: snapshotRoot,
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  clearScreen: false,
})
const engineLoadedAt = nowIso()
let results = []
let controlProbes = null
let engine
let actions
let save
let config
try {
  engine = await server.ssrLoadModule('/src/engine/simulation.ts')
  actions = await server.ssrLoadModule('/src/engine/actions.ts')
  save = await server.ssrLoadModule('/src/services/saveService.ts')
  config = await server.ssrLoadModule('/src/data/config.ts')
} catch (error) {
  await server.close()
  throw error
}
const { createGame, simulate, walkTo, player } = engine
const { farm, gather, rest, trade, equip, hire, encounter, combatTurn, usePotion, canVisit } = actions
const { BUILDINGS, CONFIG, ITEMS, EQUIPMENT } = config
const metadata = {
  ticket: 'QA-02',
  sourceCommit: sourceCommit,
  sourceRoot: snapshotRoot,
  sourceHashes: actualHashes,
  expectedBaselineHashes: expectedHashes,
  baselineBuildHashes: manifest.buildHashes,
  engineLoadedAt: engineLoadedAt,
  runnerPath: path.relative(repoRoot, runnerPath),
  runnerSha256: sha256(await readFile(runnerPath)),
  startedAt: startedAt,
  finishedAt: null,
  node: process.version,
  platform: process.platform,
  viteVersion: vitePackage.version,
  packageName: packageInfo.name,
  packageVersion: packageInfo.version,
  seedList: seeds,
  horizonDays: horizons,
  strategyList: strategies,
  policyGuards: { maxIterations: policyMaxIterations, maxActions: actionMaxCount, maxConsecutiveSameActionRefusals: sameRejectLimit, maxTurnsPerFight: maxActionsInEncounter },
  sourceUse: 'Vite SSR 從固定 snapshot 載入 pure engine TS；沒有讀取 mutable worktree src，沒有瀏覽器、網路、外掛、資料注入或新依賴。',
  harnessMethod: '正常樣本只呼叫 createGame/simulate/walkTo 與 actions.ts export 的公開動作；純讀取 state 欄位作策略決策/指標。除初始化、序列化回讀驗證與獨立拒絕控制外，不直接寫入遊戲狀態欄位。',
}
function newRun(state, seed, strategy, horizonDays, targetWorldTime, runKind = 'normal') {
  const c = player(state)
  const startWorldTime = state.worldTime
  const run = {
    runKind: runKind,
    seed: seed,
    strategy: strategy,
    horizonDays: horizonDays,
    startWorldTime: startWorldTime,
    targetWorldTime: targetWorldTime,
    state: state,
    startedAt: nowIso(),
    initial: playerSnapshot(state, c),
    initialNetWorth: markWorth(state, ITEMS),
    initialInventory: { ...c.inventory },
    initialGold: c.gold,
    iterations: 0,
    attempts: 0,
    acceptedActions: 0,
    refusedActions: 0,
    refusalReasons: {},
    actionMetrics: {},
    trace: [],
    traceTruncated: false,
    finiteGuardChecks: 0,
    transactions: [],
    snapshots: [],
    checks: [],
    flow: { gatheringGold: 0, saleGold: 0, combatGold: 0, purchases: 0, hireFees: 0, lodgingFees: 0, wages: 0, unclassifiedCash: 0 },
    production: { food: 0, wood: 0, stone: 0, iron: 0, material: 0 },
    consumed: { potion: 0 },
    combat: { encounters: 0, turns: 0, wins: 0, retreats: 0, hpLostNetMax: 0, goldReward: 0, xpGained: 0 },
    hireContracts: [],
    equipmentPurchases: [],
    gameMinutesByOperation: {},
    staminaSpentByOperation: {},
    staminaRestoredByOperation: {},
    maxSameReject: 0,
    lastRejectedAction: null,
    terminatedBy: null,
    saveReloadFailure: false,
    lastActionTime: startWorldTime,
    noProgressIterations: 0,
  }
  run.snapshots.push({ elapsedGameMinutes: 0, elapsedGameDays: 0, label: 'start', ...playerSnapshot(state, c), netWorth: markWorth(state, ITEMS) })
  return run
}
function maybeSnapshot(run) {
  const elapsed = run.state.worldTime - run.startWorldTime
  const slot = Math.floor(elapsed / (30 * 1440))
  const lastSlot = run.snapshots.filter(s => s.label === 'periodic').length
  if (slot > lastSlot) {
    const c = player(run.state)
    run.snapshots.push({ elapsedGameMinutes: elapsed, elapsedGameDays: elapsed / 1440, nominalCheckpointDays: slot * 30, label: 'periodic', ...playerSnapshot(run.state, c), netWorth: markWorth(run.state, ITEMS) })
  }
}
function addActionMetrics(run, name, accepted, minutes, staminaDelta, goldDelta) {
  if (!run.actionMetrics[name]) run.actionMetrics[name] = { attempts: 0, accepted: 0, refused: 0, minutes: 0, staminaSpent: 0, staminaRestored: 0, goldDelta: 0 }
  const metric = run.actionMetrics[name]
  metric.attempts++
  if (accepted) metric.accepted++
  else metric.refused++
  metric.minutes += minutes
  metric.staminaSpent += Math.max(0, staminaDelta)
  metric.staminaRestored += Math.max(0, -staminaDelta)
  metric.goldDelta += goldDelta
  run.gameMinutesByOperation[name] = (run.gameMinutesByOperation[name] || 0) + minutes
  run.staminaSpentByOperation[name] = (run.staminaSpentByOperation[name] || 0) + Math.max(0, staminaDelta)
  run.staminaRestoredByOperation[name] = (run.staminaRestoredByOperation[name] || 0) + Math.max(0, -staminaDelta)
}
function action(run, name, fn, meta = {}) {
  if (run.attempts >= actionMaxCount) {
    run.terminatedBy = 'action_limit_' + actionMaxCount
    return { accepted: false, result: 'harness action guard reached' }
  }
  run.attempts++
  const state = run.state
  const beforePlayer = player(state)
  const before = playerSnapshot(state, beforePlayer)
  const beforeGold = beforePlayer.gold
  const beforeStamina = beforePlayer.stamina
  const beforeInventory = { ...beforePlayer.inventory }
  const beforeCombat = state.combat ? { ...state.combat } : null
  const beforeTime = state.worldTime
  let result
  try {
    result = fn()
  } catch (error) {
    run.terminatedBy = 'engine_exception:' + String(error && error.message || error)
    run.refusedActions++
    run.refusalReasons[run.terminatedBy] = (run.refusalReasons[run.terminatedBy] || 0) + 1
    const entry = { index: run.attempts, action: name, accepted: false, reason: run.terminatedBy, startWorldTime: beforeTime, endWorldTime: state.worldTime }
    if (run.trace.length < traceMaxPerRun) run.trace.push(entry)
    safeNumbers(state)
    run.finiteGuardChecks++
    return { accepted: false, result: run.terminatedBy }
  }
  const accepted = result === '' || result === true
  const errorText = accepted ? null : typeof result === 'string' ? result : result === false ? '回傳 false' : '未接受結果'
  const afterPlayer = player(state)
  const afterTime = state.worldTime
  const afterGold = afterPlayer.gold
  const directCash = accepted ? (typeof meta.directCash === 'function' ? meta.directCash(before, afterPlayer, state, beforeCombat) : meta.directCash || 0) : 0
  const residualCash = afterGold - beforeGold - directCash
  const minutes = afterTime - beforeTime
  const staminaDelta = beforeStamina - afterPlayer.stamina
  const goldDelta = afterGold - beforeGold
  addActionMetrics(run, name, accepted, minutes, staminaDelta, goldDelta)
  if (accepted) {
    run.acceptedActions++
    if (meta.flow === 'gatheringGold') run.flow.gatheringGold += directCash
    if (meta.flow === 'saleGold') run.flow.saleGold += directCash
    if (meta.flow === 'combatGold') { run.flow.combatGold += directCash; run.combat.goldReward += directCash }
    if (meta.flow === 'purchase') run.flow.purchases += -directCash
    if (meta.flow === 'hire') run.flow.hireFees += -directCash
    if (meta.flow === 'lodging') run.flow.lodgingFees += -directCash
    if (meta.production) {
      for (const item of meta.production) run.production[item] += afterPlayer.inventory[item] - beforeInventory[item]
    }
    if (meta.consumesPotion) run.consumed.potion += beforeInventory.potion - afterPlayer.inventory.potion
    if (meta.combatEncounter) run.combat.encounters++
      if (meta.combatTurn) {
        run.combat.turns++
        const hpChange = afterPlayer.hp - before.hp
        if (hpChange < 0) run.combat.hpLostNetMax = Math.max(run.combat.hpLostNetMax, -hpChange)
        if (meta.command === 'run') run.combat.retreats++
      const won = meta.command === 'attack' && beforeCombat && !state.combat && afterPlayer.isAlive && afterPlayer.inventory.material > beforeInventory.material
      if (won) run.combat.wins++
      if (won) run.combat.xpGained += meta.rewardExp || 0
      if (meta.transaction) run.transactions.push(meta.transaction(before, afterPlayer, state, beforeCombat, afterTime))
    }
    if (meta.transaction && !meta.combatTurn) run.transactions.push(meta.transaction(before, afterPlayer, state, beforeCombat, afterTime))
    if (meta.hireContract) {
      const contract = state.party.find(p => p.npcId === meta.hireContract.npcId)
      if (contract) {
        const detail = { ...meta.hireContract, archetype: contract.archetype, dailyWage: contract.dailyWage, contractEnd: contract.contractEnd, durationFromActionStartMinutes: contract.contractEnd - beforeTime, actionStartWorldTime: beforeTime, actionEndWorldTime: afterTime, actionMinutes: minutes }
        run.hireContracts.push(detail)
      }
    }
    if (meta.equipmentPurchase) {
      const entry = { ...meta.equipmentPurchase, actionStartWorldTime: beforeTime, actionEndWorldTime: afterTime, actionMinutes: minutes, cashBefore: beforeGold, cashAfter: afterGold, staminaBefore: beforeStamina, staminaAfter: afterPlayer.stamina }
      run.equipmentPurchases.push(entry)
    }
    if (residualCash < 0) run.flow.wages += -residualCash
    else if (residualCash > 0) run.flow.unclassifiedCash += residualCash
    run.maxSameReject = 0
    run.lastRejectedAction = null
  } else {
    run.refusedActions++
    const reason = name + ': ' + errorText
    run.refusalReasons[reason] = (run.refusalReasons[reason] || 0) + 1
    run.maxSameReject = run.lastRejectedAction === name ? run.maxSameReject + 1 : 1
    run.lastRejectedAction = name
    if (run.maxSameReject >= sameRejectLimit) run.terminatedBy = 'repeated_action_refusal:' + name
  }
  const traceRow = {
    index: run.attempts,
    action: name,
    accepted: accepted,
    reason: errorText,
    startWorldTime: beforeTime,
    endWorldTime: afterTime,
    gameMinutes: minutes,
    staminaBefore: beforeStamina,
    staminaAfter: afterPlayer.stamina,
    staminaDelta: afterPlayer.stamina - beforeStamina,
    goldBefore: beforeGold,
    goldAfter: afterGold,
    goldDelta: goldDelta,
    expectedDirectCash: directCash,
    residualCashLikelyWageOrOther: residualCash,
    hpBefore: before.hp,
    hpAfter: afterPlayer.hp,
    positionBefore: before.position,
    positionAfter: { ...afterPlayer.position },
  }
  if (run.trace.length < traceMaxPerRun) run.trace.push(traceRow)
  else run.traceTruncated = true
  safeNumbers(state)
  run.finiteGuardChecks++
  maybeSnapshot(run)
  return { accepted: accepted, result: result, before: before, after: playerSnapshot(state, afterPlayer), gameMinutes: minutes, goldDelta: goldDelta, directCash: directCash }
}
function advance(run, requestedMinutes, label) {
  if (run.state.worldTime >= run.targetWorldTime || !player(run.state).isAlive) return false
  const minutes = Math.min(Math.max(0, Math.floor(requestedMinutes)), run.targetWorldTime - run.state.worldTime)
  if (minutes <= 0) return false
  const res = action(run, 'wait:' + label, () => { simulate(run.state, minutes); return true }, { flow: null })
  return res.accepted
}
function canSpendTime(run, minutes) { return minutes >= 0 && run.state.worldTime + minutes <= run.targetWorldTime }
function moveTo(run, destination, label) {
  const c = player(run.state)
  if (c.position.x === destination.x && c.position.y === destination.y) return true
  const estimate = expectedPathMinutes(run.state, destination, c)
  if (!canSpendTime(run, estimate)) return false
  const res = action(run, 'walkTo:' + label, () => walkTo(run.state, destination), { flow: null })
  return res.accepted
}
function waitMinutesToOpen(state, building, neededMinutes = 5) {
  const definition = BUILDINGS[building]
  const minuteOfDay = state.worldTime % 1440
  const openAt = definition.opens * 60
  const closeAt = definition.closes * 60
  if (minuteOfDay < openAt) return openAt - minuteOfDay
  if (minuteOfDay + neededMinutes <= closeAt) return 0
  return 1440 - minuteOfDay + openAt
}
function prepareWindow(run, building, neededMinutes) {
  const state = run.state
  const open = BUILDINGS[building]
  if (!state.settlement.buildings.includes(building)) return false
  const wait = waitMinutesToOpen(state, building, neededMinutes)
  if (!canSpendTime(run, wait + neededMinutes)) return false
  if (wait > 0 && !advance(run, wait, building + '_opening_hours')) return false
  return canVisit(state, building)
}
function routeMinutes(state, destination, fromPosition = player(state).position) { return manhattan(fromPosition, destination) * 5 }
function stateView(run, label, extra = {}) {
  const c = player(run.state)
  return { elapsedGameMinutes: run.state.worldTime - run.startWorldTime, elapsedGameDays: (run.state.worldTime - run.startWorldTime) / 1440, worldTime: run.state.worldTime, label: label, ...playerSnapshot(run.state, c), netWorth: markWorth(run.state, ITEMS), ...extra }
}
function recordWageTransactions(run) {
  // residualCash on every public action and passive time slice is the amount not
  // explained by that action's observed/contracted income or fee; negative values
  // arise from dailyTick party wages in the current public engine contract.
}
function checkSaveReload(run, label) {
  const before = JSON.stringify(run.state)
  const encoded = save.serialize(run.state, 0)
  const decoded = save.deserialize(encoded)
  const after = JSON.stringify(decoded.state)
  const passed = before === after && decoded.lastSavedAt === 0
  const check = { label: label, passed: passed, worldTime: run.state.worldTime, bytes: Buffer.byteLength(encoded, 'utf8'), stateSha256: sha256(before), decodedSha256: sha256(after), lastSavedAt: decoded.lastSavedAt }
  run.checks.push(check)
  if (!passed) {
    run.saveReloadFailure = true
    run.terminatedBy = 'save_reload_mismatch:' + label
    throw new Error('Save/reload 驗證失敗：' + label)
  }
  safeNumbers(decoded.state)
  return decoded.state
}
function recordSale(run, item, quantity, unitPrice, beforeTime, beforeGold, afterTime, afterGold) {
  run.transactions.push({ type: 'market_sale', item: item, quantity: quantity, unitPrice: unitPrice, total: quantity * unitPrice, startWorldTime: beforeTime, endWorldTime: afterTime, gameMinutes: afterTime - beforeTime, goldBefore: beforeGold, goldAfter: afterGold, staminaDelta: 0, store: 'store' })
}
function trySell(run, item, returnPosition, threshold = 10, maxUnits = 20) {
  const c = player(run.state)
  const available = Math.max(0, c.inventory[item] - run.initialInventory[item])
  if (available < threshold) return false
  const quantity = Math.min(available, maxUnits)
  const building = 'store'
  const storePos = BUILDINGS.store.position
  const go = routeMinutes(run.state, storePos)
  const back = returnPosition ? routeMinutes(run.state, returnPosition, storePos) : 0
  const predictedArrival = run.state.worldTime + go
  const wait = waitMinutesToOpen({ worldTime: predictedArrival, settlement: run.state.settlement }, building, quantity * 5)
  if (!canSpendTime(run, go + wait + quantity * 5 + back)) return false
  if (!moveTo(run, storePos, 'store_for_' + item)) return false
  if (!prepareWindow(run, building, quantity * 5)) return false
  const timeBefore = run.state.worldTime
  const goldBefore = player(run.state).gold
  let sold = 0
  for (let i = 0; i < quantity; i++) {
    if (run.attempts >= actionMaxCount || run.terminatedBy) break
    const price = ITEMS[item].sell
    const res = action(run, 'trade:sell:' + item, () => trade(run.state, item, false), { directCash: price, flow: 'saleGold' })
    if (!res.accepted) return false
    sold++
  }
  if (sold) recordSale(run, item, sold, ITEMS[item].sell, timeBefore, goldBefore, run.state.worldTime, player(run.state).gold)
  if (returnPosition && !run.terminatedBy) moveTo(run, returnPosition, 'return_after_sale_' + item)
  return sold > 0
}
function recoverStamina(run, minStamina = 10, minHp = 0) {
  const c = player(run.state)
  if (!c.isAlive) return false
  if (c.stamina >= minStamina && c.hp >= minHp) return true
  const home = BUILDINGS.house.position
  const walkNeed = routeMinutes(run.state, home)
  if (!canSpendTime(run, walkNeed + 60)) return false
  if (!moveTo(run, home, 'home_to_rest')) return false
  if (!run.state.worldTime || player(run.state).currentRegion !== 'village') return false
  const restResult = action(run, 'rest:free', () => rest(run.state, 'rest'), { flow: null })
  return restResult.accepted
}
function resourceStep(run, item) {
  const region = item === 'wood' ? 'forest' : 'mine'
  const destination = item === 'wood' ? { x: 5, y: 4 } : { x: 19, y: 5 }
  const skill = item === 'wood' ? 'woodcutting' : 'mining'
  const c = player(run.state)
  const requiredStamina = 10
  if (c.stamina < requiredStamina) return recoverStamina(run, requiredStamina, 0)
  const amount = 2 + Math.floor((c.skills[skill].level - 1) / 2)
  const actionMinutes = Math.max(15, 45 - c.skills[skill].level * 2)
  const moveNeed = routeMinutes(run.state, destination)
  if (!canSpendTime(run, moveNeed + actionMinutes)) return false
  if (!moveTo(run, destination, 'to_' + region)) return false
  if (run.state.regions[region].remainingAmount < amount) {
    const wait = Math.min(minutesToNextDay(run.state.worldTime), run.targetWorldTime - run.state.worldTime)
    return advance(run, wait, region + '_regeneration')
  }
  const beforeCount = player(run.state).inventory[item]
  const res = action(run, 'gather:' + item, () => gather(run.state, item), { directCash: 4, flow: 'gatheringGold', production: [item] })
  if (res.accepted && player(run.state).inventory[item] > beforeCount) {
    trySell(run, item, destination, 10, 20)
  }
  return res.accepted
}
function farmingStep(run) {
  const farmPosition = BUILDINGS.farm.position
  const c = player(run.state)
  if (c.stamina < 4) return recoverStamina(run, 4, 0)
  const moveNeed = routeMinutes(run.state, farmPosition)
  if (!canSpendTime(run, moveNeed + 10)) return false
  if (!moveTo(run, farmPosition, 'to_farmland')) return false
  if (run.state.crops.some(crop => crop.status === 'mature')) {
    if (c.stamina < 4) return recoverStamina(run, 4, 0)
    const before = c.inventory.food
    const res = action(run, 'farm:harvest', () => farm(run.state, 'harvest'), { flow: null, production: ['food'] })
    if (res.accepted && c.inventory.food > before) trySell(run, 'food', farmPosition, 10, 20)
    return res.accepted
  }
  if (run.state.preparedPlots > 0) {
    if (c.stamina < 4 || !canSpendTime(run, 10)) return recoverStamina(run, 4, 0)
    return action(run, 'farm:plant', () => farm(run.state, 'plant'), { flow: null }).accepted
  }
  if (run.state.crops.length < CONFIG.maxPlots) {
    if (c.stamina < 6 || !canSpendTime(run, 20)) return recoverStamina(run, 6, 0)
    return action(run, 'farm:prepare', () => farm(run.state, 'prepare'), { flow: null }).accepted
  }
  const nextMature = Math.min(...run.state.crops.filter(crop => crop.status === 'growing').map(crop => crop.matureAt))
  if (!Number.isFinite(nextMature)) return false
  return advance(run, Math.max(1, nextMature - run.state.worldTime), 'crop_maturity')
}
function transactionForTrade(item, buying, stage, time, price, goldBefore) {
  return function transaction(before, after, state, combatBefore, endTime) {
    return { type: buying ? 'market_purchase' : 'market_sale', item: item, buying: buying, settlementStage: stage, unitPrice: price, quantity: 1, total: price, startWorldTime: time, endWorldTime: endTime, gameMinutes: endTime - time, goldBefore: goldBefore, goldAfter: after.gold, staminaBefore: before.stamina, staminaAfter: after.stamina, inventoryBefore: before.inventory[item], inventoryAfter: after.inventory[item], shop: item === 'sword' || item === 'armor' ? 'blacksmith' : 'store' }
  }
}
function purchaseEquipment(run) {
  const state = run.state
  const c = player(state)
  if (state.settlement.stage === 'hamlet' || !state.settlement.buildings.includes('blacksmith')) return false
  const gear = ['sword', 'armor']
  const stageIndex = ['hamlet', 'village', 'town'].indexOf(state.settlement.stage)
  const currentPrice = item => Math.ceil(ITEMS[item].price * (stageIndex === 2 ? 0.8 : 1))
  const wanted = gear.filter(item => c.inventory[item] <= 0)
  if (!wanted.length) return true
  const total = wanted.reduce((value, item) => value + currentPrice(item), 0)
  if (c.gold < total) return false
  const shopPos = BUILDINGS.blacksmith.position
  const actionWindowMinutes = wanted.length * 5
  const go = routeMinutes(state, shopPos)
  const wait = waitMinutesToOpen({ worldTime: state.worldTime + go, settlement: state.settlement }, 'blacksmith', actionWindowMinutes)
  const forestBack = routeMinutes(state, { x: 5, y: 4 }, shopPos)
  if (!canSpendTime(run, go + wait + actionWindowMinutes + forestBack)) return false
  if (!moveTo(run, shopPos, 'to_blacksmith')) return false
  if (!prepareWindow(run, 'blacksmith', actionWindowMinutes)) return false
  for (const item of wanted) {
    const price = currentPrice(item)
    const stage = state.settlement.stage
    const time = state.worldTime
    const cash = c.gold
    const tx = transactionForTrade(item, true, stage, time, price, cash)
    const res = action(run, 'trade:buy:' + item, () => trade(state, item, true), { directCash: -price, flow: 'purchase', transaction: tx, equipmentPurchase: { item: item, price: price, settlementStage: stage, shop: 'blacksmith' } })
    if (!res.accepted) return false
    const beforeEquipped = c.equipment[item === 'sword' ? 'weapon' : 'armor']
    const equipRes = action(run, 'equip:' + item, () => equip(state, item), { flow: null })
    if (!equipRes.accepted) return false
    if (!beforeEquipped) {
      const latest = run.equipmentPurchases
      const bought = latest[latest.length - 1]
      if (bought) bought.equipped = true
    }
    checkSaveReload(run, 'after_equipment_' + item)
  }
  return true
}
function availableMercenaries(state) {
  return state.npcs.filter(n => n.job === 'mercenary' && n.isAlive && n.age >= 15 && n.injuredUntil <= state.worldTime && !state.party.some(p => p.npcId === n.id))
}
function hireDuo(run) {
  const state = run.state
  if (!state.settlement.buildings.includes('tavern') || state.settlement.stage === 'hamlet') return false
  const stageIndex = ['hamlet', 'village', 'town'].indexOf(state.settlement.stage)
  const fee = 20 + stageIndex * 5
  const c = player(state)
  if (state.party.length || c.gold < fee * 2) return false
  const tavernPos = BUILDINGS.tavern.position
  const go = routeMinutes(state, tavernPos)
  const openWait = waitMinutesToOpen({ worldTime: state.worldTime + go, settlement: state.settlement }, 'tavern', 20)
  const forestBack = routeMinutes(state, { x: 5, y: 4 }, tavernPos)
  if (!canSpendTime(run, go + openWait + 20 + forestBack)) return false
  if (!moveTo(run, tavernPos, 'to_tavern')) return false
  if (!prepareWindow(run, 'tavern', 20)) return false
  const pick = availableMercenaries(state).slice(0, 2)
  if (pick.length < 2) return false
  for (const npc of pick) {
    const hireFee = 20 + ['hamlet', 'village', 'town'].indexOf(state.settlement.stage) * 5
    const time = state.worldTime
    const gold = c.gold
    const startCount = state.party.length
    const tx = function(before, after, afterState, combatBefore, endTime) {
      const entry = afterState.party.find(contract => contract.npcId === npc.id)
      return { type: 'hire', npcId: npc.id, npcName: npc.name, archetype: entry ? entry.archetype : null, fee: hireFee, dailyWage: entry ? entry.dailyWage : null, contractEnd: entry ? entry.contractEnd : null, startWorldTime: time, endWorldTime: endTime, gameMinutes: endTime - time, cashBefore: gold, cashAfter: after.gold, staminaBefore: before.stamina, staminaAfter: after.stamina }
    }
    const res = action(run, 'hire:' + npc.id, () => hire(state, npc.id), { directCash: -hireFee, flow: 'hire', hireContract: { npcId: npc.id, npcName: npc.name, fee: hireFee, partySlotBefore: startCount }, transaction: tx })
    if (!res.accepted) return false
    checkSaveReload(run, 'after_hire_' + npc.id)
  }
  return state.party.length === 2
}
function regularCombatStep(run) {
  const state = run.state
  const c = player(state)
  if (!c.isAlive) return false
  if (state.combat) {
    let command = 'attack'
    if (c.hp <= c.maxHp * 0.55 && c.inventory.potion > 0) command = 'potion'
    else if (c.hp <= c.maxHp * 0.3 && c.inventory.potion <= 0) command = 'run'
    if (run.state.worldTime + (command === 'run' ? 10 : 1) > run.targetWorldTime) return false
    const beforeCombat = { ...state.combat }
    const directReward = beforeCombat.gold
    const res = action(run, 'combatTurn:' + command, () => combatTurn(state, command), {
      directCash: (before, after, afterState) => command === 'attack' && !afterState.combat && after.isAlive && after.inventory.material > before.inventory.material ? directReward : 0,
      flow: 'combatGold',
      command: command,
      combatTurn: true,
      rewardExp: beforeCombat.exp,
      consumesPotion: command === 'potion',
      production: command === 'attack' ? ['material'] : [],
      transaction: (before, after, afterState, combatAtStart, endTime) => ({ type: command === 'attack' && !afterState.combat && after.isAlive && after.inventory.material > before.inventory.material ? 'combat_win' : 'combat_turn', command: command, monster: beforeCombat.monsterId, monsterGold: beforeCombat.gold, startWorldTime: before.worldTime, endWorldTime: endTime, gameMinutes: endTime - before.worldTime, hpBefore: before.hp, hpAfter: after.hp, staminaBefore: before.stamina, staminaAfter: after.stamina, goldDelta: after.gold - before.gold, experienceDelta: command === 'attack' && !afterState.combat && after.isAlive && after.inventory.material > before.inventory.material ? beforeCombat.exp : 0 })
    })
    return res.accepted
  }
  if (c.hp < c.maxHp * 0.55 && c.inventory.potion > 0) {
    const before = c.inventory.potion
    return action(run, 'usePotion:recovery', () => usePotion(state), { consumesPotion: true }).accepted
  }
  if (c.stamina < 8 || c.hp < c.maxHp * 0.45) return recoverCombat(run)
  if (state.threat.monsterPopulation < 1) {
    return advance(run, Math.min(minutesToNextDay(state.worldTime), run.targetWorldTime - state.worldTime), 'threat_regeneration')
  }
  const forestPos = { x: 5, y: 4 }
  if (c.currentRegion !== 'forest' || c.position.x !== forestPos.x || c.position.y !== forestPos.y) {
    return moveTo(run, forestPos, 'combat_forest')
  }
  if (run.state.worldTime >= run.targetWorldTime) return false
  const result = action(run, 'encounter:wild', () => encounter(state), { combatEncounter: true })
  return result.accepted
}
function recoverCombat(run) {
  const state = run.state
  const c = player(state)
  const home = BUILDINGS.house.position
  if (c.hp < c.maxHp * 0.45 && c.inventory.potion > 0) return action(run, 'usePotion:recovery', () => usePotion(state), { consumesPotion: true }).accepted
  if (c.stamina < 8 || c.hp < c.maxHp * 0.45) {
    if (!moveTo(run, home, 'combat_home_to_rest')) return false
    if (c.currentRegion !== 'village') return false
    if (c.hp >= c.maxHp * 0.45 && c.stamina >= 8) return true
    return action(run, 'rest:free_combat', () => rest(state, 'rest'), { flow: null }).accepted
  }
  return true
}
function fightingCombatStep(run) {
  const state = run.state
  const c = player(state)
  if (!state.combat) return regularCombatStep(run)
  let turns = 0
  while (state.combat && turns < maxActionsInEncounter && c.isAlive && !run.terminatedBy) {
    const before = state.worldTime
    if (!regularCombatStep(run)) break
    turns++
    if (state.worldTime === before && !state.combat) break
    if (c.hp <= 0 || !c.isAlive) break
  }
  if (state.combat && c.isAlive && turns >= maxActionsInEncounter) {
    const res = action(run, 'combatTurn:guard_run', () => combatTurn(state, 'run'), { command: 'run', combatTurn: true, flow: null })
    return res.accepted
  }
  return true
}
function combatStep(run) {
  if (run.state.combat) return fightingCombatStep(run)
  return regularCombatStep(run)
}
function seedField(run, mode) {
  const state = run.state
  const c = player(state)
  if (mode === 'bare') return combatStep(run)
  if (!c.equipment.weapon || !c.equipment.armor) {
    if (state.settlement.stage !== 'hamlet' && state.settlement.buildings.includes('blacksmith')) {
      if (purchaseEquipment(run)) return true
      return resourceStep(run, 'iron')
    }
    return resourceStep(run, 'iron')
  }
  if (mode === 'hire_once' && !run.hireContracts.length) {
    if (state.party.length === 2) return combatStep(run)
    if (state.settlement.buildings.includes('tavern') && c.gold >= 2 * (20 + ['hamlet', 'village', 'town'].indexOf(state.settlement.stage) * 5)) {
      if (hireDuo(run)) return true
    }
    return resourceStep(run, 'iron')
  }
  return combatStep(run)
}
function classifyTerm(run) {
  if (!run.terminatedBy && run.attempts >= actionMaxCount) run.terminatedBy = 'action_limit_' + actionMaxCount
  if (!run.terminatedBy && run.iterations >= policyMaxIterations) run.terminatedBy = 'policy_iteration_limit_' + policyMaxIterations
}
function summarizeRun(run) {
  const state = run.state
  const c = player(state)
  const deathEvent = [...state.history, ...state.events].find(event => event.category === 'player' && event.type === 'npc.died')
  const elapsed = state.worldTime - run.startWorldTime
  const finalWorth = markWorth(state, ITEMS)
  const cashExpected = run.flow.gatheringGold + run.flow.saleGold + run.flow.combatGold - run.flow.purchases - run.flow.hireFees - run.flow.lodgingFees - run.flow.wages + run.flow.unclassifiedCash
  const netCashDelta = c.gold - run.initialGold
  const actionRows = Object.entries(run.actionMetrics)
  const activeActionGameMinutes = sum(actionRows.filter(([name]) => !name.startsWith('wait:')), ([, value]) => value.minutes)
  const passiveWaitGameMinutes = sum(actionRows.filter(([name]) => name.startsWith('wait:')), ([, value]) => value.minutes)
  const minutesForPrefix = prefix => sum(actionRows.filter(([name]) => name.startsWith(prefix)), ([, value]) => value.minutes)
  return {
    runKind: run.runKind,
    seed: run.seed,
    strategy: run.strategy,
    horizonDays: run.horizonDays,
    startedAt: run.startedAt,
    finishedAt: nowIso(),
    startWorldTime: run.startWorldTime,
    targetWorldTime: run.targetWorldTime,
    endWorldTime: state.worldTime,
    actualGameMinutes: elapsed,
    actualGameDays: elapsed / 1440,
    horizonReachedExactly: state.worldTime === run.targetWorldTime,
    maxActions: actionMaxCount,
    iterations: run.iterations,
    actionAttempts: run.attempts,
    acceptedActions: run.acceptedActions,
    refusedActions: run.refusedActions,
    refusalRate: run.attempts ? run.refusedActions / run.attempts : 0,
    refusalReasons: run.refusalReasons,
    terminatedBy: run.terminatedBy,
    death: { died: !c.isAlive, cause: deathEvent ? deathEvent.message : c.deathCause, atWorldTime: deathEvent ? deathEvent.at : c.isAlive ? null : state.worldTime },
    initial: run.initial,
    final: playerSnapshot(state, c),
    netWorth: { initial: run.initialNetWorth, final: finalWorth, change: finalWorth - run.initialNetWorth, perElapsedDay: elapsed ? (finalWorth - run.initialNetWorth) / (elapsed / 1440) : null },
    cash: { initial: run.initialGold, final: c.gold, change: netCashDelta, explainedChange: cashExpected, reconciliationDifference: netCashDelta - cashExpected, unclassifiedCash: run.flow.unclassifiedCash },
    moneyFlows: run.flow,
    production: run.production,
    inventorySellValue: inventoryValue(state, ITEMS),
    consumed: run.consumed,
    combat: { ...run.combat, deathRisk: !c.isAlive, encountersPerElapsedDay: elapsed ? run.combat.encounters / (elapsed / 1440) : 0 },
    hireContracts: run.hireContracts,
    equipmentPurchases: run.equipmentPurchases,
    actionMetrics: run.actionMetrics,
    gameMinutesByOperation: run.gameMinutesByOperation,
    activeActionGameMinutes: activeActionGameMinutes,
    travelGameMinutes: minutesForPrefix('walkTo:'),
    passiveWaitGameMinutes: passiveWaitGameMinutes,
    gatherGameMinutes: minutesForPrefix('gather:'),
    farmingGameMinutes: minutesForPrefix('farm:'),
    tradeGameMinutes: minutesForPrefix('trade:'),
    combatActionGameMinutes: minutesForPrefix('combatTurn:') + minutesForPrefix('encounter:'),
    hireActionGameMinutes: minutesForPrefix('hire:'),
    restActionGameMinutes: minutesForPrefix('rest:'),
    staminaSpentByOperation: run.staminaSpentByOperation,
    staminaRestoredByOperation: run.staminaRestoredByOperation,
    totalTimeSpentOnActionFunctions: sum(Object.values(run.actionMetrics), v => v.minutes),
    staminaSpent: sum(Object.values(run.actionMetrics), v => v.staminaSpent),
    staminaRestored: sum(Object.values(run.actionMetrics), v => v.staminaRestored),
    transactions: run.transactions,
    snapshots: run.snapshots,
    saveReloadChecks: run.checks,
    saveReloadAllPassed: run.checks.length > 0 && run.checks.every(x => x.passed),
    saveReloadFailure: run.saveReloadFailure,
    finiteGuardChecks: run.finiteGuardChecks,
    finiteGuardPassed: true,
    finalStateSha256: worldDigest(state),
    trace: run.trace,
    traceTruncated: run.traceTruncated,
  }
}
function makeEnd(run) {
  if (run.state.worldTime < run.targetWorldTime && player(run.state).isAlive && !run.terminatedBy) {
    advance(run, run.targetWorldTime - run.state.worldTime, 'horizon_remainder')
  } else if (run.state.worldTime < run.targetWorldTime && !player(run.state).isAlive) {
    const minutes = run.targetWorldTime - run.state.worldTime
    action(run, 'wait:after_death', () => { simulate(run.state, minutes); return true }, { flow: null })
  }
  checkSaveReload(run, 'final')
  classifyTerm(run)
  return summarizeRun(run)
}
function runNormal(seed, horizonDays, strategy) {
  const state = createGame(seed)
  const start = state.worldTime
  const target = start + horizonDays * CONFIG.minutesPerDay
  const run = newRun(state, seed, strategy, horizonDays, target)
  checkSaveReload(run, 'initial')
  let lastTime = state.worldTime
  let unchangedLoops = 0
  while (state.worldTime < target && player(state).isAlive && !run.terminatedBy) {
    run.iterations++
    if (run.iterations > policyMaxIterations) { run.terminatedBy = 'policy_iteration_limit_' + policyMaxIterations; break }
    const before = state.worldTime
    let progressed = false
    if (strategy === 'farming_sale') progressed = farmingStep(run)
    else if (strategy === 'woodcutting_sale') progressed = resourceStep(run, 'wood')
    else if (strategy === 'stone_mining_sale') progressed = resourceStep(run, 'stone')
    else if (strategy === 'iron_mining_sale') progressed = resourceStep(run, 'iron')
    else if (strategy === 'combat_bare') progressed = combatStep(run)
    else if (strategy === 'combat_gear') progressed = seedField(run, 'gear')
    else if (strategy === 'combat_gear_hire_once') progressed = seedField(run, 'hire_once')
    else throw new Error('Unknown strategy: ' + strategy)
    if (!progressed) {
      if (state.worldTime >= target) break
      if (run.terminatedBy) break
      unchangedLoops++
      if (unchangedLoops >= 3) { run.terminatedBy = 'policy_no_progress_guard'; break }
      if (state.worldTime < target) advance(run, target - state.worldTime, 'policy_no_action_budget')
      break
    }
    if (state.worldTime === before) unchangedLoops++
    else unchangedLoops = 0
    if (unchangedLoops > 20) { run.terminatedBy = 'policy_stall_guard'; break }
    lastTime = state.worldTime
  }
  if (!run.terminatedBy && state.worldTime < target) advance(run, target - state.worldTime, player(state).isAlive ? 'policy_remainder' : 'after_death')
  return makeEnd(run)
}
function makePolicyCsv(runs) {
  const columns = [
    'runKind','seed','strategy','horizonDays','startedAt','finishedAt','startWorldTime','targetWorldTime','endWorldTime','actualGameDays','horizonReachedExactly',
    'initialGold','finalGold','netCashChange','explainedCashChange','cashReconciliationDifference','initialNetWorth','finalNetWorth','netWorthChange','netWorthPerElapsedDay',
    'actionAttempts','acceptedActions','refusedActions','refusalRate','activeActionGameMinutes','travelGameMinutes','passiveWaitGameMinutes','gatherGameMinutes','farmingGameMinutes','tradeGameMinutes','combatActionGameMinutes','hireActionGameMinutes','restActionGameMinutes','gatheringGold','saleGold','combatGold','purchases','hireFees','lodgingFees','wages',
    'woodProduced','stoneProduced','ironProduced','foodProduced','materialProduced','staminaSpent','staminaRestored','combatEncounters','combatWins','combatRetreats','died','deathCause','partyContractCount','saveReloadAllPassed','terminatedBy','finalStateSha256'
  ]
  const lines = [columns.join(',')]
  for (const row of runs) {
    const r = row
    const values = [r.runKind,r.seed,r.strategy,r.horizonDays,r.startedAt,r.finishedAt,r.startWorldTime,r.targetWorldTime,r.endWorldTime,r.actualGameDays,r.horizonReachedExactly,
      r.cash.initial,r.cash.final,r.cash.change,r.cash.explainedChange,r.cash.reconciliationDifference,r.netWorth.initial,r.netWorth.final,r.netWorth.change,r.netWorth.perElapsedDay,
      r.actionAttempts,r.acceptedActions,r.refusedActions,r.refusalRate,r.activeActionGameMinutes,r.travelGameMinutes,r.passiveWaitGameMinutes,r.gatherGameMinutes,r.farmingGameMinutes,r.tradeGameMinutes,r.combatActionGameMinutes,r.hireActionGameMinutes,r.restActionGameMinutes,r.moneyFlows.gatheringGold,r.moneyFlows.saleGold,r.moneyFlows.combatGold,r.moneyFlows.purchases,r.moneyFlows.hireFees,r.moneyFlows.lodgingFees,r.moneyFlows.wages,
      r.production.wood,r.production.stone,r.production.iron,r.production.food,r.production.material,r.staminaSpent,r.staminaRestored,r.combat.encounters,r.combat.wins,r.combat.retreats,r.death.died,r.death.cause,r.hireContracts.length,r.saveReloadAllPassed,r.terminatedBy,r.finalStateSha256]
    lines.push(values.map(csvCell).join(','))
  }
  return lines.join('\n') + '\n'
}
function aggregateRows(runs) {
  const groups = new Map()
  for (const run of runs) {
    const key = run.horizonDays + 'd|' + run.strategy
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(run)
  }
  const result = []
  for (const [key, rows] of groups) {
    const net = rows.map(x => x.netWorth.change)
    const cash = rows.map(x => x.cash.change)
    const refusals = rows.map(x => x.refusalRate)
    const staminaUse = rows.map(x => x.staminaSpent)
    const wage = rows.map(x => x.moneyFlows.wages)
    result.push({
      key: key,
      horizonDays: rows[0].horizonDays,
      strategy: rows[0].strategy,
      seeds: rows.length,
      netWorthChange: stats(net),
      cashChange: stats(cash),
      actionMinutes: stats(rows.map(x => x.activeActionGameMinutes)),
      travelMinutes: stats(rows.map(x => x.travelGameMinutes)),
      passiveWaitMinutes: stats(rows.map(x => x.passiveWaitGameMinutes)),
      staminaSpent: stats(staminaUse),
      wages: stats(wage),
      refusalRate: stats(refusals),
      deaths: rows.filter(x => x.death.died).length,
      deathRate: rows.filter(x => x.death.died).length / rows.length,
      exactHorizons: rows.filter(x => x.horizonReachedExactly).length,
      saveReloadFailures: rows.filter(x => !x.saveReloadAllPassed).length,
      cashReconciliationFailures: rows.filter(x => Math.abs(x.cash.reconciliationDifference) > 0.001).length,
      unclassifiedCashRuns: rows.filter(x => Math.abs(x.moneyFlows.unclassifiedCash) > 0.001).length,
    })
  }
  return result
}
function makeSummaryMarkdown(meta, runs, contractTrials = []) {
  const groups = aggregateRows(runs)
  const horizonsSeen = [...new Set(runs.map(r => r.horizonDays))].sort((a, b) => a - b)
  const lines = [
    '# QA-02 經濟、裝備與傭兵平衡模擬',
    '',
    '- 狀態：已執行純引擎模擬；沒有修改遊戲平衡。',
    '- 來源：`' + meta.sourceCommit + '`；Vite SSR 固定載入 `' + meta.sourceRoot + '`。',
    '- 執行區間（UTC）：' + meta.startedAt + ' 至 ' + meta.finishedAt + '。',
    '- 來源檔 SHA-256：見 `raw-runs.json` metadata.sourceHashes；八個引擎契約檔與 baseline manifest 全部吻合。',
    '- 樣本：' + meta.seedList.length + ' seeds × ' + meta.strategyList.length + ' policies × ' + horizonsSeen.length + ' horizons（總計 ' + runs.length + ' run records；若 smoke 子集請看 metadata）。',
    '- 正常路線只呼叫 public engine actions、`walkTo` 與自然 `simulate`；fixture/refusal probe 在獨立區塊。',
    '',
    '## 策略與口徑',
    '',
    '- `farming_sale`：合法整地、播種、等小麥成熟、收割；累積新收食物後每批最多賣 20 份。',
    '- `woodcutting_sale`、`stone_mining_sale`、`iron_mining_sale`：實際走到森林／礦區採集，回商店每批最多賣 20 份；體力不足回家免費休息，資源不足等隔日再生。',
    '- `combat_bare`：未買裝、未雇傭兵；合法野外遭遇，低血用藥水，沒藥時撤退，於聚落免費休息。',
    '- `combat_gear`：先用鐵礦採集與合法商店出售籌資；聚落解鎖後依現價買劍甲並以 `equip` 穿戴，再依相同戰鬥政策冒險。',
    '- `combat_gear_hire_once`：同上，另於酒館開放後合法聘 healer + fighter 一次，觀察 3 日契約實際支出；契約到期後不自動續聘。',
    '- 初始淨值定義為起始金幣 + 初始背包各品項依 `ITEMS[item].sell` 計價；終值用同一賣價計算。淨值變化包括庫存、裝備購入折價、消耗品與現金，不把初始免費物品算成收益。',
    '- game days 按 `createGame` 的起始 worldTime 起算；每 run 計畫同時長，政策在剩餘時間不足時停止動作並以 `simulate` 精確補到 horizon。',
    '- active action minutes 排除純等待；travel、passive wait、採集、耕作、交易、戰鬥、聘用與休息分鐘分開計算；同時保存 stamina、現金、拒絕、交易、契約、死亡、每 30 日 checkpoint 與序列化回讀。',
    '',
    '',
    '## 多 seed 結果',
    '',
    '| Horizon | Policy | Seeds | 淨值變化 mean / median / range | 現金變化 mean | Active action min mean | Travel min mean | Passive wait min mean | Stamina spent mean | Wage mean | 死亡 | 拒絕率 mean | Save/reload failures |',
    '|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ]
  for (const days of horizonsSeen) {
    for (const group of groups.filter(g => g.horizonDays === days)) {
      const ns = group.netWorthChange
      lines.push('| ' + days + 'd | ' + group.strategy + ' | ' + group.seeds + ' | ' + ns.mean.toFixed(2) + ' / ' + ns.median.toFixed(2) + ' / ' + ns.min.toFixed(2) + '…' + ns.max.toFixed(2) + ' | ' + group.cashChange.mean.toFixed(2) + ' | ' + group.actionMinutes.mean.toFixed(1) + ' | ' + group.travelMinutes.mean.toFixed(1) + ' | ' + group.passiveWaitMinutes.mean.toFixed(1) + ' | ' + group.staminaSpent.mean.toFixed(1) + ' | ' + group.wages.mean.toFixed(2) + ' | ' + group.deaths + '/' + group.seeds + ' | ' + (group.refusalRate.mean * 100).toFixed(3) + '% | ' + group.saveReloadFailures + ' |')
    }
  }
  lines.push('', '## 裝備與傭兵交易實測', '')
  const equipRuns = runs.filter(r => r.equipmentPurchases.length > 0)
  if (!equipRuns.length) lines.push('- 此次 horizon/策略組合沒有抵達合法且可負擔的鐵匠交易；不可把未解鎖當作交易失敗。')
  else {
    const items = [...new Set(equipRuns.flatMap(r => r.equipmentPurchases.map(x => x.item)))]
    for (const item of items) {
      const txs = equipRuns.flatMap(r => r.equipmentPurchases.filter(x => x.item === item))
      lines.push('- ' + item + '：實際購買 ' + txs.length + ' 次，金額 ' + [...new Set(txs.map(x => x.price))].join('/') + ' gold；交易每次 ' + [...new Set(txs.map(x => x.actionMinutes))].join('/') + ' game minutes；stamina delta 依逐筆 raw transaction。')
    }
  }
  const hiredRuns = runs.filter(r => r.hireContracts.length > 0)
  if (!hiredRuns.length) lines.push('- 此次主矩陣沒有抵達聘用門檻；獨立 paired contract trial 見 `contract-trials.csv`／raw JSON。')
  else {
    const contracts = hiredRuns.flatMap(r => r.hireContracts)
    const fees = contracts.map(c => c.fee)
    const wages = hiredRuns.map(r => r.moneyFlows.wages)
    const terms = contracts.map(c => c.durationFromActionStartMinutes)
    lines.push('- Hire action：' + contracts.length + ' 筆；個人 hire fee mean ' + stats(fees).mean.toFixed(2) + ' gold；實際 term mean ' + stats(terms).mean.toFixed(1) + ' minutes；整 run dailyTick 實際薪資支出 mean ' + stats(wages).mean.toFixed(2) + ' gold。')
  }
  if (contractTrials.length) {
    lines.push('', '## Fighter + healer 合約窗配對試驗', '')
    lines.push('- 每個 seed 先以合法鐵礦工作自然解鎖村莊、籌到裝備與 hire 費，再在酒館同一存檔分成 no-hire / hire-duo 兩個 save/reload 副本；control 花同樣 20 分鐘等待，雙方從同一 worldTime 開始戰鬥並跑到引擎的 `contractEnd` 邊界。這是正常可到達存檔分支，不是資源注入 fixture。')
    lines.push('- 見 `paired-contract-trials.csv`；逐 seed 保留兩邊現金、淨值、招募費、薪資、戰鬥數、勝場、撤退、死亡及精確 term。')
    lines.push('- 引擎只在 dailyTick 收薪，且先檢查 `contractEnd <= worldTime` 再收薪；因此在傍晚聘用的合約到第三個午夜時先到期。候選平衡/規則問題：名義 3 日契約可能低於72小時，且實際只觸發兩次日薪；所有實際分鐘、薪次與金額在 raw JSON 可核對，沒有更改規則。')
  }
  lines.push('', '## 初步觀察與候選平衡問題', '')
  lines.push('- 此報告只描述此策略集、這些 seed 與固定 duration，不推論全部玩家；所有 30/120/360 日結果按 run 標記，拒絕控制與任何 stress fixture 不納入一般玩家發生率。')
  lines.push('- 鐵礦的直接工作報酬是每次4 gold，並可依配置的賣價將取得鐵礦變現；CSV 的 realized cash、未售庫存淨值與往返交易時間分開保存，可比較淨收益而不是只比資源數。')
  lines.push('- 戰鬥收入須扣裝備折價、雇用費、逐日薪資與藥水耗用；死亡率是每個 seed horizon 的實際死亡樣本率，不用無死亡的短 run 推估風險為零。')
  lines.push('- 候選核對：3 日契約目前以日界計算終止，實際 term 依雇用時刻浮動，dailyTick 到期先移除再扣薪；由 paired trial 提供量化證據，交產品 Owner 判斷是否符合預期。')
  lines.push('- 本次沒有調整任何遊戲平衡。')
  lines.push('', '## 驗證與重現', '')
  lines.push('- Engine loader：Node ' + meta.node + '、Vite ' + meta.viteVersion + '；Vite SSR 固定 root `' + meta.sourceRoot + '`。')
  lines.push('- 重現 full matrix：`node reports/playtests/20261004-deep-qa/balance/runner.mjs --seeds=101,202,303,404,505,606 --days=30,120,360`。')
  lines.push('- smoke matrix：`node reports/playtests/20261004-deep-qa/balance/runner.mjs --smoke`。')
  lines.push('- 每個 policy × horizon checkpoint 自動呼叫 `python3 -B scripts/recorded_reports.py publish ...`；每次發布先 fsync 追加 `playlog.jsonl`。')
  lines.push('- 所有 run 在初始化、gear 購買/equip、每次 hire 與結束後執行 `serialize`/`deserialize` state equality 驗證。')
  lines.push('- Harness guard：每 run 最多 ' + actionMaxCount + ' public action calls、' + policyMaxIterations + ' policy loops、遭遇 turn 最多 ' + maxActionsInEncounter + '，同一 action 連續 ' + sameRejectLimit + ' 次 refusal 即終止；所有 state numeric 欄位每動作後套 finite guard。')
  lines.push('', '## 限制', '')
  lines.push('- pure engine/headless 模擬不是 UI/瀏覽器測試；不涵蓋真實操作錯誤、視覺資訊、回應延遲或存檔媒介故障。')
  lines.push('- 連續採礦／播種策略是明確程式化代表策略，不是玩家行為分布或最優解；交易往返已計入每批操作，最後殘留庫存以引擎 sell price 計淨值。')
  lines.push('- 30 日時 tavern/blacksmith 常仍未解鎖；相關政策尊重自然鎖定並記錄未購買/未聘用，不設置聚落 stage、gold、skills 或 inventory。')
  lines.push('- hire-once policy 只有第一次契約、到期不續聘；paired試驗則專門量出該份合約效益。')
  lines.push('- setup skill 指示的環境安裝／啟動與本 QA 純引擎路線分屬 root workflow；本 worker 沒更動依賴或環境配置。')
  lines.push('')
  return lines.join('\n')
}
function makeContractCsv(trials) {
  const cols = ['seed','setupStartedAt','setupFinishedAt','setupMinutes','contractStartWorldTime','contractEndWorldTime','contractTermMinutes','nominalDays','hireFees','dailyWages','expectedWageTicksPerHire','actualWageTicksEstimated','affordableWageDaysAfterFees','healerNpc','healerFee','fighterNpc','fighterFee','controlCashDelta','hireCashDelta','controlNetWorthChange','hireNetWorthChange','controlCombatWins','hireCombatWins','controlEncounters','hireEncounters','controlRetreats','hireRetreats','controlDied','hireDied','controlRefusalRate','hireRefusalRate','bothSaveReloadPassed']
  const lines = [cols.join(',')]
  for (const t of trials) {
    lines.push([t.seed,t.setupStartedAt,t.setupFinishedAt,t.setupMinutes,t.contractStartWorldTime,t.contractEndWorldTime,t.contractTermMinutes,t.nominalDays,t.hireFees,t.dailyWages,t.expectedWageTicksPerHire,t.estimatedWageTicksActuallyPaid,t.affordableWageDaysAfterFees,t.healerNpc,t.healerFee,t.fighterNpc,t.fighterFee,t.control.cash.change,t.hire.cash.change,t.control.netWorth.change,t.hire.netWorth.change,t.control.combat.wins,t.hire.combat.wins,t.control.combat.encounters,t.hire.combat.encounters,t.control.combat.retreats,t.hire.combat.retreats,t.control.death.died,t.hire.death.died,t.control.refusalRate,t.hire.refusalRate,t.bothSaveReloadPassed].map(csvCell).join(','))
  }
  return lines.join('\n') + '\n'
}
function normalCombatOnlyRun(state, seed, strategy, startWorldTime, targetWorldTime) {
  const run = newRun(state, seed, strategy, (targetWorldTime - startWorldTime) / 1440, targetWorldTime, 'paired_contract_trial')
  run.startWorldTime = startWorldTime
  run.initial = playerSnapshot(state, player(state))
  run.initialNetWorth = markWorth(state, ITEMS)
  run.initialInventory = { ...player(state).inventory }
  run.initialGold = player(state).gold
  checkSaveReload(run, 'trial_initial')
  let stalled = 0
  while (state.worldTime < targetWorldTime && player(state).isAlive && !run.terminatedBy) {
    run.iterations++
    if (run.iterations > 10000) { run.terminatedBy = 'paired_trial_loop_guard'; break }
    const before = state.worldTime
    const progressed = combatStep(run)
    if (!progressed && state.worldTime < targetWorldTime) {
      stalled++
      if (stalled >= 3) { run.terminatedBy = 'paired_trial_no_progress'; break }
      advance(run, targetWorldTime - state.worldTime, 'paired_trial_remainder')
      break
    }
    stalled = state.worldTime === before ? stalled + 1 : 0
    if (stalled > 20) { run.terminatedBy = 'paired_trial_stall_guard'; break }
  }
  const result = makeEnd(run)
  return result
}
function runPairedContractTrial(seed) {
  const setupStartedAt = nowIso()
  const setupState = createGame(seed)
  const setupStartWorldTime = setupState.worldTime
  const setupTargetWorldTime = setupStartWorldTime + 360 * CONFIG.minutesPerDay
  const setupRun = newRun(setupState, seed, 'paired_trial_unlock_route', 360, setupTargetWorldTime, 'paired_setup')
  checkSaveReload(setupRun, 'initial')
  const gearPrices = () => {
    const stageIndex = ['hamlet','village','town'].indexOf(setupState.settlement.stage)
    return ['sword','armor'].filter(item => player(setupState).inventory[item] <= 0).reduce((acc, item) => acc + Math.ceil(ITEMS[item].price * (stageIndex === 2 ? 0.8 : 1)), 0)
  }
  let setupGuard = 0
  while (setupGuard++ < 20000 && setupState.worldTime < setupTargetWorldTime && player(setupState).isAlive && !setupRun.terminatedBy) {
    const c = player(setupState)
    if (setupState.settlement.stage !== 'hamlet' && setupState.settlement.buildings.includes('blacksmith') && c.gold >= gearPrices() && (!c.equipment.weapon || !c.equipment.armor)) {
      if (!purchaseEquipment(setupRun)) break
      continue
    }
    if (c.equipment.weapon === 'sword' && c.equipment.armor === 'armor' && setupState.settlement.buildings.includes('tavern')) {
      const fee = 2 * (20 + ['hamlet','village','town'].indexOf(setupState.settlement.stage) * 5)
      if (c.gold >= fee && availableMercenaries(setupState).length >= 2) break
    }
    const progressed = resourceStep(setupRun, 'iron')
    if (!progressed) break
  }
  const c = player(setupState)
  if (!c.isAlive || c.equipment.weapon !== 'sword' || c.equipment.armor !== 'armor' || !setupState.settlement.buildings.includes('tavern')) {
    checkSaveReload(setupRun, 'setup_exit')
    return { seed: seed, eligible: false, reason: 'gear/tavern natural route did not complete', setupStartedAt: setupStartedAt, setupFinishedAt: nowIso(), setupRun: summarizeRun(setupRun) }
  }
  const requiredFee = 2 * (20 + ['hamlet','village','town'].indexOf(setupState.settlement.stage) * 5)
  if (c.gold < requiredFee) {
    checkSaveReload(setupRun, 'setup_exit')
    return { seed: seed, eligible: false, reason: 'not enough cash for legal two-person hire', setupStartedAt: setupStartedAt, setupFinishedAt: nowIso(), setupRun: summarizeRun(setupRun) }
  }
  const tavern = BUILDINGS.tavern.position
  const go = routeMinutes(setupState, tavern)
  const openWait = waitMinutesToOpen({ worldTime: setupState.worldTime + go, settlement: setupState.settlement }, 'tavern', 20)
  if (!moveTo(setupRun, tavern, 'paired_setup_tavern')) throw new Error('paired setup tavern path failed')
  if (!prepareWindow(setupRun, 'tavern', 20)) {
    checkSaveReload(setupRun, 'setup_exit')
    return { seed: seed, eligible: false, reason: 'could not reach tavern window', setupStartedAt: setupStartedAt, setupFinishedAt: nowIso(), setupRun: summarizeRun(setupRun) }
  }
  const eligible = availableMercenaries(setupState).slice(0, 2)
  if (eligible.length < 2) {
    checkSaveReload(setupRun, 'setup_exit')
    return { seed: seed, eligible: false, reason: 'fewer than two eligible mercenaries', setupStartedAt: setupStartedAt, setupFinishedAt: nowIso(), setupRun: summarizeRun(setupRun) }
  }
  checkSaveReload(setupRun, 'paired_setup_branchpoint')
  const setupSummary = summarizeRun(setupRun)
  const prehireRaw = save.serialize(setupState, 0)
  const prehireReload = save.deserialize(prehireRaw).state
  if (JSON.stringify(prehiredShape(setupState)) !== JSON.stringify(prehiredShape(prehireReload))) throw new Error('paired branchpoint save/reload mismatch')
  const branchWorldTime = setupState.worldTime
  const controlState = save.deserialize(prehireRaw).state
  const hireState = save.deserialize(prehireRaw).state
  const commonOpening = playerSnapshot(controlState, player(controlState))
  const commonOpeningGold = player(controlState).gold
  const commonOpeningWorth = markWorth(controlState, ITEMS)
  const controlRun = newRun(controlState, seed, 'paired_no_hire', 3, branchWorldTime + 3 * 1440, 'paired_contract_trial')
  const hireRun = newRun(hireState, seed, 'paired_hire_duo', 3, branchWorldTime + 3 * 1440, 'paired_contract_trial')
  checkSaveReload(controlRun, 'branchpoint_clone')
  checkSaveReload(hireRun, 'branchpoint_clone')
  const intendedHireStarts = [player(hireState).gold, player(controlState).gold]
  const totalFee = eligible.slice(0, 2).reduce((acc, npc) => acc + 20 + ['hamlet','village','town'].indexOf(hireState.settlement.stage) * 5, 0)
  for (const npc of eligible) {
    const fee = 20 + ['hamlet','village','town'].indexOf(hireState.settlement.stage) * 5
    const time = hireState.worldTime
    const beforeCash = player(hireState).gold
    const tx = function(before, after, afterState, combatBefore, endTime) {
      const contract = afterState.party.find(p => p.npcId === npc.id)
      return { type: 'hire', npcId: npc.id, npcName: npc.name, archetype: contract ? contract.archetype : null, fee: fee, dailyWage: contract ? contract.dailyWage : null, contractEnd: contract ? contract.contractEnd : null, startWorldTime: time, endWorldTime: endTime, gameMinutes: endTime - time, cashBefore: beforeCash, cashAfter: after.gold, staminaBefore: before.stamina, staminaAfter: after.stamina }
    }
    const hireRes = action(hireRun, 'hire:' + npc.id, () => hire(hireState, npc.id), { directCash: -fee, flow: 'hire', hireContract: { npcId: npc.id, npcName: npc.name, fee: fee }, transaction: tx })
    if (!hireRes.accepted) {
      checkSaveReload(setupRun, 'setup_hire_refused')
      return { seed: seed, eligible: false, reason: 'public hire rejected: ' + hireRes.result, setupStartedAt: setupStartedAt, setupFinishedAt: nowIso(), setupRun: summarizeRun(setupRun) }
    }
    checkSaveReload(hireRun, 'after_hire_' + npc.id)
  }
  const matchedMinutes = hireState.worldTime - branchWorldTime
  advance(controlRun, matchedMinutes, 'match_two_hire_actions')
  const contractEnd = Math.min(...hireState.party.map(p => p.contractEnd))
  const startTime = hireState.worldTime
  if (controlState.worldTime !== startTime) throw new Error('paired branches did not align on worldTime')
  controlRun.targetWorldTime = contractEnd
  hireRun.targetWorldTime = contractEnd
  controlRun.horizonDays = (contractEnd - startTime) / 1440
  hireRun.horizonDays = controlRun.horizonDays
  const controlPreparation = deepClone(summarizeRun(controlRun))
  const hirePreparation = deepClone(summarizeRun(hireRun))
  const control = normalCombatOnlyRun(controlState, seed, 'paired_no_hire', startTime, contractEnd)
  const hireResult = normalCombatOnlyRun(hireState, seed, 'paired_hire_duo', startTime, contractEnd)
  const actualTerm = contractEnd - branchWorldTime
  const expectedWageTicksPerHire = hireRun.hireContracts.map(contract => {
    let count = 0
    for (let day = Math.floor(contract.actionStartWorldTime / 1440) + 1; day * 1440 < contract.contractEnd; day++) count++
    return count
  })
  function mergeAggregate(destination, prior) {
    for (const [name, metric] of Object.entries(prior.actionMetrics)) {
      if (!destination.actionMetrics[name]) destination.actionMetrics[name] = { attempts: 0, accepted: 0, refused: 0, minutes: 0, staminaSpent: 0, staminaRestored: 0, goldDelta: 0 }
      const target = destination.actionMetrics[name]
      for (const key of Object.keys(target)) target[key] += metric[key] || 0
    }
    for (const key of ['actionAttempts','acceptedActions','refusedActions']) destination[key] += prior[key] || 0
    destination.refusalRate = destination.actionAttempts ? destination.refusedActions / destination.actionAttempts : 0
    for (const [key, count] of Object.entries(prior.refusalReasons)) destination.refusalReasons[key] = (destination.refusalReasons[key] || 0) + count
    for (const [key, value] of Object.entries(prior.gameMinutesByOperation)) destination.gameMinutesByOperation[key] = (destination.gameMinutesByOperation[key] || 0) + value
    for (const [key, value] of Object.entries(prior.staminaSpentByOperation)) destination.staminaSpentByOperation[key] = (destination.staminaSpentByOperation[key] || 0) + value
    for (const [key, value] of Object.entries(prior.staminaRestoredByOperation)) destination.staminaRestoredByOperation[key] = (destination.staminaRestoredByOperation[key] || 0) + value
    destination.transactions = [...prior.transactions, ...destination.transactions]
    destination.hireContracts = [...prior.hireContracts, ...destination.hireContracts]
    destination.saveReloadChecks = [...prior.saveReloadChecks, ...destination.saveReloadChecks]
    destination.saveReloadAllPassed = destination.saveReloadAllPassed && prior.saveReloadAllPassed
    destination.trace = [...prior.trace, ...destination.trace].sort((a, b) => (a.startWorldTime || 0) - (b.startWorldTime || 0))
    for (const key of ['gatheringGold','saleGold','combatGold','purchases','hireFees','lodgingFees','wages','unclassifiedCash']) destination.moneyFlows[key] += prior.moneyFlows[key] || 0
    destination.totalTimeSpentOnActionFunctions = sum(Object.values(destination.actionMetrics), v => v.minutes)
    const mergedActions = Object.entries(destination.actionMetrics)
    const mergedMinutes = prefix => sum(mergedActions.filter(([name]) => name.startsWith(prefix)), ([, value]) => value.minutes)
    destination.activeActionGameMinutes = sum(mergedActions.filter(([name]) => !name.startsWith('wait:')), ([, value]) => value.minutes)
    destination.travelGameMinutes = mergedMinutes('walkTo:')
    destination.passiveWaitGameMinutes = mergedMinutes('wait:')
    destination.gatherGameMinutes = mergedMinutes('gather:')
    destination.farmingGameMinutes = mergedMinutes('farm:')
    destination.tradeGameMinutes = mergedMinutes('trade:')
    destination.combatActionGameMinutes = mergedMinutes('combatTurn:') + mergedMinutes('encounter:')
    destination.hireActionGameMinutes = mergedMinutes('hire:')
    destination.restActionGameMinutes = mergedMinutes('rest:')
    destination.staminaSpent = sum(Object.values(destination.actionMetrics), v => v.staminaSpent)
    destination.staminaRestored = sum(Object.values(destination.actionMetrics), v => v.staminaRestored)
  }
  mergeAggregate(control, controlPreparation)
  mergeAggregate(hireResult, hirePreparation)
  for (const result of [control, hireResult]) {
    result.startWorldTime = branchWorldTime
    result.actualGameMinutes = result.endWorldTime - branchWorldTime
    result.actualGameDays = result.actualGameMinutes / 1440
    result.initial = commonOpening
    result.cash.initial = commonOpeningGold
    result.cash.change = result.cash.final - commonOpeningGold
    result.netWorth.initial = commonOpeningWorth
    result.netWorth.change = result.netWorth.final - commonOpeningWorth
    result.netWorth.perElapsedDay = result.actualGameDays ? result.netWorth.change / result.actualGameDays : null
    const flow = result.moneyFlows
    result.cash.explainedChange = flow.gatheringGold + flow.saleGold + flow.combatGold - flow.purchases - flow.hireFees - flow.lodgingFees - flow.wages + flow.unclassifiedCash
    result.cash.reconciliationDifference = result.cash.change - result.cash.explainedChange
  }
  hireResult.equipmentPurchases = setupSummary.equipmentPurchases
  const actualWageTicksEstimated = hireResult.moneyFlows.wages / 4
  const healerContract = hireRun.hireContracts.find(contract => contract.archetype === 'healer')
  const fighterContract = hireRun.hireContracts.find(contract => contract.archetype === 'fighter')
  const out = {
    seed: seed,
    eligible: true,
    setupStartedAt: setupStartedAt,
    setupFinishedAt: nowIso(),
    setupMinutes: setupState.worldTime - setupRun.startWorldTime,
    setupRoute: setupSummary,
    setupStartWorldTime: setupRun.startWorldTime,
    branchWorldTime: branchWorldTime,
    contractStartWorldTime: branchWorldTime,
    comparisonStartWorldTime: startTime,
    contractEndWorldTime: contractEnd,
    contractTermMinutes: actualTerm,
    contractTermDays: actualTerm / 1440,
    nominalDays: CONFIG.contractDays,
    controlAlignmentMinutes: matchedMinutes,
    openingState: commonOpening,
    requiredHireFeeTotal: totalFee,
    cashBeforeFees: intendedHireStarts[0],
    cashAfterFees: intendedHireStarts[0] - totalFee,
    dailyWageTotal: hireRun.hireContracts.reduce((acc, contract) => acc + contract.dailyWage, 0),
    hireFees: hireRun.flow.hireFees,
    expectedWageTicksPerHire: sum(expectedWageTicksPerHire, x => x),
    dailyWages: hireResult.moneyFlows.wages,
    affordableWageDaysAfterFees: (intendedHireStarts[0] - totalFee) / hireRun.hireContracts.reduce((acc, contract) => acc + contract.dailyWage, 0),
    hireContracts: hireRun.hireContracts,
    healerNpc: healerContract ? healerContract.npcName : null,
    healerFee: healerContract ? healerContract.fee : null,
    fighterNpc: fighterContract ? fighterContract.npcName : null,
    fighterFee: fighterContract ? fighterContract.fee : null,
    expectedWageTicksPerContract: expectedWageTicksPerHire,
    estimatedWageTicksActuallyPaid: actualWageTicksEstimated,
    control: control,
    hire: hireResult,
    bothSaveReloadPassed: control.saveReloadAllPassed && hireResult.saveReloadAllPassed && hireRun.checks.every(x => x.passed),
    stateBranchpointSaveSha256: sha256(prehireRaw),
    candidateObservation: 'contractEnd is day-floor + contractDays calendar boundary; dailyTick removes contract when contractEnd <= worldTime before wage debit. Paired control was time-aligned to the two actual hire action durations.',
  }
  return out
}
function prehiredShape(state) { return { worldTime: state.worldTime, gold: player(state).gold, inventory: player(state).inventory, party: state.party, stage: state.settlement.stage, position: player(state).position, nextNpcId: state.nextNpcId } }
function refusalProbe(label, fn, state, baseline) {
  const before = JSON.stringify(state)
  let result
  let thrown = null
  try { result = fn() } catch (error) { thrown = String(error && error.message || error) }
  const after = JSON.stringify(state)
  const unchanged = before === after
  safeNumbers(state)
  return { label: label, rejected: thrown !== null || !(result === '' || result === true), result: typeof result === 'string' ? result : result, thrown: thrown, unchanged: unchanged, baselineHash: baseline, afterHash: sha256(after), noStateChange: unchanged }
}
function runRefusalControls() {
  const state = createGame(909)
  const base = JSON.stringify(state)
  const baselineHash = sha256(base)
  const checks = [
    refusalProbe('farm_harvest_wrong_region', () => farm(state, 'harvest'), state, baselineHash),
    refusalProbe('gather_iron_wrong_region', () => gather(state, 'iron'), state, baselineHash),
    refusalProbe('trade_locked_or_wrong_shop', () => trade(state, 'sword', true), state, baselineHash),
    refusalProbe('hire_tavern_unavailable', () => hire(state, 'npc-1'), state, baselineHash),
    refusalProbe('equip_missing_item', () => equip(state, 'sword'), state, baselineHash),
    refusalProbe('combat_turn_no_combat', () => combatTurn(state, 'attack'), state, baselineHash),
    refusalProbe('simulate_nan_guard', () => simulate(state, NaN), state, baselineHash),
    refusalProbe('simulate_infinity_guard', () => simulate(state, Infinity), state, baselineHash),
  ]
  const accepted = checks.filter(x => !x.rejected).length
  const changedState = checks.filter(x => !x.noStateChange).length
  return { runKind: 'controlled_refusal_probes', excludedFromNormalRuns: true, seed: 909, startedAt: nowIso(), checks: checks, attempts: checks.length, rejected: checks.filter(x => x.rejected).length, refusalRate: checks.length ? checks.filter(x => x.rejected).length / checks.length : 0, unexpectedlyAccepted: accepted, changedStateCount: changedState, finiteGuard: 'safeNumbers traversed all numeric values before/after; NaN/Infinity simulate rejected with Error before mutation', passed: checks.every(x => x.rejected && x.noStateChange) }
}

function finalResults() {
  metadata.finishedAt = nowIso()
  metadata.runnerSha256 = sha256(requireRunnerText)
}
let requireRunnerText = await readFile(runnerPath, 'utf8')
const recording = { meta: metadata, completedRuns: results, controlledRefusalProbes: controlProbes, pairedContractTrials: [], checkpoints: [] }
function checkpoint(name) {
  recording.checkpoints.push({ checkpoint: name, recordedAt: nowIso(), completedRunCount: results.length, completedContractTrials: recording.pairedContractTrials.length })
  const body = JSON.stringify(recording, null, 2) + '\n'
  const published = publishRecorded(outputJson, body, 'qa-02-balance-harness')
  process.stdout.write(JSON.stringify({ checkpoint: name, runs: results.length, contractTrials: recording.pairedContractTrials.length, file: published.file, bytes: published.bytes, sha256: published.sha256 }) + '\n')
}

try {
  controlProbes = runRefusalControls()
  recording.controlledRefusalProbes = controlProbes
  for (const horizon of horizons) {
    for (const strategy of strategies) {
      for (const seed of seeds) {
        const result = runNormal(seed, horizon, strategy)
        results.push(result)
      }
      checkpoint(strategy + '_' + horizon + 'd')
    }
  }
  if (!smoke && (strategies.includes('combat_gear') || strategies.includes('combat_gear_hire_once'))) {
    for (const seed of seeds) {
      const trial = runPairedContractTrial(seed)
      recording.pairedContractTrials.push(trial)
      if (trial.eligible && !trial.bothSaveReloadPassed) throw new Error('paired contract save/reload failed seed=' + seed)
    }
    checkpoint('paired_contract_trials')
  }
  metadata.finishedAt = nowIso()
  metadata.runnerSha256 = sha256(requireRunnerText)
  const csv = makePolicyCsv(results)
  const summaryMd = makeSummaryMarkdown(metadata, results, recording.pairedContractTrials)
  const contractCsv = makeContractCsv(recording.pairedContractTrials)
  recording.meta = metadata
  const finalJson = JSON.stringify(recording, null, 2) + '\n'
  publishRecorded(path.join(outputDir, 'raw-runs.csv'), csv, 'qa-02-balance-harness')
  publishRecorded(path.join(outputDir, 'paired-contract-trials.csv'), contractCsv, 'qa-02-balance-harness')
  publishRecorded(path.join(outputDir, 'results.md'), summaryMd, 'qa-02-balance-harness')
  publishRecorded(outputJson, finalJson, 'qa-02-balance-harness')
  process.stdout.write(JSON.stringify({ status: 'complete', startedAt: metadata.startedAt, finishedAt: metadata.finishedAt, runCount: results.length, pairedContractTrials: recording.pairedContractTrials.length, refusalProbesPassed: controlProbes.passed, allRunsAtExactHorizon: results.every(run => run.horizonReachedExactly), allSaveReloadPassed: results.every(run => run.saveReloadAllPassed) && recording.pairedContractTrials.every(t => !t.eligible || t.bothSaveReloadPassed), rawJson: 'reports/playtests/20261004-deep-qa/balance/raw-runs.json', rawCsv: 'reports/playtests/20261004-deep-qa/balance/raw-runs.csv', report: 'reports/playtests/20261004-deep-qa/balance/results.md' }) + '\n')
} catch (error) {
  metadata.finishedAt = nowIso()
  recording.meta = metadata
  try { checkpoint('fatal_error') } catch (publishError) { process.stderr.write('checkpoint failed: ' + String(publishError && publishError.message || publishError) + '\n') }
  process.stderr.write('fatal: ' + String(error && error.stack || error) + '\n')
  process.exitCode = 1
} finally {
  await server.close()
}
