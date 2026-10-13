#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'
import { aggregateStatus, captureRunEvidence, runCheck, writeRunArtifact } from './validate_content_evidence.mjs'

const HISTORICAL_PHASE7_B_CONTRACT_ANCHOR = '11980b796f88173cf05ef83ac41510a0d44a53b1'
const DEFAULT_REPORT = 'reports/v2/20261008-content-expansion/phase-07/content-validation.md'
const BASELINE_PATH = 'reports/v2/20261008-content-expansion/phase-07/content-baseline.json'
const SNAPSHOT_PATHS = [
  'src/domain/content.ts', 'src/engine/contentValidation.ts', 'src/engine/contentValidation.test.ts',
  'scripts/validate_content_batch.mjs', 'scripts/validate_content_evidence.mjs', BASELINE_PATH,
  'scripts/recorded_reports.py', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts',
]

function argument(args, name, fallback) {
  const index = args.indexOf(name)
  if (index < 0) return fallback
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${name}`)
  return args[index + 1]
}

function reportMarkdown({ result, checks, manifest, fixture, error, cleanupError }) {
  const lines = [
    '# Phase 7 Content Batch Validation', '',
    `- Supplied pack: ${manifest.input.originalPath}`,
    `- Captured pack SHA-256: ${manifest.input.sha256}`,
    `- Run evidence: ${relative(process.cwd(), manifest.directory ?? '') || 'see run manifest'}`,
    `- Current run HEAD: ${manifest.git.head}`,
    `- Current run branch: ${manifest.git.branch}`,
    `- Current captured-source fingerprint: ${manifest.sourceFingerprint}`,
    `- Historical Phase 7-B contract anchor: ${HISTORICAL_PHASE7_B_CONTRACT_ANCHOR}`,
    `- Content validation status: ${error ? 'ERROR' : result?.errors?.length ? 'FAIL' : 'PASS'}`,
    `- Overall validator + child-check outcome: ${aggregateStatus(error ? 'ERROR' : result?.errors?.length ? 'FAIL' : 'PASS', checks, cleanupError ? [cleanupError] : [])}`,
    ...Object.entries(checks).map(([name, check]) => `- ${name}: ${check.status} (exit ${check.exitCode ?? 'null'}${check.signal ? `, signal ${check.signal}` : ''}${check.error ? `, error ${check.error}` : ''})`),
    `- Natural spawn exposure: ${result?.naturalExposure ?? 'not measured'}`,
    `- Crop goods evidence: ${result?.cropGoodEvidence ?? 'not evaluated'}`,
    `- Save compatibility evidence: ${result?.saveCompatibility ?? 'not evaluated'}`,
    fixture ? '- Tiny validation fixture: fixture IDs do not count toward approved targets.' : '- Counts cover unique qualifying IDs in this supplied authoring batch only.',
    '', '## Counts', '',
    `- Qualifying new monsters: ${result?.qualityCounts?.qualifyingNewMonsters ?? 'not evaluated'}`,
    `- Authoring-qualified candidate new item IDs: ${result?.qualityCounts?.usableNewItems ?? 'not evaluated'}`,
    `- Authoring-qualified usable new materials: ${result?.qualityCounts?.usableNewMaterials ?? 'not evaluated'}`,
    `- Exact baseline monster IDs: ${result?.baseline?.exactMonsterIds ?? 'not evaluated'}; excluded legacy monster IDs: ${result?.baseline?.excludedLegacyMonsterIds ?? 'not evaluated'}`,
    `- Exact baseline boss variant IDs: ${result?.baseline?.exactBossVariantIds ?? 'not evaluated'}`,
    `- Exact baseline item IDs: ${result?.baseline?.exactItemIds ?? 'not evaluated'}; excluded legacy item IDs: ${result?.baseline?.excludedLegacyItemIds ?? 'not evaluated'}; excluded procedural IDs: ${result?.baseline?.excludedProceduralIds ?? 'not evaluated'}`,
    '', '## Reachability', '',
    ...(result?.reachability ?? []).map(entry => `- ${entry.contentId}: ${entry.status}${entry.witness ? ` (${entry.witness.region}, level ${entry.witness.playerLevel}, threat ${entry.witness.threatLevel}, ${entry.witness.settlementStage}, ${entry.witness.season}, hour ${entry.witness.hour}, safety ${entry.witness.safety}; ${entry.witness.regionAccess})` : ''}`),
    '', '## Diagnostics', '',
    ...(error ? [`- ERROR ${error.name ?? 'Error'}: ${error.message}`] : []),
    ...(cleanupError ? [`- CLEANUP ERROR ${cleanupError.name ?? 'Error'}: ${cleanupError.message}`] : []),
    ...(result?.errors?.map(issue => `- ERROR ${issue.code}${issue.id ? ` [${issue.id}]` : ''}: ${issue.message}`) ?? []),
    ...(result?.warnings?.map(issue => `- WARNING ${issue.code}${issue.ids ? ` [${issue.ids.join(', ')}]` : issue.id ? ` [${issue.id}]` : ''}: ${issue.message}`) ?? []),
    ...(error || result?.errors?.length ? [] : ['- No validation errors.']),
    '', '## Child checks', '',
    ...Object.entries(checks).flatMap(([name, check]) => [`### ${name}`, '', `Exit: ${check.exitCode ?? 'null'}${check.signal ? `; signal: ${check.signal}` : ''}${check.error ? `; error: ${check.error}` : ''}`, '', 'stdout:', '```text', check.stdout.trimEnd(), '```', '', 'stderr:', '```text', check.stderr.trimEnd(), '```', '']),
    'Controlled witnesses prove bounded predicate satisfiability only. This report does not estimate natural encounter rates.',
  ]
  return `${lines.join('\n')}\n`
}

async function storeOutcome(run, outcome) {
  for (const [name, check] of Object.entries(outcome.checks ?? {})) {
    await writeRunArtifact(run.directory, `${name}.stdout.txt`, check.stdout)
    await writeRunArtifact(run.directory, `${name}.stderr.txt`, check.stderr)
    await writeRunArtifact(run.directory, `${name}.status.json`, `${JSON.stringify({ command: check.command, args: check.args, exitCode: check.exitCode, signal: check.signal, error: check.error, status: check.status }, null, 2)}\n`)
  }
  await writeRunArtifact(run.directory, 'outcome.json', `${JSON.stringify(outcome, null, 2)}\n`)
}

export async function main(args = process.argv.slice(2), root = process.cwd()) {
  const suppliedPack = argument(args, '--pack', '')
  if (!suppliedPack) throw new Error('Usage: node scripts/validate_content_batch.mjs --pack <authoring-pack.json> [--report <path>]')
  const reportPath = resolve(root, argument(args, '--report', DEFAULT_REPORT))
  const run = await captureRunEvidence({ root, packPath: suppliedPack, reportDirectory: relative(root, dirname(reportPath)), sourcePaths: SNAPSHOT_PATHS })
  run.manifest.directory = run.directory
  let result
  let error
  let cleanupError
  const checks = {}
  let vite
  try {
    const pack = JSON.parse(run.packBytes.toString('utf8'))
    const baselineDoc = JSON.parse(await readFile(resolve(root, BASELINE_PATH), 'utf8'))
    const ids = baselineDoc.ids
    const baseline = {
      familyIds: ids.monster_families, monsterIds: ids.v2_monster_definitions, bossVariantIds: ids.boss_variants,
      lootTableIds: ids.loot_tables, equipmentIds: ids.item_bases, materialIds: ids.materials, cropIds: ids.crop_definitions,
      recipeIds: ids.crafting_recipes, affixIds: ids.affixes,
      baselineAffixSlots: [
        { id: 'striking', slots: ['weapon'] }, { id: 'keen', slots: ['weapon'] }, { id: 'piercing', slots: ['weapon'] },
        { id: 'bleeding', slots: ['weapon'] }, { id: 'sturdy', slots: ['armor'] }, { id: 'blocking', slots: ['armor'] }, { id: 'warding', slots: ['armor'] },
      ],
      excludedLegacyMonsterIds: ids.legacy_monsters,
      excludedLegacyItemIds: ['wood', 'stone', 'iron', 'food', 'material', 'potion', 'sword', 'armor'], excludedProceduralIds: [],
    }
    vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true }, appType: 'custom' })
    const { validateContentPack } = await vite.ssrLoadModule('/src/engine/contentValidation.ts')
    result = validateContentPack(pack, baseline)
  } catch (caught) {
    error = { name: caught.name, message: caught.message, stack: caught.stack }
  }
  if (vite) {
    try {
      await vite.close()
    } catch (caught) {
      cleanupError = { name: caught.name, message: caught.message, stack: caught.stack }
    }
  }
  checks.targetedTests = runCheck('npm', ['exec', '--', 'vitest', 'run', 'src/engine/contentValidation.test.ts'], { cwd: root })
  checks.typecheck = runCheck('npm', ['exec', '--', 'vue-tsc', '--noEmit'], { cwd: root })
  const contentValidationStatus = error ? 'ERROR' : result.errors.length ? 'FAIL' : 'PASS'
  const overallStatus = aggregateStatus(contentValidationStatus, checks, cleanupError ? [cleanupError] : [])
  const outcome = {
    completedAt: new Date().toISOString(), contentValidationStatus, overallStatus,
    diagnostics: { validation: error ?? result?.errors ?? [], cleanup: cleanupError }, checks,
  }
  await storeOutcome(run, outcome)
  const text = reportMarkdown({ result, checks, manifest: run.manifest, fixture: basename(suppliedPack) === 'minimal-valid-pack.json', error, cleanupError })
  const publisher = runCheck('python3', ['-B', 'scripts/recorded_reports.py', 'publish', reportPath, '--producer', 'phase7-content-validator'], { cwd: root, input: text })
  await writeRunArtifact(run.directory, 'report-publish.stdout.txt', publisher.stdout)
  await writeRunArtifact(run.directory, 'report-publish.stderr.txt', publisher.stderr)
  await writeRunArtifact(run.directory, 'report-publish.status.json', `${JSON.stringify({ command: publisher.command, args: publisher.args, exitCode: publisher.exitCode, signal: publisher.signal, error: publisher.error, status: publisher.status }, null, 2)}\n`)
  if (publisher.status !== 'PASS') {
    process.stderr.write(`Could not archive validation report (exit ${publisher.exitCode ?? 'null'}${publisher.signal ? `, signal ${publisher.signal}` : ''}${publisher.error ? `, error ${publisher.error}` : ''}).\n`)
    if (publisher.stderr) process.stderr.write(publisher.stderr)
    return 1
  }
  process.stdout.write(text)
  return overallStatus === 'PASS' ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code }).catch(error => {
    process.stderr.write(`${error.name}: ${error.message}\n`)
    process.exitCode = 1
  })
}
