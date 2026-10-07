#!/usr/bin/env python3
"""Generate a controlled V6 preparation save with D and E public-seam facts."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import sys

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
SOURCE_COMMIT = '6583db9ba0da1e31df6af2f4583771bc54a38e6e'
PRODUCER = 'g6-luna-low-phase6-f-v6-fixture-generator'


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def write_recorded(path: Path, body: str) -> None:
    sys.path.insert(0, str(ROOT))
    from scripts.recorded_reports import write_recorded as publish
    publish(path, body, producer=PRODUCER)


head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True,
                      capture_output=True, check=True).stdout.strip()
if head != SOURCE_COMMIT:
    raise SystemExit(f'Expected source checkpoint {SOURCE_COMMIT}; current HEAD is {head}. No archive generated.')

archive = subprocess.run(['git', 'archive', '--format=tar', SOURCE_COMMIT], cwd=ROOT,
                         capture_output=True, check=True).stdout
with tempfile.TemporaryDirectory(prefix='plw-phase6-f-v6-') as temp_name:
    temp_root = Path(temp_name)
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:') as source_tar:
        source_tar.extractall(temp_root)
    current_modules = ROOT / 'node_modules'
    if not current_modules.is_dir():
        raise SystemExit(f'Installed node_modules missing at {current_modules}')
    (temp_root / 'node_modules').symlink_to(current_modules, target_is_directory=True)

    source_sha = {path.relative_to(temp_root).as_posix(): sha_file(path)
                  for path in sorted((temp_root / 'src').rglob('*')) if path.is_file()}
    source_fingerprint = sha_bytes(json.dumps(source_sha, ensure_ascii=False,
                                               separators=(',', ':')).encode())

    runner = temp_root / '.phase6-f-v6-fixture-runner.mjs'
    runner.write_text(r'''import { createServer } from 'vite'
import { resolve } from 'node:path'
const root = process.cwd()
const server = await createServer({ configFile: resolve(root, 'vite.config.ts'), root,
  server: { middlewareMode: true }, appType: 'custom' })
try {
  const { CONFIG } = await server.ssrLoadModule('/src/data/config.ts')
  const { createGame, simulate, player } = await server.ssrLoadModule('/src/engine/simulation.ts')
  const { tryStartRegionalCrisis } = await server.ssrLoadModule('/src/engine/regionalCrisis.ts')
  const { awardWolfLoot } = await server.ssrLoadModule('/src/engine/itemGeneration.ts')
  const { availableCivilDefenseDefenders } = await server.ssrLoadModule('/src/engine/civilDefense.ts')
  const { contributeCrisisEquipment, contributeCrisisFood, contributeCrisisGold } = await server.ssrLoadModule('/src/engine/crisisContributions.ts')
  const { startRegionalCampRaid, combatTurn } = await server.ssrLoadModule('/src/engine/actions.ts')
  const { serialize, deserialize } = await server.ssrLoadModule('/src/services/saveService.ts')
  const seed = 20261010, DAY = CONFIG.minutesPerDay
  const state = createGame(seed)
  if (state.saveVersion !== 6 || CONFIG.saveVersion !== 6) throw new Error('Archive is not the committed V6 runtime.')

  // Controlled world/guard conditions; generated NPC identities and life records remain from createGame.
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.settlement.safety = 60
  state.settlement.food = 20
  for (const npc of state.npcs) {
    npc.job = 'guard'; npc.age = Math.max(18, npc.age); npc.isAlive = true
    npc.injuredUntil = state.worldTime; npc.equipment.weapon = null; npc.equipment.armor = null
    state.life.npcs[npc.id].career = 'worker'; state.life.npcs[npc.id].careerJob = 'guard'
  }
  const character = player(state)
  character.position = { x: 10, y: 10 }; character.currentRegion = 'village'
  const triggerRolls = []
  if (!tryStartRegionalCrisis(state, () => { triggerRolls.push(0); return 0 })
      || state.regionalCrisis.phase !== 'warning') throw new Error('Controlled public crisis trigger did not enter warning.')
  simulate(state, 4 * DAY)
  if (state.regionalCrisis.phase !== 'preparation') throw new Error('Canonical simulation did not advance to preparation.')

  const reward = awardWolfLoot(state, { definitionId: 'wolfKing' })
  if (!reward.instance || reward.instance.ownerId !== character.id) throw new Error('Public reward API did not return owned gear.')
  const sourceItem = reward.instance
  const defender = availableCivilDefenseDefenders(state)[0]
  if (!defender) throw new Error('Controlled guard workforce produced no available defender.')
  const actionStart = { worldTime: state.worldTime, rngState: state.rngState }
  const actions = [
    { kind: 'equipment', result: contributeCrisisEquipment(state, state.regionalCrisis.id, defender.id, sourceItem.instanceId) },
    { kind: 'food', result: contributeCrisisFood(state, state.regionalCrisis.id, 3) },
    { kind: 'gold', result: contributeCrisisGold(state, state.regionalCrisis.id, 25) },
  ]
  if (actions.some(action => action.result !== '')) throw new Error(`A public D contribution action failed: ${JSON.stringify(actions)}`)
  if (state.worldTime !== actionStart.worldTime || state.rngState !== actionStart.rngState) throw new Error('D contributions changed time or RNG.')

  // Controlled placement and strength let the public camp-raid combat seam record an actual Goblin win.
  const forest = state.tiles.find(tile => tile.regionId === 'forest' && tile.walkable)
  if (!forest) throw new Error('No walkable forest tile exists.')
  character.position = { x: forest.x, y: forest.y }; character.currentRegion = 'forest'
  character.stats.strength = 500
  const crisisId = state.regionalCrisis.id
  const raidStartTime = state.worldTime
  const raidStart = startRegionalCampRaid(state, crisisId)
  if (raidStart !== '') throw new Error(`Public camp raid action failed: ${raidStart}`)
  const victory = combatTurn(state, 'attack')
  if (victory !== '') throw new Error(`Public Goblin camp raid attack failed: ${victory}`)
  const crisis = state.regionalCrisis
  if (crisis.phase === 'dormant' || crisis.id !== crisisId || crisis.adventure.campRaidAt === null
      || crisis.contributions.equipment.length !== 1 || crisis.contributions.food.supplied !== 12
      || crisis.contributions.gold.spent !== 25) throw new Error('Expected V6 adventure fact or D contribution ledger is missing.')

  const serialized = serialize(state)
  const parsed = JSON.parse(serialized)
  const restored = deserialize(serialized)
  if (parsed.saveVersion !== 6 || restored.state.saveVersion !== 6
      || parsed.regionalCrisis.id !== crisisId || parsed.regionalCrisis.adventure.campRaidAt !== raidStartTime
      || restored.state.regionalCrisis.adventure.campRaidAt !== crisis.adventure.campRaidAt
      || parsed.worldTime !== state.worldTime || parsed.rngState !== state.rngState
      || parsed.regionalCrisis.contributions.equipment.length !== 1
      || parsed.regionalCrisis.contributions.food.supplied !== 12
      || parsed.regionalCrisis.contributions.gold.spent !== 25) {
    throw new Error('Committed V6 serializer/deserializer did not preserve the V6 facts.')
  }
  process.stdout.write(JSON.stringify({ source: { saveVersion: CONFIG.saveVersion,
    daysPerSeason: CONFIG.daysPerSeason, seasonCount: CONFIG.seasons.length, minutesPerDay: DAY },
    trigger: { seed, rollValues: triggerRolls, controlledMonsterPopulation: 30,
      controlledThreatLevel: 2, controlledCampLevel: 2, controlledSettlementSafety: 60,
      controlledSettlementFood: 20 }, actions, defender: { id: defender.id }, generatedGear: sourceItem,
    adventure: { action: 'startRegionalCampRaid + combatTurn(attack)', crisisId,
      startedAt: raidStartTime, campRaidAt: crisis.adventure.campRaidAt,
      combatVictory: state.events.some(event => event.type === 'combat.won') },
    save: { saveVersion: parsed.saveVersion, lastSavedAt: parsed.lastSavedAt,
      phase: parsed.regionalCrisis.phase, worldTime: parsed.worldTime, rngState: parsed.rngState,
      crisisId: parsed.regionalCrisis.id, contributions: parsed.regionalCrisis.contributions,
      adventure: parsed.regionalCrisis.adventure, rawJson: serialized } }))
} finally { await server.close() }
''', encoding='utf-8')
    run = subprocess.run(['node', str(runner)], cwd=temp_root, text=True, capture_output=True)
    lines = [line for line in run.stdout.splitlines() if line.lstrip().startswith('{')]
    try:
        observed = json.loads(lines[-1]) if run.returncode == 0 and lines else None
    except json.JSONDecodeError:
        observed = None
    generated_at = datetime.now(timezone.utc).isoformat(timespec='milliseconds')
    common = {
        'generatedAtUTC': generated_at, 'sourceCommit': SOURCE_COMMIT,
        'sourceFileCount': len(source_sha), 'sourceSha256': source_sha,
        'sourceFingerprint': source_fingerprint, 'archiveSha256': sha_bytes(archive),
        'generatorSha256': sha_file(Path(__file__)),
        'nodeVersion': subprocess.run(['node', '--version'], text=True,
                                      capture_output=True, check=True).stdout.strip(),
        'installedNodeModulesPath': str(current_modules), 'runnerExitStatus': run.returncode,
        'runnerStdout': run.stdout, 'runnerStderr': run.stderr,
    }
    if observed is None:
        write_recorded(OUT / 'generation-failure.json', json.dumps(common, ensure_ascii=False, indent=2) + '\n')
        raise SystemExit(f'Archived V6 runner failed or emitted invalid JSON; exit={run.returncode}; evidence recorded.')

    save = observed.pop('save')
    raw = save.pop('rawJson').encode('utf-8')
    fixture_path = OUT / 'crisis-v6-preparation-d-life-adventure.json'
    write_recorded(fixture_path, raw.decode('utf-8'))
    manifest = {
        'status': 'PASS', 'label': 'CONTROLLED FIXTURE', 'generatedAtUTC': generated_at,
        'method': 'Git archive the exact V6 checkpoint into a temporary directory; symlink installed node_modules; load only archived V6 modules through Vite SSR; createGame(seed), establish explicitly labeled controlled world/guard setup, trigger crisis through tryStartRegionalCrisis, reach preparation by canonical simulate, obtain owned gear through public awardWolfLoot, and call all three D contribution APIs. Then use public startRegionalCampRaid and combatTurn attack to record an actual Goblin victory as the E adventure fact. Serialize and require archived V6 deserialize to accept exact bytes and preserve version, D ledger, adventure fact, world time and RNG. No save version, crisis ledger or adventure fact is edited directly; no current checkout source is imported.',
        'source': {'commit': SOURCE_COMMIT, 'sourceFileCount': len(source_sha),
                   'sourceSha256': source_sha, 'sourceFingerprint': source_fingerprint,
                   'archiveSha256': common['archiveSha256']},
        'generator': {'path': 'generate_v6_fixture.py', 'sha256': common['generatorSha256']},
        'runtime': {'nodeVersion': common['nodeVersion'],
                    'installedNodeModulesPath': common['installedNodeModulesPath'],
                    'runnerExitStatus': run.returncode, 'stdoutSha256': sha_bytes(run.stdout.encode()),
                    'stderrSha256': sha_bytes(run.stderr.encode())},
        'fixture': {'path': fixture_path.name, 'bytes': len(raw), 'sha256': sha_bytes(raw),
                    **observed, 'save': save},
        'audit': {'source': 'scripts.recorded_reports.write_recorded', 'directoryPlaylog': 'playlog.jsonl'},
    }
    write_recorded(OUT / 'manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': 'PASS', 'sourceCommit': SOURCE_COMMIT,
        'sourceCount': len(source_sha), 'sourceFingerprint': source_fingerprint,
        'fixture': {'path': fixture_path.name, 'bytes': len(raw), 'sha256': sha_bytes(raw),
            'saveVersion': manifest['fixture']['save']['saveVersion'],
            'phase': manifest['fixture']['save']['phase'], 'worldTime': manifest['fixture']['save']['worldTime'],
            'rngState': manifest['fixture']['save']['rngState'], 'crisisId': manifest['fixture']['save']['crisisId'],
            'equipment': len(manifest['fixture']['save']['contributions']['equipment']),
            'foodSupplied': manifest['fixture']['save']['contributions']['food']['supplied'],
            'goldSpent': manifest['fixture']['save']['contributions']['gold']['spent'],
            'campRaidAt': manifest['fixture']['save']['adventure']['campRaidAt']}},
        ensure_ascii=False, indent=2))
