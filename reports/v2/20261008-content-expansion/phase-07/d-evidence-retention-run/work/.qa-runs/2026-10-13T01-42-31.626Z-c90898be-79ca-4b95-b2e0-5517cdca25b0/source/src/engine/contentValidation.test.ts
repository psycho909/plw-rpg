import { describe, expect, it } from 'vitest'
import { validateContentPack } from './contentValidation'
import type { ContentBaselineIds, ContentPack } from '../domain/content'

const baseline: ContentBaselineIds = {
  familyIds: [], monsterIds: [], bossVariantIds: [], lootTableIds: [], equipmentIds: [], materialIds: [],
  cropIds: [], recipeIds: [], affixIds: [], baselineAffixSlots: [], excludedLegacyMonsterIds: [],
  excludedLegacyItemIds: [], excludedProceduralIds: [],
}

const pack: ContentPack = {
  families: [{ id: 'bog-beasts', name: { 'zh-TW': '沼澤獸' }, description: { 'zh-TW': '居於沼澤' },
    regions: ['forest'], spawnProfiles: [{ region: 'forest', minPlayerLevel: 2, seasons: ['夏'] }],
    monsterIds: ['mire-hunter', 'marsh-stalker'], eliteIds: [], miniBossIds: [], bossIds: [],
    lootTableId: 'bog-loot', threatChannel: 'regional_ecology' }],
  monsters: [
    { id: 'mire-hunter', name: { 'zh-TW': '泥沼獵手' }, description: { 'zh-TW': '伏擊旅人' },
      familyId: 'bog-beasts', rank: 'normal', level: 3,
      stats: { hp: 30, attack: 8, defense: 2, exp: 20, gold: 5 }, role: 'fast',
      mechanics: [{ kind: 'rush', everyTurns: 3, bonusFraction: 0.2, telegraph: { 'zh-TW': '牠蓄力準備突襲。' } }],
      lootTableId: 'bog-loot', lootProfile: { dropLevel: 3, equipmentChance: 0.5,
        rarityWeights: { common: 1, uncommon: 0, rare: 0, epic: 0, legendary: 0 } } },
    { id: 'marsh-stalker', name: { 'zh-TW': '濕地潛伏者' }, description: { 'zh-TW': '潛伏旅人' },
      familyId: 'bog-beasts', rank: 'normal', level: 3,
      stats: { hp: 30, attack: 8, defense: 2, exp: 20, gold: 5 }, role: 'fast',
      mechanics: [{ kind: 'rush', everyTurns: 3, bonusFraction: 0.2, telegraph: { 'zh-TW': '牠蓄力準備突襲。' } }],
      lootTableId: 'bog-loot', lootProfile: { dropLevel: 3, equipmentChance: 0.5,
        rarityWeights: { common: 1, uncommon: 0, rare: 0, epic: 0, legendary: 0 } } },
  ],
  lootTables: [{ id: 'bog-loot', guaranteedMaterialIds: ['mire-claw'],
    weightedEquipment: [{ equipmentId: 'reed-spear', weight: 1 }], rareMaterials: [] }],
  equipment: [{ id: 'reed-spear', name: { 'zh-TW': '蘆槍' }, description: { 'zh-TW': '沼澤製作' },
    slot: 'weapon', attack: 3, defense: 0, sell: 4, affixIds: ['keen'] }],
  materials: [{ id: 'mire-claw', name: { 'zh-TW': '泥沼爪' }, description: { 'zh-TW': '可用於製作' },
    sell: 2, bias: {} }],
  crops: [], cropGoods: [],
  recipes: [{ id: 'mire-hunter', name: { 'zh-TW': '製作蘆槍' }, description: { 'zh-TW': '鍛造用' },
    category: 'weapon', inputs: [{ source: 'material', materialId: 'mire-claw', amount: 1 }],
    goldCost: 1, staminaCost: 1, durationMinutes: 60, outputBase: 'reed-spear', outputLevel: 1,
    requiredSmithing: 0, practiceCap: 1, station: 'blacksmith', opensAtHour: 0, closesAtHour: 23,
    allowedBiasMaterials: ['mire-claw'], qualityRules: { floorAtSmithing: 0, minimumRarity: 'common' },
    affixRules: 'default' }],
  affixes: [{ id: 'keen', name: { 'zh-TW': '銳利' }, description: { 'zh-TW': '提升穿刺' },
    stat: 'critical', slots: ['weapon'], tiers: [1, 2] }],
}

describe('validateContentPack', () => {
  it('reports an ID-independent effective monster duplicate and a controlled spawn witness', () => {
    const report = validateContentPack(pack, baseline)

    expect(report.errors).toEqual([])
    expect(report.warnings).toContainEqual(expect.objectContaining({
      code: 'duplicate-like-monster', ids: ['marsh-stalker', 'mire-hunter'],
    }))
    expect(report.reachability).toContainEqual(expect.objectContaining({
      contentId: 'mire-hunter', status: 'controlled-witness', witness: expect.objectContaining({
        region: 'forest', playerLevel: 2, season: '夏',
      }),
    }))
    expect(report.naturalExposure).toBe('not-measured')
    expect(report.qualifyingMonsterIds).toEqual([])
    expect(report.qualityCounts).toEqual({ qualifyingNewMonsters: 0, usableNewItems: 2, usableNewMaterials: 1 })
  })

  it('uses reachable monster-selected loot tables for distinct sourced and useful family loot', () => {
    const separateLoot: ContentPack = {
      ...pack,
      monsters: pack.monsters.map((monster, index) => ({ ...monster, lootTableId: index === 0 ? 'bog-loot' : 'marsh-loot' })),
      lootTables: [...pack.lootTables, { id: 'marsh-loot', guaranteedMaterialIds: ['marsh-scale'],
        weightedEquipment: [{ equipmentId: 'reed-spear', weight: 1 }], rareMaterials: [] }],
      materials: [...pack.materials, { id: 'marsh-scale', name: { 'zh-TW': '濕地鱗片' }, description: { 'zh-TW': '可用於製作' }, sell: 3, bias: {} }],
      recipes: [{ ...pack.recipes[0]!, inputs: [
        { source: 'material', materialId: 'mire-claw', amount: 1 },
        { source: 'material', materialId: 'marsh-scale', amount: 1 },
      ] }],
    }
    const report = validateContentPack(separateLoot, baseline)
    expect(report.errors).toEqual([])
    expect(report.warnings).not.toContainEqual(expect.objectContaining({ code: 'unused-loot-table', id: 'marsh-loot' }))
    expect(report.qualifyingMonsterIds).toEqual(['mire-hunter', 'marsh-stalker'])
    expect(report.qualityCounts.usableNewMaterials).toBe(2)
  })

  it('rejects an unresolved monster-selected loot table', () => {
    const missing = { ...pack, monsters: pack.monsters.map((monster, index) => index === 1 ? { ...monster, lootTableId: 'missing-loot' } : monster) }
    const report = validateContentPack(missing, baseline)
    expect(report.errors).toContainEqual(expect.objectContaining({ code: 'unknown-reference', id: 'marsh-stalker', reference: 'missing-loot' }))
  })

  it('rejects unsatisfiable predicates, unknown references, and materials without a real consumer', () => {
    const bad: ContentPack = {
      ...pack,
      families: [{ ...pack.families[0]!, spawnProfiles: [{ region: 'forest', minPlayerLevel: 8, maxPlayerLevel: 2 }] }],
      lootTables: [{ ...pack.lootTables[0]!, weightedEquipment: [{ equipmentId: 'missing-base', weight: 1 }] }],
      recipes: [{ ...pack.recipes[0]!, inputs: [], allowedBiasMaterials: [] }],
    }

    const report = validateContentPack(bad, baseline)
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unreachable-spawn' }),
      expect.objectContaining({ code: 'unknown-reference', reference: 'missing-base' }),
      expect.objectContaining({ code: 'orphan-material', id: 'mire-claw' }),
    ]))
  })

  it('checks satisfiability of the family AND monster profile combination', () => {
    const contradictory: ContentPack = {
      ...pack,
      families: [{ ...pack.families[0]!, spawnProfiles: [{ region: 'forest', maxPlayerLevel: 2 }] }],
      monsters: pack.monsters.map(monster => ({ ...monster, spawnProfiles: [{ region: 'forest', minPlayerLevel: 3 }] })),
    }
    const report = validateContentPack(contradictory, baseline)
    expect(report.reachability.filter(entry => ['mire-hunter', 'marsh-stalker'].includes(entry.contentId))).toEqual([
      { contentId: 'mire-hunter', status: 'unreachable' },
      { contentId: 'marsh-stalker', status: 'unreachable' },
    ])
    expect(report.errors.filter(issue => issue.code === 'unreachable-spawn')).toHaveLength(2)
  })

  it('rejects out-of-range stats and missing required localized text', () => {
    const malformed: ContentPack = {
      ...pack,
      monsters: [{ ...pack.monsters[0]!, stats: { ...pack.monsters[0]!.stats, attack: 1001 }, name: { 'zh-TW': '' } }, pack.monsters[1]!],
    }
    const report = validateContentPack(malformed, baseline)
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-range', id: 'mire-hunter', path: 'stats.attack' }),
      expect.objectContaining({ code: 'incomplete-localization', id: 'mire-hunter', path: 'name' }),
    ]))
  })

  it('validates unknown JSON instead of trusting a TypeScript cast', () => {
    const report = validateContentPack({ monsters: [{ id: 'bad', stats: { hp: Infinity } }] }, baseline)
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-schema' }),
    ]))
    const nonFinite = validateContentPack({ ...pack, monsters: [{ ...pack.monsters[0]!, stats: { ...pack.monsters[0]!.stats, attack: Infinity } }, pack.monsters[1]!] }, baseline)
    expect(nonFinite.errors).toContainEqual(expect.objectContaining({ code: 'non-finite-number' }))
  })

  it('excludes an exact baseline ID collision from every new-content count', () => {
    const report = validateContentPack(pack, { ...baseline, monsterIds: ['mire-hunter'] })
    expect(report.errors).toContainEqual(expect.objectContaining({ code: 'baseline-id-collision', id: 'mire-hunter' }))
    expect(report.qualifyingMonsterIds).toEqual([])
    expect(report.qualityCounts.qualifyingNewMonsters).toBe(0)
    expect(report.baseline.excludedLegacyMonsterIds).toBe(0)
  })

  it('rejects baseline boss variant collisions in their own namespace', () => {
    const boss: ContentPack = {
      ...pack,
      families: [{ ...pack.families[0]!, monsterIds: [], bossIds: ['bog-boss'] }],
      monsters: [{ ...pack.monsters[0]!, id: 'bog-boss', rank: 'boss', bossRules: {
        cooldownDays: 7,
        guaranteedMaterialIds: ['mire-claw'],
        exclusiveEquipmentId: 'reed-spear',
        variants: [{ id: 'wellFed', name: { 'zh-TW': '蓄勢' }, description: { 'zh-TW': '沼澤繁盛' }, weight: 1,
          mechanics: [{ kind: 'chargedAttack', everyTurns: 4, bonusFraction: 0.2, telegraph: { 'zh-TW': '牠蓄力準備重擊。' } }] }],
        worldConsequence: { trigger: 'bossDefeated', field: 'safety', delta: 1 },
      } }],
    }
    const report = validateContentPack(boss, { ...baseline, bossVariantIds: ['wellFed'] })
    expect(report.errors).toContainEqual(expect.objectContaining({ code: 'baseline-id-collision', id: 'wellFed' }))
  })

  it('excludes exact legacy and procedural item IDs from item collisions and quality counts', () => {
    const report = validateContentPack(pack, {
      ...baseline,
      excludedLegacyItemIds: ['reed-spear', 'mire-claw'],
      excludedProceduralIds: ['reed-spear'],
    })
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'baseline-id-collision', id: 'reed-spear' }),
      expect.objectContaining({ code: 'baseline-id-collision', id: 'mire-claw' }),
    ]))
    expect(report.qualityCounts.usableNewItems).toBe(0)
    expect(report.qualityCounts.usableNewMaterials).toBe(0)
  })

  it('does not treat an invalid recipe as an item or material consumer', () => {
    const invalid: ContentPack = {
      ...pack,
      lootTables: [{ ...pack.lootTables[0]!, weightedEquipment: [] }],
      recipes: [{ ...pack.recipes[0]!, outputBase: 'missing-output' }],
    }
    const report = validateContentPack(invalid, baseline)
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'orphan-material', id: 'mire-claw' }),
      expect.objectContaining({ code: 'unusable-equipment', id: 'reed-spear' }),
    ]))
    expect(report.qualityCounts.usableNewItems).toBe(0)
    expect(report.qualityCounts.usableNewMaterials).toBe(0)
  })

  it('rejects malformed and fractional recipe inputs and every invalid family region token', () => {
    const malformed: ContentPack = {
      ...pack,
      families: [{ ...pack.families[0]!, regions: ['forest', 'bog'] as never }],
      recipes: [{ ...pack.recipes[0]!, inputs: [null, { source: 'material', materialId: 'mire-claw', amount: 0.5 }] as never }],
    }
    const report = validateContentPack(malformed, baseline)
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-region', id: 'bog-beasts' }),
      expect.objectContaining({ code: 'invalid-recipe', id: 'mire-hunter', path: 'inputs' }),
      expect.objectContaining({ code: 'invalid-range', id: 'mire-hunter', path: 'inputs.amount' }),
    ]))
  })

  it('rejects malformed loot entries instead of dropping them from consumer evidence', () => {
    const malformed = {
      ...pack,
      lootTables: [{ ...pack.lootTables[0]!, weightedEquipment: [null], rareMaterials: [null] }],
    } as unknown as ContentPack
    const report = validateContentPack(malformed, baseline)
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-schema', id: 'bog-loot', path: 'weightedEquipment[0]' }),
      expect.objectContaining({ code: 'invalid-schema', id: 'bog-loot', path: 'rareMaterials[0]' }),
    ]))
    expect(report.qualityCounts.usableNewItems).toBe(1)
    expect(report.qualityCounts.usableNewMaterials).toBe(0)
  })

  it('rejects crop and recipe economy values outside finite authoring bounds', () => {
    const bounded = {
      ...pack,
      crops: [{ id: 'mire-root', name: { 'zh-TW': '沼根' }, description: { 'zh-TW': '沼澤作物' },
        regions: ['forest'], seasons: ['夏'], growthMinutes: 43201, harvestAmount: 101, harvestGoodId: 'mire-root-good' }],
      cropGoods: [{ id: 'mire-root-good', name: { 'zh-TW': '沼根' }, description: { 'zh-TW': '食用' },
        sourceCropId: 'mire-root', foodValue: 5, sell: 1 }],
      recipes: [{ ...pack.recipes[0]!, goldCost: 1001, staminaCost: 101, durationMinutes: 43201 }],
    } as unknown as ContentPack
    const report = validateContentPack(bounded, baseline)
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-range', id: 'mire-root' }),
      expect.objectContaining({ code: 'unusable-crop-good', id: 'mire-root-good' }),
      expect.objectContaining({ code: 'invalid-range', id: 'mire-hunter', path: 'goldCost' }),
      expect.objectContaining({ code: 'invalid-range', id: 'mire-hunter', path: 'staminaCost' }),
      expect.objectContaining({ code: 'invalid-range', id: 'mire-hunter', path: 'durationMinutes' }),
    ]))
  })

  it('rejects missing or unsupported required recipe enums before granting consumer credit', () => {
    for (const recipe of [
      { ...pack.recipes[0]!, station: null },
      { ...pack.recipes[0]!, affixRules: 'anything-goes' },
    ]) {
      const malformed = {
        ...pack,
        lootTables: [{ ...pack.lootTables[0]!, weightedEquipment: [] }],
        recipes: [recipe],
      } as unknown as ContentPack
      const report = validateContentPack(malformed, baseline)
      expect(report.errors).toContainEqual(expect.objectContaining({ code: 'invalid-recipe', id: 'mire-hunter' }))
      expect(report.qualityCounts.usableNewItems).toBe(0)
    }
  })

  it('applies bounded authoring economy guards and uses legacy affix slot metadata', () => {
    const guarded: ContentPack = {
      ...pack,
      materials: [{ ...pack.materials[0]!, sell: 51, bias: { keen: 4.1 } }],
      equipment: [{ ...pack.equipment[0]!, affixIds: ['sturdy'] }],
    }
    const report = validateContentPack(guarded, {
      ...baseline,
      affixIds: ['sturdy'],
      baselineAffixSlots: [{ id: 'sturdy', slots: ['armor'] }],
    })
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-range', id: 'mire-claw', path: 'sell' }),
      expect.objectContaining({ code: 'invalid-range', id: 'mire-claw', path: 'bias.keen' }),
      expect.objectContaining({ code: 'affix-ineligible', id: 'reed-spear', reference: 'sturdy' }),
    ]))
  })
})
