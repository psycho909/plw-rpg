# Phase 5 skill capability analysis (interim)

**Status: E capability rules and the I controlled per-skill generation profiles are recorded; normal-play progression prevalence remains unmeasured.** I's 100,000 generated outputs are pinned to result SHA `7b6de2655b2ff670eb2500bc817df4756ae2ae2e728f48f153636e0395c92ef8` and source fingerprint `b25f8119203c9c0dc9000f2b2bd34540e9ea62dd2642998eb8a6bf4a0af3e8cf`; profile projection: [crafting-distribution.json](crafting-distribution.json). The runner executes **zero full craft transactions**, so these are not observations of how often players reach or use each skill level.

## The two gameplay capabilities

1. **Recipe access:** `fieldSpear` and `fieldArmor` unlock at Smithing 2; `ironShortSword` unlocks at Smithing 5 and requires the Blacksmith plan. Recipe availability derives from current state.
2. **Bounded quality floor:** at Smithing 3, Common weight moves into Uncommon; at Smithing 5 for the advanced recipe, Common and Uncommon move into Rare. Epic and Legendary weights remain 2.8% and 0.2%. Eligible practice grants 10 Smithing/character XP below its recipe cap; caps remain starter 3, intermediate 5, advanced iron 6.

## Observed neutral-profile quality by skill

Each profile has 3,333 or 3,334 seeded craft-context outputs. Rates below include **95% Wilson intervals**. Zero observed counts do not prove a true rate of exactly zero; use the interval and the configured/source schedule. Full material arms and all rarity buckets are in the linked projection.

| Recipe | Smithing | n | Common % (95% CI) | Uncommon % (95% CI) | Rare % (95% CI) | Epic % (95% CI) | Legendary % (95% CI) |
|---|---:|---:|---:|---:|---:|---:|---:|
| starterSpear | 1 | 3334 | 59.90% [58.22%, 61.55%] | 27.47% [25.99%, 29.01%] | 9.81% [8.84%, 10.86%] | 2.49% [2.01%, 3.08%] | 0.33% [0.18%, 0.59%] |
| starterSpear | 3 | 3334 | 0.00% [0.00%, 0.12%] | 86.53% [85.33%, 87.65%] | 10.98% [9.96%, 12.08%] | 2.34% [1.88%, 2.91%] | 0.15% [0.06%, 0.35%] |
| starterSpear | 6 | 3334 | 0.00% [0.00%, 0.12%] | 87.58% [86.42%, 88.66%] | 9.45% [8.50%, 10.49%] | 2.76% [2.26%, 3.37%] | 0.21% [0.10%, 0.43%] |
| fieldSpear | 2 | 3334 | 59.03% [57.35%, 60.69%] | 26.75% [25.28%, 28.28%] | 10.35% [9.36%, 11.43%] | 3.66% [3.07%, 4.35%] | 0.21% [0.10%, 0.43%] |
| fieldSpear | 3 | 3333 | 0.00% [0.00%, 0.12%] | 86.68% [85.48%, 87.79%] | 10.50% [9.51%, 11.59%] | 2.58% [2.09%, 3.18%] | 0.24% [0.12%, 0.47%] |
| fieldSpear | 6 | 3333 | 0.00% [0.00%, 0.12%] | 87.19% [86.01%, 88.28%] | 9.99% [9.02%, 11.06%] | 2.67% [2.18%, 3.27%] | 0.15% [0.06%, 0.35%] |
| fieldArmor | 2 | 3333 | 58.12% [56.43%, 59.78%] | 29.34% [27.82%, 30.91%] | 9.66% [8.70%, 10.71%] | 2.61% [2.12%, 3.21%] | 0.27% [0.14%, 0.51%] |
| fieldArmor | 3 | 3333 | 0.00% [0.00%, 0.12%] | 87.10% [85.92%, 88.19%] | 9.93% [8.96%, 10.99%] | 2.64% [2.15%, 3.24%] | 0.33% [0.18%, 0.59%] |
| fieldArmor | 6 | 3333 | 0.00% [0.00%, 0.12%] | 87.25% [86.07%, 88.34%] | 9.81% [8.85%, 10.87%] | 2.73% [2.23%, 3.34%] | 0.21% [0.10%, 0.43%] |
| ironShortSword | 5 | 3333 | 0.00% [0.00%, 0.12%] | 0.00% [0.00%, 0.12%] | 97.33% [96.73%, 97.82%] | 2.55% [2.07%, 3.14%] | 0.12% [0.05%, 0.31%] |
| ironShortSword | 6 | 3333 | 0.00% [0.00%, 0.12%] | 0.00% [0.00%, 0.12%] | 97.21% [96.59%, 97.72%] | 2.70% [2.20%, 3.31%] | 0.09% [0.03%, 0.26%] |

Observed samples align with the quality floors: starter at Smithing 1 had 59.90% Common (Wilson 95% CI 58.22–61.55%); starter at Smithing 3 had 0/3,334 Common (upper Wilson limit 0.12%) and 86.53% Uncommon (85.33–87.65%); the high recipe at Smithing 5 sampled 97.33% Rare. These are deterministic seeded profile results, not ordinary-player frequency estimates. The matched material arms recorded 0 rarity changes across all 19 material contrasts; see [material-bias projection](material-bias.json).

E's final engine/save/UI projection suite recorded 154/154 passing with build/typecheck evidence. No E browser run is claimed. Phase I now adds controlled generation measurements, but it does not change the need for J stress, Life Agent exploration, or deferred human validation.
