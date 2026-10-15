import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createServer } from 'vite'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const phaseRoot = join(root, 'reports/v2/20261014-balance-tuning/phase-08/e-runner')
const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('-', '').replaceAll('.', '')
const out = join(phaseRoot, `loot-attempt-${stamp}`)
const started = new Date()
const callsPerCohort = 4167
const runnerSha256 = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex')
async function readHead() {
  const head = (await readFile(join(root, '.git/HEAD'), 'utf8')).trim()
  if (!head.startsWith('ref: ')) return head
  const ref = head.slice(5)
  try { return (await readFile(join(root, '.git', ref), 'utf8')).trim() }
  catch (error) {
    if (error.code !== 'ENOENT') throw error
    const packed = await readFile(join(root, '.git/packed-refs'), 'utf8')
    const row = packed.split(/\r?\n/).find(line => line.endsWith(` ${ref}`))
    if (!row) throw new Error(`Cannot resolve HEAD ref ${ref}`)
    return row.split(' ')[0]
  }
}
await mkdir(phaseRoot, { recursive: true }); await mkdir(out, { recursive: false })
let vite
try {
  vite = await createServer({ configFile: false, root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
  const [{ CONTENT_MONSTERS }, simulation, loot] = await Promise.all([
    vite.ssrLoadModule('/src/data/contentRegistry.ts'), vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/engine/itemGeneration.ts'),
  ])
  const { createGame } = simulation
  const cohorts = new Map()
  for (const monster of Object.values(CONTENT_MONSTERS)) {
    const key = `${monster.familyId}/${monster.rank}`
    if (!cohorts.has(key)) cohorts.set(key, [])
    cohorts.get(key).push(monster.id)
  }
  const rows = [], materials = {}, bases = {}, rarities = {}, familyRank = {}
  let calls = 0, gear = 0
  for (const [cohortIndex, [key, monsterIds]] of [...cohorts].sort(([a], [b]) => a.localeCompare(b)).entries()) {
    const state = createGame(40131 + cohortIndex)
    const [familyId, rank] = key.split('/')
    let cohortGear = 0
    for (let i = 0; i < callsPerCohort; i++) {
      const definitionId = monsterIds[i % monsterIds.length]
      const result = loot.awardContentLoot(state, { definitionId })
      calls++
      if (result.instance) {
        gear++; cohortGear++
        bases[result.instance.baseId] = (bases[result.instance.baseId] ?? 0) + 1
        rarities[result.instance.rarity] = (rarities[result.instance.rarity] ?? 0) + 1
      }
      for (const [id, amount] of Object.entries(result.materials)) materials[id] = (materials[id] ?? 0) + amount
    }
    familyRank[key] = { familyId, rank, monsterIds, calls: callsPerCohort, gearAwards: cohortGear,
      gearRate: cohortGear / callsPerCohort }
    rows.push(familyRank[key])
  }
  const mirrorChecks = []
  for (let index = 0; index < rows.length; index++) for (let n = 0; n < 50; n++) {
    const id = rows[index].monsterIds[n % rows[index].monsterIds.length], seed = 99001 + index * 100 + n
    const left = createGame(seed), right = createGame(seed)
    const a = loot.awardContentLoot(left, { definitionId: id }), b = loot.awardContentLoot(right, { definitionId: id })
    const same = JSON.stringify(a) === JSON.stringify(b) && left.rngState === right.rngState
      && left.reward.nextInstanceId === right.reward.nextInstanceId
    if (!same) throw new Error(`determinism mirror mismatch ${rows[index].familyId}/${rows[index].rank}/${n}`)
    mirrorChecks.push({ familyId: rows[index].familyId, rank: rows[index].rank, definitionId: id, seed, same })
  }
  const summary = { status: 'PASS', startedAt: started.toISOString(), source: 'current checkout runtime awardContentLoot',
    calls, cohortCount: rows.length, callsPerCohort, gearAwards: gear, gearRate: gear / calls,
    cohorts: rows, materials: Object.fromEntries(Object.entries(materials).sort((a, b) => b[1] - a[1])),
    equipmentBases: Object.fromEntries(Object.entries(bases).sort((a, b) => b[1] - a[1])), rarities,
    determinism: { checks: mirrorChecks.length, pass: mirrorChecks.every(row => row.same), perFamilyRankCohort: 50 },
    limitations: ['Controlled generation only; cohort counts do not model natural spawn, kill, or access rates.',
      'When a family/rank has multiple monsters, calls cycle evenly through its IDs; cohort rates are therefore equal-mixture diagnostics.'] }
  summary.endedAt = new Date().toISOString()
  await writeFile(join(out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { flag: 'wx' })
  await writeFile(join(out, 'manifest.json'), `${JSON.stringify({ command: 'node scripts/phase8/run-loot-pacing.mjs',
    sourceCommit: await readHead(), callsPerCohort, cohortCount: rows.length,
    runnerSha256,
    cohortSeeds: rows.map((row, index) => ({ cohortIndex: index, cohortKey: `${row.familyId}/${row.rank}`,
      familyId: row.familyId, rank: row.rank, seed: 40131 + index, monsterIds: row.monsterIds })),
    mirrorSeedFormula: '99001 + cohortIndex * 100 + mirrorIndex', mirrorChecksPerCohort: 50,
    note: 'Historical Phase7 sample not reused: loot table weights/equipment changed since e05cc78.' }, null, 2)}\n`, { flag: 'wx' })
  console.log(`loot sample PASS: ${calls} calls, ${rows.length} cohorts, ${mirrorChecks.length} deterministic mirrors, ${out}`)
} catch (error) {
  await writeFile(join(out, 'failure.json'), `${JSON.stringify({ status: 'FAIL', message: String(error), stack: error?.stack ?? null }, null, 2)}\n`, { flag: 'wx' })
  throw error
} finally { if (vite) await vite.close() }
