#!/usr/bin/env python3
"""Generate controlled Phase 6 crisis saves using the committed genuine V4 source."""
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
SOURCE_COMMIT = 'bd4901c28ed3fb8469d6fe5c82354b4e1128691e'
PRODUCER = 'g6-luna-low-phase6-d-v4-fixture-generator'

def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())

def write_manifest(path: Path, body: str) -> None:
    sys.path.insert(0, str(ROOT))
    from scripts.recorded_reports import write_recorded
    write_recorded(path, body, producer=PRODUCER)

head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True, capture_output=True, check=True).stdout.strip()
if head != SOURCE_COMMIT:
    raise SystemExit(f'Expected source checkpoint {SOURCE_COMMIT}; current HEAD is {head}. No archive generated.')

archive = subprocess.run(['git', 'archive', '--format=tar', SOURCE_COMMIT], cwd=ROOT,
                         capture_output=True, check=True).stdout
with tempfile.TemporaryDirectory(prefix='plw-phase6-d-v4-') as temp_name:
    temp_root = Path(temp_name)
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:') as source_tar:
        source_tar.extractall(temp_root)
    current_modules = ROOT / 'node_modules'
    if not current_modules.is_dir():
        raise SystemExit(f'Installed node_modules missing at {current_modules}')
    (temp_root / 'node_modules').symlink_to(current_modules, target_is_directory=True)

    src_map = {path.relative_to(temp_root).as_posix(): sha_file(path)
               for path in sorted((temp_root / 'src').rglob('*')) if path.is_file()}
    fingerprint = sha_bytes(json.dumps(src_map, ensure_ascii=False, separators=(',', ':')).encode())
    if len(src_map) != 84:
        raise SystemExit(f'Unexpected committed source file count {len(src_map)}; inspect source archive before generating fixtures.')

    runner = temp_root / '.phase6-d-v4-fixture-runner.mjs'
    runner.write_text(r'''import { createServer } from 'vite'
import { resolve } from 'node:path'
const root = process.cwd()
const server = await createServer({ configFile: resolve(root, 'vite.config.ts'), root,
  server: { middlewareMode: true }, appType: 'custom' })
try {
  const { CONFIG } = await server.ssrLoadModule('/src/data/config.ts')
  const { createGame, simulate } = await server.ssrLoadModule('/src/engine/simulation.ts')
  const { tryStartRegionalCrisis, regionalCrisisId } = await server.ssrLoadModule('/src/engine/regionalCrisis.ts')
  const { serialize, deserialize } = await server.ssrLoadModule('/src/services/saveService.ts')
  const seed = 20261008, DAY = CONFIG.minutesPerDay
  const base = createGame(seed)
  if (base.saveVersion !== 4 || CONFIG.saveVersion !== 4) throw new Error('Archive is not a genuine V4 source runtime.')
  base.threat.monsterPopulation = 30
  base.threat.threatLevel = 2
  base.threat.campLevel = 2
  base.settlement.safety = 60
  const rollCalls = []
  const started = tryStartRegionalCrisis(base, () => { rollCalls.push(0); return 0 })
  if (!started || rollCalls.length !== 1 || base.regionalCrisis.phase !== 'warning') {
    throw new Error(`Controlled trigger failed: ${JSON.stringify({ started, rollCalls, crisis: base.regionalCrisis })}`)
  }
  const states = [
    { label: 'warning', state: structuredClone(base), elapsedMinutes: 0 },
    { label: 'preparation', state: structuredClone(base), elapsedMinutes: 4 * DAY },
    { label: 'active', state: structuredClone(base), elapsedMinutes: 8 * DAY },
  ]
  const records = states.map(({ label, state, elapsedMinutes }) => {
    if (elapsedMinutes) simulate(state, elapsedMinutes)
    const serialized = serialize(state)
    const parsed = JSON.parse(serialized)
    const restored = deserialize(serialized).state
    const expectedId = regionalCrisisId(seed, 1)
    if (parsed.saveVersion !== 4 || restored.saveVersion !== 4
      || parsed.regionalCrisis.phase !== label || restored.regionalCrisis.phase !== label
      || parsed.worldTime !== state.worldTime || parsed.rngState !== state.rngState
      || parsed.regionalCrisis.id !== expectedId || restored.regionalCrisis.id !== expectedId) {
      throw new Error(`Serialized ${label} fixture failed V4 roundtrip checks.`)
    }
    return { label, elapsedMinutes, lastSavedAt: parsed.lastSavedAt,
      worldTime: state.worldTime, rngState: state.rngState, saveVersion: parsed.saveVersion,
      phase: parsed.regionalCrisis.phase, crisisId: parsed.regionalCrisis.id,
      trigger: { started, rollCalls, seed, monsterPopulation: 30, threatLevel: 2, campLevel: 2,
        settlementSafety: 60, initialWorldTime: 480, initialRngState: base.rngState },
      rawJson: serialized }
  })
  process.stdout.write(JSON.stringify({ source: { root, saveVersion: CONFIG.saveVersion,
    daysPerSeason: CONFIG.daysPerSeason, seasons: CONFIG.seasons.length,
    minutesPerDay: CONFIG.minutesPerDay }, records }))
} finally { await server.close() }
''', encoding='utf-8')
    run = subprocess.run(['node', str(runner)], cwd=temp_root, text=True, capture_output=True)
    try:
        output_lines = [line for line in run.stdout.splitlines() if line.lstrip().startswith('{')]
        generated = json.loads(output_lines[-1]) if run.returncode == 0 and output_lines else None
    except json.JSONDecodeError:
        generated = None
    run_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds')
    common = {
        'generatedAtUTC': run_time,
        'sourceCommit': SOURCE_COMMIT,
        'sourceTree': 'git archive --format=tar ' + SOURCE_COMMIT,
        'sourceFileCount': len(src_map),
        'sourceSha256': src_map,
        'sourceFingerprint': fingerprint,
        'archiveSha256': sha_bytes(archive),
        'generatorSha256': sha_file(Path(__file__)),
        'nodeVersion': subprocess.run(['node', '--version'], text=True, capture_output=True, check=True).stdout.strip(),
        'installedNodeModulesPath': str(current_modules),
        'runnerExitStatus': run.returncode,
        'runnerStdoutSha256': sha_bytes(run.stdout.encode()),
        'runnerStdoutBytes': len(run.stdout.encode()),
        'runnerStderrSha256': sha_bytes(run.stderr.encode()),
        'runnerStderrBytes': len(run.stderr.encode()),
    }
    if generated is None:
        failure = {**common, 'runnerStdout': run.stdout, 'runnerStderr': run.stderr}
        write_manifest(OUT / 'generation-failure.json', json.dumps(failure, ensure_ascii=False, indent=2) + '\n')
        raise SystemExit(f'SSR fixture generation failed; exit {run.returncode}. Raw output recorded.')

    fixtures = []
    for record in generated['records']:
        filename = f"crisis-v4-{record['label']}.json"
        data = record.pop('rawJson').encode('utf-8')
        write_manifest(OUT / filename, data.decode('utf-8'))
        fixtures.append({**record, 'file': filename, 'bytes': len(data), 'sha256': sha_bytes(data),
                         'deserialization': 'committed V4 deserialize accepted exact serialize output; V4 preserved'})

    manifest = {
        'status': 'PASS', 'label': 'CONTROLLED FIXTURE',
        'method': 'Extract exact committed checkpoint with git archive into a temporary directory; symlink the existing node_modules; load only archived V4 modules using Vite SSR; createGame(seed), set explicit eligible crisis condition, call public tryStartRegionalCrisis with controlled roll 0; preserve warning directly and clone state for phase progression using public simulate at canonical minutes; serialize with archived V4 saveService; deserialize exact serialized bytes through archived V4 saveService and verify V4/phase/time/RNG/ID. No current checkout source was imported or modified.',
        'time': common['generatedAtUTC'],
        'source': {'commit': SOURCE_COMMIT, 'sourceFileCount': len(src_map), 'sourceSha256': src_map,
                   'sourceFingerprint': fingerprint},
        'runtime': {'nodeVersion': common['nodeVersion'], 'installedNodeModulesPath': str(current_modules),
                    'runnerExitStatus': run.returncode},
        'fixtureDetails': fixtures,
        'controlledInputs': {'seed': 20261008, 'initialWorldTime': 480,
            'triggerRoll': 0, 'threatMonsterPopulation': 30, 'threatLevel': 2,
            'campLevel': 2, 'settlementSafety': 60,
            'phases': {'warning': 'no elapsed simulation', 'preparation': 'simulate 4*1440 minutes from the controlled warning; canonical daily boundaries advance it into preparation',
                       'active': 'simulate 8*1440 minutes from the controlled warning; canonical daily boundaries advance it into active'},
            'timeAndRNG': 'worldTime and rngState are read from generated state; no direct time/RNG mutation. Controlled trigger callback supplies roll 0; later RNG changes only through normal simulation.'},
        'executionEvidence': common,
    }
    write_manifest(OUT / 'manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': 'PASS', 'sourceCommit': SOURCE_COMMIT,
        'sourceFileCount': len(src_map), 'sourceFingerprint': fingerprint,
        'fixtures': [{k: row[k] for k in ('file', 'phase', 'saveVersion', 'worldTime', 'rngState', 'crisisId', 'sha256')}
                     for row in fixtures]}, ensure_ascii=False, indent=2))
