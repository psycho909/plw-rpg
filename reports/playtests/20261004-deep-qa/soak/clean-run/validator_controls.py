"""Targeted authoritative-fingerprint controls, without replaying the soak."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(OUT.parents[4]))
from scripts.recorded_reports import write_recorded

spec = importlib.util.spec_from_file_location("clean_soak_validator", OUT / "validate_export.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
expected = json.loads((OUT.parents[1] / "baseline/final-manifest.json").read_text())["buildHashes"]
fields = ("fingerprintStart", "fingerprintEnd", "buildHashes")
valid = {name: dict(expected) for name in fields}
partial = {"index.html": expected["index.html"]}
changed = dict(expected)
changed["index.html"] = "0" * 64
cases = [
    ("complete manifest match", valid, expected, True),
    ("all fingerprint fields absent", {}, expected, False),
    ("all fingerprint fields empty", {name: {} for name in fields}, expected, False),
    ("all fields equally incomplete", {name: partial for name in fields}, expected, False),
    ("all fields equal altered hash", {name: changed for name in fields}, expected, False),
    ("one fingerprint field absent", {name: expected for name in fields[:-1]}, expected, False),
    ("empty authoritative manifest", valid, {}, False),
    ("malformed authoritative hash", valid, {**expected, "index.html": "not-a-sha256"}, False),
]
rows = []
for name, supplied, reference, wanted in cases:
    observed = mod.fingerprints_match(supplied, reference)
    legacy = supplied.get("fingerprintStart") == supplied.get("buildHashes") and supplied.get("fingerprintEnd") == supplied.get("buildHashes")
    rows.append({"name": name, "expected": wanted, "observed": observed,
                 "legacySelfEqualityResult": legacy, "pass": observed is wanted})
result = {"status": "pass" if all(row["pass"] for row in rows) else "fail", "cases": rows,
          "validatorSha256": hashlib.sha256((OUT / "validate_export.py").read_bytes()).hexdigest(),
          "method": "Eight isolated controls call the actual offline gate; no browser or game state interaction.",
          "limitation": "Full journal/export/duration validation awaits the completed actual soak."}
write_recorded(OUT / "validator-controls.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="root-validator-review-controls")
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(0 if result["status"] == "pass" else 1)
