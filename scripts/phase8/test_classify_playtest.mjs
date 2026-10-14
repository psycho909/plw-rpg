import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyNoProgress, summarizeActions } from './classify-playtest.mjs'

test('classifies wait, resource constraint, UI control, runner exclusion, and ambiguous goal', () => {
  assert.equal(classifyNoProgress({ choice: 'advance' }).category, 'world-wait')
  assert.equal(classifyNoProgress({ choice: 'farm', visibleCue: '材料不足' }).category, 'resource')
  assert.equal(classifyNoProgress({ choice: 'equipment-tab' }).category, 'ui')
  assert.equal(classifyNoProgress({ policyExecution: 'heuristic', stalledControlExcludedNextTurn: true }).category, 'runner')
  assert.equal(classifyNoProgress({ choice: 'observe' }).category, 'goal')
})

test('counts only actions explicitly marked no-progress', () => {
  const result = summarizeActions([{ choice: 'advance', noProgress: true }, { choice: 'farm', noProgress: false }])
  assert.equal(result.actionCount, 2)
  assert.equal(result.noProgressCount, 1)
  assert.equal(result.categories['world-wait'].count, 1)
})
