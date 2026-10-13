# Phase 7-F — Fog Undead and Mine Constructs Authoring

Status: authored; central validation pending.

Scope was limited to `src/data/content/fogUndead.ts`, `src/data/content/mineConstructs.ts`, and this report. Each family now has 8 equipment bases and 4 recipes, with 6 weapons / 2 armor and 2 weapon / 2 armor recipes. Existing monsters, monster IDs/stats/mechanics/spawns, Boss forms/rules, and all 8 material entries per family were retained.

## Fog Undead

Added equipment IDs:

- `fog_undead_boneknife` — recipe output using normal `fog_undead_wax` and `fog_undead_bone` drops.
- `fog_undead_bellstaff` — `fog_undead_loot_lantern`.
- `fog_undead_cinderpike` — `fog_undead_loot_wight`.
- `fog_undead_wightcleaver` — `fog_undead_loot_crypt_knight`.
- `fog_undead_shroudcoat` — recipe output using `fog_undead_shroud` and normal-monster `fog_undead_bellmetal` drops.

Added recipes: `fog_undead_boneknife_recipe` (weapon) and `fog_undead_shroudcoat_recipe` (armor). Existing `fog_undead_cryptlord_blade` remains Boss-exclusive and appears only in the cryptlord table. Equipment sources use the existing monsters' positive equipment chances.

## Mine Constructs

Added equipment IDs:

- `mine_construct_jointblade` — recipe output using `mine_construct_resonant_stone` and `mine_construct_ironvein`.
- `mine_construct_ramhammer` — `mine_construct_loot_ram`.
- `mine_construct_veinaxe` — `mine_construct_loot_veinwatcher`.
- `mine_construct_architect_glaive` — `mine_construct_loot_architect`.
- `mine_construct_bindingmail` — recipe output using `mine_construct_ironvein` and `mine_construct_binding`.

Added recipes: `mine_construct_jointblade_recipe` (weapon) and `mine_construct_bindingmail_recipe` (armor). Existing `mine_construct_heartbreaker` remains Boss-exclusive and appears only in the heart table. Equipment sources use the existing monsters' positive equipment chances.

## File hashes

SHA-256 after authoring:

- `src/data/content/fogUndead.ts`: `376bd753098d93a9f78806b936f24faf5b7ba3fb524a9d3693e01de2e33ab6a6`
- `src/data/content/mineConstructs.ts`: `0ffe5ed200306709e77bb69c89a3c0387277560c7aad5c8648abdccf37f75400`

No tests or broad validation were run by this author. The central runner owns validation after the content freeze.
