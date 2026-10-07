#!/usr/bin/env python3
"""Run the one-shot severity coercion repro and publish complete evidence."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
FREEZE = HERE / 'b-source-freeze.json'
REPORT = HERE / 'b-review-repro.md'
RAW = HERE / 'b-review-repro-raw.json'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

freeze = json.loads(FREEZE.read_text())
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True, capture_output=True)
if head.returncode:
    raise SystemExit(head.stderr)
actual = {name: sha(ROOT / name) for name in freeze['sourceSha256']}
mismatches = {name: {'expected': freeze['sourceSha256'][name], 'actual': actual[name]}
              for name in actual if actual[name] != freeze['sourceSha256'][name]}
if head.stdout.strip() != freeze['baseCommit'] or mismatches:
    print(json.dumps({'blocked': True, 'head': head.stdout.strip(), 'expectedBase': freeze['baseCommit'],
                      'freezeFingerprint': freeze['fingerprint'], 'mismatches': mismatches}, indent=2))
    raise SystemExit('Source freeze verification failed; reproduction not attempted.')

run = subprocess.run(['node', str(HERE / 'b-review-repro.mjs')], cwd=ROOT, text=True, capture_output=True)
try:
    observed = json.loads(run.stdout) if run.stdout else None
except json.JSONDecodeError:
    observed = None
raw_evidence = {
    'command': ['node', str(HERE / 'b-review-repro.mjs')],
    'cwd': str(ROOT),
    'exitStatus': run.returncode,
    'stdout': run.stdout,
    'stderr': run.stderr,
    'observed': observed,
    'source': {'baseCommit': head.stdout.strip(), 'freezeFingerprint': freeze['fingerprint'],
               'sourceCount': len(actual), 'sourceSha256': actual,
               'saveServiceSha256': actual['src/services/saveService.ts']},
}

sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

write_recorded(RAW, json.dumps(raw_evidence, ensure_ascii=False, indent=2) + '\n',
               producer='g6-luna-low-phase6-b-review-reproducer')

accepted_malformed = []
if observed:
    accepted_malformed = [case['label'] for case in observed['cases']
                          if case['expected'] == 'reject' and case['actual'] == 'accepted']
control_ok = bool(observed and all(
    (case['actual'] == 'accepted' if case['expected'] == 'accept' else case['actual'] == 'rejected')
    for case in observed['cases']))
finding = bool(run.returncode == 0 and accepted_malformed)
lines = [
    '# Phase 6B save severity coercion reproduction', '',
    f"- Result: {'REPRODUCED' if finding else 'NOT REPRODUCED'}; runner exit status `{run.returncode}`.",
    f"- Base: `{head.stdout.strip()}`; frozen source count `{len(actual)}`; fingerprint `{freeze['fingerprint']}`.",
    f"- `saveService.ts` SHA256: `{actual['src/services/saveService.ts']}`.",
    '- Fixture: `createGame(20261008)` followed by public `tryStartRegionalCrisis(state, () => 0)`; legal warning severity 2 with threat population 30, threat level 2, camp level 2, safety 60.',
    '- Fixture `worldTime` and `rngState` are recorded from the generated state; neither was edited by the runner.',
    f"- Number severity control: {'PASS' if control_ok else 'FAIL'}.",
    f"- Expected-reject coercion cases accepted: {', '.join(accepted_malformed) if accepted_malformed else 'none'}.",
    '- Each case begins with `serialize` output; only `regionalCrisis.severity` is changed before JSON parse through `deserialize`.',
    '- Full raw JSON inputs, actual acceptance/rejection, output severity types, stdout/stderr, exit status, and source hashes are archived in `b-review-repro-raw.json` and `playlog.jsonl`.',
    '', '## Case outcomes', ''
]
if observed:
    lines += ['| Case | Expected | Actual | Output severity type |', '|---|---|---|---|']
    lines += [f"| `{c['label']}` | {c['expected']} | {c['actual']} | `{c.get('outputSeverityType', 'n/a')}` |"
              for c in observed['cases']]
else:
    lines += ['Runner produced no parseable result; consult the raw artifact for exact process output.']
lines += ['', f"Repro finding: `validRegionalCrisis` in `src/services/saveService.ts` checks `![1, 2, 3].includes(Number(value.severity))`; numeric coercion permits malformed JSON values such as string `'2'` to pass this severity membership check. No source or test files were changed.", '']
write_recorded(REPORT, '\n'.join(lines), producer='g6-luna-low-phase6-b-review-reproducer')
print(json.dumps({'exitStatus': run.returncode, 'acceptedMalformed': accepted_malformed,
                  'numberControlAndCasesMatchExpectations': control_ok,
                  'rawSha256': sha(RAW), 'reportSha256': sha(REPORT),
                  'freezeFingerprint': freeze['fingerprint']}, indent=2))
if run.returncode != 0:
    raise SystemExit(run.returncode)
