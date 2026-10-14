import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCombatCellManifest, controlledCellNaReason, controlledSampleSeed, selectCombatMatrixTargets,
} from './combat-matrix.mjs'
import {
  classifyControlledCell, controlledJobCellTransition, findNewBossExclusiveDrop, isEligibleDifferentBossDrop,
  isWithinControlledJobBudget, parseControlledMatrixArgs, summarizeControlledMatrix,
} from './controlled-matrix-core.mjs'

const targetRows = [
  ...[
    ['slime_heart', 'boss', 'slime', 'farmland', 8], ['cave_insect_queen', 'boss', 'cave_insects', 'mine', 9],
    ['wild_beast_apex', 'boss', 'wild_beasts', 'forest', 9], ['frontier_goblin_warlord', 'boss', 'frontier_goblins', 'forest', 10],
    ['fog_undead_cryptlord', 'boss', 'fog_undead', 'forest', 10], ['mine_construct_heart', 'boss', 'mine_constructs', 'mine', 9],
    ['chief', 'boss', 'legacy', 'forest', 8], ['wolfKing', 'boss', 'wolf', 'forest', 7],
    ['grayWolf', 'normal', 'wolf', 'forest', 2], ['alphaWolf', 'elite', 'wolf', 'forest', 4],
    ['packLeader', 'miniBoss', 'wolf', 'forest', 5], ['cave_insect_digger', 'normal', 'cave_insects', 'mine', 3],
    ['cave_insect_razor', 'elite', 'cave_insects', 'mine', 6], ['cave_insect_broodguard', 'miniBoss', 'cave_insects', 'mine', 7],
    ['wild_beast_stonehorn', 'normal', 'wild_beasts', 'forest', 2], ['wild_beast_bristleback', 'elite', 'wild_beasts', 'forest', 5],
    ['wild_beast_old_matriarch', 'miniBoss', 'wild_beasts', 'forest', 6],
  ].map(([definitionId, rank, familyId, familyRegion, level]) => ({ definitionId, rank, familyId, familyRegion, level })),
]

test('scope contains all Bosses and one non-Boss per rank in each selected family-region', () => {
  const targets = selectCombatMatrixTargets(targetRows)
  assert.equal(targets.length, 17)
  assert.equal(targets.filter(target => target.rank === 'boss').length, 8)
  assert.equal(new Set(targets.map(target => target.definitionId)).size, 17)
  assert.deepEqual(targets.filter(target => target.rank !== 'boss').map(target => target.definitionId).sort(), [
    'alphaWolf', 'cave_insect_broodguard', 'cave_insect_digger', 'cave_insect_razor', 'grayWolf',
    'packLeader', 'wild_beast_bristleback', 'wild_beast_old_matriarch', 'wild_beast_stonehorn',
  ].sort())
})

test('scoped manifest stays under the 20-minute estimate and splits to 15 jobs', () => {
  const manifest = buildCombatCellManifest({ targets: selectCombatMatrixTargets(targetRows) })
  assert.equal(manifest.targetCount, 17)
  assert.equal(manifest.executionPlan.jobCount, 15)
  assert.equal(manifest.maxCombatSamplesAfterKnownLegacyNAs, 336_600)
  assert.equal(manifest.executionPlan.estimatedWallClockMinutesTotal, 17)
  assert.ok(manifest.executionPlan.estimatedWallClockMinutesPerJob <= 15)
  assert.ok(manifest.executionPlan.jobs.every(job => job.expectedRows <= 25_500))
  assert.equal(manifest.knownLegacyNACellCount, 153)
})

test('legacy style compatibility is explicit and cell sample seed is stable and stratified', () => {
  assert.equal(controlledCellNaReason('legacy', 'crit-speed') !== null, true)
  assert.equal(controlledCellNaReason('legacy', 'damage'), null)
  const first = controlledSampleSeed(61101, 'slime_heart', 'early', 'legacy', 'damage', 0)
  assert.equal(first, controlledSampleSeed(61101, 'slime_heart', 'early', 'legacy', 'damage', 0))
  assert.notEqual(first, controlledSampleSeed(61102, 'slime_heart', 'early', 'legacy', 'damage', 0))
  assert.notEqual(first, controlledSampleSeed(61101, 'slime_heart', 'early', 'legacy', 'damage', 1))
})

test('job arguments require one legal band and source, with optional target split', () => {
  assert.deepEqual(parseControlledMatrixArgs(['--band', 'early', '--source', 'legacy']),
    { band: 'early', source: 'legacy', target: null })
  assert.deepEqual(parseControlledMatrixArgs(['--band', 'late', '--source', 'boss-gear', '--target', 'wolfKing']),
    { band: 'late', source: 'boss-gear', target: 'wolfKing' })
  assert.throws(() => parseControlledMatrixArgs(['--band', 'wrong', '--source', 'legacy']), /--band/)
  assert.throws(() => parseControlledMatrixArgs(['--band', 'early', '--source', 'legacy', '--source', 'crafted']), /duplicate/)
})

test('the 14-minute hard stop is strict and summaries retain outcome percentiles and gold risk', () => {
  assert.equal(isWithinControlledJobBudget(1000, 1000 + 14 * 60_000 - 1), true)
  assert.equal(isWithinControlledJobBudget(1000, 1000 + 14 * 60_000), false)
  const summary = summarizeControlledMatrix([
    { definitionId: 'chief', rank: 'boss', band: 'early', source: 'legacy', style: 'damage', outcome: 'win', turns: 4,
      hpAfter: 70, hpMaxAfter: 100, potionUse: 0, grossDamageStatus: 'MEASURED', grossDamageTaken: 10,
      goldDelta: 100, timeDeltaMinutes: 5, staminaSpent: 8 },
    { definitionId: 'chief', rank: 'boss', band: 'early', source: 'legacy', style: 'damage', outcome: 'retreat', turns: 7,
      hpAfter: 20, hpMaxAfter: 100, potionUse: 1, grossDamageStatus: 'MEASURED', grossDamageTaken: 50,
      goldDelta: -3, timeDeltaMinutes: 15, staminaSpent: 8 },
  ])[0]
  assert.equal(summary.samples, 2)
  assert.equal(summary.winRate, .5)
  assert.equal(summary.turnsP50, 4)
  assert.equal(summary.hpRemainingPercentP50, 20)
  assert.equal(summary.riskAdjustedGold, 48.5)
})

test('controlled cell results distinguish legal N/A gates, runner errors, timeouts, and partial output', () => {
  const expectedSamples = 300
  assert.deepEqual(classifyControlledCell({ naReason: 'no public legal source path', expectedSamples }),
    { status: 'NOT_APPLICABLE', errorReason: null, naReason: 'no public legal source path' })
  assert.deepEqual(classifyControlledCell({ executionError: 'combat action rejected', expectedSamples }),
    { status: 'RUNNER_ERROR', errorReason: 'combat action rejected', naReason: null })
  assert.deepEqual(classifyControlledCell({ timeLimitReached: true, naReason: 'hard stop', expectedSamples }),
    { status: 'TIME_LIMIT_REACHED', errorReason: null, naReason: 'hard stop' })
  assert.deepEqual(classifyControlledCell({ naReason: 'gate lost after partial samples', attemptedSamples: 1, expectedSamples }),
    { status: 'INCOMPLETE', errorReason: null, naReason: 'gate lost after partial samples' })
  assert.deepEqual(classifyControlledCell({ attemptedSamples: expectedSamples, expectedSamples }),
    { status: 'PASS', errorReason: null, naReason: null })
})

test('Boss exclusive rewards remain detectable when non-legendary provenance is null', () => {
  const beforeIds = new Set(['item-4'])
  const priorBossDrop = { instanceId: 'item-4', ownerId: 'player', baseId: 'moonFangSpear', provenance: null }
  const nonLegendaryDrop = { instanceId: 'item-5', ownerId: 'player', baseId: 'moonFangSpear', provenance: null }
  const wrongSource = { instanceId: 'item-6', ownerId: 'player', baseId: 'moonFangSpear',
    provenance: { bossSource: 'frontier_goblin_warlord' } }
  const unownedDrop = { instanceId: 'item-7', ownerId: 'other', baseId: 'moonFangSpear', provenance: null }
  const found = findNewBossExclusiveDrop([priorBossDrop, wrongSource, unownedDrop, nonLegendaryDrop], beforeIds,
    { definitionId: 'wolfKing', baseId: 'moonFangSpear' }, 'player')
  assert.strictEqual(found, nonLegendaryDrop)
  assert.equal(isEligibleDifferentBossDrop(nonLegendaryDrop, 'frontier_goblin_warlord', 'frontier_goblin_warlord_cleaver'), true)
  assert.equal(isEligibleDifferentBossDrop(nonLegendaryDrop, 'wolfKing', 'moonFangSpear'), false)
  assert.equal(isEligibleDifferentBossDrop(wrongSource, 'frontier_goblin_warlord', 'frontier_goblin_warlord_cleaver'), false)
})

test('one runner-error cell leaves the job failed but continuing; only hard time limit stops it', () => {
  assert.deepEqual(controlledJobCellTransition('PASS', { executionError: 'missing cell item' }),
    { status: 'FAIL', stop: false })
  assert.deepEqual(controlledJobCellTransition('PASS', { timeLimitReached: true }),
    { status: 'TIME_LIMIT_REACHED', stop: true })
  assert.deepEqual(controlledJobCellTransition('FAIL'), { status: 'FAIL', stop: false })
})
