import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { aggregateStatus, captureRunEvidence, runCheck, writeRunArtifact } from './validate_content_evidence.mjs'

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'content-evidence-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const pack = join(root, 'pack.json')
  await writeFile(pack, '{"first":true}\n')
  execFileSync('git', ['init', '--quiet', '--initial-branch=qa'], { cwd: root })
  execFileSync('git', ['config', 'user.email', 'qa@example.invalid'], { cwd: root })
  execFileSync('git', ['config', 'user.name', 'QA fixture'], { cwd: root })
  execFileSync('git', ['add', 'pack.json'], { cwd: root })
  execFileSync('git', ['commit', '--quiet', '-m', 'fixture'], { cwd: root })
  return { root, pack }
}

test('captures the supplied bytes before later input changes', async t => {
  const { root, pack } = await fixture(t)
  const modulePath = join(root, 'src', 'data', 'content', 'authored.ts')
  await mkdir(join(root, 'src', 'data', 'content'), { recursive: true })
  await writeFile(modulePath, 'export const authored = true\n')
  const run = await captureRunEvidence({ root, packPath: pack, reportDirectory: join(root, 'reports'), sourcePaths: ['pack.json'] })
  await writeFile(pack, '{"replacement":true}\n')
  await writeFile(modulePath, 'export const authored = false\n')
  assert.equal(await readFile(join(run.directory, 'input', 'pack.json'), 'utf8'), '{"first":true}\n')
  assert.equal(await readFile(join(run.directory, 'source', 'src', 'data', 'content', 'authored.ts'), 'utf8'), 'export const authored = true\n')
  assert.equal(run.manifest.pack.sha256, 'a99021b4c4b1649d55588c65956389eba90f562a5fd3ad43e9107c524a5dba5b')
})

test('allocates distinct run directories and keeps each captured input', async t => {
  const { root, pack } = await fixture(t)
  const options = { root, packPath: pack, reportDirectory: join(root, 'reports'), sourcePaths: ['pack.json'] }
  const first = await captureRunEvidence(options)
  await writeFile(pack, '{"second":true}\n')
  const second = await captureRunEvidence(options)
  assert.notEqual(first.directory, second.directory)
  assert.equal(await readFile(join(first.directory, 'input', 'pack.json'), 'utf8'), '{"first":true}\n')
  assert.equal(await readFile(join(second.directory, 'input', 'pack.json'), 'utf8'), '{"second":true}\n')
})

test('retains malformed input bytes before JSON parsing fails', async t => {
  const { root, pack } = await fixture(t)
  await writeFile(pack, '{ malformed\n')
  const run = await captureRunEvidence({ root, packPath: pack, reportDirectory: join(root, 'reports'), sourcePaths: ['pack.json'] })
  assert.throws(() => JSON.parse(run.packBytes.toString('utf8')))
  assert.equal(await readFile(join(run.directory, 'input', 'pack.json'), 'utf8'), '{ malformed\n')
})

test('uses process exit status even when a child prints success text', () => {
  const result = runCheck(process.execPath, ['-e', "console.log('PASS'); process.exit(7)"])
  assert.equal(result.stdout.trim(), 'PASS')
  assert.equal(result.exitCode, 7)
  assert.equal(result.status, 'FAIL')
})

test('retains a no-output child failure as a failure', () => {
  const result = runCheck(process.execPath, ['-e', 'process.exit(4)'])
  assert.equal(result.stdout, '')
  assert.equal(result.stderr, '')
  assert.equal(result.exitCode, 4)
  assert.equal(result.status, 'FAIL')
})

test('records a spawn error as a failed child check', () => {
  const result = runCheck('content-evidence-command-that-does-not-exist', [])
  assert.equal(result.exitCode, null)
  assert.match(result.error, /Error/)
  assert.equal(result.status, 'FAIL')
})

test('overall status fails when validation or any child check fails', () => {
  assert.equal(aggregateStatus('PASS', { tests: { status: 'FAIL' } }), 'FAIL')
  assert.equal(aggregateStatus('FAIL', { tests: { status: 'PASS' } }), 'FAIL')
  assert.equal(aggregateStatus('PASS', { tests: { status: 'PASS' } }), 'PASS')
})

test('refuses to overwrite an existing run artifact', async t => {
  const { root } = await fixture(t)
  await writeRunArtifact(root, 'outcome.json', 'original outcome')
  await assert.rejects(writeRunArtifact(root, 'outcome.json', 'replacement'), { code: 'EEXIST' })
  assert.equal(await readFile(join(root, 'outcome.json'), 'utf8'), 'original outcome')
})
