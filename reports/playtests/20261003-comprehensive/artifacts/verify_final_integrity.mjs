// Independent final-source continuation check, following natural yearly aging.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
const start = performance.now(), server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const out = { started_at: new Date().toISOString(), mode: 'final-source public engine, yearly steps; ID corruption cases separately', source_sha256: {}, seeds: [], rejected_fixtures: [] }
for (const f of ['src/engine/simulation.ts', 'src/engine/actions.ts', 'src/services/saveService.ts']) out.source_sha256[f] = createHash('sha256').update(await readFile(f)).digest('hex')
try {
  const sim = await server.ssrLoadModule('/src/engine/simulation.ts'), action = await server.ssrLoadModule('/src/engine/actions.ts'), save = await server.ssrLoadModule('/src/services/saveService.ts')
  for (const name of ['id-npc-input.json', 'id-crop-input.json']) {
    const raw = await readFile(new URL('./' + name, import.meta.url), 'utf8')
    assert.throws(() => save.deserialize(raw), /原始存檔已保留/)
    out.rejected_fixtures.push(name)
  }
  const sequence = sim.createGame(909)
  sim.walkTo(sequence, { x: 16, y: 10 })
  action.farm(sequence, 'prepare'); action.farm(sequence, 'prepare'); action.farm(sequence, 'plant')
  sequence.eventSequence = sequence.crops[0].id - 1
  const badSequence = save.serialize(sequence, Date.now())
  assert.throws(() => save.deserialize(badSequence), /原始存檔已保留/)
  await writeFile(new URL('./id-sequence-input.json', import.meta.url), badSequence)
  out.rejected_fixtures.push('id-sequence-input.json')

  const farm = sim.createGame(909)
  sim.walkTo(farm, { x: 16, y: 10 })
  for (let i = 0; i < 4; i++) { assert.equal(action.farm(farm, 'prepare'), ''); assert.equal(action.farm(farm, 'plant'), '') }
  sim.simulate(farm, 2 * 1440)
  assert.deepEqual(save.deserialize(save.serialize(farm, 0)).state, farm)
  for (let left = 3; left >= 0; left--) {
    assert.equal(action.farm(farm, 'harvest'), '')
    assert.equal(farm.crops.length, left)
    assert.deepEqual(save.deserialize(save.serialize(farm, 0)).state, farm)
  }
  out.normal_farming = 'four normal crops round-trip; each harvest removes exactly one'

  for (const seed of [0, 1, 42, 321, 909, 4294967295, 7, 20261003]) {
    let s = sim.createGame(seed), successors = 0
    for (let year = 1; year <= 500; year++) {
      sim.simulate(s, 120 * 1440)
      if (!sim.player(s).isAlive) {
        assert.equal(sim.player(s).deathCause, '自然老化')
        assert.deepEqual(save.deserialize(save.serialize(s, 0)).state, s)
        const heir = s.npcs.filter(n => n.isAlive && n.age >= 15).sort((a, b) => a.age - b.age || a.id.localeCompare(b.id))[0]
        assert.ok(heir); assert.equal(sim.chooseSuccessor(s, heir.id), true)
        successors++
      }
      const loaded = save.deserialize(save.serialize(s, 0)).state
      assert.deepEqual(loaded, s)
      s = loaded
    }
    assert.equal(s.worldTime, 480 + 500 * 120 * 1440)
    assert.equal(s.settlement.stage, 'town')
    assert.equal(sim.population(s), 80)
    out.seeds.push({ seed, years: 500, yearly_round_trips: 500, successors, status: 'passed' })
    if (seed === 909) await writeFile(new URL('./long-world-final-save.json', import.meta.url), save.serialize(s, Date.now()))
  }
  out.status = 'passed'
  out.elapsed_seconds = (performance.now() - start) / 1000
  await writeFile(new URL('./final-integrity-results.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
  console.log(JSON.stringify(out))
} finally { await server.close() }
