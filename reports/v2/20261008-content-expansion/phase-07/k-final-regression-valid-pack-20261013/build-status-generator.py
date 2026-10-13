import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path.cwd()
phase = root / 'reports/v2/20261008-content-expansion/phase-07'
out = phase / 'k-final-regression-valid-pack-20261013'
before = json.loads((out / 'build-before.json').read_text())
after = json.loads((out / 'build-after.json').read_text())

def relative_map(values):
    return {Path(key).resolve().relative_to(root).as_posix(): value for key, value in values.items()}

before_source = relative_map(before['sourceSha256'])
after_source = relative_map(after['sourceSha256'])
before_runner = relative_map(before['runnerSha256'])
after_runner = relative_map(after['runnerSha256'])
head_before = before['head']
head_after = after['head']
inputs_before = before['buildInputsSha256']
inputs_after = after['buildInputsSha256']
source_now = {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in sorted(after_source)}
runner_now = {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in sorted(after_runner)}
dist = {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted((root / 'dist').rglob('*')) if p.is_file()}
inputs_now = {name: hashlib.sha256((root / name).read_bytes()).hexdigest()
              for name in inputs_after if (root / name).is_file()}
stable = (head_before == head_after and before_source == after_source == source_now
          and before_runner == after_runner == runner_now
          and inputs_before == inputs_after == inputs_now)
comparison = {
    'capturedAtUtc': datetime.now(timezone.utc).isoformat(),
    'sourceStable': before_source == after_source == source_now,
    'runnerStable': before_runner == after_runner == runner_now,
    'buildInputsStable': inputs_before == inputs_after == inputs_now,
    'headStable': head_before == head_after,
    'overallStable': stable,
    'srcFingerprint': hashlib.sha256(json.dumps(source_now, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
}
(out / 'build-identity-comparison.json').write_text(json.dumps(comparison, indent=2) + '\n')
if not stable:
    raise SystemExit('Normalized source/runner/build-input identities differ')
canonical = phase / 'qa-browser-preparation/phase7-build-status.json'
if canonical.exists():
    raise SystemExit(f'Refusing to overwrite existing canonical status: {canonical}')
status = {
    'schema': 'phase7-build-status-v1',
    'generatedAt': datetime.now(timezone.utc).isoformat(),
    'command': 'npm run build',
    'exitCode': 0,
    'headBefore': head_before,
    'headAfter': head_after,
    'sourceStableDuringRun': True,
    'sourceSha256': source_now,
    'buildInputs': inputs_now,
    'distSha256': dist,
}
canonical.write_text(json.dumps(status, indent=2) + '\n', encoding='utf-8')
sys.path.insert(0, str(phase))
from qa_browser_support import validate_build
validate_build(root, canonical)
shutil.copyfile(canonical, out / 'phase7-build-status.json')
print('Normalized source/runner/build-input maps stable:', stable)
print('qa_browser_support.validate_build accepted canonical status')
print('source files:', len(source_now), 'dist files:', len(dist))
