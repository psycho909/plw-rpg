import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../')
const ownerDirectory = join(root, 'reports/v2/20261008-content-expansion/phase-07/d-remaining-validation-run')
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`
const runDirectory = join(ownerDirectory, 'runs', runId)
const artifactDirectory = join(runDirectory, 'artifacts')
const packDirectory = join(runDirectory, 'packs')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

async function hashTree(path, prefix = '') {
  const hashes = {}
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const absolute = join(path, entry.name)
    const key = join(prefix, entry.name).replaceAll('\\', '/')
    if (entry.isDirectory()) Object.assign(hashes, await hashTree(absolute, key))
    else if (entry.isFile()) hashes[key] = sha(await readFile(absolute))
  }
  return hashes
}

async function sourceMap() {
  const hashes = {}
  for (const directory of ['src', 'scripts']) Object.assign(hashes, await hashTree(join(root, directory), directory))
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
  capturedAtUtc: new Date().toISOString(),
  head: beforeHead.stdout.trim(), branch: beforeBranch.stdout.trim(),
  sha256: await sourceMap(),
}
await writeFile(join(artifactDirectory, 'before.json'), `${JSON.stringify(before, null, 2)}\n`)

const extraction = invoke('extract-source-packs', 'node', [
  relative(root, join(ownerDirectory, 'harness/extract.mjs')),
  relative(root, packDirectory),
])
await saveInvocation(extraction)
if (extraction.exitCode !== 0) {
  const failed = { phase: 'extraction', exitCode: extraction.exitCode, signal: extraction.signal, error: extraction.error }
  await writeFile(join(artifactDirectory, 'stopped.json'), `${JSON.stringify(failed, null, 2)}\n`)
} else {
  const names = ['wild-beasts', 'frontier-goblins', 'fog-undead', 'mine-constructs', 'six-family-combined']
  const cliRuns = []
  for (const name of names) {
    const input = join(packDirectory, `${name}.json`)
    const output = invoke(`validate-${name}`, 'node', [
      'scripts/validate_content_batch.mjs', '--pack', relative(root, input),
      '--report', relative(root, join(runDirectory, 'readable-report.md')),
    ])
    await saveInvocation(output)
    cliRuns.push({ name, exitCode: output.exitCode, signal: output.signal, error: output.error })
  }
  await writeFile(join(artifactDirectory, 'cli-runs.json'), `${JSON.stringify(cliRuns, null, 2)}\n`)
}

const extractionManifestPath = join(packDirectory, 'extraction-manifest.json')
let extractionManifest = null
try { extractionManifest = JSON.parse(await readFile(extractionManifestPath, 'utf8')) } catch {}
const runDirectories = await readdir(join(runDirectory, '.qa-runs')).catch(() => [])
const retention = []
for (const directory of runDirectories) {
  const evidenceDirectory = join(runDirectory, '.qa-runs', directory)
  const manifestBytes = await readFile(join(evidenceDirectory, 'manifest.json'))
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  const inputBytes = await readFile(join(evidenceDirectory, manifest.input.snapshot))
  const outcome = JSON.parse(await readFile(join(evidenceDirectory, 'outcome.json'), 'utf8'))
  const sourceMismatches = []
  for (const [path, record] of Object.entries(manifest.sourceFiles)) {
    if (sha(await readFile(join(evidenceDirectory, record.snapshot))) !== record.sha256) sourceMismatches.push(path)
  }
  retention.push({
    directory, manifestSha256: sha(manifestBytes),
    inputSha256: sha(inputBytes), inputMatchesManifest: sha(inputBytes) === manifest.input.sha256,
    sourceFingerprint: manifest.sourceFingerprint, sourceMismatches,
    contentValidationStatus: outcome.contentValidationStatus, overallStatus: outcome.overallStatus,
  })
}

const afterHead = invoke('head-after', 'git', ['rev-parse', 'HEAD'])
const afterBranch = invoke('branch-after', 'git', ['branch', '--show-current'])
const after = {
  capturedAtUtc: new Date().toISOString(),
  head: afterHead.stdout.trim(), branch: afterBranch.stdout.trim(),
  sha256: await sourceMap(),
}
await writeFile(join(artifactDirectory, 'after.json'), `${JSON.stringify(after, null, 2)}\n`)

const targetNewPackCounts = { monsters: 8, materials: 7, equipment: 2, recipes: 2 }
const targetSixFamilyCounts = { monsters: 51, materials: 43, equipment: 20, recipes: 16 }
const summary = {
  runId, headBeforeAfterSame: before.head === after.head,
  branchBeforeAfterSame: before.branch === after.branch,
  sourceAndConfigMapUnchanged: JSON.stringify(before.sha256) === JSON.stringify(after.sha256),
  targetNewPackCounts, targetSixFamilyCounts,
  actualNewFamilyCounts: extractionManifest?.packCounts ?? null,
  generatedPackArtifacts: extractionManifest?.packArtifacts ?? null,
  actualSixFamilyCounts: extractionManifest?.combinedCounts ?? null,
  allSixCountTargetsMatched: Object.entries(targetSixFamilyCounts).every(([key, value]) => extractionManifest?.combinedCounts?.[key] === value),
  rawRunEvidence: retention,
}
await writeFile(join(artifactDirectory, 'final-integrity.json'), `${JSON.stringify(summary, null, 2)}\n`)

const lines = [
  '# Remaining D Family Validation', '',
  `- Run: ${runId}`,
  `- HEAD before/after: ${before.head} / ${after.head}`,
  `- Branch before/after: ${before.branch} / ${after.branch}`,
  `- Source/config/package map unchanged: ${summary.sourceAndConfigMapUnchanged}`,
  `- Generated six-family actual counts: ${JSON.stringify(extractionManifest?.combinedCounts ?? null)}`,
  `- Six-family expected counts: ${JSON.stringify(targetSixFamilyCounts)}; matched: ${summary.allSixCountTargetsMatched}`,
  '', '## Four new family packs', '',
  ...Object.entries(extractionManifest?.packCounts ?? {}).filter(([name]) => !['slime', 'cave-insects'].includes(name)).map(([name, counts]) => `- ${name}: ${JSON.stringify(counts)} (expected new family: ${JSON.stringify(targetNewPackCounts)})`),
  '', '## CLI outcomes', '',
  ...((await readFile(join(artifactDirectory, 'cli-runs.json'), 'utf8').then(text => JSON.parse(text)).catch(() => [])).map(run => `- ${run.name}: exit ${run.exitCode ?? 'null'}${run.signal ? `, signal ${run.signal}` : ''}${run.error ? `, ${run.error}` : ''}`)),
  '', 'Each validator input and source snapshot is retained under `.qa-runs/`; raw stdout/stderr and timestamps are in `artifacts/`.',
  'Counts and command outcomes above are measured. This report makes no final Phase 7 50/100 gate claim.',
]
await writeFile(join(runDirectory, 'd-remaining-validation-summary.md'), `${lines.join('\n')}\n`)
