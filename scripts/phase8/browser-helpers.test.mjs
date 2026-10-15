import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyNoProgress, summarizeNoProgress } from './browser-helpers.mjs'

test('classifies visible UI, resource, runner, wait, and goal no-progress causes', () => {
  assert.equal(classifyNoProgress({ detail: { reason: 'ui-control-unavailable' } }), 'ui')
  assert.equal(classifyNoProgress({ detail: { reason: 'resource-blocked' } }), 'resource')
  assert.equal(classifyNoProgress({ detail: { reason: 'runner-error' } }), 'runner')
  assert.equal(classifyNoProgress({ action: '等待 1 日' }), 'wait')
  assert.equal(classifyNoProgress({ action: '生活路線採集' }), 'goal')
})

test('summarizes only no-progress actions and preserves explicit reason classes', () => {
  assert.deepEqual(summarizeNoProgress([
    { action: '收割', detail: { noProgress: true, noProgressClass: 'resource' } },
    { action: '等待 1 日', detail: { noProgress: true } },
    { action: '採集', detail: { noProgress: false } },
  ]), { resource: 1, wait: 1 })
})
