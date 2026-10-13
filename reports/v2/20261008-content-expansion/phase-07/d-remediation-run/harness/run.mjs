import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../')
const own = join(root, 'reports/v2/20261008-content-expansion/phase-07/d-remediation-run')
const artifacts = join(own, 'artifacts')
const work = join(own, 'work')
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

async function inputMap() {
  const result = {}
  for (const path of ['src', 'scripts']) Object.assign(result, await hashTree(join(root, path), path))
  for (const path of ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts']) {
    result[path] = sha(await readFile(join(root, path)))
  }
  return result
}

function invoke(name, command, args) {
  const started = new Date()
  const child = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const ended = new Date()
  return {
    name, command, args, cwd: root,
    startedUtc: started.toISOString(), endedUtc: ended.toISOString(),
    startedTaipei: started.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    endedTaipei: ended.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    exitCode: child.status, signal: child.signal,
    error: child.error ? `${child.error.name}: ${child.error.message}` : null,
    stdout: child.stdout ?? '', stderr: child.stderr ?? '',
  }
}

async function save(name, result) {
  await writeFile(join(artifacts, `${name}.stdout.txt`), result.stdout)
  await writeFile(join(artifacts, `${name}.stderr.txt`), result.stderr)
  await writeFile(join(artifacts, `${name}.result.json`), `${JSON.stringify({ ...result, stdout: undefined, stderr: undefined }, null, 2)}\n`)
}

await mkdir(artifacts, { recursive: true })
await mkdir(work, { recursive: true })
const headResult = invoke('head', 'git', ['rev-parse', 'HEAD'])
const before = {
  capturedAtUtc: new Date().toISOString(), head: headResult.stdout.trim(),
  moduleSha256: sha(await readFile(join(root, 'src/data/content/caveInsects.ts'))),
  inputs: await inputMap(),
}
await writeFile(join(artifacts, 'before.json'), `${JSON.stringify(before, null, 2)}\n`)

const generated = join(work, 'cave-insect-current-source.json')
const generation = invoke('generate-current-source-pack', 'node', [
  relative(root, join(own, 'harness/generate.mjs')), relative(root, generated),
])
await save('generate-current-source-pack', generation)
if (generation.exitCode !== 0) throw new Error(`Pack generation failed with ${generation.exitCode}`)

const generatedBytes = await readFile(generated)
const retainedBytes = await readFile(join(root, 'reports/v2/20261008-content-expansion/phase-07/d-cave-insect-pack-gatefix.json'))
const generatedPack = JSON.parse(generatedBytes.toString('utf8'))
const negativePack = structuredClone(generatedPack)
const resin = negativePack.materials.find(material => material.id === 'cave_insect_resin')
if (!resin) throw new Error('Generated pack has no cave_insect_resin material')
resin.bias = { keen: 1 }
const negativeBytes = Buffer.from(JSON.stringify(negativePack))
const negativeInput = join(work, 'derived-negative-resin-keen.json')
await writeFile(negativeInput, negativeBytes, { flag: 'wx' })

const report = join(work, 'current-source-validation.md')
const positiveInput = relative(root, generated)
const positive = invoke('positive-current-source-validation', 'node', [
  'scripts/validate_content_batch.mjs', '--pack', positiveInput, '--report', relative(root, report),
])
await save('positive-current-source-validation', positive)
const negative = invoke('negative-derived-resin-keen-validation', 'node', [
  'scripts/validate_content_batch.mjs', '--pack', relative(root, negativeInput), '--report', relative(root, report),
])
await save('negative-derived-resin-keen-validation', negative)

const afterHead = invoke('head-after', 'git', ['rev-parse', 'HEAD'])
const after = {
  capturedAtUtc: new Date().toISOString(), head: afterHead.stdout.trim(),
  moduleSha256: sha(await readFile(join(root, 'src/data/content/caveInsects.ts'))),
  inputs: await inputMap(),
}
await writeFile(join(artifacts, 'after.json'), `${JSON.stringify(after, null, 2)}\n`)
const checks = {
  headUnchanged: before.head === after.head,
  moduleUnchanged: before.moduleSha256 === after.moduleSha256,
  inputMapUnchanged: JSON.stringify(before.inputs) === JSON.stringify(after.inputs),
  generatedBytes: generatedBytes.length,
  generatedSha256: sha(generatedBytes),
  retainedGatefixBytes: retainedBytes.length,
  retainedGatefixSha256: sha(retainedBytes),
  exactRetainedPackMatch: generatedBytes.equals(retainedBytes),
  negativeBytes: negativeBytes.length,
  negativeSha256: sha(negativeBytes),
}
await writeFile(join(artifacts, 'generation-comparison.json'), `${JSON.stringify(checks, null, 2)}\n`)
