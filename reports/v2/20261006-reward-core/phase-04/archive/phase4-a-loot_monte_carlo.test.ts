import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { AFFIXES, ITEM_BASES, MATERIALS, WOLF_MONSTERS } from '../../../../src/data/rewards'
import { ITEMS } from '../../../../src/data/config'
import { awardWolfLoot } from '../../../../src/engine/itemGeneration'
import { itemSellPrice } from '../../../../src/engine/rewardActions'
import { createGame, player } from '../../../../src/engine/simulation'
import type { GameState } from '../../../../src/domain/types'
import type { MonsterDefinitionId, RarityId } from '../../../../src/domain/reward'

const root = process.cwd()
const out = `${root}/reports/v2/20261006-reward-core/phase-04`
const total = Number(process.env.PHASE4_LOOT_AWARDS ?? 1000)
const cohortIds: MonsterDefinitionId[] = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader', 'wolfKing']
const rarities: RarityId[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
type Cohort = { awards: number; gearDrops: number; rarity: Record<RarityId, number>; affixCount: Record<string, number>; affixes: Record<string, number>; tiers: Record<string, number>; exclusive: number; moonHunter: number; moonHunterByRarityBase: Record<string, number>; duplicateLike: number; rawBelowLegacy: number; earlyScreenUpgrade: number; earlyScreenSidegrade: number; earlyScreenLowValue: number; legacyScreenUpgrade: number; legacyScreenSidegrade: number; legacyScreenLowValue: number; saleValue: number; gold: number; materials: Record<string, number>; mirrorAwards: number; mirrorSha256: string }
function fresh(seed: number): GameState {
  const state = createGame(seed), c = player(state)
  c.position = { x: 7, y: 6 }; c.currentRegion = 'forest'
  state.reward.collection.seen = cohortIds.slice(0, 4)
  state.reward.collection.defeated = cohortIds.slice(0, 4)
  state.threat.monsterPopulation = 80
  return state
}
function empty(): Cohort { return { awards: 0, gearDrops: 0, rarity: Object.fromEntries(rarities.map(r => [r, 0])) as Record<RarityId, number>, affixCount: {}, affixes: {}, tiers: {}, exclusive: 0, moonHunter: 0, moonHunterByRarityBase: {}, duplicateLike: 0, rawBelowLegacy: 0, earlyScreenUpgrade: 0, earlyScreenSidegrade: 0, earlyScreenLowValue: 0, legacyScreenUpgrade: 0, legacyScreenSidegrade: 0, legacyScreenLowValue: 0, saleValue: 0, gold: 0, materials: {}, mirrorAwards: 0, mirrorSha256: '' } }
const screeningValue = (item: NonNullable<ReturnType<typeof awardWolfLoot>['instance']>) => item.rolledStats.attack + item.rolledStats.critical * .12 + item.rolledStats.penetration * .8 + item.rolledStats.bleed * .65 + item.rolledStats.defense * 1.1 + item.rolledStats.block * .06 + item.rolledStats.reduction * .1
const classifyScreen = (gap: number, counts: Cohort, early: boolean) => {
  if (early) {
    if (gap > .5) counts.earlyScreenUpgrade++
    else if (gap >= -.5) counts.earlyScreenSidegrade++
    else counts.earlyScreenLowValue++
  } else if (gap > .5) counts.legacyScreenUpgrade++
  else if (gap >= -.5) counts.legacyScreenSidegrade++
  else counts.legacyScreenLowValue++
}

it('measures deterministic wolf loot by rank and writes an archived report', () => {
  expect(Number.isSafeInteger(total) && total >= 1000 && total % cohortIds.length === 0).toBe(true)
  const perCohort = total / cohortIds.length
  const cohorts = Object.fromEntries(cohortIds.map(id => [id, empty()])) as Record<MonsterDefinitionId, Cohort>
  const seen = Object.fromEntries(cohortIds.map(id => [id, new Set<string>()])) as Record<MonsterDefinitionId, Set<string>>
  const started = performance.now()
  const sourceSha256 = Object.fromEntries(execFileSync('git', ['ls-files', 'src'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort().map(path => [path, createHash('sha256').update(readFileSync(`${root}/${path}`)).digest('hex')]))
  let totalGold = 0, mirroredAwards = 0
  for (const id of cohortIds) {
    const m = WOLF_MONSTERS[id], row = cohorts[id]
    const state = fresh(314), mirror = fresh(314), mirrorHash = createHash('sha256')
    for (let i = 0; i < perCohort; i++) {
      const drop = awardWolfLoot(state, { definitionId: id }); row.awards++; row.gold += m.gold
      if (i < 50) {
        const expected = awardWolfLoot(mirror, { definitionId: id })
        expect(expected).toEqual(drop)
        expect({ rngState: mirror.rngState, nextInstanceId: mirror.reward.nextInstanceId, materials: mirror.reward.materials }).toEqual({ rngState: state.rngState, nextInstanceId: state.reward.nextInstanceId, materials: state.reward.materials })
        mirrorHash.update(JSON.stringify({ instance: drop.instance, materials: drop.materials }) + '\n')
        row.mirrorAwards++
        mirror.reward.instances.pop(); mirror.events.length = 0
        mirroredAwards++
      }
      for (const [material, amount] of Object.entries(drop.materials)) row.materials[material] = (row.materials[material] ?? 0) + amount
      player(state).gold += m.gold; totalGold += m.gold
      if (drop.instance) {
        const item = drop.instance, base = ITEM_BASES[item.baseId], signature = `${item.baseId}|${item.rarity}|${item.affixes.map(a => `${a.id}:${a.tier}`).sort().join(',')}`
        row.gearDrops++; row.rarity[item.rarity]++; row.affixCount[item.affixes.length] = (row.affixCount[item.affixes.length] ?? 0) + 1
        for (const affix of item.affixes) { row.affixes[affix.id] = (row.affixes[affix.id] ?? 0) + 1; row.tiers[`${affix.id}:T${affix.tier}`] = (row.tiers[`${affix.id}:T${affix.tier}`] ?? 0) + 1 }
        if (item.provenance?.bossSource || item.specialTrait) row.exclusive++
        if (item.specialTrait === 'moonHunter') { row.moonHunter++; row.moonHunterByRarityBase[`${item.rarity}:${base.slot}`] = (row.moonHunterByRarityBase[`${item.rarity}:${base.slot}`] ?? 0) + 1 }
        if (seen[id].has(signature)) row.duplicateLike++
        seen[id].add(signature)
        if (base.slot === 'weapon' ? item.rolledStats.attack < 7 : item.rolledStats.defense < 5) row.rawBelowLegacy++
        const value = screeningValue(item)
        const earlyGap = value - (base.slot === 'weapon' ? 4 : 2)
        const legacyGap = value - (base.slot === 'weapon' ? 7 : 5)
        classifyScreen(earlyGap, row, true); classifyScreen(legacyGap, row, false)
        row.saleValue += itemSellPrice(item)
        state.reward.instances.pop()
      }
      // Awards do not consume potions; this is reported alongside combat-derived economy metrics.
      state.events.length = 0
    }
    row.mirrorSha256 = mirrorHash.digest('hex')
  }
  const report = { schemaVersion: 2, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceSha256, harnessSha256: createHash('sha256').update(readFileSync(`${out}/loot_monte_carlo.test.ts`)).digest('hex'), deterministicSeed: 314, totalAwards: total, awardsPerRank: perCohort, mirroredDeterminismAwards: mirroredAwards, cohorts: Object.fromEntries(cohortIds.map(id => [id, { definitionId: id, rank: WOLF_MONSTERS[id].rank, ...cohorts[id], noGearAwards: perCohort - cohorts[id].gearDrops, gearDropRate: cohorts[id].gearDrops / perCohort, duplicateLikeRate: cohorts[id].gearDrops ? cohorts[id].duplicateLike / cohorts[id].gearDrops : 0, goldPerPotionCost: cohorts[id].gold / ITEMS.potion.price, materialSaleValue: Object.entries(cohorts[id].materials).reduce((sum, [material, count]) => sum + MATERIALS[material as keyof typeof MATERIALS].sell * count, 0) }])), totalGold, elapsedMs: performance.now() - started, economy: { goldPerEncounter: Object.fromEntries(cohortIds.map(id => [id, cohorts[id].gold / perCohort])), goldPerPotionCost: Object.fromEntries(cohortIds.map(id => [id, cohorts[id].gold / ITEMS.potion.price])), potionShopPriceGold: ITEMS.potion.price, equipmentSaleValue: 'Sum of actual itemSellPrice values; exclude material sales.', basicShopPrices: { legacySword: ITEMS.sword.price, legacyArmor: ITEMS.armor.price }, materialSaleValue: 'Sum of material count × catalog material sell price.' }, staticScreeningDefinitions: { rawBelowLegacy: 'Weapon rolled attack < fixed legacy sword attack 7 OR armor rolled defense < fixed legacy armor defense 5; raw-stat screen only.', score: 'attack + critical×.12 + penetration×.8 + bleed×.65 + defense×1.1 + block×.06 + reduction×.1; heuristic weights are diagnostic only.', earlyBaseline: 'Level-1 shortSword attack 4 / hideArmor defense 2; by-slot baseline value 4 for weapon and 2 for armor.', fixedLegacy: 'By-slot fixed reference attack 7 / defense 5.', boundaries: 'Screen upgrade > +.5, sidegrade ±.5, low-value screen < -.5; counts are over gear drops only. These categories are not player choices, observed equip rates, or battle ECV.' }, duplicateDefinition: 'duplicateLike counts repeats of identical baseId+rarity+sorted affixId:tier signature within each rank cohort, including only dropped gear; rate denominator is gearDrops.', economicScope: 'loot-only economy; combat potion use and potion-cost/gold ratios are in combat-balance.json.', limitations: ['Each rank uses a fresh deterministic world; array cleanup bounds memory.', 'First 50 awards per rank are replayed from an identical state and compared; remainder is single-pass.', 'Boss/elite/miniboss awards are direct reward-function calls, not simulated won fights.', 'Screening values do not establish a reward gate.'] }
  for (const id of cohortIds) {
    const row = cohorts[id]
    expect(row.awards).toBe(perCohort)
    expect(Object.values(row.rarity).reduce((a, b) => a + b, 0)).toBe(row.gearDrops)
    expect(row.mirrorAwards).toBe(50)
    if (row.gearDrops) expect([0, 1, 2, 3].reduce((sum, count) => sum + (row.affixCount[String(count)] ?? 0), 0)).toBe(row.gearDrops)
    for (const name of Object.keys(row.affixes)) expect(Object.hasOwn(AFFIXES, name)).toBe(true)
    for (const key of Object.keys(row.moonHunterByRarityBase)) expect(key).toBe('legendary:weapon')
  }
  execFileSync('python3', ['scripts/recorded_reports.py', 'publish', `${out}/loot-distribution.json`, '--producer', 'g6-luna-med-phase4-sim-engineer'], { cwd: root, input: `${JSON.stringify(report, null, 2)}\n`, stdio: ['pipe', 'inherit', 'inherit'] })
}, 120000)
