import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../data/config'
import { CRAFTING_RECIPES } from '../data/crafting'
import { MATERIALS } from '../data/rewards'
import type { CraftRecipeId } from '../domain/reward'
import { deserialize, serialize } from '../services/saveService'
import { craft, planCraft } from './crafting'
import { createGame, player, simulate } from './simulation'
import { projectCrafting } from '../presentation/craftingProjection'

function readyFor(recipeId: CraftRecipeId, materialAmount: (id: string, base: number) => number) {
  const state = createGame(101016)
  const recipe = CRAFTING_RECIPES[recipeId]
  const character = player(state)
  character.position = { ...BUILDINGS[recipe.station].position }
  character.skills.smithing.level = recipe.requiredSmithing
  character.gold = 500
  character.stamina = 100
  character.inventory = { ...character.inventory, wood: 50, stone: 50, iron: 50 }
  simulate(state, 9 * 60)
  state.settlement.buildings = [...new Set([...state.settlement.buildings, recipe.station])]
  const materials: Record<string, number> = Object.fromEntries(Object.keys(MATERIALS).map(id => [id, 0]))
  for (const input of recipe.inputs) {
    if (input.source === 'material') materials[input.materialId] = (materials[input.materialId] ?? 0) + input.amount
  }
  for (const [id, amount] of Object.entries(materials)) materials[id] = materialAmount(id, amount)
  state.reward.materials[character.id] = materials
  return state
}

function baseMaterialAmount(recipeId: CraftRecipeId, materialId: string) {
  return CRAFTING_RECIPES[recipeId].inputs.reduce((sum, input) =>
    input.source === 'material' && input.materialId === materialId ? sum + input.amount : sum, 0)
}

function overlappingBiasInputs() {
  return (Object.keys(CRAFTING_RECIPES) as CraftRecipeId[]).flatMap(recipeId => {
    const recipe = CRAFTING_RECIPES[recipeId]
    const inputIds = new Set(recipe.inputs.flatMap(input => input.source === 'material' ? [input.materialId] : []))
    return recipe.allowedBiasMaterials.filter(materialId => inputIds.has(materialId)).map(materialId => ({ recipeId, materialId }))
  })
}

describe('Phase10-R crafting input invariants', () => {
  it.each(overlappingBiasInputs())('blocks duplicate demand and reloads the exact-supply craft: $recipeId / $materialId', ({ recipeId, materialId }) => {
    const base = baseMaterialAmount(recipeId, materialId)
    const short = readyFor(recipeId, (id, amount) => id === materialId ? amount : amount)
    const shortBefore = structuredClone(short)
    const shortPlan = planCraft(short, { recipeId, influenceMaterial: materialId })
    expect(shortPlan.ok).toBe(false)
    expect(shortPlan.reasonCode).toBe('materials_required')
    expect(projectCrafting(short, recipeId, materialId).plan).toMatchObject({ ok: false, reasonCode: 'materials_required' })
    expect(craft(short, { recipeId, influenceMaterial: materialId })).toMatchObject({ ok: false, reasonCode: 'materials_required' })
    expect(short).toEqual(shortBefore)

    const enough = readyFor(recipeId, (id, amount) => id === materialId ? amount + 1 : amount)
    expect(() => deserialize(serialize(enough, 0))).not.toThrow()
    const result = craft(enough, { recipeId, influenceMaterial: materialId })
    expect(result.ok).toBe(true)
    expect(enough.reward.materials[enough.activeCharacterId]?.[materialId]).toBe(0)
    expect(() => deserialize(serialize(enough, 0))).not.toThrow()
    expect(base).toBeGreaterThan(0)
  })

})

