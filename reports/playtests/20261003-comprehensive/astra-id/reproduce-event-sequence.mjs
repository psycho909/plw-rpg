import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
const root = '/tmp/plw-rpg-baseline-694c6d76'
const server = await createServer({ root, server: { middlewareMode: true, hmr: false }, appType: 'custom' })
try {
  const sim = await server.ssrLoadModule('/src/engine/simulation.ts')
  const actions = await server.ssrLoadModule('/src/engine/actions.ts')
  const save = await server.ssrLoadModule('/src/services/saveService.ts')
  const s = sim.createGame(909)
  sim.walkTo(s, { x: 16, y: 10 })
  assert.equal(actions.farm(s, 'prepare'), '')
  assert.equal(actions.farm(s, 'prepare'), '')
  assert.equal(actions.farm(s, 'plant'), '')
  const originalSequence = s.eventSequence
  s.eventSequence = s.crops[0].id - 1
  const loaded = save.deserialize(save.serialize(s, 0)).state
  assert.equal(actions.farm(loaded, 'plant'), '')
  const ids = loaded.crops.map(c => c.id)
  assert.equal(ids[0], ids[1])
  sim.simulate(loaded, 2 * 1440)
  const food = sim.player(loaded).inventory.food
  assert.equal(actions.farm(loaded, 'harvest'), '')
  assert.equal(loaded.crops.length, 0)
  const result = { baseline: '694c6d76df67e3d3dd4da5aa98feba8581ecc2ba', mode: 'controlled eventSequence rollback only', originalSequence, corruptedSequence: s.eventSequence, accepted: true, resultingCropIds: ids, cropsAfterOneHarvest: loaded.crops.length, foodReceived: sim.player(loaded).inventory.food - food }
  await writeFile(new URL('./event-sequence-baseline.json', import.meta.url), JSON.stringify(result, null, 2) + '\n')
  console.log(result)
} finally { await server.close() }
