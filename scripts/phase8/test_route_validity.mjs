import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyActionOutcome, evaluateRouteValidity, evaluateSeedVariance } from './route-validity.mjs'

const seedVariance = { status: 'VALID_POLICY', failures: [], checks: { sampleCount: 3 } }
const noHigherRanks = { higherRankEligibleCount: 0, noHigherRankReason: 'No higher-rank target was legal in the sampled route states.' }

test('an action succeeds only when the engine and relevant state both report progress', () => {
  assert.deepEqual(classifyActionOutcome({ engineSuccess: true, stateChanged: true }), {
    outcome: 'success', noProgress: false, reason: null,
  })
  assert.equal(classifyActionOutcome({ engineSuccess: false, stateChanged: true, failureReason: 'not legal' }).reason, 'not legal')
  assert.equal(classifyActionOutcome({ engineSuccess: true, stateChanged: false }).reason,
    'engine-reported-success-without-relevant-state-change')
})

test('seed variance requires different seeds and different engine-derived RNG evidence', () => {
  const samples = [
    { seed: 61101, worldSeed: 61101, rngState: 901, rngProbe: 0.2 },
    { seed: 61102, worldSeed: 61102, rngState: 902, rngProbe: 0.4 },
  ]
  assert.equal(evaluateSeedVariance(samples).status, 'VALID_POLICY')
  assert.equal(evaluateSeedVariance([samples[0], { ...samples[1], worldSeed: 61101, rngState: 901, rngProbe: 0.2 }]).status, 'INVALID_POLICY')
})

test('life route is invalid until it gathers, farms, and crafts or records verified impossibility', () => {
  const result = evaluateRouteValidity({ route: 'life', seedVariance, actions: [] })
  assert.equal(result.status, 'INVALID_POLICY')
  assert.deepEqual(result.failures, [
    'life-route-had-no-gather-success',
    'life-route-had-no-farming-success',
    'life-route-had-no-life-activity',
    'life-route-gained-no-skill-xp',
    'life-route-had-no-craft-or-verified-impossibility',
  ])
})

test('life route accepts measured gathering, farming, crafting, smithing XP, and sales', () => {
  const result = evaluateRouteValidity({ route: 'life', seedVariance, skillXpGained: 25, smithingXpGained: 10,
    actions: [
      { choice: 'gather', outcome: 'success' },
      { choice: 'prepare', outcome: 'success' },
      { choice: 'plant', outcome: 'success' },
      { choice: 'craft', outcome: 'success' },
      { choice: 'sell-gathered', outcome: 'success' },
    ] })
  assert.equal(result.status, 'VALID_POLICY')
  assert.equal(result.checks.successfulFarmActions, 2)
  assert.equal(result.checks.successfulCraftActions, 1)
  assert.equal(result.checks.successfulSellActions, 1)
})

test('life route can explain crafting as impossible only when no legal plan was observed', () => {
  const actions = [{ choice: 'gather', outcome: 'success' }, { choice: 'harvest', outcome: 'success' }]
  const result = evaluateRouteValidity({ route: 'life', seedVariance, skillXpGained: 5, actions,
    craftingEvidence: { legalPlanSeen: false, impossibilityReason: 'All checked recipe plans remained blocked by missing station access.' } })
  assert.equal(result.status, 'VALID_POLICY')
  const invalid = evaluateRouteValidity({ route: 'life', seedVariance, skillXpGained: 5, actions,
    craftingEvidence: { legalPlanSeen: true, impossibilityReason: 'ignored legal plan' } })
  assert.ok(invalid.failures.includes('life-route-had-no-craft-or-verified-impossibility'))
})

test('all-win Adventure needs checked HP transitions and Boss definition IDs', () => {
  const base = { route: 'adventure', seedVariance, rankEvidence: noHigherRanks,
    actions: [{ outcome: 'success', policyHalf: 'adventure' }], encounters: [{ outcome: 'win', rank: 'normal' }] }
  assert.ok(evaluateRouteValidity(base).failures.includes('all-wins-lack-verified-explanation'))
  const explained = evaluateRouteValidity({ ...base, allWinsExplanation: {
    text: 'Every encounter has HP before/after; no Boss definition was engaged in this seed.',
    hpBeforeAfterChecked: true, rankCatalogChecked: true, bossDefinitionIdsChecked: true,
  } })
  assert.equal(explained.status, 'VALID_POLICY')
})

test('Adventure fails when it skips an eligible higher rank', () => {
  const result = evaluateRouteValidity({ route: 'adventure', seedVariance,
    rankEvidence: { higherRankEligibleCount: 4 },
    actions: [{ outcome: 'success', policyHalf: 'adventure' }], encounters: [{ outcome: 'win', rank: 'normal' }] })
  assert.ok(result.failures.includes('adventure-route-ignored-eligible-higher-rank'))
})

test('Adventure accepts a higher-rank encounter when one was legally available', () => {
  const result = evaluateRouteValidity({ route: 'adventure', seedVariance,
    rankEvidence: { higherRankEligibleCount: 1 },
    actions: [{ outcome: 'success', policyHalf: 'adventure' }], encounters: [{ outcome: 'retreat', rank: 'elite' }] })
  assert.equal(result.status, 'VALID_POLICY')
})

test('Adventure must engage every higher rank that was legally observed', () => {
  const result = evaluateRouteValidity({ route: 'adventure', seedVariance,
    rankEvidence: { higherRankEligibleCount: 2, eligibleByRank: { elite: { wolfElite: 1 }, miniBoss: {}, boss: {} } },
    actions: [{ outcome: 'success', policyHalf: 'adventure' }], encounters: [{ outcome: 'retreat', rank: 'normal' }] })
  assert.ok(result.failures.includes('adventure-route-ignored-eligible-higher-rank'))
  assert.ok(result.failures.includes('adventure-route-ignored-eligible-rank:elite'))
})

test('Adventure must record why no higher rank was available', () => {
  const result = evaluateRouteValidity({ route: 'adventure', seedVariance,
    actions: [{ outcome: 'success', policyHalf: 'adventure' }], encounters: [{ outcome: 'win', rank: 'normal' }] })
  assert.ok(result.failures.includes('adventure-route-did-not-record-why-no-higher-rank-was-available'))
})

test('hybrid route must complete both policy halves', () => {
  const result = evaluateRouteValidity({ route: 'hybrid', seedVariance,
    actions: [{ choice: 'gather', outcome: 'success', policyHalf: 'life' }], encounters: [] })
  assert.deepEqual(result.failures, ['hybrid-route-did-not-complete-adventure-half'])
})

test('no-progress outcomes require a category and reason', () => {
  const result = evaluateRouteValidity({ route: 'life', seedVariance, skillXpGained: 1, actions: [
    { choice: 'gather', outcome: 'success' }, { choice: 'plant', outcome: 'success' },
    { choice: 'plant', noProgress: true },
  ], craftingEvidence: { legalPlanSeen: false, impossibilityReason: 'No recipe plan was legal.' } })
  assert.equal(result.status, 'INVALID_POLICY')
  assert.equal(result.checks.unclassifiedNoProgressActions, 1)
})
