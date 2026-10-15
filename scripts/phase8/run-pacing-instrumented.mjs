/**
 * Normal fresh-save route harness with v3 control and Phase8 measured policies.
 *
 * The route decisions call the same public engine actions and eligibility projections exposed by the UI.
 * Game time, stamina, station hours, crop seasons, recipe inputs and encounter ranks remain engine-owned.
 * The UI has no fixed actions-per-day limit: the day boundary below is only a reporting slice; the runner's
 * 80-decision ceiling is a safety guard. Policies stop or wait when no legal useful action fits the current
 * state, then let the public simulation advance the remaining world time.
 *
 * Life preserves a starter-spear bill of materials (3 wood, 2 stone), rotates through the farm, forest and
 * mine, plants only a currently available all-season wheat crop, crafts only when planCraft says the store
 * station transaction is legal, and sells surplus after reserving the next recipe inputs. It starts no combat.
 * Adventure rotates forest, mine and the revealed valley by day, follows the legal wolf rank track, chooses
 * the highest currently eligible content rank, and challenges the Goblin Chief only after the world spawns it.
 * The v3 control caps normal-rank starts at three per in-game day. The measured route caps them at one,
 * leaving the area uncleared for another day or recovery, while still taking any legal higher-rank target.
 * Hybrid alternates those Life and Adventure decisions by game day. These are repeatable scripted policies,
 * not human play; their itinerary, thresholds and encounter cap can shape measured outcomes.
 */
import { createHash } from 'node:crypto'
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyNoProgress } from './classify-playtest.mjs'
import { classifyActionOutcome, evaluateRouteValidity, evaluateSeedVariance } from './route-validity.mjs'
import {
  canStartNormalEncounter, countPotionUses, normalEncounterCutoffReason, orderAdventureTargets,
  parseRoutePolicy, reconstructIncomingDamage, summarizeCombatOutcomes,
} from './route-policy.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const policy = parseRoutePolicy(process.argv.slice(2))
const attemptRoot = join(root, 'reports/v2/20261014-balance-tuning/phase-08/e-runner')
const SEEDS = [61101, 61102, 61103]
const YEARS = 3
const POLICY_VERSION = policy.version
const started = new Date()
const stamp = started.toISOString().replaceAll(':', '').replaceAll('-', '').replaceAll('.', '')
const out = join(attemptRoot, `instrumented-attempt-${stamp}`)

async function readHead() {
  const git = join(root, '.git')
  const head = (await readFile(join(git, 'HEAD'), 'utf8')).trim()
  if (!head.startsWith('ref: ')) return head
  const ref = head.slice(5)
  try { return (await readFile(join(git, ref), 'utf8')).trim() }
  catch (error) {
    if (error.code !== 'ENOENT') throw error
    const packed = await readFile(join(git, 'packed-refs'), 'utf8')
    const row = packed.split(/\r?\n/).find(line => line.endsWith(` ${ref}`))
    if (!row) throw new Error(`Cannot resolve HEAD ref ${ref}`)
    return row.split(' ')[0]
  }
}

async function srcFingerprint() {
  const src = join(root, 'src'), files = []
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const full = join(path, entry.name)
      if (entry.isDirectory()) await visit(full)
      else files.push(full)
    }
  }
  await visit(src); files.sort()
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(file.slice(src.length).replaceAll('\\', '/') + '\0')
    hash.update(await readFile(file)); hash.update('\0')
  }
  return { method: 'sha256 over sorted relative path + NUL + file bytes + NUL', value: hash.digest('hex'), files: files.length }
}

const csv = rows => {
  if (!rows.length) return ''
  const columns = Object.keys(rows[0])
  const quote = value => {
    const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return `${columns.join(',')}\n${rows.map(row => columns.map(key => quote(row[key])).join(',')).join('\n')}\n`
}

await mkdir(attemptRoot, { recursive: true })
await mkdir(out, { recursive: false })
const head = await readHead()
const fingerprint = await srcFingerprint()
const manifest = {
  head, srcFingerprint: fingerprint, seeds: SEEDS, routePolicyVersion: POLICY_VERSION,
  command: `node scripts/phase8/run-pacing-instrumented.mjs --policy ${policy.id}`, startedAt: started.toISOString(),
  window: { years: YEARS, calendarYears: 'game calendar years 1–3; stop at exact year-4 boundary', bands: { year1: 'early', year2: 'mid', year3: 'late' } },
  dailyActionBudget: 'The UI has no fixed actions-per-day counter. Engine actions spend their configured stamina and/or game minutes; movement costs 5 minutes per tile, gather spends 10 stamina and 15–43 minutes by skill, farming spends 4–6 stamina and 10–20 minutes, craft spends recipe-defined stamina/time (starterSpear: 10/45 minutes), encounter starts spend 8 stamina, combat turns advance 1 minute and retreat advances 10 minutes, and village rest restores 35 stamina/15 HP in 60 minutes (inn: full recovery, 8 gold, 480 minutes). The runner uses midnight only as a time-series boundary, chooses legal actions repeatedly within the day, and simulates the remainder when the policy has no legal useful action. The 80-decision daily ceiling is a harness safety guard, not a game/UI rule; actions can cross midnight.',
  routePolicies: {
    life: 'Only legal public gather/farm/craft/sell/rest/travel actions; never starts a voluntary encounter. Plants all-season wheat when a plot is free, harvests when mature, reserves 3 wood and 2 stone for starterSpear at the store station, follows planCraft readiness, and sells gathered surplus only after the reserve is protected.',
    adventure: policy.id === 'v3'
      ? 'Uses legal public movement and encounter APIs; rotates forest/mine/valley by game day and picks the highest eligible rank. Control behavior is unchanged: up to three Normal starts per day, while eligible higher ranks bypass the cap.'
      : `Uses the same legal APIs, itinerary, seed and three-year window as v3. ${normalEncounterCutoffReason(policy.id)} This is a player-plausible daily hunt budget, not a game rule or threat tuning.`,
    hybrid: policy.id === 'v3'
      ? 'Alternates the full Life policy and Adventure policy by in-game day; if combat is active, resolves it before taking an action from either half. Both halves must complete successful actions per seed. Control behavior is unchanged.'
      : `Alternates the same Life and measured Adventure decisions by in-game day; ${normalEncounterCutoffReason(policy.id)} Higher-rank targets remain selectable.`,
  },
  routeVariants: { life: `life-${policy.id}`, adventure: policy.id === 'v3' ? 'adventure-v3' : 'adventure-measured', hybrid: policy.id === 'v3' ? 'hybrid-v3' : 'hybrid-measured' },
  combatObservation: {
    potionUse: 'Exact count from inventory potion delta per combat action.',
    grossDamageTaken: 'Reconstructed from action-boundary HP delta plus measured potion healing when an enemy attack occurs; healer rows are NOT MEASURED rather than treating net HP loss as gross damage.',
    fightCost: 'Gold, potion and owner-material deltas are retained per encounter; non-gold values are not converted to gold.',
  },
  label: 'Normal fresh-save (scripted policy); not a human playtest and not a controlled fixture',
}
  await writeFile(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })

let vite
const daily = [], encounters = [], actions = [], crafts = [], gearChanges = [], unlocks = [], cropYields = [], routeValidity = [], decisionRows = [], bossVisibility = []
let decisionCount = 0
const currentCombat = new WeakMap()
let seedEvidence = []
let seedVariance = { status: 'INVALID_POLICY', failures: ['seed-rng-variance-not-verified'], checks: {} }
let status = 'PASS', failure = null
try {
  vite = await createServer({ configFile: false, root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
  const [simulation, actionApi, contentApi, craftApi, rewardApi, cropApi, configApi, craftingData, itemData, calendarApi, registry, wolfApi, randomApi] = await Promise.all([
    vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/engine/actions.ts'),
    vite.ssrLoadModule('/src/engine/contentFamilies.ts'), vite.ssrLoadModule('/src/engine/crafting.ts'),
    vite.ssrLoadModule('/src/engine/rewardActions.ts'), vite.ssrLoadModule('/src/engine/crops.ts'),
    vite.ssrLoadModule('/src/data/config.ts'), vite.ssrLoadModule('/src/data/crafting.ts'),
    vite.ssrLoadModule('/src/data/rewards.ts'), vite.ssrLoadModule('/src/engine/calendar.ts'),
    vite.ssrLoadModule('/src/data/contentRegistry.ts'), vite.ssrLoadModule('/src/engine/wolfFamily.ts'),
    vite.ssrLoadModule('/src/engine/random.ts'),
  ])
  const { createGame, player, walkTo, simulate } = simulation
  const { buyPrice, farm, gather, rest, encounter, combatTurn } = actionApi
  const { contentEncounterOptions, encounterContentMonster } = contentApi
  const { wolfEncounterOptions, encounterWolf } = wolfApi
  const { craft, planCraft } = craftApi
  const { canVisit, equipInstance, sellInstance, tradeMaterial } = rewardApi
  const { farmCropChoices } = cropApi
  const { CONFIG, BUILDINGS, ITEMS, MONSTERS, BOSS } = configApi
  const { CRAFTING_RECIPES } = craftingData
  const { ITEM_BASES, RARITIES, MATERIALS, WOLF_MONSTERS } = itemData
  const { CONTENT_MONSTERS } = registry
  const { calendar } = calendarApi
  const { random } = randomApi
  const routes = ['life', 'adventure', 'hybrid']
  const routeVariant = route => `${route}-${policy.id}`
  const endAt = YEARS * CONFIG.daysPerSeason * CONFIG.seasons.length * CONFIG.minutesPerDay
  const recipeIds = Object.keys(CRAFTING_RECIPES).sort()
  const rarityRank = Object.fromEntries(Object.keys(RARITIES).map((id, index) => [id, index]))
  seedEvidence = SEEDS.map(seed => {
    const probeState = createGame(seed)
    const probe = { rngState: probeState.rngState }
    return { seed, worldSeed: probeState.worldSeed, rngState: probeState.rngState, rngProbe: random(probe) }
  })
  seedVariance = evaluateSeedVariance(seedEvidence)
  const freshState = createGame(SEEDS[0])
  const reachableFreshRecipes = recipeIds.filter(recipeId => {
    const recipe = CRAFTING_RECIPES[recipeId]
    return freshState.settlement.buildings.includes(recipe.station)
      && player(freshState).skills.smithing.level >= recipe.requiredSmithing
      && recipe.inputs.every(input => input.source === 'inventory' && ['wood', 'stone', 'iron'].includes(input.itemId))
  })

  const materialCounts = state => ({ ...(state.reward.materials[state.activeCharacterId] ?? {}) })
  const decisionSnapshot = state => {
    const c = player(state), minuteOfDay = state.worldTime % CONFIG.minutesPerDay
    const contentOptions = contentEncounterOptions(state).map(({ definitionId, rank, eligible, reason }) => ({ definitionId, rank, eligible, reason: reason ?? null }))
    const wolfOptions = wolfEncounterOptions(state).map(({ definitionId, rank, eligible, reason }) => ({ definitionId, rank, eligible, reason: reason ?? null }))
    const crops = farmCropChoices(state).map(({ id, status, reason, growthMinutes, harvestAmount }) => ({ id, status, reason: reason ?? null, growthMinutes, harvestAmount }))
    const recipePlans = recipeIds.map(recipeId => {
      const plan = planCraft(state, { recipeId })
      return { recipeId, legal: plan.ok, reason: plan.reasonCode ?? null, practiceXpAward: plan.practice?.xpAward ?? null }
    })
    const settlementStageIndex = ['hamlet', 'village', 'town'].indexOf(state.settlement.stage)
    const trade = ['store', 'blacksmith'].map(shop => ({ shop, open: canVisit(state, shop), items: Object.keys(ITEMS)
      .filter(id => shop === 'blacksmith' ? ['sword', 'armor'].includes(id) : !['sword', 'armor'].includes(id)).map(id => ({ id,
      buyPrice: buyPrice(state, id), buyLegal: canVisit(state, shop) && c.gold >= buyPrice(state, id) && settlementStageIndex >= ITEMS[id].minStage,
      sellLegal: canVisit(state, shop) && (c.inventory[id] ?? 0) > 0 && (ITEMS[id].sell ?? 0) > 0 })) }))
    const regions = Object.fromEntries(Object.entries(state.regions).map(([id, value]) => [id, { remainingAmount: value.remainingAmount }]))
    const cooldowns = Object.fromEntries(Object.entries(state.reward.bossForms ?? {}).map(([id, form]) => [id,
      form.kind === 'cooldownUntil' ? { availableAt: form.availableAt, remainingMinutes: Math.max(0, form.availableAt - state.worldTime) } : { kind: form.kind }]))
    return { worldTime: state.worldTime, minuteOfDay, location: { region: c.currentRegion, ...c.position }, stamina: c.stamina,
      hp: c.hp, maxHp: c.maxHp, gold: c.gold, shopOpen: { store: canVisit(state, 'store'), blacksmith: canVisit(state, 'blacksmith') },
      cooldowns: { bossForms: cooldowns, director: Object.fromEntries(Object.entries(state.life.director.cooldowns ?? {})
        .filter(([id]) => id.includes('boss') || id.includes('wolf')).map(([id, at]) => [id, { at, remainingMinutes: Math.max(0, at - state.worldTime) }])) },
      crops: state.crops.map(crop => ({ cropId: crop.cropId, status: crop.status, matureAt: crop.matureAt })),
      preparedPlots: state.preparedPlots, cropOptions: crops, contentOptions, wolfOptions, recipePlans, trade, regions,
      bossAlive: state.threat.bossAlive, combat: state.combat ? { monsterId: state.combat.monsterId,
        definitionId: state.combat.contentEncounter?.definitionId ?? state.combat.familyEncounter?.definitionId ?? null } : null }
  }
  const skillXpTotal = state => Object.values(player(state).skills)
    .reduce((sum, skill) => sum + 10 * (skill.level - 1) * skill.level + skill.exp, 0)
  const actionState = state => {
    const c = player(state)
    return JSON.stringify({ worldTime: state.worldTime, pos: c.position, region: c.currentRegion, level: c.level, exp: c.exp, hp: c.hp, stamina: c.stamina,
      gold: c.gold, inventory: c.inventory, skills: c.skills, crops: state.crops, plots: state.preparedPlots,
      materials: materialCounts(state), instances: state.reward.instances.map(item => item.instanceId),
      equipped: state.reward.equipped[c.id] ?? null,
      combat: state.combat ? [state.combat.monsterId, state.combat.hp, state.combat.contentEncounter?.definitionId ?? null,
        state.combat.familyEncounter?.definitionId ?? null] : null, threat: state.threat.monsterPopulation })
  }
  let activePolicyHalf = 'life'
  let activeDay = 0
  const metric = (route, seed, state, dayIndex) => {
    const c = player(state), materials = materialCounts(state)
    return { route, routeVariant: routeVariant(route), policy: policy.id, seed, day: dayIndex, worldTime: state.worldTime, calendarYear: calendar(state.worldTime).year,
      band: calendar(state.worldTime).year <= 1 ? 'early' : calendar(state.worldTime).year === 2 ? 'mid' : 'late',
      playerLevel: c.level, hp: c.hp, stamina: c.stamina, gold: c.gold, wood: c.inventory.wood, stone: c.inventory.stone,
      iron: c.inventory.iron, food: c.inventory.food, playerMaterials: materials, farming: c.skills.farming.level,
      woodcutting: c.skills.woodcutting.level, mining: c.skills.mining.level, smithing: c.skills.smithing.level,
      combat: c.skills.combat.level, cropCount: state.crops.length, preparedPlots: state.preparedPlots,
      matureCropCount: state.crops.filter(crop => crop.status === 'mature').length,
      monsterPopulation: state.threat.monsterPopulation, settlementStage: state.settlement.stage,
      equipped: state.reward.equipped[c.id] ?? { weapon: null, armor: null } }
  }
  const move = (route, seed, state, destination, choice) => {
    if (player(state).position.x === destination.x && player(state).position.y === destination.y) return false
    return act(route, seed, state, choice, () => walkTo(state, destination), value => value === true)
  }
  function act(route, seed, state, choice, operation, success) {
    const before = actionState(state), beforeTime = state.worldTime
    const beforeGold = player(state).gold, beforeMaterials = materialCounts(state)
    const result = operation()
    const engineSuccess = success(result)
    const failureReason = typeof result === 'string' ? result : result?.message ?? result?.error ?? ''
    const classification = classifyActionOutcome({ engineSuccess, stateChanged: actionState(state) !== before, failureReason })
    const afterMaterials = materialCounts(state)
    const materialDelta = Object.fromEntries([...new Set([...Object.keys(beforeMaterials), ...Object.keys(afterMaterials)])]
      .map(id => [id, (afterMaterials[id] ?? 0) - (beforeMaterials[id] ?? 0)]))
    const observed = { route, routeVariant: routeVariant(route), policy: policy.id, seed, day: activeDay, policyHalf: activePolicyHalf, at: beforeTime, choice, goldDelta: player(state).gold - beforeGold, materialDelta }
    if (classification.noProgress) {
      const category = classifyNoProgress({ choice, visibleCue: failureReason })
      actions.push({ ...observed, result: failureReason || JSON.stringify(result), ...classification,
        category: category.category, confidence: category.confidence, categoryReason: category.reason })
    }
    else actions.push({ ...observed, result: 'success', ...classification })
    return !classification.noProgress
  }
  const recordPolicyNoop = (route, seed, state, half, dayIndex) => {
    const result = 'policy-found-no-legal-progressing-action'
    const category = classifyNoProgress({ choice: `${half}-policy-no-action`, visibleCue: result })
    const row = { route, seed, policyHalf: half, at: state.worldTime, day: dayIndex,
      choice: `${half}-policy-no-action`, result, outcome: 'no-progress', noProgress: true,
      reason: result, category: category.category, confidence: category.confidence, categoryReason: category.reason }
    actions.push(row)
    return row
  }
  const craftDiagnostics = new Map()
  const rankEvidenceBySeed = new Map()
  const evidenceKey = (route, seed) => `${route}/${seed}`
  const craftDiagnosticFor = (route, seed) => {
    const key = evidenceKey(route, seed)
    if (!craftDiagnostics.has(key)) craftDiagnostics.set(key, { checkedPlanCount: 0, legalRecipes: new Set(), blockedReasons: {} })
    return craftDiagnostics.get(key)
  }
  const rankEvidenceFor = (route, seed) => {
    const key = evidenceKey(route, seed)
    if (!rankEvidenceBySeed.has(key)) rankEvidenceBySeed.set(key, {
      sampledDecisions: 0, higherRankEligibleCount: 0, regions: {}, eligibleByRank: { normal: {}, elite: {}, miniBoss: {}, boss: {} },
      blockedReasonsByRank: { normal: {}, elite: {}, miniBoss: {}, boss: {} },
    })
    return rankEvidenceBySeed.get(key)
  }
  const observeRankOption = (evidence, option) => {
    const rank = option.rank
    if (!evidence.eligibleByRank[rank]) return
    if (option.eligible) {
      evidence.eligibleByRank[rank][option.definitionId] = (evidence.eligibleByRank[rank][option.definitionId] ?? 0) + 1
      if (rank !== 'normal') evidence.higherRankEligibleCount++
    } else {
      const reason = option.reason || 'not-eligible-without-a-reason'
      evidence.blockedReasonsByRank[rank][reason] = (evidence.blockedReasonsByRank[rank][reason] ?? 0) + 1
    }
  }
  const recordRankAvailability = (route, seed, state) => {
    const evidence = rankEvidenceFor(route, seed)
    evidence.sampledDecisions++
    const region = player(state).currentRegion
    evidence.regions[region] = (evidence.regions[region] ?? 0) + 1
    for (const option of contentEncounterOptions(state)) observeRankOption(evidence, option)
    for (const option of wolfEncounterOptions(state)) observeRankOption(evidence, option)
    if (region === 'forest' && state.threat.bossAlive && player(state).stamina >= 8) {
      observeRankOption(evidence, { definitionId: BOSS.monsterId, rank: 'boss', eligible: true, reason: null })
    }
  }
  const finalizeRankEvidence = evidence => {
    const { normal: _normal, ...higher } = evidence.eligibleByRank
    const blocked = Object.entries(evidence.blockedReasonsByRank)
      .filter(([rank]) => rank !== 'normal')
      .flatMap(([rank, reasons]) => Object.entries(reasons).map(([reason, count]) => `${rank}:${reason} (${count})`))
    const noHigherRankReason = evidence.higherRankEligibleCount ? null
      : `No Elite, MiniBoss, or Boss target was legal in ${evidence.sampledDecisions} sampled Adventure decisions across ${Object.keys(evidence.regions).join(', ') || 'no regions'}; disabled track reasons observed: ${blocked.join('; ') || 'higher-rank spawn profiles did not match the sampled region, level, threat, season, hour, settlement, or progression state.'}`
    return { ...evidence, eligibleByRank: { normal: evidence.eligibleByRank.normal, ...higher }, noHigherRankReason }
  }
  const recordRecipeUnlocks = (route, seed, state) => {
    const diagnostic = craftDiagnosticFor(route, seed)
    for (const recipeId of recipeIds) {
      const plan = planCraft(state, { recipeId })
      diagnostic.checkedPlanCount++
      if (plan.ok) diagnostic.legalRecipes.add(recipeId)
      else diagnostic.blockedReasons[plan.reasonCode] = (diagnostic.blockedReasons[plan.reasonCode] ?? 0) + 1
      if (plan.ok && !unlocks.some(row => row.route === route && row.seed === seed && row.recipeId === recipeId)) {
        unlocks.push({ route, seed, recipeId, firstLegalAt: state.worldTime, smithingLevel: player(state).skills.smithing.level,
          masterpieceEligible: plan.masterpiece.eligible, masterpieceChance: plan.masterpiece.chance })
      }
    }
  }
  const currentGearScore = (state, slot) => {
    const id = state.reward.equipped[player(state).id]?.[slot]
    const item = state.reward.instances.find(candidate => candidate.instanceId === id)
    return item ? { level: item.level, rarity: rarityRank[item.rarity] ?? 0, id: item.instanceId } : { level: 0, rarity: -1, id: null }
  }
  const equipBetter = (route, seed, state) => {
    for (const item of state.reward.instances.filter(candidate => candidate.ownerId === player(state).id)) {
      const slot = ITEM_BASES[item.baseId]?.slot
      if (!slot) continue
      const old = currentGearScore(state, slot)
      if (!(item.level > old.level || item.level === old.level && (rarityRank[item.rarity] ?? 0) > old.rarity)) continue
      if (act(route, seed, state, 'equip', () => equipInstance(state, item.instanceId), result => result === '')) {
        const next = currentGearScore(state, slot)
        gearChanges.push({ route, seed, at: state.worldTime, slot, prior: old, next, meaningful: true,
          firstUpgradeAt: gearChanges.some(row => row.route === route && row.seed === seed) ? null : state.worldTime })
        return true
      }
    }
    return false
  }
  // Tile coordinates are the canonical public map positions used by the player movement API.
  const regionTarget = (state, region) => {
    const tile = state.tiles.find(candidate => candidate.regionId === region && candidate.walkable)
    return tile ? { x: tile.x, y: tile.y } : null
  }
  const smithingXpTotal = state => {
    const skill = player(state).skills.smithing
    return 10 * (skill.level - 1) * skill.level + skill.exp
  }
  const craftTransactionReady = plan => plan.skill.unlocked
    && plan.inputs.every(input => input.current !== null && input.current >= input.required)
    && plan.gold.current !== null && plan.gold.required !== null && plan.gold.current >= plan.gold.required
    && plan.stamina.current !== null && plan.stamina.required !== null && plan.stamina.current >= plan.stamina.required
    && plan.station.built && plan.access.alive && !plan.access.inCombat && !plan.access.inDungeon
  const minutesUntilStationOpens = (state, station) => {
    if (station.opensAtHour === null || station.closesAtHour === null) return 0
    const minuteOfDay = state.worldTime % CONFIG.minutesPerDay
    const openAt = station.opensAtHour * 60, closeAt = station.closesAtHour * 60
    if (minuteOfDay < openAt) return openAt - minuteOfDay
    if (minuteOfDay >= closeAt) return CONFIG.minutesPerDay - minuteOfDay + openAt
    return 0
  }
  const waitForStation = (route, seed, state, station, choice = 'wait-for-station') => {
    const minutes = minutesUntilStationOpens(state, station)
    if (!minutes) return false
    return act(route, seed, state, choice, () => { simulate(state, minutes); return '' }, result => result === '')
  }
  const adventureTargets = state => {
    const c = player(state)
    const targets = []
    for (const option of contentEncounterOptions(state).filter(candidate => candidate.eligible)) {
      targets.push({ kind: 'content', definitionId: option.definitionId, rank: option.rank })
    }
    for (const option of wolfEncounterOptions(state).filter(candidate => candidate.eligible)) {
      targets.push({ kind: 'wolf', definitionId: option.definitionId, rank: option.rank })
    }
    if (c.currentRegion === 'forest' && c.stamina >= 8) {
      if (state.threat.bossAlive) targets.push({ kind: 'chief', definitionId: BOSS.monsterId, rank: 'boss' })
      if (state.threat.monsterPopulation >= 1) targets.push({ kind: 'wild', definitionId: 'wild-encounter', rank: 'normal' })
    }
    return orderAdventureTargets(targets, policy.id, state.reward.collection.defeated)
  }
  const bossDefinitionIsValid = id => CONTENT_MONSTERS[id]?.rank === 'boss'
    || WOLF_MONSTERS[id]?.rank === 'boss' || MONSTERS[id]?.boss === true
  const rankDefinitionIsValid = row => {
    const contentRank = CONTENT_MONSTERS[row.definitionId]?.rank
    if (contentRank) return contentRank === row.rank
    const wolfRank = WOLF_MONSTERS[row.definitionId]?.rank
    if (wolfRank) return wolfRank === row.rank
    const legacy = MONSTERS[row.definitionId]
    if (!legacy) return false
    return row.rank === 'boss' ? legacy.boss === true : row.rank === 'normal' && legacy.boss !== true
  }
  const runCombatAction = (route, seed, state) => {
    const c = player(state), combat = state.combat
    let active = currentCombat.get(state)
    if (!active || active.combat !== combat) {
      const id = combat.contentEncounter?.definitionId ?? combat.familyEncounter?.definitionId ?? combat.monsterId
      const familyRank = combat.familyEncounter ? WOLF_MONSTERS[id]?.rank : undefined
      const rank = CONTENT_MONSTERS[id]?.rank ?? familyRank
        ?? (MONSTERS[combat.monsterId]?.boss ? 'boss' : combat.elite ? 'elite' : 'normal')
      const familyId = combat.contentEncounter?.familyId ?? (combat.familyEncounter ? 'wolf' : id)
      const band = calendar(state.worldTime).year <= 1 ? 'early' : calendar(state.worldTime).year === 2 ? 'mid' : 'late'
      const firstEncounterForFamily = !encounters.some(row => row.route === route && row.seed === seed && row.familyId === familyId)
      const row = { key: `${route}/${seed}/${encounters.length + 1}`, route, routeVariant: routeVariant(route), policy: policy.id, seed, day: activeDay, at: state.worldTime,
        familyId, definitionId: id, rank, band, firstEncounterForFamily, playerLevel: c.level,
        hpBefore: c.hp, hpMaxBefore: c.maxHp, outcome: 'active', turns: 0, hpAfter: null, hpMaxAfter: null,
        retreat: false, death: false, potionUse: 0, grossDamageTaken: 0, grossDamageStatus: 'MEASURED',
        goldBefore: c.gold, potionBefore: c.inventory.potion, materialsBefore: materialCounts(state), staminaBefore: c.stamina }
      encounters.push(row)
      active = { combat, row }
      currentCombat.set(state, active)
    }
    const row = active.row
    let command = 'attack'
    if (c.hp < c.maxHp * .28 || row.turns >= 9) command = 'run'
    else if (c.hp < c.maxHp * .55 && c.inventory.potion > 0) command = 'potion'
    const hpBefore = c.hp, maxHpBefore = c.maxHp, potionBefore = c.inventory.potion
    const hasHealer = state.party.some(member => member.archetype === 'healer'
      && state.npcs.some(npc => npc.id === member.npcId && npc.isAlive))
    const did = act(route, seed, state, command === 'run' ? 'retreat' : command === 'potion' ? 'potion' : 'combat',
      () => combatTurn(state, command), result => result === '')
    if (did) {
      row.turns++
      const potionUses = countPotionUses(potionBefore, c.inventory.potion)
      if (potionUses === null) row.grossDamageStatus = 'NOT MEASURED: invalid potion inventory delta'
      else row.potionUse += potionUses
      const receivedAttack = command !== 'run' && (Boolean(state.combat) || !c.isAlive)
      const damage = reconstructIncomingDamage({ hpBefore, hpAfter: c.hp, maxHp: maxHpBefore,
        potionUses: potionUses ?? 0, receivedAttack, healingUnknown: hasHealer })
      if (damage === null) row.grossDamageStatus = hasHealer
        ? 'NOT MEASURED: healer companion HP contribution is not separated at this runner boundary'
        : 'NOT MEASURED: combat action boundary did not permit exact reconstruction'
      else if (row.grossDamageStatus === 'MEASURED') row.grossDamageTaken += damage
    }
    if (!c.isAlive) { row.outcome = 'death'; row.death = true; row.hpAfter = c.hp; row.hpMaxAfter = c.maxHp; row.playerLevelAfter = c.level }
    else if (!state.combat) { row.outcome = command === 'run' ? 'retreat' : 'win'; row.retreat = command === 'run'; row.hpAfter = c.hp; row.hpMaxAfter = c.maxHp; row.playerLevelAfter = c.level }
    if (row.outcome !== 'active') {
      row.goldDelta = c.gold - row.goldBefore
      row.potionInventoryDelta = c.inventory.potion - row.potionBefore
      row.timeDeltaMinutes = state.worldTime - row.at
      row.staminaDelta = c.stamina - row.staminaBefore
      const materialsAfter = materialCounts(state)
      row.materialDelta = Object.fromEntries([...new Set([...Object.keys(row.materialsBefore), ...Object.keys(materialsAfter)])]
        .map(id => [id, (materialsAfter[id] ?? 0) - (row.materialsBefore[id] ?? 0)]))
      delete row.goldBefore; delete row.potionBefore; delete row.materialsBefore; delete row.staminaBefore
    }
    return did
  }
  const allWinsExplanation = rows => {
    if (!rows.length || !rows.every(row => row.outcome === 'win')) return null
    const hpBeforeAfterChecked = rows.every(row => Number.isFinite(row.hpBefore) && Number.isFinite(row.hpAfter)
      && row.hpBefore > 0 && row.hpAfter > 0 && Number.isFinite(row.hpMaxBefore) && Number.isFinite(row.hpMaxAfter))
    const rankCatalogChecked = rows.every(rankDefinitionIsValid)
    const bossRows = rows.filter(row => row.rank === 'boss')
    const bossDefinitionIdsChecked = bossRows.every(row => bossDefinitionIsValid(row.definitionId))
    const bossIds = [...new Set(bossRows.map(row => row.definitionId))]
    return {
      text: `All recorded encounters ended in wins. Every row's HP before/after and rank catalog entry was checked; Boss definition IDs checked: ${bossIds.join(', ') || 'none engaged'}. Policy ${policy.id} chooses the highest currently eligible public target; ${normalEncounterCutoffReason(policy.id)} The runner uses potions below 55% HP, retreats below 28% HP or after 9 turns, and rests below 35% HP or 8 stamina. These safeguards explain policy outcomes only; they are not normal-player win-rate evidence.`,
      hpBeforeAfterChecked,
      rankCatalogChecked,
      bossDefinitionIdsChecked,
      bossDefinitionIds: bossIds,
      bossRowsChecked: bossRows.length,
    }
  }
  const adventureStep = (route, seed, state, day) => {
    const c = player(state)
    if (state.combat) return runCombatAction(route, seed, state)
    if (c.stamina < 8 || c.hp < c.maxHp * .35) {
      if (c.currentRegion === 'village') return act(route, seed, state, 'rest', () => rest(state, 'rest'), result => result === '')
      return move(route, seed, state, BUILDINGS.inn.position, 'navigation')
    }
    const encountersToday = encounters.filter(row => row.route === route && row.seed === seed && row.day === day)
    const normalStartsToday = encountersToday.filter(row => row.rank === 'normal').length
    const currentTargets = adventureTargets(state)
    const higherRankTarget = currentTargets.find(target => target.rank !== 'normal')
    const startTarget = target => {
      if (target.kind === 'content') return act(route, seed, state, `content-encounter-${target.rank}`,
        () => encounterContentMonster(state, target.definitionId), result => result === '')
      if (target.kind === 'wolf') return act(route, seed, state, `wolf-track-${target.rank}`,
        () => encounterWolf(state, target.definitionId), result => result === '')
      if (target.kind === 'chief') return act(route, seed, state, 'goblin-boss-challenge',
        () => encounter(state, true), result => result === '')
      return act(route, seed, state, 'forest-encounter', () => encounter(state, false), result => result === '')
    }
    if (higherRankTarget) return startTarget(higherRankTarget)
    // The v3 control retains its original total-encounter accounting. Measured applies its one-start cap to Normal only.
    if (!canStartNormalEncounter(policy.id, policy.id === 'v3' ? encountersToday.length : normalStartsToday)) return false
    const expeditionRegions = ['forest', 'mine', 'unknown']
    const targetRegion = expeditionRegions[day % expeditionRegions.length]
    if (c.currentRegion !== targetRegion) {
      const destination = regionTarget(state, targetRegion)
      if (destination) return move(route, seed, state, destination, 'explore')
    }
    const target = adventureTargets(state)[0]
    if (target) return startTarget(target)
    if (c.currentRegion !== 'forest') return move(route, seed, state, regionTarget(state, 'forest'), 'explore')
    return false
  }
  const surplusGatheredDays = new Set()
  const lifeStep = (route, seed, state, day) => {
    const c = player(state)
    if (state.combat) return runCombatAction(route, seed, state)
    if (c.stamina < 10 || c.hp < c.maxHp * .75) {
      if (c.currentRegion !== 'village') return move(route, seed, state, BUILDINGS.inn.position, 'navigation')
      return act(route, seed, state, 'rest', () => rest(state, 'rest'), result => result === '')
    }

    const mature = state.crops.some(crop => crop.status === 'mature')
    if (mature && c.currentRegion !== 'farmland') return move(route, seed, state, BUILDINGS.farm.position, 'navigation')
    if (mature && c.currentRegion === 'farmland' && c.stamina >= 4) {
      const planted = state.crops.find(crop => crop.status === 'mature')
      const crop = farmCropChoices(state).find(choice => choice.id === planted?.cropId)
      const beforeFood = c.inventory.food, beforeMaterials = materialCounts(state)
      const succeeded = act(route, seed, state, 'harvest', () => farm(state, 'harvest'), result => result === '')
      if (succeeded && crop) {
        const afterMaterials = materialCounts(state)
        const goodDelta = crop.harvestGoodId ? (afterMaterials[crop.harvestGoodId] ?? 0) - (beforeMaterials[crop.harvestGoodId] ?? 0) : 0
        cropYields.push({ route, seed, at: state.worldTime, cropId: crop.id, yield: goodDelta || c.inventory.food - beforeFood,
          output: crop.harvestGoodId ?? 'food', farmingLevel: c.skills.farming.level })
      }
      return succeeded
    }

    const starterPlan = planCraft(state, { recipeId: 'starterSpear' })
    const starterReady = craftTransactionReady(starterPlan)
    if (starterPlan.ok) {
      recordRecipeUnlocks(route, seed, state)
      const before = state.reward.instances.length, smithingBefore = smithingXpTotal(state)
      let result
      const ok = act(route, seed, state, 'craft', () => { result = craft(state, { recipeId: starterPlan.recipeId }); return result }, value => value.ok)
      if (ok) {
        const item = state.reward.instances.at(-1)
        crafts.push({ route, seed, at: state.worldTime, recipeId: starterPlan.recipeId, instanceId: item.instanceId,
          smithingLevel: c.skills.smithing.level, smithingXpBefore: smithingBefore, smithingXpAfter: smithingXpTotal(state),
          practiceXpAward: starterPlan.practice.xpAward, masterpieceEligible: starterPlan.masterpiece.eligible,
          masterpieceChance: starterPlan.masterpiece.chance, masterpiece: result.masterpiece, rarity: item.rarity,
          affixes: item.affixes, instanceCountBefore: before })
        return true
      }
    }
    if (starterReady && starterPlan.station.id) {
      if (!starterPlan.station.nearby) return move(route, seed, state, BUILDINGS[starterPlan.station.id].position, 'navigation')
      if (!starterPlan.station.open) return waitForStation(route, seed, state, starterPlan.station, 'wait-for-store-open')
    }

    const availableCrop = c.currentRegion === 'farmland'
      ? farmCropChoices(state).find(crop => crop.id === 'wheat' && crop.status === 'available') : null
    if (!state.crops.length && !state.preparedPlots && state.crops.length + state.preparedPlots < CONFIG.maxPlots) {
      if (c.currentRegion !== 'farmland') return move(route, seed, state, BUILDINGS.farm.position, 'navigation')
      if (availableCrop && c.stamina >= 6) return act(route, seed, state, 'prepare', () => farm(state, 'prepare'), result => result === '')
    }
    if (c.currentRegion === 'farmland' && state.preparedPlots > 0 && availableCrop && c.stamina >= 4) {
      return act(route, seed, state, 'plant', () => farm(state, 'plant', availableCrop.id), result => result === '')
    }

    const recipe = CRAFTING_RECIPES.starterSpear
    const reserve = Object.fromEntries(recipe.inputs.filter(input => input.source === 'inventory').map(input => [input.itemId, input.amount]))
    const saleItem = ['wood', 'stone', 'iron'].find(id => c.inventory[id] > (reserve[id] ?? 0) && ITEMS[id]?.sell > 0)
    const saleMaterial = Object.entries(materialCounts(state)).find(([id, amount]) => amount > 0 && MATERIALS[id]?.sell > 0)
    if (saleItem || saleMaterial) {
      if (canVisit(state, 'store')) {
        if (saleItem) return act(route, seed, state, 'sell-gathered', () => actionApi.trade(state, saleItem, false), result => result === '')
        return act(route, seed, state, 'sell-material', () => tradeMaterial(state, saleMaterial[0]), result => result === '')
      }
      if (c.position.x !== BUILDINGS.store.position.x || c.position.y !== BUILDINGS.store.position.y) {
        return move(route, seed, state, BUILDINGS.store.position, 'navigation')
      }
      return waitForStation(route, seed, state, { opensAtHour: 8, closesAtHour: 18 }, 'wait-for-store-open')
    }

    const surplusDayKey = `${route}/${seed}/${day}`
    if (day % 14 === 0 && !surplusGatheredDays.has(surplusDayKey) && c.inventory.iron === 0) {
      if (c.currentRegion !== 'mine') {
        const destination = regionTarget(state, 'mine')
        if (destination) return move(route, seed, state, destination, 'navigation')
      }
      const amountNeeded = 2 + Math.floor((c.skills.mining.level - 1) / 2)
      if (state.regions.mine.remainingAmount >= amountNeeded && c.stamina >= 10) {
        const gathered = act(route, seed, state, 'gather', () => gather(state, 'iron'), result => result === '')
        if (gathered) surplusGatheredDays.add(surplusDayKey)
        return gathered
      }
    }

    const missingInput = starterPlan.inputs.find(input => input.source === 'inventory' && input.current !== null && input.current < input.required)
    if (missingInput) {
      const kind = missingInput.itemId
      const targetRegion = kind === 'wood' ? 'forest' : 'mine'
      if (c.currentRegion !== targetRegion) {
        const destination = regionTarget(state, targetRegion)
        if (destination) return move(route, seed, state, destination, 'navigation')
      }
      const amountNeeded = 2 + Math.floor((c.skills[kind === 'wood' ? 'woodcutting' : 'mining'].level - 1) / 2)
      if (state.regions[targetRegion].remainingAmount >= amountNeeded && c.stamina >= 10) {
        return act(route, seed, state, 'gather', () => gather(state, kind), result => result === '')
      }
    }

    if (starterReady && starterPlan.station.id) {
      return move(route, seed, state, BUILDINGS[starterPlan.station.id].position, 'navigation')
    }
    return false
  }

  for (const route of routes) for (const seed of SEEDS) {
    const state = createGame(seed)
    const start = state.worldTime, initialSkillXp = skillXpTotal(state), initialSmithingXp = smithingXpTotal(state)
    const seedRngEvidence = seedEvidence.find(row => row.seed === seed)
    const life = { route, seed, startedAt: start, completedAt: null, outcome: null, actions: 0, crafts: 0, firstMeaningfulGearAt: null }
    let day = 0
    while (state.worldTime < endAt && player(state).isAlive && day < YEARS * CONFIG.daysPerSeason * CONFIG.seasons.length + 10) {
      const dayIndex = Math.floor(state.worldTime / CONFIG.minutesPerDay)
      activeDay = dayIndex
      const dayStart = state.worldTime
      const nextBoundary = Math.min(endAt, (dayIndex + 1) * CONFIG.minutesPerDay)
      const before = metric(route, seed, state, dayIndex)
      let decisions = 0, consecutiveNoProgress = 0, policyActionProgressed = false
      while (state.worldTime < nextBoundary && player(state).isAlive && decisions < 80) {
        const half = state.combat ? 'adventure' : route === 'hybrid' ? (dayIndex % 2 === 0 ? 'life' : 'adventure') : route
        activePolicyHalf = half
        if (half === 'adventure' && !state.combat) recordRankAvailability(route, seed, state)
        const decisionId = `${route}/${seed}/${day}/${decisions + 1}/${state.worldTime}`
        const beforeDecision = decisionSnapshot(state)
        const actionStart = actions.length
        const visibleBoss = beforeDecision.contentOptions.filter(option => option.rank === 'boss')
          .map(option => ({ id: option.definitionId, eligible: option.eligible, reason: option.reason }))
        if (beforeDecision.location.region === 'forest') visibleBoss.push(...beforeDecision.wolfOptions
          .filter(option => option.rank === 'boss').map(option => ({ id: option.definitionId, eligible: option.eligible, reason: option.reason })))
        if (beforeDecision.location.region === 'forest' && beforeDecision.bossAlive) visibleBoss.push({ id: BOSS.monsterId,
          eligible: beforeDecision.stamina >= 8, reason: beforeDecision.stamina >= 8 ? null : 'stamina-below-encounter-cost' })
        if (visibleBoss.length) bossVisibility.push({ route, seed, at: state.worldTime, visible: visibleBoss,
          firstVisible: !bossVisibility.some(row => row.route === route && row.seed === seed && row.firstVisible),
          firstEligible: visibleBoss.some(row => row.eligible) && !bossVisibility.some(row => row.route === route && row.seed === seed && row.firstEligible) })
        const priorActionCount = actions.length
        const progressed = state.combat ? runCombatAction(route, seed, state)
          : half === 'life' ? lifeStep(route, seed, state, dayIndex) : adventureStep(route, seed, state, dayIndex)
        if (half === 'adventure' && !state.combat) equipBetter(route, seed, state)
        if (actions.length === priorActionCount) recordPolicyNoop(route, seed, state, half, dayIndex)
        const actionEvents = actions.slice(actionStart)
        const noProgress = actionEvents.some(row => row.noProgress)
        const eligibleEncounters = [...beforeDecision.contentOptions, ...beforeDecision.wolfOptions].filter(option => option.eligible)
        const legalRecipes = beforeDecision.recipePlans.filter(row => row.legal)
        const legalCropActions = beforeDecision.cropOptions.filter(row => ['available', 'mature'].includes(row.status))
        const legalTrades = beforeDecision.trade.flatMap(shop => shop.items.flatMap(item => [
          item.buyLegal && { shop: shop.shop, item: item.id, action: 'buy' }, item.sellLegal && { shop: shop.shop, item: item.id, action: 'sell' },
        ].filter(Boolean)))
        const gatherable = beforeDecision.stamina >= 10 && Object.values(beforeDecision.regions).some(region => region.remainingAmount >= 1)
        const betterLegalOptions = [
          ...eligibleEncounters.map(option => `encounter:${option.definitionId}`), ...legalRecipes.map(option => `craft:${option.recipeId}`),
          ...legalCropActions.map(option => `crop:${option.id}:${option.status}`), ...legalTrades.map(option => `${option.action}:${option.item}`),
          ...(gatherable ? ['gather:available-region-resource'] : []),
        ]
        const noProgressCategory = noProgress
          ? beforeDecision.stamina < 4 || (beforeDecision.hp <= 0)
            ? { category: 'lacking resources', confidence: 'medium', reason: 'contemporaneous stamina/health is below basic action threshold' }
            : betterLegalOptions.length
              ? { category: 'runner policy defect', confidence: 'high', reason: `policy no-op while legal options were projected: ${betterLegalOptions.slice(0, 12).join(', ')}` }
              : beforeDecision.crops.some(crop => crop.status !== 'mature')
                ? { category: 'legitimate world wait', confidence: 'medium', reason: 'planted crop is still growing and no legal immediate option was projected' }
                : { category: 'no understandable next goal', confidence: 'low', reason: 'no immediate legal progression option was projected; player-facing goal comprehension is not observable in this harness' }
          : null
        const policyObjective = state.combat ? 'resolve the active encounter (attack, potion below the v3 threshold, or retreat at the v3 safety threshold)'
          : half === 'life' ? 'Life priority: recover; harvest mature crop; craft legal starterSpear; prepare/plant wheat; sell surplus; periodic iron; gather missing bill inputs; move to legal station.'
            : 'Adventure priority: recover below v3 thresholds; otherwise select the highest eligible target using route-policy.mjs v3 ordering; when none, follow the day-rotated expedition region.'
        decisionRows.push({ decisionId, route, seed, day: dayIndex, policyHalf: half, policyObjective,
        before: { worldTime: beforeDecision.worldTime, minuteOfDay: beforeDecision.minuteOfDay, location: beforeDecision.location,
          stamina: beforeDecision.stamina, hp: beforeDecision.hp, maxHp: beforeDecision.maxHp, gold: beforeDecision.gold,
          shopOpen: beforeDecision.shopOpen, cooldowns: beforeDecision.cooldowns, crops: beforeDecision.crops,
          preparedPlots: beforeDecision.preparedPlots, regions: beforeDecision.regions, bossAlive: beforeDecision.bossAlive, combat: beforeDecision.combat },
        legalOptions: { encounterProjections: { content: beforeDecision.contentOptions, wolves: beforeDecision.wolfOptions },
          crops: beforeDecision.cropOptions, recipes: legalRecipes,
          blockedRecipeReasons: beforeDecision.recipePlans.filter(row => !row.legal).reduce((counts, row) => {
            counts[row.reason] = (counts[row.reason] ?? 0) + 1; return counts
          }, {}), trades: legalTrades, gatherable }, chosenAction: actionEvents.map(({ choice, outcome, result, reason }) => ({ choice, outcome, result, reason: reason ?? null })),
        outcome: noProgress ? 'no-progress' : actionEvents.length ? actionEvents.map(row => row.outcome).join('+') : 'world-time-advanced-by-runner',
        noProgressCategory, betterLegalOptions })
        const latestAction = actions.at(-1)
        const actionProgressed = Boolean(latestAction && latestAction.outcome === 'success')
        policyActionProgressed ||= actionProgressed && Boolean(progressed)
        consecutiveNoProgress = actionProgressed ? 0 : consecutiveNoProgress + 1
        recordRecipeUnlocks(route, seed, state)
        decisions++
        if (consecutiveNoProgress >= 1) break
      }
      if (state.worldTime < nextBoundary) simulate(state, nextBoundary - state.worldTime)
      const after = metric(route, seed, state, dayIndex)
      recordRecipeUnlocks(route, seed, state)
      const dayActions = actions.filter(row => row.route === route && row.seed === seed && row.day === dayIndex)
      const materialIncome = {}
      for (const action of dayActions) for (const [id, amount] of Object.entries(action.materialDelta ?? {})) {
        if (amount > 0) materialIncome[id] = (materialIncome[id] ?? 0) + amount
      }
      daily.push({ ...after, goldDeltaDay: after.gold - before.gold,
        materialDeltaDay: Object.fromEntries([...new Set([...Object.keys(before.playerMaterials), ...Object.keys(after.playerMaterials)])].map(id => [id, (after.playerMaterials[id] ?? 0) - (before.playerMaterials[id] ?? 0)])),
        goldIncomeObservedDay: dayActions.reduce((sum, action) => sum + Math.max(0, action.goldDelta ?? 0), 0),
        materialIncomeObservedDay: materialIncome,
        cropYieldDay: cropYields.filter(row => row.route === route && row.seed === seed && row.at >= dayStart && row.at < nextBoundary)
          .reduce((sum, row) => sum + row.yield, 0),
        policyActions: dayActions.length, policyActionProgressed })
      day++
    }
    life.completedAt = state.worldTime
    life.outcome = player(state).isAlive ? 'window-complete' : 'death'
    const seedActions = actions.filter(row => row.route === route && row.seed === seed)
    const seedEncounters = encounters.filter(row => row.route === route && row.seed === seed)
    const seedGearChanges = gearChanges.filter(row => row.route === route && row.seed === seed)
    const unlockTimes = unlocks.filter(row => row.route === route && row.seed === seed)
    const seedCrafts = crafts.filter(row => row.route === route && row.seed === seed)
    const smithingXpGained = smithingXpTotal(state) - initialSmithingXp
    const craftDiagnostic = craftDiagnosticFor(route, seed)
    const craftingEvidence = {
      checkedPlanCount: craftDiagnostic.checkedPlanCount,
      legalPlanSeen: craftDiagnostic.legalRecipes.size > 0,
      legalRecipes: [...craftDiagnostic.legalRecipes].sort(),
      successfulCrafts: seedCrafts.length,
      smithingXpGained,
      blockedReasonCounts: craftDiagnostic.blockedReasons,
      freshSaveReachableRecipes: reachableFreshRecipes,
      impossibilityReason: reachableFreshRecipes.length ? null
        : 'No catalog recipe has a built starting station, a currently reachable Smithing requirement, and inputs supplied by public wood/stone/iron gathering.',
      noSmithingXpReason: seedCrafts.length && !smithingXpGained && seedCrafts.every(row => row.practiceXpAward === 0)
        ? 'All successful crafts occurred after the recipe practice cap had been reached.' : null,
    }
    const rankEvidence = finalizeRankEvidence(rankEvidenceFor(route, seed))
    const allWins = allWinsExplanation(seedEncounters)
    const validity = evaluateRouteValidity({ route, actions: seedActions, encounters: seedEncounters,
      skillXpGained: skillXpTotal(state) - initialSkillXp, smithingXpGained, craftingEvidence,
      rankEvidence, seedVariance, allWinsExplanation: allWins })
    routeValidity.push({ route, seed, ...validity, seedRngEvidence, craftingEvidence, rankEvidence, allWinsExplanation: allWins })
    life.actions = seedActions.length
    life.crafts = seedCrafts.length
    life.combatWins = seedEncounters.filter(row => row.outcome === 'win').length
    life.combatDeaths = seedEncounters.filter(row => row.outcome === 'death').length
    life.retreats = seedEncounters.filter(row => row.outcome === 'retreat').length
    life.noProgress = seedActions.filter(row => row.noProgress).length
    life.skillXpGained = skillXpTotal(state) - initialSkillXp
    life.smithingXpGained = smithingXpGained
    life.firstMeaningfulGearAt = seedGearChanges[0]?.at ?? null
    life.firstCraftPlanLegalCount = unlockTimes.length
    life.masterpieceEligibleRecipeCount = unlockTimes.filter(row => row.masterpieceEligible).length
    const summary = { ...life, final: metric(route, seed, state, day), routeLabel: 'Normal fresh-save (scripted policy)', policyVersion: POLICY_VERSION,
      validity, seedRngEvidence, craftingEvidence, rankEvidence, allWinsExplanation: allWins,
      timeToFirstUpgradeMinutes: life.firstMeaningfulGearAt === null ? null : life.firstMeaningfulGearAt - start,
      meaningfulUpgradeRule: 'equipped item with higher level, or same level and higher rarity than the prior equipped instance',
      upgradeGapsMinutes: seedGearChanges.slice(1).map((row, index) => row.at - seedGearChanges[index].at),
      recipeUnlockInterpretation: 'first sampled time when public planCraft returned legal; not an authored unlock event' }
    await writeFile(join(out, `seed-${route}-${seed}.json`), `${JSON.stringify({ summary, daily: daily.filter(row => row.route === route && row.seed === seed), encounters: seedEncounters, actions: seedActions, crafts: seedCrafts, cropYields: cropYields.filter(row => row.route === route && row.seed === seed), gearChanges: seedGearChanges, recipeUnlocks: unlockTimes }, null, 2)}\n`, { flag: 'wx' })
    const decisionFile = await open(join(out, `decisions-${route}-${seed}.jsonl`), 'wx')
    try { for (const row of decisionRows) await decisionFile.write(`${JSON.stringify(row)}\n`) } finally { await decisionFile.close() }
    decisionCount += decisionRows.length
    decisionRows.length = 0
  }
  status = routeValidity.some(result => result.status === 'INVALID_POLICY') ? 'INVALID_POLICY' : 'PASS'
} catch (error) {
  status = 'FAIL'; failure = { message: String(error), stack: error?.stack ?? null }
} finally {
  await vite?.close()
  const encounterSummaries = summarizeCombatOutcomes(encounters)
  await writeFile(join(out, 'time-series.csv'), csv(daily), { flag: 'wx' })
  await writeFile(join(out, 'encounters.csv'), csv(encounters), { flag: 'wx' })
  await writeFile(join(out, 'encounter-summary.csv'), csv(encounterSummaries), { flag: 'wx' })
  await writeFile(join(out, 'actions.csv'), csv(actions), { flag: 'wx' })
  await writeFile(join(out, 'crafts.csv'), csv(crafts), { flag: 'wx' })
  await writeFile(join(out, 'gear-upgrades.csv'), csv(gearChanges), { flag: 'wx' })
  await writeFile(join(out, 'recipe-unlocks.csv'), csv(unlocks), { flag: 'wx' })
  await writeFile(join(out, 'crop-yields.csv'), csv(cropYields), { flag: 'wx' })
  await writeFile(join(out, 'boss-visibility.json'), `${JSON.stringify(bossVisibility, null, 2)}\n`, { flag: 'wx' })
  await writeFile(join(out, 'completion.json'), `${JSON.stringify({ status, failure, endedAt: new Date().toISOString(), seedVariance, seedEvidence, routeValidity,
    encounterSummaries, bossVisibility,
    instrumentation: { decisionRows: decisionCount, decisionFormat: 'per route/seed JSONL', scope: 'pre-decision world state, projected legal options, selected action/outcome; snapshots are synchronous engine observations' },
    rows: { daily: daily.length, encounters: encounters.length, actions: actions.length, crafts: crafts.length, gearChanges: gearChanges.length, unlocks: unlocks.length, cropYields: cropYields.length } }, null, 2)}\n`, { flag: 'wx' })
  await writeFile(join(out, 'runner.log'), `${status} daily=${daily.length} encounters=${encounters.length} actions=${actions.length}${failure ? ` error=${failure.message}` : ''}\n`, { flag: 'wx' })
}
console.log(JSON.stringify({ attempt: out, status, failure, dailyRows: daily.length, encounters: encounters.length, actions: actions.length }, null, 2))
if (status !== 'PASS') process.exitCode = 1
