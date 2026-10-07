"""Pure contract tests for final-runtime-driver report validation."""
from __future__ import annotations

import importlib.util
from itertools import product
from pathlib import Path
import unittest


DRIVER_PATH = Path(__file__).with_name("final-runtime-driver.py")
SPEC = importlib.util.spec_from_file_location("phase4_final_runtime_driver", DRIVER_PATH)
assert SPEC is not None and SPEC.loader is not None
driver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(driver)


def valid_reports(seed_count: int = 1, total_awards: int = 1000):
    seeds = [17, 42, 77, 909, 2026, 2027, 8191, 9981][:seed_count]
    per_rank = total_awards // len(driver.SIMULATION_RANKS)
    gear_by_rank = {"grayWolf": per_rank * 65 // 100, "scarredWolf": per_rank * 65 // 100,
                    "alphaWolf": per_rank, "packLeader": per_rank, "wolfKing": per_rank}
    rank_name = {"grayWolf": "normal", "scarredWolf": "normal", "alphaWolf": "elite",
                 "packLeader": "miniBoss", "wolfKing": "boss"}
    loot = {
        "totalAwards": total_awards,
        "awardsPerRank": per_rank,
        "cohorts": {
            rank: {"awards": per_rank, "rank": rank_name[rank], "gearDrops": gear_by_rank[rank],
                   "noGearAwards": per_rank - gear_by_rank[rank],
                   "bossExclusiveBase": gear_by_rank[rank] if rank == "wolfKing" else 0}
            for rank in driver.SIMULATION_RANKS
        },
        "sourceSha256": {"src/example.ts": "source-hash"},
        "sourceFingerprint": "source-fingerprint",
        "sourceCommit": "source-commit",
        "harnessSha256": "loot-harness",
    }
    targets = [
        {"id": target, **({"fixture": fixture} if fixture != "public-natural" else {}),
         **({"variant": variant} if variant else {})}
        for target, fixture, variant in driver.SIMULATION_TARGETS
    ]
    rows = []
    for seed, band, build, target, policy in product(
            seeds, driver.SIMULATION_POWERBANDS, driver.SIMULATION_BUILDS,
            driver.SIMULATION_TARGETS, driver.SIMULATION_POLICIES):
        target_id, target_fixture, target_variant = target
        rows.append({"seed": seed, "powerband": band, "build": build, "policy": policy,
                     "target": target_id, "targetFixture": target_fixture, "variant": target_variant})
    combat = {
        "seeds": seeds,
        "rows": rows,
        "builds": list(driver.SIMULATION_BUILDS),
        "powerbands": {band: band for band in driver.SIMULATION_POWERBANDS},
        "targets": targets,
        "policies": list(driver.SIMULATION_POLICIES),
        "metricRows": len(rows),
        "repeatedFightPairs": len(rows),
        "actualFightRuns": len(rows) * 2,
        "sourceSha256": {"src/example.ts": "source-hash"},
        "sourceFingerprint": "source-fingerprint",
        "sourceCommit": "source-commit",
        "harnessSha256": "combat-harness",
    }
    phase = {"sourceSha256After": {"src/example.ts": "source-hash"},
             "sourceFingerprintAfter": "source-fingerprint", "headAfter": "source-commit",
             "harnessSha256After": {
                 "reports/v2/20261006-reward-core/phase-04/loot_monte_carlo.test.ts": "loot-harness",
                 "reports/v2/20261006-reward-core/phase-04/combat_simulation.test.ts": "combat-harness",
             }}
    return loot, combat, phase


class FinalRuntimeValidationTests(unittest.TestCase):
    def test_valid_sanity_and_final_cartesian_matrices_pass(self):
        for awards, seeds in ((1000, 1), (100000, 8)):
            loot, combat, phase = valid_reports(seeds, awards)
            result = driver.validate_simulation_report_data("sanity" if seeds == 1 else "final", loot, combat,
                                                            awards, seeds, phase)
            self.assertEqual(result["expectedRows"], 540 * seeds)
            self.assertEqual(result["expectedActualFightRuns"], 1080 * seeds)

    def test_truncated_combat_matrix_is_rejected(self):
        loot, combat, phase = valid_reports()
        combat["rows"].pop()
        combat["metricRows"] -= 1
        combat["repeatedFightPairs"] -= 1
        combat["actualFightRuns"] -= 2
        with self.assertRaisesRegex(RuntimeError, "truncated/oversized"):
            driver.validate_simulation_report_data("sanity", loot, combat, 1000, 1, phase)

    def test_wrong_rank_award_denominator_is_rejected(self):
        loot, combat, phase = valid_reports()
        loot["cohorts"]["scarredWolf"]["awards"] -= 1
        with self.assertRaisesRegex(RuntimeError, "scarredWolf cohort denominator"):
            driver.validate_simulation_report_data("sanity", loot, combat, 1000, 1, phase)

    def test_duplicate_scenario_tuple_is_rejected(self):
        loot, combat, phase = valid_reports()
        combat["rows"][-1] = dict(combat["rows"][0])
        with self.assertRaisesRegex(RuntimeError, "duplicate scenario keys"):
            driver.validate_simulation_report_data("sanity", loot, combat, 1000, 1, phase)

    def test_empty_or_missing_required_browser_checks_are_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "no checks"):
            driver.validate_targeted_browser_checks([])
        checks = [{"name": name} for name in driver.TARGETED_BROWSER_REQUIRED_CHECKS]
        with self.assertRaisesRegex(RuntimeError, "missing required check groups"):
            driver.validate_targeted_browser_checks(checks)

    def test_required_browser_checks_pass_with_additional_regressions(self):
        checks = [{"name": name} for name in driver.TARGETED_BROWSER_REQUIRED_CHECKS]
        checks.extend([{"name": "single modal: inventory"}, {"name": "responsive browser viewport", "width": 1200},
                       {"name": "new approved regression"}])
        result = driver.validate_targeted_browser_checks(checks)
        self.assertEqual(result["checkCount"], len(checks))
        self.assertEqual(result["status"], "PASS")


if __name__ == "__main__":
    unittest.main()
