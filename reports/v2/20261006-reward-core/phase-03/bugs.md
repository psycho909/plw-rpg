# Phase3 findings ledger

Source: base `6568b466390d06e6be0af2585e7524b9415204b8` plus exact source-freeze/build fingerprints (74 files). Current source remains unchanged after314 tests/typecheck/build,20 browser regression checks and5 simulation tests passed.

## Production bugs

No new P0/P1 production bug confirmed in this slice. Phase1 R1 (P2 missing derived combat-stat/HP/root-boss cross validation) is closed by the Phase3 strict guard and directed/full regression. Original corrupt-save cases remain negative tests; valid fractional companion HP is preserved.

## QA runner bugs and traceability

| ID | Severity | Evidence | Disposition |
| --- | --- | --- | --- |
| QA03-01 | P2 | `fight_action` returned cueFromRenderedUI while fight read cue; independent static review caught a KeyError path before any timed run. | Fixed consistent keys, archived harness versions; no production source change. |
| QA03-02 | P2 | Recent global wins could misclassify flee; length-based slicing also failed after the150-event ring filled. | Fixed eventSequence/event.id-scoped evidence. |
| QA03-03 | P2 | Live postreload time could be confused with loaded time when the normal clock resumed. | Fixed exact first-native-checkpoint observation, then genuine UI pause/reopen; native writes forwarded unchanged. |
| QA03-04 | P3 | Successful opening gray fight omitted won:true, incompatible with the five-wins tally. | Fixed in recorded final static SHA074fc944. |
| QA03-05 | P2 | Actual first normal run13.163s: world5968, wolfBossDefeatedAt5967, population0; visible blocker is nearby-monsters-unavailable rather than cooldown text. Original browser-stress raw status/stderr/failure state and timestamped screenshot retained. | Fixed in harness1423a363; normal UI rest restored population1.02 and confirmed remaining6days, defeatedAt5967/rootnull unchanged. Fresh run20261006T070601Z passed1200.610s/41CP/1425cycles/7reloads; original13.163s failure retained. |
| QA03-06 | P3 traceability | Unrun initial261-line draft was replaced before automatic archival; exact original code could not be recovered. | Disclosed archive gap; no runtime/failure-state record lost, all subsequent versions use recorded writer. |
| ENV03-01 | Setup | Strict audit initially exit2 because /tmp official audit script was lost after the tool outage. | Restored exact skill script; strict retry PASS0 findings. Both raw outputs retained. |

An early fractional-HP test fixture failed because its companion damage floored to1; correcting the fixture to an odd strength produced actual fractional HP. It is recorded as test setup, not a game bug. Expected missing-module RED was preserved before implementation.

## Product observations / inherited findings

PF02 recovery pacing persists: clearing forest population makes hunting temporarily unavailable; regular world progression restores eligibility. The first normal run reached all five wins and Lv5 through legal actions, but this does not establish fun or long-term retention. Low-base raw slot-stat comparisons from Phase2 remain a balance observation; affix utility is not included in that raw statistic.

The controller role is classification implemented through its concrete howl/moonCharge core, rather than a separate generic modifier. Root clarified this narrow interpretation; no new bonus or product redesign was introduced for QA. Shared forest threat uses goblin-camp wording, a future semantics review point.

Historical V2 C01/C02/C03 and other open product findings remain in their original reports; this slice does not silently close them. Human validation/Fun Gate/Retention Survey: **DEFERRED / NOT APPLICABLE AT THIS STAGE**, no engineering blocker.

## Final review dispositions

The isolated Spec reviewer retained a P2 proposal for deleting the optional family marker from an active boss save. Root and the independent compatibility reviewer classify this as **OUT OF SCOPE optional-marker corruption/tamper hardening**, under the Owner's explicit exclusion of file modifications/deletions. Normal engine/save paths preserve the tag, while an untagged legacy wolf may legitimately coexist with a fled boss root. Original finding, narrower hardening proposal and root decision remain linked in spec-review.md, independent-review.md and review-decisions.md; no blanket guard or product redesign was added.

QA03-07 (P3 summary bookkeeping): the low runner's completion message accidentally used the earlier failed run's start to claim29m50s. The durable fresh-run timestamps show **1200.610seconds /20m0.61s**, and root corrected that summary. Original messages remain history; final reports use the canonical fresh-run data. This did not alter the actual run or PASS status.

QA03-08 (P3): the first final-integrity projection compared absolute paths with repository-relative fingerprints. Corrected to74 relative paths/zero mismatch; intermediate report retained.

QA03-09 (P2 report accuracy): summary `first`/`last` initially used sorted bounds, misreporting nonmonotonic metric endpoints. Medium fixer preserved reproduction, corrected all27 series, and added two semantic regression tests. Independent Medium review verified all27 against raw checkpoints. Actual final state is separated from checkpoint41; original raw runtime is unchanged.

QA03-10 (P3 report presentation): adding First/Last columns left several Markdown rows with six cells. Corrected to seven cells across13 rows, with a regression checking every endpoint and explicit gold45/322, events1/150 and origin2398/794592. Root inspected the corrected table and test; prior reviewer finding remains preserved.

QA03-11 (P3 JSON projection): three reviewer JSON files ended with a literal backslash-n, so full JSON parsing reported Extra data. Medium fixer preserved invalid originals, republished identical decoded objects with an actual newline, and verified full parsing and object equality. Findings/stats/raw evidence remain unchanged; see review-format-fix.md/json. Two authored Markdown hard-break whitespace diagnostics were corrected only in their current projections, retaining prior versions.
