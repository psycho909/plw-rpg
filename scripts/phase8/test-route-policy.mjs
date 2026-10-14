import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canStartNormalEncounter, countPotionUses, orderAdventureTargets, parseRoutePolicy,
  reconstructIncomingDamage, riskAdjustedGoldReward, ROUTE_POLICIES, summarizeCombatOutcomes, WOLF_CHAIN,
} from './route-policy.mjs'
import { buildCombatCellManifest, MATRIX_BOSS_IDS } from './combat-matrix.mjs'

const wolf = id => ({ kind: 'wolf', definitionId: id, rank: id === 'alphaWolf' ? 'elite' : 'normal' })

test('v3 remains the default control and accepts only the two registered policies', () => {
  assert.equal(parseRoutePolicy([]), ROUTE_POLICIES.v3)
  assert.equal(parseRoutePolicy(['--policy', 'measured']), ROUTE_POLICIES.measured)
  assert.throws(() => parseRoutePolicy(['--policy', 'other']), /v3, measured/)
  assert.deepEqual(orderAdventureTargets([wolf('scarredWolf'), wolf('grayWolf')], 'v3'), [wolf('grayWolf'), wolf('scarredWolf')])
})

test('measured tie-break chooses the next undefeated legal wolf member before re-farming', () => {
  const eligible = [wolf('scarredWolf'), wolf('grayWolf')]
  assert.deepEqual(orderAdventureTargets(eligible, 'measured', ['grayWolf']).map(target => target.definitionId),
    ['scarredWolf', 'grayWolf'])
  // packLeader must be defeated before wolfKing appears in the legal target set.
  // A defeated packLeader remains a farmable target while wolfKing is newly unlocked.
  assert.deepEqual(orderAdventureTargets([wolf('wolfKing'), wolf('packLeader')], 'measured',
    WOLF_CHAIN.slice(0, 4)).map(target => target.definitionId), ['wolfKing', 'packLeader'])
})

test('measured policy limits ordinary encounters to one daily start while v3 keeps three', () => {
  assert.equal(canStartNormalEncounter('v3', 2), true)
  assert.equal(canStartNormalEncounter('v3', 3), false)
  assert.equal(canStartNormalEncounter('measured', 0), true)
  assert.equal(canStartNormalEncounter('measured', 1), false)
  assert.equal(canStartNormalEncounter('measured', -1), false)
})

test('potion inventory deltas and known healing reconstruct gross incoming damage exactly', () => {
  assert.equal(countPotionUses(3, 2), 1)
  assert.equal(countPotionUses(2, 3), null)
  assert.equal(reconstructIncomingDamage({ hpBefore: 40, hpAfter: 35, maxHp: 50, potionUses: 1, receivedAttack: true }), 15)
  assert.equal(reconstructIncomingDamage({ hpBefore: 20, hpAfter: 12, maxHp: 50, receivedAttack: true }), 8)
  assert.equal(reconstructIncomingDamage({ hpBefore: 20, hpAfter: 20, maxHp: 50, receivedAttack: false }), 0)
  assert.equal(reconstructIncomingDamage({ hpBefore: 20, hpAfter: 15, maxHp: 50, receivedAttack: true, healingUnknown: true }), null)
})

test('risk-adjusted gold preserves the B1 probability-weighted formula and refuses missing costs', () => {
  assert.equal(riskAdjustedGoldReward({ winRate: .5, retreatRate: .25, deathRate: .25,
    victoryGold: 100, retreatCostGold: 20, deathLossGold: 80 }), 25)
  assert.equal(riskAdjustedGoldReward({ winRate: .5, retreatRate: .25, deathRate: .25,
    victoryGold: 100, retreatCostGold: null, deathLossGold: 80 }), null)
  assert.throws(() => riskAdjustedGoldReward({ winRate: .5, retreatRate: .2, deathRate: .2,
    victoryGold: 100, retreatCostGold: 20, deathLossGold: 80 }), /summing to one/)
})

test('combat summaries keep Boss IDs separate and expose outcome, cost, and risk-adjusted gold metrics', () => {
  const base = { route: 'adventure', routeVariant: 'adventure-measured', rank: 'boss', band: 'late', turns: 4,
    hpAfter: 70, hpMaxAfter: 100, potionUse: 1, grossDamageTaken: 25, grossDamageStatus: 'MEASURED',
    timeDeltaMinutes: 4, staminaDelta: -8, materialDelta: {}, }
  const summary = summarizeCombatOutcomes([
    { ...base, definitionId: 'boss-a', outcome: 'win', goldDelta: 100 },
    { ...base, definitionId: 'boss-a', outcome: 'retreat', goldDelta: -5 },
    { ...base, definitionId: 'boss-b', outcome: 'death', goldDelta: -50 },
  ])
  assert.equal(summary.length, 2)
  assert.deepEqual(summary.map(row => row.definitionId), ['boss-a', 'boss-b'])
  assert.equal(summary[0].riskAdjustedGold, 47.5)
  assert.equal(summary[0].potionUsePerEncounter, 1)
  assert.equal(summary[0].grossDamageTakenP50, 25)
})

test('combat matrix manifest counts the full grid, keeps Boss IDs distinct, and bounds source-band jobs', () => {
  const manifest = buildCombatCellManifest({ targets: [
    { definitionId: 'normal-a', rank: 'normal', familyId: 'family-a' },
    { definitionId: 'boss-a', rank: 'boss', familyId: 'family-b' },
  ] })
  assert.equal(manifest.candidateCellCount, 2 * 3 * 5 * 5)
  assert.equal(manifest.knownLegacyNACellCount, 2 * 3 * 3)
  assert.equal(manifest.maxCombatSamplesAfterKnownLegacyNAs, (150 - 18) * 100 * 3)
  assert.equal(manifest.bossCellCount, 3 * 5 * 5)
  assert.equal(manifest.executionPlan.jobCount, 15)
  assert.equal(manifest.executionPlan.maxSingleRunMinutes, 15)
  assert.equal(manifest.cells.find(cell => cell.definitionId === 'boss-a' && cell.source === 'boss-gear')
    .excludeTargetBossDropOnFirstKill, true)
  assert.deepEqual(MATRIX_BOSS_IDS, ['slime_heart', 'cave_insect_queen', 'wild_beast_apex', 'frontier_goblin_warlord',
    'fog_undead_cryptlord', 'mine_construct_heart', 'chief', 'wolfKing'])
})
