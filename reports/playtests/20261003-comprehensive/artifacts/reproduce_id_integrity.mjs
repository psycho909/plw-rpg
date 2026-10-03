// Controlled corruption of otherwise normally produced saves. Baseline pinned.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'vite'
const baseline = '694c6d76df67e3d3dd4da5aa98feba8581ecc2ba'
const snapshot = await mkdtemp(join(tmpdir(), 'plw-id-baseline-'))
execFileSync('tar', ['-xf', '-', '-C', snapshot], { input: execFileSync('git', ['archive', baseline, 'src/data', 'src/domain', 'src/engine', 'src/services']) })
await symlink(join(process.cwd(), 'node_modules'), join(snapshot, 'node_modules'), 'dir')
const server = await createServer({ root: snapshot, server: { middlewareMode: true }, appType: 'custom' })
try {
  const sim = await server.ssrLoadModule('/src/engine/simulation.ts'), action = await server.ssrLoadModule('/src/engine/actions.ts'), save = await server.ssrLoadModule('/src/services/saveService.ts')
  const result = { baseline, utc: new Date().toISOString(), mode: 'controlled ID corruption; not normal play', cases: [] }
  const npcInput = sim.createGame(909)
  npcInput.nextNpcId = 1
  const npc = save.deserialize(save.serialize(npcInput, 0)).state
  sim.simulate(npc, 15 * 1440)
  const ids = [...npc.characters, ...npc.npcs].map(c => c.id)
  assert.ok(new Set(ids).size < ids.length)
  let npcReloadError = null
  try { save.deserialize(save.serialize(npc, 0)) } catch (e) { npcReloadError = String(e) }
  assert.ok(npcReloadError)
  result.cases.push({ name: 'nextNpcId collision', initial_corrupt_save_accepted: true, duplicate_ids: ids.filter((id, i) => ids.indexOf(id) !== i), saved_continuation_rejected: true, reload_error: npcReloadError })

  const cropInput = sim.createGame(909)
  sim.walkTo(cropInput, { x: 16, y: 10 })
  for (let i = 0; i < 2; i++) { assert.equal(action.farm(cropInput, 'prepare'), ''); assert.equal(action.farm(cropInput, 'plant'), '') }
  sim.simulate(cropInput, 2 * 1440)
  cropInput.crops[1].id = cropInput.crops[0].id
  const crop = save.deserialize(save.serialize(cropInput, 0)).state
  const food = sim.player(crop).inventory.food, cropCount = crop.crops.length
  assert.equal(action.farm(crop, 'harvest'), '')
  assert.equal(crop.crops.length, 0)
  assert.equal(sim.player(crop).inventory.food - food, 5)
  result.cases.push({ name: 'duplicate crop IDs', initial_corrupt_save_accepted: true, crops_before: cropCount, crops_after_one_harvest: crop.crops.length, food_received: sim.player(crop).inventory.food - food, expected_crops_remaining: 1, unintended_crop_loss: true })
  await writeFile(new URL('./id-integrity-baseline.json', import.meta.url), JSON.stringify(result, null, 2) + '\n')
  await writeFile(new URL('./id-npc-input.json', import.meta.url), save.serialize(npcInput, 0))
  await writeFile(new URL('./id-crop-input.json', import.meta.url), save.serialize(cropInput, 0))
  console.log(JSON.stringify(result))
} finally { await server.close() }
