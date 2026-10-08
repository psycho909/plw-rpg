#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, relative, resolve } from 'node:path'
import { createServer } from 'vite'

function argument(name, fallback) {
  const index = process.argv.indexOf(name)
  return index < 0 ? fallback : process.argv[index + 1]
}
function sha256(value) { return createHash('sha256').update(value).digest('hex') }
function markdown(result, testResult, typecheckResult, hashes, baseline, fixture) {
  const lines = [
    '# Phase 7-B Content Batch Validation', '',
    `- Pack: ${hashes.packPath}`, `- Pack SHA-256: ${hashes.pack}`, `- B source revision anchor: ${hashes.revision}`,
    `- B source fingerprint (domain + validator + tests + runner): ${hashes.source}`,
    ...Object.entries(hashes.files).map(([path, digest]) => `- SHA-256 ${path}: ${digest}`),
    `- Baseline source fingerprint: ${baseline.source_fingerprint}`, `- Validation: ${result.errors.length ? 'FAIL' : 'PASS'}`,
    `- Targeted tests: ${testResult.status}`, `- Typecheck: ${typecheckResult.status}`, `- Natural spawn exposure: ${result.naturalExposure}`,
    `- Crop goods evidence: ${result.cropGoodEvidence}`, `- Save compatibility evidence: ${result.saveCompatibility}`, '',
    '## Counts', '',
    `- Qualifying new monsters: ${result.qualityCounts.qualifyingNewMonsters}`,
    `- Authoring-qualified candidate new item IDs: ${result.qualityCounts.usableNewItems} (equipment + usable materials + crop goods; unique IDs)`,
    `- Authoring-qualified usable new materials subset: ${result.qualityCounts.usableNewMaterials}`,
    `- Existing exact monster IDs: ${result.baseline.exactMonsterIds}; excluded legacy monster IDs: ${result.baseline.excludedLegacyMonsterIds}`,
    `- Existing exact boss variant IDs: ${result.baseline.exactBossVariantIds}`,
    `- Existing exact item IDs: ${result.baseline.exactItemIds}; excluded legacy item IDs: ${result.baseline.excludedLegacyItemIds}; excluded procedural IDs: ${result.baseline.excludedProceduralIds}`,
    fixture ? '- This is a tiny validation fixture. Its IDs never count toward the approved 50-monster / 100-item targets.' : '- Counts cover only unique qualifying IDs in this supplied authoring batch; existing, legacy, and procedural IDs are excluded.', '',
    '## Reachability', '',
    ...result.reachability.map(entry => `- ${entry.contentId}: ${entry.status}${entry.witness ? ` (${entry.witness.region}, level ${entry.witness.playerLevel}, threat ${entry.witness.threatLevel}, ${entry.witness.season}, hour ${entry.witness.hour}, safety ${entry.witness.safety}; ${entry.witness.regionAccess})` : ''}`),
    '', '## Diagnostics', '',
    ...(result.errors.length ? result.errors.map(issue => `- ERROR ${issue.code}${issue.id ? ` [${issue.id}]` : ''}: ${issue.message}`) : ['- No validation errors.']),
    ...(result.warnings.length ? result.warnings.map(issue => `- WARNING ${issue.code}${issue.ids ? ` [${issue.ids.join(', ')}]` : issue.id ? ` [${issue.id}]` : ''}: ${issue.message}`) : ['- No warnings.']),
    '', '## Authoring bounds and qualification', '',
    '- Phase 7 validator guardrails: ecosystem material and crop-good sell are integers 1..50; each material bias is 0..4; crop-good foodValue is an integer 1..4; recipe input amounts are positive safe integers up to 1000; crop growth is 1..43200 whole minutes and yield is 1..100; recipe gold is 0..1000, stamina 0..100, duration 1..43200 minutes, and output/skill levels 0..100.',
    '- These are conservative Phase 7 authoring and balance bounds informed by current Reward values; they are not runtime formula limits. Raising them requires an explicit balance review.',
    '- Required contract fields and finite enums are checked before reference graphs grant consumer evidence, including recipe station/category/affix rules and inputs, monster loot profiles/mechanics, and boss variant structure.',
    '- Crop-good qualification records an authored food binding only. Final item qualification still requires C/G verification of runtime food/supply/source consumers.',
    '', '## Targeted test output', '', '```text', testResult.output.trimEnd(), '```', '',
    '## Typecheck output', '', '```text', typecheckResult.output.trimEnd(), '```', '',
    'Controlled witnesses prove bounded predicate satisfiability only (player level 1..100, threat 1..3, supported stages/seasons, hours 0..23, safety 0..100). This report does not estimate natural encounter rates or assert that all content appears in a long simulation.',
  ]
  return `${lines.join('\n')}\n`
}

const packPath = resolve(argument('--pack', ''))
if (!argument('--pack', '')) {
  console.error('Usage: node scripts/validate_content_batch.mjs --pack <authoring-pack.json> [--report <path>]')
  process.exit(2)
}
const reportPath = resolve(argument('--report', 'reports/v2/20261008-content-expansion/phase-07/content-validation.md'))
const baselinePath = resolve('reports/v2/20261008-content-expansion/phase-07/content-baseline.json')
const baselineDoc = JSON.parse(await readFile(baselinePath, 'utf8'))
const ids = baselineDoc.ids
const excludedLegacyItemIds = ['wood', 'stone', 'iron', 'food', 'material', 'potion', 'sword', 'armor']
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
  // Copied from the exact legacy AFFIXES slot declarations in src/data/rewards.ts.
  baselineAffixSlots: [
    { id: 'striking', slots: ['weapon'] }, { id: 'keen', slots: ['weapon'] }, { id: 'piercing', slots: ['weapon'] },
    { id: 'bleeding', slots: ['weapon'] }, { id: 'sturdy', slots: ['armor'] }, { id: 'blocking', slots: ['armor'] },
    { id: 'warding', slots: ['armor'] },
  ],
  excludedLegacyMonsterIds: ids.legacy_monsters,
  excludedLegacyItemIds,
  excludedProceduralIds: [],
}
const packBytes = await readFile(packPath)
const pack = JSON.parse(packBytes.toString('utf8'))
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true }, appType: 'custom' })
let exitCode = 0
let reportText = ''
try {
  const { validateContentPack } = await vite.ssrLoadModule('/src/engine/contentValidation.ts')
  const result = validateContentPack(pack, baseline)
  let testOutput = ''
  let typecheckOutput = ''
  try {
    testOutput = execFileSync('npm', ['exec', '--', 'vitest', 'run', 'src/engine/contentValidation.test.ts'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (error) {
    testOutput = `${error.stdout ?? ''}${error.stderr ?? ''}`
    exitCode = 1
  }
  try {
    typecheckOutput = execFileSync('npm', ['exec', '--', 'vue-tsc', '--noEmit'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (error) {
    typecheckOutput = `${error.stdout ?? ''}${error.stderr ?? ''}`
    exitCode = 1
  }
  const sourcePaths = ['src/domain/content.ts', 'src/engine/contentValidation.ts', 'src/engine/contentValidation.test.ts', 'scripts/validate_content_batch.mjs']
  const sourceHashes = {}
  for (const path of sourcePaths) sourceHashes[path] = sha256(await readFile(resolve(path)))
  reportText = markdown(result, { status: testOutput.includes('Test Files  1 passed') ? 'PASS' : 'FAIL', output: testOutput },
    { status: typecheckOutput.trim() ? 'FAIL' : 'PASS', output: typecheckOutput || 'vue-tsc --noEmit completed with no diagnostics.' },
    { packPath: relative(process.cwd(), packPath), pack: sha256(packBytes), revision: '11980b796f88173cf05ef83ac41510a0d44a53b1', source: sha256(JSON.stringify(sourceHashes)), files: sourceHashes }, baselineDoc,
    basename(packPath) === 'minimal-valid-pack.json')
  if (result.errors.length) exitCode = 1
} finally {
  await vite.close()
}
try {
  execFileSync('python3', ['-B', 'scripts/recorded_reports.py', 'publish', reportPath, '--producer', 'phase7-content-validator'], { input: reportText, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] })
} catch (error) {
  console.error(`Could not archive validation report: ${error.message}`)
  process.exit(1)
}
process.stdout.write(reportText)
process.exitCode = exitCode
