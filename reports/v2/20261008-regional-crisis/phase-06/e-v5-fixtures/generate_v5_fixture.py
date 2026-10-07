#!/usr/bin/env python3
"""Generate one controlled, nonempty-ledger V5 save from its exact committed source."""
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
SOURCE_COMMIT = 'dfdc81636bb68f83ee87c4046199dcbaaf11e192'
PRODUCER = 'g6-luna-low-phase6-e-v5-fixture-generator'

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
with tempfile.TemporaryDirectory(prefix='plw-phase6-e-v5-') as temp_name:
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
    if len(source_sha) != 86:
        raise SystemExit(f'Unexpected archived src file count {len(source_sha)}; fixture generation stopped.')

    runner = temp_root / '.phase6-e-v5-fixture-runner.mjs'
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
  const { availableCivilDefenseDefenders, deriveCivilDefense } = await server.ssrLoadModule('/src/engine/civilDefense.ts')
  const { contributeCrisisEquipment, contributeCrisisFood, contributeCrisisGold } = await server.ssrLoadModule('/src/engine/crisisContributions.ts')
  const { serialize, deserialize } = await server.ssrLoadModule('/src/services/saveService.ts')
  const seed = 20261009, DAY = CONFIG.minutesPerDay
  const state = createGame(seed)
  const initial = { saveVersion: state.saveVersion, worldTime: state.worldTime, rngState: state.rngState,
    population: state.characters.length + state.npcs.filter(n => n.isAlive).length,
    monsterPopulation: state.threat.monsterPopulation, playerGold: player(state).gold,
    playerFood: player(state).inventory.food, settlementFood: state.settlement.food }
  if (state.saveVersion !== 5 || CONFIG.saveVersion !== 5) throw new Error('Archive is not the committed V5 runtime.')

  // Explicit controlled crisis/world inputs. NPC IDs and the whole world remain from createGame.
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.settlement.safety = 60
  state.settlement.food = 20
  for (const npc of state.npcs) {
    npc.job = 'guard'
    npc.age = Math.max(18, npc.age)
    npc.isAlive = true
    npc.injuredUntil = state.worldTime
    npc.equipment.weapon = null
    npc.equipment.armor = null
    const life = state.life.npcs[npc.id]
    life.career = 'worker'
    life.careerJob = 'guard'
  }
  const character = player(state)
  character.position = { x: 10, y: 10 }
  character.currentRegion = 'village'
  const triggerRolls = []
  if (!tryStartRegionalCrisis(state, () => { triggerRolls.push(0); return 0 })
      || state.regionalCrisis.phase !== 'warning') throw new Error('Controlled public crisis trigger did not enter warning.')
  simulate(state, 4 * DAY)
  if (state.regionalCrisis.phase !== 'preparation') throw new Error('Canonical simulation did not advance controlled crisis to preparation.')

  // A real item is created and placed in player inventory through the public wolf reward API.
  const reward = awardWolfLoot(state, { definitionId: 'wolfKing' })
  if (!reward.instance || reward.instance.ownerId !== character.id) throw new Error('Public reward API did not return owned gear.')
  const sourceItem = reward.instance
  const defender = availableCivilDefenseDefenders(state)[0]
  if (!defender) throw new Error('Controlled guard workforce produced no available defender.')
  const beforeModel = deriveCivilDefense(state, state.regionalCrisis)
  if (!beforeModel) throw new Error('Preparation crisis has no civil-defense model.')
  const actionStart = { worldTime: state.worldTime, rngState: state.rngState,
    gold: character.gold, food: character.inventory.food, settlementFood: state.settlement.food }
  const actions = [
    { kind: 'equipment', source: 'public awardWolfLoot(wolfKing)', sourceItemId: sourceItem.instanceId,
      result: contributeCrisisEquipment(state, state.regionalCrisis.id, defender.id, sourceItem.instanceId) },
    { kind: 'food', inventoryItems: 3,
      result: contributeCrisisFood(state, state.regionalCrisis.id, 3) },
    { kind: 'gold', amount: 25,
      result: contributeCrisisGold(state, state.regionalCrisis.id, 25) },
  ]
  if (actions.some(action => action.result !== '')) {
    throw new Error(`A public D contribution action failed: ${JSON.stringify({ actions, beforeModel, actionStart })}`)
  }
  if (state.worldTime !== actionStart.worldTime || state.rngState !== actionStart.rngState) {
    throw new Error('D contributions unexpectedly changed worldTime or RNG.')
  }
  const crisis = state.regionalCrisis
  if (crisis.phase === 'dormant' || crisis.contributions.equipment.length !== 1
      || crisis.contributions.food.supplied !== 12 || crisis.contributions.gold.spent !== 25) {
    throw new Error('D contribution ledger is not fully populated.')
  }

  const serialized = serialize(state)
  const parsed = JSON.parse(serialized)
  const restored = deserialize(serialized)
  if (parsed.saveVersion !== 5 || restored.state.saveVersion !== 5
      || parsed.regionalCrisis.phase !== 'preparation'
      || parsed.regionalCrisis.id !== crisis.id
      || parsed.worldTime !== state.worldTime || parsed.rngState !== state.rngState
      || parsed.regionalCrisis.contributions.equipment.length !== 1
      || parsed.regionalCrisis.contributions.food.supplied !== 12
      || parsed.regionalCrisis.contributions.gold.spent !== 25) {
    throw new Error('Committed V5 serializer/deserializer did not preserve the controlled D ledger.')
  }
  process.stdout.write(JSON.stringify({
    source: { saveVersion: CONFIG.saveVersion, daysPerSeason: CONFIG.daysPerSeason,
      seasonCount: CONFIG.seasons.length, minutesPerDay: CONFIG.minutesPerDay },
    initial, trigger: { started: true, rollValues: triggerRolls, seed,
      controlledMonsterPopulation: 30, controlledThreatLevel: 2, controlledCampLevel: 2,
      controlledSettlementSafety: 60, controlledSettlementFood: 20 },
    actions, defender: { id: defender.id, job: defender.job, age: defender.age,
      combatSkill: defender.skills.combat.level },
    generatedGear: { ...sourceItem },
    afterActions: { worldTime: state.worldTime, rngState: state.rngState,
      playerGold: character.gold, playerFood: character.inventory.food,
      settlementFood: state.settlement.food, sourceItemStillInInventory:
        state.reward.instances.some(item => item.instanceId === sourceItem.instanceId) },
    save: { lastSavedAt: parsed.lastSavedAt, saveVersion: parsed.saveVersion,
      phase: parsed.regionalCrisis.phase, worldTime: parsed.worldTime,
      rngState: parsed.rngState, crisisId: parsed.regionalCrisis.id,
      contributions: parsed.regionalCrisis.contributions, rawJson: serialized }
  }))
} finally { await server.close() }
''', encoding='utf-8')
    run = subprocess.run(['node', str(runner)], cwd=temp_root, text=True, capture_output=True)
    lines = [line for line in run.stdout.splitlines() if line.lstrip().startswith('{')]
    try:
        observed = json.loads(lines[-1]) if run.returncode == 0 and lines else None
    except json.JSONDecodeError:
        observed = None
    generated_at = datetime.now(timezone.utc).isoformat(timespec='milliseconds')
    evidence = {
        'generatedAtUTC': generated_at,
        'sourceCommit': SOURCE_COMMIT,
        'sourceFileCount': len(source_sha),
        'sourceSha256': source_sha,
        'sourceFingerprint': source_fingerprint,
        'archiveSha256': sha_bytes(archive),
        'generatorSha256': sha_file(Path(__file__)),
        'nodeVersion': subprocess.run(['node', '--version'], text=True,
                                      capture_output=True, check=True).stdout.strip(),
        'installedNodeModulesPath': str(current_modules),
        'runnerExitStatus': run.returncode,
        'runnerStdout': run.stdout,
        'runnerStderr': run.stderr,
    }
    if observed is None:
        write_recorded(OUT / 'generation-failure.json', json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
        raise SystemExit(f'Archived V5 runner failed or emitted invalid JSON; exit={run.returncode}; evidence recorded.')

    raw = observed.pop('save').pop('rawJson').encode('utf-8')
    fixture_path = OUT / 'crisis-v5-preparation-d-ledger.json'
    write_recorded(fixture_path, raw.decode('utf-8'))
    manifest = {
        'status': 'PASS', 'label': 'CONTROLLED FIXTURE',
        'generatedAtUTC': generated_at,
        'method': 'git archive the exact V5 checkpoint into a temporary directory; symlink installed node_modules; load only archived V5 modules through Vite SSR; createGame(seed), make explicit controlled world/guard setup, call public tryStartRegionalCrisis with controlled roll 0, reach preparation via public simulate over canonical day boundaries, generate and add real owned gear with public awardWolfLoot, then call all three public D contribution actions. Serialize using archived V5 saveService and require archived V5 deserialize to accept exact bytes and preserve V5 crisis phase/time/RNG/ID and all nonempty contribution ledgers. No V6 source/version is used, no version field or contribution ledger is edited directly, and no current checkout source is imported.',
        'source': {'commit': SOURCE_COMMIT, 'sourceFileCount': len(source_sha),
                   'sourceSha256': source_sha, 'sourceFingerprint': source_fingerprint,
                   'archiveSha256': evidence['archiveSha256']},
        'generator': {'path': 'generate_v5_fixture.py', 'sha256': evidence['generatorSha256']},
        'runtime': {'nodeVersion': evidence['nodeVersion'],
                    'installedNodeModulesPath': evidence['installedNodeModulesPath'],
                    'runnerExitStatus': run.returncode,
                    'stdoutSha256': sha_bytes(run.stdout.encode()),
                    'stderrSha256': sha_bytes(run.stderr.encode())},
        'fixture': {'path': fixture_path.name, 'bytes': len(raw), 'sha256': sha_bytes(raw),
                    **observed},
        'audit': {'source': 'scripts.recorded_reports.write_recorded',
                  'directoryPlaylog': 'playlog.jsonl'},
    }
    write_recorded(OUT / 'manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': 'PASS', 'sourceCommit': SOURCE_COMMIT,
        'sourceCount': len(source_sha), 'sourceFingerprint': source_fingerprint,
        'fixture': {'path': fixture_path.name, 'bytes': len(raw), 'sha256': sha_bytes(raw),
            'saveVersion': manifest['fixture']['save']['saveVersion'],
            'phase': manifest['fixture']['save']['phase'],
            'worldTime': manifest['fixture']['save']['worldTime'],
            'rngState': manifest['fixture']['save']['rngState'],
            'crisisId': manifest['fixture']['save']['crisisId'],
            'equipment': len(manifest['fixture']['save']['contributions']['equipment']),
            'foodSupplied': manifest['fixture']['save']['contributions']['food']['supplied'],
            'goldSpent': manifest['fixture']['save']['contributions']['gold']['spent']}},
        ensure_ascii=False, indent=2))
