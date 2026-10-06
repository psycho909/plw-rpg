import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, it } from 'vitest'
import { ITEM_BASES, RARITIES } from '../../../../src/data/rewards'
import { createGame } from '../../../../src/engine/simulation'
import { awardWolfLoot, generateItem } from '../../../../src/engine/itemGeneration'
import { deserialize, serialize } from '../../../../src/services/saveService'
import type { RarityId } from '../../../../src/domain/reward'

const output = process.cwd() + '/reports/v2/20261006-reward-core/phase-02'
mkdirSync(output, { recursive: true })
const stamp = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '')
it('audits 10,000 normal wolf awards and 10,000 themed boss gear rolls with persistent source evidence', () => {
  const normal = createGame(2026), boss = createGame(2026)
  const counts: Record<RarityId, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 }
  const bossCounts: Record<RarityId, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 }
  const baseCounts: Record<string, number> = {}
  let saleValue = 0, special = 0, belowFixedSlot = 0
  const started = performance.now()
  for (let index = 0; index < 10000; index++) {
    const drop = awardWolfLoot(normal, { definitionId: 'grayWolf' })
    expect(drop.materials.wolfFang).toBe(1)
    if (drop.instance) {
      const item = drop.instance
      counts[item.rarity]++
      baseCounts[item.baseId] = (baseCounts[item.baseId] ?? 0) + 1
      saleValue += ITEM_BASES[item.baseId].sell
      if (item.specialTrait) special++
      if (ITEM_BASES[item.baseId].slot === 'weapon' ? item.rolledStats.attack < 7 : item.rolledStats.defense < 5) belowFixedSlot++
    }
    const item = generateItem(boss, { baseId: 'spear', level: 7, bossSource: 'wolfKing', material: 'moonStone' })
    bossCounts[item.rarity]++
    expect(item.rarity).toMatch(/rare|epic|legendary/)
    expect(item.affixes.length).toBe(RARITIES[item.rarity].affixCount)
    if (item.provenance) expect(item.provenance.createdBy).toBeNull()
  }
  const drops = normal.reward.instances.length
  expect(drops).toBeGreaterThan(6000)
  expect(drops).toBeLessThan(7000)
  expect(new Set(normal.reward.instances.map(item => item.instanceId)).size).toBe(drops)
  expect(normal.reward.materials[normal.activeCharacterId]?.wolfFang).toBe(10000)
  expect(normal.reward.collection.seen).toEqual(['grayWolf'])
  expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(drops)
  expect(counts.common).toBeGreaterThan(counts.uncommon)
  expect(counts.uncommon).toBeGreaterThan(counts.rare)
  expect(counts.legendary).toBeGreaterThan(0)
  expect(bossCounts.common + bossCounts.uncommon).toBe(0)
  expect(bossCounts.rare).toBeGreaterThan(bossCounts.epic)
  expect(bossCounts.epic).toBeGreaterThan(bossCounts.legendary)
  const saveStarted = performance.now()
  const saved = serialize(normal, 777)
  const serializedMs = performance.now() - saveStarted
  const loadStarted = performance.now()
  const loaded = deserialize(saved)
  const loadMs = performance.now() - loadStarted
  expect(loaded.state.reward).toEqual(normal.reward)
  const sample = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    harnessSha256: createHash('sha256').update(readFileSync(output + '/loot_sample.test.ts')).digest('hex'),
    seed: 2026, normalAwards: 10000, bossGearRolls: 10000, drops, counts, bossCounts, baseCounts, special,
    normalMaterialCounts: normal.reward.materials[normal.activeCharacterId],
    belowFixedSlotCount: belowFixedSlot, belowFixedSlotFraction: belowFixedSlot / drops,
    baseSaleValueBeforeRarityMultiplier: saleValue, saveBytes: Buffer.byteLength(saved), serializedMs, loadMs,
    durationMs: performance.now() - started,
    limitation: 'Statistical headless fixtures, not browser or human play. Below-fixed compares raw slot stats only and does not value affix utility; product finding, not proof all such gear is useless.' }
  appendFileSync(output + '/loot-samples-' + stamp + '.jsonl', JSON.stringify(sample) + '\n')
}, 60000)
