import { createServer } from 'vite'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../../../..')
const here = import.meta.dirname
const output = resolve(here, 'village-gear-sale-save.json')
const sourceFixture = resolve(root, 'reports/playtests/20261003-comprehensive/adventure/after-boss-save.json')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const sourceFiles = () => Object.fromEntries(execFileSync('rg', ['--files', 'src'], { cwd: root, encoding: 'utf8' })
  .trim().split('\n').sort().map(path => [path, sha(requireBytes(path))]))
function requireBytes(path) {
  return readFileSync(resolve(root, path))
}
import { readFileSync } from 'node:fs'

const server = await createServer({ configFile: resolve(root, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'custom' })
try {
  const saveService = await server.ssrLoadModule('/src/services/saveService.ts')
  const rewardState = await server.ssrLoadModule('/src/engine/rewardState.ts')
  const itemGeneration = await server.ssrLoadModule('/src/engine/itemGeneration.ts')
  const rewardActions = await server.ssrLoadModule('/src/engine/rewardActions.ts')
  const raw = JSON.parse(await readFile(sourceFixture, 'utf8'))
  if (raw.saveVersion !== 1 || raw.settlement?.stage !== 'village' || !raw.settlement.buildings.includes('blacksmith')) {
    throw new Error('Source fixture is not the recorded normal-play village save with an unlocked blacksmith.')
  }
  const migrated = saveService.deserialize(JSON.stringify(raw)).state
  if (migrated.saveVersion !== 2 || migrated.reward.instances.length !== 0) throw new Error('Native V1 migration did not produce an empty V2 reward inventory.')

  // Controlled world fields: a legal walkable tile beside the existing blacksmith, currentRegion, and a direct
  // forward-only clock set to 08:00 next day (skipped time is not simulated). The RNG is also reset below to a
  // recorded trial seed to select a legal affixed reward. Village, actors, map, history, and other world fields
  // come from the recorded native save. No newly created world is used as fixture state and no schema is bypassed.
  const character = migrated.characters.find(actor => actor.id === migrated.activeCharacterId)
  character.position = { x: 11, y: 8 }
  character.currentRegion = 'village'
  migrated.worldTime = Math.ceil((migrated.worldTime + 1) / 1440) * 1440 + 8 * 60
  if (!migrated.reward) migrated.reward = rewardState.emptyReward()

  // Use legal encounter reward APIs; alphaWolf guarantees a procedural gear drop and wolfKing guarantees the
  // moonFangSpear. Select a deterministic alpha outcome with visible affixes while retaining its public reward path.
  let controlled, alphaSeed
  for (let trial = 1; trial <= 512; trial++) {
    const candidate = structuredClone(migrated)
    candidate.rngState = trial
    const alpha = itemGeneration.awardWolfLoot(candidate, { definitionId: 'alphaWolf' }).instance
    if (alpha?.affixes.length) {
      controlled = candidate
      alphaSeed = trial
      break
    }
  }
  if (!controlled) throw new Error('Could not find a legal alphaWolf procedural reward with visible affixes in 512 deterministic seeds.')
  const procedural = controlled.reward.instances.at(-1)
  const boss = itemGeneration.awardWolfLoot(controlled, { definitionId: 'wolfKing' }).instance
  if (!boss || boss.baseId !== 'moonFangSpear') {
    throw new Error(`Public wolfKing reward API did not produce the expected boss-exclusive reward: ${JSON.stringify(boss)}`)
  }
  if (!procedural?.affixes.length || procedural.ownerId !== controlled.activeCharacterId) throw new Error('Procedural gear fixture is missing visible affixes or ownership.')
  const beforeValidation = saveService.serialize(controlled, 1)
  const reparsed = saveService.deserialize(beforeValidation).state
  if (!rewardActions.canVisit(reparsed, 'blacksmith')) throw new Error('Controlled village state does not legally visit the existing blacksmith.')
  if (reparsed.reward.instances.length !== 2 || reparsed.reward.collection.bases.length !== 2) throw new Error('Reward validation did not retain both collected gear bases.')

  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, saveService.serialize(reparsed, 1) + '\n')
  const manifest = {
    schemaVersion: 1,
    classification: 'controlled browser fixture; not normal play and not a soak result',
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    sourceFingerprint: sha(Buffer.from(JSON.stringify(sourceFiles()))),
    sourceSha256: sourceFiles(),
    sourceSave: {
      path: 'reports/playtests/20261003-comprehensive/adventure/after-boss-save.json',
      sha256: sha(await readFile(sourceFixture)),
      originalSaveVersion: 1,
      provenance: 'recorded normal-UI comprehensive adventure playtest; village-unlocked and saved after boss victory',
      migration: 'saveService.deserialize migrated the actual V1 save to the current V2 schema',
    },
    controls: {
      manuallyControlled: ['active character position {x:11,y:8} beside the extant smith tile {x:12,y:8}', 'active character currentRegion=village', 'worldTime set forward to 08:00 on the next day without simulating the skipped time', `rngState set to ${alphaSeed} to select a reproducible legal alphaWolf reward with visible affixes`],
      generatedThroughPublicRewardApi: ['alphaWolf procedural reward with at least one affix, selected from deterministic legal RNG trials', 'wolfKing boss reward producing moonFangSpear'],
      retainedFromSourceSave: ['settlement village and blacksmith unlock', 'world map, actors, history, active character, gold, equipment, collection baseline, life state'],
      migrationNote: 'saveService.deserialize internally builds its schema template with createGame(); only the provided recorded V1 save is migrated and used as fixture state, no new world is used as source',
      sourceAndCurrentAssets: 'fixture is consumed by the current production app build and its own saveService validator; no copied or substituted game assets',
    },
    fixtureSha256: sha(await readFile(output)),
    controlledGear: {
      proceduralRngSeed: alphaSeed,
      procedural: { instanceId: procedural.instanceId, baseId: procedural.baseId, rarity: procedural.rarity, affixCount: procedural.affixes.length },
      boss: { instanceId: boss.instanceId, baseId: boss.baseId, rarity: boss.rarity, affixCount: boss.affixes.length, provenance: boss.provenance },
    },
    validation: { nativeMigration: true, serializeDeserializeRoundTrip: true, publicCanVisitBlacksmith: true, rewardCollectionContainsBothBases: true },
  }
  await writeFile(resolve(here, 'fixture-metadata.json'), JSON.stringify(manifest, null, 2) + '\n')
  process.stdout.write(JSON.stringify({ fixture: output, fixtureSha256: manifest.fixtureSha256, sourceCommit: manifest.sourceCommit,
    sourceFingerprint: manifest.sourceFingerprint, village: reparsed.settlement.stage, canVisitBlacksmith: true,
    procedural: manifest.controlledGear.procedural, boss: manifest.controlledGear.boss }, null, 2) + '\n')
} finally {
  await server.close()
}
