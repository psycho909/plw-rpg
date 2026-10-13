import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../')
const output = dirname(fileURLToPath(import.meta.url))
const packsDirectory = join(output, 'content-packs')
const casesDirectory = join(output, 'content-validator-cases')
const catalogs = ['families', 'monsters', 'lootTables', 'equipment', 'materials', 'crops', 'cropGoods', 'recipes', 'affixes']
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

async function hashTree(directory, prefix = '') {
  const hashes = {}
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name)
    const key = join(prefix, entry.name).replaceAll('\\', '/')
    if (entry.isDirectory()) {
      if (entry.name === '__pycache__') continue
      Object.assign(hashes, await hashTree(absolute, key))
    } else if (entry.isFile() && !entry.name.endsWith('.pyc')) hashes[key] = sha(await readFile(absolute))
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
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts']) hashes[file] = sha(await readFile(join(root, file)))
  return hashes
}

function run(name, command, args) {
  const start = new Date()
  const child = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const end = new Date()
  return {
    name, command, args, cwd: root, startedUtc: start.toISOString(), endedUtc: end.toISOString(),
    startedTaipei: start.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    endedTaipei: end.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei', hour12: false }),
    exitCode: child.status, signal: child.signal, error: child.error ? `${child.error.name}: ${child.error.message}` : null,
    stdout: child.stdout ?? '', stderr: child.stderr ?? '',
  }
}

await mkdir(packsDirectory, { recursive: true })
await mkdir(casesDirectory, { recursive: true })
const beforeHead = run('head-before', 'git', ['rev-parse', 'HEAD']).stdout.trim()
const before = { capturedAtUtc: new Date().toISOString(), head: beforeHead, sha256: await sourceMap() }
await writeFile(join(output, 'validator-source-before.json'), `${JSON.stringify(before, null, 2)}\n`, { flag: 'wx' })

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true }, appType: 'custom' })
const packs = []
try {
  const { CONTENT_PACKS } = await vite.ssrLoadModule('/src/data/contentRegistry.ts')
  if (CONTENT_PACKS.length !== 7) throw new Error(`Expected seven registered content packs; received ${CONTENT_PACKS.length}`)
  const combined = Object.fromEntries(catalogs.map(key => [key, []]))
  for (const pack of CONTENT_PACKS) {
    const name = pack.crops.length || pack.cropGoods.length ? 'g-crops' : pack.families[0]?.id ?? `pack-${packs.length + 1}`
    const bytes = Buffer.from(JSON.stringify(pack))
    const file = `${name}.json`
    await writeFile(join(packsDirectory, file), bytes, { flag: 'wx' })
    const counts = Object.fromEntries(catalogs.map(key => [key, pack[key].length]))
    packs.push({ name, file, bytes: bytes.length, sha256: sha(bytes), counts })
    for (const key of catalogs) combined[key].push(...pack[key])
  }
  const combinedBytes = Buffer.from(JSON.stringify(combined))
  await writeFile(join(packsDirectory, 'seven-pack-combined.json'), combinedBytes, { flag: 'wx' })
  const manifest = {
    generatedAtUtc: new Date().toISOString(), source: 'Vite SSR current CONTENT_PACKS registry', packs,
    combined: { file: 'seven-pack-combined.json', bytes: combinedBytes.length, sha256: sha(combinedBytes), counts: Object.fromEntries(catalogs.map(key => [key, combined[key].length])) },
  }
  await writeFile(join(packsDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
} finally { await vite.close() }

const outcomes = []
for (const pack of [...packs, { name: 'seven-pack-combined', file: 'seven-pack-combined.json' }]) {
  const caseDirectory = join(casesDirectory, pack.name)
  await mkdir(caseDirectory, { recursive: true })
  const report = join(caseDirectory, 'report.md')
  const args = ['scripts/validate_content_batch.mjs', '--pack', relative(root, join(packsDirectory, pack.file)), '--report', relative(root, report)]
  const result = run(`validate-${pack.name}`, 'node', args)
  await writeFile(join(caseDirectory, 'stdout.txt'), result.stdout, { flag: 'wx' })
  await writeFile(join(caseDirectory, 'stderr.txt'), result.stderr, { flag: 'wx' })
  const metadata = { ...result, stdout: undefined, stderr: undefined }
  await writeFile(join(caseDirectory, 'result.json'), `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' })
  let reportText = ''
  try { reportText = await readFile(report, 'utf8') } catch {}
  outcomes.push({
    name: pack.name, exitCode: result.exitCode, signal: result.signal, error: result.error,
    contentStatus: reportText.match(/^- Content validation status: (.+)$/m)?.[1] ?? null,
    overallStatus: reportText.match(/^- Overall validator \+ child-check outcome: (.+)$/m)?.[1] ?? null,
    qualifyingNewMonsters: Number(reportText.match(/^- Qualifying new monsters: (\d+)$/m)?.[1] ?? NaN),
    candidateNewItemIds: Number(reportText.match(/^- Authoring-qualified candidate new item IDs: (\d+)$/m)?.[1] ?? NaN),
    usableNewMaterials: Number(reportText.match(/^- Authoring-qualified usable new materials: (\d+)$/m)?.[1] ?? NaN),
    errors: reportText.split('\n').filter(line => line.startsWith('- ERROR ')),
    warnings: reportText.split('\n').filter(line => line.startsWith('- WARNING ')),
  })
}

const afterHead = run('head-after', 'git', ['rev-parse', 'HEAD']).stdout.trim()
const after = { capturedAtUtc: new Date().toISOString(), head: afterHead, sha256: await sourceMap() }
await writeFile(join(output, 'validator-source-after.json'), `${JSON.stringify(after, null, 2)}\n`, { flag: 'wx' })
const manifest = JSON.parse(await readFile(join(packsDirectory, 'manifest.json'), 'utf8'))
const summary = {
  headBefore: before.head, headAfter: after.head, headUnchanged: before.head === after.head,
  sourceMapFilesBefore: Object.keys(before.sha256).length, sourceMapFilesAfter: Object.keys(after.sha256).length,
  sourceMapsUnchanged: JSON.stringify(before.sha256) === JSON.stringify(after.sha256),
  perPackCounts: manifest.packs, combinedCounts: manifest.combined.counts,
  combinedPackSha256: manifest.combined.sha256, cases: outcomes,
  everyCasePasses: outcomes.length === 8 && outcomes.every(item => item.exitCode === 0 && item.contentStatus === 'PASS' && item.overallStatus === 'PASS' && item.errors.length === 0),
  allWarnings: outcomes.flatMap(item => item.warnings.map(warning => `${item.name}: ${warning}`)),
  allErrors: outcomes.flatMap(item => item.errors.map(error => `${item.name}: ${error}`)),
}
await writeFile(join(output, 'content-validator-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { flag: 'wx' })
process.stdout.write(`${JSON.stringify({ attemptDirectory: relative(root, output), headBeforeAfter: [before.head, after.head], sourceMapsUnchanged: summary.sourceMapsUnchanged, perPackCounts: manifest.packs, combined: manifest.combined, cases: outcomes, everyCasePasses: summary.everyCasePasses, warningCount: summary.allWarnings.length, errorCount: summary.allErrors.length }, null, 2)}\n`)
