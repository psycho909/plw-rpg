import { createServer } from 'vite'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const outputDirectory = process.argv[2]
if (!outputDirectory) throw new Error('Usage: node extract.mjs <output-directory>')
await mkdir(outputDirectory, { recursive: true })

const definitions = [
  { id: 'slime', module: '/src/data/content/slime.ts', exportName: 'SLIME_CONTENT' },
  { id: 'cave-insects', module: '/src/data/content/caveInsects.ts', exportName: 'CAVE_INSECT_CONTENT' },
  { id: 'wild-beasts', module: '/src/data/content/wildBeasts.ts', exportName: 'WILD_BEAST_CONTENT' },
  { id: 'frontier-goblins', module: '/src/data/content/frontierGoblins.ts', exportName: 'FRONTIER_GOBLIN_CONTENT' },
  { id: 'fog-undead', module: '/src/data/content/fogUndead.ts', exportName: 'FOG_UNDEAD_CONTENT' },
  { id: 'mine-constructs', module: '/src/data/content/mineConstructs.ts', exportName: 'MINE_CONSTRUCT_CONTENT' },
]
const fresh = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  server: { middlewareMode: true },
  appType: 'custom',
})
try {
  const packs = new Map()
  const packArtifacts = {}
  for (const definition of definitions) {
    const imported = await fresh.ssrLoadModule(definition.module)
    const pack = imported[definition.exportName]
    if (!pack || !Array.isArray(pack.monsters) || !Array.isArray(pack.materials)) {
      throw new Error(`Missing or malformed ${definition.exportName} from ${definition.module}`)
    }
    packs.set(definition.id, pack)
    if (['wild-beasts', 'frontier-goblins', 'fog-undead', 'mine-constructs'].includes(definition.id)) {
      const bytes = Buffer.from(JSON.stringify(pack))
      const name = `${definition.id}.json`
      await writeFile(join(outputDirectory, name), bytes, { flag: 'wx' })
      const packSha256 = createHash('sha256').update(bytes).digest('hex')
      packArtifacts[definition.id] = { file: name, bytes: bytes.length, sha256: packSha256 }
      process.stdout.write(`${name} bytes=${bytes.length} sha256=${packSha256}\n`)
    }
  }

  const combined = {}
  for (const pack of packs.values()) {
    for (const [key, value] of Object.entries(pack)) {
      if (Array.isArray(value)) (combined[key] ??= []).push(...value)
    }
  }
  const combinedBytes = Buffer.from(JSON.stringify(combined))
  await writeFile(join(outputDirectory, 'six-family-combined.json'), combinedBytes, { flag: 'wx' })
  const combinedSha256 = createHash('sha256').update(combinedBytes).digest('hex')
  packArtifacts['six-family-combined'] = { file: 'six-family-combined.json', bytes: combinedBytes.length, sha256: combinedSha256 }
  const counts = Object.fromEntries(Object.entries(combined).map(([key, value]) => [key, value.length]))
  const perFamily = Object.fromEntries([...packs].map(([id, pack]) => [id, Object.fromEntries(
    Object.entries(pack).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length]),
  )]))
  const manifest = {
    generatedAt: new Date().toISOString(),
    generation: 'Vite SSR imports from current TypeScript source; JSON.stringify bytes, no trailing newline',
    definitions,
    packArtifacts,
    packCounts: perFamily,
    combinedCounts: counts,
    combinedBytes: combinedBytes.length,
    combinedSha256,
  }
  await writeFile(join(outputDirectory, 'extraction-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  process.stdout.write(`six-family-combined.json bytes=${combinedBytes.length} sha256=${combinedSha256}\n`)
} finally {
  await fresh.close()
}
