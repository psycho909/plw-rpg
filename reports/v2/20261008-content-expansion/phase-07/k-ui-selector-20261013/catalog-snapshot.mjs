import { createServer } from 'vite'
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const out = resolve(root, 'reports/v2/20261008-content-expansion/phase-07/k-ui-selector-20261013/catalog-snapshot.json')
const sha = (data) => createHash('sha256').update(data).digest('hex')
async function files(dir) {
  const result = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) result.push(...await files(path))
    else result.push(path)
  }
  return result
}
const sourceFiles = (await files(resolve(root, 'src'))).sort()
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (path) => [relative(root, path).replaceAll('\\', '/'), sha(await readFile(path))])))
const sourceFingerprint = sha(JSON.stringify(Object.fromEntries(Object.entries(sourceHashes).sort(([a], [b]) => a.localeCompare(b)))))
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const server = await createServer({ configFile: resolve(root, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'custom' })
try {
  const { CONTENT_FAMILIES, CONTENT_MONSTERS, CONTENT_CROPS, CONTENT_CROP_GOODS, CONTENT_RECIPES } = await server.ssrLoadModule('/src/data/contentRegistry.ts')
  const { ITEM_BASES, MATERIALS, AFFIXES } = await server.ssrLoadModule('/src/data/rewards.ts')
  const { CRAFTING_RECIPES } = await server.ssrLoadModule('/src/data/crafting.ts')
  const monsters = Object.values(CONTENT_MONSTERS)
  const snapshot = {
    schema: 'phase7-content-catalog-snapshot-v1',
    generatedAtUTC: new Date().toISOString(),
    head,
    sourceFingerprint,
    sourceFiles: sourceHashes,
    counts: {
      families: Object.keys(CONTENT_FAMILIES).length,
      monsters: monsters.length,
      monsterRanks: Object.fromEntries([...new Set(monsters.map(item => item.rank))].sort().map(rank => [rank, monsters.filter(item => item.rank === rank).length])),
      equipmentBases: Object.keys(ITEM_BASES).length,
      materials: Object.keys(MATERIALS).length,
      recipes: Object.keys(CRAFTING_RECIPES).length,
      contentRecipes: Object.keys(CONTENT_RECIPES).length,
      crops: Object.keys(CONTENT_CROPS).length,
      cropGoods: Object.keys(CONTENT_CROP_GOODS).length,
      affixes: Object.keys(AFFIXES).length,
    },
    families: CONTENT_FAMILIES,
    monsters: CONTENT_MONSTERS,
    equipment: ITEM_BASES,
    materials: MATERIALS,
    recipes: CRAFTING_RECIPES,
    crops: CONTENT_CROPS,
    cropGoods: CONTENT_CROP_GOODS,
  }
  await writeFile(out, JSON.stringify(snapshot, null, 2) + '\n')
  console.log(JSON.stringify({ status: 'PASS', path: relative(root, out), head, sourceFingerprint, counts: snapshot.counts }, null, 2))
} finally {
  await server.close()
}
