import { expect, it } from 'vitest'
import { BUILDINGS } from '../data/config'
import { CONTENT_CROP_GOODS } from '../data/contentRegistry'
import { MATERIALS } from '../data/rewards'
import { convertCropGoodToFood, tradeMaterial } from './rewardActions'
import { deserialize, serialize } from '../services/saveService'
import { farm } from './actions'
import { createGame, player, simulate, walkTo } from './simulation'
import { buyProperty, supplyFarmFood } from './ownership'
import { tryStartRegionalCrisis } from './regionalCrisis'
import { contributeCrisisFood } from './crisisContributions'

it('plants a registered crop through the public farm action using its registered growth time', () => {
  const state = createGame(701)
  walkTo(state, BUILDINGS.farm.position)
  expect(farm(state, 'prepare')).toBe('')
  expect(farm(state, 'plant', 'spring_pea')).toBe('')

  expect(state.crops).toHaveLength(1)
  expect(state.crops[0]?.cropId).toBe('spring_pea')
  expect(state.crops[0]?.growthDuration).toBe(720)
  expect(player(state).inventory.food).toBeGreaterThanOrEqual(0)
})

it('defaults legacy callers to wheat with the historical growth and food yield', () => {
  const state = createGame(702)
  walkTo(state, BUILDINGS.farm.position)
  expect(farm(state, 'prepare')).toBe('')
  expect(farm(state, 'plant')).toBe('')
  expect(state.crops[0]).toMatchObject({ cropId: 'wheat', growthDuration: 2880 })
  const beforeFood = player(state).inventory.food
  simulate(state, 2880)
  expect(farm(state, 'harvest')).toBe('')
  expect(player(state).inventory.food).toBe(beforeFood + 5)
})

it('rejects unknown and out-of-season crops without any state mutation', () => {
  const state = createGame(703)
  walkTo(state, BUILDINGS.farm.position)
  state.preparedPlots = 1
  for (const cropId of ['missing_crop', 'summer_barley']) {
    const before = structuredClone(state)
    expect(farm(state, 'plant', cropId)).not.toBe('')
    expect(state).toEqual(before)
  }
  const away = createGame(707)
  away.preparedPlots = 1
  const beforeAway = structuredClone(away)
  expect(farm(away, 'plant', 'spring_pea')).not.toBe('')
  expect(away).toEqual(beforeAway)
})

it('rejects crop IDs inherited from the catalog prototype without throwing or mutating state', () => {
  const state = createGame(709)
  walkTo(state, BUILDINGS.farm.position)
  state.preparedPlots = 1

  for (const cropId of ['toString', 'constructor', '__proto__']) {
    const before = structuredClone(state)
    let result = ''
    expect(() => { result = farm(state, 'plant', cropId) }).not.toThrow()
    expect(result).toBe('這種作物不存在。')
    expect(state).toEqual(before)
  }
})

it('rejects a harvest that would overflow the owned crop-good stack before charging time', () => {
  const state = createGame(708)
  walkTo(state, BUILDINGS.farm.position)
  expect(farm(state, 'prepare')).toBe('')
  expect(farm(state, 'plant', 'spring_pea')).toBe('')
  simulate(state, 720)
  const owner = player(state)
  state.reward.materials[owner.id] = Object.fromEntries(Object.keys(MATERIALS).map(id => [id, 0]))
  state.reward.materials[owner.id]!.spring_pea_good = Number.MAX_SAFE_INTEGER
  const before = structuredClone(state)
  expect(farm(state, 'harvest')).not.toBe('')
  expect(state).toEqual(before)
})

it('harvests the registered good, saves the crop identity, and converts only owned goods at foodValue', () => {
  const state = createGame(704)
  walkTo(state, BUILDINGS.farm.position)
  expect(farm(state, 'prepare')).toBe('')
  expect(farm(state, 'plant', 'spring_pea')).toBe('')
  const crop = state.crops[0]!
  expect(deserialize(serialize(state, 0)).state.crops).toEqual(state.crops)
  const foodBefore = player(state).inventory.food
  simulate(state, crop.growthDuration)
  expect(farm(state, 'harvest')).toBe('')
  expect(state.reward.materials[state.activeCharacterId]?.spring_pea_good).toBe(4)
  expect(player(state).inventory.food).toBe(foodBefore)
  player(state).inventory.food = 0

  const beforeInvalid = structuredClone(state)
  expect(convertCropGoodToFood(state, 'spring_pea_good', 0)).not.toBe('')
  expect(state).toEqual(beforeInvalid)
  expect(convertCropGoodToFood(state, 'spring_pea_good', 5)).not.toBe('')
  expect(state).toEqual(beforeInvalid)
  expect(convertCropGoodToFood(state, 'spring_pea_good', 2)).toBe('')
  expect(state.reward.materials[state.activeCharacterId]?.spring_pea_good).toBe(2)
  expect(player(state).inventory.food).toBe(2 * CONTENT_CROP_GOODS.spring_pea_good!.foodValue)
  player(state).gold = 1000
  state.settlement.stage = 'village'
  state.life.characters[state.activeCharacterId]!.reputation = 30
  expect(buyProperty(state, 'land')).toBe('')
  expect(buyProperty(state, 'farmBusiness')).toBe('')
  const convertedFood = player(state).inventory.food
  expect(supplyFarmFood(state, 2)).toBe('')
  expect(player(state).inventory.food).toBe(convertedFood - 2)
  expect(state.life.properties.find(property => property.kind === 'farmBusiness')?.foodSupplied).toBe(2)
})

it('supplies a regional crisis with food converted from harvested crop goods', () => {
  const state = createGame(710)
  walkTo(state, BUILDINGS.farm.position)
  for (let plot = 0; plot < 4; plot++) {
    expect(farm(state, 'prepare')).toBe('')
    expect(farm(state, 'plant', 'spring_pea')).toBe('')
  }
  simulate(state, 750)
  for (let plot = 0; plot < 4; plot++) expect(farm(state, 'harvest')).toBe('')

  const owner = player(state)
  owner.inventory.food = 0
  const convertedAmount = 13
  const harvestedGoods = state.reward.materials[owner.id]?.spring_pea_good ?? 0
  expect(harvestedGoods).toBeGreaterThanOrEqual(convertedAmount)
  expect(convertCropGoodToFood(state, 'spring_pea_good', convertedAmount)).toBe('')
  expect(owner.inventory.food).toBe(convertedAmount)

  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.settlement.safety = 60
  state.settlement.food = 0
  owner.position = { x: 8, y: 10 }
  owner.currentRegion = 'village'
  expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
  if (state.regionalCrisis.phase !== 'warning') throw new Error('expected a regional crisis warning')

  for (const npc of state.npcs) {
    npc.job = 'guard'
    const life = state.life.npcs[npc.id]!
    life.careerJob = 'guard'
    if (life.career === 'retired') life.career = 'worker'
  }
  while (state.npcs.length < 52) {
    const source = state.npcs[0]!
    const npc = structuredClone(source)
    npc.id = `npc-${state.nextNpcId++}`
    npc.name = `guard-${npc.id}`
    state.npcs.push(npc)
    state.life.npcs[npc.id] = { ...structuredClone(state.life.npcs[source.id]!), careerJob: 'guard', career: 'worker' }
  }
  state.threat.bossAlive = true
  const crisis = state.regionalCrisis
  expect(contributeCrisisFood(state, crisis.id, convertedAmount)).toBe('')
  expect(owner.inventory.food).toBe(0)
  expect(state.reward.materials[owner.id]?.spring_pea_good).toBe(harvestedGoods - convertedAmount)
  expect(state.settlement.food).toBe(52)
  expect(state.regionalCrisis.contributions.food.supplied).toBe(52)
})

it('keeps crop goods sellable through the existing material sale path', () => {
  const state = createGame(705)
  const owner = player(state)
  walkTo(state, BUILDINGS.store.position)
  state.reward.materials[owner.id] = Object.fromEntries(Object.keys(MATERIALS).map(id => [id, 0]))
  state.reward.materials[owner.id]!.spring_pea_good = 1
  // Trade is available during the store's normal hours; align to opening before using it.
  const hour = Math.floor(state.worldTime % 1440 / 60)
  if (hour < BUILDINGS.store.opens) simulate(state, (BUILDINGS.store.opens - hour) * 60)
  walkTo(state, BUILDINGS.store.position)
  const adjustedGold = owner.gold
  expect(tradeMaterial(state, 'spring_pea_good')).toBe('')
  expect(owner.gold).toBeGreaterThan(adjustedGold)
})

it('converts every registered crop good at its own bounded food value', () => {
  const state = createGame(706)
  const owner = player(state)
  state.reward.materials[owner.id] = Object.fromEntries(Object.keys(MATERIALS).map(id => [id, 0]))
  for (const [goodId, good] of Object.entries(CONTENT_CROP_GOODS)) {
    state.reward.materials[owner.id]![goodId] = 1
    const foodBefore = owner.inventory.food
    expect(convertCropGoodToFood(state, goodId, 1)).toBe('')
    expect(owner.inventory.food).toBe(foodBefore + good.foodValue)
    expect(state.reward.materials[owner.id]![goodId]).toBe(0)
  }
  const beforeInvalid = structuredClone(state)
  expect(convertCropGoodToFood(state, 'wolfFang', 1)).not.toBe('')
  expect(state).toEqual(beforeInvalid)
  owner.inventory.food = Number.MAX_SAFE_INTEGER
  state.reward.materials[owner.id]!.spring_pea_good = 1
  const beforeOverflow = structuredClone(state)
  expect(convertCropGoodToFood(state, 'spring_pea_good', 1)).not.toBe('')
  expect(state).toEqual(beforeOverflow)
})
