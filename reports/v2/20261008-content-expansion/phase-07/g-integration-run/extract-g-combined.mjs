import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'

const output = process.argv[2]
if (!output) throw new Error('Usage: node extract-g-combined.mjs <output-directory>')
await mkdir(output, { recursive: true })
const catalogs = ['families', 'monsters', 'lootTables', 'equipment', 'materials', 'crops', 'cropGoods', 'recipes', 'affixes']
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true }, appType: 'custom' })
try {
  const { CONTENT_PACKS } = await vite.ssrLoadModule('/src/data/contentRegistry.ts')
  if (CONTENT_PACKS.length !== 7) throw new Error(`Expected six F packs plus G crop pack; received ${CONTENT_PACKS.length}`)
  const merged = Object.fromEntries(catalogs.map(name => [name, []]))
  let familyPackIndex = 0
  const packs = CONTENT_PACKS.map(pack => {
    const bytes = Buffer.from(JSON.stringify(pack))
    const name = pack.crops.length || pack.cropGoods.length ? 'g-crops' : `f-pack-${++familyPackIndex}`
    for (const catalog of catalogs) merged[catalog].push(...pack[catalog])
    return { name, sha256: sha(bytes), bytes: bytes.length, counts: Object.fromEntries(catalogs.map(catalog => [catalog, pack[catalog].length])) }
  })
  const bytes = Buffer.from(JSON.stringify(merged))
  await writeFile(join(output, 'seven-pack-combined.json'), bytes, { flag: 'wx' })
  const manifest = { source: 'Vite SSR CONTENT_PACKS registry', contentPackCount: CONTENT_PACKS.length, packs, combined: { file: 'seven-pack-combined.json', sha256: sha(bytes), bytes: bytes.length, counts: Object.fromEntries(catalogs.map(catalog => [catalog, merged[catalog].length])) } }
  await writeFile(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`)
} finally { await vite.close() }
