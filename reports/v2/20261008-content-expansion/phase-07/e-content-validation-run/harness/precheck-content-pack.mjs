import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { createServer } from 'vite'
import { captureRunEvidence } from '../../../../../../scripts/validate_content_evidence.mjs'

const root = resolve(process.cwd())
const runDirectory = resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw new Error('Usage: node precheck-content-pack.mjs <run-directory>')
const packDirectory = join(runDirectory, 'packs')
await mkdir(packDirectory, { recursive: true })
const packPath = join(packDirectory, 'e-six-family-content-pack.json')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const catalogs = ['families', 'monsters', 'lootTables', 'equipment', 'materials', 'crops', 'cropGoods', 'recipes', 'affixes']
const sourcePaths = [
  'src/data/content/slime.ts', 'src/data/content/caveInsects.ts', 'src/data/content/wildBeasts.ts',
  'src/data/content/frontierGoblins.ts', 'src/data/content/fogUndead.ts', 'src/data/content/mineConstructs.ts',
  'src/data/contentRegistry.ts', 'src/domain/content.ts', 'src/engine/contentValidation.ts',
  'scripts/validate_content_evidence.mjs', 'scripts/validate_content_batch.mjs',
  'reports/v2/20261008-content-expansion/phase-07/content-baseline.json',
]

const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  server: { middlewareMode: true },
  appType: 'custom',
})
try {
  const [{ CONTENT_PACKS }, { validateContentPack }] = await Promise.all([
    vite.ssrLoadModule('/src/data/contentRegistry.ts'),
    vite.ssrLoadModule('/src/engine/contentValidation.ts'),
  ])
  const merged = Object.fromEntries(catalogs.map(catalog => [catalog, CONTENT_PACKS.flatMap(pack => pack[catalog])]))
  const packBytes = Buffer.from(JSON.stringify(merged))
  await writeFile(packPath, packBytes, { flag: 'wx' })
  const evidence = await captureRunEvidence({
    root,
    packPath,
    reportDirectory: relative(root, runDirectory),
    sourcePaths,
  })

  const baselineDoc = JSON.parse(await readFile(join(root, 'reports/v2/20261008-content-expansion/phase-07/content-baseline.json'), 'utf8'))
  const ids = baselineDoc.ids
  const baseline = {
    familyIds: ids.monster_families,
    monsterIds: ids.v2_monster_definitions,
    bossVariantIds: ids.boss_variants,
    lootTableIds: ids.loot_tables,
    equipmentIds: ids.item_bases,
    materialIds: ids.materials,
    cropIds: ids.crop_definitions,
    recipeIds: ids.crafting_recipes,
    affixIds: ids.affixes,
    baselineAffixSlots: [
      { id: 'striking', slots: ['weapon'] }, { id: 'keen', slots: ['weapon'] }, { id: 'piercing', slots: ['weapon'] },
      { id: 'bleeding', slots: ['weapon'] }, { id: 'sturdy', slots: ['armor'] }, { id: 'blocking', slots: ['armor'] }, { id: 'warding', slots: ['armor'] },
    ],
    excludedLegacyMonsterIds: ids.legacy_monsters,
    excludedLegacyItemIds: ['wood', 'stone', 'iron', 'food', 'material', 'potion', 'sword', 'armor'],
    excludedProceduralIds: [],
  }
  const result = validateContentPack(JSON.parse(packBytes.toString('utf8')), baseline)
  const outcome = {
    executionMode: 'validation-only public validateContentPack precheck; no validator CLI, child tests, or typecheck invoked',
    generatedAtUtc: new Date().toISOString(),
    generatedFrom: 'Vite SSR /src/data/contentRegistry.ts CONTENT_PACKS',
    contentPackCount: CONTENT_PACKS.length,
    catalogs: Object.fromEntries(catalogs.map(catalog => [catalog, merged[catalog].length])),
    pack: { bytes: packBytes.length, sha256: hash(packBytes), relativePath: relative(root, packPath) },
    evidence: {
      directory: relative(root, evidence.directory),
      manifestSha256: hash(await readFile(join(evidence.directory, 'manifest.json'))),
      sourceFingerprint: evidence.manifest.sourceFingerprint,
      capturedAtHead: evidence.manifest.git.head,
    },
    validation: result,
    validationExitCode: result.errors.length ? 1 : 0,
  }
  await writeFile(join(runDirectory, 'precheck-result.json'), `${JSON.stringify(outcome, null, 2)}\n`, { flag: 'wx' })
  process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`)
  if (result.errors.length) process.exitCode = 1
} finally {
  await vite.close()
}
