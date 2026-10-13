import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../')
const owner = join(root, 'reports/v2/20261008-content-expansion/phase-07/e-content-validation-run')
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`
const runDirectory = join(owner, 'runs', runId)
const artifacts = join(runDirectory, 'artifacts')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const inputs = [
  'src/data/content/slime.ts', 'src/data/content/caveInsects.ts', 'src/data/content/wildBeasts.ts',
  'src/data/content/frontierGoblins.ts', 'src/data/content/fogUndead.ts', 'src/data/content/mineConstructs.ts',
  'src/data/contentRegistry.ts', 'src/domain/content.ts', 'src/engine/contentValidation.ts',
  'scripts/validate_content_evidence.mjs', 'scripts/validate_content_batch.mjs',
  'reports/v2/20261008-content-expansion/phase-07/content-baseline.json',
]
async function snapshot() {
  return Object.fromEntries(await Promise.all(inputs.map(async path => [path, sha(await readFile(join(root, path)))])))
}
function invoke() {
  const start = new Date()
  const child = spawnSync('node', [
    relative(root, join(owner, 'harness/precheck-content-pack.mjs')),
    relative(root, runDirectory),
  ], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const end = new Date()
  return { command: 'node', args: [relative(root, join(owner, 'harness/precheck-content-pack.mjs')), relative(root, runDirectory)],
    cwd: root, startedUtc: start.toISOString(), endedUtc: end.toISOString(),
    startedTaipei: start.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    endedTaipei: end.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    exitCode: child.status, signal: child.signal, error: child.error ? `${child.error.name}: ${child.error.message}` : null,
    stdout: child.stdout ?? '', stderr: child.stderr ?? '' }
}

await mkdir(artifacts, { recursive: true })
const headBefore = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim()
const before = { capturedAtUtc: new Date().toISOString(), head: headBefore, selectedSourceSha256: await snapshot() }
await writeFile(join(artifacts, 'before.json'), `${JSON.stringify(before, null, 2)}\n`)
const run = invoke()
await writeFile(join(artifacts, 'precheck.stdout.txt'), run.stdout)
await writeFile(join(artifacts, 'precheck.stderr.txt'), run.stderr)
await writeFile(join(artifacts, 'precheck.command-result.json'), `${JSON.stringify({ ...run, stdout: undefined, stderr: undefined }, null, 2)}\n`)
const headAfter = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim()
const after = { capturedAtUtc: new Date().toISOString(), head: headAfter, selectedSourceSha256: await snapshot() }
await writeFile(join(artifacts, 'after.json'), `${JSON.stringify(after, null, 2)}\n`)

let result = null
try { result = JSON.parse(await readFile(join(runDirectory, 'precheck-result.json'), 'utf8')) } catch {}
const manifestPath = result?.evidence?.directory ? join(root, result.evidence.directory, 'manifest.json') : null
let manifest = null
if (manifestPath) manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const sourceComparison = {}
for (const [path, hash] of Object.entries(before.selectedSourceSha256)) {
  sourceComparison[path] = { before: hash, captured: manifest?.sourceFiles?.[path]?.sha256 ?? null, after: after.selectedSourceSha256[path], stable: hash === after.selectedSourceSha256[path] && hash === manifest?.sourceFiles?.[path]?.sha256 }
}
const status = {
  runId, actualHeadBeforeAfterSame: before.head === after.head,
  selectedSourcesStableAndCaptured: Object.values(sourceComparison).every(entry => entry.stable),
  sourceComparison, childProcessExit: run.exitCode, validationExit: result?.validationExitCode ?? null,
  mode: result?.executionMode ?? 'precheck process did not produce a result',
  pack: result?.pack ?? null, sourceFingerprint: result?.evidence?.sourceFingerprint ?? null,
  contentPackCount: result?.contentPackCount ?? null, catalogs: result?.catalogs ?? null,
  errorCount: result?.validation?.errors?.length ?? null, warningCount: result?.validation?.warnings?.length ?? null,
  errors: result?.validation?.errors ?? [], warnings: result?.validation?.warnings ?? [],
  qualityCounts: result?.validation?.qualityCounts ?? null,
  baselineCounts: result?.validation?.baseline ?? null,
  reachabilityCount: result?.validation?.reachability?.length ?? null,
  manifestSha256: result?.evidence?.manifestSha256 ?? null,
}
await writeFile(join(artifacts, 'verification.json'), `${JSON.stringify(status, null, 2)}\n`)

const summary = [
  '# E Six-Family Validation-Only Precheck', '',
  `- Run: ${runId}`,
  `- HEAD before/after: ${before.head} / ${after.head}`,
  `- Validation-only public API call; no CLI, tests, typecheck, or full check invoked.`,
  `- Source provenance stable and matched run snapshots: ${status.selectedSourcesStableAndCaptured}`,
  `- Registry pack count: ${status.contentPackCount}`,
  `- Actual catalog counts: ${JSON.stringify(status.catalogs)}`,
  `- Input bytes / SHA-256: ${status.pack?.bytes ?? 'not generated'} / ${status.pack?.sha256 ?? 'not generated'}`,
  `- Precheck exit / validation errors / warnings: ${run.exitCode ?? 'null'} / ${status.errorCount ?? 'unknown'} / ${status.warningCount ?? 'unknown'}`,
  `- Quality counts: ${JSON.stringify(status.qualityCounts)}`,
  '', '## Diagnostics', '',
  ...(status.errors.length ? status.errors.map(error => `- ERROR ${error.code}${error.id ? ` [${error.id}]` : ''}: ${error.message}`) : ['- No validation errors.']),
  ...(status.warnings.length ? status.warnings.map(warning => `- WARNING ${warning.code}${warning.ids ? ` [${warning.ids.join(', ')}]` : warning.id ? ` [${warning.id}]` : ''}: ${warning.message}`) : ['- No warnings.']),
  '', 'Raw process streams, exact input bytes, source snapshot manifest, and full validation result are retained in this run directory.',
  'This precheck is not full CLI or engineering acceptance evidence.',
]
await writeFile(join(runDirectory, 'e-content-validation-summary.md'), `${summary.join('\n')}\n`)
