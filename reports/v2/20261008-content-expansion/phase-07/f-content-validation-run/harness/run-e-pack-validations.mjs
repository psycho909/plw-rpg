import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../')
const owner = join(root, 'reports/v2/20261008-content-expansion/phase-07/f-content-validation-run')
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`
const runDirectory = join(owner, 'runs', runId)
const artifactDirectory = join(runDirectory, 'artifacts')
const packDirectory = join(runDirectory, 'packs')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

async function hashTree(path, prefix = '') {
  const hashes = {}
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const absolute = join(path, entry.name)
    const key = join(prefix, entry.name).replaceAll('\\', '/')
    if (entry.isDirectory()) {
      if (entry.name === '__pycache__') continue
      Object.assign(hashes, await hashTree(absolute, key))
    } else if (entry.isFile() && !entry.name.endsWith('.pyc')) {
      hashes[key] = sha(await readFile(absolute))
    }
  }
  return hashes
}

async function sourceMap() {
  const hashes = {}
  for (const directory of ['src', 'scripts', 'config']) {
    try { Object.assign(hashes, await hashTree(join(root, directory), directory)) } catch (error) {
      if (error.code !== 'ENOENT' || directory !== 'config') throw error
    }
  }
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts']) {
    hashes[file] = sha(await readFile(join(root, file)))
  }
  return hashes
}

function invoke(name, command, args) {
  const start = new Date()
  const child = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const end = new Date()
  return {
    name, command, args, cwd: root,
    startedUtc: start.toISOString(), endedUtc: end.toISOString(),
    startedTaipei: start.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    endedTaipei: end.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    exitCode: child.status, signal: child.signal,
    error: child.error ? `${child.error.name}: ${child.error.message}` : null,
    stdout: child.stdout ?? '', stderr: child.stderr ?? '',
  }
}

function functionalGearAudit(packs) {
  const authoredAffixes = new Map(packs.flatMap(pack => pack.affixes.map(affix => [affix.id, affix])))
  const equipment = packs.flatMap(pack => pack.equipment)
  const stable = value => JSON.stringify(value)
  const affixSemantic = id => {
    const affix = authoredAffixes.get(id)
    return affix ? { stat: affix.stat, slots: affix.slots, tiers: affix.tiers } : { id }
  }
  const grouped = new Map()
  for (const item of equipment) {
    const semantic = {
      slot: item.slot,
      attack: item.attack,
      defense: item.defense,
      penetration: item.penetration ?? 0,
      affixes: item.affixIds.map(affixSemantic).sort((a, b) => stable(a).localeCompare(stable(b))),
    }
    const key = stable(semantic)
    const members = grouped.get(key) ?? []
    members.push({ id: item.id, sell: item.sell })
    grouped.set(key, members)
  }
  const cloneGroups = [...grouped.entries()].filter(([, members]) => members.length > 1).map(([semantic, members]) => ({ semantic: JSON.parse(semantic), members }))
  const cloneMemberCount = cloneGroups.reduce((count, group) => count + group.members.length, 0)
  const baselineAffixIds = [...new Set(equipment.flatMap(item => item.affixIds).filter(id => !authoredAffixes.has(id)))].sort()
  return {
    method: 'Exact canonical gear profile by slot/attack/defense/penetration and effective affix eligibility; excludes sale value, names, descriptions, and equipment IDs from the grouping key. Authored affixes resolve to stat/slots/tiers; absent authored affixes retain the stable baseline affix ID, matching contentValidation affix semantics.',
    equipmentCount: equipment.length,
    authoredAffixCount: authoredAffixes.size,
    baselineAffixFallbackIds: baselineAffixIds,
    functionalCloneGroups: cloneGroups,
    functionalCloneGroupCount: cloneGroups.length,
    allMembersOfCloneGroupsExcludedCount: cloneMemberCount,
    equipmentCountAfterExcludingAllCloneGroupMembers: equipment.length - cloneMemberCount,
  }
}

async function saveInvocation(result) {
  await writeFile(join(artifactDirectory, `${result.name}.stdout.txt`), result.stdout)
  await writeFile(join(artifactDirectory, `${result.name}.stderr.txt`), result.stderr)
  await writeFile(join(artifactDirectory, `${result.name}.result.json`), `${JSON.stringify({ ...result, stdout: undefined, stderr: undefined }, null, 2)}\n`)
}

await mkdir(artifactDirectory, { recursive: true })
await mkdir(packDirectory, { recursive: true })
const beforeHead = invoke('head-before', 'git', ['rev-parse', 'HEAD'])
const beforeBranch = invoke('branch-before', 'git', ['branch', '--show-current'])
const before = {
  capturedAtUtc: new Date().toISOString(), head: beforeHead.stdout.trim(), branch: beforeBranch.stdout.trim(),
  sha256: await sourceMap(),
}
await writeFile(join(artifactDirectory, 'before.json'), `${JSON.stringify(before, null, 2)}\n`)

const extraction = invoke('extract-source-packs', 'node', [
  relative(root, join(owner, 'harness/extract-six-packs.mjs')),
  relative(root, packDirectory),
])
await saveInvocation(extraction)
let cliRuns = []
let semanticGearAudit = null
if (extraction.exitCode === 0 && !extraction.error) {
  const packNames = ['slime', 'cave-insects', 'wild-beasts', 'frontier-goblins', 'fog-undead', 'mine-constructs']
  const packs = []
  for (const name of packNames) packs.push(JSON.parse(await readFile(join(packDirectory, `${name}.json`), 'utf8')))
  semanticGearAudit = functionalGearAudit(packs)
  await writeFile(join(artifactDirectory, 'semantic-gear-audit.json'), `${JSON.stringify(semanticGearAudit, null, 2)}\n`)
  const names = ['slime', 'cave-insects', 'wild-beasts', 'frontier-goblins', 'fog-undead', 'mine-constructs', 'six-family-combined']
  for (const name of names) {
    const caseDirectory = join(runDirectory, 'cases', name)
    await mkdir(caseDirectory, { recursive: true })
    const output = invoke(`validate-${name}`, 'node', [
      'scripts/validate_content_batch.mjs', '--pack', relative(root, join(packDirectory, `${name}.json`)),
      '--report', relative(root, join(caseDirectory, 'readable-report.md')),
    ])
    await saveInvocation(output)
    cliRuns.push({ name, exitCode: output.exitCode, signal: output.signal, error: output.error })
  }
}
await writeFile(join(artifactDirectory, 'cli-runs.json'), `${JSON.stringify(cliRuns, null, 2)}\n`)

const extractionManifestPath = join(packDirectory, 'extraction-manifest.json')
let extractionManifest = null
try { extractionManifest = JSON.parse(await readFile(extractionManifestPath, 'utf8')) } catch {}
const qaRuns = []
const caseNames = await readdir(join(runDirectory, 'cases')).catch(() => [])
for (const name of caseNames) {
  const caseDirectory = join(runDirectory, 'cases', name)
  const evidenceDirectories = await readdir(join(caseDirectory, '.qa-runs')).catch(() => [])
  for (const directory of evidenceDirectories) {
    const evidenceDirectory = join(caseDirectory, '.qa-runs', directory)
    const manifestBytes = await readFile(join(evidenceDirectory, 'manifest.json'))
    const manifest = JSON.parse(manifestBytes.toString('utf8'))
    const inputBytes = await readFile(join(evidenceDirectory, manifest.input.snapshot))
    const outcome = JSON.parse(await readFile(join(evidenceDirectory, 'outcome.json'), 'utf8'))
    const sourceMismatches = []
    for (const [path, record] of Object.entries(manifest.sourceFiles)) {
      if (sha(await readFile(join(evidenceDirectory, record.snapshot))) !== record.sha256) sourceMismatches.push(path)
    }
    qaRuns.push({
      name, directory: relative(root, evidenceDirectory), manifestSha256: sha(manifestBytes),
      inputSha256: sha(inputBytes), inputMatchesManifest: sha(inputBytes) === manifest.input.sha256,
      sourceFingerprint: manifest.sourceFingerprint, sourceMismatches,
      contentValidationStatus: outcome.contentValidationStatus, overallStatus: outcome.overallStatus,
    })
  }
}

const afterHead = invoke('head-after', 'git', ['rev-parse', 'HEAD'])
const afterBranch = invoke('branch-after', 'git', ['branch', '--show-current'])
const after = {
  capturedAtUtc: new Date().toISOString(), head: afterHead.stdout.trim(), branch: afterBranch.stdout.trim(),
  sha256: await sourceMap(),
}
await writeFile(join(artifactDirectory, 'after.json'), `${JSON.stringify(after, null, 2)}\n`)

const targetNewPackCounts = { monsters: 11, materials: 8, equipment: 8, recipes: 4 }
const targetSixFamilyCounts = { monsters: 66, materials: 48, equipment: 48, recipes: 24, crops: 0, cropGoods: 0 }
const summary = {
  runId, headBeforeAfterSame: before.head === after.head,
  branchBeforeAfterSame: before.branch === after.branch,
  sourceAndConfigMapUnchanged: JSON.stringify(before.sha256) === JSON.stringify(after.sha256),
  sourceMapFilesBefore: Object.keys(before.sha256).length, sourceMapFilesAfter: Object.keys(after.sha256).length,
  targetNewPackCounts, targetSixFamilyCounts,
  actualNewFamilyCounts: extractionManifest?.perPackCounts ?? null,
  generatedPackArtifacts: extractionManifest?.packArtifacts ?? null,
  semanticGearAudit,
  actualSixFamilyCounts: extractionManifest?.combinedCounts ?? null,
  allSixCountTargetsMatched: Object.entries(targetSixFamilyCounts).every(([key, value]) => extractionManifest?.combinedCounts?.[key] === value),
  cliRuns, rawRunEvidence: qaRuns,
  allSevenCliInvocationsPresent: cliRuns.length === 7,
  allSevenContentAndChildChecksPass: cliRuns.length === 7 && cliRuns.every(run => run.exitCode === 0 && !run.signal && !run.error) && qaRuns.length === 7 && qaRuns.every(run => run.contentValidationStatus === 'PASS' && run.overallStatus === 'PASS'),
  allRetainedInputsAndSourcesVerify: qaRuns.length === 7 && qaRuns.every(run => run.inputMatchesManifest && run.sourceMismatches.length === 0),
}
await writeFile(join(artifactDirectory, 'final-integrity.json'), `${JSON.stringify(summary, null, 2)}\n`)

const lines = [
  '# F Six-Family Standard Validator Runs', '',
  `- Run: ${runId}`,
  `- HEAD before/after: ${before.head} / ${after.head}`,
  `- Branch before/after: ${before.branch} / ${after.branch}`,
  `- Full source/config/package SHA maps unchanged: ${summary.sourceAndConfigMapUnchanged} (${summary.sourceMapFilesBefore} / ${summary.sourceMapFilesAfter} files; excludes __pycache__ and .pyc)` ,
  `- Measured six-family actual counts: ${JSON.stringify(extractionManifest?.combinedCounts ?? null)}`,
  `- Six-family target counts: ${JSON.stringify(targetSixFamilyCounts)}; matched: ${summary.allSixCountTargetsMatched}`,
  `- Functional gear after excluding all members of clone groups: ${semanticGearAudit?.equipmentCountAfterExcludingAllCloneGroupMembers ?? 'not measured'} / ${semanticGearAudit?.equipmentCount ?? 'not measured'}`,
  `- Functional clone groups: ${JSON.stringify(semanticGearAudit?.functionalCloneGroups ?? null)}`,
  '', '## Individual packs', '',
  ...Object.entries(extractionManifest?.perPackCounts ?? {}).map(([name, counts]) => `- ${name}: ${JSON.stringify(counts)} (family plan target where applicable: ${JSON.stringify(targetNewPackCounts)})`),
  '', '## Standard CLI outcomes', '',
  ...cliRuns.map(run => `- ${run.name}: exit ${run.exitCode ?? 'null'}${run.signal ? `, signal ${run.signal}` : ''}${run.error ? `, ${run.error}` : ''}`),
  '', 'Each CLI captures its exact input bytes and source snapshots before parsing through the validator evidence helper. Raw stdout/stderr and UTC/Taipei timestamps are retained under artifacts/. Each readable report has its own case directory and archive.',
  `- Content/check PASS across all seven invocations: ${summary.allSevenContentAndChildChecksPass}`,
  `- Input and source retention integrity: ${summary.allRetainedInputsAndSourcesVerify}`,
  'This is scoped F content/validator evidence. It does not run the canonical full suite, accept F, or claim final Phase 7 product gates.',
]
await writeFile(join(runDirectory, 'f-content-validation-summary.md'), `${lines.join('\n')}\n`)
process.stdout.write(`${JSON.stringify({ runId, runDirectory: relative(root, runDirectory), extractionExit: extraction.exitCode, cliRuns, sourceAndConfigMapUnchanged: summary.sourceAndConfigMapUnchanged, allSevenContentAndChildChecksPass: summary.allSevenContentAndChildChecksPass }, null, 2)}\n`)
