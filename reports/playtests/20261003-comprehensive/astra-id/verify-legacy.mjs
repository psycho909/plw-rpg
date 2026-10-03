import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
const baseline = await createServer({ root: '/tmp/plw-rpg-baseline-694c6d76', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const fixed = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
try {
  const sim = await baseline.ssrLoadModule('/src/engine/simulation.ts')
  const actions = await baseline.ssrLoadModule('/src/engine/actions.ts')
  const oldSave = await baseline.ssrLoadModule('/src/services/saveService.ts')
  const save = await fixed.ssrLoadModule('/src/services/saveService.ts')
  const rows = []
  function check(label, s) {
    const raw = oldSave.serialize(s, 0)
    assert.deepEqual(save.deserialize(raw).state, s)
    rows.push({ label, acceptedUnchanged: true, version: s.saveVersion })
  }
  const s = sim.createGame(909); check('baseline new game', s)
  sim.walkTo(s, { x: 16, y: 10 })
  for (let i = 0; i < 4; i++) { assert.equal(actions.farm(s, 'prepare'), ''); assert.equal(actions.farm(s, 'plant'), '') }
  check('baseline four crops', s)
  sim.simulate(s, 500 * 120 * 1440); check('baseline 500 years and deceased player', s)
  assert.equal(sim.chooseSuccessor(s, s.npcs.find(n => n.isAlive && n.age >= 15).id), true)
  check('baseline successor', s)
  await writeFile(new URL('./legacy-results.json', import.meta.url), JSON.stringify(rows, null, 2) + '\n')
  console.log(rows)
} finally { await baseline.close(); await fixed.close() }
