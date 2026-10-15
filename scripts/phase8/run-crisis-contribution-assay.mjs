import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const reportRoot = join(root, 'reports/v2/20261014-balance-tuning/phase-08/d-runner')
const started = new Date()
const attempt = join(reportRoot, `attempt-${started.toISOString().replaceAll(':','').replaceAll('-','').replaceAll('.','')}-contributions`)
await mkdir(attempt, { recursive: false })
const manifest = { command: 'node scripts/phase8/run-crisis-contribution-assay.mjs', startedAt: started.toISOString(), fixture: 'controlled deficit: severity 3, threat 3, monster population 100, boss alive, settlement food/safety zero/25, four guards, five logistics farmers, remaining adult NPCs retired; active player at community handoff with 25 food and 10000 gold.', costBasis: 'each source is applied through its public API up to the useful forecast/need boundary in one operation; guard staffing is an explicit controlled job reassignment. Mixed applies all four measured interventions.' }
await writeFile(join(attempt, 'manifest.json'), JSON.stringify(manifest, null, 2)+'\n', { flag: 'wx' })

let vite
try {
  vite = await createServer({ configFile: false, root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
  const [sim, crisis, contributions, defense, gear, domain] = await Promise.all([
    vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/engine/regionalCrisis.ts'),
    vite.ssrLoadModule('/src/engine/crisisContributions.ts'), vite.ssrLoadModule('/src/engine/civilDefense.ts'),
    vite.ssrLoadModule('/src/engine/gearStats.ts'), vite.ssrLoadModule('/src/domain/crisis.ts'),
  ])
  const { createGame, player } = sim
  const { tryStartRegionalCrisis } = crisis
  const { contributeCrisisFood, contributeCrisisGold, contributeCrisisEquipment } = contributions
  const { deriveCivilDefense } = defense
  const { rolledItemStats } = gear
  const { REGIONAL_CRISIS_CONTRIBUTION_LIMITS } = domain

  function makeFixture() {
    const state = createGame(83041)
    const character = player(state)
    character.position = { x: 8, y: 10 }; character.currentRegion = 'village'; character.status = 'idle'
    character.inventory.food = 25; character.gold = 10000
    Object.assign(state.settlement, { food: 0, safety: 25 })
    Object.assign(state.threat, { threatLevel: 3, monsterPopulation: 100, campLevel: 3, bossAlive: true })
    const adults = state.npcs.filter(npc => npc.isAlive)
    if (adults.length < 9) throw new Error(`controlled fixture requires at least 9 residents; found ${adults.length}`)
    adults.forEach((npc, index) => {
      npc.age = 30; npc.injuredUntil = state.worldTime
      const life = state.life.npcs[npc.id]
      if (index < 4) { npc.job = 'guard'; npc.equipment.weapon = null; npc.equipment.armor = null; life.career = 'worker'; life.careerJob = 'guard' }
      else if (index < 9) { npc.job = 'farmer'; life.career = 'worker'; life.careerJob = 'farmer' }
      else { life.career = 'retired' }
    })
    if (!tryStartRegionalCrisis(state, () => 0)) throw new Error('controlled fixture could not start crisis')
    return state
  }

  function stats(state) {
    const model = deriveCivilDefense(state, state.regionalCrisis)
    if (!model) throw new Error('crisis readiness unavailable')
    return { readiness: model.readiness, successChance: model.successChance, threatDemand: model.threatDemand,
      needs: model.needs, food: model.food, defenders: model.availableDefenders, targetDefenders: model.targetDefenders,
      equippedDefenderSlots: model.equippedDefenderSlots, capacities: model.capacity }
  }
  function addGear(state, guardIds, count) {
    const records = []
    for (let index = 0; index < count; index++) {
      const defender = guardIds[Math.floor(index / 2)]
      const baseId = index % 2 === 0 ? 'shortSword' : 'hideArmor'
      const instanceId = `controlled-${index + 1}`
      state.reward.instances.push({ instanceId, ownerId: state.activeCharacterId, baseId, level: 1, material: null,
        rarity: 'common', rolledStats: rolledItemStats(baseId, 1, []), affixes: [], specialTrait: null, provenance: null, craftProvenance: null })
      records.push({ instanceId, defenderNpcId: defender.id, baseId })
    }
    state.reward.nextInstanceId = Math.max(state.reward.nextInstanceId, count + 1)
    return records
  }
  function setMoreGuards(state, count) {
    const promoted = []
    for (const npc of state.npcs.filter(item => item.isAlive && state.life.npcs[item.id]?.career === 'retired').slice(0, count)) {
      state.life.npcs[npc.id].career = 'worker'; state.life.npcs[npc.id].careerJob = 'guard'; npc.job = 'guard'; npc.age = 30; npc.injuredUntil = state.worldTime
      npc.equipment.weapon = null; npc.equipment.armor = null
      promoted.push(npc.id)
    }
    return promoted
  }
  function applyPackage(kind, equalAction = false) {
    const state = makeFixture()
    const interventionSet = kind.replace(/^equal-action-/, '')
    const before = stats(state)
    const crisisId = state.regionalCrisis.id
    const guards = state.npcs.filter(npc => npc.isAlive && npc.job === 'guard')
    const interventions = []
    if (interventionSet === 'food-only' || interventionSet === 'mixed') {
      const neededItems = Math.min(player(state).inventory.food, Math.floor(Math.max(0, before.capacities.foodPoints - before.food.rawProjectedAtResolution) / 4))
      const amount = equalAction ? Math.min(1, neededItems) : Math.max(1, neededItems)
      const result = contributeCrisisFood(state, crisisId, amount)
      interventions.push({ type: 'food', amount, supply: state.regionalCrisis.contributions.food.supplied, result })
    }
    if (interventionSet === 'gold-only' || interventionSet === 'mixed') {
      const amount = equalAction ? Math.min(5, before.capacities.gold) : before.capacities.gold
      const result = amount > 0 ? contributeCrisisGold(state, crisisId, amount) : 'no-gold-capacity'
      interventions.push({ type: 'gold', amount, spent: state.regionalCrisis.contributions.gold.spent, result })
    }
    if (interventionSet === 'equipment-only' || interventionSet === 'mixed') {
      const count = Math.min(before.capacities.equipmentSlots - before.equippedDefenderSlots, guards.length * 2,
        REGIONAL_CRISIS_CONTRIBUTION_LIMITS.equipmentAllocations, equalAction ? 1 : Number.MAX_SAFE_INTEGER)
      const gearRows = addGear(state, guards, count)
      for (const row of gearRows) row.result = contributeCrisisEquipment(state, crisisId, row.defenderNpcId, row.instanceId)
      interventions.push({ type: 'equipment', itemCount: gearRows.length, allocations: state.regionalCrisis.contributions.equipment.length, result: gearRows.every(row => row.result === '') ? '' : 'one-or-more-rejected' })
    }
    if (interventionSet === 'defenders-only' || interventionSet === 'mixed') {
      const promoted = setMoreGuards(state, Math.min(equalAction ? 1 : Number.MAX_SAFE_INTEGER, Math.max(0, before.targetDefenders - before.defenders)))
      interventions.push({ type: 'guards', promotedNpcIds: promoted, count: promoted.length, cap: before.targetDefenders })
    }
    const after = stats(state)
    return { kind, costModel: equalAction ? 'equal action-count probe: one public API call/item per donation source; guards use one controlled job reassignment; mixed uses one of each.' : 'max useful contribution within the live forecast/need and per-crisis caps; guards fill the remaining defender target.', before, after,
      readinessDelta: after.readiness - before.readiness, successChanceDelta: after.successChance - before.successChance,
      contributions: structuredClone(state.regionalCrisis.contributions), interventions,
      caps: { foodSupply: REGIONAL_CRISIS_CONTRIBUTION_LIMITS.foodSupply, gold: REGIONAL_CRISIS_CONTRIBUTION_LIMITS.gold,
        equipmentAllocations: REGIONAL_CRISIS_CONTRIBUTION_LIMITS.equipmentAllocations, targetDefenders: before.targetDefenders } }
  }
  const rows = ['food-only', 'gold-only', 'equipment-only', 'defenders-only', 'mixed'].map(kind => applyPackage(kind, false))
  rows.push(...['food-only', 'gold-only', 'equipment-only', 'defenders-only', 'mixed'].map(kind => applyPackage(`equal-action-${kind}`, true)))
  await writeFile(join(attempt, 'contribution-probes.json'), JSON.stringify(rows, null, 2)+'\n', { flag: 'wx' })
  console.log(JSON.stringify({ attempt, probes: rows.map(row => ({ kind: row.kind, readinessDelta: row.readinessDelta, successChanceDelta: row.successChanceDelta, interventions: row.interventions, caps: row.caps })) }))
} finally { if (vite) await vite.close() }
