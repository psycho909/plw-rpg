import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../')
const owner = join(root, 'reports/v2/20261008-content-expansion/phase-07/d-remaining-full-check-run')
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`
const runDirectory = join(owner, 'runs', runId)
const artifacts = join(runDirectory, 'artifacts')
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
async function fingerprint() {
  const result = {}
  for (const directory of ['src', 'scripts']) Object.assign(result, await hashTree(join(root, directory), directory))
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts']) result[file] = sha(await readFile(join(root, file)))
  return result
}
function command() {
  const start = new Date()
  const child = spawnSync('npm', ['run', 'check'], { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 })
  const end = new Date()
  return { command: 'npm', args: ['run', 'check'], cwd: root,
    startedUtc: start.toISOString(), endedUtc: end.toISOString(),
    startedTaipei: start.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    endedTaipei: end.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    exitCode: child.status, signal: child.signal,
    error: child.error ? `${child.error.name}: ${child.error.message}` : null,
    stdout: child.stdout ?? '', stderr: child.stderr ?? '' }
}

await mkdir(artifacts, { recursive: true })
const headBefore = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim()
const before = { capturedAtUtc: new Date().toISOString(), head: headBefore, sourceConfigPackageSha256: await fingerprint() }
await writeFile(join(artifacts, 'before.json'), `${JSON.stringify(before, null, 2)}\n`)
const result = command()
await writeFile(join(artifacts, 'npm-run-check.stdout.txt'), result.stdout)
await writeFile(join(artifacts, 'npm-run-check.stderr.txt'), result.stderr)
await writeFile(join(artifacts, 'npm-run-check.result.json'), `${JSON.stringify({ ...result, stdout: undefined, stderr: undefined }, null, 2)}\n`)
const headAfter = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim()
const after = { capturedAtUtc: new Date().toISOString(), head: headAfter, sourceConfigPackageSha256: await fingerprint() }
await writeFile(join(artifacts, 'after.json'), `${JSON.stringify(after, null, 2)}\n`)
const summary = { runId, exitCode: result.exitCode, signal: result.signal,
  headUnchanged: before.head === after.head,
  sourceConfigPackageMapUnchanged: JSON.stringify(before.sourceConfigPackageSha256) === JSON.stringify(after.sourceConfigPackageSha256),
  testSummary: result.stdout.match(/Test Files[^\n]*|Tests[^\n]*|Duration[^\n]*/g) ?? [],
  startedUtc: result.startedUtc, endedUtc: result.endedUtc,
  startedTaipei: result.startedTaipei, endedTaipei: result.endedTaipei }
await writeFile(join(artifacts, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
const report = [
  '# Canonical Full Check', '',
  `- Run: ${runId}`,
  `- Command: npm run check`,
  `- Exit: ${result.exitCode ?? 'null'}${result.signal ? `; signal ${result.signal}` : ''}${result.error ? `; ${result.error}` : ''}`,
  `- UTC: ${result.startedUtc} – ${result.endedUtc}`,
  `- Asia/Taipei: ${result.startedTaipei} – ${result.endedTaipei}`,
  `- HEAD before/after unchanged: ${summary.headUnchanged}`,
  `- Full src/scripts/config/package SHA map unchanged: ${summary.sourceConfigPackageMapUnchanged}`,
  '', '## Test summary', '',
  ...(summary.testSummary.length ? summary.testSummary.map(line => `- ${line.trim()}`) : ['- No Vitest summary lines captured.']),
  '', 'Raw stdout/stderr and complete before/after hashes are in `artifacts/`.',
]
await writeFile(join(runDirectory, 'd-remaining-full-check-summary.md'), `${report.join('\n')}\n`)
