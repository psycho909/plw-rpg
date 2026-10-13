import hashlib
import json
import sys
from pathlib import Path

root = Path.cwd()
phase = root / 'reports/v2/20261008-content-expansion/phase-07'
sys.path.insert(0, str(phase))
from qa_browser_support import provenance, validate_build

build_path = phase / 'qa-browser-preparation/phase7-build-status.json'
release_path = phase / 'qa-browser-preparation/phase7-browser-release.json'
launcher = phase / 'qa_browser_launcher.py'
runner = phase / 'qa_browser_runner.py'
support = phase / 'qa_browser_support.py'
build = validate_build(root, build_path)
identity = provenance(root, build_path, [launcher, runner, support])
release = json.loads(release_path.read_text(encoding='utf-8'))
expected = {
    'head': identity['head'],
    'sourceFingerprint': identity['sourceFingerprint'],
    'buildStatusSha256': identity['buildStatusSha256'],
    'distFingerprint': identity['distFingerprint'],
}
mismatches = {key: {'release': release.get(key), 'current': value} for key, value in expected.items() if release.get(key) != value}
if release.get('status') != 'RELEASED' or mismatches:
    raise SystemExit(json.dumps({'status': release.get('status'), 'mismatches': mismatches}, indent=2))
runner_hash = hashlib.sha256(runner.read_bytes()).hexdigest()
print(json.dumps({'preflight': 'PASS', 'releaseStatus': release['status'], **expected,
                  'qaBrowserRunnerSha256': runner_hash, 'buildStatusExitCode': build['exitCode'],
                  'buildStatusSourceStable': build['sourceStableDuringRun'],
                  'distFiles': len(identity['distSha256'])}, indent=2))
