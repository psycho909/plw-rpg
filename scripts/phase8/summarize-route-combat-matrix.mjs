import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MATRIX_BOSS_IDS } from './combat-matrix.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const runRoot = join(root, 'reports/v2/20261014-balance-tuning/phase-08/b-runner/normal-route-attempts')
const outputRoot = join(root, 'reports/v2/20261014-balance-tuning/phase-08/b-runner/route-matrix-attempts')
const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('-', '').replaceAll('.', '')
const output = join(outputRoot, `attempt-${stamp}`)

function parseCsvLine(line) {
  const values = []
  let value = '', quoted = false
  for (let index = 0; index < line.length; index++) {
    const character = line[index]
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index++ }
    else if (character === '"') quoted = !quoted
    else if (character === ',' && !quoted) { values.push(value); value = '' }
    else value += character
  }
  values.push(value)
  return values
}

async function latestCompletedAttempt(policy) {
  const directory = join(runRoot, policy)
  const names = (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && entry.name.startsWith('attempt-'))
    .map(entry => entry.name).sort().reverse()
  for (const name of names) {
    const path = join(directory, name)
    try {
      const completion = JSON.parse(await readFile(join(path, 'completion.json'), 'utf8'))
      if (completion.status !== 'PASS') continue
      const manifest = JSON.parse(await readFile(join(path, 'manifest.json'), 'utf8'))
      const csv = (await readFile(join(path, 'encounter-summary.csv'), 'utf8')).trim()
      const [headerLine, ...dataLines] = csv.split(/\r?\n/)
      const headers = parseCsvLine(headerLine)
      const rows = dataLines.filter(Boolean).map(line => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])))
      return { policy, attempt: name, manifest, rows }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  throw new Error(`No passing ${policy} normal-route attempt with encounter summaries; run that policy first.`)
}

const [v3, measured] = await Promise.all([latestCompletedAttempt('v3'), latestCompletedAttempt('measured')])
const byKey = new Map()
for (const run of [v3, measured]) for (const row of run.rows) {
  const key = [row.routeVariant, row.definitionId, row.rank, row.band].join('/')
  byKey.set(key, { ...row, policy: run.policy, attempt: run.attempt })
}
const bossRows = ['v3', 'measured'].flatMap(policy => MATRIX_BOSS_IDS.flatMap(definitionId => ['early', 'mid', 'late'].map(band => {
  const candidate = [...byKey.values()].find(row => row.policy === policy && row.definitionId === definitionId && row.rank === 'boss' && row.band === band)
  return candidate ?? { policy, definitionId, rank: 'boss', band, status: 'NOT OBSERVED', encounters: '0', fixtureClass: 'SCRIPTED_NORMAL_ROUTE_NOT_CONTROLLED' }
})))

await mkdir(outputRoot, { recursive: true })
await mkdir(output, { recursive: false })
await writeFile(join(output, 'route-combat-matrix.json'), `${JSON.stringify({ schema: 1,
  status: 'SCRIPTED_ROUTE_COMPARISON_NOT_CONTROLLED_BUILD_MATRIX', generatedAt: new Date().toISOString(),
  attempts: { v3: v3.attempt, measured: measured.attempt },
  commonSeeds: v3.manifest.seeds, measuredSeeds: measured.manifest.seeds,
  bossIds: MATRIX_BOSS_IDS, bossRows, routeRows: [...byKey.values()],
  interpretation: 'Natural-scripted route outcomes compare the two policies and preserve per-Boss ID/rank/band. These rows do not fill controlled acquisition-source or build-style cells.',
}, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ output, status: 'PASS', v3Attempt: v3.attempt, measuredAttempt: measured.attempt,
  bossRows: bossRows.length, routeRows: byKey.size }, null, 2))
