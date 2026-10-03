// Public-engine route with no state mutation: new world, village, hire, buy, inn.
import { createServer } from 'vite'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const BASELINE = '694c6d76df67e3d3dd4da5aa98feba8581ecc2ba'
// Reproduction remains pinned even after the working tree is repaired.
const snapshot = await mkdtemp(join(tmpdir(), 'plw-rest-baseline-'))
const archive = execFileSync('git', ['archive', BASELINE, 'src/data', 'src/domain', 'src/engine', 'src/services'])
execFileSync('tar', ['-xf', '-', '-C', snapshot], { input: archive })
await symlink(join(process.cwd(), 'node_modules'), join(snapshot, 'node_modules'), 'dir')
const server = await createServer({ root: snapshot, server: { middlewareMode: true }, appType: 'custom' })
try {
  const sim = await server.ssrLoadModule('/src/engine/simulation.ts')
  const actions = await server.ssrLoadModule('/src/engine/actions.ts')
  const save = await server.ssrLoadModule('/src/services/saveService.ts')
  const s = sim.createGame(909), log = []
  while (s.settlement.stage === 'hamlet') sim.simulate(s, 30 * 1440)
  const minute = s.worldTime % 1440
  sim.simulate(s, (17 * 60 - minute + 1440) % 1440)
  sim.walkTo(s, { x: 11, y: 11 })
  log.push({ action: 'hire', result: actions.hire(s, s.npcs.find(n => n.job === 'mercenary' && n.isAlive && n.age >= 15 && n.injuredUntil <= s.worldTime).id) })
  sim.walkTo(s, { x: 10, y: 8 })
  log.push({ action: 'buy stone twice', result: [actions.trade(s, 'stone', true), actions.trade(s, 'stone', true)] })
  sim.walkTo(s, { x: 7, y: 11 })
  const before = structuredClone(s)
  log.push({ action: 'inn overnight', result: actions.rest(s, 'inn') })
  const after = structuredClone(s)
  let reloadError = null
  try { save.deserialize(save.serialize(s, Date.now())) } catch (e) { reloadError = String(e) }
  assert.equal(sim.player(before).gold, 8)
  assert.equal(sim.player(after).gold, -4)
  assert.ok(reloadError)
  const result = { baseline: BASELINE, mode: 'public engine route; no field injection; pinned git archive', utc: new Date().toISOString(), log, goldBefore: sim.player(before).gold, goldAfter: sim.player(after).gold, timeBefore: before.worldTime, timeAfter: after.worldTime, partyBefore: before.party, partyAfter: after.party, reloadError }
  await writeFile(new URL('./rest-wages-baseline.json', import.meta.url), JSON.stringify(result, null, 2) + '\n')
  await writeFile(new URL('./rest-wages-before.json', import.meta.url), save.serialize(before, Date.now()))
  console.log(JSON.stringify(result))
} finally { await server.close() }
