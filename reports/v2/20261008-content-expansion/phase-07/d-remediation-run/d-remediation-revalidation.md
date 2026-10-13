# D Current-Source Revalidation

Status: current-source revalidation passed for the retained Cave Insects gate-fix content, with a successful derived negative control. This evidence does not recover the missing historical failed pack/source fingerprint and does not accept D, waive that historical requirement, or release E.

## Proven generation and frozen inputs

- HEAD before/after: `f026b6b4947d18aadc0f551c642c31750db5768c`.
- `src/data/content/caveInsects.ts` SHA-256 before/after: `20d7d07e7780caf8c199a9c041eeae96a67e30da5bc1c0b34763d1ef9ce39468`.
- Validator/helper/focused-test hashes: `79f390fad5a706955b1f2546c6065191e52e556d4c6297587d2a11cc8859c989`, `574343415da3524deb7092cc1288ce8e602eae8aa9eb41be9b998c62d8dd6bc4`, and `0d071a6a405b2121f5360a0af2c737a17f403d60f61b460ef4dc1cc842a393ba`.
- The saved Vite SSR harness imports `CAVE_INSECT_CONTENT` from the current module and writes compact `JSON.stringify` bytes without a trailing newline. The generated pack is exactly byte-identical to retained `d-cave-insect-pack-gatefix.json`: both are 10,879 bytes with SHA-256 `18751aff901ae9a6512260ad18accce36c33b7e4971838aec82d2d54a45879fd`.
- Full actual `src/`, `scripts/`, package, and configuration SHA maps are captured before/after in `artifacts/before.json` and `artifacts/after.json`. HEAD, the Cave Insects module hash, and every mapped input are unchanged. Current validator run manifests independently retain both inputs and source snapshots; all manifest pack/source hashes were checked against their captured bytes.

## Validator runs

| Case | CLI result | Evidence |
| --- | --- | --- |
| Generated positive pack | Exit 0; content PASS; overall PASS | 8 qualifying monsters and 7 usable materials. Targeted tests and typecheck both PASS. |
| Derived negative fixture | Exit 1; content FAIL; overall FAIL | Only `cave_insect_resin.bias` was changed to `{ "keen": 1 }`. Diagnostics include `orphan-material [cave_insect_resin]` and `affix-ineligible [cave_insect_resin]`; targeted tests and typecheck PASS. |

The negative fixture is newly derived from the proven current-source pack. It exercises the diagnostic family in the historical report; it is not the original failed input. The archived original failure report/checksum remain historical evidence, while original failed pack bytes and source fingerprint remain unavailable.

## Raw evidence and limits

`harness/generate.mjs` and `harness/run.mjs` reproduce generation and the two sequential CLI calls. `artifacts/` contains separate stdout, stderr, exit/timestamp records, exact pack comparison, and full before/after input maps. `work/.qa-runs/` contains each current validator manifest, input bytes, source snapshots, and outcome. Both readable report versions were decoded from the local append-only report archive and their SHA-256 values matched.

These runs establish that the frozen current Cave Insects module produces the retained passing pack and that the repaired CLI preserves current positive/negative evidence. They do not establish the contents or provenance of the missing historical failure. D remains blocked pending Owner's decision on the proposed revised acceptance; E remains unreleased.
