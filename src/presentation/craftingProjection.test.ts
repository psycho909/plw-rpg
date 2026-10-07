import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../data/config'
import { createGame, player } from '../engine/simulation'
import { projectCrafting } from './craftingProjection'

function readyAtStore() {
  const state = createGame(7302)
  const actor = player(state)
  actor.position = { ...BUILDINGS.store.position }
  actor.inventory.wood = 3
  actor.inventory.stone = 2
  state.reward.materials[actor.id] = { wolfFang: 1, wolfHide: 0, moonStone: 1 }
  return state
}

describe('crafting UI projection', () => {
  it('projects neutral crafting and only the influence materials allowed by the recipe', () => {
    const state = readyAtStore(), before = structuredClone(state)
    const projection = projectCrafting(state)

    expect(projection).toMatchObject({
      recipeId: 'starterSpear', recipeName: '木石長矛', outputName: '獵矛',
      outputSlotName: '武器', outputLevel: 2, stationName: '雜貨店',
      opensAtHour: 8, closesAtHour: 18, selectedInfluenceMaterial: null,
    })
    expect(projection.influenceMaterials.map(({ id, owned }) => ({ id, owned }))).toEqual([
      { id: 'wolfFang', owned: 1 }, { id: 'moonStone', owned: 1 },
    ])
    expect(projection.selectedInfluence).toBeNull()
    expect(projection.inputs).toEqual([
      { key: 'inventory:wood', name: '木材', required: 3, current: 3 },
      { key: 'inventory:stone', name: '石材', required: 2, current: 2 },
    ])
    expect(projection.plan).toMatchObject({ ok: true, influenceMaterial: null })
    expect(state).toEqual(before)
  })

  it('projects the selected fang as one owned-material input and describes its exact affix weight changes', () => {
    const state = readyAtStore(), before = structuredClone(state)
    const projection = projectCrafting(state, 'starterSpear', 'wolfFang')

    expect(projection.plan).toMatchObject({ ok: true, influenceMaterial: 'wolfFang' })
    expect(projection.inputs.at(-1)).toEqual({
      key: 'material:wolfFang', name: '狼牙', required: 1, current: 1,
    })
    expect(projection.selectedInfluence?.influenceText).toContain('裂傷 +4、穿透 +2')
    expect(projection.selectedInfluence?.influenceText).toContain('不改變品質權重或稀有度機率')
    expect(state).toEqual(before)
  })

  it('explains that moonstone special chance applies only to legendary weapons and leaves rarity unchanged', () => {
    const projection = projectCrafting(readyAtStore(), 'starterSpear', 'moonStone')

    expect(projection.plan).toMatchObject({ ok: true, influenceMaterial: 'moonStone' })
    expect(projection.inputs.at(-1)).toMatchObject({ key: 'material:moonStone', required: 1, current: 1 })
    expect(projection.selectedInfluence?.influenceText).toContain('銳利 +4')
    expect(projection.selectedInfluence?.influenceText).toContain('若成品為傳說武器，月下獵手特性機率 10% → 25%')
    expect(projection.selectedInfluence?.influenceText).toContain('不提高傳說品質機率')
  })

  it('preserves the engine denial and owned count when the selected influence material is missing', () => {
    const state = readyAtStore()
    state.reward.materials[state.activeCharacterId]!.wolfFang = 0
    const projection = projectCrafting(state, 'starterSpear', 'wolfFang')

    expect(projection.plan.ok).toBe(false)
    if (!projection.plan.ok) expect(projection.plan.reasonCode).toBe('materials_required')
    expect(projection.inputs.at(-1)).toEqual({
      key: 'material:wolfFang', name: '狼牙', required: 1, current: 0,
    })
    expect(projection.selectedInfluence?.owned).toBe(0)
  })

  it('lists all four engine-planned recipes and keeps locked recipes inspectable with their denial', () => {
    const projection = projectCrafting(readyAtStore())

    expect(projection.recipes.map(({ id, name, unlocked }) => ({ id, name, unlocked }))).toEqual([
      { id: 'starterSpear', name: '木石長矛', unlocked: true },
      { id: 'fieldSpear', name: '進階長矛', unlocked: false },
      { id: 'fieldArmor', name: '鎖甲', unlocked: false },
      { id: 'ironShortSword', name: '鐵短劍', unlocked: false },
    ])
    expect(projection.recipes.find(recipe => recipe.id === 'ironShortSword')?.plan.ok).toBe(false)
    expect(projection.recipes.find(recipe => recipe.id === 'ironShortSword')?.plan.message).toBeTruthy()
  })

  it('uses the selected recipe plan for exact costs, station, quality floor, and capped practice', () => {
    const state = readyAtStore()
    const actor = player(state)
    actor.skills.smithing.level = 5
    actor.skills.smithing.exp = 0
    actor.inventory.wood = 4
    actor.inventory.stone = 3
    const projection = projectCrafting(state, 'fieldSpear')

    expect(projection).toMatchObject({
      recipeId: 'fieldSpear', recipeName: '進階長矛', outputName: '獵矛', outputLevel: 3,
      opensAtHour: 8, closesAtHour: 18,
      quality: { floorName: '精良', nextFloorName: null, nextFloorAtSmithing: null },
      practice: { xpAward: 0, capLevel: 5, graduated: true },
    })
    expect(projection.inputs).toEqual([
      { key: 'inventory:wood', name: '木材', required: 4, current: 4 },
      { key: 'inventory:stone', name: '石材', required: 3, current: 3 },
    ])
    expect(projection.plan).toMatchObject({ ok: true, gold: { required: 6 }, stamina: { required: 12 }, durationMinutes: 60 })
    expect(projection.quality.weightsText).toContain('精良 87%')
  })

  it('projects the current recipe material allowlist and preserves the engine denial', () => {
    const armor = projectCrafting(readyAtStore(), 'fieldArmor')
    const sword = projectCrafting(readyAtStore(), 'ironShortSword')

    expect(armor.influenceMaterials.map(material => material.id)).toEqual(['wolfHide'])
    expect(sword.influenceMaterials.map(material => material.id)).toEqual(['wolfFang', 'moonStone'])
    expect(sword.plan.ok).toBe(false)
    expect(sword.plan.message).toBeTruthy()
  })

  it('projects an owned nearby home as the actual basic-recipe site with its planned hours and fee', () => {
    const state = readyAtStore()
    const actor = player(state)
    state.life.properties.push({
      id: `property:home:${actor.id}`, kind: 'home', ownerId: actor.id, acquiredAt: state.worldTime,
      position: { x: 7, y: 10 }, storage: { wood: 0, stone: 0, iron: 0, food: 0, material: 0, potion: 0, sword: 0, armor: 0 },
      foodSupplied: 0, suppliedDay: Math.floor(state.worldTime / 1440), suppliedToday: 0,
    })
    state.settlement.buildings = state.settlement.buildings.filter(building => building !== 'store')
    actor.position = { x: 8, y: 10 }
    state.worldTime = 23 * 60

    const projection = projectCrafting(state, 'starterSpear')

    expect(projection).toMatchObject({
      stationName: '家中工作台', site: 'home', opensAtHour: 0, closesAtHour: 24,
      hasHomeWorkbench: true,
      plan: { ok: true, gold: { required: 3 }, station: { site: 'home', available: true } },
    })
    expect(projection.recipes.find(recipe => recipe.id === 'ironShortSword')?.site).toBe('blacksmith')
  })
})
