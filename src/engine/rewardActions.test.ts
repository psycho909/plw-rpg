import { describe, expect, it } from 'vitest'
import { BUILDINGS, ITEMS } from '../data/config'
import { CRAFTING_RECIPES, LEGACY_CRAFTING_RECIPES } from '../data/crafting'
import { ITEM_BASES, MATERIALS, RARITIES } from '../data/rewards'
import type { ItemInstance, MaterialId } from '../domain/reward'
import { equip } from './actions'
import { createGame, player } from './simulation'
import { equippedInstance, equipInstance, itemSellPrice, sellInstance, tradeMaterial } from './rewardActions'

function instance(instanceId: string, ownerId: string, slot: 'weapon' | 'armor' = 'weapon'): ItemInstance {
  const armor = slot === 'armor'
  return {
    instanceId, ownerId, baseId: armor ? 'hideArmor' : 'shortSword', level: 1, material: null, rarity: 'common',
    rolledStats: { attack: armor ? 0 : 4, defense: armor ? 2 : 0, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 },
    affixes: [], specialTrait: null, provenance: null, craftProvenance: null,
  }
}

function atSmith(state: ReturnType<typeof createGame>) {
  const character = player(state)
  if (!state.settlement.buildings.includes('blacksmith')) state.settlement.buildings.push('blacksmith')
  character.position = { ...BUILDINGS.blacksmith.position }
  state.worldTime = 10 * 60
  return character
}

function atStore(state: ReturnType<typeof createGame>) {
  const character = player(state)
  character.position = { ...BUILDINGS.store.position }
  state.worldTime = 10 * 60
  return character
}

describe('procedural equipment actions', () => {
  it('equips by active owner, clears legacy gear in that slot and supports unequipping', () => {
    const state = createGame(), character = player(state), weapon = instance('item-1', character.id), armor = instance('item-2', character.id, 'armor')
    state.reward.instances.push(weapon, armor)
    character.equipment.weapon = 'sword'
    character.equipment.armor = 'armor'

    expect(equipInstance(state, weapon.instanceId)).toBe('')
    expect(equippedInstance(state, 'weapon')).toEqual(weapon)
    expect(character.equipment.weapon).toBeNull()
    expect(state.reward.equipped[character.id]).toEqual({ weapon: 'item-1', armor: null })
    expect(equipInstance(state, armor.instanceId)).toBe('')
    expect(character.equipment.armor).toBeNull()
    expect(equipInstance(state, weapon.instanceId)).toBe('')
    expect(equippedInstance(state, 'weapon')).toBeUndefined()
    expect(state.reward.instances).toHaveLength(2)
  })

  it('clears a procedural reference when legacy equipment is equipped', () => {
    const state = createGame(), character = player(state), weapon = instance('item-1', character.id)
    state.reward.instances.push(weapon)
    state.reward.equipped[character.id] = { weapon: weapon.instanceId, armor: null }
    character.inventory.sword = 1

    expect(equip(state, 'sword')).toBe('')
    expect(state.reward.equipped[character.id]).toEqual({ weapon: null, armor: null })
    expect(character.equipment.weapon).toBe('sword')
    expect(state.reward.instances).toContainEqual(weapon)
  })

  it.each(['missing', 'foreign', 'combat', 'dead'] as const)('rejects %s equipment changes without mutation', kind => {
    const state = createGame(), character = player(state), item = instance('item-1', kind === 'foreign' ? 'someone-else' : character.id)
    state.reward.instances.push(item)
    if (kind === 'combat') state.combat = { monsterId: 'wolf', hp: 1, maxHp: 1, attack: 1, defense: 0, exp: 0, gold: 0, elite: false, dungeon: false }
    if (kind === 'dead') character.isAlive = false
    const target = kind === 'missing' ? 'item-99' : item.instanceId
    const before = structuredClone(state)
    expect(equipInstance(state, target)).not.toBe('')
    expect(state).toEqual(before)
  })

  it('never sums legacy and procedural gear and resolves an owner-specific equipped instance', () => {
    const state = createGame(), character = player(state), item = instance('item-1', character.id)
    state.reward.instances.push(item)
    state.reward.equipped[character.id] = { weapon: item.instanceId, armor: null }
    character.equipment.weapon = 'sword'
    expect(equippedInstance(state, 'weapon', character.id)).toEqual(item)
  })
})

describe('procedural equipment sales', () => {
  it.each([
    ['common', 12], ['uncommon', 18], ['rare', 24], ['epic', 36], ['legendary', 60],
  ] as const)('preserves the legacy %s sale price exactly', (rarity, expected) => {
    const item = { ...instance('legacy', 'owner'), rarity, craftProvenance: null } satisfies ItemInstance
    expect(itemSellPrice(item)).toBe(expected)
  })

  it('adds exactly two gold when the same eligible Rare short sword is a Masterpiece', () => {
    const crafted: ItemInstance = {
      ...instance('crafted', 'owner'), rarity: 'rare', baseId: 'shortSword',
      affixes: [
        { id: 'striking', tier: 2, value: 2 },
        { id: 'keen', tier: 3, value: 10 },
      ],
      craftProvenance: { recipeId: 'ironShortSword', createdBy: 'owner', createdAt: 0, influenceMaterial: null, masterpiece: false },
    }
    const masterpiece = structuredClone(crafted)
    masterpiece.craftProvenance!.masterpiece = true

    expect(itemSellPrice(crafted)).toBe(25)
    expect(itemSellPrice(masterpiece)).toBe(itemSellPrice(crafted) + 2)
  })

  it('bounds affix and Masterpiece premium independently and caps their combined value', () => {
    const item: ItemInstance = {
      ...instance('crafted', 'owner', 'armor'), rarity: 'legendary', baseId: 'chainArmor',
      affixes: [
        { id: 'sturdy', tier: 3, value: 3 },
        { id: 'blocking', tier: 3, value: 12 },
        { id: 'warding', tier: 3, value: 9 },
      ],
      craftProvenance: { recipeId: 'fieldArmor', createdBy: 'owner', createdAt: 0, influenceMaterial: null, masterpiece: false },
    }
    const ordinaryCraftPrice = itemSellPrice(item)
    item.craftProvenance!.masterpiece = true
    const masterpiecePrice = itemSellPrice(item)
    const base = ITEM_BASES[item.baseId].sell
    const legacyRarityPrice = Math.floor(base * 5)
    const maximumPremium = Math.floor(base * 0.25)

    expect(ordinaryCraftPrice - legacyRarityPrice).toBe(Math.floor(base * 0.15))
    expect(masterpiecePrice - ordinaryCraftPrice).toBe(2)
    expect(masterpiecePrice - legacyRarityPrice).toBeLessThanOrEqual(maximumPremium)
  })

  it('keeps the approved legacy recipe sale bounds unchanged', () => {
    const rarityMultiplier = { common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5 } as const
    for (const recipe of Object.values(LEGACY_CRAFTING_RECIPES)) {
      const base = ITEM_BASES[recipe.outputBase].sell
      const weights = Object.fromEntries(Object.entries(RARITIES).map(([id, rarity]) => [id, rarity.weight])) as Record<keyof typeof RARITIES, number>
      const rarityIds = Object.keys(RARITIES) as (keyof typeof RARITIES)[]
      const floorIndex = rarityIds.indexOf(recipe.qualityRules.minimumRarity)
      for (let index = 0; index < floorIndex; index++) {
        weights[recipe.qualityRules.minimumRarity] += weights[rarityIds[index]!]!
        weights[rarityIds[index]!] = 0
      }
      const expectedMultiplier = Object.entries(weights).reduce((sum, [rarity, weight]) => sum + weight * rarityMultiplier[rarity as keyof typeof RARITIES], 0) / 100
      const expectedAtMaximumPremium = base * expectedMultiplier + Math.floor(base * 0.25)
      const boughtInputCost = recipe.inputs.reduce((sum, input) => {
        if (input.source === 'material') return sum + MATERIALS[input.materialId].sell * input.amount
        const unitPrice = Math.ceil(ITEMS[input.itemId].price * 0.8)
        return sum + unitPrice * input.amount
      }, 0) + recipe.goldCost - (recipe.station === 'store' ? 1 : 0)
      const modes = [null, ...recipe.allowedBiasMaterials]
      for (const material of modes) {
        const materialOpportunityCost = material ? MATERIALS[material].sell : 0
        expect(expectedAtMaximumPremium, `${recipe.id} with influence material ${material ?? 'none'}`)
          .toBeLessThan(boughtInputCost + materialOpportunityCost)
      }
    }
  })

  it('rejects profitable repeatable purchase-to-craft-to-sale cycles', () => {
    const rarityMultiplier = { common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5 } as const
    // Material trading is sell-only today. Add a material ID and its actual repeatable buy price here
    // only when a material shop exposes it; earned-only drops do not close a purchase cycle.
    const materialShopBuyPrice: Partial<Record<MaterialId, number>> = {}
    const maximumDiscountedPrice = (itemId: keyof typeof ITEMS) => Math.ceil(ITEMS[itemId].price * 0.8)

    const cycles = Object.values(CRAFTING_RECIPES).flatMap(recipe => {
      const inputCost = recipe.inputs.reduce<number | null>((sum, input) => {
        if (sum === null) return null
        if (input.source === 'inventory') {
          if (!Object.hasOwn(ITEMS, input.itemId)) return null
          return sum + maximumDiscountedPrice(input.itemId) * input.amount
        }
        const price = materialShopBuyPrice[input.materialId]
        return price === undefined ? null : sum + price * input.amount
      }, 0)
      if (inputCost === null) return []

      const buyableBiases = recipe.allowedBiasMaterials.filter(material => materialShopBuyPrice[material] !== undefined)
      return [null, ...buyableBiases].map(influenceMaterial => ({ recipe, inputCost, influenceMaterial }))
    })
    expect(cycles.length).toBeGreaterThan(0)

    for (const { recipe, inputCost, influenceMaterial } of cycles) {
      const base = ITEM_BASES[recipe.outputBase].sell
      const weights = Object.fromEntries(Object.entries(RARITIES).map(([id, rarity]) => [id, rarity.weight])) as Record<keyof typeof RARITIES, number>
      const rarityIds = Object.keys(RARITIES) as (keyof typeof RARITIES)[]
      const floorIndex = rarityIds.indexOf(recipe.qualityRules.minimumRarity)
      for (let index = 0; index < floorIndex; index++) {
        weights[recipe.qualityRules.minimumRarity] += weights[rarityIds[index]!]!
        weights[rarityIds[index]!] = 0
      }
      const expectedMultiplier = Object.entries(weights).reduce((sum, [rarity, weight]) => sum + weight * rarityMultiplier[rarity as keyof typeof RARITIES], 0) / 100
      const expectedAtMaximumPremium = base * expectedMultiplier + Math.floor(base * 0.25)
      const purchasedBiasCost = influenceMaterial === null ? 0 : materialShopBuyPrice[influenceMaterial]!
      const minimumCraftFee = recipe.station === 'store' ? Math.max(3, recipe.goldCost - 1) : recipe.goldCost
      const replacementCost = inputCost + purchasedBiasCost + minimumCraftFee

      expect(expectedAtMaximumPremium, `${recipe.id} with purchasable influence material ${influenceMaterial ?? 'none'}`)
        .toBeLessThan(replacementCost)
    }
  })

  it('sells owned un-equipped gear at the smith for its rarity-adjusted price and records the trade', () => {
    const state = createGame(), character = atSmith(state), item: ItemInstance = {
      ...instance('item-1', player(state).id), rarity: 'rare',
      affixes: [{ id: 'striking', tier: 1, value: 1 }],
      craftProvenance: { recipeId: 'ironShortSword', createdBy: character.id, createdAt: state.worldTime, influenceMaterial: null, masterpiece: false },
    }
    state.reward.instances.push(item)
    const price = itemSellPrice(item), startingGold = character.gold, startingTime = state.worldTime

    expect(price).toBeGreaterThan(0)
    expect(sellInstance(state, item.instanceId)).toBe('')
    expect(character.gold).toBe(startingGold + price)
    expect(state.worldTime).toBe(startingTime + 5)
    expect(state.reward.instances).toEqual([])
    expect(state.life.director.lastPlayerActivity).toBe(state.worldTime)
    expect(state.events.some(event => event.type === 'player.traded')).toBe(true)
  })

  it.each(['equipped', 'foreign', 'missing', 'closed-shop', 'unsafe-gold'] as const)('blocks %s sales without consuming an instance', kind => {
    const state = createGame(), character = atSmith(state), item = instance('item-1', kind === 'foreign' ? 'someone-else' : player(state).id)
    state.reward.instances.push(item)
    if (kind === 'equipped') state.reward.equipped[character.id] = { weapon: item.instanceId, armor: null }
    if (kind === 'closed-shop') state.worldTime = 19 * 60
    if (kind === 'unsafe-gold') character.gold = Number.MAX_SAFE_INTEGER
    const target = kind === 'missing' ? 'item-99' : item.instanceId
    const before = structuredClone(state)
    expect(sellInstance(state, target)).not.toBe('')
    expect(state).toEqual(before)
  })

  it('sells one owned material through the store with a safe payout and five-minute activity event', () => {
    const state = createGame(), character = atStore(state), material: MaterialId = 'wolfFang'
    state.reward.materials[character.id] = { wolfFang: 2, wolfHide: 0, moonStone: 0 }
    const startingGold = character.gold, startingTime = state.worldTime
    expect(tradeMaterial(state, material)).toBe('')
    expect(state.reward.materials[character.id]!.wolfFang).toBe(1)
    expect(character.gold).toBe(startingGold + MATERIALS[material].sell)
    expect(state.worldTime).toBe(startingTime + 5)
    expect(state.events.some(event => event.type === 'player.traded')).toBe(true)
  })

  it('rejects absent materials and payouts that would exceed safe gold', () => {
    const absent = createGame(); atStore(absent)
    const beforeAbsent = structuredClone(absent)
    expect(tradeMaterial(absent, 'wolfFang')).not.toBe('')
    expect(absent).toEqual(beforeAbsent)

    const overflow = createGame(), overflowCharacter = atStore(overflow)
    overflow.reward.materials[overflowCharacter.id] = { wolfFang: 1, wolfHide: 0, moonStone: 0 }
    overflowCharacter.gold = Number.MAX_SAFE_INTEGER - MATERIALS.wolfFang.sell + 1
    const beforeOverflow = structuredClone(overflow)
    expect(tradeMaterial(overflow, 'wolfFang')).not.toBe('')
    expect(overflow).toEqual(beforeOverflow)
  })

  it('does not sell materials at the blacksmith when the store is unavailable', () => {
    const state = createGame(), character = atSmith(state)
    state.settlement.buildings = state.settlement.buildings.filter(building => building !== 'store')
    state.reward.materials[character.id] = { wolfFang: 1, wolfHide: 0, moonStone: 0 }
    const before = structuredClone(state)
    expect(tradeMaterial(state, 'wolfFang')).not.toBe('')
    expect(state).toEqual(before)
  })
})
