import { BUILDINGS, ITEMS } from '../data/config'
import { CRAFTING_RECIPES } from '../data/crafting'
import { AFFIXES, ITEM_BASES, ITEM_GENERATION_RULES, MATERIALS, RARITIES } from '../data/rewards'
import type { AffixId, CraftingInput, CraftRecipeId, MaterialId, RarityId } from '../domain/reward'
import type { GameState } from '../domain/types'
import { planCraft } from '../engine/crafting'

const RARITY_ORDER: RarityId[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

function inputKey(input: CraftingInput) {
  return input.source === 'inventory' ? `${input.source}:${input.itemId}` : `${input.source}:${input.materialId}`
}

function inputName(input: CraftingInput) {
  return input.source === 'inventory' ? ITEMS[input.itemId].name : MATERIALS[input.materialId].name
}

function percent(value: number) {
  return new Intl.NumberFormat('zh-TW', { style: 'percent', maximumFractionDigits: 1 }).format(value)
}

function siteName(site: 'home' | 'store' | 'blacksmith' | null) {
  if (site === 'home') return '家中工作台'
  if (site === 'store') return BUILDINGS.store.name
  if (site === 'blacksmith') return BUILDINGS.blacksmith.name
  return '目前沒有可用工作台'
}

function qualityText(weights: Record<RarityId, number>) {
  return RARITY_ORDER.map(id => `${RARITIES[id].name} ${percent(weights[id] / 100)}`).join('、')
}

function materialText(id: MaterialId) {
  const material = MATERIALS[id]
  const affixes = Object.entries(material.bias)
    .map(([affixId, weight]) => `${AFFIXES[affixId as AffixId].name} +${weight}`)
    .join('、')
  const special = material.specialBonus > 0
    ? `若成品為傳說武器，月下獵手特性機率 ${percent(ITEM_GENERATION_RULES.legendaryWeaponSpecialChance)} → ${percent(Math.min(1, ITEM_GENERATION_RULES.legendaryWeaponSpecialChance + material.specialBonus))}；素材不改變品質權重，也不提高傳說品質機率。`
    : '素材不改變品質權重或稀有度機率，也不保證指定結果。'
  return `詞綴抽選權重增加：${affixes}。${special}`
}

/** Display-only view over engine plans. Requirements, costs, unlocks, and outcomes remain engine-owned. */
export function projectCrafting(
  state: GameState,
  recipeId: CraftRecipeId = 'starterSpear',
  influenceMaterial: MaterialId | null = null,
) {
  const recipe = CRAFTING_RECIPES[recipeId]
  const plan = planCraft(state, { recipeId, influenceMaterial })
  const output = plan.output ?? {
    baseId: recipe.outputBase, name: ITEM_BASES[recipe.outputBase].name,
    level: recipe.outputLevel, slot: ITEM_BASES[recipe.outputBase].slot,
  }
  const ownerMaterials = state.reward.materials[state.activeCharacterId]
  const influenceMaterials = recipe.allowedBiasMaterials.map(id => ({
    id,
    name: MATERIALS[id].name,
    owned: ownerMaterials?.[id] ?? 0,
    influenceText: materialText(id),
  }))
  const recipes = (Object.keys(CRAFTING_RECIPES) as CraftRecipeId[]).map(id => {
    const definition = CRAFTING_RECIPES[id]
    const recipePlan = planCraft(state, { recipeId: id })
    return {
      id,
      name: definition.name,
      outputName: recipePlan.output?.name ?? ITEM_BASES[definition.outputBase].name,
      outputSlotName: (recipePlan.output?.slot ?? ITEM_BASES[definition.outputBase].slot) === 'weapon' ? '武器' : '防具',
      requiredSmithing: recipePlan.skill.required,
      currentSmithing: recipePlan.skill.current,
      unlocked: recipePlan.skill.unlocked,
      site: recipePlan.station.site,
      plan: recipePlan,
    }
  })

  return {
    plan,
    recipes,
    recipeId,
    recipeName: recipe.name,
    outputName: output.name,
    outputSlotName: output.slot === 'weapon' ? '武器' : '防具',
    outputLevel: output.level,
    stationName: siteName(plan.station.site),
    site: plan.station.site,
    hasHomeWorkbench: recipes.some(item => item.site === 'home'),
    opensAtHour: plan.station.opensAtHour,
    closesAtHour: plan.station.closesAtHour,
    selectedInfluenceMaterial: influenceMaterial,
    influenceMaterials,
    selectedInfluence: influenceMaterials.find(material => material.id === influenceMaterial) ?? null,
    inputs: plan.inputs.map(input => ({
      key: inputKey(input), name: inputName(input), required: input.required, current: input.current,
    })),
    quality: {
      floorName: plan.quality.floor ? RARITIES[plan.quality.floor].name : null,
      weightsText: qualityText(plan.quality.rarityWeights),
      nextFloorName: plan.quality.nextFloor ? RARITIES[plan.quality.nextFloor].name : null,
      nextFloorAtSmithing: plan.quality.nextFloorAtSmithing,
    },
    practice: {
      xpAward: plan.practice.xpAward,
      capLevel: plan.practice.capLevel,
      graduated: plan.practice.graduated,
      nextUnlock: recipes
        .filter(item => !item.unlocked && item.requiredSmithing !== null && item.requiredSmithing > (plan.skill.current ?? 0))
        .sort((a, b) => (a.requiredSmithing ?? 0) - (b.requiredSmithing ?? 0))[0] ?? null,
    },
  }
}
