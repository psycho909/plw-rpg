# Browser state summary telemetry patch (2026-10-13)

Scope: `qa_browser_runner.py` and its preparation contract tests only. No Browser was launched and no product source, dist, or release manifest was changed.

The preserved RED run (`red/command-output.txt`, exit 1) executed both state-summary contracts before the helper existed; both failed at the callable-helper assertion. The original stopped stress diagnostic was left untouched.

The runner now projects V2 NPC population/alive/dead, settlement, character/NPC gold totals, threat metrics, boss/crisis fields, event/history/journal counts, and UTF-8 localStorage bytes under checkpoint `browserState`. Missing or malformed fields are null and their paths appear in `unsupportedFields`; grouped and overall status indicates supported/partial/unsupported. Existing checkpoint metrics still provide DOM/heap, error counts, save latency, and bounded IndexedDB telemetry. The checkpoint reuses projected counts so malformed optional arrays cannot crash count extraction.

GREEN: `green/contract-tests.txt` reports 40 passing contracts, including complete/missing schema fixtures and serialized checkpoint coverage. `green/static-checks.txt` records py_compile and scoped diff-check passes. No Browser validation was requested or run.

SHA-256:
- `qa_browser_runner.py`: `674de8687c5524b21d2a2dc8746bdf56a81952d1c2486b358ee7d621f3daa1be`
- `test_qa_browser_contract.py`: `d8c8af939a10ec401e4190c11deeec9516ad96fce48c4f0f7a448beb2a05e682`
