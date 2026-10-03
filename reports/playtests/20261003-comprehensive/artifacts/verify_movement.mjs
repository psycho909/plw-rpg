// Exhaustive walkable-grid traversal through public APIs, with an independent
// Manhattan-distance oracle for the current unobstructed interior map contract.
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const started = performance.now(), server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const result = { started_at: new Date().toISOString(), mode: 'public engine; no fixtures', seeds: [], source_sha256: {} }
for (const f of ['src/engine/simulation.ts', 'src/engine/actions.ts', 'src/services/saveService.ts']) result.source_sha256[f] = createHash('sha256').update(await readFile(f)).digest('hex')
try {
  const sim = await server.ssrLoadModule('/src/engine/simulation.ts')
  const actions = await server.ssrLoadModule('/src/engine/actions.ts')
  const save = await server.ssrLoadModule('/src/services/saveService.ts')
  for (const seed of [0, 1, 42, 321, 909, 2026, 123456789, 4294967295]) {
    const s = sim.createGame(seed), start = s.worldTime
    let visited = 0, minutes = 0, rejected = 0
    for (let y = 1; y <= 14; y++) {
      for (const x of Array.from({ length: 22 }, (_, i) => y % 2 ? i + 1 : 22 - i)) {
        const before = { ...sim.player(s).position }, time = s.worldTime
        const distance = Math.abs(before.x - x) + Math.abs(before.y - y)
        assert.equal(sim.walkTo(s, { x, y }), true)
        assert.deepEqual(sim.player(s).position, { x, y })
        assert.equal(s.worldTime - time, distance * 5)
        minutes += distance * 5; visited++
      }
    }
    assert.equal(visited, s.tiles.filter(t => t.walkable).length)
    for (const tile of s.tiles.filter(t => !t.walkable)) {
      const before = structuredClone(s)
      assert.equal(sim.walkTo(s, { x: tile.x, y: tile.y }), false)
      assert.deepEqual(s, before); rejected++
    }
    for (const delta of [[1, 1], [0, 0], [2, 0], [-2, 0]]) {
      const before = structuredClone(s)
      assert.equal(sim.movePlayer(s, ...delta), false)
      assert.deepEqual(s, before); rejected++
    }
    assert.equal(s.worldTime - start, minutes)
    assert.equal(s.dungeon.discovered, true)
    assert.equal(s.regions.unknown.discovered, true)
    assert.deepEqual(save.deserialize(save.serialize(s, 0)).state, s)
    sim.walkTo(s, { x: 5, y: 4 })
    assert.equal(actions.encounter(s), '')
    const inCombat = structuredClone(s)
    assert.equal(sim.movePlayer(s, 1, 0), false)
    assert.equal(sim.walkTo(s, { x: 7, y: 9 }), false)
    assert.deepEqual(s, inCombat)
    assert.equal(actions.combatTurn(s, 'run'), '')
    sim.walkTo(s, { x: 20, y: 3 })
    assert.equal(actions.enterDungeon(s), '')
    const inDungeon = structuredClone(s)
    assert.equal(sim.movePlayer(s, 1, 0), false)
    assert.equal(sim.walkTo(s, { x: 7, y: 9 }), false)
    assert.deepEqual(s, inDungeon)
    assert.equal(actions.leaveDungeon(s), '')
    result.seeds.push({ seed, visited_walkable_tiles: visited, invalid_moves_rejected_without_mutation: rejected + 4, traversal_minutes: minutes, status: 'passed' })
  }
  result.elapsed_seconds = (performance.now() - started) / 1000
  result.status = 'passed'
  await writeFile(new URL('./movement-results.json', import.meta.url), JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result))
} finally { await server.close() }
