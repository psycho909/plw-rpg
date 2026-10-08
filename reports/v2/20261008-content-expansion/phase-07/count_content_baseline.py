#!/usr/bin/env python3
"""Mechanical AST-backed source inventory for Phase 7-A. Run from repository root."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from scripts.recorded_reports import write_recorded


PHASE = Path('reports/v2/20261008-content-expansion/phase-07')
AST_HELPER = PHASE / 'ts_registry_counter.mjs'


def ast_inventory(requests):
    process = subprocess.run(
        ['node', str(AST_HELPER)], input=json.dumps(requests), text=True,
        capture_output=True, check=True,
    )
    return json.loads(process.stdout)


registries = {
    'item_bases': ('src/data/rewards.ts', 'ITEM_BASES'),
    'affixes': ('src/data/rewards.ts', 'AFFIXES'),
    'rarities': ('src/data/rewards.ts', 'RARITIES'),
    'materials': ('src/data/rewards.ts', 'MATERIALS'),
    'monster_families': ('src/data/rewards.ts', 'MONSTER_FAMILIES'),
    'v2_monster_definitions': ('src/data/rewards.ts', 'WOLF_MONSTERS'),
    'monster_traits': ('src/data/rewards.ts', 'MONSTER_TRAITS'),
    'boss_variants': ('src/data/rewards.ts', 'BOSS_VARIANTS'),
    'loot_tables': ('src/data/rewards.ts', 'LOOT_TABLES'),
    'crafting_recipes': ('src/data/crafting.ts', 'CRAFTING_RECIPES'),
    'legacy_monsters': ('src/data/config.ts', 'MONSTERS'),
    'legacy_item_kinds': ('src/data/config.ts', 'ITEMS'),
    'living_arcs': ('src/data/livingEvents.ts', 'LIVING_ARCS'),
    'medium_living_events': ('src/data/livingEvents.ts', 'MEDIUM_LIVING_EVENTS'),
}

# Same-line and multiline object properties must enumerate identically. The
# wrappers mirror the `as const` / `satisfies` shapes in the source registries.
fixture = '''
const SAME_LINE = { first: { id: 'first' }, second: { id: 'second' } } as const
const MULTI_LINE = {
  first: { id: 'first' },
  second: { id: 'second' },
} satisfies Record<string, object>
'''
fixture_result = ast_inventory([{
    'operation': 'fixture', 'sourceText': fixture,
    'names': ['SAME_LINE', 'MULTI_LINE'],
}])[0]
if fixture_result != {'SAME_LINE': ['first', 'second'], 'MULTI_LINE': ['first', 'second']}:
    raise SystemExit(f'AST enumeration regression fixture failed: {fixture_result!r}')

requests = [
    {'operation': 'objectKeys', 'file': file, 'name': name}
    for file, name in registries.values()
]
requests.extend([
    {'operation': 'arrayFieldValues', 'file': 'src/data/livingEvents.ts',
     'name': 'RARE_TRAVELERS', 'field': 'kind'},
    {'operation': 'arrayFieldValues', 'file': 'src/data/livingEvents.ts',
     'name': 'MINOR_LIVING_EVENTS', 'field': 'id'},
    {'operation': 'objectFieldValues', 'file': 'src/data/rewards.ts',
     'name': 'WOLF_MONSTERS', 'field': 'rank'},
    {'operation': 'objectFieldValues', 'file': 'src/data/config.ts',
     'name': 'MONSTERS', 'field': 'boss'},
])
values = ast_inventory(requests)
keys = dict(zip(registries.keys(), values[:len(registries)]))
keys['rare_travelers'] = values[len(registries)]
keys['minor_living_events'] = values[len(registries) + 1]
rank_values = values[len(registries) + 2]
legacy_boss_values = values[len(registries) + 3]
keys['crop_definitions'] = ['wheat']  # CROP in config.ts; actual planting is hardcoded wheat.

rank_counts = {}
for rank in rank_values:
    rank_counts[rank] = rank_counts.get(rank, 0) + 1
legacy_boss_counts = {}
for is_boss in legacy_boss_values:
    rank = 'boss' if is_boss == 'true' else 'normal'
    legacy_boss_counts[rank] = legacy_boss_counts.get(rank, 0) + 1

source_files = sorted(subprocess.check_output(['git', 'ls-files', 'src'], text=True).splitlines())
source_hashes = {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in source_files}
result = {
    'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'tracked_source_file_count': len(source_files),
    'source_fingerprint_algorithm': 'SHA256 over compact sorted-key JSON mapping sorted tracked src paths to individual SHA256 hex digests',
    'source_fingerprint': hashlib.sha256(json.dumps(source_hashes, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
    'source_file_sha256': source_hashes,
    'counting_algorithm': 'TypeScript 5 compiler AST static property enumeration; unwrap parentheses, type assertions, as, satisfies, and non-null expressions. Object property order is retained; source formatting is irrelevant.',
    'counter_regression_fixture': 'Inline TypeScript fixture checks same-line and multiline object registries enumerate the same two keys.',
    'counts': {label: len(ids) for label, ids in keys.items()},
    'ids': keys,
    'v2_monsters_by_rank': rank_counts,
    'legacy_monsters_by_boss_flag': legacy_boss_counts,
    'counting_rules': {
        'unique_monsters': 'WOLF_MONSTERS definitions only; legacy config definitions separately disclosed; variants, traits, ranks-as-instances and procedural rolls excluded',
        'items': 'ITEM_BASES counts definitions; legacy ITEMS are kinds and shown separately; rarity, affixes and ItemInstance rolls excluded',
        'crops': 'one wheat definition; planted crop records are instances',
        'world_content': 'living arcs, travelers, minor and medium event definitions counted separately; event trigger mechanics are not definitions',
    },
}
baseline_json = PHASE / 'content-baseline.json'
baseline_md = PHASE / 'content-baseline.md'
baseline_json_text = json.dumps(result, ensure_ascii=False, indent=2) + '\n'

rank_note = ', '.join(f'{rank} {count}' for rank, count in rank_counts.items())
legacy_note = ', '.join(f'{rank} {count}' for rank, count in legacy_boss_counts.items())
rows = [
    ('V2 monster definitions', len(keys['v2_monster_definitions']), ', '.join(keys['v2_monster_definitions'])),
    ('V2 ranks', sum(rank_counts.values()), rank_note),
    ('Legacy monster definitions', len(keys['legacy_monsters']), ', '.join(keys['legacy_monsters']) + f'; {legacy_note} by legacy flag'),
    ('Monster families', len(keys['monster_families']), ', '.join(keys['monster_families'])),
    ('Monster traits', len(keys['monster_traits']), ', '.join(keys['monster_traits'])),
    ('Boss variants', len(keys['boss_variants']), ', '.join(keys['boss_variants']) + '; excluded from monster totals'),
    ('Item base definitions', len(keys['item_bases']), ', '.join(keys['item_bases'])),
    ('Legacy item kinds', len(keys['legacy_item_kinds']), ', '.join(keys['legacy_item_kinds']) + '; excluded from V2 base items'),
    ('Materials', len(keys['materials']), ', '.join(keys['materials'])),
    ('Recipes', len(keys['crafting_recipes']), ', '.join(keys['crafting_recipes'])),
    ('Affixes', len(keys['affixes']), ', '.join(keys['affixes'])),
    ('Rarities', len(keys['rarities']), ', '.join(keys['rarities'])),
    ('Crop definitions', len(keys['crop_definitions']), 'wheat; active crop rows are instances'),
    ('Living arcs', len(keys['living_arcs']), ', '.join(keys['living_arcs'])),
    ('Rare traveler definitions', len(keys['rare_travelers']), ', '.join(keys['rare_travelers'])),
    ('Minor living events', len(keys['minor_living_events']), ', '.join(keys['minor_living_events'])),
    ('Medium living events', len(keys['medium_living_events']), ', '.join(keys['medium_living_events'])),
    ('Loot tables', len(keys['loot_tables']), ', '.join(keys['loot_tables'])),
]
table = '\n'.join(f'| {name} | {count} | {note} |' for name, count, note in rows)
text = f'''# Phase 7-A Content Baseline

Date: 2026-10-08 UTC  
Repository: `plw-rpg`  
HEAD: `{result['head']}`  
Tracked `src/` files: {len(source_files)}  
Sorted source fingerprint: `{result['source_fingerprint']}`

The fingerprint is SHA-256 of compact sorted-key JSON mapping every Git-tracked `src/` path to that file's SHA-256. Per-file hashes, exact IDs, and the AST counting algorithm are in [content-baseline.json](content-baseline.json); rerun from repository root with `python3 reports/v2/20261008-content-expansion/phase-07/count_content_baseline.py`. The counter uses the installed TypeScript compiler AST and unwraps parentheses, type assertions, `as`, `satisfies`, and non-null wrappers before enumerating static object properties. An inline regression fixture checks same-line and multiline registry objects.

## Current inventory

| Content | Count | IDs / note |
| --- | ---: | --- |
{table}

Counts distinguish definitions from runtime instances and generated variants. Legacy monster definitions are reported separately because the V2 `MonsterDefinition` registry/schema does not include them. Procedurally generated item instances, rarity rolls, affixes, boss variants, traits, and planted crop rows do not increase the definition counts. The code does not expose one unified registry spanning the legacy and V2 paths.

## Registry and trigger map

- `src/data/rewards.ts`: V2 item bases, affixes, rarity table, materials, family, five wolf monster definitions, monster traits, boss variants, loot table, wolf loot profiles and encounter tuning.
- `src/domain/reward.ts`: closed ID unions and schemas. Monster family/loot/rank IDs are currently wolf-only; monster roles are fast/bruiser/controller and cores bite/howl/moonCharge.
- `src/data/crafting.ts`, `src/engine/crafting.ts`: four recipe definitions and transaction-backed crafting; inputs currently draw on legacy inventory wood/stone/iron and wolf materials, outputs are procedural item bases.
- `src/engine/itemGeneration.ts`, `src/engine/gearStats.ts`, `src/engine/rewardActions.ts`: deterministic gear/material generation, award paths and use-facing operations.
- `src/data/config.ts`, `src/engine/actions.ts`, `src/engine/simulation.ts`: legacy monster/item kinds and equipment; one hard-coded wheat crop, two-day growth, fixed yield, four plots.
- `src/data/livingEvents.ts`, `src/engine/livingEvents.ts`: 3 life arcs, 3 rare traveler rows, 2 minor events, 1 medium event plus event weighting/cooldowns and state gates.
- `src/engine/regionalCrisis.ts`, `src/domain/crisis.ts`, `src/engine/crisisContributions.ts`, `src/engine/civilDefense.ts`: one Goblin regional crisis path. Trigger eligibility currently requires no active crisis, elapsed cooldown, monster population ≥30, camp level ≥2, and at least one of safety ≤80, food ≤55, or a live boss; eligible daily checks use seeded RNG. Crisis/player/NPC hooks are not a general content trigger registry.
- Automated content-specific validator: none found in tracked scripts/source. Existing validation is type-level/registry typing and runtime save/item validation, not whole-content reference, reachability, duplicate-like, localization, or usability QA. Phase 7-B owns this work.
- Existing QA inventory includes Vitest suites for rewards, item generation, crafting, wolf family, living events, crisis and save; `npm test` and `npm run build` are package-level entry points. No product tests were rerun for this counter repair; recorded Phase 7-A regression evidence remains 531/531 tests, typecheck, and production build passing.

## Existing use paths

`wolfFang` and `moonStone` bias spear/short-sword crafting toward bleeding, penetration and keen affixes; moon stone also raises legendary weapon special chance. `wolfHide` biases armor toward sturdy/blocking. Wolf drops supply the wolf family material path and wolf king guarantees moon stone; family encounters are forest scoped with a seven-day boss cooldown. Crafted outputs use normal generated gear instances and save/provenance support. Legacy `wood`, `stone`, and `iron` feed recipes; wheat harvest produces food used by ordinary life and crisis supply contributions. Regional crisis currently recognizes existing goblin threat/boss and contribution hooks, not arbitrary new families or materials.

## Constraints inherited from completed phases

- Phase 0–3 and formal Reward & Retention contract establish seeded RNG, single generation authority, stable item instance IDs, family-specific rewards and controlled monster variation. Do not count procedural traits/variants as base content or introduce `Math.random()`.
- Phase 4 treats meaningful next-adventure choice as the reward contract; a sell price alone is not enough to claim an item meaningfully useful. Procedural gear uses rarity for affix access rather than a raw stat multiplier.
- Phase 5 owns the narrow crafting/life slice: recipes must remain transaction-backed and material influence purposeful; no full alchemy or new profession expansion is licensed by the baseline.
- Phase 6 final engineering result is `PASS WITH FINDINGS`, not a human fun/retention claim. Keep the Goblin crisis canonical lifecycle and existing player/NPC contribution, consequences, bounded history, save/reload and succession behavior. Do not turn the existing narrow recovery safety valve or measured performance envelope into broader guarantees.
- Phase 6 findings retained: recovery safety valve only covers zero population at resolution with living Chief; early life support can lack an actionable goal when resources/gear are unavailable; policy wait actions were frequent in agent play; terminal DOM/listener sample differed from prior checkpoint without confirmed leak; measured history/save/browser costs are evidence for the tested setup, not universal guarantees. Human validation remains `DEFERRED / NOT APPLICABLE AT THIS STAGE`.
- Phase 7 hard gates are ≥50 genuinely distinct monster definitions and ≥100 useful item definitions; one-item/one-monster batch additions must connect normal discovery to loot, use/crafting/life and the world. Existing duplicate/placeholder definitions cannot count toward new targets. Crop target is advisory (10–15 total) and requires different gameplay use.

## Baseline limits

These counts are exact for current tracked registries at the fingerprinted source. They are not a content-quality, spawn-reachability, combat-balance, economy, browser, long-world, or human product verdict. Legacy and V2 paths overlap conceptually (notably gray wolf) but are separate code representations; future acceptance must define whether migration/reuse avoids double counting. The crop is hard-coded rather than a multi-definition registry. Trigger reachability and dead content require the Phase 7 validator and runtime evidence.
'''
write_recorded(baseline_json, baseline_json_text, producer='phase7a-content-baseline-counter')
write_recorded(baseline_md, text, producer='phase7a-content-baseline-counter')
print(json.dumps(result['counts'], ensure_ascii=False, indent=2))
print(result['source_fingerprint'])
