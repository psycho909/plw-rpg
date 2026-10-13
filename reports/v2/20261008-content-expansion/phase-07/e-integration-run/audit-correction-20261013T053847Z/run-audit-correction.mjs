import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const root = process.cwd()
const runDirectory = join(root, 'reports/v2/20261008-content-expansion/phase-07/e-integration-run/audit-correction-20261013T053847Z')
const artifactDirectory = join(runDirectory, 'artifacts')
const snapshotDirectory = join(runDirectory, 'snapshots')
const tests = [
  'src/engine/contentBosses.integration.test.ts',
  'src/engine/contentFamilies.test.ts',
  'src/engine/caveInsects.integration.test.ts',
  'src/engine/remainingFamilies.integration.test.ts',
]
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

async function hashTree(directory, prefix = '') {
  const hashes = {}
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const abs = join(root, directory, entry.name)
    const path = join(prefix, entry.name).replaceAll('\\', '/')
    if (entry.isDirectory()) {
      if (entry.name === '__pycache__') continue
      Object.assign(hashes, await hashTree(join(directory, entry.name), path))
    } else if (entry.isFile() && !entry.name.endsWith('.pyc')) hashes[path] = sha(await readFile(abs))
  }
  return hashes
}

async function sourceMap() {
  const hashes = {}
  for (const directory of ['src', 'scripts']) Object.assign(hashes, await hashTree(directory, directory))
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts']) {
    hashes[file] = sha(await readFile(join(root, file)))
  }
  return hashes
}

function invoke(name, command, args) {
  const start = new Date()
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const end = new Date()
  return {
    name, command, args, cwd: root,
    startedUtc: start.toISOString(), endedUtc: end.toISOString(),
    startedTaipei: start.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    endedTaipei: end.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    exitCode: result.status, signal: result.signal,
    error: result.error ? `${result.error.name}: ${result.error.message}` : null,
    stdout: result.stdout ?? '', stderr: result.stderr ?? '',
  }
}

async function saveInvocation(result) {
  await writeFile(join(artifactDirectory, `${result.name}.stdout.txt`), result.stdout)
  await writeFile(join(artifactDirectory, `${result.name}.stderr.txt`), result.stderr)
  await writeFile(join(artifactDirectory, `${result.name}.result.json`), `${JSON.stringify({ ...result, stdout: undefined, stderr: undefined }, null, 2)}\n`)
}

await mkdir(artifactDirectory, { recursive: true })
await mkdir(snapshotDirectory, { recursive: true })
const beforeHeadResult = invoke('head-before', 'git', ['rev-parse', 'HEAD'])
const before = {
  capturedAtUtc: new Date().toISOString(),
  head: beforeHeadResult.stdout.trim(),
  sha256: await sourceMap(),
}
await writeFile(join(artifactDirectory, 'source-map-before.json'), `${JSON.stringify(before, null, 2)}\n`)

const exactChangedTest = tests[0]
await copyFile(join(root, exactChangedTest), join(snapshotDirectory, 'contentBosses.integration.test.ts'))
for (const path of tests.slice(1)) await copyFile(join(root, path), join(snapshotDirectory, path.split('/').at(-1)))
const priorSnapshot = join(root, 'reports/v2/20261008-content-expansion/phase-07/e-integration-run/root-fallback-20261013T051844Z/source/src/engine/contentBosses.integration.test.ts')
const beforeFixBytes = await readFile(priorSnapshot)
const afterFixBytes = await readFile(join(snapshotDirectory, 'contentBosses.integration.test.ts'))
await writeFile(join(artifactDirectory, 'test-change.json'), `${JSON.stringify({
  file: exactChangedTest,
  priorRootFallbackSha256: sha(beforeFixBytes),
  currentFrozenSha256: sha(afterFixBytes),
  diffCommand: 'diff -u <root-fallback source snapshot> <current source snapshot>',
}, null, 2)}\n`)
const diff = invoke('test-snapshot-diff', 'diff', ['-u', priorSnapshot, join(snapshotDirectory, 'contentBosses.integration.test.ts')])
await saveInvocation(diff)

const testRun = invoke('targeted-four-file', 'npx', [
  'vitest', 'run',
  'src/engine/contentBosses.integration.test.ts',
  'src/engine/contentFamilies.test.ts',
  'src/engine/caveInsects.integration.test.ts',
  'src/engine/remainingFamilies.integration.test.ts',
])
await saveInvocation(testRun)
const typeRun = invoke('vue-tsc', 'npx', ['vue-tsc', '--noEmit'])
await saveInvocation(typeRun)

const afterHeadResult = invoke('head-after', 'git', ['rev-parse', 'HEAD'])
const after = {
  capturedAtUtc: new Date().toISOString(),
  head: afterHeadResult.stdout.trim(),
  sha256: await sourceMap(),
}
await writeFile(join(artifactDirectory, 'source-map-after.json'), `${JSON.stringify(after, null, 2)}\n`)
const testReport = `${testRun.stdout}\n${testRun.stderr}`
const fileCount = Number(testReport.match(/Test Files\s+(\d+) passed/)?.[1] ?? 0)
const testCount = Number(testReport.match(/Tests\s+(\d+) passed/)?.[1] ?? 0)
const changedSnapshotMatchesAfter = sha(await readFile(join(snapshotDirectory, 'contentBosses.integration.test.ts'))) === after.sha256[exactChangedTest]
const summary = {
  runDirectory: relative(root, runDirectory),
  headBefore: before.head, headAfter: after.head,
  sourceMapFilesBefore: Object.keys(before.sha256).length,
  sourceMapFilesAfter: Object.keys(after.sha256).length,
  sourceMapUnchanged: JSON.stringify(before.sha256) === JSON.stringify(after.sha256),
  changedSnapshot: {
    file: exactChangedTest,
    sha256: sha(await readFile(join(snapshotDirectory, 'contentBosses.integration.test.ts'))),
    matchesCurrentAfterMap: changedSnapshotMatchesAfter,
    priorRootFallbackSha256: sha(beforeFixBytes),
    diffExitCode: diff.exitCode,
  },
  targeted: { exitCode: testRun.exitCode, signal: testRun.signal, error: testRun.error, testFilesPassed: fileCount, testsPassed: testCount },
  typecheck: { exitCode: typeRun.exitCode, signal: typeRun.signal, error: typeRun.error },
  allRequestedChecksPassed: testRun.exitCode === 0 && !testRun.signal && !testRun.error && fileCount === 4 && testCount === 39 && typeRun.exitCode === 0 && !typeRun.signal && !typeRun.error,
}
await writeFile(join(artifactDirectory, 'verification.json'), `${JSON.stringify(summary, null, 2)}\n`)
const report = [
  '# E Integration Audit Correction', '',
  `- Targeted command: npx vitest run ${tests.join(' ')}`,
  `- Actual result: ${fileCount} files / ${testCount} tests; exit ${testRun.exitCode ?? 'null'}`,
  `- Typecheck: npx vue-tsc --noEmit; exit ${typeRun.exitCode ?? 'null'}`,
  `- HEAD: ${before.head} before / ${after.head} after`,
  `- Full source/scripts/config/package maps unchanged: ${summary.sourceMapUnchanged} (${summary.sourceMapFilesBefore} / ${summary.sourceMapFilesAfter} files)`,
  `- Exact current test snapshot SHA-256: ${summary.changedSnapshot.sha256}`,
  `- Comparison to pre-correction Root fallback test snapshot: ${summary.changedSnapshot.priorRootFallbackSha256} → ${summary.changedSnapshot.sha256}; diff exit ${diff.exitCode} (expected 1 for this one-line deletion)`,
  '', 'Raw stdout/stderr, exits, UTC/Taipei timestamps, exact source snapshots, and source maps are retained in this directory.',
  'This is targeted post-correction evidence only; no full suite or validator CLI was run.',
]
await writeFile(join(runDirectory, 'audit-correction-summary.md'), `${report.join('\n')}\n`)
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
