# Adventure policy retry 01 — independent review

Status: **ACCEPTED FOR ROOTGO / LOW RUNTIME RETRY (STATIC REVIEW)**

## Standards

No issue found in the scoped delta. The original `adventure_policy.py` and `phase04_adventure_playtest.py` remain unchanged at their recorded SHA-256 values. The retry uses separate policy, runner, output, and producer identities; the existing stress runner still imports the original shared helper.

## Spec

The policy now gathers eligible labels present in the current visible goal and selects the longest match. This resolves the recorded `灰狼` substring collision inside `傷痕灰狼` while keeping target selection tied to the readable goal and actual eligible options. Existing exclusive reward and collection progression fallbacks remain. There is no fixed rank march.

The retry Adventure runner imports only the retry policy and records the explicit visible goal plus eligible target options (`label`, `definitionId`, `rank`) as read-only decision evidence. It has a distinct `adventure-agent-playtest-retry01.json` output and producer. The Low launcher has a separate retry identity and output; it pins expected HEAD and the complete 74-file source fingerprint, requires a successful build with matching source map, starts its owned loopback server on port 5216, verifies served index and JS/CSS bytes against `dist` and `final-runtime-status`, invokes the retry harness with 1,800 seconds, and records source/build/harness/helper provenance before and after. Cleanup targets only processes created by this launcher.

The pure regression test passed (2 tests). The archived RED artifact reproduces the old generic-label selection, and the verification record reports the corresponding GREEN and compile checks. Original source and runner hashes still match the accepted baseline.

## Trace evidence limit

The original 30-minute trace did not persist the exact visible goal or option rows for TRACK entry 91. At elapsed 40.6037 seconds it recorded a gray-wolf choice after gray wolf was defeated, with population 1.02, HP 106, and stamina 84. Reconstructing the expected scarred-wolf goal and eligibility from the recorded trace state and current frozen UI/engine source is deterministic but indirect. The original report therefore cannot establish the exact decision context by direct log evidence. The retry runner captures these fields directly for future TRACK decisions.

## Verification boundary

This review accepts the retry artifacts for RootGO and a separately controlled Low runtime run. I did not execute the launcher or long playtest. No retry runtime PASS is claimed, and the prior 30-minute report and aggregate status remain unchanged.
