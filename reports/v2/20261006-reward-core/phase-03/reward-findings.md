# First-slice reward observations

Scope is spec§77 Phase0–3 development QA. These are system/automation observations, not subjective player answers or a retention approval. Current frozen application is base6568b466 plus74 source hashes.

| Finding | Evidence | Impact / recommended next direction |
| --- | --- | --- |
| PF02-01 — raw slot-stat gap | Fresh simulation retains6428 normal drops from10,000 awards;6203 (96.50%) have raw slot stats below the established fixed7-attack/5-defense legacy gear comparison. This statistic excludes affix utility and is not a junk-item rate. | Nonblocking first-slice balance observation. Evaluate complete effective gear value and actual build choices in the approved later balance phase before changing curves; do not silently rebalance during QA. |
| PF02-02 — hunting recovery interruption | The first normal-UI five-rank victory sequence depleted forest monster population to0. Legal rest restores it; the retry recovered to1.02 before displaying six days of boss cooldown. | Hunting has a real recovery interval. Evaluate pacing, the visible return signal and alternative life activities when broader reward loops are authorized. Do not remove depletion to ease tests. |
| PF03-01 — materials precede crafting | Boss MoonStone and family materials are real owned, saved and tradable rewards; crafting/workshop/masterpiece belong to later phases. | This first slice does not establish the full mid/long-term material spending loop. Make that distinction when assessing retention. |
| PF03-02 — shared regional wording | Family hunts intentionally reduce shared forest population/Goblin Chief build-up while the current threat surface uses camp-oriented language. Boss victory does not resolve Goblin Chief alive/warning or write its memory. | Preserve existing rules; consider terminology when later world/content work is authorized. |

Positive engineering signals: the UI exposes five ordered next targets and explicit prerequisites; cues correspond to actual defense/attack effects; all five enemies can be defeated with a fresh normal save and legitimate preparation; boss rewards are inspectable and ownership survives reload. These demonstrate a functional vertical slice, not proof that it is fun.

Timing limitation: automated high-density UI inputs execute much faster than a person reading and choosing. The20-minute stress repeatedly exercises modal/gear/gather/rest/save paths and cannot measure a person's10–15-minute reward drought, attachment or anticipation. Controlled combat and loot samples likewise do not establish normal-player balance. Historical V2 exploratory records used the older V2 source and are not new-source V2.x exploratory evidence.

Human play/Fun Gate/Retention Survey: **DEFERRED / NOT APPLICABLE AT THIS STAGE**, and do not block development engineering gates. Current task does not declare the build ready for human product testing.
