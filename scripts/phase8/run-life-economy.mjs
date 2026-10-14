/**
 * Phase8-C1 economy evidence runner. It uses public engine actions for normal and controlled
 * transactions. Direct skill/stage setup is limited to explicitly labelled controlled probes.
 * A fresh UTC attempt folder is exclusive-created; historical evidence is never removed.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ECONOMY_SEEDS, ECONOMY_YEARS, arbitrageResult, csv, stockObservation, summarizeLedger } from './economy-harness-core.mjs'
import { evaluateRouteValidity, evaluateSeedVariance } from './route-validity.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const phaseRoot = join(root, 'reports/v2/20261014-balance-tuning/phase-08/c-runner')
const started = new Date()
const stamp = started.toISOString().replaceAll(':', '').replaceAll('-', '').replaceAll('.', '')
const out = join(phaseRoot, `attempt-${stamp}`)
const endAt = ECONOMY_YEARS * 360 * 1440
const ACTION_LIMIT_PER_DAY = 24

async function readHead() {
  const head = (await readFile(join(root, '.git/HEAD'), 'utf8')).trim()
  if (!head.startsWith('ref: ')) return head
  const ref = head.slice(5)
  try { return (await readFile(join(root, '.git', ref), 'utf8')).trim() }
  catch (error) {
    if (error.code !== 'ENOENT') throw error
    const packed = await readFile(join(root, '.git/packed-refs'), 'utf8')
    const line = packed.split(/\r?\n/).find(row => row.endsWith(` ${ref}`))
    if (!line) throw new Error(`Cannot resolve HEAD ${ref}`)
    return line.split(' ')[0]
  }
}

async function srcFingerprint() {
  const src = join(root, 'src'), files = []
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else files.push(path)
    }
  }
  await visit(src); files.sort()
  const hash = createHash('sha256')
  for (const path of files) {
    hash.update(path.slice(src.length).replaceAll('\\', '/') + '\0')
    hash.update(await readFile(path)); hash.update('\0')
  }
  return { method: 'sha256 over sorted relative path + NUL + file bytes + NUL', value: hash.digest('hex'), files: files.length }
}

await mkdir(phaseRoot, { recursive: true })
await mkdir(out, { recursive: false })
const manifest = {
  command: 'node scripts/phase8/run-life-economy.mjs', startedAt: started.toISOString(),
  head: await readHead(), srcFingerprint: await srcFingerprint(), seeds: ECONOMY_SEEDS, years: ECONOMY_YEARS,
  routeVariants: ['life-normal-economy-observation', 'hybrid-alternating-life-adventure-economy-observation', 'crafting-focused-legal-recipe-progression', 'farm-business-supply-legal-recipe-progression', 'seasonal-crop-farm-sell-legal-choice'],
  controlledProbe: 'Smithing 1/3/5/6 × village/town market-stage fixtures, repeated legal Buy → Craft → Sell; fixture fields are listed in controlled-probes.json.',
  marketModel: 'The harness records state stock fields and restock events if present. Source search found no merchant stock inventory or restock API; absence is recorded as NOT MODELED, not inferred as a zero stock quantity.',
  label: 'Normal fresh-save scripted-policy evidence; not human play or product targets',
}
await writeFile(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })

let vite
const actionRows = [], dayRows = [], cropRows = [], craftRows = [], recipePlanRows = [], recipeUnlockRows = [], routeSummaries = [], probeRows = []
try {
  vite = await createServer({ configFile: false, root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
  const [sim, actions, crafting, crops, rewards, ownership, data, calendarApi] = await Promise.all([
    vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/engine/actions.ts'),
    vite.ssrLoadModule('/src/engine/crafting.ts'), vite.ssrLoadModule('/src/engine/crops.ts'),
    vite.ssrLoadModule('/src/engine/rewardActions.ts'), vite.ssrLoadModule('/src/engine/ownership.ts'),
    vite.ssrLoadModule('/src/data/config.ts'), vite.ssrLoadModule('/src/engine/calendar.ts'),
  ])
  const { createGame, player, walkTo, simulate } = sim
  const { farm, gather, trade, rest, encounter, combatTurn } = actions
  const { craft, planCraft } = crafting
  const { farmCropChoices, farmCropPlantingGuidance } = crops
  const { canVisit, itemSellPrice, sellInstance, tradeMaterial } = rewards
  const { propertyEligibility, buyProperty, supplyFarmFood } = ownership
  const { BUILDINGS, CONFIG, ITEMS } = data
  const { CRAFTING_RECIPES } = await vite.ssrLoadModule('/src/data/crafting.ts')
  const { MATERIALS } = await vite.ssrLoadModule('/src/data/rewards.ts')
  const { calendar } = calendarApi
  const recipeIds = Object.keys(CRAFTING_RECIPES).sort()

  const inventoryView = state => ({ ...player(state).inventory })
  const materialView = state => ({ ...(state.reward.materials[player(state).id] ?? {}) })
  const stockView = state => stockObservation(state)
  const areaTarget = { farm: BUILDINGS.farm.position, store: BUILDINGS.store.position,
    blacksmith: BUILDINGS.blacksmith.position, village: BUILDINGS.house.position }
  const regionTarget = (state, region) => {
    const tile = state.tiles.find(candidate => candidate.regionId === region && candidate.walkable)
    return tile ? { x: tile.x, y: tile.y } : null
  }
  const move = (state, destination, type = 'move') => {
    if (player(state).position.x === destination.x && player(state).position.y === destination.y) return false
    return record(state, type, null, () => walkTo(state, destination), result => result === true)
  }
  function record(state, kind, itemId, operation, success = result => result === '') {
    const beforeInv = inventoryView(state), beforeMat = materialView(state), beforeGold = player(state).gold
    const beforePosition = { ...player(state).position, region: player(state).currentRegion, stamina: player(state).stamina }
    const beforeSkills = structuredClone(player(state).skills), beforeTime = state.worldTime
    const beforeSettlementFood = state.settlement.food
    const beforeStock = stockView(state)
    const result = operation()
    const afterInv = inventoryView(state), afterMat = materialView(state), afterStock = stockView(state)
    const keys = new Set([...Object.keys(beforeMat), ...Object.keys(afterMat)])
    const materialDelta = Object.fromEntries([...keys].map(id => [id, (afterMat[id] ?? 0) - (beforeMat[id] ?? 0)]).filter(([, n]) => n))
    const inventoryDelta = Object.fromEntries(Object.keys(beforeInv).map(id => [id, (afterInv[id] ?? 0) - (beforeInv[id] ?? 0)]).filter(([, n]) => n))
    const row = { route: current.route, variant: current.variant, seed: current.seed, day: Math.floor(beforeTime / CONFIG.minutesPerDay),
      at: beforeTime, kind, itemId, ok: success(result), result: typeof result === 'string' ? result : result?.message ?? '',
      reasonCode: result && typeof result === 'object' ? result.reasonCode ?? null : null,
      ...(current.variant === 'seasonal-farm-sell' ? { positionBefore: beforePosition,
        positionAfter: { ...player(state).position, region: player(state).currentRegion, stamina: player(state).stamina } } : {}),
      goldBefore: beforeGold, goldDelta: player(state).gold - beforeGold, goldAfter: player(state).gold,
      settlementFoodDelta: state.settlement.food - beforeSettlementFood,
      inventoryDelta, materialDelta, smithingBefore: beforeSkills.smithing.level, smithingAfter: player(state).skills.smithing.level,
      farmingBefore: beforeSkills.farming.level, farmingAfter: player(state).skills.farming.level,
      stockBefore: beforeStock, stockAfter: afterStock }
    actionRows.push(row)
    return row
  }
  let current = { route: '', variant: '', seed: 0 }
  let seasonalTravelingToField = false
  let seasonalReturnToField = false
  const waitUntil = (state, targetTime, kind = 'world-wait') => {
    const until = Math.min(endAt, Math.max(state.worldTime, targetTime))
    if (until > state.worldTime) record(state, kind, null, () => { simulate(state, until - state.worldTime); return '' })
  }
  const visit = (state, station) => {
    const p = player(state), target = areaTarget[station] ?? regionTarget(state, station)
    if (!target) return false
    if (p.position.x !== target.x || p.position.y !== target.y) return move(state, target)
    return false
  }
  const restForWork = state => {
    if (player(state).stamina >= 10) return false
    if (player(state).currentRegion !== 'village') return visit(state, 'village')
    record(state, 'rest', null, () => rest(state, 'rest'))
    return true
  }

  function farmStep(state) {
    const c = player(state)
    const ownedBusiness = state.life.properties.some(property => property.ownerId === c.id && property.kind === 'farmBusiness')
    if (current.variant === 'farm-business-supply' && ownedBusiness) {
      if (c.inventory.food >= 10 && state.settlement.food > 90) {
        // Avoid recording repeated public purchase failures once this policy's cash
        // reserve is spent; let the normal craft/gather/sale policy earn more first.
        if (c.gold < 25) return false
        const store = BUILDINGS.store.position
        if (c.position.x !== store.x || c.position.y !== store.y) return move(state, store)
        const hour = calendar(state.worldTime).hour
        const dayStart = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay
        if (hour < BUILDINGS.store.opens || hour >= BUILDINGS.store.closes) {
          waitUntil(state, hour >= BUILDINGS.store.closes
            ? dayStart + CONFIG.minutesPerDay + BUILDINGS.store.opens * 60
            : dayStart + BUILDINGS.store.opens * 60, 'wait-for-store-open')
          return true
        }
        // Public food purchases lower settlement stock by 0.2 each. This legal sink
        // creates observable capacity when passive settlement production holds it full.
        record(state, 'buy-food-to-open-settlement-supply', 'food', () => trade(state, 'food', true))
        return true
      }
      if (c.inventory.food >= 10 && state.settlement.food <= 90) {
        const farm = BUILDINGS.farm.position
        if (c.position.x !== farm.x || c.position.y !== farm.y) return move(state, farm)
        const amount = Math.min(10, c.inventory.food, Math.floor(100 - state.settlement.food))
        if (amount > 0) {
          record(state, 'supply-farm-food-civil-defense', 'food', () => supplyFarmFood(state, amount))
          return true
        }
      }
      if (c.currentRegion !== 'farmland') {
        const farmland = regionTarget(state, 'farmland')
        return farmland ? move(state, farmland) : false
      }
    }
    const mature = state.crops.find(crop => crop.status === 'mature')
    if (mature) {
      if (c.currentRegion !== 'farmland') return visit(state, 'farm')
      const choice = farmCropChoices(state).find(item => item.id === mature.cropId)
      const beforeFood = c.inventory.food, beforeMat = materialView(state)
      const row = record(state, 'farm-harvest', mature.cropId, () => farm(state, 'harvest'))
      const afterMat = materialView(state)
      const goodId = choice?.harvestGoodId
      const harvestYield = goodId ? (afterMat[goodId] ?? 0) - (beforeMat[goodId] ?? 0) : c.inventory.food - beforeFood
      cropRows.push({ route: current.route, variant: current.variant, seed: current.seed, at: state.worldTime,
        cropId: mature.cropId, plantedAt: mature.plantedAt, plantedSeason: CONFIG.seasons[calendar(mature.plantedAt).season],
        matureAt: mature.matureAt, maturityMinutes: mature.growthDuration, maturityDays: mature.growthDuration / CONFIG.minutesPerDay,
        yield: harvestYield, output: goodId ?? 'food', foodValueEach: choice?.foodValue ?? 1,
        foodEquivalent: harvestYield * (choice?.foodValue ?? 1), unitSell: choice?.sell ?? 0,
        potentialSaleProceeds: goodId ? harvestYield * (choice?.sell ?? 0) : 0,
        fieldStamina: 14, fieldStaminaWithPlotPreparation: 20,
        grossGoldPerStamina: goodId ? harvestYield * (choice?.sell ?? 0) / 14 : 0,
        grossGoldPerMatureDay: mature.growthDuration ? harvestYield * (choice?.sell ?? 0) * CONFIG.minutesPerDay / mature.growthDuration : 0,
        farmingLevel: c.skills.farming.level, actionOk: row.ok })
      return true
    }
    if (current.variant === 'seasonal-farm-sell') {
      // A growing crop can mature while the policy performs legal acquisition or
      // crafting actions elsewhere. Do not send it back to the field each turn.
      if (state.crops.length) return false
      const choices = farmCropChoices(state)
      const cropGoods = choices.filter(item => item.id !== 'wheat' && item.harvestGoodId)
      const heldCropGood = cropGoods.find(item => (materialView(state)[item.harvestGoodId] ?? 0) > 0)
      if (heldCropGood) {
        if (!canVisit(state, 'store')) return visit(state, 'store')
        const hour = calendar(state.worldTime).hour
        const dayStart = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay
        if (hour < BUILDINGS.store.opens || hour >= BUILDINGS.store.closes) {
          waitUntil(state, hour >= BUILDINGS.store.closes
            ? dayStart + CONFIG.minutesPerDay + BUILDINGS.store.opens * 60
            : dayStart + BUILDINGS.store.opens * 60, 'wait-for-crop-good-sale')
          return true
        }
        record(state, 'sell-crop-good', heldCropGood.harvestGoodId, () => tradeMaterial(state, heldCropGood.harvestGoodId))
        return true
      }
    }
    if (c.currentRegion === 'farmland') {
      const eligibility = propertyEligibility(state, 'land')
      if (eligibility.eligible) { record(state, 'buy-property-land', 'land', () => buyProperty(state, 'land')); return true }
      const business = propertyEligibility(state, 'farmBusiness')
      if (business.eligible) { record(state, 'buy-property-farmBusiness', 'farmBusiness', () => buyProperty(state, 'farmBusiness')); return true }
      if (ownedBusiness && c.inventory.food >= 10 && state.settlement.food <= 90) {
        record(state, 'supply-farm-food-civil-defense', 'food', () => supplyFarmFood(state, Math.min(10, c.inventory.food)))
        return true
      }
    }
    const choices = farmCropChoices(state)
    if (current.variant === 'seasonal-farm-sell') {
      const seasonal = choices.filter(crop => crop.id !== 'wheat' && crop.harvestGoodId && crop.status === 'available')
        .sort((a, b) => (b.harvestAmount * b.sell / b.growthMinutes) - (a.harvestAmount * a.sell / a.growthMinutes)
          || a.growthMinutes - b.growthMinutes || a.id.localeCompare(b.id))[0]
      if (!seasonal) {
        if (c.currentRegion !== 'farmland') return visit(state, 'farm')
        return false
      }
      if (!state.crops.length && !state.preparedPlots) {
        const guidance = farmCropPlantingGuidance(state)
        if (guidance?.status === 'region') return visit(state, 'farm')
        // `capacity` is the guidance category for an unprepared plot, whether
        // it recommends preparing one or reports that all plots are occupied.
        if (state.preparedPlots + state.crops.length >= CONFIG.maxPlots) return false
        record(state, 'farm-prepare-seasonal', seasonal.id, () => farm(state, 'prepare'))
        return true
      }
      if (state.preparedPlots) {
        if (c.currentRegion !== 'farmland') return visit(state, 'farm')
        // Re-evaluate immediately before planting; the public choice projection is the legality gate.
        const legal = farmCropChoices(state).find(crop => crop.id === seasonal.id && crop.status === 'available')
        if (!legal) return false
        const plantedAt = state.worldTime
        const plantingSeason = CONFIG.seasons[calendar(plantedAt).season]
        const row = record(state, 'farm-plant-seasonal', seasonal.id, () => farm(state, 'plant', seasonal.id))
        if (row.ok) cropRows.push({ route: current.route, variant: current.variant, seed: current.seed,
          event: 'plant', at: plantedAt, plantedAt, plantedSeason: plantingSeason, cropId: seasonal.id,
          expectedMaturityMinutes: legal.growthMinutes, expectedYieldAtPlanting: legal.harvestAmount,
          output: legal.harvestGoodId, foodValueEach: legal.foodValue, unitSell: legal.sell,
          plantingStamina: 4, actionOk: true })
        return true
      }
      return false
    }
    // Outside farmland, the public projection reports `region`; that should trigger travel,
    // while `season` remains a real planting block.
    const wheat = choices.find(crop => crop.id === 'wheat' && crop.status !== 'season')
    if (!state.crops.length && !state.preparedPlots && wheat) {
      if (c.currentRegion !== 'farmland') return visit(state, 'farm')
      record(state, 'farm-prepare', 'wheat', () => farm(state, 'prepare'))
      return true
    }
    if (state.preparedPlots && wheat) {
      if (c.currentRegion !== 'farmland') return visit(state, 'farm')
      record(state, 'farm-plant', 'wheat', () => farm(state, 'plant', 'wheat'))
      return true
    }
    return false
  }

  function economyStep(state, recipeMode) {
    const c = player(state)
    if (!c.isAlive || state.combat) return false
    // Finish a return trip to the field even if walking drops stamina below the
    // reserve; otherwise the village/field travel policy can oscillate forever.
    if (current.variant === 'seasonal-farm-sell') {
      if (seasonalTravelingToField) {
        if (c.currentRegion === 'farmland') seasonalTravelingToField = false
        else return visit(state, 'farm')
      } else if (c.stamina < 40) {
        if (c.currentRegion !== 'village') {
          seasonalReturnToField = true
          return visit(state, 'village')
        }
        const row = record(state, 'rest', null, () => rest(state, 'rest'))
        if (row.ok && c.stamina >= 40) seasonalTravelingToField = true
        return true
      } else if (seasonalReturnToField && c.currentRegion === 'village') {
        // The approach may restore stamina above the threshold before reaching
        // town. Rest explicitly so the route does not immediately retrace itself.
        const row = record(state, 'rest', null, () => rest(state, 'rest'))
        if (row.ok) {
          seasonalReturnToField = false
          seasonalTravelingToField = true
        }
        return true
      }
    }
    if (current.variant !== 'seasonal-farm-sell' && restForWork(state)) return true
    // Establish the legal crop cycle before the focused route spends actions crafting.
    if (current.variant === 'seasonal-farm-sell' && farmStep(state)) return true
    // Normal Life keeps its farm-first itinerary. The focused diagnostic gives legal
    // recipes and their material acquisition priority, with a monthly farm observation.
    const routeDay = Math.floor(state.worldTime / CONFIG.minutesPerDay)
    if (recipeMode === 'focused' && current.variant !== 'seasonal-farm-sell'
      && routeDay % 30 === 1 && farmStep(state)) return true
    if (recipeMode !== 'focused' && farmStep(state)) return true
    if (current.variant === 'farm-business-supply'
      && state.life.properties.some(property => property.ownerId === c.id && property.kind === 'farmBusiness')
      && farmStep(state)) return true

    const equippedIds = state.reward.equipped[c.id] ?? {}
    const unsoldCraft = state.reward.instances.find(item => item.ownerId === c.id && item.craftProvenance
      && item.instanceId !== equippedIds.weapon && item.instanceId !== equippedIds.armor)
    if (unsoldCraft && state.settlement.buildings.includes('blacksmith')) {
      if (c.position.x !== BUILDINGS.blacksmith.position.x || c.position.y !== BUILDINGS.blacksmith.position.y) return visit(state, 'blacksmith')
      if (!canVisit(state, 'blacksmith')) {
        const hour = calendar(state.worldTime).hour
        const dayStart = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay
        waitUntil(state, hour >= BUILDINGS.blacksmith.closes ? dayStart + CONFIG.minutesPerDay + BUILDINGS.blacksmith.opens * 60 : dayStart + BUILDINGS.blacksmith.opens * 60,
          'wait-for-blacksmith-sale')
        return true
      }
      record(state, 'sell-crafted-output', unsoldCraft.instanceId, () => sellInstance(state, unsoldCraft.instanceId))
      return true
    }

    const recipes = Object.keys(CRAFTING_RECIPES)
      .filter(id => recipeMode !== 'focused' || CRAFTING_RECIPES[id].inputs.every(input => input.source === 'inventory'))
      .sort((a, b) => {
      const ra = CRAFTING_RECIPES[a], rb = CRAFTING_RECIPES[b]
      return recipeMode === 'focused' ? rb.requiredSmithing - ra.requiredSmithing || a.localeCompare(b) : a === 'starterSpear' ? -1 : b === 'starterSpear' ? 1 : 0
    })
    let selected
    for (const recipeId of recipes) {
      const plan = planCraft(state, { recipeId })
      if (plan.ok) { selected = { recipeId, plan }; break }
    }
    if (selected) {
      if (!recipeUnlockRows.some(row => row.route === current.route && row.variant === current.variant
        && row.seed === current.seed && row.recipeId === selected.recipeId)) {
        recipeUnlockRows.push({ route: current.route, variant: current.variant, seed: current.seed, firstLegalPlanAt: state.worldTime,
          recipeId: selected.recipeId, smithingLevel: c.skills.smithing.level, practiceCap: selected.plan.practice.capLevel,
          masterpieceEligible: selected.plan.masterpiece.eligible, masterpieceChance: selected.plan.masterpiece.chance,
          interpretation: 'first observed legal public plan during the scripted route' })
      }
      const recipe = CRAFTING_RECIPES[selected.recipeId]
      const stationTarget = areaTarget[recipe.station]
      if (c.position.x !== stationTarget.x || c.position.y !== stationTarget.y) return move(state, stationTarget, 'move-to-craft-station')
      if (!selected.plan.station.open) {
        const hour = calendar(state.worldTime).hour
        const dayStart = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay
        const nextOpen = dayStart + recipe.opensAtHour * 60
        waitUntil(state, hour >= recipe.closesAtHour ? dayStart + CONFIG.minutesPerDay + recipe.opensAtHour * 60 : nextOpen, 'wait-for-craft-station')
        return true
      }
      const before = state.reward.instances.length
      const row = record(state, 'craft', selected.recipeId, () => craft(state, { recipeId: selected.recipeId }), result => result?.ok === true)
      if (row.ok) {
        const item = state.reward.instances.slice(before).find(instance => instance.ownerId === c.id)
        craftRows.push({ route: current.route, variant: current.variant, seed: current.seed, at: state.worldTime,
          recipeId: selected.recipeId, smithingLevel: c.skills.smithing.level, xpAward: selected.plan.practice.xpAward,
          masterpieceEligible: selected.plan.masterpiece.eligible, masterpieceChance: selected.plan.masterpiece.chance,
          masterpiece: item?.craftProvenance?.masterpiece ?? false, instanceId: item?.instanceId ?? null,
          saleValueBeforeSale: item ? itemSellPrice(item) : null })
      }
      return true
    }

    const recipeId = recipeMode === 'focused'
      ? recipes.find(id => CRAFTING_RECIPES[id].requiredSmithing <= c.skills.smithing.level)
      : 'starterSpear'
    const recipe = recipeId ? CRAFTING_RECIPES[recipeId] : null
    const missing = recipe?.inputs.find(input => input.source === 'inventory' && c.inventory[input.itemId] < input.amount)
    if (missing && c.inventory[missing.itemId] < missing.amount && recipe?.requiredSmithing <= c.skills.smithing.level) {
      const kind = missing.itemId
      const region = kind === 'wood' ? 'forest' : 'mine'
      if (c.currentRegion !== region) return visit(state, region)
      record(state, `gather-${kind}`, kind, () => gather(state, kind))
      return true
    }

    if (recipeMode === 'focused' && recipe) {
      const stationTarget = areaTarget[recipe.station]
      if (stationTarget && (c.position.x !== stationTarget.x || c.position.y !== stationTarget.y)) {
        return move(state, stationTarget, 'move-to-craft-station')
      }
      const open = planCraft(state, { recipeId })
      if (!open.ok && open.station?.built && open.station.nearby && !open.station.open) {
        const hour = calendar(state.worldTime).hour
        const dayStart = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay
        waitUntil(state, hour >= recipe.closesAtHour ? dayStart + CONFIG.minutesPerDay + recipe.opensAtHour * 60 : dayStart + recipe.opensAtHour * 60,
          'wait-for-craft-station')
        return true
      }
    }

    if (recipeMode === 'focused' && current.variant !== 'seasonal-farm-sell' && farmStep(state)) return true

    const sellMaterialId = Object.keys(materialView(state)).find(id => (materialView(state)[id] ?? 0) > 0 && MATERIALS[id]?.sell > 0)
    const sellItem = ['wood', 'stone', 'iron'].find(id => c.inventory[id] > ({ wood: 3, stone: 2, iron: 2 }[id]))
    if (sellMaterialId || sellItem) {
      if (!canVisit(state, 'store')) return visit(state, 'store')
      if (sellMaterialId) record(state, 'sell-material', sellMaterialId, () => tradeMaterial(state, sellMaterialId))
      else record(state, 'sell-gathered', sellItem, () => trade(state, sellItem, false))
      return true
    }

    // A bounded monthly food purchase makes the Purchase/Reinvest edge observable in the real route.
    const day = Math.floor(state.worldTime / CONFIG.minutesPerDay)
    if (day % 30 === 1 && c.inventory.food < 6) {
      if (!canVisit(state, 'store')) return visit(state, 'store')
      record(state, 'buy-food', 'food', () => trade(state, 'food', true))
      return true
    }
    return false
  }

  async function runRoute(route, seed, variant) {
    const state = createGame(seed)
    current = { route, variant, seed }
    seasonalTravelingToField = false
    seasonalReturnToField = false
    const c = player(state), startGold = c.gold, startTime = state.worldTime
    const startSkills = structuredClone(c.skills)
    let day = Math.floor(state.worldTime / CONFIG.minutesPerDay)
    while (state.worldTime < endAt && c.isAlive) {
      for (const recipeId of recipeIds) {
        const plan = planCraft(state, { recipeId })
        const recipe = CRAFTING_RECIPES[recipeId]
        recipePlanRows.push({ route, variant, seed, at: state.worldTime, day, recipeId, smithingLevel: c.skills.smithing.level,
          requiredSmithing: recipe.requiredSmithing, practiceCap: recipe.practiceCap, ok: plan.ok,
          reasonCode: plan.reasonCode, xpAward: plan.practice.xpAward, masterpieceEligible: plan.masterpiece.eligible,
          masterpieceChance: plan.masterpiece.chance })
        if (plan.ok && !recipeUnlockRows.some(row => row.route === route && row.variant === variant
          && row.seed === seed && row.recipeId === recipeId)) {
          recipeUnlockRows.push({ route, variant, seed, recipeId, firstLegalPlanAt: state.worldTime,
            smithingLevel: c.skills.smithing.level, practiceCap: recipe.practiceCap,
            masterpieceEligible: plan.masterpiece.eligible, masterpieceChance: plan.masterpiece.chance,
            interpretation: 'first daily sample where public planCraft returned legal; not an authored unlock event' })
        }
      }
      const dayStart = day * CONFIG.minutesPerDay
      const dayEnd = Math.min(endAt, dayStart + CONFIG.minutesPerDay)
      const actionLimit = variant === 'farm-business-supply' || variant === 'seasonal-farm-sell' ? 80 : ACTION_LIMIT_PER_DAY
      let count = 0, progressed = false
      while (state.worldTime < dayEnd && count < actionLimit && c.isAlive) {
        // Hybrid day alternation follows the route role split; the adventure day is a single public forest encounter.
        if (variant === 'hybrid' && day % 2 === 0) {
          if (state.combat) {
            const result = record(state, 'hybrid-combat-turn', null, () => combatTurn(state, 'attack'), value => value === '')
            progressed ||= result.ok; count++; continue
          }
          const forest = regionTarget(state, 'forest')
          if (!forest) throw new Error(`No walkable forest tile for hybrid route seed ${seed}`)
          if (c.currentRegion !== 'forest') { const moved = move(state, forest); progressed ||= !!moved; count++; continue }
          const result = record(state, 'hybrid-encounter', null, () => encounter(state, false), value => value === '')
          progressed ||= result.ok; count++
          if (!result.ok || !state.combat) break
          continue
        }
        const changed = economyStep(state, variant === 'craft-focused' || variant === 'farm-business-supply' || variant === 'seasonal-farm-sell' ? 'focused' : 'normal')
        if (!changed) break
        progressed = true; count++
      }
      const nextBoundary = Math.min(endAt, Math.max(dayEnd, state.worldTime))
      const row = { route, variant, seed, day, worldTime: state.worldTime, gold: c.gold,
        wood: c.inventory.wood, stone: c.inventory.stone, iron: c.inventory.iron, food: c.inventory.food,
        settlementFood: state.settlement.food,
        farming: c.skills.farming.level, woodcutting: c.skills.woodcutting.level, mining: c.skills.mining.level,
        smithing: c.skills.smithing.level, settlementStage: state.settlement.stage, stock: stockView(state),
        cropCount: state.crops.length, preparedPlots: state.preparedPlots, actionsToday: count, policyProgressed: progressed }
      dayRows.push(row)
      if (state.worldTime < nextBoundary) waitUntil(state, nextBoundary)
      day++
    }
    if (state.worldTime < endAt) waitUntil(state, endAt)
    const rows = actionRows.filter(row => row.route === route && row.seed === seed && row.variant === variant)
    const summary = { route, variant, seed, startTime, completedAt: state.worldTime, aliveAtEnd: c.isAlive,
      finalGold: c.gold, startGold, finalInventory: inventoryView(state), finalMaterials: materialView(state),
      startSkills, finalSkills: structuredClone(c.skills), crops: cropRows.filter(row => row.route === route && row.seed === seed && row.variant === variant),
      crafts: craftRows.filter(row => row.route === route && row.seed === seed && row.variant === variant),
      recipeAvailability: recipeUnlockRows.filter(row => row.route === route && row.seed === seed && row.variant === variant),
      ledger: summarizeLedger(rows, startGold, c.gold), marketStockModel: stockView(state),
      restockEvents: state.events.filter(event => /restock|補貨|補充商店/i.test(`${event.kind} ${event.text}`)).map(event => ({ at: event.at, kind: event.kind, text: event.text })),
      observations: { inputPurchases: rows.filter(row => row.kind === 'buy-food' || row.kind.startsWith('buy-')).length,
        sales: rows.filter(row => row.kind.startsWith('sell-')).length,
        gatheredUnits: rows.filter(row => row.kind.startsWith('gather-')).reduce((sum, row) => sum + Object.values(row.inventoryDelta).reduce((sub, n) => sub + Math.max(0, n), 0), 0),
        noActionDays: dayRows.filter(row => row.route === route && row.seed === seed && row.variant === variant && !row.policyProgressed).length } }
    routeSummaries.push(summary)
    await writeFile(join(out, `seed-${route}-${variant}-${seed}.json`), `${JSON.stringify({ summary,
      actions: rows, daily: dayRows.filter(row => row.route === route && row.seed === seed && row.variant === variant),
      crops: summary.crops, crafts: summary.crafts, recipeAvailability: summary.recipeAvailability }, null, 2)}\n`, { flag: 'wx' })
  }

  // Seeded normal fresh-save observations. Hybrid alternates life and public combat days; craft-focused
  // uses only legal plans and public acquisition actions, prioritizing the highest currently legal recipe.
  for (const seed of ECONOMY_SEEDS) {
    await runRoute('life', seed, 'life')
    await runRoute('hybrid', seed, 'hybrid')
    await runRoute('life', seed, 'craft-focused')
    await runRoute('life', seed, 'farm-business-supply')
    await runRoute('life', seed, 'seasonal-farm-sell')
  }

  // Controlled public transaction loops; only the labelled fixture setup sets Smithing/stage directly.
  for (const smithingLevel of [1, 3, 5, 6]) for (const stage of ['village', 'town']) {
    const state = createGame(61101), c = player(state)
    current = { route: 'controlled-arbitrage', variant: `smithing-${smithingLevel}-${stage}`, seed: 61101 }
    c.skills.smithing.level = smithingLevel; c.skills.smithing.exp = 0; c.gold = 20000
    if (stage === 'town') { state.settlement.stage = 'town'; if (!state.settlement.buildings.includes('blacksmith')) state.settlement.buildings.push('blacksmith') }
    const recipeId = smithingLevel <= 1 ? 'starterSpear' : smithingLevel <= 3 ? 'fieldSpear' : 'ironShortSword'
    const recipe = CRAFTING_RECIPES[recipeId]
    const firstStock = stockView(state), canUseStation = state.settlement.buildings.includes(recipe.station)
    if (canUseStation) {
      // Keep 12 complete input sets where cash and authored station rules permit.
      for (let loop = 0; loop < 12; loop++) {
        const loopStart = c.gold
        if (player(state).position.x !== BUILDINGS.store.position.x || player(state).position.y !== BUILDINGS.store.position.y) walkTo(state, BUILDINGS.store.position)
        for (const input of recipe.inputs) if (input.source === 'inventory') {
          const missing = Math.max(0, input.amount - c.inventory[input.itemId])
          for (let n = 0; n < missing; n++) {
            const buy = record(state, 'arbitrage-buy', input.itemId, () => trade(state, input.itemId, true))
            if (!buy.ok) break
          }
        }
        const buySpend = loopStart - c.gold
        if (recipe.inputs.some(input => input.source === 'inventory' && c.inventory[input.itemId] < input.amount)) {
          probeRows.push({ smithingLevel, stage, recipeId, loop, event: 'inputs-unavailable', buySpend, gold: c.gold,
            marketStock: stockView(state) }); break
        }
        if (c.position.x !== BUILDINGS[recipe.station].position.x || c.position.y !== BUILDINGS[recipe.station].position.y) walkTo(state, BUILDINGS[recipe.station].position)
        if (calendar(state.worldTime).hour < recipe.opensAtHour) simulate(state, recipe.opensAtHour * 60 - calendar(state.worldTime).hour * 60)
        if (calendar(state.worldTime).hour >= recipe.closesAtHour) simulate(state, CONFIG.minutesPerDay - calendar(state.worldTime).hour * 60 + recipe.opensAtHour * 60)
        const plan = planCraft(state, { recipeId })
        if (!plan.ok) { probeRows.push({ smithingLevel, stage, loop, event: 'craft-blocked', reasonCode: plan.reasonCode, marketStock: stockView(state) }); break }
        const goldBeforeCraft = c.gold
        const craftResult = craft(state, { recipeId })
        if (!craftResult.ok) { probeRows.push({ smithingLevel, stage, loop, event: 'craft-failed', reasonCode: craftResult.reasonCode, marketStock: stockView(state) }); break }
        const craftSpend = goldBeforeCraft - c.gold
        const item = state.reward.instances.find(value => value.instanceId === craftResult.instanceId)
        const saleRevenue = itemSellPrice(item)
        if (!state.settlement.buildings.includes('blacksmith')) {
          probeRows.push({ smithingLevel, stage, recipeId, loop, event: 'craft-produced-sale-station-unavailable',
            buySpend, craftSpend, salePriceFormulaValue: saleRevenue, gold: c.gold, marketStock: stockView(state) }); break
        }
        if (player(state).position.x !== BUILDINGS.blacksmith.position.x || player(state).position.y !== BUILDINGS.blacksmith.position.y) walkTo(state, BUILDINGS.blacksmith.position)
        if (!canVisit(state, 'blacksmith')) {
          const hour = calendar(state.worldTime).hour
          const dayStart = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay
          simulate(state, (hour >= BUILDINGS.blacksmith.closes
            ? dayStart + CONFIG.minutesPerDay + BUILDINGS.blacksmith.opens * 60
            : dayStart + BUILDINGS.blacksmith.opens * 60) - state.worldTime)
        }
        const beforeSell = c.gold
        const saleResult = sellInstance(state, craftResult.instanceId)
        const saleDelta = c.gold - beforeSell
        const result = arbitrageResult({ goldBefore: loopStart, goldAfter: c.gold,
          buySpend, craftSpend, saleRevenue: saleDelta })
        probeRows.push({ smithingLevel, stage, recipeId, loop, event: 'buy-craft-sell', ...result,
          salePriceFormulaValue: saleRevenue, saleActionSucceeded: saleResult === '',
          practiceXpAward: plan.practice.xpAward, practiceCap: plan.practice.capLevel,
          masterpieceEligible: plan.masterpiece.eligible, masterpieceChance: plan.masterpiece.chance,
          masterpiece: craftResult.masterpiece, marketStockBefore: firstStock, marketStockAfter: stockView(state) })
        if (!saleResult) {
          // Recheck after one simulated calendar day as a restock probe without presuming stock exists.
          simulate(state, CONFIG.minutesPerDay)
          if (player(state).position.x !== BUILDINGS.store.position.x || player(state).position.y !== BUILDINGS.store.position.y) {
            walkTo(state, BUILDINGS.store.position)
          }
          const postWaitStock = stockView(state)
          const buyCheckBefore = c.gold
          const recheck = record(state, 'restock-recheck-buy', recipe.inputs[0].itemId, () => trade(state, recipe.inputs[0].itemId, true))
          probeRows.push({ smithingLevel, stage, recipeId, loop, event: 'post-day-buy-availability', buySucceeded: recheck.ok,
            goldDelta: c.gold - buyCheckBefore, stockBefore: postWaitStock, stockAfter: stockView(state),
            restockEventsObserved: state.events.filter(event => /restock|補貨|補充商店/i.test(`${event.kind} ${event.text}`)).length })
          if (recheck.ok) trade(state, recipe.inputs[0].itemId, false)
        }
      }
    } else probeRows.push({ smithingLevel, stage, recipeId, event: 'station-not-built', station: recipe.station,
      marketStock: firstStock, plan: planCraft(state, { recipeId }).reasonCode })
  }

  const seedEvidence = ECONOMY_SEEDS.map(seed => {
    const state = createGame(seed), probe = { rngState: state.rngState }
    return { seed, worldSeed: state.worldSeed, rngState: state.rngState, rngProbe: state.rngState }
  })
  const seedVariance = evaluateSeedVariance(seedEvidence)
  const routeValidity = routeSummaries.map(summary => {
    const rows = actionRows.filter(row => row.route === summary.route && row.seed === summary.seed && row.variant === summary.variant)
    const actionsForGate = rows.map(row => ({ choice: ({ 'farm-prepare': 'prepare', 'farm-plant': 'plant', 'farm-harvest': 'harvest', 'craft': 'craft',
      'sell-material': 'sell-material', 'sell-gathered': 'sell-gathered', 'sell-crafted-output': 'sell-crafted',
      'gather-wood': 'gather', 'gather-stone': 'gather', 'gather-iron': 'gather',
      'farm-prepare-seasonal': 'prepare', 'farm-plant-seasonal': 'plant', 'sell-crop-good': 'sell-material',
      'hybrid-encounter': 'encounter', 'hybrid-combat-turn': 'combat-turn' })[row.kind] ?? row.kind,
      outcome: row.ok ? 'success' : 'no-progress', noProgress: !row.ok,
      reason: row.reasonCode ?? row.result ?? (row.ok ? null : 'action-failed'), category: row.ok ? 'success' : 'classified-failure',
      policyHalf: row.kind.startsWith('hybrid-') ? 'adventure' : 'life' }))
    const encounters = rows.filter(row => row.kind === 'hybrid-encounter' && row.ok).map(() => ({ outcome: 'observed-start', rank: 'normal' }))
    const skills = Object.values(summary.finalSkills ?? {}).reduce((sum, value) => sum + value.level * 100 + value.exp, 0)
      - Object.values(summary.startSkills ?? {}).reduce((sum, value) => sum + value.level * 100 + value.exp, 0)
    return { route: summary.route, variant: summary.variant, seed: summary.seed,
      ...evaluateRouteValidity({ route: summary.route === 'life' ? 'life' : 'hybrid', actions: actionsForGate,
        encounters, skillXpGained: Math.max(0, skills), smithingXpGained: Math.max(0, (summary.finalSkills?.smithing?.level ?? 1) * 100 + (summary.finalSkills?.smithing?.exp ?? 0)
          - (summary.startSkills?.smithing?.level ?? 1) * 100 - (summary.startSkills?.smithing?.exp ?? 0)),
        craftingEvidence: { legalPlanSeen: (summary.recipeAvailability ?? []).length > 0,
          impossibilityReason: 'No legal recipe plan observed during the sampled normal route' }, seedVariance }) }
  })
  const result = { status: routeValidity.some(row => row.status === 'INVALID_POLICY') ? 'INVALID_POLICY' : 'PASS', startedAt: started.toISOString(), endedAt: new Date().toISOString(),
    routeCount: routeSummaries.length, routeSummaries: routeSummaries.map(({ actions, ...summary }) => summary),
    routeValidity, seedVariance, seedEvidence,
    actionRows: actionRows.length, dayRows: dayRows.length, craftRows: craftRows.length, cropRows: cropRows.length,
    controlledProbeRows: probeRows.length,
    marketModelFinding: stockView(createGame(ECONOMY_SEEDS[0])).modeled ? 'stock fields detected' : 'NOT MODELED: no merchant stock state exists on GameState',
    restockFinding: probeRows.some(row => row.event === 'post-day-buy-availability' && row.restockEventsObserved > 0)
      ? 'restock-related event evidence found; inspect probe rows' : 'no restock event was observed; probes record repeat-buy availability after one day' }
  await writeFile(join(out, 'actions.csv'), csv(actionRows), { flag: 'wx' })
  await writeFile(join(out, 'daily.csv'), csv(dayRows), { flag: 'wx' })
  await writeFile(join(out, 'crop-yields.csv'), csv(cropRows), { flag: 'wx' })
  await writeFile(join(out, 'crafts.csv'), csv(craftRows), { flag: 'wx' })
  await writeFile(join(out, 'recipe-plans.csv'), csv(recipePlanRows), { flag: 'wx' })
  await writeFile(join(out, 'recipe-unlocks.csv'), csv(recipeUnlockRows), { flag: 'wx' })
  await writeFile(join(out, 'controlled-probes.json'), `${JSON.stringify(probeRows, null, 2)}\n`, { flag: 'wx' })
  await writeFile(join(out, 'completion.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
  console.log(JSON.stringify({ output: out, ...result }, null, 2))
} catch (error) {
  await writeFile(join(out, 'failure.json'), `${JSON.stringify({ status: 'FAIL', message: String(error), stack: error?.stack ?? null }, null, 2)}\n`, { flag: 'wx' })
  console.error(error)
  process.exitCode = 1
} finally {
  if (vite) await vite.close()
}
