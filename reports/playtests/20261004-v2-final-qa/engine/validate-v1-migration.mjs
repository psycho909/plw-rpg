import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const repo = '/workspace/plw-rpg'
const base = resolve(repo, 'reports/playtests/20261004-v2-final-qa/engine')
const fixtureDir = resolve(base, 'fixtures')
const out = resolve(base, 'migration-results.json')
const sourceFiles = [
  'src/engine/simulation.ts', 'src/engine/lifeState.ts', 'src/engine/random.ts',
  'src/engine/npcLife.ts', 'src/engine/livingEvents.ts', 'src/services/saveService.ts',
  'src/domain/types.ts', 'src/domain/life.ts', 'src/data/config.ts', 'src/data/identity.ts',
  'src/data/npcLife.ts', 'src/data/ownership.ts', 'src/data/livingEvents.ts',
]
const sourceSha256 = Object.fromEntries(sourceFiles.map(file => [
  file, createHash('sha256').update(readFileSync(resolve(repo, file))).digest('hex'),
]))
const metadata = {
  sourceCommit: execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceSha256,
  executedAt: new Date().toISOString(),
  fixtures: [],
  status: 'RUNNING',
}
const server = await createServer({
  configFile: false,
  root: repo,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

const fieldCount = value => {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + fieldCount(item), 0)
  if (value && typeof value === 'object') return Object.entries(value).reduce((sum, [, item]) => sum + 1 + fieldCount(item), 0)
  return 0
}
const remove = (object, ...keys) => { for (const key of keys) delete object[key] }

try {
  const { deserialize, serialize } = await server.ssrLoadModule('/src/services/saveService.ts')
  const { simulate } = await server.ssrLoadModule('/src/engine/simulation.ts')
  const fixtureFiles = readdirSync(fixtureDir).filter(file => file.endsWith('.json') && file !== 'manifest.json').sort()
  assert(fixtureFiles.length >= 6, `expected >=6 native V1 fixtures, got ${fixtureFiles.length}`)

  for (const file of fixtureFiles) {
    const fixture = JSON.parse(readFileSync(resolve(fixtureDir, file), 'utf8'))
    const expectedLegacy = structuredClone(fixture)
    const expectedLastSavedAt = expectedLegacy.lastSavedAt
    remove(expectedLegacy, 'lastSavedAt', 'saveVersion')
    assert.equal(fixture.saveVersion, 1)
    assert.equal(Object.hasOwn(fixture, 'life'), false)
    assert([...fixture.events, ...fixture.history].every(event => !Object.hasOwn(event, 'tier')))

    const migrated = deserialize(JSON.stringify(fixture))
    assert.equal(migrated.state.saveVersion, 2)
    assert.equal(migrated.lastSavedAt, expectedLastSavedAt)
    assert.equal(migrated.state.worldSeed, fixture.worldSeed)
    assert.equal(migrated.state.rngState, fixture.rngState)
    assert.equal(migrated.state.worldTime, fixture.worldTime)

    const migratedLegacy = JSON.parse(serialize(migrated.state, migrated.lastSavedAt))
    remove(migratedLegacy, 'lastSavedAt', 'saveVersion', 'life')
    assert.deepEqual(migratedLegacy, expectedLegacy, `${file}: legacy field preservation`)

    assert.equal(migrated.state.characters.length, fixture.characters.length)
    assert.equal(migrated.state.npcs.length, fixture.npcs.length)
    assert.deepEqual(migrated.state.history, fixture.history)
    assert.deepEqual(migrated.state.threat, fixture.threat)
    assert.deepEqual(migrated.state.settlement, fixture.settlement)
    assert.deepEqual(migrated.state.dungeon, fixture.dungeon)
    assert.deepEqual(migrated.state.party, fixture.party)
    for (const character of fixture.characters) assert(migrated.state.life.characters[character.id])
    for (const npc of fixture.npcs) {
      const life = migrated.state.life.npcs[npc.id]
      assert(life)
      assert.equal(life.careerJob, npc.job)
      assert(life.traits.length > 0)
    }
    assert.equal(migrated.state.life.openingSeen, true)
    assert.equal(migrated.state.life.canon, 'OAKVALE_LIFE_EMERGENCE')

    const once = serialize(migrated.state, migrated.lastSavedAt)
    const reloaded = deserialize(once)
    assert.deepEqual(reloaded.state, migrated.state, `${file}: V2 save/reload`)
    assert.equal(reloaded.lastSavedAt, migrated.lastSavedAt)
    const twice = serialize(reloaded.state, reloaded.lastSavedAt)
    assert.equal(twice, once, `${file}: migration must be idempotent`)

    const continuing = deserialize(once).state
    const reloadedBranch = deserialize(serialize(continuing, migrated.lastSavedAt)).state
    simulate(continuing, 3 * 1440)
    simulate(reloadedBranch, 3 * 1440)
    assert.deepEqual(reloadedBranch, continuing, `${file}: deterministic continuation after reload`)
    assert(reloadedBranch.worldTime >= fixture.worldTime)

    const fixtureManifest = JSON.parse(readFileSync(resolve(fixtureDir, 'manifest.json'), 'utf8'))
      .fixtures.find(entry => entry.file.endsWith(file))
    metadata.fixtures.push({
      file: `fixtures/${file}`,
      fixtureSha256: createHash('sha256').update(readFileSync(resolve(fixtureDir, file))).digest('hex'),
      generatedAtV1Commit: fixtureManifest ? '75662ae3b5aa4045976a2844b41c01d4bbcef340' : 'unmapped',
      purpose: fixtureManifest?.purpose ?? '',
      legacyRecursiveFieldsCompared: fieldCount(expectedLegacy),
      legacyWorldFieldsPreserved: true,
      rngStatePreserved: true,
      worldTimePreserved: true,
      historyThreatSettlementDungeonPartyPreserved: true,
      newV2DefaultsValid: true,
      v2ReloadExact: true,
      idempotent: true,
      deterministicThreeDayContinuation: true,
      initialPopulation: fixture.npcs.length + fixture.characters.filter(character => character.isAlive).length,
      finalPopulationAfterContinuation: reloadedBranch.npcs.filter(npc => npc.isAlive).length + reloadedBranch.characters.filter(character => character.isAlive).length,
    })
  }

  metadata.status = 'PASS'
  metadata.failingTest = null
} catch (error) {
  metadata.status = 'FAIL'
  metadata.failingTest = {
    message: String(error?.message ?? error),
    stack: String(error?.stack ?? ''),
  }
  writeFileSync(out, `${JSON.stringify(metadata, null, 2)}\n`)
  execFileSync('python3', ['scripts/recorded_reports.py', 'publish', out], {
    cwd: repo, input: readFileSync(out), stdio: ['pipe', 'inherit', 'inherit'],
  })
  throw error
} finally {
  await server.close()
}

writeFileSync(out, `${JSON.stringify(metadata, null, 2)}\n`)
execFileSync('python3', ['scripts/recorded_reports.py', 'publish', out], {
  cwd: repo, input: readFileSync(out), stdio: ['pipe', 'inherit', 'inherit'],
})
console.log(JSON.stringify(metadata, null, 2))
