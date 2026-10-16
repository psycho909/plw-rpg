# V2.x Engineering RC — Risk Register

Extends [final-risk-register](final-risk-register.md); entries there remain valid unless updated here.

## Release blockers

None found（P0 / P1 / data integrity / save-migration / world continuation / duplication / determinism / required browser operation）.

## Owner decisions

| ID | Decision | Notes |
|---|---|---|
| **S-01** | **ACCEPTED PRODUCT DECISION / KEEP CURRENT VALUES**（Owner 2026-10-16） | Game year = 4 seasons × 30 days = 120 game days. Kept: regional crisis cooldown = `baseCooldownDays 360 + severity × severityCooldownDays 30 + outcome extra + pressureDays`（`src/data/config.ts:15`, `src/engine/regionalCrisis.ts:104`）; elf 360 / mage 420 / knight 480 game days（`src/data/livingEvents.ts:73-75`）. These are minimum intervals, not guaranteed triggers. Not changed to 120; event rates unchanged. Whether the frequency feels right is for Human Playtest and a targeted balance review; this decision does not claim optimal balance. |
| P10-F03 | Threat Saturation KEEP V0 | unchanged |
| P10-F04 | Merchant stock/restock NOT MODELED | unchanged |
| P10-F05 | Human Product DEFERRED | unchanged |
| Phase8 | Farming V4 | unchanged |
| Journal | Oldest worlds merge into `journal-combined-worlds` markers over the cap | per-world attribution lost for those worlds |

## Findings this round

| ID | Severity | Finding | Status |
|---|---|---|---|
| RC-F01 | P3（QA tooling） | `e-regression.mjs` clicked 起身 before the Web Lock writer was ready and hard-coded the old Chrome path | Fixed in runner only（wait for enabled button; `CHROME_PATH`/`QA_OUT`）. Failed attempt retained. |
| RC-F02 | P3（QA tooling） | O-01 runner C4 first assumed markers stay in pending when the archive is healthy | Fixed assertion（checkpoint + archive）; failed attempt retained. |
| RC-F03 | Info（environment） | 1 `net::ERR_ABORTED` on the smoke runner's first navigation | Benign; no page/console errors |

## Carried technical risks（non-blocking）

- IndexedDB total history unbounded（~1.5M chars per hour at ×1）; physical quota/eviction unmeasured.
- Lost acknowledgement may leave overlapping time ranges under different ids; consumers must not sum them as unique time.
- Accepted O-01 consequence: on load, an oversized legacy pending record is compacted into summary/gap markers at the first save, before any archive flush — even with a healthy IndexedDB it is never archived（pre-fix it could have been archived later）. Its content survives only in an export taken before loading.
- An archived record can coexist with a gap marker covering it（interpretation only）.
- `compactPending` complexity after 6 rounds（maintainability）.
- G-02 invariant covers representative actions only; G-04 / G-05 uncovered; S-02 / S-03 pending.
- Build chunk 502.67 kB > 500 kB warning（pre-existing）.
- Safari（ITP）/ Firefox / physical devices NOT TESTED.

## Security follow-up（separate; does not block RC per Owner）

| ID | Item | Owner action |
|---|---|---|
| SEC-01 | ponytail 5.3.1: 3 `trusted_hash` entries changed 2026-10-16 21:42, most likely set by the Lead's blind confirm keystroke on a Codex hooks-review screen. Not accepted by Owner. | Review ponytail 5.3.1 hooks; keep or remove the trust entries yourself |
| SEC-02 | `~/.codex/hooks.json` runs `herdr-agent-state.ps1` and `C:/Users/pc/.orca/agent-hooks/codex-hook.cmd` on 10 events; script contents not reviewed | Review the two scripts |
| SEC-03 | New trusted project `C:\Users\pc\orca\workspaces\dv3-dito-web\herring`（origin unknown） | Confirm or remove |

Process change already applied: no blind keystrokes to Codex startup screens; read the screen first.

## Post-RC hardening（2026-10-16）

Source: [post-rc-hardening-review](../post-rc/post-rc-hardening-review.md). Product source unchanged; RC verdict still applies.

| ID | Classification | Status |
|---|---|---|
| B1 legacy pending retention | CONFIRMED DEFECT（P3, play-journal detail only）+ PRODUCT DECISION REQUIRED | O-01 discards an oversized legacy pending record at the first save even when IndexedDB is healthy and the checkpoint fits（pre-fix archived it）. Fix proposal `post-rc/b1-retention-proposal.patch` not applied: independent review found it lets pending exceed the P2-01 cap until the next `record()`. Owner to choose: approve exception / keep O-01 / new ticket. |
| B2 archive growth | VERIFIED SAFE IN TESTED SCOPE（≤50 h x1） | Export loads the whole archive: 50 h → 2.3 s, 227 MB blob, 155 MB heap, 1.3 s long task; ~6 MB/h at x1, ~31 MB/h at x20. Eviction, mobile quota, >50 h NOT TESTED. |
| S-02 defender equipment | PRODUCT DECISION REQUIRED | Dead defender's allocations keep 2 of 16 slots; effect drops 4.2743 → 3.7400; substitute cannot receive gear. Spec does not define equipment lifecycle. |
| G-05 determinism | VERIFIED SAFE IN TESTED SCOPE | Craft → Crisis → Save → Reload → Succession → Continue replay equal（`postRcDeterminism.test.ts`）. |
| S-03 performance | VERIFIED SAFE IN TESTED SCOPE（desktop Chrome, incl. 4× CPU emulation） | x20 high-history tick p95 3.7 ms（14.7 ms at 4× CPU）, no frame drops; physical low-end mobile NOT TESTED. |
| SEC-01..03 | see report §A | ponytail local-only; Orca hook posts payload to localhost only in Orca sessions; `herring` trust is dangling. Owner actions listed. |

## Final data-integrity hardening（2026-10-16）

Source: [final-hardening-verdict](../final-hardening/final-hardening-verdict.md).

| ID | Status |
|---|---|
| B1 legacy pending retention | **VERIFIED_FIXED**: oversized legacy pending is archived intact (original ids/content) before the first checkpoint write; the cap is unchanged. Residual: if the archive stays down past the bounded retries (~18 s), the approved P2-01/O-01 compaction applies. |
| S-02 defender equipment | **OWNER DECISION REQUIRED**: the Owner rule already holds below the 16-row ledger ceiling. At the ceiling it needs proposal S2-A (validation history cap 32 / active cap 16; no downgrade) and a definition of permanent ineligibility. |
| RC on new source | Re-verified on dist `977d9883…`: 738 tests, O-01 browser 29/29, Phase10-E smoke identical to RC. |
