import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createServer } from 'vite'

const WORLD_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(WORLD_DIR, '../../../..')
const SOURCE_ROOT = '/tmp/plw-rpg-qa-source-738bc00'
const WRITER = join(REPO_ROOT, 'scripts/recorded_reports.py')
const MANIFEST = JSON.parse(readFileSync(join(REPO_ROOT, 'reports/playtests/20261004-deep-qa/baseline/manifest.json'), 'utf8'))
const FILES = [
  'src/data/config.ts',
  'src/domain/types.ts',
  'src/engine/actions.ts',
  'src/engine/calendar.ts',
  'src/engine/events.ts',
  'src/engine/random.ts',
  'src/engine/simulation.ts',
  'src/services/saveService.ts',
]
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

function publish(name, value) {
  const body = typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`
  const result = spawnSync('python3', ['-B', WRITER, 'publish', join(WORLD_DIR, name), '--producer', 'deep-qa-world-fixture'], {
    cwd: REPO_ROOT,
    input: body,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  if (result.error || result.status !== 0) throw new Error(`write_recorded failed for ${name}: ${result.error?.message ?? result.stderr ?? result.status}`)
}

async function main() {
  assert.equal(MANIFEST.sourceCommit, '738bc0010c549fa3fb2420437d171f5aa2a043a0')
  const sourceHashes = Object.fromEntries(FILES.map((file) => {
    const actual = sha256(readFileSync(join(SOURCE_ROOT, file)))
    assert.equal(actual, MANIFEST.sourceHashes[file], `source hash mismatch: ${file}`)
    return [file, actual]
  }))
  const vite = await createServer({ root: SOURCE_ROOT, configFile: false, appType: 'custom', logLevel: 'error', server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } })
  try {
    const [simulation, save] = await Promise.all([
      vite.ssrLoadModule('/src/engine/simulation.ts'),
      vite.ssrLoadModule('/src/services/saveService.ts'),
    ])
    const fixtures = []

    const overcapacity = simulation.createGame(73004)
    const templates = overcapacity.npcs.map((npc) => structuredClone(npc))
    while (overcapacity.npcs.length < 1000) {
      const template = templates[(overcapacity.npcs.length - templates.length) % templates.length]
      const npc = structuredClone(template)
      const id = overcapacity.nextNpcId++
      npc.id = `npc-${id}`
      npc.name = `QA overcapacity resident ${id}`
      overcapacity.npcs.push(npc)
    }
    overcapacity.settlement.stage = 'hamlet'
    overcapacity.settlement.capacity = 40
    const overcapacityRaw = save.serialize(overcapacity, Date.now())
    assert.equal(save.deserialize(overcapacityRaw).state.npcs.length, 1000)
    assert.equal(simulation.population(overcapacity), 1001)
    publish('population-overcapacity-save.json', overcapacityRaw)
    fixtures.push({
      file: 'population-overcapacity-save.json',
      kind: 'controlled schema-valid overcapacity fixture',
      source: 'createGame(73004) plus cloned original NPC schema rows with unique sequential IDs',
      naturallyPlayerReachable: false,
      population: simulation.population(overcapacity),
      npcRows: overcapacity.npcs.length,
      capacity: overcapacity.settlement.capacity,
      bytes: Buffer.byteLength(overcapacityRaw),
      sha256: sha256(overcapacityRaw),
      decoderAccepted: true,
      lastSavedAt: JSON.parse(overcapacityRaw).lastSavedAt,
    })

    const zero = simulation.createGame(73005)
    for (const character of [...zero.characters, ...zero.npcs]) simulation.die(zero, character, 'controlled zero-population fixture')
    const zeroRaw = save.serialize(zero, Date.now())
    assert.equal(simulation.population(save.deserialize(zeroRaw).state), 0)
    publish('population-zero-save.json', zeroRaw)
    fixtures.push({
      file: 'population-zero-save.json',
      kind: 'controlled zero-population dead-active-character fixture',
      source: 'createGame(73005) followed by exported die() for every resident',
      naturallyPlayerReachable: false,
      population: simulation.population(zero),
      npcRows: zero.npcs.length,
      activeCharacterAlive: simulation.player(zero).isAlive,
      bytes: Buffer.byteLength(zeroRaw),
      sha256: sha256(zeroRaw),
      decoderAccepted: true,
      lastSavedAt: JSON.parse(zeroRaw).lastSavedAt,
    })

    const metadata = {
      createdAt: new Date().toISOString(),
      sourceCommit: MANIFEST.sourceCommit,
      sourceRoot: SOURCE_ROOT,
      sourceHashes,
      fixtures,
      note: 'Raw fixtures were published through scripts.recorded_reports.write_recorded and are loaded only in disposable Chromium contexts on localhost:5192.',
    }
    publish('browser-fixtures.json', metadata)
    console.log(JSON.stringify(metadata, null, 2))
  } finally {
    await vite.close()
  }
}

main().catch((error) => {
  console.error(error?.stack ?? String(error))
  process.exitCode = 1
})
