# Phase 6-G focused browser QA checklist

Focused execution is released by Root against the frozen G build. Evidence is runner-driven against production `dist` in system Chromium. Normal opening and controlled crisis states use separate isolated contexts; controlled fixtures are explicitly labeled. No human validation is claimed.

## State lanes

- **NORMAL_FRESH:** use a new profile, confirm the native opening dialog, click visible `起身`, and advance canonical time only through visible controls. A natural warning missed within the focused-run budget is `UNREACHED`; warning coverage must then come from a separately labeled controlled warning fixture, never a claim about normal play.
- **CONTROLLED_WARNING_UI_FIXTURE / CONTROLLED_UI_FIXTURE:** separately labeled warning and preparation states in isolated contexts. Do not describe them as a normal playthrough. The fixture generator and manifest identify creation method, source revision, save hash, and controlled changes.
- **CONTROLLED_FOREST_CAMP_CHIEF:** separately labeled forest location and chief-alive state used only to verify visible camp-raid and Chief actions open actual combat.
- **LEGACY_UNKNOWN_FIXTURE:** separately labeled prior-version save/state whose aftermath has no resolution summary. Verify the displayed result/recovery says unknown; never infer or fabricate an outcome.

Every lane has its own operation log, start/end provenance and final result. No fixture is loaded into the normal-fresh context.

## Focused cases

1. **Warning and needs:** In a controlled warning lane, verify the world warning badge and recent event before opening Life News; inspect the warning overview and four needs. In normal fresh, report natural warning only if it occurs within the focused window; a controlled result does not substitute for it.
2. **Food and gold:** Controlled eligible preparation fixture: verify offered quantities and disabled/absent actions when unavailable. Contribute food and gold through visible actions; verify success feedback and updated ledger/need state. No direct store mutation.
3. **Equipment confirmation and stale guard:** Controlled eligible preparation fixture with an owned, un-equipped item and valid defender. Capture inline confirmation, confirm delivery through the visible button, verify item leaves inventory and exactly one defender allocation is recorded. The UI clears the confirmation after success, so this run does not claim a stale-before-confirm UI race; the engine's stale crisis-ID rejection remains covered by [crisisContributions.test.ts](../../../../src/engine/crisisContributions.test.ts). Keep screenshots before and after confirmation.
4. **Forest / chief:** Controlled forest fixture with chief alive. Verify visible camp-raid and Chief buttons are enabled in the forest and clicking each enters actual combat. This checks action entry only; no combat outcome is claimed.
5. **Persisted results:** Controlled current aftermath with known summary: verify outcome and recovery text after reload. Legacy unknown fixture with null summary: verify explicit unknown text survives reload and no guessed result is shown.
6. **Window behavior:** In focused cases verify Escape closes dismissible dialogs and check Life News at a narrow viewport (390×844) for page-level horizontal overflow. This focused runner does not claim complete focus-trap or keyboard-navigation coverage.
7. **Clock and save:** In the fresh normal lane, verify world time advances while Life News is open and visible save/reload preserves the world clock. In the controlled preparation lane, verify contributions persist across reload. No long-run crisis-frequency or outcome claim is made.

## Evidence and outcome rules

- Launcher must require `--go` plus Root release marker matching HEAD, recursive sorted `src/**` hashes/fingerprint (including untracked), build-status SHA/source manifest, current `dist` fingerprint, spec/ticket/release hashes, and runner/support/launcher hashes.
- Verify served `dist/index.html` and referenced JS/CSS bytes against the successful build manifest before launching `/usr/bin/chromium` with Playwright and a clean temporary profile.
- Record UTC start/end, HEAD, source map/fingerprint, build status SHA and build source map, dist map/fingerprint, harness hashes, release/ticket/spec hashes, viewport, controlled vs normal lane, actions, clock and reload checkpoints, browser console/page/request/storage errors, screenshots for failures and key confirmation/result states, and raw JSONL. Publish each final projection using `scripts/recorded_reports.py` / `write_recorded`; retain raw failures and screenshots.
- Any source, build, runner, ticket/spec/release, or HEAD change during a run invalidates the run as `FAILED_PROVENANCE_CHANGED`. Do not silently retry; preserve the run directory and report the changed hashes.
- A pass means only the specific browser interaction behaved as observed on this frozen build. It does not establish human usability, product fun, long-run balance, or full crisis frequency. H–J and long browser runs remain outside this focused G run.
