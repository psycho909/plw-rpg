# Phase 7-D timeout runner diagnosis

- Date: 2026-10-13 (Asia/Taipei; raw run timestamps are UTC).
- Scope: diagnose the recurring 15-second timeout in `src/services/saveService.test.ts`, then verify Root's test-only worker scheduling change. The simulation range, test assertions, timeout, and production source were unchanged.
- Branch: `v2x/reward-core`.
- Repository HEAD: `fd6b5e84bef73d5dc429201c903d4a867976cd0a`.
- Skill workflow: `matt-skills-curated:diagnosing-bugs` was applied under the repository's skill adaptation rules. The requested cloud onboarding skill was also read; the existing checkout, Node/npm, dependencies, and test workflow were already available, so no environment configuration change was needed.
- Status: diagnosis plus one successful canonical regression after the scheduling correction. D remains blocked on the missing historical authored-source evidence; E remains unreleased.

## Environment and Vitest scheduling

- Node: `v24.19.0`; npm: `11.9.0`; Vitest: `4.1.11`.
- Node reports `os.availableParallelism() = 4` and `os.cpus().length = 5`.
- cgroup `cpu.max = 400000 100000`, equivalent to a four-CPU quota.
- Vitest's installed implementation computes default non-watch workers as `max(availableParallelism - 1, 1)`; the default cap here is three workers. This is not clear evidence of CPU oversubscription.
- The npm package and test configuration were unchanged during the controlled four-run diagnosis. Root's subsequent configuration correction and its separate source fingerprint are recorded below.

## Controlled runs

All four whole-suite runs were sequential and non-overlapping. Full raw stdout, stderr, exact command, start/end UTC, and exit status are in [worker-probe](d-timeout-diagnosis-run/worker-probe/README.md).

| Command | Exit | 500-year body | Whole suite |
| --- | ---: | --- | --- |
| `npm test` | 1 | 15,661 ms, timeout | 569/570 pass |
| `npm test -- --maxWorkers=2` | 0 | passed | 570/570 pass; 18.74 s |
| `npm test -- --reporter=verbose` | 0 | 14,938 ms | 570/570 pass; 16.60 s |
| `npm test -- --maxWorkers=2 --reporter=verbose` | 0 | 13,863 ms | 570/570 pass; 18.05 s |

The fresh default RED occurred in the first run, but did not recur in the verbose default run; it is not reliably reproducible. Earlier recorded default failures remain authentic historical evidence. The two-worker verbose run was 1,075 ms faster for the target test, while its whole-suite elapsed time was longer than the default verbose run. This small sequential sample is consistent with scheduling contention contributing to the target's borderline runtime, but does not prove causality or rule out run-order and timing variation.

## Provenance and artifacts

- Before/after sorted path-to-SHA maps and the canonical fingerprint for the two verbose runs are preserved in `worker-probe/`; maps cover all files under `src/`, package and lock files, and config inputs. They matched across both runs: `fe237e57812978abe5532483fd92b7d3410cb61c86dfc26b3b3aa929d5b2555d`.
- The initial default/maxWorkers=2 pair preserves targeted test and service hashes before/after, not a complete working-tree fingerprint. The complete map was added before the verbose pair; do not attribute that complete fingerprint retroactively to the first pair.
- The first, incorrectly named QA-runner agent was interrupted before it ran a command or wrote artifacts. It produced no logs or source hashes; the compliant `g6_luna_low_qa_runner` performed the four archived runs. No probes overlapped.
- No code or configuration was changed during the four-run diagnostic matrix; the later scheduling correction has a separate source map. No timeout, product simulation, or save implementation was changed at either stage.

## Hypotheses and next decision

1. **Worker scheduling contributes:** predicted a lower target-body runtime when full-suite concurrency is capped. The verbose pair supports this once (14,938 ms default vs 13,863 ms with two workers), but is too small to establish cause.
2. **The target is intrinsically close to its limit:** supported by the existing isolated pass (~9.95 s), prior full-suite failures (15,268 and 15,074 ms), fresh 15,661 ms timeout, and fresh default 14,938 ms pass. Results vary around 15 seconds.
3. **Product/runtime workload contributes:** the probe did not vary production source or compare the earlier product baseline, so it cannot confirm or reject a product performance regression. Passing under either worker setting does not by itself settle that hypothesis.

**Initial proposal (superseded by the Root decision below):** cap Vitest at two workers in the ordinary test runner. This preserved the 500-year loop, timeout, and assertions in the probe and reduced the measured target body runtime. The measured margin was only 1,137 ms; the sample did not establish a reliable guarantee. Root chose one worker for the subsequent scheduling correction.

## Environment readiness

The existing checkout had its pinned Node/npm toolchain and installed dependencies, and Vitest executed the complete 570-test suite in all four runs (one initial timeout failure, three complete passes). No reusable setup or startup configuration needed to be added for this diagnostic task.


## Root-approved scheduling change and canonical verification

The earlier sections record diagnosis before Root's configuration decision. Root then approved a test-runner-only cap of one worker in `vite.config.ts`, preserving the 500-year simulation, its assertions, and its 15,000 ms timeout. The added comment reads: “Keep long world simulations from sharing CPU with other test files.” This is a scheduling choice, not a proven root-cause claim.

- Config SHA-256: `becf40818c32c8a55aea3c51276d1a6be6e4c7243b06fad512ece24b7a10a771`.
- Config diff: set `test.maxWorkers: 1`; no package, product, test, or timeout change.
- Canonical command: `npm run check`; start/end `2026-10-13T01:10:56Z`–`2026-10-13T01:11:37Z`; exit 0.
- Local interval: 2026-10-13 09:10:56–09:11:37 Asia/Taipei.
- Vitest: 31 test files, 570/570 tests passed; suite duration 34.08 s (reported tests 28.48 s).
- Build: `vue-tsc --noEmit` passed; Vite 7.3.6 transformed 91 modules and built in 1.76 s.
- The standard canonical output did not include the 500-year test's individual body duration. No reporter change or extra run was made.
- Raw stdout/stderr, command metadata, and sorted before/after hash maps are in [maxworkers-1-check](d-timeout-diagnosis-run/maxworkers-1-check/). The maps cover 103 entries across all `src/` files and named package/config inputs; the before/after fingerprint matched: `9849349e05bf490b369fa0b011bb68e90fa0ccc6c04ebb958b886fb17a5a32c0`.
- No retry followed the canonical run. D remains blocked on missing historical source evidence; E remains unreleased.
