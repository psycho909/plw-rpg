import { describe, expect, it } from 'vitest'
import { AFFIXES, ITEM_BASES, MATERIALS, RARITIES } from '../data/rewards'
import type { ItemBaseId } from '../domain/reward'
import { maximumAffixTier, rolledItemStats } from './gearStats'
import { createGame } from './simulation'
import { awardWolfLoot, generateItem } from './itemGeneration'
import { deserialize, serialize } from '../services/saveService'

describe('procedural item generation', () => {
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

  it.each([
    { baseId: 'missing', level: 1 },
    { baseId: 'shortSword', level: 0 },
    { baseId: 'shortSword', level: 101 },
    { baseId: 'shortSword', level: 1, material: 'iron' },
    { baseId: 'shortSword', level: 1, bossSource: 'grayWolf' },
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
      expect(item.affixes).toHaveLength(RARITIES[item.rarity].affixCount)
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

  it('uses the rare-plus boss rarity pool and preserves generated rolls across save and reload', () => {
    const state = createGame(81), counts = { rare: 0, epic: 0, legendary: 0 }
    const savedItem = generateItem(state, { baseId: 'shortSword', level: 7, bossSource: 'wolfKing' })
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
})

describe('wolf loot awards', () => {
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
