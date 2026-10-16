import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'

const root = process.cwd()
const phase = 'reports/v2/20261016-final-qa-rc/phase-10'
const prior = 'reports/v2/20261014-balance-tuning/phase-08/e-runner/instrumented-attempt-20261014T102419801Z'
const out = resolve(root, phase, 'c-runner')
await mkdir(out, { recursive: true })
const readJson = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'))
const manifest = await readJson(`${prior}/manifest.json`)
const analysis = await readJson(`${prior}/analysis-summary-r9.json`)
const outcomePath = `${phase}/a-runner/.qa-runs/2026-10-16T03-25-11.678Z-0153933c-b29b-402a-a208-12e2ea87790a/outcome.json`
const validator = await readJson(outcomePath)
const head = (await readFile(resolve(root, '.git/HEAD'), 'utf8')).trim()
const summaryHash = createHash('sha256').update(await readFile(resolve(root, `${prior}/analysis-summary-r9.json`))).digest('hex')
function csvRows(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/)
  const split = line => {
    const values = []; let value = ''; let quoted = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"' && quoted && line[i + 1] === '"') { value += '"'; i++ }
      else if (ch === '"') quoted = !quoted
      else if (ch === ',' && !quoted) { values.push(value); value = '' }
      else value += ch
    }
    values.push(value); return values
  }
  const headers = split(headerLine)
  return lines.filter(Boolean).map(line => Object.fromEntries(split(line).map((value, i) => [headers[i], value])))
}
const readGzipCsv = async name => csvRows(gunzipSync(await readFile(resolve(root, `${prior}/${name}`))).toString('utf8'))
const gear = csvRows(await readFile(resolve(root, `${prior}/gear-upgrades.csv`), 'utf8'))
const crafts = csvRows(await readFile(resolve(root, `${prior}/crafts.csv`), 'utf8'))
const encounters = await readGzipCsv('encounters.csv.gz')
const firstRewardByRouteSeed = []
for (const route of ['life', 'adventure', 'hybrid']) for (const seed of [61101, 61102, 61103]) {
  const key = row => row.route === route && Number(row.seed) === seed
  const upgrade = gear.filter(key).filter(row => row.meaningful === 'true').map(row => Number(row.at)).sort((a,b) => a-b)[0] ?? null
  const craft = crafts.filter(key).map(row => Number(row.at)).sort((a,b) => a-b)[0] ?? null
  const seedPath = `${prior}/seed-${route}-${seed}.json.gz`
  const seedData = JSON.parse(gunzipSync(await readFile(resolve(root, seedPath))).toString('utf8'))
  const initial = { farming: 1, woodcutting: 1, mining: 1, smithing: 1, combat: 1 }
  const skillSnapshot = seedData.daily.find(row => Object.keys(initial).some(skill => row[skill] > initial[skill]))
  const skill = skillSnapshot?.worldTime ?? null
  const boss = encounters.filter(row => key(row) && row.rank === 'boss' && row.outcome === 'win')
    .map(row => Number(row.at) + Number(row.timeDeltaMinutes)).sort((a,b) => a-b)[0] ?? null
  const events = { equippedUpgrade: upgrade, craftSuccess: craft, skillLevelUpSnapshot: skill, bossReward: boss }
  const present = Object.values(events).filter(value => value !== null)
  firstRewardByRouteSeed.push({ route, seed, events, firstMeaningfulReward: present.length ? Math.min(...present) : null })
}
const evidence = {
  headRef: head, phase8SourceHead: manifest.head, phase8SourceFingerprint: manifest.srcFingerprint,
  phase8Seeds: manifest.seeds, routePolicyVersion: manifest.routePolicyVersion, phase8SummaryHash: summaryHash,
  validator: { semanticStatus: validator.contentValidationStatus, overallStatus: validator.overallStatus, checks: Object.fromEntries(Object.entries(validator.checks).map(([k, v]) => [k, v.status])), outcomePath },
  noProgress: { total: analysis.noProgressCount, counts: analysis.noProgressCounts, byRoute: analysis.noProgressByRoute },
  choreRows: analysis.choreRows, firstRewardByRouteSeed,
}
await writeFile(resolve(out, 'evidence-summary.json'), `${JSON.stringify(evidence, null, 2)}\n`)
console.log(resolve(out, 'c-summary.md'))
