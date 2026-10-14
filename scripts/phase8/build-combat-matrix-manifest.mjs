import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCombatCellManifest, MATRIX_BOSS_IDS, selectCombatMatrixTargets } from './combat-matrix.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const outputRoot = join(root, 'reports/v2/20261014-balance-tuning/phase-08/b-runner')
const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('-', '').replaceAll('.', '')
const attempt = join(outputRoot, 'matrix-manifest-attempts', `attempt-${stamp}`)
const output = join(attempt, 'combat-cell-manifest.json')
let vite
try {
  vite = await createServer({ configFile: false, root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
  const [registry, config, rewards] = await Promise.all([
    vite.ssrLoadModule('/src/data/contentRegistry.ts'), vite.ssrLoadModule('/src/data/config.ts'),
    vite.ssrLoadModule('/src/data/rewards.ts'),
  ])
  const allTargets = [
    ...Object.values(registry.CONTENT_MONSTERS).map(monster => ({ definitionId: monster.id, rank: monster.rank,
      familyId: monster.familyId, familyRegion: registry.CONTENT_FAMILIES[monster.familyId]?.regions[0] ?? null, level: monster.level })),
    ...Object.values(rewards.WOLF_MONSTERS).map(monster => ({ definitionId: monster.id, rank: monster.rank,
      familyId: monster.family, familyRegion: 'forest', level: monster.level })),
    ...Object.entries(config.MONSTERS).map(([definitionId, monster]) => ({ definitionId,
      rank: monster.boss ? 'boss' : 'normal', familyId: 'legacy', familyRegion: 'forest', level: monster.level })),
  ]
  const targets = selectCombatMatrixTargets(allTargets)
  const bossIds = [...new Set(targets.filter(target => target.rank === 'boss').map(target => target.definitionId))].sort()
  if (JSON.stringify(bossIds) !== JSON.stringify([...MATRIX_BOSS_IDS].sort())) {
    throw new Error(`Boss ID matrix mismatch: expected ${MATRIX_BOSS_IDS.join(',')}, observed ${bossIds.join(',')}`)
  }
  const manifest = buildCombatCellManifest({ targets })
  await mkdir(attempt, { recursive: true })
  await writeFile(output, `${JSON.stringify({ ...manifest, generatedAt: new Date().toISOString(), command: 'node scripts/phase8/build-combat-matrix-manifest.mjs' }, null, 2)}\n`, { flag: 'wx' })
  console.log(JSON.stringify({ manifest: output, status: manifest.status, targetCount: manifest.targetCount,
    candidateCellCount: manifest.candidateCellCount, knownNACells: manifest.knownLegacyNACellCount,
    bossIds: manifest.bossIds, representativeTargets: manifest.targetSelection.representatives.map(target => target.definitionId),
    estimatedMinutesPerJob: manifest.executionPlan.estimatedWallClockMinutesPerJob,
    estimatedMinutesTotal: manifest.executionPlan.estimatedWallClockMinutesTotal }, null, 2))
} finally {
  await vite?.close()
}
