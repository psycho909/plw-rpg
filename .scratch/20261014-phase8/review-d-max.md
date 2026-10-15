# Review request — Phase8-D1 (Max deep review; reviewer did not build D)

Review only; no file edits except your review file; no commit. Write `reports/v2/20261014-balance-tuning/phase-08/d-review/d-max-review.md`; reply with only that path. A D2 controlled comparison is being added concurrently by the D worker to the same report (new section/attempts) — review D1 r2 content; note if D2 appears.

- Spec `docs/specs/V2X-PHASE8-BALANCE-TUNING.md` §3 P8-F05, §4, §8, §10 World, §13, §17. Ticket `tickets/20261014-v2x-08d-world-crisis.md`. HEAD c489ff1 (src unchanged in D).
- Deliverables: `phase-08/world-crisis-balance.md`, `phase-08/d-runner/d1-summary.md`; scripts `scripts/phase8/{world-crisis-core,run-world-crisis,run-crisis-contribution-assay,analyze-world-crisis-r2,test_world_crisis_core}.mjs`; attempts listed in d1-summary.
Check: Director/Crisis/civil-defense source reading correct (file:line); runner uses only public engine paths (no second engine, no state hacks except labeled controlled fixtures); succession legality vs UI (App.vue); validity gates real; numbers spot-checked against raw; normal vs controlled separation; contribution assay fairness (equal-action proxy); daily balance math (+0.65 vs guards×0.035); whether conclusions/NO CHANGE claims are supported; any invented thresholds; save/reload evidence.
