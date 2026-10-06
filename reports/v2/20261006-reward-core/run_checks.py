"""Runner-driven checks with durable raw output, exit status and exact source fingerprints.
Run from repo root: python3 reports/v2/20261006-reward-core/run_checks.py phase-01 full -- npm run test -- --maxWorkers=1
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded
parser = argparse.ArgumentParser()
parser.add_argument('phase')
parser.add_argument('label')
parser.add_argument('command', nargs=argparse.REMAINDER)
args = parser.parse_args()
assert re.fullmatch(r'[a-z0-9-]+', args.phase) and re.fullmatch(r'[a-z0-9-]+', args.label)
command = args.command[1:] if args.command and args.command[0] == '--' else args.command
assert command
out = Path(__file__).resolve().parent / args.phase
out.mkdir(parents=True, exist_ok=True)
def fingerprints():
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted((ROOT / 'src').rglob('*')) if p.is_file()}
def harness_fingerprints():
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(Path(__file__).resolve().parent.rglob('*')) if p.is_file() and p.suffix in {'.py', '.ts'}}
before = fingerprints()
harness_before = harness_fingerprints()
started = datetime.now(timezone.utc)
start = started.isoformat()
stamp = started.strftime('%Y%m%dT%H%M%S%fZ')
base_commit = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
# Temporary captures retain partial outputs if the driver/session stops before publication.
raw_out = out / (args.label + '-' + stamp + '-in-progress-stdout.log')
raw_err = out / (args.label + '-' + stamp + '-in-progress-stderr.log')
with raw_out.open('wb') as stdout, raw_err.open('wb') as stderr:
    result = subprocess.run(command, cwd=ROOT, stdout=stdout, stderr=stderr)
for name, path in [('stdout',raw_out),('stderr',raw_err)]:
    write_recorded(out / (args.label + '-' + name + '.txt'), path.read_text(), producer='v2x-check-runner')
status = {'baseCommit':base_commit,'rawStdout':str(raw_out.relative_to(ROOT)),'rawStderr':str(raw_err.relative_to(ROOT)),
          'workingTreeSource':True,'harnessSha256':harness_before,'harnessStableDuringRun':harness_before==harness_fingerprints(),'sourceSha256':before,'sourceStableDuringRun':before==fingerprints(),
          'command':command,'startUTC':start,'endUTC':datetime.now(timezone.utc).isoformat(),'exitCode':result.returncode}
write_recorded(out / (args.label + '-status.json'), json.dumps(status,indent=2)+'\n',producer='v2x-check-runner')
print(json.dumps({k:status[k] for k in ['baseCommit','sourceStableDuringRun','exitCode','endUTC']}),flush=True)
sys.exit(result.returncode or (0 if status['sourceStableDuringRun'] and status['harnessStableDuringRun'] else 3))
