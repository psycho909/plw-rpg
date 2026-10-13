# K final Browser lanes closeout

- Release: `RELEASED`; HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`.
- Frozen source `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`, build status `b9d5b047229baf9c8a1bb5f516d18ebc48be4ffb96d6a7dab159e81bdb4f09fc`, dist `0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1`, release manifest `6fb1b481faf264aa22866114d348827eef9b70b736aaef4fa48a31f0eab94cbf`.
- All lanes completed: **True**. Source stayed stable in every run; all lanes recorded zero browser errors.

| Lane | Run ID / result | Actual | Checkpoints | Actions | Reloads | Final world time |
|---|---|---:|---:|---:|---:|---:|
| regression | `20261013T115419Z-pid386544` / `PASS_BROWSER_REGRESSION` | 61.95s | 1 | 17 | 1 | 2020 |
| stress | `20261013T115543Z-pid386732` / `COMPLETE_STRESS_REVIEW_REQUIRED` | 1203.22s | 20 | 287 | 3 | 2983 |
| content-agent | `20261013T121610Z-pid388705` / `COMPLETE_STRESS_REVIEW_REQUIRED` | 1800.80s | 29 | 412 | 5 | 4175 |

Regression passed as `PASS_BROWSER_REGRESSION`. Stress/content-agent completed with the runner status `COMPLETE_STRESS_REVIEW_REQUIRED`, which is the long-lane review status; each returned launcher/runner exit 0.

The content-agent lane is explicitly `runner_driven_agent_heuristic_semantic_visible_control_v1`; `modelInference=false`, `humanTester=false`, and human validation remains deferred. It is not a claim of human play or LLM inference.

Per-lane folders contain exact command, UTC timestamps, stdout/stderr/exit, release preflight, launcher result, telemetry summary, and raw/capture SHA256 manifests. The raw run directories remain unchanged.
