import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../')
const owner = join(root, 'reports/v2/20261008-content-expansion/phase-07/d-remaining-validation-run')
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`
const runDirectory = join(owner, 'runs', runId)
const artifacts = join(runDirectory, 'artifacts')
const packs = join(runDirectory, 'packs')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

async function hashTree(path, prefix = '') {
  const result = {}
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const absolute = join(path, entry.name)
    const key = join(prefix, entry.name).replaceAll('\\', '/')
    if (entry.isDirectory()) Object.assign(result, await hashTree(absolute, key))
    else if (entry.isFile()) result[key] = sha(await readFile(absolute))
  }
  return result
}
async function sourceMap() {
  const result = {}
  for (const directory of ['src', 'scripts']) Object.assign(result, await hashTree(join(root, directory), directory))
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts']) result[file] = sha(await readFile(join(root, file)))
  return result
}
function invoke(name, command, args) {
  const start = new Date()
  const child = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const end = new Date()
  return { name, command, args, cwd: root, startedUtc: start.toISOString(), endedUtc: end.toISOString(),
    startedTaipei: start.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    endedTaipei: end.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    exitCode: child.status, signal: child.signal, error: child.error ? `${child.error.name}: ${child.error.message}` : null,
    stdout: child.stdout ?? '', stderr: child.stderr ?? '' }
}
async function save(result) {
  await writeFile(join(artifacts, `${result.name}.stdout.txt`), result.stdout)
  await writeFile(join(artifacts, `${result.name}.stderr.txt`), result.stderr)
  await writeFile(join(artifacts, `${result.name}.result.json`), `${JSON.stringify({ ...result, stdout: undefined, stderr: undefined }, null, 2)}\n`)
}

await mkdir(artifacts, { recursive: true })
await mkdir(packs, { recursive: true })
const headBefore = invoke('head-before', 'git', ['rev-parse', 'HEAD'])
const before = { capturedAtUtc: new Date().toISOString(), head: headBefore.stdout.trim(), inputs: await sourceMap() }
await writeFile(join(artifacts, 'before.json'), `${JSON.stringify(before, null, 2)}\n`)

const extraction = invoke('extract-packs', 'node', [relative(root, join(owner, 'harness/extract.mjs')), relative(root, packs)])
await save(extraction)
if (extraction.exitCode !== 0) throw new Error(`Pack extraction failed with ${extraction.exitCode}`)

const packPath = join(packs, 'six-family-combined.json')
const reportPath = join(runDirectory, 'combined-validation.md')
const validation = invoke('validate-combined-six-family-pack', 'node', [
  'scripts/validate_content_batch.mjs', '--pack', relative(root, packPath), '--report', relative(root, reportPath),
])
await save(validation)

const headAfter = invoke('head-after', 'git', ['rev-parse', 'HEAD'])
const after = { capturedAtUtc: new Date().toISOString(), head: headAfter.stdout.trim(), inputs: await sourceMap() }
await writeFile(join(artifacts, 'after.json'), `${JSON.stringify(after, null, 2)}\n`)

const manifestPath = join(packs, 'extraction-manifest.json')
const extractionManifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const evidenceDirs = await readdir(join(runDirectory, '.qa-runs')).catch(() => [])
const evidence = []
for (const directory of evidenceDirs) {
  const evidenceDirectory = join(runDirectory, '.qa-runs', directory)
  const manifestBytes = await readFile(join(evidenceDirectory, 'manifest.json'))
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  const capturedPack = await readFile(join(evidenceDirectory, manifest.input.snapshot))
  const outcome = JSON.parse(await readFile(join(evidenceDirectory, 'outcome.json'), 'utf8'))
  const mismatches = []
  for (const [sourcePath, file] of Object.entries(manifest.sourceFiles)) {
    if (sha(await readFile(join(evidenceDirectory, file.snapshot))) !== file.sha256) mismatches.push(sourcePath)
  }
  evidence.push({ directory, inputMatches: sha(capturedPack) === manifest.input.sha256,
    inputSha256: sha(capturedPack), sourceFingerprint: manifest.sourceFingerprint, sourceMismatches: mismatches,
    contentValidationStatus: outcome.contentValidationStatus, overallStatus: outcome.overallStatus })
}

const text = validation.stdout
const count = regex => text.match(regex)?.[1] ?? null
const summary = {
  runId, headBeforeAfterSame: before.head === after.head,
  fullSourceConfigPackageMapUnchanged: JSON.stringify(before.inputs) === JSON.stringify(after.inputs),
  validation: { exitCode: validation.exitCode, signal: validation.signal, contentStatus: count(/Content validation status: ([^\n]+)/), overallStatus: count(/Overall validator \+ child-check outcome: ([^\n]+)/),
    qualifyingNewMonsters: count(/Qualifying new monsters: ([^\n]+)/), candidateNewItemIds: count(/Authoring-qualified candidate new item IDs: ([^\n]+)/), usableNewMaterials: count(/Authoring-qualified usable new materials: ([^\n]+)/),
    warnings: [...text.matchAll(/- WARNING ([^\n]+)/g)].map(match => match[1]),
    childChecks: [...text.matchAll(/- (targetedTests|typecheck): ([^\n]+)/g)].map(match => ({ name: match[1], status: match[2] })) },
  extractionCounts: extractionManifest.combinedCounts, combinedPackArtifact: extractionManifest.packArtifacts['six-family-combined'],
  evidence,
}
await writeFile(join(artifacts, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
const summaryLines = [
  '# Fresh Combined Six-Family Validator Recalculation', '',
  `- Run: ${runId}`,
  `- HEAD before/after: ${before.head} / ${after.head}`,
  `- Source/config/package map unchanged: ${summary.fullSourceConfigPackageMapUnchanged}`,
  `- Combined totals: ${JSON.stringify(extractionManifest.combinedCounts)}`,
  `- Pack: ${extractionManifest.packArtifacts['six-family-combined'].bytes} bytes; SHA-256 ${extractionManifest.packArtifacts['six-family-combined'].sha256}`,
  `- Validator exit/status: ${validation.exitCode} / ${summary.validation.contentStatus} / ${summary.validation.overallStatus}`,
  `- Qualifying monsters / candidate items / usable materials: ${summary.validation.qualifyingNewMonsters} / ${summary.validation.candidateNewItemIds} / ${summary.validation.usableNewMaterials}`,
  `- Child checks: ${JSON.stringify(summary.validation.childChecks)}`,
  '', '## Warnings', '',
  ...(summary.validation.warnings.length ? summary.validation.warnings.map(warning => `- ${warning}`) : ['- None.']),
  '', 'Raw output, timestamps, input/source maps, generated packs, and validator snapshots are adjacent in this run directory.',
]
await writeFile(join(runDirectory, 'combined-six-family-summary.md'), `${summaryLines.join('\n')}\n`)
