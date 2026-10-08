# Phase7 Bug Register

Source anchor: a1307d220a68213be6465bc40e0a85af8ec605a3 + frozen C source map in c-core.md. Development QA in progress; these findings are not resolved until failing tests, fixes and independent re-review complete.

| ID | Severity | Finding / evidence | Status |
| --- | --- | --- | --- |
| P7-C01 | P1 boundary save integrity | Valid 99-key director cooldown state admits boss; midnight adds lastDailyTick as key100; victory cannot add boss cooldown and caller ignores failure. Adjacent victory-before-midnight path adds key100 then daily marker101, exceeding save limit. Initial independent evidence: c-independent-review.md/json; natural frequency not measured. | Max minimal RED/fix pending |
| P7-C02 | P1 normal-play save integrity | Outdoor authored-family victory enters dungeon branch: three Slime wins falsely clear dungeon/award iron; fourth advances stage4 above configured limit3, making reload invalid. Initial independent evidence: c-independent-review.md/json. | Max minimal RED/fix pending |
| P7-C03 | P1 boundary save integrity | Preexisting valid100-entry director map without lastDailyTick gains entry101 at midnight, failing reload validation. Core audit records this separately; narrow bounded writer saturation policy approved, preserve active/unknown entries. | Max RED/fix pending |
| P7-B01 | P2 authoring validation | Legacy/procedural item counting, invalid consumer paths, malformed nested entries, integer quantities, region tokens, baseline affix slots, bounds and required recipe enums missed by initial validator. B independent review B1–B7 retains original findings; final16tests and independent delta review accepted. | Fixed / authoring scope reviewed |
| P7-A01 | P3 QA evidence | Initial regex counter missed same-line registry keys: legacy ITEMS4 instead of8. AST counter/fixtures and independent audit fixed. Original inaccurate Markdown archived; original incorrect JSON snapshot was not archived and cannot be claimed preserved. | Fixed with archive limitation |


## Separate findings, not runtime bugs

- Earned-material crafting positive expected conversion margins are balance findings, not demonstrated infinite purchase-cycle exploits. Resin recipe fee11 is an approved conservative authoring adjustment; moss fee20 retained. Exact failures/decisions in c-core.md and c-core-validation-transcript.md.
- 100-year test isolated4.34s versus full5013ms/default5000 timeout: test-specific15000 allowance approved, all assertions unchanged; cause unknown, performance validation pending J.
- Remote push authentication failed after successful21f7552 synchronization; latest locala1307d2 sync unverified, details environment-incident.md.
