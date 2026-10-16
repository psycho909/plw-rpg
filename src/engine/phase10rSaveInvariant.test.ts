import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../data/config'
import { CRAFTING_RECIPES } from '../data/crafting'
import { MATERIALS } from '../data/rewards'
import { deserialize, serialize } from '../services/saveService'
import { combatTurn, encounter, farm, gather, rest } from './actions'
import { tryStartRegionalCrisis } from './regionalCrisis'
import { deriveCivilDefense } from './civilDefense'
import { contributeCrisisGold } from './crisisContributions'
import { craft } from './crafting'
import { buyProperty } from './ownership'
import { convertCropGoodToFood, tradeMaterial } from './rewardActions'
import { createGame, player, simulate, walkTo } from './simulation'

function assertReloadable(state: ReturnType<typeof createGame>) {
  expect(() => deserialize(serialize(state, 0))).not.toThrow()
}

function fullMaterialStacks() {
  return Object.fromEntries(Object.keys(MATERIALS).map(id => [id, 0]))
}

function craftState(influence: boolean) {
  const state = createGame(101017)
  const character = player(state)
  const recipe = CRAFTING_RECIPES.slime_resin_guard_recipe
  character.position = { ...BUILDINGS[recipe.station].position }
  character.skills.smithing.level = recipe.requiredSmithing
  character.gold = 500
  character.stamina = 100
  character.inventory.wood = 20
  character.inventory.stone = 20
  character.inventory.iron = 20
  state.settlement.buildings = [...new Set([...state.settlement.buildings, recipe.station])]
  simulate(state, 9 * 60)
  const stacks = fullMaterialStacks()
  for (const input of recipe.inputs) if (input.source === 'material') stacks[input.materialId] += input.amount
  if (influence) stacks.slime_resin = 4
  state.reward.materials[character.id] = stacks
  return state
}

describe('Phase10-R save invariants', () => {
  it('keeps public action outcomes reloadable across gathering, farming, crafting, trade, combat, property and crisis support', () => {
    const state = createGame(101018)
    walkTo(state, { x: 5, y: 4 })
    expect(gather(state, 'wood')).toBe('')
    assertReloadable(state)

    walkTo(state, BUILDINGS.farm.position)
    expect(farm(state, 'prepare')).toBe('')
    assertReloadable(state)
    expect(farm(state, 'plant', 'spring_pea')).toBe('')
    assertReloadable(state)
    simulate(state, state.crops[0]!.matureAt - state.worldTime)
    expect(farm(state, 'harvest')).toBe('')
    assertReloadable(state)
    player(state).inventory.food = 0
    expect(convertCropGoodToFood(state, 'spring_pea_good', 1)).toBe('')
    assertReloadable(state)

    for (const influence of [false, true]) {
      const crafting = craftState(influence)
      const result = craft(crafting, { recipeId: 'slime_resin_guard_recipe', ...(influence ? { influenceMaterial: 'slime_resin' as const } : {}) })
      expect(result.ok, JSON.stringify(result)).toBe(true)
      assertReloadable(crafting)
    }

    const trade = createGame(101019)
    const trader = player(trade)
    trader.position = { ...BUILDINGS.store.position }
    simulate(trade, 9 * 60)
    trade.reward.materials[trader.id] = fullMaterialStacks()
    trade.reward.materials[trader.id]!.wolfFang = 1
    expect(tradeMaterial(trade, 'wolfFang')).toBe('')
    assertReloadable(trade)

    const fight = createGame(101020)
    walkTo(fight, { x: 5, y: 4 })
    fight.threat.monsterPopulation = 10
    expect(encounter(fight)).toBe('')
    assertReloadable(fight)
    fight.combat!.hp = 100
    expect(combatTurn(fight, 'attack')).toBe('')
    assertReloadable(fight)
    expect(combatTurn(fight, 'run')).toBe('')
    assertReloadable(fight)

    const resting = createGame(101021)
    expect(rest(resting, 'rest')).toBe('')
    assertReloadable(resting)

    const property = createGame(101022)
    player(property).gold = 100
    expect(buyProperty(property, 'home')).toBe('')
    assertReloadable(property)

    const crisis = createGame(101023)
    crisis.threat.monsterPopulation = 30
    crisis.threat.threatLevel = 2
    crisis.threat.campLevel = 2
    crisis.settlement.safety = 60
    expect(tryStartRegionalCrisis(crisis, () => 0)).toBe(true)
    if (crisis.regionalCrisis.phase === 'dormant') throw new Error('expected a regional crisis warning')
    for (const npc of crisis.npcs) {
      npc.job = 'guard'
      npc.injuredUntil = crisis.worldTime
      crisis.life.npcs[npc.id]!.careerJob = 'guard'
    }
    walkTo(crisis, { x: 8, y: 10 })
    const need = deriveCivilDefense(crisis, crisis.regionalCrisis)?.needs.find(item => item.id === 'gold')
    expect(need?.shortage).toBeGreaterThan(0)
    player(crisis).gold = 100
    expect(contributeCrisisGold(crisis, crisis.regionalCrisis.id, 1)).toBe('')
    assertReloadable(crisis)
  })

  it.each(['dead', 'combat', 'dungeon'] as const)('blocks crop-good conversion for an unavailable actor (%s) without mutation', mode => {
    const state = createGame(101024)
    const character = player(state)
    if (mode === 'dead') {
      character.isAlive = false
      character.status = 'dead'
    } else if (mode === 'combat') character.status = 'combat'
    else state.dungeon.inDungeon = true
    const before = structuredClone(state)

    expect(convertCropGoodToFood(state, 'spring_pea_good', 1)).not.toBe('')
    expect(state).toEqual(before)
  })
})

