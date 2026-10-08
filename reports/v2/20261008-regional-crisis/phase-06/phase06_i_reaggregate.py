#!/usr/bin/env python3
"""Verify and reaggregate the Phase 6-I stratified resolver JSONL without rerunning it."""

from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys

PHASE_DIR = Path(__file__).resolve().parent
ROOT = PHASE_DIR.parents[3]
RUN_DIR = PHASE_DIR / 'i-runs' / 'phase6-i-10000'
RAW_PATH = RUN_DIR / 'resolutions.jsonl'
SUMMARY_PATH = RUN_DIR / 'resolution-summary.json'
MANIFEST_PATH = RUN_DIR / 'run-manifest.json'
OUTPUT_PATH = RUN_DIR / 'resolution-reanalysis.json'
OUTCOMES = ('decisive_success', 'costly_success', 'setback', 'local_defeat')


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def compact_hash(value: dict) -> str:
    body = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    return sha256_bytes(body)


def count_table(rows, key_fn):
    table = defaultdict(Counter)
    for row in rows:
        group, outcome = key_fn(row)
        table[str(group)][outcome] += 1
    return {group: {outcome: table[group][outcome] for outcome in OUTCOMES}
            for group in sorted(table)}


def main() -> None:
    raw_bytes = RAW_PATH.read_bytes()
    if not raw_bytes.endswith(b'\n'):
        raise ValueError('Raw JSONL ends with a partial record; preserving inputs and stopping.')
    manifest_bytes = MANIFEST_PATH.read_bytes()
    summary_bytes = SUMMARY_PATH.read_bytes()
    manifest = json.loads(manifest_bytes)
    original = json.loads(summary_bytes)
    rows = [json.loads(line) for line in raw_bytes.splitlines() if line]

    if manifest.get('mode') != 'full' or manifest.get('sampleCount') != 10_000:
        raise ValueError('Expected the released full 10,000-row run manifest.')
    seeds = manifest['seedCycle']
    profiles = manifest['profileCycle']
    if len(seeds) != 3 or len(profiles) != 10 or len(rows) != 10_000:
        raise ValueError(f'Unexpected run shape seeds={len(seeds)} profiles={len(profiles)} rows={len(rows)}')
    if original.get('count') != len(rows) or original.get('runId') != manifest.get('runId'):
        raise ValueError('Original projection and raw run manifest disagree.')

    index_counts = Counter()
    outcome_counts = Counter()
    profile_counts = Counter()
    schedule_outcomes = defaultdict(Counter)
    schedule_profiles = defaultdict(Counter)
    schedule_profile_outcomes = defaultdict(Counter)
    profile_outcomes = defaultdict(Counter)
    profile_preview_probability_totals = defaultdict(Counter)
    profile_canonical_probability_totals = defaultdict(Counter)
    profile_preview_success_totals = Counter()
    profile_canonical_success_totals = Counter()
    profile_success_delta_max = Counter()
    expected_probabilities = Counter()
    actions = defaultdict(Counter)
    no_player_recovery = 0
    actual_world_seeds = set()
    bounded_rows = 0
    preview_canonical_deltas = []

    for position, row in enumerate(rows):
        index = row.get('index')
        if index != position or index in index_counts:
            raise ValueError(f'Index sequence is incomplete, reordered, or duplicated at row {position}: {index}')
        index_counts[index] += 1
        schedule_group = seeds[index % len(seeds)]
        expected_world_seed = schedule_group + index
        if row.get('seed') != expected_world_seed:
            raise ValueError(f'worldSeed mismatch at index={index}: {row.get("seed")} != {expected_world_seed}')
        profile = profiles[index % len(profiles)]
        if row.get('profile') != profile:
            raise ValueError(f'profile schedule mismatch at index={index}: {row.get("profile")} != {profile}')
        outcome = row.get('outcome')
        if outcome not in OUTCOMES:
            raise ValueError(f'Unknown outcome at index={index}: {outcome}')
        if not all(row.get('saveChecks', {}).get(field) is True for field in
                   ('preResolutionRoundTrip', 'postResolutionRoundTrip', 'stateEqual')):
            raise ValueError(f'Save/reload evidence failed at index={index}')

        preview_probabilities = row.get('outcomeProbabilities', {})
        preview_success_chance = row.get('successChance')
        expected_preview_probabilities = {
            'decisive_success': .60 * preview_success_chance,
            'costly_success': .40 * preview_success_chance,
            'setback': .70 * (1 - preview_success_chance),
            'local_defeat': .30 * (1 - preview_success_chance),
        }
        if set(preview_probabilities) != set(OUTCOMES) or any(
                abs(preview_probabilities[name] - expected_preview_probabilities[name]) > 1e-12 for name in OUTCOMES):
            raise ValueError(f'Preview outcome probability mismatch at index={index}')
        resolution = row.get('resolutionSummary')
        if not isinstance(resolution, dict) or not isinstance(resolution.get('successChance'), (int, float)) \
                or not isinstance(resolution.get('applied'), dict) \
                or not isinstance(resolution.get('injuries'), list) \
                or not isinstance(resolution.get('recovery'), dict):
            raise ValueError(f'Missing canonical resolution summary at index={index}')
        canonical_success_chance = resolution['successChance']
        preview_canonical_deltas.append(canonical_success_chance - preview_success_chance)
        canonical_probabilities = {
            'decisive_success': .60 * canonical_success_chance,
            'costly_success': .40 * canonical_success_chance,
            'setback': .70 * (1 - canonical_success_chance),
            'local_defeat': .30 * (1 - canonical_success_chance),
        }
        roll = row.get('rngDraw')
        if not isinstance(roll, (int, float)) or not 0 <= roll < 1:
            raise ValueError(f'Missing deterministic resolver draw at index={index}')
        expected_outcome = ('decisive_success' if roll < .60 * canonical_success_chance else
                            'costly_success' if roll < canonical_success_chance else
                            'setback' if roll < canonical_success_chance + .70 * (1 - canonical_success_chance) else
                            'local_defeat')
        if outcome != expected_outcome:
            raise ValueError(f'Canonical outcome does not match saved resolver chance/draw at index={index}')
        if not isinstance(row.get('fixture'), dict) or not isinstance(row.get('actionLog'), list):
            raise ValueError(f'Missing actual fixture/action evidence at index={index}')

        outcome_counts[outcome] += 1
        profile_counts[profile] += 1
        schedule_outcomes[schedule_group][outcome] += 1
        schedule_profiles[schedule_group][profile] += 1
        schedule_profile_outcomes[(schedule_group, profile)][outcome] += 1
        profile_outcomes[profile][outcome] += 1
        profile_preview_success_totals[profile] += preview_success_chance
        profile_canonical_success_totals[profile] += canonical_success_chance
        profile_success_delta_max[profile] = max(profile_success_delta_max[profile],
                                                 abs(canonical_success_chance - preview_success_chance))
        for name, value in expected_preview_probabilities.items():
            profile_preview_probability_totals[profile][name] += value
        for name, value in canonical_probabilities.items():
            profile_canonical_probability_totals[profile][name] += value
            expected_probabilities[name] += value
        for action in row['actionLog']:
            actions[profile][action.split(' x')[0]] += 1
        actual_world_seeds.add(row['seed'])

        bounds = row['final']['lossBounds']
        final_metrics = row['final']
        for metric in ('monsterPopulation', 'food', 'safety', 'prosperity'):
            lower, upper = bounds[metric]
            if not lower <= final_metrics[metric] <= upper:
                raise ValueError(f'Bounded world metric escaped {metric} bounds at index={index}')
        bounded_rows += 1
        if profile == 'NoPlayer':
            if row['fixture']['playerAlive'] or row['fixture']['npcAlive'] != 0:
                raise ValueError(f'NoPlayer controlled extinction fixture mismatch at index={index}')
            if row.get('recoveryResult', {}).get('status') != 'granted' or row['saveChecks'].get('recoveryReloadEqual') is not True:
                raise ValueError(f'NoPlayer recovery/save continuation failed at index={index}')
            no_player_recovery += 1

    if len(index_counts) != 10_000 or sum(outcome_counts.values()) != 10_000:
        raise ValueError('Raw row indexes or canonical resolution counts do not total 10,000.')
    if any(profile_counts[name] != 1_000 for name in profiles):
        raise ValueError(f'Profile count mismatch: {dict(profile_counts)}')
    if dict(outcome_counts) != original.get('counts') or dict(profile_counts) != original.get('profiles'):
        raise ValueError('Original global outcome/profile totals differ from raw JSONL.')

    source_manifest = original['sourceManifest']
    source_root = ROOT / 'src'
    current_source = {path.relative_to(ROOT).as_posix(): sha256_file(path)
                      for path in sorted(source_root.rglob('*')) if path.is_file()}
    if current_source != source_manifest:
        raise ValueError('Current src tree differs from the frozen full-run source manifest.')
    source_fingerprint = compact_hash(current_source)
    if source_fingerprint != manifest['sourceFingerprint'] or source_fingerprint != original['sourceFingerprintPost']:
        raise ValueError('Frozen source fingerprint does not match the run evidence.')
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    if head != manifest['commit'] or head != original['commitPost']:
        raise ValueError('HEAD differs from the frozen full-run commit.')
    helper_hashes = manifest['helperHashes']
    for relpath, expected in helper_hashes.items():
        if sha256_file(ROOT / relpath) != expected:
            raise ValueError(f'Run helper changed since execution: {relpath}')
    summary_hash = sha256_bytes(summary_bytes)
    raw_hash = sha256_bytes(raw_bytes)
    manifest_hash = sha256_bytes(manifest_bytes)
    producer_hash = sha256_file(Path(__file__))

    schedule_counts = {str(seed): {outcome: schedule_outcomes[seed][outcome] for outcome in OUTCOMES}
                       for seed in seeds}
    profile_summary = {}
    for profile in profiles:
        count = profile_counts[profile]
        profile_summary[profile] = {
            'count': count,
            'outcomes': {outcome: profile_outcomes[profile][outcome] for outcome in OUTCOMES},
            'meanPreResolutionPreviewSuccessChance': profile_preview_success_totals[profile] / count,
            'meanCanonicalResolutionSuccessChance': profile_canonical_success_totals[profile] / count,
            'maximumPreviewVsCanonicalSuccessChanceDifference': profile_success_delta_max[profile],
            'meanPreResolutionPreviewProbabilities': {
                outcome: profile_preview_probability_totals[profile][outcome] / count for outcome in OUTCOMES
            },
            'meanCanonicalResolutionProbabilities': {
                outcome: profile_canonical_probability_totals[profile][outcome] / count for outcome in OUTCOMES
            },
            'recordedActions': dict(actions[profile]),
        }
    schedule_profile_summary = {
        f'{seed}|{profile}': {
            'count': sum(schedule_profile_outcomes[(seed, profile)].values()),
            'outcomes': {outcome: schedule_profile_outcomes[(seed, profile)][outcome] for outcome in OUTCOMES},
        }
        for seed in seeds for profile in profiles
    }

    report = {
        'schemaVersion': 1,
        'kind': 'Phase6-I post-run resolution reanalysis',
        'runId': manifest['runId'],
        'classification': 'stratified canonical resolver sweep; not iid Monte Carlo',
        'canonicalResolutionCount': len(rows),
        'profileCounts': dict(profile_counts),
        'outcomeCounts': {outcome: outcome_counts[outcome] for outcome in OUTCOMES},
        'expectedOutcomeCountsFromRecordedResolverProbabilities': {
            outcome: expected_probabilities[outcome] for outcome in OUTCOMES
        },
        'preResolutionPreviewVsCanonicalResolutionProbability': {
            'rowsCompared': len(preview_canonical_deltas),
            'rowsWithDifferentValues': sum(delta != 0 for delta in preview_canonical_deltas),
            'meanSignedCanonicalMinusPreview': sum(preview_canonical_deltas) / len(preview_canonical_deltas),
            'meanAbsoluteDifference': sum(abs(delta) for delta in preview_canonical_deltas) / len(preview_canonical_deltas),
            'maximumAbsoluteDifference': max(abs(delta) for delta in preview_canonical_deltas),
            'interpretation': 'The row-level successChance/outcomeProbabilities are captured before canonical time advance; resolutionSummary.successChance is the probability actually used by the resolver after daily simulation. Expected outcome totals above use the latter.',
        },
        'baseSeedScheduleGroups': {
            str(seed): {'indexRule': f'index % 3 = {offset}',
                        'sampleCount': sum(1 for index in index_counts if index % len(seeds) == offset),
                        'outcomes': schedule_counts[str(seed)]}
            for offset, seed in enumerate(seeds)
        },
        'profileResults': profile_summary,
        'baseSeedScheduleGroupByProfile': schedule_profile_summary,
        'actualWorldSeedInterpretation': {
            'actualWorldSeedsAreUniquePerResolution': len(actual_world_seeds) == len(rows),
            'rowFormula': 'actualWorldSeed = seedCycle[index % 3] + index',
            'warning': 'The three base seeds label the deterministic schedule groups; they are not three repeated world seeds for the 10,000 resolver rows.',
        },
        'rngDesign': {
            'startingRngStateRule': 'floor((index + 0.5) * 2^32 / sampleCount) >>> 0',
            'interpretation': 'Starting RNG states are stratified across the 32-bit range. Report observed frequencies and per-row resolver probabilities; do not claim iid sampling or binomial confidence intervals.',
        },
        'verification': {
            'contiguousUniqueIndexes': True,
            'worldSeedScheduleVerified': True,
            'profileScheduleVerified': True,
            'allRowsHaveFixtureAndActionLog': True,
            'allRowsHaveCanonicalResolutionSummaryAndSaveChecks': True,
            'allRowsWorldMetricsWithinRecordedBounds': bounded_rows == len(rows),
            'noPlayerExtinctionRecoveryAndReloadRows': no_player_recovery,
            'originalGlobalCountsMatchRawRows': True,
            'sourceFingerprintAndHEADStillMatch': True,
        },
        'controlledScenarioLimits': [
            'NoPlayer is a controlled player death plus empty-resident settlement fixture that measures Chief-present recovery. It is not evidence of normal-world autonomous survival.',
            'LifeOnly/Prepared NPC job assignments are controlled initial-state edits, not live life/job gameplay actions.',
            'Strong/Weak gear is produced by the real generateItem craft-context API with craft provenance, then contributed through the canonical equipment contribution action; the craft transaction itself is not simulated.',
            'ChiefOnly records the canonical NPC chief-defeat hook directly; it does not run a chief combat encounter.',
        ],
        'provenance': {
            'sourceCommit': head,
            'sourceFingerprint': source_fingerprint,
            'rawJsonlPath': str(RAW_PATH.relative_to(ROOT)),
            'rawJsonlSha256': raw_hash,
            'originalRunnerSummaryPath': str(SUMMARY_PATH.relative_to(ROOT)),
            'originalRunnerSummarySha256': summary_hash,
            'runManifestSha256': manifest_hash,
            'originalRunnerSha256': helper_hashes['reports/v2/20261008-regional-crisis/phase-06/phase06_i_simulation.test.ts'],
            'reanalysisProducerPath': str(Path(__file__).resolve().relative_to(ROOT)),
            'reanalysisProducerSha256': producer_hash,
            'sourceManifestSha256': compact_hash(source_manifest),
            'originalSummaryPreservedUnchanged': True,
            'rawJsonlPreservedUnchanged': True,
        },
        'reanalysisCompletedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'),
    }

    sys.path.insert(0, str(ROOT))
    from scripts.recorded_reports import write_recorded
    body = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    write_recorded(OUTPUT_PATH, body, producer='g6-luna-med-phase6-simulation-engineer-reanalysis')
    print(json.dumps({'reportPath': str(OUTPUT_PATH.relative_to(ROOT)), 'reportSha256': sha256_file(OUTPUT_PATH),
                      'rows': len(rows), 'outcomes': report['outcomeCounts'],
                      'baseSeedScheduleGroups': schedule_counts, 'rawJsonlSha256': raw_hash,
                      'originalSummarySha256': summary_hash, 'producerSha256': producer_hash}, indent=2))


if __name__ == '__main__':
    main()
