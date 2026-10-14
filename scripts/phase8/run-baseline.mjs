import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { summarizeActions } from './classify-playtest.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const attemptsDir = join(root, 'reports/v2/20261014-balance-tuning/phase-08/a-baseline-run')
const phase7 = join(root, 'reports/v2/20261008-content-expansion/phase-07')
const actionPath = join(phase7, 'qa-browser-runs/20261013T173052Z-pid410744/actions.jsonl')
async function readHead() {
  const gitDir = join(root, '.git')
  const headRef = (await readFile(join(gitDir, 'HEAD'), 'utf8')).trim()
  if (!headRef.startsWith('ref: ')) return headRef
  const ref = headRef.slice(5)
  try {
    return (await readFile(join(gitDir, ref), 'utf8')).trim()
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const packed = await readFile(join(gitDir, 'packed-refs'), 'utf8')
    const match = packed.split(/\r?\n/).find(line => line.endsWith(` ${ref}`))
    if (!match) throw new Error(`Cannot resolve HEAD ref ${ref} from loose or packed refs`)
    return match.split(' ')[0]
  }
}
const head = await readHead()
const attemptName = `attempt-${new Date().toISOString().replaceAll(':', '').replaceAll('-', '').replaceAll('.', '')}`
const runDir = join(attemptsDir, attemptName)

async function fingerprint(directory) {
  const files = []
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const full = join(path, entry.name)
      if (entry.isDirectory()) await visit(full)
      else files.push(full)
    }
  }
  await visit(directory)
  files.sort()
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(file.slice(directory.length).replaceAll('\\', '/') + '\0')
    hash.update(await readFile(file))
    hash.update('\0')
  }
  return { algorithm: 'sha256 over sorted relative path + NUL + file bytes + NUL', value: hash.digest('hex'), files: files.length }
}

await mkdir(runDir, { recursive: true })
const actionText = await readFile(actionPath, 'utf8')
const raw = actionText.replaceAll('}{"atUTC":', '}\n{"atUTC":').trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
const summary = summarizeActions(raw)
const csv = ['action_count,no_progress_count,runner,ui,resource,world_wait,goal', [summary.actionCount, summary.noProgressCount, ...['runner', 'ui', 'resource', 'world-wait', 'goal'].map(key => summary.categories[key].count)].join(',')].join('\n') + '\n'
const source = await fingerprint(join(root, 'src'))
const result = { source: 'Phase7 one-hour normal fresh-save browser heuristic trace', path: 'reports/v2/20261008-content-expansion/phase-07/qa-browser-runs/20261013T173052Z-pid410744/actions.jsonl', ...summary, limitations: ['classification is a transparent heuristic over runner action fields and visible text; low-confidence classes are not product findings', 'no human goal, emotion, or intent inference'] }
const manifest = { head, sourceFingerprint: source, seeds: 'browser fresh-save run seed not recorded in per-action log; do not infer', command: 'node scripts/phase8/run-baseline.mjs', attempt: attemptName, input: actionPath, inputSha256: createHash('sha256').update(await readFile(actionPath)).digest('hex'), generatedAt: new Date().toISOString() }
await writeFile(join(runDir, 'no-progress-classification.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
await writeFile(join(runDir, 'no-progress-classification.csv'), csv, { flag: 'wx' })
await writeFile(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' })
await writeFile(join(runDir, 'runner.log'), `PASS actions=${summary.actionCount} noProgress=${summary.noProgressCount} head=${head}\n`, { flag: 'wx' })
console.log(JSON.stringify({ runDir, ...summary, head, sourceFingerprint: source.value }, null, 2))
