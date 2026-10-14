import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createGunzip } from 'node:zlib'
import { createInterface } from 'node:readline'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const input = join(root, 'reports/v2/20261008-content-expansion/phase-07/j-formal-20261013/combat-attempt-05/combat-raw.jsonl.gz')
const outRoot = join(root, 'reports/v2/20261014-balance-tuning/phase-08/a-baseline-run')

async function headSha() {
  const gitDir = join(root, '.git')
  const head = (await readFile(join(gitDir, 'HEAD'), 'utf8')).trim()
  if (!head.startsWith('ref: ')) return head
  const ref = head.slice(5)
  try { return (await readFile(join(gitDir, ref), 'utf8')).trim() }
  catch (error) {
    if (error.code !== 'ENOENT') throw error
    const packed = await readFile(join(gitDir, 'packed-refs'), 'utf8')
    const row = packed.split(/\r?\n/).find(line => line.endsWith(` ${ref}`))
    if (!row) throw new Error(`Cannot resolve HEAD ref ${ref}`)
    return row.split(' ')[0]
  }
}

async function fingerprint(directory) {
  const files = []
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = join(path, entry.name)
      if (entry.isDirectory()) await visit(file)
      else files.push(file)
    }
  }
  await visit(directory)
  files.sort()
  const digest = createHash('sha256')
  for (const file of files) {
    digest.update(file.slice(directory.length).replaceAll('\\', '/') + '\0')
    digest.update(await readFile(file))
    digest.update('\0')
  }
  return { algorithm: 'sha256(sorted relative path + NUL + file bytes + NUL)', value: digest.digest('hex'), files: files.length }
}

const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('-', '').replaceAll('.', '')
const attempt = join(outRoot, `attempt-${stamp}`)
await mkdir(attempt, { recursive: false })
const source = await fingerprint(join(root, 'src'))
const inputHash = createHash('sha256')
const inputBytes = await readFile(input)
inputHash.update(inputBytes)
const manifest = {
  head: await headSha(), sourceFingerprint: source, seeds: 'distinct row-level seed values recorded in result.json',
  routePolicyVersion: 'phase7-controlled-combat-raw-extraction-v1', command: 'node scripts/phase8/extract-combat.mjs',
  input: 'reports/v2/20261008-content-expansion/phase-07/j-formal-20261013/combat-attempt-05/combat-raw.jsonl.gz',
  inputSha256: inputHash.digest('hex'), generatedAt: new Date().toISOString(),
}
const groups = new Map()
const seeds = new Set()
let rows = 0
const reader = createInterface({ input: createReadStream(input).pipe(createGunzip()), crlfDelay: Infinity })
for await (const line of reader) {
  if (!line) continue
  const row = JSON.parse(line)
  seeds.add(row.seed)
  const key = [row.rank, row.band, row.build].join('/')
  const group = groups.get(key) ?? { rank: row.rank, band: row.band, build: row.build, samples: 0, wins: 0, deaths: 0, turns: [], hp: [], netHpLoss: [], seeds: new Set() }
  group.samples++
  group.wins += Number(row.won)
  group.deaths += Number(row.died)
  group.turns.push(row.turns)
  group.hp.push(row.hp)
  group.netHpLoss.push((row.progression?.stats?.hp ?? row.progression?.stats?.maxHp ?? row.hp) - row.hp)
  group.seeds.add(row.seed)
  groups.set(key, group)
  rows++
}
const percentile = (values, fraction) => {
  const ordered = [...values].sort((a, b) => a - b)
  return ordered[Math.ceil(fraction * ordered.length) - 1] ?? null
}
const summaries = [...groups.values()].sort((a, b) => `${a.rank}/${a.band}/${a.build}`.localeCompare(`${b.rank}/${b.band}/${b.build}`)).map(group => ({
  rank: group.rank, band: group.band, build: group.build, samples: group.samples, wins: group.wins, deaths: group.deaths,
  turnsP10: percentile(group.turns, .1), turnsP50: percentile(group.turns, .5), turnsP90: percentile(group.turns, .9),
  remainingPlayerHpP10: percentile(group.hp, .1), remainingPlayerHpP50: percentile(group.hp, .5), remainingPlayerHpP90: percentile(group.hp, .9),
  netHpLossP10: percentile(group.netHpLoss, .1), netHpLossP50: percentile(group.netHpLoss, .5), netHpLossP90: percentile(group.netHpLoss, .9),
  damageTaken: 'NOT AVAILABLE: total turn-wise incoming damage is not retained; net HP loss is a separate proxy and may include healing',
  potionUse: 'NOT AVAILABLE: raw row does not record potion count/use',
  fightCost: 'NOT AVAILABLE: raw row does not record consumable/gold opportunity cost',
  fixtureClass: 'CONTROLLED_LEGAL_FIXTURE_NOT_NATURAL_PLAY', seedSet: [...group.seeds].sort((a, b) => a - b).join('|'),
}))
const result = { inputRows: rows, groupCount: summaries.length, distinctSeeds: [...seeds].sort((a, b) => a - b), source: manifest.input, sampleUnit: 'one controlled encounter row', groups: summaries }
const csvRows = ['rank,band,build,samples,wins,deaths,turnsP10,turnsP50,turnsP90,hpP10,hpP50,hpP90,netHpLossP10,netHpLossP50,netHpLossP90,damageTaken,potionUse,fightCost,fixtureClass,seeds',
  ...summaries.map(row => [row.rank,row.band,row.build,row.samples,row.wins,row.deaths,row.turnsP10,row.turnsP50,row.turnsP90,row.remainingPlayerHpP10,row.remainingPlayerHpP50,row.remainingPlayerHpP90,row.netHpLossP10,row.netHpLossP50,row.netHpLossP90,'NOT AVAILABLE','NOT AVAILABLE','NOT AVAILABLE',row.fixtureClass,row.seedSet].join(','))].join('\n') + '\n'
const markdown = [
  '# Phase 7 Controlled Combat Raw Extraction', '',
  `Input rows: ${rows}; grouped rank × progression band × build cells: ${summaries.length}; distinct row seeds: ${seeds.size}.`,
  'Sample counts vary by rank because each cell aggregates the catalog definitions of that rank. Percentiles use nearest-rank ordering.',
  'Total damage taken, potion use, and fight cost are NOT AVAILABLE: raw rows contain no turn-wise incoming damage, potion count/use, or spend ledger. Net HP loss is shown only as a separate proxy; it can be affected by healing.', '',
  '| Rank | Band | Build | N | Wins / deaths | Turns P10 / P50 / P90 | Remaining HP P10 / P50 / P90 | Net HP loss P50 |',
  '|---|---|---|---:|---:|---|---|---:|',
  ...summaries.map(row => `| ${row.rank} | ${row.band} | ${row.build} | ${row.samples} | ${row.wins} / ${row.deaths} | ${row.turnsP10} / ${row.turnsP50} / ${row.turnsP90} | ${row.remainingPlayerHpP10} / ${row.remainingPlayerHpP50} / ${row.remainingPlayerHpP90} | ${row.netHpLossP50} |`),
  '', `Source: ${manifest.input}; seeds: ${[...seeds].sort((a, b) => a - b).join(', ')}. All rows are CONTROLLED_LEGAL_FIXTURE_NOT_NATURAL_PLAY.`, '',
].join('\n')
manifest.seeds = [...seeds].sort((a, b) => a - b)
await writeFile(join(attempt, 'combat-extraction.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
await writeFile(join(attempt, 'combat-extraction.csv'), csvRows, { flag: 'wx' })
await writeFile(join(attempt, 'combat-extraction.md'), markdown, { flag: 'wx' })
await writeFile(join(attempt, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
await writeFile(join(attempt, 'runner.log'), `PASS rows=${rows} groups=${summaries.length}; controlled fixtures; no simulation rerun\n`, { flag: 'wx' })
console.log(JSON.stringify({ attempt, rows, groups: summaries.length }, null, 2))
