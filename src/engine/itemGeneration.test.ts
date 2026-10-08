import { describe, expect, it } from 'vitest'
import { AFFIXES, ITEM_BASES, ITEM_GENERATION_RULES, LOOT_TABLES, MATERIALS, RARITIES } from '../data/rewards'
import type { ItemBaseId } from '../domain/reward'
import { maximumAffixTier, rolledItemStats } from './gearStats'
import { createGame } from './simulation'
import { awardWolfLoot, generateItem, wolfRewardExpectation } from './itemGeneration'
import { deserialize, serialize } from '../services/saveService'

describe('procedural item generation', () => {
  it('defines the boss-exclusive moon fang spear without changing the shared base pool or old weapon rolls', () => {
    expect(Reflect.get(ITEM_BASES, 'moonFangSpear')).toEqual({ id: 'moonFangSpear', name: '月牙獵矛', slot: 'weapon',
      attack: 5, defense: 0, sell: 20, affixes: ['keen', 'piercing', 'bleeding'], penetration: 2 })
    expect(LOOT_TABLES.wolf.weighted.map(entry => entry.baseId)).toEqual(['shortSword', 'axe', 'spear', 'hideArmor', 'chainArmor'])
    expect(rolledItemStats('shortSword', 7, [])).toEqual({ attack: 6, defense: 0, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 })
    expect(rolledItemStats('moonFangSpear', 7, [{ id: 'keen', tier: 1, value: 3 }])).toEqual({
      attack: 7, defense: 0, critical: 3, penetration: 2, bleed: 0, block: 0, reduction: 0,
    })
  })

  it('projects source-specific reward expectations as detached pure data', () => {
    expect(wolfRewardExpectation('grayWolf')).toEqual({
      definitionId: 'grayWolf', rank: 'normal', exclusiveBase: null, dropLevel: 2, gearChance: .65,
      rarityChances: { common: .6, uncommon: .27, rare: .1, epic: .028, legendary: .002 },
      guaranteedMaterials: { wolfFang: 1 }, chanceMaterials: { wolfHide: .25, moonStone: .03 },
    })
    expect(wolfRewardExpectation('scarredWolf')).toEqual({
      definitionId: 'scarredWolf', rank: 'normal', exclusiveBase: null, dropLevel: 3, gearChance: .65,
      rarityChances: { common: .45, uncommon: .35, rare: .16, epic: .036, legendary: .004 },
      guaranteedMaterials: { wolfFang: 1 }, chanceMaterials: { wolfHide: .25, moonStone: .04 },
    })
    expect(wolfRewardExpectation('alphaWolf')).toEqual({
      definitionId: 'alphaWolf', rank: 'elite', exclusiveBase: null, dropLevel: 5, gearChance: 1,
      rarityChances: { common: .2, uncommon: .45, rare: .28, epic: .065, legendary: .005 },
      guaranteedMaterials: { wolfFang: 1 }, chanceMaterials: { wolfHide: .25, moonStone: .08 },
    })
    expect(wolfRewardExpectation('packLeader')).toEqual({
      definitionId: 'packLeader', rank: 'miniBoss', exclusiveBase: null, dropLevel: 7, gearChance: 1,
      rarityChances: { common: 0, uncommon: .35, rare: .5, epic: .14, legendary: .01 },
      guaranteedMaterials: { wolfFang: 1 }, chanceMaterials: { wolfHide: .25, moonStone: .15 },
    })
    expect(wolfRewardExpectation('wolfKing')).toEqual({
      definitionId: 'wolfKing', rank: 'boss', exclusiveBase: 'moonFangSpear', dropLevel: 7, gearChance: 1,
      rarityChances: { common: 0, uncommon: 0, rare: .85, epic: .14, legendary: .01 },
      guaranteedMaterials: { wolfFang: 1, moonStone: 1 }, chanceMaterials: { wolfHide: .25 },
    })

    const first = wolfRewardExpectation('alphaWolf')
    first.rarityChances.rare = 0
    expect(wolfRewardExpectation('alphaWolf').rarityChances.rare).toBe(.28)
  })

  it('returns a deterministic unique instance without awarding it to the reward state', () => {
    const first = createGame(442), second = createGame(442)
    const beforeRng = first.rngState

    const left = generateItem(first, { baseId: 'shortSword', level: 1 })
    const right = generateItem(second, { baseId: 'shortSword', level: 1 })

    expect(left).toEqual(right)
    expect(left.instanceId).toBe('item-1')
    expect(left.ownerId).toBe(first.activeCharacterId)
    expect(first.reward.instances).toEqual([])
    expect(first.reward.nextInstanceId).toBe(2)
    expect(first.rngState).not.toBe(beforeRng)
  })

  it('keeps the legacy generation stream and rolled stats fixed', () => {
    const state = createGame(442)
    const item = generateItem(state, { baseId: 'shortSword', level: 1 })

    expect(item.rarity).toBe('epic')
    expect(item.affixes).toEqual([{ id: 'striking', tier: 1, value: 1 }, { id: 'keen', tier: 1, value: 3 }, { id: 'bleeding', tier: 1, value: 1 }])
    expect(item.rolledStats).toEqual({ attack: 5, defense: 0, critical: 3, penetration: 0, bleed: 1, block: 0, reduction: 0 })
    expect(state.rngState).toBe(2063202094)
    expect(state.reward.nextInstanceId).toBe(2)
  })

  it('adds recipe provenance through the shared generator without changing its legacy rolls', () => {
    const legacy = createGame(442), crafted = createGame(442)
    const expectedRoll = generateItem(legacy, { baseId: 'spear', level: 2 })
    const generateWithContext = generateItem as unknown as (state: typeof crafted, options: unknown) => ReturnType<typeof generateItem>
    const item = generateWithContext(crafted, {
      baseId: 'spear', level: 2, context: { kind: 'craft', recipeId: 'starterSpear' },
    })

    expect(item.craftProvenance).toEqual({ recipeId: 'starterSpear', createdBy: crafted.activeCharacterId,
      createdAt: crafted.worldTime, influenceMaterial: null, masterpiece: false })
    expect(item.rarity).toBe(expectedRoll.rarity)
    expect(item.affixes).toEqual(expectedRoll.affixes)
    expect(item.rolledStats).toEqual(expectedRoll.rolledStats)
    expect(crafted.rngState).toBe(legacy.rngState)
    expect(crafted.reward.nextInstanceId).toBe(legacy.reward.nextInstanceId)
  })

  it('rejects invalid craft context before changing RNG or item identity sequence', () => {
    const invalidContexts = [
      { kind: 'craft', recipeId: 'missing' },
      { kind: 'other', recipeId: 'starterSpear' },
      { kind: 'craft', recipeId: 'starterSpear', forged: true },
    ]
    for (const context of invalidContexts) {
      const state = createGame(442), before = structuredClone(state)
      const generateWithContext = generateItem as unknown as (state: ReturnType<typeof createGame>, options: unknown) => unknown
      expect(() => generateWithContext(state, { baseId: 'spear', level: 2, context })).toThrow()
      expect(state).toEqual(before)
    }
  })

  it('rejects a locked or output-mismatched recipe context before changing RNG or item identity sequence', () => {
    const locked = createGame(442)
    const beforeLocked = structuredClone(locked)
    const generateWithContext = generateItem as unknown as (state: typeof locked, options: unknown) => unknown
    expect(() => generateWithContext(locked, {
      baseId: 'spear', level: 3, context: { kind: 'craft', recipeId: 'fieldSpear' },
    })).toThrow()
    expect(locked).toEqual(beforeLocked)

    const mismatch = createGame(442)
    mismatch.characters.find(character => character.id === mismatch.activeCharacterId)!.skills.smithing.level = 2
    const beforeMismatch = structuredClone(mismatch)
    expect(() => generateWithContext(mismatch, {
      baseId: 'shortSword', level: 6, context: { kind: 'craft', recipeId: 'fieldSpear' },
    })).toThrow()
    expect(mismatch).toEqual(beforeMismatch)
  })

  it.each([
    { baseId: 'missing', level: 1 },
    { baseId: 'shortSword', level: 0 },
    { baseId: 'shortSword', level: 101 },
    { baseId: 'shortSword', level: 1, material: 'iron' },
    { baseId: 'shortSword', level: 1, bossSource: 'grayWolf' },
    { baseId: 'shortSword', level: 7, dropSource: 'missing' },
    { baseId: 'shortSword', level: 7, dropSource: 'alphaWolf', bossSource: 'wolfKing' },
  ])('rejects invalid input before consuming state: %o', input => {
    const state = createGame(713), before = structuredClone(state)
    expect(() => generateItem(state, input as unknown as Parameters<typeof generateItem>[1])).toThrow()
    expect(state).toEqual(before)
  })

  it('keeps affixes eligible, unique, rarity-sized, level-bounded and stat-exact', () => {
    const state = createGame(9981), bases = Object.keys(ITEM_BASES) as ItemBaseId[], ids = new Set<string>()
    for (let index = 0; index < 1200; index++) {
      const baseId = bases[index % bases.length]!, level = 1 + index % 50
      const item = generateItem(state, { baseId, level, material: index % 2 ? 'wolfFang' : 'wolfHide' })
      ids.add(item.instanceId)
      const allowed = ITEM_BASES[baseId].affixes
      expect(new Set(item.affixes.map(affix => affix.id)).size).toBe(item.affixes.length)
      expect(item.affixes).toHaveLength(Math.min(RARITIES[item.rarity].affixCount,
        allowed.filter(id => AFFIXES[id]!.slots.includes(ITEM_BASES[baseId].slot)).length))
      for (const affix of item.affixes) {
        expect(allowed).toContain(affix.id)
        expect(affix.tier).toBeLessThanOrEqual(AFFIXES[affix.id].tiers.length)
        expect(affix.value).toBe(AFFIXES[affix.id].tiers[affix.tier - 1])
        expect(affix.tier).toBeLessThanOrEqual(maximumAffixTier(level, item.rarity))
      }
      expect(item.rolledStats).toEqual(rolledItemStats(baseId, level, item.affixes))
      expect(item.specialTrait === null || (item.rarity === 'legendary' && ITEM_BASES[baseId].slot === 'weapon' && item.specialTrait === 'moonHunter')).toBe(true)
      expect(item.provenance === null || item.rarity === 'legendary').toBe(true)
      if (item.provenance) expect(item.provenance.createdBy).toBeNull()
    }
    expect(state.reward.instances).toEqual([])
    expect(state.reward.nextInstanceId).toBe(1201)
    expect(ids.size).toBe(1200)
  })

  it('biases wolf fang rolls toward bleed or penetration affixes', () => {
    const plain = createGame(44), fang = createGame(44)
    let plainAffinity = 0, fangAffinity = 0
    for (let index = 0; index < 1500; index++) {
      plainAffinity += generateItem(plain, { baseId: 'shortSword', level: 10 }).affixes.filter(a => a.id === 'bleeding' || a.id === 'piercing').length
      fangAffinity += generateItem(fang, { baseId: 'shortSword', level: 10, material: 'wolfFang' }).affixes.filter(a => a.id === 'bleeding' || a.id === 'piercing').length
    }
    expect(fangAffinity).toBeGreaterThan(plainAffinity)
    expect(MATERIALS.wolfFang.bias).toMatchObject({ bleeding: 4, piercing: 2 })
  })

  it('biases the starter spear affixes without changing its rarity pool', () => {
    const plain = createGame(7301), fang = createGame(7301), moon = createGame(7301)
    const plainRarities: string[] = [], fangRarities: string[] = [], moonRarities: string[] = []
    let plainTargetAffixes = 0, fangTargetAffixes = 0, plainKeenAffixes = 0, moonKeenAffixes = 0
    for (let index = 0; index < 1500; index++) {
      const neutralItem = generateItem(plain, { baseId: 'spear', level: 2, context: { kind: 'craft', recipeId: 'starterSpear' } })
      const fangItem = generateItem(fang, { baseId: 'spear', level: 2, material: 'wolfFang', context: { kind: 'craft', recipeId: 'starterSpear' } })
      const moonItem = generateItem(moon, { baseId: 'spear', level: 2, material: 'moonStone', context: { kind: 'craft', recipeId: 'starterSpear' } })
      plainRarities.push(neutralItem.rarity)
      fangRarities.push(fangItem.rarity)
      moonRarities.push(moonItem.rarity)
      plainTargetAffixes += neutralItem.affixes.filter(affix => affix.id === 'bleeding' || affix.id === 'piercing').length
      fangTargetAffixes += fangItem.affixes.filter(affix => affix.id === 'bleeding' || affix.id === 'piercing').length
      plainKeenAffixes += neutralItem.affixes.filter(affix => affix.id === 'keen').length
      moonKeenAffixes += moonItem.affixes.filter(affix => affix.id === 'keen').length
    }
    expect(fangRarities).toEqual(plainRarities)
    expect(moonRarities).toEqual(plainRarities)
    expect(fangTargetAffixes).toBeGreaterThan(plainTargetAffixes)
    expect(moonKeenAffixes).toBeGreaterThan(plainKeenAffixes)
    expect(MATERIALS.wolfFang.bias).toEqual({ bleeding: 4, piercing: 2 })
    expect(MATERIALS.moonStone.bias).toEqual({ keen: 4 })
    expect(ITEM_GENERATION_RULES.legendaryWeaponSpecialChance).toBe(.1)
    expect(MATERIALS.moonStone.specialBonus).toBe(.15)
    expect(ITEM_GENERATION_RULES.legendaryWeaponSpecialChance + MATERIALS.moonStone.specialBonus).toBe(.25)
  })

  it('uses the rare-plus boss rarity pool and preserves generated rolls across save and reload', () => {
    const state = createGame(81), counts = { rare: 0, epic: 0, legendary: 0 }
    const savedItem = generateItem(state, { baseId: 'shortSword', level: 7, bossSource: 'wolfKing' })
    expect(savedItem.baseId).toBe('shortSword')
    state.reward.instances.push(savedItem)
    for (let index = 0; index < 2000; index++) {
      const item = generateItem(state, { baseId: 'spear', level: 7, bossSource: 'wolfKing' })
      counts[item.rarity as keyof typeof counts]++
      if (item.rarity === 'legendary') expect(item.provenance?.createdBy).toBeNull()
    }
    expect(counts.rare).toBeGreaterThan(counts.epic)
    expect(counts.epic).toBeGreaterThan(counts.legendary)
    expect(deserialize(serialize(state, 0)).state.reward.instances[0]).toEqual(savedItem)
    expect(state.reward.instances).toHaveLength(1)
  })

  it('uses source-qualified rarity pools while keeping every roll valid for its level and rarity', () => {
    const state = createGame(2038)
    const generated = Array.from({ length: 40 }, () => generateItem(state, {
      baseId: 'shortSword', level: 7, dropSource: 'packLeader',
    }))

    expect(generated.every(item => item.rarity !== 'common')).toBe(true)
    for (const item of generated) {
      expect(item.affixes).toHaveLength(RARITIES[item.rarity].affixCount)
      for (const affix of item.affixes) {
        expect(affix.tier).toBeLessThanOrEqual(maximumAffixTier(item.level, item.rarity))
        expect(affix.value).toBe(AFFIXES[affix.id].tiers[affix.tier - 1])
      }
      expect(item.rolledStats).toEqual(rolledItemStats(item.baseId, item.level, item.affixes))
    }
    expect(state.reward.instances).toEqual([])
  })
})

describe('wolf loot awards', () => {
  it('marks only the first award of an equipment base as a new discovery without changing loot state or RNG', () => {
    const state = createGame(48042), replay = createGame(48042)
    const first = awardWolfLoot(state, { definitionId: 'wolfKing' })
    awardWolfLoot(replay, { definitionId: 'wolfKing' })
    const firstItemEvent = state.events.filter(event => event.type === 'loot.item').at(-1)!

    expect(first.instance?.baseId).toBe('moonFangSpear')
    expect(firstItemEvent.message).toBe(`新發現：獲得${RARITIES[first.instance!.rarity].name}${ITEM_BASES[first.instance!.baseId].name}。`)
    expect(state.rngState).toBe(replay.rngState)
    expect(state.reward).toEqual(replay.reward)

    const second = awardWolfLoot(state, { definitionId: 'wolfKing' })
    const secondItemEvent = state.events.filter(event => event.type === 'loot.item').at(-1)!
    expect(second.instance?.baseId).toBe(first.instance?.baseId)
    expect(secondItemEvent.message).toBe(`獲得${RARITIES[second.instance!.rarity].name}${ITEM_BASES[second.instance!.baseId].name}。`)
    expect(secondItemEvent.message).not.toContain('新發現')
    expect(Object.keys(state.reward).sort()).toEqual(['bossForms', 'collection', 'equipped', 'instances', 'materials', 'nextInstanceId', 'schemaVersion', 'wolfBossDefeatedAt', 'wolfBossForm'].sort())
    expect(deserialize(serialize(state)).state.reward).toEqual(state.reward)
  })

  it('awards the moon fang spear only for the boss and round-trips its intrinsic penetration through strict save validation', () => {
    const boss = createGame(48042)
    const loot = awardWolfLoot(boss, { definitionId: 'wolfKing' })
    const item = loot.instance!

    expect(item.baseId).toBe('moonFangSpear')
    expect(item.material).toBe('moonStone')
    expect(item.rolledStats).toEqual(rolledItemStats('moonFangSpear', 7, item.affixes))
    expect(item.rolledStats.penetration).toBeGreaterThanOrEqual(2)
    expect(loot.materials).toMatchObject({ wolfFang: 1, moonStone: 1 })
    expect(deserialize(serialize(boss)).state).toEqual(boss)

    const alpha = createGame(48043), alphaLoot = awardWolfLoot(alpha, { definitionId: 'alphaWolf' })
    const packLeader = createGame(48044), packLoot = awardWolfLoot(packLeader, { definitionId: 'packLeader' })
    expect(alphaLoot.instance?.baseId).not.toBe('moonFangSpear')
    expect(packLoot.instance?.baseId).not.toBe('moonFangSpear')
  })

  it('rejects the boss-exclusive base for a non-boss source before consuming RNG', () => {
    const state = createGame(48045), before = structuredClone(state)
    expect(() => generateItem(state, { baseId: 'moonFangSpear', level: 7, dropSource: 'alphaWolf' })).toThrow()
    expect(state).toEqual(before)
  })

  it('uses approved new drop levels and keeps their generated stats reloadable', () => {
    for (const [seed, definitionId, dropLevel] of [
      [801, 'alphaWolf', 5],
      [802, 'packLeader', 7],
      [803, 'wolfKing', 7],
    ] as const) {
      const state = createGame(seed)
      const loot = awardWolfLoot(state, { definitionId })
      const item = loot.instance!

      expect(item).toBeDefined()
      expect(item.level).toBe(dropLevel)
      expect(item.rolledStats).toEqual(rolledItemStats(item.baseId, dropLevel, item.affixes))
      for (const affix of item.affixes) {
        expect(affix.tier).toBeLessThanOrEqual(maximumAffixTier(dropLevel, item.rarity))
        expect(affix.value).toBe(AFFIXES[affix.id].tiers[affix.tier - 1])
      }
      expect(deserialize(serialize(state)).state.reward.instances).toEqual(state.reward.instances)
    }
  })

  it('awards guaranteed family materials and an instance for elite and boss kills', () => {
    const elite = createGame(301), boss = createGame(302)
    const eliteLoot = awardWolfLoot(elite, { definitionId: 'alphaWolf' })
    const bossLoot = awardWolfLoot(boss, { definitionId: 'wolfKing' })

    expect(eliteLoot.instance).not.toBeNull()
    expect(eliteLoot.materials.wolfFang).toBe(1)
    expect(elite.reward.materials[elite.activeCharacterId]?.wolfFang).toBe(1)
    expect(elite.reward.instances).toContainEqual(eliteLoot.instance)
    expect(bossLoot.instance?.rarity).toMatch(/^(rare|epic|legendary)$/)
    expect(bossLoot.instance?.material).toBe('moonStone')
    expect(bossLoot.instance?.provenance === null || bossLoot.instance?.provenance?.bossSource === 'wolfKing').toBe(true)
    expect(bossLoot.materials).toMatchObject({ wolfFang: 1, moonStone: 1 })
    expect(boss.reward.collection.bosses).toEqual(['wolfKing'])
    expect(boss.reward.wolfBossDefeatedAt).toBe(boss.worldTime)
    expect(boss.events.some(event => event.type === 'loot.item')).toBe(true)
    expect(boss.events.some(event => event.type === 'loot.material')).toBe(true)
  })

  it('uses a deterministic seeded normal gear chance and weighted base table', () => {
    const first = createGame(564), second = createGame(564)
    let drops = 0
    for (let index = 0; index < 800; index++) {
      const left = awardWolfLoot(first, { definitionId: 'grayWolf' })
      const right = awardWolfLoot(second, { definitionId: 'grayWolf' })
      expect(left).toEqual(right)
      if (left.instance) drops++
    }
    expect(drops).toBeGreaterThan(470)
    expect(drops).toBeLessThan(570)
    expect(first.reward.instances).toHaveLength(drops)
    expect(new Set(first.reward.instances.map(item => item.instanceId)).size).toBe(drops)
  })

  it('biases armor drops with wolf hide and weapon drops with wolf fang', () => {
    const state = createGame(605), slots = new Set<string>()
    for (let index = 0; index < 24; index++) {
      const loot = awardWolfLoot(state, { definitionId: 'alphaWolf' })
      expect(loot.instance).not.toBeNull()
      const item = loot.instance!
      const slot = ITEM_BASES[item.baseId].slot
      slots.add(slot)
      expect(item.material).toBe(slot === 'armor' ? 'wolfHide' : 'wolfFang')
    }
    expect(slots).toEqual(new Set(['weapon', 'armor']))
  })

  it('rejects unsafe material capacity and item sequence before any reward mutation or RNG draw', () => {
    const fullStack = createGame(712), ownerId = fullStack.activeCharacterId
    fullStack.reward.materials[ownerId] = { wolfFang: Number.MAX_SAFE_INTEGER, wolfHide: 0, moonStone: 0 }
    const beforeFullStack = structuredClone(fullStack)
    expect(() => awardWolfLoot(fullStack, { definitionId: 'grayWolf' })).toThrow()
    expect(fullStack).toEqual(beforeFullStack)

    const exhaustedSequence = createGame(713)
    exhaustedSequence.reward.nextInstanceId = Number.MAX_SAFE_INTEGER - 1
    const beforeSequence = structuredClone(exhaustedSequence)
    expect(() => awardWolfLoot(exhaustedSequence, { definitionId: 'alphaWolf' })).toThrow()
    expect(exhaustedSequence).toEqual(beforeSequence)
  })

  it('rejects unknown definitions without changing state', () => {
    const state = createGame(714), before = structuredClone(state)
    expect(() => awardWolfLoot(state, { definitionId: 'goblin' as never })).toThrow()
    expect(state).toEqual(before)
  })
})
