import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyNoProgress, gapSummary, joinZeroXpCraftEventsToDecisions, percentile } from './pacing-analysis-core.mjs'

test('percentile uses nearest-rank and returns null for no samples', () => {
  assert.equal(percentile([9, 1, 4, 7], .5), 4)
  assert.equal(percentile([], .9), null)
})

test('gap summary includes leading, between-event, and trailing intervals', () => {
  const result = gapSummary([{ at: 20, actionIndex: 2 }, { at: 50, actionIndex: 6 }], 10, 90, () => 14)
  assert.deepEqual(result.minutes, { samples: 3, median: 30, p90: 40, max: 40 })
  assert.deepEqual(result.actions, { samples: 3, median: 4, p90: 8, max: 8 })
})

test('craft event time joins to its own decision after earlier XP-yielding crafts', () => {
  const decisions = Array.from({ length: 8 }, (_, index) => ({
    decisionId: `life/seed/${index}`,
    before: { worldTime: (index + 1) * 100 },
    chosenAction: [{ choice: 'craft' }],
  }))
  const crafts = Array.from({ length: 7 }, (_, index) => ({
    instanceId: `item-${index + 1}`,
    at: (index + 1) * 100 + 5,
    practiceXpAward: index < 6 ? 10 : 0,
  }))
  const joinedZeroXpEvents = joinZeroXpCraftEventsToDecisions(crafts, decisions)
  assert.equal(joinedZeroXpEvents.length, 1)
  const joinedZeroXpEvent = joinedZeroXpEvents[0]
  assert.equal(joinedZeroXpEvent.eventId, 'item-7')
  assert.equal(joinedZeroXpEvent.decision.decisionId, 'life/seed/6')
})

test('no-progress classifier distinguishes runner markers, waits, resource cues, and unknowns', () => {
  assert.equal(classifyNoProgress({ choice: 'life-policy-no-action' }).category, 'no understandable next goal')
  assert.equal(classifyNoProgress({ choice: 'wait-for-store-open', at: 1200 }).category, 'legitimate world wait')
  assert.equal(classifyNoProgress({ choice: 'craft', reason: 'insufficient gold' }).category, 'lacking resources')
  assert.equal(classifyNoProgress({ choice: 'blocked', reason: '' }).confidence, 'low')
})
