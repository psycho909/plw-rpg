import { describe, expect, it } from 'vitest'
import { BUILDINGS, CONFIG } from '../data/config'
import { CRAFTING_RECIPES } from '../data/crafting'
import type { GameState } from '../domain/types'
import { generateItem } from './itemGeneration'
import { equipInstance, sellInstance } from './rewardActions'
import { deserialize, serialize } from '../services/saveService'
import { craft, planCraft } from './crafting'
import { createGame, player } from './simulation'

function readyAtStore(): GameState {
  const state = createGame(7301)
  const character = player(state)
  character.position = { ...BUILDINGS.store.position }
  character.inventory.wood = 3
  character.inventory.stone = 2
  character.stamina = 80
  return state
}

function readyForRecipe(recipeId: keyof typeof CRAFTING_RECIPES, smithingLevel = 1): GameState {
  const state = createGame(7301)
  const character = player(state)
  const recipe = CRAFTING_RECIPES[recipeId]
  character.position = { ...BUILDINGS[recipe.station].position }
  character.inventory = { ...character.inventory, wood: 20, stone: 20, iron: 20 }
  character.gold = 500
  character.stamina = 100
  character.skills.smithing.level = smithingLevel
  state.settlement.buildings = [...new Set([...state.settlement.buildings, recipe.station])]
  state.reward.materials[character.id] = { wolfFang: 5, wolfHide: 5, moonStone: 5 }
  return state
}

describe('starter crafting preview', () => {
  it('resolves an owned nearby home as the all-day store site and charges the planned reduced fee', () => {
    const state = readyAtStore()
    const character = player(state)
    state.life.properties.push({
      id: `property:home:${character.id}`, kind: 'home', ownerId: character.id, acquiredAt: state.worldTime,
      position: { x: 7, y: 10 }, storage: { wood: 0, stone: 0, iron: 0, food: 0, material: 0, potion: 0, sword: 0, armor: 0 },
      foodSupplied: 0, suppliedDay: Math.floor(state.worldTime / 1440), suppliedToday: 0,
    })
    state.settlement.buildings = state.settlement.buildings.filter(building => building !== 'store')
    character.position = { x: 8, y: 10 }
    state.worldTime = 23 * 60
    const beforeGold = character.gold

    const preview = planCraft(state, { recipeId: 'starterSpear' })
    const result = craft(state, { recipeId: 'starterSpear' })

    expect(preview).toMatchObject({ ok: true, gold: { required: 3 }, station: {
      id: 'store', site: 'home', opensAtHour: 0, closesAtHour: 24, built: true, nearby: true, open: true, available: true,
    } })
    expect(result.ok).toBe(true)
    expect(character.gold).toBe(beforeGold - 3)
  })

  it('keeps advanced recipes at the blacksmith when the crafter owns a nearby home', () => {
    const state = readyForRecipe('ironShortSword', 6)
    const character = player(state)
    state.life.properties.push({
      id: `property:home:${character.id}`, kind: 'home', ownerId: character.id, acquiredAt: state.worldTime,
      position: { x: 7, y: 10 }, storage: { wood: 0, stone: 0, iron: 0, food: 0, material: 0, potion: 0, sword: 0, armor: 0 },
      foodSupplied: 0, suppliedDay: Math.floor(state.worldTime / 1440), suppliedToday: 0,
    })
    character.position = { x: 8, y: 10 }

    const preview = planCraft(state, { recipeId: 'ironShortSword' })

    expect(preview).toMatchObject({ ok: false, reasonCode: 'too_far', gold: { required: 18 },
      station: { id: 'blacksmith', site: 'blacksmith', opensAtHour: 8, closesAtHour: 18, nearby: false } })
  })

  it.each([
    ['fieldSpear', 5], ['fieldArmor', 7],
  ] as const)('uses the exact home fee for %s', (recipeId, expectedFee) => {
    const state = readyForRecipe(recipeId, 2)
    const character = player(state)
    state.life.properties.push({
      id: `property:home:${character.id}`, kind: 'home', ownerId: character.id, acquiredAt: state.worldTime,
      position: { x: 7, y: 10 }, storage: { wood: 0, stone: 0, iron: 0, food: 0, material: 0, potion: 0, sword: 0, armor: 0 },
      foodSupplied: 0, suppliedDay: Math.floor(state.worldTime / 1440), suppliedToday: 0,
    })
    character.position = { x: 8, y: 10 }
    state.worldTime = 23 * 60
    const goldBefore = character.gold

    const preview = planCraft(state, { recipeId })
    const result = craft(state, { recipeId })

    expect(preview).toMatchObject({ ok: true, gold: { required: expectedFee }, station: { site: 'home' } })
    expect(result.ok).toBe(true)
    expect(character.gold).toBe(goldBefore - expectedFee)
  })

  it('returns the exact affordable starter spear plan without mutating the world', () => {
    const state = readyAtStore()
    const before = structuredClone(state)

    const plan = planCraft(state, { recipeId: 'starterSpear' })

    expect(plan).toEqual({
      ok: true,
      reasonCode: null,
      message: null,
      recipeId: 'starterSpear',
      influenceMaterial: null,
      output: { baseId: 'spear', name: '獵矛', level: 2, slot: 'weapon' },
      inputs: [
        { source: 'inventory', itemId: 'wood', amount: 3, required: 3, current: 3 },
        { source: 'inventory', itemId: 'stone', amount: 2, required: 2, current: 2 },
      ],
      gold: { required: 4, current: 45 },
      stamina: { required: 10, current: 80 },
      durationMinutes: 45,
      skill: { id: 'smithing', required: 1, current: 1, unlocked: true },
      practice: { xpAward: 10, capLevel: 3, graduated: false },
      masterpiece: { requiredSmithing: null, eligible: false, chance: 0 },
      quality: {
        floor: null,
        rarityWeights: { common: 60, uncommon: 27, rare: 10, epic: 2.8, legendary: 0.2 },
        nextFloor: 'uncommon',
        nextFloorAtSmithing: 3,
      },
      station: { id: 'store', site: 'store', opensAtHour: 8, closesAtHour: 18, built: true, nearby: true, open: true, available: true },
      access: { alive: true, inCombat: false, inDungeon: false, available: true },
    })
    expect(state).toEqual(before)
  })

  it('previews a selected influence material as one owned-material input without mutation', () => {
    const state = readyAtStore()
    const character = player(state)
    state.reward.materials[character.id] = { wolfFang: 1, wolfHide: 0, moonStone: 0 }
    const before = structuredClone(state)

    const plan = planCraft(state, { recipeId: 'starterSpear', influenceMaterial: 'wolfFang' })

    expect(plan).toMatchObject({
      ok: true,
      influenceMaterial: 'wolfFang',
      inputs: [
        { source: 'inventory', itemId: 'wood', amount: 3, required: 3, current: 3 },
        { source: 'inventory', itemId: 'stone', amount: 2, required: 2, current: 2 },
        { source: 'material', materialId: 'wolfFang', amount: 1, required: 1, current: 1 },
      ],
    })
    expect(state).toEqual(before)
  })

  it('creates one shared-pipeline instance, consumes the recipe, advances time, and survives reload/equip', () => {
    const state = readyAtStore()
    const expected = structuredClone(state)
    const expectedItem = generateItem(expected, {
      baseId: 'spear', level: 2, context: { kind: 'craft', recipeId: 'starterSpear' },
    })
    const character = player(state)
    const startingGold = character.gold
    const startingStamina = character.stamina
    const startingTime = state.worldTime

    const result = craft(state, { recipeId: 'starterSpear' })

    expect(result).toEqual({ ok: true, instanceId: expectedItem.instanceId, recipeId: 'starterSpear', baseId: 'spear', masterpiece: false })
    if (!result.ok) throw new Error(result.message)
    expect(state.reward.instances).toEqual([expectedItem])
    expect(state.reward.nextInstanceId).toBe(2)
    expect(state.rngState).toBe(expected.rngState)
    expect(character.inventory).toMatchObject({ wood: 0, stone: 0 })
    expect(character.gold).toBe(startingGold - 4)
    expect(character.stamina).toBe(startingStamina - 10)
    expect(character.skills.smithing.exp).toBe(10)
    expect(state.life.characters[character.id]?.actions.smithing).toBe(1)
    expect(state.worldTime).toBe(startingTime + 45)
    expect(state.life.director.lastPlayerActivity).toBe(state.worldTime)
    expect(state.reward.collection.bases).toContain('spear')
    expect(state.events.at(-1)?.type).toBe('craft.completed')

    const reloaded = deserialize(serialize(state, 1)).state
    expect(reloaded.reward.instances).toEqual(state.reward.instances)
    expect(equipInstance(reloaded, result.instanceId)).toBe('')
    expect(reloaded.reward.equipped[reloaded.activeCharacterId]?.weapon).toBe(result.instanceId)
  })

  it.each(['wolfFang', 'moonStone'] as const)('consumes and records %s through save and reload', materialId => {
    const state = readyAtStore()
    const character = player(state)
    state.reward.materials[character.id] = { wolfFang: 2, wolfHide: 0, moonStone: 2 }
    const expected = structuredClone(state)
    const expectedItem = generateItem(expected, {
      baseId: 'spear', level: 2, material: materialId, context: { kind: 'craft', recipeId: 'starterSpear' },
    })

    const result = craft(state, { recipeId: 'starterSpear', influenceMaterial: materialId })

    expect(result).toMatchObject({ ok: true, instanceId: expectedItem.instanceId, baseId: 'spear' })
    expect(state.reward.instances).toEqual([expectedItem])
    expect(state.reward.materials[character.id]?.[materialId]).toBe(1)
    expect(state.reward.instances[0]?.craftProvenance?.influenceMaterial).toBe(materialId)
    const reloaded = deserialize(serialize(state, 1)).state
    expect(reloaded.reward.instances).toEqual(state.reward.instances)
    expect(reloaded.reward.materials[character.id]?.[materialId]).toBe(1)
  })

  it('repeats an influence craft deterministically from the same seed and inputs', () => {
    const first = readyAtStore()
    const second = readyAtStore()
    const firstOwner = player(first), secondOwner = player(second)
    first.reward.materials[firstOwner.id] = { wolfFang: 1, wolfHide: 0, moonStone: 0 }
    second.reward.materials[secondOwner.id] = { wolfFang: 1, wolfHide: 0, moonStone: 0 }

    const firstResult = craft(first, { recipeId: 'starterSpear', influenceMaterial: 'wolfFang' })
    const secondResult = craft(second, { recipeId: 'starterSpear', influenceMaterial: 'wolfFang' })

    expect(firstResult).toEqual(secondResult)
    expect(first.reward.instances).toEqual(second.reward.instances)
    expect(first.reward.materials).toEqual(second.reward.materials)
    expect(first.rngState).toBe(second.rngState)
    expect(first.worldTime).toBe(second.worldTime)
    expect(first.events).toEqual(second.events)
  })
})

describe('crafting skill capabilities', () => {
  it('defines the four approved recipes with their exact costs, outputs, unlocks, stations and practice caps', () => {
    expect(Object.values(CRAFTING_RECIPES).map(recipe => ({
      id: recipe.id, inputs: recipe.inputs, goldCost: recipe.goldCost, staminaCost: recipe.staminaCost,
      durationMinutes: recipe.durationMinutes, outputBase: recipe.outputBase, outputLevel: recipe.outputLevel,
      requiredSmithing: recipe.requiredSmithing, station: recipe.station, practiceCap: recipe.practiceCap,
      name: recipe.name, allowedBiasMaterials: recipe.allowedBiasMaterials,
    }))).toEqual([
      { id: 'starterSpear', inputs: [{ source: 'inventory', itemId: 'wood', amount: 3 }, { source: 'inventory', itemId: 'stone', amount: 2 }],
        goldCost: 4, staminaCost: 10, durationMinutes: 45, outputBase: 'spear', outputLevel: 2, requiredSmithing: 1,
        station: 'store', practiceCap: 3, name: '木石長矛', allowedBiasMaterials: ['wolfFang', 'moonStone'] },
      { id: 'fieldSpear', inputs: [{ source: 'inventory', itemId: 'wood', amount: 4 }, { source: 'inventory', itemId: 'stone', amount: 3 }],
        goldCost: 6, staminaCost: 12, durationMinutes: 60, outputBase: 'spear', outputLevel: 3, requiredSmithing: 2,
        station: 'store', practiceCap: 5, name: '進階長矛', allowedBiasMaterials: ['wolfFang', 'moonStone'] },
      { id: 'fieldArmor', inputs: [{ source: 'inventory', itemId: 'iron', amount: 2 }, { source: 'inventory', itemId: 'wood', amount: 1 }],
        goldCost: 8, staminaCost: 12, durationMinutes: 60, outputBase: 'chainArmor', outputLevel: 3, requiredSmithing: 2,
        station: 'store', practiceCap: 5, name: '鎖甲', allowedBiasMaterials: ['wolfHide'] },
      { id: 'ironShortSword', inputs: [{ source: 'inventory', itemId: 'iron', amount: 3 }, { source: 'inventory', itemId: 'wood', amount: 1 }],
        goldCost: 18, staminaCost: 16, durationMinutes: 90, outputBase: 'shortSword', outputLevel: 6, requiredSmithing: 5,
        station: 'blacksmith', practiceCap: 6, name: '鐵短劍', allowedBiasMaterials: ['wolfFang', 'moonStone'] },
    ])
  })

  it('denies a locked recipe before changing any state and reports the unlock in the preview', () => {
    const state = readyForRecipe('fieldSpear', 1)
    const before = structuredClone(state)

    const preview = planCraft(state, { recipeId: 'fieldSpear' })
    const result = craft(state, { recipeId: 'fieldSpear' })

    expect(preview).toMatchObject({ ok: false, reasonCode: 'skill_required', skill: { required: 2, current: 1, unlocked: false },
      practice: { xpAward: 0, capLevel: 5, graduated: false } })
    expect(result).toMatchObject({ ok: false, reasonCode: 'skill_required' })
    expect(state).toEqual(before)
  })

  it('previews the next quality floor and exact rarity weights from the current Smithing level', () => {
    const fieldSpear = readyForRecipe('fieldSpear', 2)
    expect(planCraft(fieldSpear, { recipeId: 'fieldSpear' })).toMatchObject({
      ok: true, practice: { xpAward: 10, capLevel: 5, graduated: false },
      quality: { floor: null, rarityWeights: { common: 60, uncommon: 27, rare: 10, epic: 2.8, legendary: 0.2 },
        nextFloor: 'uncommon', nextFloorAtSmithing: 3 },
    })

    player(fieldSpear).skills.smithing.level = 3
    expect(planCraft(fieldSpear, { recipeId: 'fieldSpear' })).toMatchObject({
      quality: { floor: 'uncommon', rarityWeights: { common: 0, uncommon: 87, rare: 10, epic: 2.8, legendary: 0.2 },
        nextFloor: null, nextFloorAtSmithing: null },
    })
    player(fieldSpear).skills.smithing.level = 40
    expect(planCraft(fieldSpear, { recipeId: 'fieldSpear' })).toMatchObject({
      quality: { floor: 'uncommon', rarityWeights: { common: 0, uncommon: 87, rare: 10, epic: 2.8, legendary: 0.2 },
        nextFloor: null, nextFloorAtSmithing: null },
    })

    const advanced = readyForRecipe('ironShortSword', 4)
    expect(planCraft(advanced, { recipeId: 'ironShortSword' })).toMatchObject({
      quality: { floor: null, rarityWeights: { common: 60, uncommon: 27, rare: 10, epic: 2.8, legendary: 0.2 },
        nextFloor: 'rare', nextFloorAtSmithing: 5 },
    })
    player(advanced).skills.smithing.level = 5
    expect(planCraft(advanced, { recipeId: 'ironShortSword' })).toMatchObject({
      quality: { floor: 'rare', rarityWeights: { common: 0, uncommon: 0, rare: 97, epic: 2.8, legendary: 0.2 },
        nextFloor: null, nextFloorAtSmithing: null },
    })
  })

  it('enforces craft rarity floors in the shared generator while leaving below-threshold and context-free rolls alone', () => {
    const basic = createGame(442)
    basic.rngState = 0
    expect(generateItem(basic, { baseId: 'spear', level: 2, context: { kind: 'craft', recipeId: 'starterSpear' } }).rarity).toBe('common')

    const intermediate = readyForRecipe('fieldSpear', 3)
    const intermediateItems = Array.from({ length: 80 }, () => generateItem(intermediate, {
      baseId: 'spear', level: 3, context: { kind: 'craft', recipeId: 'fieldSpear' },
    }))
    expect(intermediateItems.every(item => item.rarity !== 'common')).toBe(true)

    const advanced = readyForRecipe('ironShortSword', 5)
    const advancedItems = Array.from({ length: 80 }, () => generateItem(advanced, {
      baseId: 'shortSword', level: 6, context: { kind: 'craft', recipeId: 'ironShortSword' },
    }))
    expect(advancedItems.every(item => item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary')).toBe(true)
  })

  it.each(['wolfFang', 'moonStone'] as const)('consumes one %s for the advanced sword without changing its seeded masterpiece or rarity odds', materialId => {
    const neutral = readyForRecipe('ironShortSword', 6)
    neutral.rngState = 2
    delete neutral.reward.materials[neutral.activeCharacterId]
    const influenced = readyForRecipe('ironShortSword', 6)
    influenced.rngState = 2
    const owner = player(influenced)
    influenced.reward.materials[owner.id] = { wolfFang: 2, wolfHide: 0, moonStone: 2 }

    const preview = planCraft(influenced, { recipeId: 'ironShortSword', influenceMaterial: materialId })
    expect(preview).toMatchObject({
      ok: true,
      masterpiece: { requiredSmithing: 6, eligible: true, chance: 0.25 },
      inputs: expect.arrayContaining([{ source: 'material', materialId, amount: 1, required: 1, current: 2 }]),
    })

    const neutralResult = craft(neutral, { recipeId: 'ironShortSword' })
    const influencedResult = craft(influenced, { recipeId: 'ironShortSword', influenceMaterial: materialId })

    expect(neutralResult).toMatchObject({ ok: true, masterpiece: true })
    expect(influencedResult).toMatchObject({ ok: true, masterpiece: true })
    if (!neutralResult.ok || !influencedResult.ok) throw new Error('預期配方可鍛造。')
    const neutralItem = neutral.reward.instances.find(item => item.instanceId === neutralResult.instanceId)!
    const influencedItem = influenced.reward.instances.find(item => item.instanceId === influencedResult.instanceId)!
    expect(influencedItem.rarity).toBe(neutralItem.rarity)
    expect(influencedItem.craftProvenance?.influenceMaterial).toBe(materialId)
    expect(influenced.reward.materials[owner.id]?.[materialId]).toBe(1)
  })

  it('awards practice through the level-3 graduation craft and keeps recording later starter crafts without XP', () => {
    const state = readyForRecipe('starterSpear', 1)
    const character = player(state)
    character.inventory.wood = 30
    character.inventory.stone = 30
    character.gold = 100

    for (let completed = 1; completed <= 6; completed++) {
      const preview = planCraft(state, { recipeId: 'starterSpear' })
      expect(preview).toMatchObject({ ok: true, practice: { xpAward: 10, capLevel: 3, graduated: false } })
      expect(craft(state, { recipeId: 'starterSpear' }).ok).toBe(true)
    }
    expect(character.skills.smithing).toEqual({ level: 3, exp: 0 })

    const generalExp = character.exp
    const actionCount = state.life.characters[character.id]!.actions.smithing
    const preview = planCraft(state, { recipeId: 'starterSpear' })
    expect(preview).toMatchObject({ ok: true, practice: { xpAward: 0, capLevel: 3, graduated: true } })
    expect(craft(state, { recipeId: 'starterSpear' }).ok).toBe(true)
    expect(character.exp).toBe(generalExp)
    expect(character.skills.smithing).toEqual({ level: 3, exp: 0 })
    expect(state.life.characters[character.id]!.actions.smithing).toBe(actionCount + 1)
  })

  it('forms the Smith identity on the tenth successful action at Smithing 3 and preserves it on reload', () => {
    const state = readyAtStore()
    const character = player(state)
    const life = state.life.characters[character.id]!
    character.skills.smithing.level = 3
    life.actions.smithing = 9

    const result = craft(state, { recipeId: 'starterSpear' })

    expect(result.ok).toBe(true)
    expect(life.actions.smithing).toBe(10)
    expect(life.identities).toContain('smith')
    expect(life.milestones).toContainEqual(expect.objectContaining({ id: 'identity:smith', text: '成為鍛造師' }))
    expect(deserialize(serialize(state, 1)).state.life.characters[character.id]?.identities).toContain('smith')
  })

  it.each([
    ['starterSpear', 3], ['fieldSpear', 5], ['fieldArmor', 5], ['ironShortSword', 6],
  ] as const)('stops awarding practice at the %s Smithing cap %i while recording the action', (recipeId, capLevel) => {
    const state = readyForRecipe(recipeId, capLevel)
    const character = player(state)
    const recipe = CRAFTING_RECIPES[recipeId]
    character.exp = 7
    character.skills.smithing.exp = 11
    const beforeActions = state.life.characters[character.id]!.actions.smithing
    const beforeTime = state.worldTime
    const preview = planCraft(state, { recipeId })
    const result = craft(state, { recipeId })

    expect(preview).toMatchObject({ ok: true, practice: { xpAward: 0, capLevel, graduated: true } })
    expect(result).toMatchObject({ ok: true, recipeId, baseId: recipe.outputBase })
    expect(character.exp).toBe(7)
    expect(character.skills.smithing).toEqual({ level: capLevel, exp: 11 })
    expect(state.life.characters[character.id]!.actions.smithing).toBe(beforeActions + 1)
    expect(state.reward.instances.at(-1)).toMatchObject({ baseId: recipe.outputBase, level: recipe.outputLevel })
    expect(character.gold).toBe(500 - recipe.goldCost)
    expect(character.stamina).toBe(100 - recipe.staminaCost)
    for (const input of recipe.inputs) {
      if (input.source === 'inventory') expect(character.inventory[input.itemId]).toBe(20 - input.amount)
    }
    expect(state.worldTime).toBe(beforeTime + recipe.durationMinutes)
    expect(deserialize(serialize(state, 1)).state.reward.instances).toEqual(state.reward.instances)
  })

  it('preserves a legitimate common starter craft after the creator advances to a higher Smithing floor', () => {
    const state = readyForRecipe('starterSpear', 1)
    state.rngState = 0 // First default rarity roll is below the 60-weight Common boundary.
    const result = craft(state, { recipeId: 'starterSpear' })
    expect(result.ok).toBe(true)
    const original = structuredClone(state.reward.instances[0]!)
    expect(original.rarity).toBe('common')

    player(state).skills.smithing.level = 5
    const reloaded = deserialize(serialize(state, 1)).state
    expect(reloaded.reward.instances[0]).toEqual(original)
    expect(reloaded.reward.instances[0]?.rolledStats).toEqual(original.rolledStats)
    expect(reloaded.reward.instances[0]?.instanceId).toBe(original.instanceId)
  })

  it('records a seeded Smithing 6 masterpiece as a saved, important crafter milestone', () => {
    const state = readyForRecipe('ironShortSword', 6)
    state.rngState = 2 // Rare floor, then the sixth draw is 0.1172: inside the 25% mastery roll.
    const comparison = readyForRecipe('ironShortSword', 5)
    comparison.rngState = 2
    const comparisonResult = craft(comparison, { recipeId: 'ironShortSword' })
    if (!comparisonResult.ok) throw new Error(comparisonResult.message)
    const comparisonItem = comparison.reward.instances.find(candidate => candidate.instanceId === comparisonResult.instanceId)!
    const character = player(state)
    const startedAt = state.worldTime

    expect(planCraft(state, { recipeId: 'ironShortSword' })).toMatchObject({
      ok: true,
      masterpiece: { requiredSmithing: 6, eligible: true, chance: 0.25 },
    })

    const result = craft(state, { recipeId: 'ironShortSword' })

    expect(result).toMatchObject({ ok: true, recipeId: 'ironShortSword', baseId: 'shortSword', masterpiece: true })
    if (!result.ok) throw new Error(result.message)
    const item = state.reward.instances.find(candidate => candidate.instanceId === result.instanceId)
    expect(item).toMatchObject({
      rarity: 'rare',
      craftProvenance: { recipeId: 'ironShortSword', createdBy: character.id, createdAt: startedAt, masterpiece: true },
    })
    expect(item?.rarity).toBe(comparisonItem.rarity)
    expect(item?.rolledStats).toEqual(comparisonItem.rolledStats)
    expect(state.life.characters[character.id]?.milestones).toContainEqual(expect.objectContaining({
      id: `craft:${result.instanceId}`, at: startedAt, text: expect.stringContaining('鐵短劍'),
    }))
    expect(state.history.at(-1)).toMatchObject({ type: 'craft.completed', tier: 'major' })

    const reloaded = deserialize(serialize(state, 1)).state
    expect(reloaded.reward.instances.find(candidate => candidate.instanceId === result.instanceId)).toEqual(item)
    expect(reloaded.life.characters[character.id]?.milestones).toContainEqual(expect.objectContaining({
      id: `craft:${result.instanceId}`, at: startedAt,
    }))
  })

  it('awards first-masterpiece reputation once and keeps its identity after sale and milestone eviction', () => {
    const state = readyForRecipe('ironShortSword', 6)
    state.rngState = 2
    const character = player(state)
    const life = state.life.characters[character.id]!
    life.reputation = 97

    const first = craft(state, { recipeId: 'ironShortSword' })

    expect(first).toMatchObject({ ok: true, masterpiece: true })
    if (!first.ok) throw new Error('預期第一次鍛造傑作成功。')
    expect(life.identities).toContain('masterpieceCrafter')
    expect(life.reputation).toBe(100)
    expect(life.reputationHistory.filter(entry => entry.reason === '首次鍛造傑作')).toEqual([
      { at: expect.any(Number), delta: 3, reason: '首次鍛造傑作' },
    ])
    expect(sellInstance(state, first.instanceId)).toBe('')

    life.milestones = [
      { id: 'identity:masterpieceCrafter', at: state.worldTime, text: '成為傑作匠師' },
      ...Array.from({ length: 31 }, (_, index) => ({ id: `filled-${index}`, at: state.worldTime, text: '已保留紀錄' })),
    ]
    state.rngState = 2
    const second = craft(state, { recipeId: 'ironShortSword' })

    expect(second).toMatchObject({ ok: true, masterpiece: true })
    expect(life.identities).toContain('masterpieceCrafter')
    expect(life.reputation).toBe(100)
    expect(life.reputationHistory.filter(entry => entry.reason === '首次鍛造傑作')).toHaveLength(1)
    expect(life.milestones.some(milestone => milestone.id === 'identity:masterpieceCrafter')).toBe(false)
    expect(deserialize(serialize(state, 1)).state.life.characters[character.id]?.identities).toContain('masterpieceCrafter')
  })

  it('allows a first masterpiece when the conservative same-day event budget fits', () => {
    const state = readyForRecipe('ironShortSword', 6)
    const character = player(state)
    state.rngState = 2
    state.eventSequence = Number.MAX_SAFE_INTEGER - 15
    const life = state.life.characters[character.id]!
    life.reputation = 23
    life.actions.smithing = 9

    const result = craft(state, { recipeId: 'ironShortSword' })

    expect(result).toMatchObject({ ok: true, masterpiece: true })
    expect(state.eventSequence).toBe(Number.MAX_SAFE_INTEGER - 11)
    expect(life.identities).toEqual(expect.arrayContaining(['masterpieceCrafter', 'smith']))
    expect(state.events.slice(-4).map(event => event.type)).toEqual([
      'identity.formed', 'reputation.rankChanged', 'identity.formed', 'craft.completed',
    ])
  })

  it('rejects a first masterpiece before RNG when the event budget does not fit', () => {
    const state = readyForRecipe('ironShortSword', 6)
    state.rngState = 2
    state.eventSequence = Number.MAX_SAFE_INTEGER - 4
    const before = structuredClone(state)

    const preview = planCraft(state, { recipeId: 'ironShortSword' })
    const result = craft(state, { recipeId: 'ironShortSword' })

    expect(preview).toMatchObject({ ok: false, reasonCode: 'event_capacity' })
    expect(result).toMatchObject({ ok: false, reasonCode: 'event_capacity' })
    expect(state).toEqual(before)
  })

  it('rejects before mutation when crop and XP events exceed the remaining event ids', () => {
    const state = readyAtStore()
    const character = player(state)
    state.eventSequence = Number.MAX_SAFE_INTEGER - 5
    state.crops = Array.from({ length: 4 }, (_, index) => ({
      id: index + 2, plantedAt: 0, growthDuration: 1, matureAt: 1,
      status: 'growing' as const,
    }))
    character.exp = 29
    character.skills.smithing.exp = 19
    expect(deserialize(serialize(state)).state).toEqual(state)
    const before = structuredClone(state)
    const initialSequence = state.eventSequence

    const preview = planCraft(state, { recipeId: 'starterSpear' })
    const result = craft(state, { recipeId: 'starterSpear' })
    let reloadAccepted = true
    try { deserialize(serialize(state)) } catch { reloadAccepted = false }

    expect({
      previewOk: preview.ok,
      resultOk: result.ok,
      emittedEvents: state.events.filter(event => event.id > initialSequence).length,
      sequenceDelta: state.eventSequence - initialSequence,
      sequenceSafe: Number.isSafeInteger(state.eventSequence),
      newEventIds: state.events.filter(event => event.id > initialSequence).map(event => event.id),
      reloadAccepted,
      unchanged: JSON.stringify(state) === JSON.stringify(before),
    }).toEqual({
      previewOk: false,
      resultOk: false,
      emittedEvents: 0,
      sequenceDelta: 0,
      sequenceSafe: true,
      newEventIds: [],
      reloadAccepted: true,
      unchanged: true,
    })
    expect(state).toEqual(before)
  })

  it('reserves the year-boundary event budget for the full NPC and party population', () => {
    const state = readyAtStore()
    const character = player(state)
    state.worldTime = 120 * CONFIG.minutesPerDay - 30
    state.eventSequence = Number.MAX_SAFE_INTEGER - 300
    state.life.properties.push({
      id: `property:home:${character.id}`, kind: 'home', ownerId: character.id, acquiredAt: state.worldTime,
      position: { x: 7, y: 10 }, storage: { wood: 0, stone: 0, iron: 0, food: 0, material: 0, potion: 0, sword: 0, armor: 0 },
      foodSupplied: 0, suppliedDay: Math.floor(state.worldTime / CONFIG.minutesPerDay), suppliedToday: 0,
    })
    character.position = { x: 8, y: 10 }
    const npcTemplate = structuredClone(state.npcs[0]!)
    const lifeTemplate = structuredClone(state.life.npcs[npcTemplate.id]!)
    state.npcs = Array.from({ length: 1000 }, (_, index) => ({ ...structuredClone(npcTemplate), id: `npc-${index + 1}` }))
    state.life.npcs = Object.fromEntries(state.npcs.map(npc => [npc.id, structuredClone(lifeTemplate)]))
    state.nextNpcId = 1001
    state.party = [
      { npcId: 'npc-1', hireCost: 20, dailyWage: 4, contractEnd: state.worldTime, archetype: 'fighter' },
      { npcId: 'npc-2', hireCost: 20, dailyWage: 4, contractEnd: state.worldTime, archetype: 'healer' },
    ]
    state.crops = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1, plantedAt: state.worldTime, growthDuration: 10, matureAt: state.worldTime + 10,
      status: 'growing' as const,
    }))
    expect(deserialize(serialize(state)).state).toEqual(state)
    const before = structuredClone(state)

    const preview = planCraft(state, { recipeId: 'starterSpear' })
    const result = craft(state, { recipeId: 'starterSpear' })

    expect(preview).toMatchObject({ ok: false, reasonCode: 'event_capacity' })
    expect(result).toMatchObject({ ok: false, reasonCode: 'event_capacity' })
    expect(state).toEqual(before)
  })

  it('rejects before mutation when a crossed day could exhaust the NPC id allocator', () => {
    const state = readyAtStore()
    const character = player(state)
    state.worldTime = 15 * CONFIG.minutesPerDay - 30
    character.position = { x: 8, y: 10 }
    state.life.properties.push({
      id: `property:home:${character.id}`, kind: 'home', ownerId: character.id, acquiredAt: state.worldTime,
      position: { x: 7, y: 10 }, storage: { wood: 0, stone: 0, iron: 0, food: 0, material: 0, potion: 0, sword: 0, armor: 0 },
      foodSupplied: 0, suppliedDay: Math.floor(state.worldTime / CONFIG.minutesPerDay), suppliedToday: 0,
    })
    state.nextNpcId = Number.MAX_SAFE_INTEGER - 1
    expect(deserialize(serialize(state)).state).toEqual(state)
    const before = structuredClone(state)
    const initialNpcId = state.nextNpcId
    const initialPopulation = state.npcs.length

    const preview = planCraft(state, { recipeId: 'starterSpear' })
    const result = craft(state, { recipeId: 'starterSpear' })
    let reloadAccepted = true
    try { deserialize(serialize(state)) } catch { reloadAccepted = false }

    expect({
      previewReason: preview.ok ? null : preview.reasonCode,
      resultReason: result.ok ? null : result.reasonCode,
      initialNpcId,
      nextNpcId: state.nextNpcId,
      initialPopulation,
      finalPopulation: state.npcs.length,
      reloadAccepted,
      unchanged: JSON.stringify(state) === JSON.stringify(before),
    }).toEqual({
      previewReason: 'event_capacity', resultReason: 'event_capacity',
      initialNpcId: Number.MAX_SAFE_INTEGER - 1, nextNpcId: Number.MAX_SAFE_INTEGER - 1,
      initialPopulation: 29, finalPopulation: 29, reloadAccepted: true, unchanged: true,
    })
  })

  it('rejects before mutation when a crossed day could exhaust the living-event id allocator', () => {
    const state = readyAtStore()
    const character = player(state)
    state.worldTime = 15 * CONFIG.minutesPerDay - 30
    character.position = { x: 8, y: 10 }
    state.life.properties.push({
      id: `property:home:${character.id}`, kind: 'home', ownerId: character.id, acquiredAt: state.worldTime,
      position: { x: 7, y: 10 }, storage: { wood: 0, stone: 0, iron: 0, food: 0, material: 0, potion: 0, sword: 0, armor: 0 },
      foodSupplied: 0, suppliedDay: Math.floor(state.worldTime / CONFIG.minutesPerDay), suppliedToday: 0,
    })
    const injuredNpc = state.npcs[0]!
    injuredNpc.injuredUntil = state.worldTime + 45
    state.settlement.capacity = state.characters.length + state.npcs.length
    state.life.director.quietUntil = state.worldTime + CONFIG.minutesPerDay
    state.life.director.sequence = Number.MAX_SAFE_INTEGER - 1
    expect(deserialize(serialize(state)).state).toEqual(state)
    const before = structuredClone(state)

    const preview = planCraft(state, { recipeId: 'starterSpear' })
    const result = craft(state, { recipeId: 'starterSpear' })
    let reloadAccepted = true
    try { deserialize(serialize(state)) } catch { reloadAccepted = false }

    expect({
      previewReason: preview.ok ? null : preview.reasonCode,
      resultReason: result.ok ? null : result.reasonCode,
      initialSequence: before.life.director.sequence,
      sequence: state.life.director.sequence,
      reloadAccepted,
      unchanged: JSON.stringify(state) === JSON.stringify(before),
    }).toEqual({
      previewReason: 'event_capacity', resultReason: 'event_capacity',
      initialSequence: Number.MAX_SAFE_INTEGER - 1, sequence: Number.MAX_SAFE_INTEGER - 1,
      reloadAccepted: true, unchanged: true,
    })
  })

  it('keeps ordinary crafts out of important history and records Legendary non-masterpieces', () => {
    const ordinary = readyForRecipe('starterSpear', 1)
    ordinary.rngState = 0
    const ordinaryHistoryBefore = ordinary.history.length

    const ordinaryResult = craft(ordinary, { recipeId: 'starterSpear' })

    expect(ordinaryResult).toMatchObject({ ok: true, masterpiece: false })
    expect(ordinary.history).toHaveLength(ordinaryHistoryBefore)
    expect(ordinary.events.at(-1)?.tier).toBe('gameplay')
    expect(ordinary.life.characters[ordinary.activeCharacterId]?.milestones.some(milestone => milestone.id.startsWith('craft:'))).toBe(false)

    const legendary = readyForRecipe('ironShortSword', 5)
    legendary.rngState = 1967 // At Smithing 5, the first roll lands in the existing 0.2% Legendary weight.
    const startedAt = legendary.worldTime

    const legendaryResult = craft(legendary, { recipeId: 'ironShortSword' })

    expect(legendaryResult).toMatchObject({ ok: true, masterpiece: false })
    if (!legendaryResult.ok) throw new Error(legendaryResult.message)
    const item = legendary.reward.instances.find(candidate => candidate.instanceId === legendaryResult.instanceId)
    expect(item).toMatchObject({ rarity: 'legendary', craftProvenance: { masterpiece: false, createdAt: startedAt } })
    expect(legendary.history.at(-1)).toMatchObject({ type: 'craft.completed', tier: 'major' })
    expect(legendary.life.characters[legendary.activeCharacterId]?.milestones).toContainEqual(expect.objectContaining({
      id: `craft:${legendaryResult.instanceId}`, at: startedAt, text: expect.stringContaining('鐵短劍'),
    }))
    expect(deserialize(serialize(legendary, 1)).state.reward.instances).toEqual(legendary.reward.instances)
  })

  it('retains the newest important craft when personal milestones and world history are full', () => {
    const state = readyForRecipe('ironShortSword', 6)
    state.rngState = 2
    const character = player(state)
    state.eventSequence = 20000
    state.history = Array.from({ length: 20000 }, (_, index) => ({
      id: index + 1, at: state.worldTime, type: 'recorded', category: 'world', message: '過去紀錄', tier: 'major' as const,
    }))
    state.life.characters[character.id]!.milestones = Array.from({ length: 32 }, (_, index) => ({
      id: `past-${index}`, at: state.worldTime, text: '過去里程碑',
    }))

    const result = craft(state, { recipeId: 'ironShortSword' })

    expect(result).toMatchObject({ ok: true, masterpiece: true })
    if (!result.ok) throw new Error(result.message)
    expect(state.history).toHaveLength(20000)
    expect(state.history[0]?.id).toBe(3)
    expect(state.history.at(-1)).toMatchObject({ id: 20002, type: 'craft.completed', tier: 'major' })
    expect(state.life.characters[character.id]!.milestones).toHaveLength(32)
    expect(state.life.characters[character.id]!.milestones).toContainEqual(expect.objectContaining({ id: `craft:${result.instanceId}` }))
    expect(deserialize(serialize(state, 1)).state.history).toEqual(state.history)
  })

  it('preserves the crafter and craft-start milestone when a masterpiece outlasts its maker', () => {
    const recipe = CRAFTING_RECIPES.ironShortSword
    const originalClosingHour = recipe.closesAtHour
    recipe.closesAtHour = 24
    try {
      const state = readyForRecipe('ironShortSword', 6)
      state.worldTime = CONFIG.daysPerSeason * 4 * CONFIG.minutesPerDay - 60
      state.rngState = 2
      const character = player(state)
      const life = state.life.characters[character.id]!
      character.birthYear = 0
      character.lifespan = 2
      const startedAt = state.worldTime

      const result = craft(state, { recipeId: 'ironShortSword' })

      expect(result).toMatchObject({ ok: true, masterpiece: true })
      if (!result.ok) throw new Error(result.message)
      expect(character.isAlive).toBe(false)
      expect(state.activeCharacterId).toBe(character.id)
      expect(life.identities).toContain('masterpieceCrafter')
      expect(life.reputation).toBe(3)
      expect(state.reward.instances.find(item => item.instanceId === result.instanceId)).toMatchObject({
        craftProvenance: { createdBy: character.id, createdAt: startedAt, masterpiece: true },
      })
      expect(state.life.characters[character.id]?.milestones).toContainEqual(expect.objectContaining({
        id: `craft:${result.instanceId}`, at: startedAt, text: expect.stringContaining('鐵短劍'),
      }))
      expect(state.life.characters[character.id]?.milestones.at(-1)?.id).toBe(`death-${character.id}`)
      const reloaded = deserialize(serialize(state, 1)).state
      expect(reloaded.reward.instances.find(item => item.instanceId === result.instanceId)?.craftProvenance?.createdBy).toBe(character.id)
      expect(reloaded.life.characters[character.id]?.milestones).toContainEqual(expect.objectContaining({
        id: `craft:${result.instanceId}`, at: startedAt,
      }))
    } finally {
      recipe.closesAtHour = originalClosingHour
    }
  })
})

describe('starter crafting transaction', () => {
  const influenceRejections = [
    {
      name: 'a material unsupported by the recipe',
      request: { recipeId: 'starterSpear', influenceMaterial: 'wolfHide' },
      reasonCode: 'material_not_allowed',
      prepare: (state: GameState) => { player(state); state.reward.materials[state.activeCharacterId] = { wolfFang: 0, wolfHide: 1, moonStone: 0 } },
    },
    {
      name: 'a selected material absent from the active owner stack',
      request: { recipeId: 'starterSpear', influenceMaterial: 'wolfFang' },
      reasonCode: 'materials_required',
      prepare: (_state: GameState) => {},
    },
  ] as const

  it.each(influenceRejections)('rejects $name before RNG or mutation', ({ request, reasonCode, prepare }) => {
    const state = readyAtStore()
    prepare(state)
    const before = structuredClone(state)

    const preview = planCraft(state, request)
    const result = craft(state, request)

    expect(preview).toMatchObject({ ok: false, reasonCode })
    expect(result).toMatchObject({ ok: false, reasonCode, message: expect.any(String) })
    expect(state).toEqual(before)
  })

  const rejectedActions = [
    { name: 'outside the station range', reasonCode: 'too_far', change: (state: GameState) => { player(state).position = { x: 1, y: 1 } } },
    { name: 'while the workbench is closed', reasonCode: 'station_closed', change: (state: GameState) => { state.worldTime = 18 * 60 } },
    { name: 'before the workbench exists', reasonCode: 'station_unavailable', change: (state: GameState) => { state.settlement.buildings = [] } },
    { name: 'after the character dies', reasonCode: 'dead', change: (state: GameState) => { player(state).isAlive = false } },
    { name: 'during combat', reasonCode: 'in_combat', change: (state: GameState) => { state.combat = { monsterId: 'wolf', hp: 1, maxHp: 1, attack: 1, defense: 0, exp: 0, gold: 0, elite: false, dungeon: false } } },
    { name: 'inside the dungeon', reasonCode: 'in_dungeon', change: (state: GameState) => { state.dungeon.inDungeon = true } },
    { name: 'below the recipe skill requirement', reasonCode: 'skill_required', change: (state: GameState) => { player(state).skills.smithing.level = 0 } },
    { name: 'without enough ingredients', reasonCode: 'materials_required', change: (state: GameState) => { player(state).inventory.wood = 2 } },
    { name: 'without enough gold', reasonCode: 'gold_required', change: (state: GameState) => { player(state).gold = 3 } },
    { name: 'without enough stamina', reasonCode: 'stamina_required', change: (state: GameState) => { player(state).stamina = 9 } },
    { name: 'without a workbench outside store hours and no owned home', reasonCode: 'station_closed', change: (state: GameState) => { state.worldTime = 23 * 60 } },
    { name: 'with a malformed owned home site', reasonCode: 'world_state_invalid', change: (state: GameState) => {
      const character = player(state)
      state.life.properties.push({ id: `property:home:${character.id}`, kind: 'home', ownerId: character.id,
        acquiredAt: state.worldTime, position: { x: 7.5, y: 10 }, storage: { wood: 0, stone: 0, iron: 0, food: 0, material: 0, potion: 0, sword: 0, armor: 0 },
        foodSupplied: 0, suppliedDay: 0, suppliedToday: 0 })
    } },
    { name: 'with malformed identity state', reasonCode: 'world_state_invalid', change: (state: GameState) => {
      state.life.characters[state.activeCharacterId]!.identities = ['resident', 'resident']
    } },
    { name: 'with malformed reputation', reasonCode: 'world_state_invalid', change: (state: GameState) => {
      state.life.characters[state.activeCharacterId]!.reputation = Number.NaN
    } },
    { name: 'with malformed reputation history', reasonCode: 'world_state_invalid', change: (state: GameState) => {
      state.life.characters[state.activeCharacterId]!.reputationHistory = [{ at: state.worldTime, delta: 3, reason: '' }]
    } },
    { name: 'with an unsafe ingredient stack', reasonCode: 'world_state_invalid', change: (state: GameState) => { player(state).inventory.wood = Number.MAX_SAFE_INTEGER + 1 } },
    { name: 'with invalid existing milestone metadata', reasonCode: 'world_state_invalid', change: (state: GameState) => {
      state.life.characters[state.activeCharacterId]!.milestones = [{ id: 'broken', at: state.worldTime, text: '' }]
    } },
    { name: 'with unsafe practice experience', reasonCode: 'world_state_invalid', change: (state: GameState) => { player(state).skills.smithing.exp = Number.MAX_SAFE_INTEGER } },
    { name: 'with an unsafe life action counter', reasonCode: 'world_state_invalid', change: (state: GameState) => { state.life.characters[state.activeCharacterId]!.actions.smithing = Number.MAX_SAFE_INTEGER } },
    { name: 'with invalid world time', reasonCode: 'world_state_invalid', change: (state: GameState) => { state.worldTime = Number.POSITIVE_INFINITY } },
    { name: 'after exhausting item ids', reasonCode: 'item_capacity', change: (state: GameState) => { state.reward.nextInstanceId = Number.MAX_SAFE_INTEGER - 1 } },
    { name: 'after exhausting event ids', reasonCode: 'event_capacity', change: (state: GameState) => { state.eventSequence = Number.MAX_SAFE_INTEGER - 1 } },
  ] as const

  it.each(rejectedActions)('rejects $name without changing state, RNG, ids, resources, time, or events', ({ reasonCode, change }) => {
    const state = readyAtStore()
    change(state)
    const before = structuredClone(state)

    const preview = planCraft(state, { recipeId: 'starterSpear' })
    const result = craft(state, { recipeId: 'starterSpear' })

    expect(preview).toMatchObject({ ok: false, reasonCode })
    expect(result).toMatchObject({ ok: false, reasonCode, message: expect.any(String) })
    expect(state).toEqual(before)
  })

  it.each([
    [{ recipeId: 'missingRecipe' }, 'unknown_recipe'],
    [{ recipeId: 'starterSpear', influenceMaterial: 'dragonScale' }, 'invalid_request'],
    [{ recipeId: 'starterSpear', site: 'home' }, 'invalid_request'],
  ] as const)('rejects invalid recipe requests without changing state', (request, reasonCode) => {
    const state = readyAtStore()
    const before = structuredClone(state)
    const result = craft(state, request as never)

    expect(result).toMatchObject({ ok: false, reasonCode })
    expect(state).toEqual(before)
  })
})
