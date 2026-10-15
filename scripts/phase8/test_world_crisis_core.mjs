import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeWorld, validateWorldRun, WORLD_SCENARIOS } from './world-crisis-core.mjs'

test('crisis summary counts outcomes and computes intervals in days', () => {
  const summary = summarizeWorld([
    { seed: 1, triggeredAt: 100, outcome: 'decisive_success', readinessAtTrigger: 40 },
    { seed: 1, triggeredAt: 100 + 30 * 1440, outcome: 'setback', readinessAtTrigger: 60 },
    { seed: 2, triggeredAt: 200, outcome: 'local_defeat', readinessAtTrigger: 50 },
    { seed: 2, triggeredAt: 200 + 50 * 1440, outcome: 'costly_success', readinessAtTrigger: 55 },
  ])
  assert.equal(summary.count, 4)
  assert.equal(summary.intervalDays.min, 30)
  assert.equal(summary.intervalDays.median, 40)
  assert.equal(summary.intervalDays.max, 50)
  assert.deepEqual(summary.outcomeDistribution, { decisive_success: 1, costly_success: 1, setback: 1, local_defeat: 1 })
})

test('run validity requires every selected checkpoint, three seeds, and save parity', () => {
  const seeds = [1, 2, 3], years = [10, 50, 100]
  const checkpoints = WORLD_SCENARIOS.flatMap(scenario => seeds.flatMap(seed => years.map(year => ({ scenario, seed, year, saveReloadEqual: true, continuationEqual: true, playerAlive: true, unresolvedPlayerDeath: false }))))
  assert.deepEqual(validateWorldRun({ seeds, years, scenarios: WORLD_SCENARIOS, checkpoints, transitions: [{ phase: 'warning' }] }), { status: 'VALID', failures: [] })
  checkpoints.pop()
  assert.equal(validateWorldRun({ seeds, years, scenarios: WORLD_SCENARIOS, checkpoints, transitions: [{ phase: 'warning' }] }).status, 'INVALID')
  const activeScenario = WORLD_SCENARIOS.find(scenario => !['no-intervention', 'prosperous-controlled', 'struggling-controlled'].includes(scenario))
  const checkpoint = checkpoints.find(row => row.scenario === activeScenario)
  checkpoint.playerAlive = false
  checkpoint.unresolvedPlayerDeath = true
  assert.ok(validateWorldRun({ seeds, years, scenarios: WORLD_SCENARIOS, checkpoints, transitions: [{ phase: 'warning' }] }).failures.includes('active-player-dead-without-successor'))
})

test('run validity rejects a checkpoint that fails continuation parity', () => {
  const seeds = [1, 2, 3], years = [10, 50, 100]
  const checkpoints = WORLD_SCENARIOS.flatMap(scenario => seeds.flatMap(seed => years.map(year => ({ scenario, seed, year, saveReloadEqual: true, continuationEqual: true, playerAlive: true, unresolvedPlayerDeath: false }))))
  checkpoints[0].continuationEqual = false
  const result = validateWorldRun({ seeds, years, scenarios: WORLD_SCENARIOS, checkpoints, transitions: [{ phase: 'warning' }] })
  assert.equal(result.status, 'INVALID')
  assert.ok(result.failures.includes('continuation-equality-failed'))
})
