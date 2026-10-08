# Phase 7-A full regression baseline

- Result: PASS.
- Command: `npm run check` (single invocation), repository root `/workspace/plw-rpg`.
- Window: 2026-10-08 04:09:47–04:10:07 UTC / 12:09:47–12:10:07 Asia/Taipei.
- Exit: `0`; stderr empty. Vitest: 28/28 files, 531/531 tests passed. `vue-tsc --noEmit`: PASS. Vite production build: PASS (87 modules).
- Initial/final HEAD: `2d6af37cb36c9616cb832fc4d839bfd6ea7ef7c9`.
- Tracked source: 91 files; all file bytes match the per-file SHA-256 map in [content-baseline.json](../content-baseline.json), at this HEAD and in current tracked `src/` files. Canonical fingerprint: `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`, computed as SHA-256 of compact sorted-key JSON mapping sorted tracked `src/` paths to file SHA-256 hex digests (`ensure_ascii=False`, compact comma/colon separators).
- This runner also retains `0779847a7e282d6f3dd6f622833452986c968b8b16fb2fca0b0949d4a5018c65`, a distinct valid fingerprint: SHA-256 over sorted entries formed by path UTF-8, NUL, file SHA-256 hex ASCII, and LF. The values use different serialization algorithms over the same 91 identical file hashes; they do not indicate source drift. No staged or unstaged `src/` diff after the run. Pre-existing Phase 7 planning changes were preserved; later untracked content drafts are not part of this 91-file HEAD baseline.
- Runtime: Linux x86_64, Node `v24.19.0`, npm `11.9.0`, Vitest `4.1.11`, Chromium `151.0.7922.173`; installed dependencies reused, no install or package changes.
- Full machine/run manifest: `fullregression.json`. Captured raw streams and status: `fullregression.stdout.txt`, `fullregression.stderr.txt`, `fullregression.exit.txt`. Stdout SHA-256 `2d847fcc152e4995f23ab6262e6892b429470a404c9132130092c0b16182a5b6`; stderr SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

This is the Phase 7 pre-change baseline on the selected HEAD; it does not reuse the Phase 6 run as a new baseline. All report versions were published through `scripts/recorded_reports.py` and are retained in the adjacent `playlog.jsonl`.
