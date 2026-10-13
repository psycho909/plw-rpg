import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'

const output = process.argv[2]
if (!output) throw new Error('Usage: node extract-six-packs.mjs <output-directory>')
await mkdir(output, { recursive: true })
const packNames = ['slime', 'cave-insects', 'wild-beasts', 'frontier-goblins', 'fog-undead', 'mine-constructs']
const catalogs = ['families', 'monsters', 'lootTables', 'equipment', 'materials', 'crops', 'cropGoods', 'recipes', 'affixes']
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  server: { middlewareMode: true },
  appType: 'custom',
})
try {
  const { CONTENT_PACKS } = await vite.ssrLoadModule('/src/data/contentRegistry.ts')
  if (CONTENT_PACKS.length !== packNames.length) throw new Error(`Expected six CONTENT_PACKS; received ${CONTENT_PACKS.length}`)
  const merged = Object.fromEntries(catalogs.map(name => [name, []]))
  const packArtifacts = {}
  const perPackCounts = {}
  for (let index = 0; index < CONTENT_PACKS.length; index++) {
    const pack = CONTENT_PACKS[index]
    const name = packNames[index]
    const bytes = Buffer.from(JSON.stringify(pack))
    const file = `${name}.json`
    await writeFile(join(output, file), bytes, { flag: 'wx' })
    packArtifacts[name] = { file, bytes: bytes.length, sha256: hash(bytes) }
    perPackCounts[name] = Object.fromEntries(catalogs.map(catalog => [catalog, pack[catalog].length]))
    for (const catalog of catalogs) merged[catalog].push(...pack[catalog])
  }
  const combinedBytes = Buffer.from(JSON.stringify(merged))
  await writeFile(join(output, 'six-family-combined.json'), combinedBytes, { flag: 'wx' })
  packArtifacts['six-family-combined'] = { file: 'six-family-combined.json', bytes: combinedBytes.length, sha256: hash(combinedBytes) }
  const manifest = {
    generatedAtUtc: new Date().toISOString(),
    source: 'Vite SSR import of the current src/data/contentRegistry.ts CONTENT_PACKS array',
    packNames, contentPackCount: CONTENT_PACKS.length, perPackCounts,
    combinedCounts: Object.fromEntries(catalogs.map(catalog => [catalog, merged[catalog].length])),
    packArtifacts,
  }
  await writeFile(join(output, 'extraction-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`)
} finally {
  await vite.close()
}
