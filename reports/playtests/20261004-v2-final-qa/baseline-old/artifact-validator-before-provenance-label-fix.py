"""Verify frozen app source, report versions and required final QA documents.

Run from repository root after all workers have published their final reports.
This validates evidence integrity; it does not turn pending product gates into PASS.
"""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import decode_record, write_recorded

REQUIRED = ['README.md', 'baseline.md', 'regression.md', 'browser-soak.md',
            'agent-playtest-life.md', 'agent-playtest-adventure.md', 'agent-playtest-hybrid.md',
            'long-term.md', 'performance.md', 'fun-signal-audit.md', 'human-fun-gate.md', 'final-review.md']

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    manifest = json.loads((OUT / 'build-manifest.json').read_text())
    source = manifest['sourceCommit']
    errors = []
    changed = [name for name, expected in manifest['sourceSha256'].items()
               if not (ROOT / name).exists() or digest(ROOT / name) != expected]
    if changed:
        errors.append({'kind': 'app-source-changed', 'files': changed})
    required = {}
    for name in REQUIRED:
        path = OUT / name
        required[name] = {'exists': path.exists(), 'sourceCommitPresent': path.exists() and source in path.read_text()}
        if not all(required[name].values()):
            errors.append({'kind': 'required-document', 'file': name, **required[name]})
    archives = []
    for path in sorted(OUT.rglob('playlog.jsonl')):
        latest = {}
        count = 0
        for line_number, line in enumerate(path.read_text().splitlines(), 1):
            try:
                entry = json.loads(line)
                body = decode_record(entry)
                latest[entry['file']] = body
                count += 1
            except Exception as exc:
                errors.append({'kind': 'archive-invalid', 'file': str(path.relative_to(OUT)), 'line': line_number, 'error': str(exc)})
        matched = 0
        for name, body in latest.items():
            projection = path.parent / name
            if not projection.exists() or projection.read_text() != body:
                errors.append({'kind': 'latest-projection-mismatch', 'file': str(projection.relative_to(OUT))})
            else:
                matched += 1
        archives.append({'file': str(path.relative_to(OUT)), 'versions': count, 'latestProjectionsMatched': matched})
    # Self-referential manifest and its archive cannot have a stable hash in this manifest.
    excluded = {'artifact-integrity.json', 'artifact-manifest.json'}
    files = {str(path.relative_to(OUT)): {'bytes': path.stat().st_size, 'sha256': digest(path), 'sourceCommit': source}
             for path in sorted(OUT.rglob('*')) if path.is_file()
             and path.name not in excluded and path.name != 'playlog.jsonl'
             and '__pycache__' not in path.parts}
    result = {'sourceCommit': source, 'status': 'PASS' if not errors else 'FAIL',
              'frozenSourceFileCount': len(manifest['sourceSha256']), 'changedSourceFiles': changed,
              'requiredDocuments': required, 'archives': archives, 'errors': errors,
              'scope': 'Current app source and published report archives; binary/raw artifacts traced by separate manifest. Does not prove subjective fun.'}
    write_recorded(OUT / 'artifact-manifest.json', json.dumps({'sourceCommit': source, 'files': files,
                   'exclusions': 'Manifest/integrity projections and playlog files excluded from recursive hashing; every archived version checksum is independently verified.'}, ensure_ascii=False, indent=2), producer='root-artifact-review')
    write_recorded(OUT / 'artifact-integrity.json', json.dumps(result, ensure_ascii=False, indent=2), producer='root-artifact-review')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
