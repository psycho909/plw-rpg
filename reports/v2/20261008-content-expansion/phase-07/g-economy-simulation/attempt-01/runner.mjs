import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createServer } from 'vite'

const out = path.dirname(new URL(import.meta.url).pathname)
const stdout = []
const stderr = []
let exitCode = 0
const log = (value) => { stdout.push(String(value)); process.stdout.write(`${value}\n`) }
const err = (value) => { stderr.push(String(value)); process.stderr.write(`${value}\n`) }
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const csv = (rows) => {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const quote = (value) => {
    const s = value == null ? '' : Array.isArray(value) ? value.join('|') : String(value)
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  return `${cols.join(',')}\n${rows.map(row => cols.map(key => quote(row[key])).join(',')).join('\n')}\n`
}

const selectedSources = [
  'src/engine/actions.ts', 'src/engine/simulation.ts', 'src/engine/rewardActions.ts',
  'src/engine/ownership.ts', 'src/data/contentRegistry.ts', 'src/data/content/farmCrops.ts', 'src/data/config.ts', 'src/data/rewards.ts',
]
const sourceBefore = Object.fromEntries(selectedSources.map(file => [file, hash(path.resolve(file))]))
const head = (await import('node:child_process')).execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const startedAt = new Date().toISOString()
const vite = await createServer({ configFile: path.resolve('vite.config.ts'), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })

try {
  const [simulation, actions, rewardActions, ownership, calendarModule, content, rewards, config] = await Promise.all([
    vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/engine/actions.ts'),
    vite.ssrLoadModule('/src/engine/rewardActions.ts'), vite.ssrLoadModule('/src/engine/ownership.ts'),
    vite.ssrLoadModule('/src/engine/calendar.ts'), vite.ssrLoadModule('/src/data/contentRegistry.ts'),
    vite.ssrLoadModule('/src/data/rewards.ts'), vite.ssrLoadModule('/src/data/config.ts'),
  ])
  const { createGame, player, walkTo, simulate } = simulation
  const { farm, trade } = actions
  const { convertCropGoodToFood, tradeMaterial } = rewardActions
  const { buyProperty, supplyFarmFood } = ownership
  const { calendar } = calendarModule
  const { CONTENT_CROPS, CONTENT_CROP_GOODS } = content
  const { MATERIALS } = rewards
  const { BUILDINGS, CONFIG, CROP } = config
  const scenarios = []
  const seeds = [271828, 314159, 161803]
  const skillLevels = [1, 3, 6]
  const crops = [
    { id: 'wheat', name: CROP.name, seasons: ['春', '夏', '秋', '冬'], growthMinutes: CROP.duration, harvestAmount: CROP.yield, goodId: null, foodValue: 1, sell: 5 },
    ...Object.values(CONTENT_CROPS).map(crop => {
      const good = CONTENT_CROP_GOODS[crop.harvestGoodId]
      return { id: crop.id, name: crop.name['zh-TW'], seasons: [...crop.seasons], growthMinutes: crop.growthMinutes,
        harvestAmount: crop.harvestAmount, goodId: crop.harvestGoodId, foodValue: good.foodValue, sell: MATERIALS[crop.harvestGoodId].sell }
    }),
  ]

  for (const crop of crops) for (const skillLevel of skillLevels) for (const seed of seeds) {
    const state = createGame(seed)
    if (!walkTo(state, BUILDINGS.farm.position)) throw new Error(`walkTo farm failed for ${crop.id}/${seed}`)
    const seasonIndex = CONFIG.seasons.indexOf(crop.seasons[0])
    state.worldTime = (seasonIndex * CONFIG.daysPerSeason * CONFIG.minutesPerDay) + 8 * 60
    const character = player(state)
    character.skills.farming.level = skillLevel
    character.skills.farming.exp = 0
    const initialFood = character.inventory.food
    const initialGold = character.gold
    let outOfSeasonRejectedWithoutMutation = 'not-applicable'
    if (crop.id !== 'wheat') {
      const unavailableIndex = CONFIG.seasons.findIndex(season => !crop.seasons.includes(season))
      const unavailable = createGame(seed)
      if (!walkTo(unavailable, BUILDINGS.farm.position)) throw new Error(`walkTo out-season farm failed ${crop.id}`)
      unavailable.worldTime = unavailableIndex * CONFIG.daysPerSeason * CONFIG.minutesPerDay + 8 * 60
      unavailable.preparedPlots = 1
      const beforeReject = JSON.stringify(unavailable)
      const rejectedResult = farm(unavailable, 'plant', crop.id)
      outOfSeasonRejectedWithoutMutation = String(Boolean(rejectedResult) && JSON.stringify(unavailable) === beforeReject)
      if (outOfSeasonRejectedWithoutMutation !== 'true') throw new Error(`out-of-season mutation or acceptance ${crop.id}: ${rejectedResult}`)
    }
    const staminaBefore = character.stamina
    const cycleStartedAt = state.worldTime
    for (let i = 0; i < CONFIG.maxPlots; i++) {
      const result = farm(state, 'prepare')
      if (result) throw new Error(`prepare failed ${crop.id}/${seed}/${skillLevel}: ${result}`)
    }
    for (let i = 0; i < CONFIG.maxPlots; i++) {
      const result = crop.id === 'wheat' ? farm(state, 'plant') : farm(state, 'plant', crop.id)
      if (result) throw new Error(`plant failed ${crop.id}/${seed}/${skillLevel}: ${result}`)
    }
    if (state.crops.length !== CONFIG.maxPlots || state.preparedPlots !== 0) throw new Error(`four plot setup mismatch ${crop.id}`)
    simulate(state, crop.growthMinutes)
    const harvestSkillLevels = []
    for (let i = 0; i < CONFIG.maxPlots; i++) {
      const preHarvestSkill = player(state).skills.farming.level
      const result = farm(state, 'harvest')
      if (result) throw new Error(`harvest failed ${crop.id}/${seed}/${skillLevel}: ${result}`)
      harvestSkillLevels.push(preHarvestSkill)
    }
    const harvestedGoods = crop.goodId ? state.reward.materials[character.id]?.[crop.goodId] ?? 0 : 0
    const foodDelta = player(state).inventory.food - initialFood
    const rawYield = crop.id === 'wheat' ? foodDelta : harvestedGoods
    const cycleElapsed = state.worldTime - cycleStartedAt
    const farmActionMinutes = cycleElapsed - crop.growthMinutes
    const farmStamina = staminaBefore - player(state).stamina
    const conversionState = structuredClone(state)
    let convertedFood = crop.id === 'wheat' ? foodDelta : 0
    let conversionError = ''
    if (crop.goodId) {
      conversionError = convertCropGoodToFood(conversionState, crop.goodId, harvestedGoods)
      if (conversionError) throw new Error(`conversion failed ${crop.id}: ${conversionError}`)
      convertedFood = player(conversionState).inventory.food - initialFood
    }
    const saleState = structuredClone(state)
    let soldUnits = 0
    let soldGold = 0
    let saleError = ''
    let saleMinutes = 0
    let saleTotalElapsedAfterHarvest = 0
    {
      const postHarvestTime = saleState.worldTime
      const beforeWalk = saleState.worldTime
      if (!walkTo(saleState, BUILDINGS.store.position)) throw new Error(`walkTo store failed ${crop.id}`)
      const travelMinutes = saleState.worldTime - beforeWalk
      while (calendar(saleState.worldTime).hour < BUILDINGS.store.opens || calendar(saleState.worldTime).hour >= BUILDINGS.store.closes) simulate(saleState, 1)
      const beforeGold = player(saleState).gold
      const saleUnits = crop.goodId ? harvestedGoods : rawYield
      for (let i = 0; i < saleUnits; i++) {
        saleError = crop.goodId ? tradeMaterial(saleState, crop.goodId) : trade(saleState, 'food', false)
        if (saleError) throw new Error(`sale API failed ${crop.id}/${seed}/${skillLevel}/${i}: ${saleError}`)
        soldUnits++
      }
      soldGold = player(saleState).gold - beforeGold
      const saleElapsedMinutes = saleState.worldTime - beforeWalk - travelMinutes
      saleTotalElapsedAfterHarvest = saleState.worldTime - postHarvestTime
      saleMinutes = soldUnits * 5
      scenarios.push({
        seed, requested_skill: skillLevel, crop_id: crop.id, crop_name: crop.name, starting_season: crop.seasons[0],
        declared_seasons: crop.seasons.join('|'), growth_minutes: crop.growthMinutes, plots: CONFIG.maxPlots,
        declared_base_yield_per_plot: crop.harvestAmount, observed_harvest_skill_levels: harvestSkillLevels.join('|'),
        observed_yield_four_plots: rawYield, food_equivalent_per_harvest_unit: crop.foodValue, food_equivalent_four_plots: rawYield * crop.foodValue,
        converted_food_four_plots: convertedFood, sale_item_id: crop.goodId ?? 'food', sell_price_per_unit: crop.sell, observed_sold_units: soldUnits,
        observed_gold_four_plots: soldGold, expected_gold_four_plots: soldUnits * crop.sell,
        farm_elapsed_world_minutes_four_plots: cycleElapsed, farm_action_minutes_four_plots: farmActionMinutes,
        farm_stamina_four_plots: farmStamina, sale_action_minutes: saleMinutes, sale_store_travel_minutes: travelMinutes,
        sale_elapsed_minutes_after_travel: saleElapsedMinutes, sale_stamina: 0,
        sale_total_elapsed_world_minutes_after_harvest: saleTotalElapsedAfterHarvest,
        per_plot_cycle_minutes: crop.growthMinutes + 45,
        projected_four_plot_batch_food_equivalent_per_day: (rawYield * crop.foodValue * 1440) / cycleElapsed,
        projected_four_plot_batch_sell_gold_per_day: (soldGold * 1440) / (cycleElapsed + saleTotalElapsedAfterHarvest),
        action_food_value_conversion_error: conversionError, seasonal_planting_test: 'four-plot public farm API success', out_of_season_rejected_without_mutation: outOfSeasonRejectedWithoutMutation,
        declared_seed_or_input_cost: 0, actual_gold_seed_or_input_cost: initialGold - player(state).gold,
      })
    }
    if (state.crops.length !== 0) throw new Error(`harvest left plots occupied ${crop.id}`)
  }

  // Exercise the real crop-good -> inventory food -> owned farm -> settlement supply chain.
  const supplyState = createGame(424242)
  if (!walkTo(supplyState, BUILDINGS.farm.position)) throw new Error('supply scenario walkTo farm failed')
  supplyState.settlement.stage = 'village'
  supplyState.life.characters[supplyState.activeCharacterId].reputation = 100
  player(supplyState).gold = 10000
  const landPurchase = buyProperty(supplyState, 'land')
  const businessPurchase = buyProperty(supplyState, 'farmBusiness')
  if (landPurchase || businessPurchase) throw new Error(`farm business setup failed: ${landPurchase} ${businessPurchase}`)
  supplyState.worldTime = 8 * 60
  player(supplyState).skills.farming.level = 1
  player(supplyState).skills.farming.exp = 0
  for (let i = 0; i < CONFIG.maxPlots; i++) if (farm(supplyState, 'prepare')) throw new Error('supply prep failed')
  for (let i = 0; i < CONFIG.maxPlots; i++) if (farm(supplyState, 'plant', 'spring_pea')) throw new Error('supply plant failed')
  simulate(supplyState, CONTENT_CROPS.spring_pea.growthMinutes)
  for (let i = 0; i < CONFIG.maxPlots; i++) if (farm(supplyState, 'harvest')) throw new Error('supply harvest failed')
  const supplyGoodCount = supplyState.reward.materials[supplyState.activeCharacterId].spring_pea_good
  const supplyConversion = convertCropGoodToFood(supplyState, 'spring_pea_good', supplyGoodCount)
  const foodBeforeSupply = player(supplyState).inventory.food
  const settlementFoodBeforeSupply = supplyState.settlement.food
  const supplyResult = supplyFarmFood(supplyState, 2)
  if (supplyConversion || supplyResult) throw new Error(`supply path failed: ${supplyConversion} ${supplyResult}`)
  const supplyEvidence = {
    seed: 424242, crop_id: 'spring_pea', plots: 4, harvested_good_units: supplyGoodCount,
    food_value_per_good: CONTENT_CROP_GOODS.spring_pea_good.foodValue,
    conversion_result: supplyConversion, food_before_supply: foodBeforeSupply, food_after_supply: player(supplyState).inventory.food,
    supply_amount: 2, supply_result: supplyResult, settlement_food_before_supply: settlementFoodBeforeSupply,
    settlement_food_after_supply: supplyState.settlement.food,
    farm_business_food_supplied_total: supplyState.life.properties.find(property => property.kind === 'farmBusiness').foodSupplied,
    purchase_gold_cost: 360, actual_purchase_gold_delta: 10000 - player(supplyState).gold,
  }

  const sourceAfter = Object.fromEntries(selectedSources.map(file => [file, hash(path.resolve(file))]))
  const summary = {
    title: 'Phase 7-G crop economy runner simulation', head, started_at: startedAt, finished_at: new Date().toISOString(),
    source_sha256_before: sourceBefore, source_sha256_after: sourceAfter,
    source_unchanged_during_runner: selectedSources.every(file => sourceBefore[file] === sourceAfter[file]),
    seeds, requested_farming_skill_levels: skillLevels, crops: crops.map(({ id, name, seasons, growthMinutes, harvestAmount, goodId, foodValue, sell }) => ({ id, name, seasons, growthMinutes, harvestAmount, goodId, foodValue, sell })),
    sample_count: scenarios.length, runner_method: 'Vite SSR loads actual exported engine APIs; each scenario creates a fresh seeded game, moves via walkTo, sets exact starting season, sets representative farming skill, invokes four prepare/farm plant/farm harvest actions, then branches a cloned post-harvest state through crop-good conversion and either tradeMaterial (crop goods) or trade food sale (legacy wheat). No direct edits to output observations.',
    interpretation_limits: [
      'Observed four-plot yield includes farming skill gains during the 12 public farm actions; observed harvest skill levels are retained per scenario.',
      'Per-day rates are four-plot batch projections: the observed four-plot yield divided by the measured world time from first preparation through the fourth harvest. The sell-gold rate also includes the measured walk, wait for store opening, and per-unit tradeMaterial time after harvest. These rates extrapolate one selected crop cycle and do not model long-run seasonal reseeding.',
      'Crop-good sale option measures the actual tradeMaterial path per unit (five world minutes each), while crop-good conversion has no time/stamina cost in its public API. Walking and store-hours waiting are captured in sale_total_elapsed_world_minutes_after_harvest.',
      'Planting accepts only the listed seasons. Each scenario starts in the first declared season; season transitions and crop reseeding over a whole year are not simulated.',
      'No seeds, fertilizers, water, or other recurring input costs are charged by the public farm API. No explicit numeric balance threshold exists in the G ticket/spec.',
    ],
    farm_business_supply_path: supplyEvidence,
  }
  fs.writeFileSync(path.join(out, 'raw-rows.csv'), csv(scenarios))
  fs.writeFileSync(path.join(out, 'raw-rows.json'), JSON.stringify(scenarios, null, 2) + '\n')
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
  log(`PASS: ${scenarios.length} public-API crop scenarios; four plots, three fresh seeds, farming skill levels 1/3/6.`)
  log(`Farm-business food supply path: ${supplyEvidence.harvested_good_units} spring pea goods -> ${foodBeforeSupply} food -> supplied 2.`)
  log(`Source files unchanged by runner: ${summary.source_unchanged_during_runner}`)
} catch (error) {
  exitCode = 1
  err(error?.stack ?? String(error))
} finally {
  await vite.close()
  const finishedAt = new Date().toISOString()
  fs.writeFileSync(path.join(out, 'stdout.txt'), `${stdout.join('\n')}${stdout.length ? '\n' : ''}`)
  fs.writeFileSync(path.join(out, 'stderr.txt'), `${stderr.join('\n')}${stderr.length ? '\n' : ''}`)
  fs.writeFileSync(path.join(out, 'exit-code.txt'), `${exitCode}\n`)
  fs.writeFileSync(path.join(out, 'finished-at.txt'), `${finishedAt}\n`)
  process.exitCode = exitCode
}
