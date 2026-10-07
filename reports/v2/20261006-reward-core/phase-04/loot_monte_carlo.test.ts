import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { expect, it } from 'vitest'
import { AFFIXES, ITEM_BASES, ITEM_GENERATION_RULES, MATERIALS, RARITIES, WOLF_LOOT_RULES, WOLF_MONSTERS } from '../../../../src/data/rewards'
import { ITEMS } from '../../../../src/data/config'
import { awardWolfLoot, wolfRewardExpectation } from '../../../../src/engine/itemGeneration'
import { itemSellPrice } from '../../../../src/engine/rewardActions'
import { createGame, player } from '../../../../src/engine/simulation'
import type { GameState } from '../../../../src/domain/types'
import type { ItemBaseId, MonsterDefinitionId, RarityId } from '../../../../src/domain/reward'

const root = process.cwd()
const out = `${root}/reports/v2/20261006-reward-core/phase-04`
const total = Number(process.env.PHASE4_LOOT_AWARDS ?? 1000)
const runLabel = process.env.PHASE4_RUN_LABEL ?? (total >= 100_000 ? 'final' : 'sanity')
const cohortIds: MonsterDefinitionId[] = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader', 'wolfKing']
const rarities: RarityId[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
function allSourceFiles(directory = `${root}/src`): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...allSourceFiles(absolute))
    else if (entry.isFile() || (entry.isSymbolicLink() && statSync(absolute).isFile())) {
      files.push(relative(root, absolute).split(sep).join('/'))
    }
  }
  return files.sort()
}
function sourceSnapshot() {
  const sourceSha256 = Object.fromEntries(allSourceFiles().map(path => [path, createHash('sha256').update(readFileSync(`${root}/${path}`)).digest('hex')]))
  const fingerprint = createHash('sha256').update(JSON.stringify(sourceSha256)).digest('hex')
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  return { commit, sourceSha256, fingerprint }
}
function checkSourceGuard(snapshot: ReturnType<typeof sourceSnapshot>) {
  const required = total >= 100_000
  const expectedCommit = process.env.PHASE4_EXPECT_SOURCE_COMMIT
  const expectedFingerprint = process.env.PHASE4_EXPECT_SOURCE_FINGERPRINT
  if (required) {
    expect(expectedCommit, 'full loot run requires PHASE4_EXPECT_SOURCE_COMMIT').toBeTruthy()
    expect(expectedFingerprint, 'full loot run requires PHASE4_EXPECT_SOURCE_FINGERPRINT').toBeTruthy()
  }
  if (expectedCommit) expect(snapshot.commit).toBe(expectedCommit)
  if (expectedFingerprint) expect(snapshot.fingerprint).toBe(expectedFingerprint)
}
function harnessHash() {
  return createHash('sha256').update(readFileSync(`${out}/loot_monte_carlo.test.ts`)).digest('hex')
}

type Cohort = {
  awards: number; gearDrops: number; rarity: Record<RarityId, number>; affixCount: Record<string, number>
  affixes: Record<string, number>; tiers: Record<string, number>; bossExclusiveBase: number
  bossProvenanceLegendary: number; moonHunter: number; eligibleLegendaryWeaponRolls: number
  duplicateLike: number; rawBelowLegacy: number; staticEarlyUpgrade: number; staticEarlySidegrade: number
  staticEarlyLowValue: number; staticLegacyUpgrade: number; staticLegacySidegrade: number
  staticLegacyLowValue: number; saleValue: number; gold: number; materials: Record<string, number>
  mirrorAwards: number; mirrorSha256: string
}

function fresh(seed: number): GameState {
  const state = createGame(seed), c = player(state)
  c.position = { x: 7, y: 6 }; c.currentRegion = 'forest'
  state.reward.collection.seen = cohortIds.slice(0, 4)
  state.reward.collection.defeated = cohortIds.slice(0, 4)
  state.threat.monsterPopulation = 80
  return state
}
function empty(): Cohort {
  return {
    awards: 0, gearDrops: 0, rarity: Object.fromEntries(rarities.map(r => [r, 0])) as Record<RarityId, number>,
    affixCount: {}, affixes: {}, tiers: {}, bossExclusiveBase: 0, bossProvenanceLegendary: 0,
    moonHunter: 0, eligibleLegendaryWeaponRolls: 0, duplicateLike: 0, rawBelowLegacy: 0,
    staticEarlyUpgrade: 0, staticEarlySidegrade: 0, staticEarlyLowValue: 0,
    staticLegacyUpgrade: 0, staticLegacySidegrade: 0, staticLegacyLowValue: 0,
    saleValue: 0, gold: 0, materials: {}, mirrorAwards: 0, mirrorSha256: '',
  }
}
const screeningValue = (item: NonNullable<ReturnType<typeof awardWolfLoot>['instance']>) =>
  item.rolledStats.attack + item.rolledStats.critical * .12 + item.rolledStats.penetration * .8
  + item.rolledStats.bleed * .65 + item.rolledStats.defense * 1.1 + item.rolledStats.block * .06 + item.rolledStats.reduction * .1
function classifyStatic(gap: number, counts: Cohort, early: boolean) {
  if (early) {
    if (gap > .5) counts.staticEarlyUpgrade++
    else if (gap >= -.5) counts.staticEarlySidegrade++
    else counts.staticEarlyLowValue++
  } else {
    if (gap > .5) counts.staticLegacyUpgrade++
    else if (gap >= -.5) counts.staticLegacySidegrade++
    else counts.staticLegacyLowValue++
  }
}

it('measures actual configured wolf loot profiles with boss-exclusive, provenance, and special denominators', () => {
  expect(Number.isSafeInteger(total) && total >= 1000 && total % cohortIds.length === 0).toBe(true)
  const startSource = sourceSnapshot(), startHarness = harnessHash()
  checkSourceGuard(startSource)
  const perCohort = total / cohortIds.length
  const cohorts = Object.fromEntries(cohortIds.map(id => [id, empty()])) as Record<MonsterDefinitionId, Cohort>
  const seen = Object.fromEntries(cohortIds.map(id => [id, new Set<string>()])) as Record<MonsterDefinitionId, Set<string>>
  const started = performance.now()
  let totalGold = 0, mirroredAwards = 0
  for (const id of cohortIds) {
    const monster = WOLF_MONSTERS[id], expectation = wolfRewardExpectation(id), row = cohorts[id]
    const state = fresh(314), mirror = fresh(314), mirrorHash = createHash('sha256')
    for (let i = 0; i < perCohort; i++) {
      const drop = awardWolfLoot(state, { definitionId: id })
      row.awards++; row.gold += monster.gold
      if (i < 50) {
        const expected = awardWolfLoot(mirror, { definitionId: id })
        expect(expected).toEqual(drop)
        expect({ rngState: mirror.rngState, nextInstanceId: mirror.reward.nextInstanceId, materials: mirror.reward.materials })
          .toEqual({ rngState: state.rngState, nextInstanceId: state.reward.nextInstanceId, materials: state.reward.materials })
        mirrorHash.update(JSON.stringify({ instance: drop.instance, materials: drop.materials }) + '\n')
        row.mirrorAwards++; mirror.reward.instances.pop(); mirror.events.length = 0; mirroredAwards++
      }
      for (const [material, amount] of Object.entries(drop.materials)) row.materials[material] = (row.materials[material] ?? 0) + amount
      player(state).gold += monster.gold; totalGold += monster.gold
      if (!drop.instance) {
        expect(expectation.gearChance).toBeLessThan(1)
        state.events.length = 0
        continue
      }
      const item = drop.instance, base = ITEM_BASES[item.baseId]
      const signature = `${item.baseId}|${item.rarity}|${item.affixes.map(a => `${a.id}:${a.tier}`).sort().join(',')}`
      row.gearDrops++; row.rarity[item.rarity]++; row.affixCount[item.affixes.length] = (row.affixCount[item.affixes.length] ?? 0) + 1
      for (const affix of item.affixes) {
        row.affixes[affix.id] = (row.affixes[affix.id] ?? 0) + 1
        row.tiers[`${affix.id}:T${affix.tier}`] = (row.tiers[`${affix.id}:T${affix.tier}`] ?? 0) + 1
      }
      if (item.baseId === WOLF_LOOT_RULES.bossExclusiveBase) row.bossExclusiveBase++
      if (item.provenance?.bossSource === 'wolfKing' && item.rarity === 'legendary') row.bossProvenanceLegendary++
      if (item.rarity === 'legendary' && base.slot === 'weapon' && RARITIES[item.rarity].specialEligible) {
        row.eligibleLegendaryWeaponRolls++
      }
      if (item.specialTrait === 'moonHunter') row.moonHunter++
      if (seen[id].has(signature)) row.duplicateLike++
      seen[id].add(signature)
      if (base.slot === 'weapon' ? item.rolledStats.attack < 7 : item.rolledStats.defense < 5) row.rawBelowLegacy++
      const value = screeningValue(item)
      classifyStatic(value - (base.slot === 'weapon' ? 4 : 2), row, true)
      classifyStatic(value - (base.slot === 'weapon' ? 7 : 5), row, false)
      row.saleValue += itemSellPrice(item)
      state.reward.instances.pop()
      state.events.length = 0
    }
    row.mirrorSha256 = mirrorHash.digest('hex')
  }
  const finalSource = sourceSnapshot(), finalHarness = harnessHash()
  expect(finalSource).toEqual(startSource)
  expect(finalHarness).toBe(startHarness)
  for (const id of cohortIds) {
    const row = cohorts[id], expectation = wolfRewardExpectation(id)
    expect(row.awards).toBe(perCohort)
    expect(Object.values(row.rarity).reduce((a, b) => a + b, 0)).toBe(row.gearDrops)
    expect(row.mirrorAwards).toBe(50)
    expect(Object.values(row.affixCount).reduce((a, b) => a + b, 0)).toBe(row.gearDrops)
    if (id === 'wolfKing') expect(row.bossExclusiveBase).toBe(row.gearDrops)
    else expect(row.bossExclusiveBase).toBe(0)
    if (row.eligibleLegendaryWeaponRolls > 0) expect(row.moonHunter).toBeLessThanOrEqual(row.eligibleLegendaryWeaponRolls)
    expect(expectation.dropLevel).toBe(WOLF_LOOT_RULES.profiles[id].dropLevel)
    for (const name of Object.keys(row.affixes)) expect(Object.hasOwn(AFFIXES, name)).toBe(true)
  }

  const report = {
    schemaVersion: 3, sourceCommit: startSource.commit, sourceSha256: startSource.sourceSha256,
    sourceFingerprint: startSource.fingerprint,
    sourceManifestAlgorithm: 'recursive filesystem walk of every file under src (including untracked; no ignore filtering), relative POSIX paths sorted lexicographically; fingerprint is SHA256(JSON.stringify(path-to-file-SHA256 map)).',
    harnessSha256: startHarness, deterministicSeed: 314,
    totalAwards: total, awardsPerRank: perCohort, mirroredDeterminismAwards: mirroredAwards,
    cohorts: Object.fromEntries(cohortIds.map(id => {
      const row = cohorts[id], expectation = wolfRewardExpectation(id)
      const eligibleSpecialChance = Math.min(1, ITEM_GENERATION_RULES.legendaryWeaponSpecialChance
        + (id === 'wolfKing' ? MATERIALS.moonStone.specialBonus : MATERIALS.wolfFang.specialBonus))
      return [id, {
        definitionId: id, rank: WOLF_MONSTERS[id].rank, configuredGenerationProfile: expectation,
        ...row, noGearAwards: perCohort - row.gearDrops,
        gearDropRate: row.gearDrops / perCohort,
        duplicateLikeRate: row.gearDrops ? row.duplicateLike / row.gearDrops : 0,
        bossExclusiveBaseObservedRate: row.bossExclusiveBase / perCohort,
        bossProvenanceOnLegendaryRate: row.rarity.legendary ? row.bossProvenanceLegendary / row.rarity.legendary : null,
        moonHunterObservedRateAmongEligibleLegendaryWeapons: row.eligibleLegendaryWeaponRolls
          ? row.moonHunter / row.eligibleLegendaryWeaponRolls : null,
        configuredSpecialChanceBeforeMaterialBonus: ITEM_GENERATION_RULES.legendaryWeaponSpecialChance,
        configuredSpecialChanceWithAwardMaterial: id === 'wolfKing' ? eligibleSpecialChance : null,
        goldPerPotionCost: row.gold / ITEMS.potion.price,
        materialSaleValue: Object.entries(row.materials).reduce((sum, [material, count]) => sum + MATERIALS[material as keyof typeof MATERIALS].sell * count, 0),
      }]
    })),
    totalGold, elapsedMs: performance.now() - started,
    economy: {
      goldPerEncounter: Object.fromEntries(cohortIds.map(id => [id, cohorts[id].gold / perCohort])),
      potionShopPriceGold: ITEMS.potion.price,
      equipmentSaleValue: 'Sum of actual itemSellPrice values; excludes material sales.',
      basicShopPrices: { legacySword: ITEMS.sword.price, legacyArmor: ITEMS.armor.price },
      materialSaleValue: 'Sum of material count × catalog material sell price.',
    },
    specialRateDefinitions: {
      exclusiveBase: 'Observed actual baseId equal to configured boss-exclusive base; denominator all awards in rank cohort.',
      bossProvenance: 'Legendary item provenance.bossSource; report both legendary count and cohort award count separately.',
      moonHunter: 'Observed special count over exact Legendary weapon rolls eligible for the special check. Configured chance is separate; observed rate is not the configured chance.',
    },
    staticScreeningDefinitions: {
      score: 'attack + critical×.12 + penetration×.8 + bleed×.65 + defense×1.1 + block×.06 + reduction×.1; heuristic diagnostic only.',
      boundaries: 'Static screen upgrade > +.5, sidegrade ±.5, low-value screen < -.5; denominator gear drops only.',
      limitation: 'Static screen labels are not player choices, observed equips, paired combat value, or ECV.',
    },
    duplicateDefinition: 'duplicateLike counts repeated baseId+rarity+sorted affixId:tier signature within each cohort, over gear drops only.',
    harnessGuard: { sourceStable: true, runnerStable: true, expectedSourceCommit: process.env.PHASE4_EXPECT_SOURCE_COMMIT ?? null,
      expectedSourceFingerprint: process.env.PHASE4_EXPECT_SOURCE_FINGERPRINT ?? null },
    limitations: ['Each rank uses a fresh deterministic world; dropped item instances are removed after counting to bound memory.',
      'First 50 awards per rank replay from an identical state and compare RNG, item sequence, IDs, and materials.',
      'Direct reward calls measure distribution, not win-conditioned acquisition; combat value is in final-combat-balance.json.'],
  }
    execFileSync('python3', ['scripts/recorded_reports.py', 'publish', `${out}/${runLabel}-loot-distribution.json`, '--producer', 'g6-luna-med-phase4-sim-engineer'],
    { cwd: root, input: `${JSON.stringify(report, null, 2)}\n`, stdio: ['pipe', 'inherit', 'inherit'] })
}, 600000)
