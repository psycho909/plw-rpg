# Final runtime driver validation guards

The original archived driver was recorded before the patch in `archive/playlog.jsonl` at 2026-10-06T12:41:24.256+00:00, SHA256 `b052a3bafd6798f7dd68a47ea287612c5f09e6baff8ba0de4e24055841d7ebf0`. Its simulation validation required the requested award total, seed count, and a nonempty combat row list, but did not enforce per-rank denominators, the full 15 × 3 × 6 × 2 × N scenario Cartesian product, uniqueness, or exact paired run count. The targeted browser stage accepted the report without checking that `checks` was nonempty or that core checks from `verify_browser.py` appeared. These are validator gaps established by the original code, not a claim that a full runtime report was executed and failed.

The patched driver now requires exactly 1,000 awards / one seed for sanity and 100,000 awards / eight seeds for final; each of the five rank cohorts must have exactly one fifth of the awards. It validates the configured five-rank split and boss-exclusive counts, all approved build/band/target/policy sets, unique scenario keys equal to the full Cartesian matrix, exactly 540N metric rows, and exactly 1,080N actual uninterrupted/reload fights. The browser stage now rejects empty/missing checks and requires the fixed core check names plus the documented single-modal and responsive check groups; additional browser checks remain allowed.

Pure validation test command:

`python3 reports/v2/20261006-reward-core/phase-04/archive/test_final_runtime_driver_validation.py`

Result: 6 tests passed in 0.011 seconds. Tests cover valid sanity and final matrices, truncated rows, an incorrect rank denominator, duplicate scenario keys, empty/missing browser checks, and an expanded valid check set. The test imports the inert driver module; it does not start the app, browser, simulation, build, or server.

SHA256 after patch: driver `4fa911a46a92056946fd1dd6c68607821279a9239bdc5b1487dba9903d4108c0`; test `3e11c7e11643c20000cc2b9c7ced304406d59ecc224612281b5e887732827113`. Original and patched driver versions were both published with `scripts.recorded_reports.write_recorded`.
