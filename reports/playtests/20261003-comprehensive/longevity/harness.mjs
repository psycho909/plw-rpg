import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { access, mkdir, readFile, readdir, symlink } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { createServer } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../../..')
function writeRecorded(path, body) {
  execFileSync('python3', [join(repo, 'scripts/recorded_reports.py'), 'publish', path, '--producer', 'longevity'], { input: body, stdio: ['pipe', 'inherit', 'inherit'] })
}
const snapshotRoot = '/tmp/plw-rpg-baseline-694c6d76'
const baselineCommit = '694c6d76df67e3d3dd4da5aa98feba8581ecc2ba'
const seeds = [0, 1, 42, 321, 909, 0xffffffff, 7, 20261003]
const yearsPerSeed = 500
const startedAt = new Date().toISOString()
const runStart = performance.now()
const run = {
  status: 'running', startedAtUtc: startedAt, finishedAtUtc: null, elapsedMs: null,
  node: process.version, platform: `${process.platform}-${process.arch}`,
  requiredSeeds: seeds, yearsPerSeed, advanceStep: 'one-day maximum, midnight-aligned, partial first/last intervals',
  dailySimulationCalls: 0, annualCheckpoints: 0, exactSaveRoundTrips: 0,
  calendarDayChecks: 0, seasonTransitions: 0, yearTransitions: 0,
  naturalPlayerDeaths: 0, successorTransitions: 0,
}
const results = {
  title: 'Baseline multi-seed 500-year headless longevity simulation',
  source: { commit: baselineCommit, snapshotRoot, sourceFileCount: 13, sourceTreeSha256: 'da0e9930463141a4dea8e5d12289433d4aafa01005e98f847b108a37ffdbb68e' },
  run, seeds: [], chunkDeterminism: { status: 'pending; run after 8-seed baseline' }, failures: [],
}

function round(value, digits = 3) { return Number(value.toFixed(digits)) }
function percentile(values, p) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return round(sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)])
}
function idOrder(a, b) {
  const ai = Number(a.id.match(/\d+$/)?.[0] ?? Number.MAX_SAFE_INTEGER)
  const bi = Number(b.id.match(/\d+$/)?.[0] ?? Number.MAX_SAFE_INTEGER)
  return ai - bi || a.id.localeCompare(b.id)
}
function requireThat(condition, message) {
  if (!condition) throw new Error(`INVARIANT: ${message}`)
}
function inspectFinite(value, path = 'state', counter = { count: 0 }) {
  if (typeof value === 'number') {
    counter.count++
    requireThat(Number.isFinite(value), `${path} is not finite (${value})`)
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) inspectFinite(child, `${path}.${key}`, counter)
  }
  return counter.count
}
function boundedNumber(value, min, max, path) {
  requireThat(Number.isFinite(value) && value >= min && value <= max, `${path} out of range: ${value} not in [${min}, ${max}]`)
}
function validateState(state, { CONFIG, calendar, lifeStage, player, population }) {
  const finiteCount = inspectFinite(state)
  requireThat(Number.isSafeInteger(state.worldTime) && state.worldTime >= 0, 'worldTime must be a nonnegative safe integer')
  requireThat(Number.isInteger(state.worldSeed) && state.worldSeed >= 0 && state.worldSeed <= 0xffffffff, 'worldSeed must be uint32')
  requireThat(Number.isInteger(state.rngState) && state.rngState >= 0 && state.rngState <= 0xffffffff, 'rngState must be uint32')
  requireThat(state.characters.length > 0 && state.characters.length <= 1000 && state.npcs.length <= 1000, 'character/NPC collection bounds')
  const everyone = [...state.characters, ...state.npcs]
  const ids = everyone.map(c => c.id)
  requireThat(new Set(ids).size === ids.length, 'character and NPC IDs must be unique')
  requireThat(state.characters.some(c => c.id === state.activeCharacterId), 'activeCharacterId must resolve')
  const aliveCharacters = state.characters.filter(c => c.isAlive)
  requireThat(aliveCharacters.length === 1 && aliveCharacters[0].id === state.activeCharacterId, 'exactly one living character must be active')
  const currentYear = calendar(state.worldTime).year
  for (const c of everyone) {
    requireThat(Number.isSafeInteger(c.age) && c.age >= 0, `${c.id}.age must be a nonnegative integer`)
    requireThat(c.lifeStage === lifeStage(c.age), `${c.id}.lifeStage must match age`)
    requireThat(Number.isSafeInteger(c.level) && c.level >= 1 && c.exp >= 0 && c.exp < c.level * 30, `${c.id} level/exp bounds`)
    requireThat(c.hp >= 0 && c.hp <= c.maxHp && c.maxHp > 0, `${c.id} hp bounds`)
    requireThat(c.stamina >= 0 && c.stamina <= c.maxStamina && c.maxStamina > 0, `${c.id} stamina bounds`)
    requireThat(c.gold >= 0, `${c.id}.gold must be nonnegative`)
    requireThat(Object.values(c.inventory).every(n => Number.isSafeInteger(n) && n >= 0), `${c.id} inventory bounds`)
    requireThat(Object.values(c.skills).every(s => Number.isSafeInteger(s.level) && s.level >= 1 && s.exp >= 0 && s.exp < s.level * 20), `${c.id} skill bounds`)
    requireThat(Number.isInteger(c.position.x) && c.position.x >= 0 && c.position.x < CONFIG.width && Number.isInteger(c.position.y) && c.position.y >= 0 && c.position.y < CONFIG.height, `${c.id} position is outside the map`)
    requireThat(Number.isInteger(c.birthYear) && Number.isInteger(c.lifespan) && c.lifespan >= 1, `${c.id} birth/lifespan bounds`)
    if (c.isAlive) requireThat(c.status !== 'dead' && c.age < c.lifespan && c.deathYear === null && c.deathCause === null && c.age === currentYear - c.birthYear, `${c.id} living/death/age fields disagree`)
    else requireThat(c.status === 'dead' && c.hp === 0 && c.deathYear !== null && typeof c.deathCause === 'string' && c.deathCause === '自然老化' && c.age === c.deathYear - c.birthYear && c.age >= c.lifespan, `${c.id} dead fields disagree`)
  }
  requireThat(state.npcs.every(n => n.isAlive && n.age < n.lifespan), 'inactive/dead NPCs must not remain in active population')
  const people = population(state)
  requireThat(people > 0 && people <= CONFIG.maxPopulation && people <= state.settlement.capacity, `population ${people} exceeds cap/capacity`)
  const settlement = state.settlement
  requireThat(['hamlet', 'village', 'town'].includes(settlement.stage), 'settlement stage enum')
  boundedNumber(settlement.capacity, 1, CONFIG.maxPopulation, 'settlement.capacity')
  for (const key of ['food', 'prosperity', 'safety', 'infrastructure']) boundedNumber(settlement[key], 0, 100, `settlement.${key}`)
  boundedNumber(settlement.growth, 0, Number.MAX_SAFE_INTEGER, 'settlement.growth')
  const threat = state.threat
  boundedNumber(threat.monsterPopulation, 0, 100, 'threat.monsterPopulation')
  boundedNumber(threat.threatLevel, 1, CONFIG.threatThresholds.length, 'threat.threatLevel')
  boundedNumber(threat.campLevel, 1, CONFIG.threatThresholds.length, 'threat.campLevel')
  boundedNumber(threat.bossProgress, 0, CONFIG.bossThreshold, 'threat.bossProgress')
  boundedNumber(threat.warningLevel, 0, 2, 'threat.warningLevel')
  boundedNumber(state.dungeon.progress, 0, 100, 'dungeon.progress')
  boundedNumber(state.dungeon.threat, 1, CONFIG.threatThresholds.length, 'dungeon.threat')
  requireThat(Number.isSafeInteger(state.dungeon.stage) && state.dungeon.stage >= 0 && state.dungeon.stage <= 3 && Number.isSafeInteger(state.dungeon.runs) && state.dungeon.runs >= 0, 'dungeon stage/run bounds')
  for (const [regionId, region] of Object.entries(state.regions)) {
    boundedNumber(region.remainingAmount, 0, 100, `regions.${regionId}.remainingAmount`)
    boundedNumber(region.regenerationRate, 0, 100, `regions.${regionId}.regenerationRate`)
  }
  requireThat(Number.isSafeInteger(state.preparedPlots) && state.preparedPlots >= 0 && state.crops.length + state.preparedPlots <= CONFIG.maxPlots, 'farm plot capacity')
  requireThat(new Set(state.crops.map(c => c.id)).size === state.crops.length, 'crop IDs must be unique')
  requireThat(state.crops.every(c => Number.isSafeInteger(c.id) && c.id >= 0 && Number.isSafeInteger(c.plantedAt) && c.plantedAt >= 0 && Number.isSafeInteger(c.growthDuration) && c.growthDuration > 0 && Number.isSafeInteger(c.matureAt) && c.matureAt >= c.plantedAt && ['growing', 'mature'].includes(c.status)), 'crop fields/status bounds')
  requireThat(state.party.length <= 2 && new Set(state.party.map(p => p.npcId)).size === state.party.length, 'party size and member uniqueness')
  requireThat(state.party.every(p => state.npcs.some(n => n.id === p.npcId && n.isAlive) && p.hireCost >= 0 && p.dailyWage >= 0 && Number.isSafeInteger(p.contractEnd) && p.contractEnd >= 0 && ['fighter', 'healer'].includes(p.archetype)), 'party contract validity')
  requireThat(state.events.length <= 150 && state.history.length <= 20000, 'event/history limits')
  requireThat(state.events.every(e => Number.isSafeInteger(e.id) && e.id > 0 && e.at >= 0 && e.at <= state.worldTime) && new Set(state.events.map(e => e.id)).size === state.events.length, 'recent event IDs/times')
  requireThat(state.history.every(e => Number.isSafeInteger(e.id) && e.id > 0 && e.at >= 0 && e.at <= state.worldTime) && new Set(state.history.map(e => e.id)).size === state.history.length, 'history IDs/times')
  requireThat(Number.isSafeInteger(state.eventSequence) && state.eventSequence >= 0 && state.events.every(e => e.id <= state.eventSequence) && state.history.every(e => e.id <= state.eventSequence), 'event sequence bounds')
  requireThat(state.tiles.length === CONFIG.width * CONFIG.height && everyone.every(c => state.tiles.some(t => t.x === c.position.x && t.y === c.position.y)), 'world map/position consistency')
  return finiteCount
}

function eventTotals(state) {
  const totals = {}
  for (const event of state.history) totals[event.type] = (totals[event.type] ?? 0) + 1
  return totals
}
function reportText(data) {
  const lines = [
    '# 多 seed 長期世界模擬', '',
    `狀態：${data.run.status}。基準：${data.source.commit}；日期：${data.run.startedAtUtc} 至 ${data.run.finishedAtUtc ?? '執行中'} UTC；耗時：${data.run.elapsedMs === null ? '執行中' : `${round(data.run.elapsedMs / 1000, 1)} 秒`}。`,
    '',
    `引擎固定載入自 ${data.source.snapshotRoot}，來源樹 SHA-256 為 ${data.source.sourceTreeSha256}。每個世界以每日 simulate 推進 500 年；每個年界檢查完整狀態並 serialize→deserialize，確認狀態逐位相同後以載入狀態繼續。自然死亡後當日選擇年滿 15 歲的 NPC（先選最年輕者，再按 NPC ID），只呼叫正式 chooseSuccessor。`,
    '',
    `午夜對齊模擬步驟 ${data.run.dailySimulationCalls} 次；完整年檢查 ${data.run.annualCheckpoints} 次；exact save round-trip ${data.run.exactSaveRoundTrips} 次；日期步進檢查 ${data.run.calendarDayChecks} 次（季節轉換 ${data.run.seasonTransitions}、年份轉換 ${data.run.yearTransitions}）；自然主角死亡／繼承 ${data.run.naturalPlayerDeaths}/${data.run.successorTransitions} 次。`,
    '',
    '| Seed | 狀態 | 年份 | 人口 | 世代交替 | Settlement | Threat/Boss | History | 年均模擬 ms | Save p95 ms | Save bytes (start→end) |',
    '| ---: | --- | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: |',
  ]
  for (const s of data.seeds) {
    const stats = s.final ?? {}
    const latency = s.saveLatencyMs ?? {}
    const startBytes = s.saveTrend?.[0]?.bytes ?? '—'
    const endBytes = s.saveTrend?.at(-1)?.bytes ?? '—'
    lines.push(`| ${s.seed} | ${s.status} | ${s.yearsCompleted ?? 0} | ${stats.population ?? '—'} | ${s.lineage?.length ?? 0} | ${stats.settlementStage ?? '—'} | ${stats.threatLevel ?? '—'} / ${stats.bossAlive ?? '—'} | ${stats.historyLength ?? '—'} | ${s.simulationMsPerYear?.mean ?? '—'} | ${latency.p95 ?? '—'} | ${startBytes}→${endBytes} |`)
  }
  lines.push('', '## 驗證細節', '')
  for (const s of data.seeds) {
    lines.push(`### Seed ${s.seed}`, '')
    if (s.failure) lines.push(`失敗：${s.failure}`, '')
    lines.push(`年度檢查 ${s.checks?.annual ?? 0} 次；精確存檔 round-trip ${s.checks?.saveRoundTrips ?? 0} 次；有限數值欄位累計檢查 ${s.checks?.finiteNumberLeaves ?? 0} 個；season/year 轉換 ${s.checks?.seasonTransitions ?? 0}/${s.checks?.yearTransitions ?? 0} 次。`)
    if (s.final) {
      const e = s.events
      lines.push(`自然主角死亡 ${s.naturalPlayerDeaths} 次；繼承紀錄 ${s.lineage.length} 筆；自然 NPC 死亡 ${s.final.npcNaturalDeaths}，出生 ${e['npc.born'] ?? 0}，移入 ${e['npc.immigrated'] ?? 0}，injury ${s.eventCounts['npc.injured'] ?? 0}；settlement growth ${e['settlement.grew'] ?? 0}，threat increase ${e['monster.threatIncreased'] ?? 0}，Boss warnings/spawn ${e['boss.warning'] ?? 0}/${e['boss.spawned'] ?? 0}。`)
      lines.push(`最終年齡 ${s.final.playerAge}；人口 ${s.final.population}（範圍 ${s.populationRange.min}–${s.populationRange.max}）；保存歷史 ${s.final.historyLength}，近期事件 ${s.final.eventLength}；模擬耗時 ${s.elapsedMs} ms，年均 ${s.simulationMsPerYear.mean} ms（p95 ${s.simulationMsPerYear.p95} ms）；save bytes ${s.saveTrend[0].bytes}→${s.saveTrend.at(-1).bytes}，serialize+deserialize p95 ${s.saveLatencyMs.p95} ms。`)
      lines.push('save 趨勢（每 10 年取樣）：')
      lines.push('', '| 年 | bytes | round-trip ms | 累積模擬 ms |', '| ---: | ---: | ---: | ---: |')
      for (const p of s.saveTrend.filter((p, i) => i % 5 === 0 || p.year === yearsPerSeed)) lines.push(`| ${p.year} | ${p.bytes} | ${p.roundTripMs} | ${p.elapsedMs} |`)
    }
    lines.push('')
  }
  if (data.failures.length) lines.push('## 失敗證據', '', ...data.failures.map(f => `- Seed ${f.seed}，第 ${f.year} 年：${f.error}；snapshot：${f.snapshot}`), '')
  lines.push('## Chunk 大小確定性', '', `Seed ${data.chunkDeterminism.seed ?? '—'} 同總時間 ${data.chunkDeterminism.years ?? '—'} 年，以 1 分鐘、1 小時、1 日、30 日步長執行；結果：${data.chunkDeterminism.status}。此支線用正常 walkTo/farm 動作播種，確認農作物在長步長內也成熟。矩陣刻意在主角自然死亡前結束，未比較不同繼承時點造成的差異；500 年路線一律按日界發現死亡並套用相同最年輕成年 NPC 選擇策略。`)
  if (data.chunkDeterminism.variants) {
    lines.push('', '| Chunk 分鐘 | simulate calls | 執行 ms | Save bytes | SHA-256 | 作物狀態 |', '| ---: | ---: | ---: | ---: | --- | --- |')
    for (const v of data.chunkDeterminism.variants) lines.push(`| ${v.chunkMinutes} | ${v.simulationCalls} | ${v.elapsedMs} | ${v.saveBytes} | ${v.stateSha256.slice(0, 16)}… | ${v.cropStatus} |`)
  }
  lines.push('', '## 限制', '', '本路線是加速 headless 引擎驗證；不是瀏覽器 UI soak。此 harness 沒有寫入年齡、壽命、金幣、資源或人口，也沒有調整 balance。500 年基線世界未透過玩家操作種植作物，因此該部分 crop array 為空；農作物成熟與長步長 round-trip 在上述獨立確定性支線使用正式玩家移動與農作操作驗證。', '')
  return lines.join('\n')
}
async function persist() {
  results.run.elapsedMs = round(performance.now() - runStart)
  if (run.status !== 'running') results.run.finishedAtUtc = new Date().toISOString()
  writeRecorded(join(here, 'results.json'), `${JSON.stringify(results, null, 2)}\n`)
  writeRecorded(join(here, 'report.md'), reportText(results))
}

let server
let activeSeed = null
let activeYear = 0
let activeState = null
try {
  results.source.workingHeadAtStart = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  try { await access(join(snapshotRoot, 'src/engine/simulation.ts')) }
  catch {
    await mkdir(snapshotRoot, { recursive: true })
    const archive = execFileSync('git', ['-C', repo, 'archive', baselineCommit, 'src/data', 'src/domain', 'src/engine', 'src/services'], { maxBuffer: 16 * 1024 * 1024 })
    execFileSync('tar', ['-x', '-C', snapshotRoot], { input: archive })
    await symlink(join(repo, 'node_modules'), join(snapshotRoot, 'node_modules'), 'dir')
  }
  const sourceFiles = []
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await walk(path)
      else sourceFiles.push(path)
    }
  }
  await walk(join(snapshotRoot, 'src'))
  sourceFiles.sort()
  const tree = createHash('sha256')
  for (const path of sourceFiles) {
    const digest = createHash('sha256').update(await readFile(path)).digest('hex')
    tree.update(`${digest}  ${path}\n`)
    results.source.files ??= []
    results.source.files.push({ path: path.replace(`${snapshotRoot}/`, ''), sha256: digest })
  }
  assert.equal(sourceFiles.length, results.source.sourceFileCount, 'snapshot source file count')
  assert.equal(tree.digest('hex'), results.source.sourceTreeSha256, 'snapshot source tree hash')
  server = await createServer({ root: snapshotRoot, configFile: false, appType: 'custom', logLevel: 'warn', server: { middlewareMode: true } })
  const engine = await server.ssrLoadModule('/src/engine/simulation.ts')
  const saves = await server.ssrLoadModule('/src/services/saveService.ts')
  const { CONFIG } = await server.ssrLoadModule('/src/data/config.ts')
  const { calendar, lifeStage } = await server.ssrLoadModule('/src/engine/calendar.ts')
  const bindings = { CONFIG, calendar, lifeStage, player: engine.player, population: engine.population }
  await mkdir(join(here, 'failures'), { recursive: true })
  await persist()

  for (const seed of seeds) {
    activeSeed = seed
    activeYear = 0
    let state = engine.createGame(seed)
    activeState = state
    const simTimes = []
    const saveTimes = []
    const saveTrend = []
    const lineage = []
    const eventCounts = {}
    const populationRange = { min: engine.population(state), max: engine.population(state) }
    const seedStart = performance.now()
    const yearMinutes = CONFIG.daysPerSeason * 4 * CONFIG.minutesPerDay
    const startYear = calendar(state.worldTime).year
    let lastEventId = 0
    const result = {
      seed, status: 'running', yearsCompleted: 0, elapsedMs: null, checks: { annual: 0, saveRoundTrips: 0, finiteNumberLeaves: 0, seasonTransitions: 0, yearTransitions: 0 },
      populationRange, lineage, eventCounts, events: {}, saveTrend, saveLatencyMs: null, simulationMsPerYear: null,
    }
    results.seeds.push(result)
    await persist()
    console.log(`START seed=${seed} years=${yearsPerSeed}`)

    for (let y = 1; y <= yearsPerSeed; y++) {
      activeYear = y
      const yearStart = performance.now()
      let minutesRemaining = yearMinutes
      while (minutesRemaining > 0) {
        const minuteOfDay = state.worldTime % CONFIG.minutesPerDay
        const step = Math.min(minutesRemaining, minuteOfDay === 0 ? CONFIG.minutesPerDay : CONFIG.minutesPerDay - minuteOfDay)
        const before = calendar(state.worldTime)
        engine.simulate(state, step)
        run.dailySimulationCalls++
        result.checks.dailySimulationCalls = (result.checks.dailySimulationCalls ?? 0) + 1
        minutesRemaining -= step
        const after = calendar(state.worldTime)
        run.calendarDayChecks++
        requireThat(Number.isSafeInteger(after.year) && after.year >= 1 && after.season >= 0 && after.season < 4 && after.day >= 1 && after.day <= CONFIG.daysPerSeason, `calendar invalid at ${state.worldTime}`)
        const currentPopulation = engine.population(state)
        requireThat(currentPopulation > 0 && currentPopulation <= CONFIG.maxPopulation && currentPopulation <= state.settlement.capacity, `daily population ${currentPopulation} exceeds cap/capacity`)
        populationRange.min = Math.min(populationRange.min, currentPopulation)
        populationRange.max = Math.max(populationRange.max, currentPopulation)
        if (before.season !== after.season) { run.seasonTransitions++; result.checks.seasonTransitions++ }
        if (before.year !== after.year) { run.yearTransitions++; result.checks.yearTransitions++ }
        for (const event of state.events) if (event.id > lastEventId) eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1
        lastEventId = state.eventSequence

        if (!engine.player(state).isAlive) {
          const dead = engine.player(state)
          requireThat(dead.deathCause === '自然老化', `active character ${dead.id} died from unexpected cause ${dead.deathCause}`)
          const deathSaveStart = performance.now()
          const deathSave = saves.serialize(state, Date.UTC(2026, 9, 3) + state.worldTime)
          const reloadedDeath = saves.deserialize(deathSave)
          assert.deepEqual(reloadedDeath.state, state, 'death state must round-trip before inheritance')
          saveTimes.push(performance.now() - deathSaveStart)
          run.exactSaveRoundTrips++
          result.checks.saveRoundTrips++
          run.naturalPlayerDeaths++
          const eligible = state.npcs.filter(n => n.isAlive && n.age >= 15).sort((a, b) => a.age - b.age || idOrder(a, b))
          if (!eligible.length) throw new Error(`NO_ADULT_SUCCESSOR: ${dead.id} died naturally at year ${after.year} (${state.npcs.length} NPCs, population ${engine.population(state)}); no living NPC age >= 15`)
          const successor = eligible[0]
          const fromId = dead.id
          const successorAge = successor.age
          requireThat(engine.chooseSuccessor(state, successor.id), `chooseSuccessor rejected eligible NPC ${successor.id}`)
          run.successorTransitions++
          lineage.push({ year: after.year, from: fromId, to: successor.id, age: successorAge, policy: 'youngest living NPC age>=15, tie by NPC ID' })
        }
      }
      simTimes.push(performance.now() - yearStart)
      const expectedCalendarYear = startYear + y
      requireThat(calendar(state.worldTime).year === expectedCalendarYear, `year ${y}: expected world calendar ${expectedCalendarYear}, got ${calendar(state.worldTime).year}`)
      const numericCount = validateState(state, bindings)
      result.checks.finiteNumberLeaves += numericCount
      result.checks.annual++
      run.annualCheckpoints++
      populationRange.min = Math.min(populationRange.min, engine.population(state))
      populationRange.max = Math.max(populationRange.max, engine.population(state))

      const saveStarted = performance.now()
      const raw = saves.serialize(state, Date.UTC(2026, 9, 3) + y * yearMinutes + seed)
      const serializedAt = performance.now()
      const decoded = saves.deserialize(raw)
      const decodedAt = performance.now()
      assert.equal(decoded.lastSavedAt, Date.UTC(2026, 9, 3) + y * yearMinutes + seed)
      assert.equal(JSON.stringify(decoded.state), JSON.stringify(state), `seed ${seed} year ${y}: exact save round-trip mismatch`)
      state = decoded.state
      activeState = state
      const roundTripMs = round(decodedAt - saveStarted)
      saveTimes.push(decodedAt - saveStarted)
      result.checks.saveRoundTrips++
      run.exactSaveRoundTrips++
      if (y === 1 || y % 10 === 0 || y === yearsPerSeed) saveTrend.push({ year: y, bytes: Buffer.byteLength(raw), serializeMs: round(serializedAt - saveStarted), deserializeMs: round(decodedAt - serializedAt), roundTripMs, elapsedMs: round(performance.now() - seedStart) })
      result.yearsCompleted = y
      result.current = { calendar: calendar(state.worldTime), population: engine.population(state), historyLength: state.history.length, eventLength: state.events.length }
      if (y % 10 === 0 || y === yearsPerSeed) {
        results.run.elapsedMs = round(performance.now() - runStart)
        await persist()
        console.log(`PROGRESS seed=${seed} year=${y}/${yearsPerSeed} pop=${engine.population(state)} history=${state.history.length} simYearMs=${round(simTimes.at(-1))} saveBytes=${Buffer.byteLength(raw)}`)
      }
    }

    result.elapsedMs = round(performance.now() - seedStart)
    result.events = eventTotals(state)
    result.eventCounts = eventCounts
    const requiredHistoryTypes = ['world.newYear', 'npc.born', 'npc.immigrated', 'npc.died', 'settlement.grew', 'monster.threatIncreased', 'boss.warning', 'boss.spawned', 'dungeon.threatIncreased', 'character.successor']
    for (const type of requiredHistoryTypes) requireThat((result.events[type] ?? 0) > 0, `seed ${seed} missing major history event ${type}`)
    requireThat(result.events['settlement.grew'] === 2 && state.settlement.stage === 'town', `seed ${seed} did not pass both settlement growth stages`)
    requireThat(result.events['boss.warning'] >= 2 && result.events['boss.spawned'] === 1 && eventCounts['npc.injured'] > 0, `seed ${seed} threat/Boss/injury path incomplete`)
    requireThat(result.checks.seasonTransitions === yearsPerSeed * 4 && result.checks.yearTransitions === yearsPerSeed, `seed ${seed} calendar transition counts incomplete`)
    requireThat(lineage.length > 0 && lineage.length === result.checks.saveRoundTrips - yearsPerSeed, `seed ${seed} natural succession or death round-trip count incomplete`)
    result.final = {
      calendar: calendar(state.worldTime), population: engine.population(state), playerId: state.activeCharacterId,
      playerAge: engine.player(state).age, settlementStage: state.settlement.stage, settlementCapacity: state.settlement.capacity,
      threatLevel: state.threat.threatLevel, campLevel: state.threat.campLevel, bossAlive: state.threat.bossAlive,
      bossProgress: state.threat.bossProgress, dungeonThreat: state.dungeon.threat,
      historyLength: state.history.length, eventLength: state.events.length, npcCount: state.npcs.length,
      livingCharacterCount: state.characters.filter(c => c.isAlive).length, totalCharacters: state.characters.length,
      npcNaturalDeaths: state.history.filter(e => e.type === 'npc.died' && e.category === 'npc').length,
      crops: state.crops.length, preparedPlots: state.preparedPlots,
    }
    result.status = 'passed'
    result.naturalPlayerDeaths = lineage.length
    result.simulationMsPerYear = { mean: round(simTimes.reduce((a, b) => a + b, 0) / simTimes.length), p50: percentile(simTimes, 0.5), p95: percentile(simTimes, 0.95), max: round(Math.max(...simTimes)) }
    result.saveLatencyMs = { p50: percentile(saveTimes, 0.5), p95: percentile(saveTimes, 0.95), max: round(Math.max(...saveTimes)), mean: round(saveTimes.reduce((a, b) => a + b, 0) / saveTimes.length) }
    delete result.current
    delete result.checks.dailySimulationCalls
    await persist()
    console.log(`PASS seed=${seed} deaths=${lineage.length} population=${result.final.population} history=${result.final.historyLength} meanMsPerYear=${result.simulationMsPerYear.mean} saveP95Ms=${result.saveLatencyMs.p95}`)
  }

  console.log('START chunk determinism seed=42 years=3 chunks=1,60,1440,43200; valid farm action setup')
  const { farm } = await server.ssrLoadModule('/src/engine/actions.ts')
  const chunkMinutes = [1, 60, CONFIG.minutesPerDay, 30 * CONFIG.minutesPerDay]
  const chunkYears = 3
  const totalMinutes = chunkYears * CONFIG.daysPerSeason * 4 * CONFIG.minutesPerDay
  const variantStates = []
  const variants = []
  for (const chunk of chunkMinutes) {
    activeSeed = 42
    activeYear = 0
    const state = engine.createGame(42)
    activeState = state
    requireThat(engine.walkTo(state, { x: 16, y: 10 }), 'determinism setup could not walk to the farm')
    requireThat(farm(state, 'prepare') === '' && farm(state, 'plant') === '', 'determinism setup could not use normal prepare/plant actions')
    const startTime = state.worldTime
    const start = performance.now()
    let left = totalMinutes
    let calls = 0
    while (left > 0) {
      const step = Math.min(left, chunk)
      engine.simulate(state, step)
      left -= step
      calls++
    }
    requireThat(engine.player(state).isAlive, 'chunk matrix crossed a player-death/succession boundary unexpectedly')
    requireThat(state.worldTime - startTime === totalMinutes, `chunk ${chunk}: elapsed world minutes differ`)
    requireThat(state.crops.length === 1 && state.crops[0].status === 'mature' && state.crops[0].matureAt <= state.worldTime, `chunk ${chunk}: planted crop did not mature`)
    const finiteLeaves = validateState(state, bindings)
    const saved = saves.serialize(state, Date.UTC(2026, 9, 3) + chunk)
    const roundtrip = saves.deserialize(saved)
    assert.equal(JSON.stringify(roundtrip.state), JSON.stringify(state), `chunk ${chunk}: save round-trip mismatch`)
    const stateJson = JSON.stringify(state)
    const digest = createHash('sha256').update(stateJson).digest('hex')
    variantStates.push(stateJson)
    variants.push({ chunkMinutes: chunk, simulationCalls: calls, elapsedMs: round(performance.now() - start), saveBytes: Buffer.byteLength(saved), stateSha256: digest, cropStatus: state.crops[0].status, cropCount: state.crops.length, finiteNumberLeaves: finiteLeaves, calendar: calendar(state.worldTime) })
    console.log(`MATRIX chunk=${chunk} calls=${calls} elapsedMs=${variants.at(-1).elapsedMs} saveBytes=${variants.at(-1).saveBytes}`)
  }
  for (let i = 1; i < variantStates.length; i++) assert.equal(variantStates[i], variantStates[0], `chunk size ${chunkMinutes[i]} diverged from 1-minute state under the same setup/policy`)
  results.chunkDeterminism = {
    status: 'passed: all serialized world states exactly equal', seed: 42, years: chunkYears, totalMinutes,
    chunks: chunkMinutes, cropSetup: 'walkTo farm; farm prepare; farm plant', successionBoundaryCrossed: false,
    inheritanceNote: 'three-year matrix ends before active-character natural lifespan; 500-year suite applies the same daily successor policy in every seed', variants,
  }
  run.status = 'passed'
} catch (error) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const failure = { seed: activeSeed, year: activeYear, error: message, snapshot: null }
  if (activeSeed !== null && activeState) {
    const snapshot = join(here, 'failures', `seed-${String(activeSeed).padStart(10, '0')}-year-${String(activeYear).padStart(3, '0')}.json`)
    writeRecorded(snapshot, `${JSON.stringify({ seed: activeSeed, year: activeYear, error: message, state: activeState }, null, 2)}\n`)
    failure.snapshot = snapshot
    const seedResult = results.seeds.find(s => s.seed === activeSeed)
    if (seedResult) { seedResult.status = 'failed'; seedResult.failure = message; seedResult.yearsCompleted = Math.max(seedResult.yearsCompleted, activeYear - 1) }
  }
  results.failures.push(failure)
  run.status = 'failed'
  console.error(`FAIL seed=${activeSeed} year=${activeYear}: ${message}`)
  process.exitCode = 1
} finally {
  await persist()
  if (server) await server.close()
}
