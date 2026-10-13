import { describe, expect, it } from 'vitest'
import { BUILDINGS, CONFIG } from '../data/config'
import { CONTENT_EQUIPMENT, CONTENT_LOOT_TABLES, CONTENT_MATERIALS, CONTENT_MONSTERS, CONTENT_RECIPES } from '../data/contentRegistry'
import { AFFIXES, MATERIALS } from '../data/rewards'
import { CRAFTING_RECIPES } from '../data/crafting'
import { deserialize, serialize } from '../services/saveService'
import { craft, planCraft } from './crafting'
import { equipInstance, itemSellPrice, sellInstance } from './rewardActions'
import { generateItem } from './itemGeneration'
import { createGame, player } from './simulation'
import type { BuildingId, GameState } from '../domain/types'

/** Controlled fixtures set every recipe's resources, progression, station, and open window explicitly. */
function controlledCraftState(seed: number, recipeId: string): GameState {
  const state = createGame(seed)
  const character = player(state)
  const recipe = CRAFTING_RECIPES[recipeId]!
  const day = Math.floor(state.worldTime / CONFIG.minutesPerDay)

  character.currentRegion = 'village'
  character.position = { ...BUILDINGS[recipe.station].position }
  character.level = 20
  character.stats.strength = 1000
  character.stamina = 100
  character.gold = 100_000
  character.skills.smithing.level = Math.max(recipe.requiredSmithing, 10)
  state.settlement.stage = 'town'
  state.settlement.buildings = [...new Set<BuildingId>([...state.settlement.buildings, recipe.station, 'blacksmith'])]
  state.worldTime = day * CONFIG.minutesPerDay + recipe.opensAtHour * 60
  state.reward.materials[character.id] ??= Object.fromEntries(Object.keys(MATERIALS).map(materialId => [materialId, 0]))

  for (const input of recipe.inputs) {
    if (input.source === 'inventory') {
      character.inventory[input.itemId] = input.amount
    } else {
      state.reward.materials[character.id]![input.materialId] = input.amount
    }
  }
  return state
}

describe('Phase 7 content item integration', () => {
  it('closes every registered content recipe through planning, generation, provenance, equip, save/reload, and sale', () => {
    const recipes = Object.values(CONTENT_RECIPES)
    expect(recipes).toHaveLength(24)

    const cases: { recipe: (typeof recipes)[number]; influenceMaterial?: string }[] = recipes.flatMap(recipe => recipe.allowedBiasMaterials.length
      ? recipe.allowedBiasMaterials.map(influenceMaterial => ({ recipe, influenceMaterial }))
      : [{ recipe }])

    for (const [index, { recipe: contentRecipe, influenceMaterial }] of cases.entries()) {
      const recipe = CRAFTING_RECIPES[contentRecipe.id]!
      const state = controlledCraftState(72900 + index, recipe.id)
      const character = player(state)
      if (influenceMaterial) state.reward.materials[character.id]![influenceMaterial] =
        (state.reward.materials[character.id]![influenceMaterial] ?? 0) + 1

      const request = { recipeId: recipe.id, ...(influenceMaterial ? { influenceMaterial } : {}) }
      const beforePlan = structuredClone(state)
      const plan = planCraft(state, request)
      expect(plan.ok, `${recipe.id} should be available in its controlled station/window/progression fixture`).toBe(true)
      expect(state).toEqual(beforePlan)
      expect(plan.inputs).toEqual([
        ...recipe.inputs.map(input => input.source === 'inventory'
          ? { ...input, required: input.amount, current: beforePlan.characters.find(value => value.id === character.id)!.inventory[input.itemId] }
          : { ...input, required: input.amount,
            current: beforePlan.reward.materials[character.id]?.[input.materialId] ?? 0 }),
        ...(influenceMaterial ? [{ source: 'material', materialId: influenceMaterial, amount: 1,
          required: 1, current: (beforePlan.reward.materials[character.id]?.[influenceMaterial] ?? 0) }] : []),
      ])

      const expectedState = structuredClone(state)
      const expected = generateItem(expectedState, {
        baseId: recipe.outputBase, level: recipe.outputLevel,
        ...(influenceMaterial ? { material: influenceMaterial } : {}),
        context: { kind: 'craft', recipeId: recipe.id },
      })
      const inputCounts = structuredClone(state.reward.materials[character.id]!)
      const result = craft(state, request)
      expect(result).toMatchObject({ ok: true, recipeId: recipe.id, baseId: recipe.outputBase,
        instanceId: expected.instanceId })
      if (!result.ok) throw new Error(result.message)
      expect(state.reward.instances.at(-1)).toEqual(expected)
      expect(state.rngState).toBe(expectedState.rngState)
      expect(state.reward.instances.at(-1)?.craftProvenance).toMatchObject({
        recipeId: recipe.id, createdBy: character.id, influenceMaterial: influenceMaterial ?? null,
      })
      const materialConsumption = new Map<string, number>()
      for (const input of recipe.inputs) {
        if (input.source === 'inventory') expect(character.inventory[input.itemId]).toBe(0)
        else materialConsumption.set(input.materialId, (materialConsumption.get(input.materialId) ?? 0) + input.amount)
      }
      if (influenceMaterial) materialConsumption.set(influenceMaterial, (materialConsumption.get(influenceMaterial) ?? 0) + 1)
      for (const [materialId, amount] of materialConsumption) {
        expect(state.reward.materials[character.id]?.[materialId]).toBe((inputCounts[materialId] ?? 0) - amount)
      }

      expect(equipInstance(state, result.instanceId)).toBe('')
      const reloaded = deserialize(serialize(state, 72950 + index)).state
      const slot = contentRecipe.category
      expect(reloaded.reward.equipped[character.id]?.[slot]).toBe(result.instanceId)
      expect(reloaded.reward.instances.find(item => item.instanceId === result.instanceId)).toEqual(expected)
      expect(equipInstance(reloaded, result.instanceId)).toBe('')

      // A fresh controlled market window keeps the real sale API's station and opening-hour checks meaningful.
      const reloadedCharacter = player(reloaded)
      const saleDay = Math.ceil(reloaded.worldTime / CONFIG.minutesPerDay)
      reloadedCharacter.currentRegion = 'village'
      reloadedCharacter.position = { ...BUILDINGS.blacksmith.position }
      reloaded.settlement.buildings = [...new Set<BuildingId>([...reloaded.settlement.buildings, 'blacksmith'])]
      reloaded.worldTime = saleDay * CONFIG.minutesPerDay + 10 * 60
      const goldBeforeSale = reloadedCharacter.gold
      const expectedPrice = itemSellPrice(expected)
      expect(sellInstance(reloaded, result.instanceId)).toBe('')
      expect(reloaded.reward.instances.some(item => item.instanceId === result.instanceId)).toBe(false)
      expect(reloadedCharacter.gold).toBe(goldBeforeSale + expectedPrice)
    }
  })

  it('covers all 48 family gear bases with real loot-table sources or recipe outputs and keeps boss exclusives out of ordinary sources', () => {
    const equipment = Object.values(CONTENT_EQUIPMENT)
    expect(equipment).toHaveLength(48)
    expect(equipment.filter(item => item.slot === 'weapon')).toHaveLength(30)
    expect(equipment.filter(item => item.slot === 'armor')).toHaveLength(18)

    for (const item of equipment) {
      const exclusiveOwners = Object.values(CONTENT_MONSTERS).filter(monster => monster.bossRules?.exclusiveEquipmentId === item.id)
      const source = Object.values(CONTENT_MONSTERS).some(monster => {
        const table = CONTENT_LOOT_TABLES[monster.lootTableId]!
        return monster.lootProfile.equipmentChance > 0
          && table.weightedEquipment.some(drop => drop.equipmentId === item.id && drop.weight > 0)
      }) || Object.values(CONTENT_RECIPES).some(recipe => recipe.outputBase === item.id) || exclusiveOwners.length > 0
      expect(source, `${item.id} must have a reachable nonzero selected loot source, explicit boss source, or valid recipe`).toBe(true)

      for (const boss of exclusiveOwners) {
        expect(boss.rank).toBe('boss')
        expect(boss.bossRules?.exclusiveEquipmentId).toBe(item.id)
        const ordinaryLeak = Object.values(CONTENT_MONSTERS).filter(monster => monster.rank !== 'boss')
          .some(monster => CONTENT_LOOT_TABLES[monster.lootTableId]!.weightedEquipment
            .some(drop => drop.equipmentId === item.id && drop.weight > 0))
        expect(ordinaryLeak, `${item.id} must remain boss-exclusive`).toBe(false)
      }
    }
  })

  it('keeps every registered content material attached to an authored craft input or compatible generator bias', () => {
    const consumed = new Set(Object.values(CONTENT_RECIPES).flatMap(recipe => recipe.inputs
      .filter((input): input is Extract<typeof input, { source: 'material' }> => input.source === 'material')
      .map(input => input.materialId)))
    const effectiveBiasUsed = new Set(Object.values(CONTENT_RECIPES).flatMap(recipe => {
      const output = CONTENT_EQUIPMENT[recipe.outputBase]
      if (!output) return []
      return recipe.allowedBiasMaterials.filter(materialId => {
        const material = CONTENT_MATERIALS[materialId]
        return !!material && Object.entries(material.bias).some(([affixId, weight]) =>
          typeof weight === 'number' && weight > 0 && output.affixIds.includes(affixId)
          && AFFIXES[affixId]?.slots.includes(output.slot))
      })
    }))
    for (const material of Object.values(CONTENT_MATERIALS)) {
      expect(consumed.has(material.id) || effectiveBiasUsed.has(material.id),
        `${material.id} needs a real mandatory recipe consumer or compatible optional generation bias`).toBe(true)
    }
  })
})
