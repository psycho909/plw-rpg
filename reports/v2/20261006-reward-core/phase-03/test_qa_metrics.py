import json
import unittest
from pathlib import Path

from qa_metrics import production_metric_series, summarize


class ChronologicalEndpointTests(unittest.TestCase):
    def test_first_and_last_keep_input_order_while_distribution_is_sorted(self):
        result = summarize([12, 1.02, 2.55])
        self.assertEqual(result["first"], 12)
        self.assertEqual(result["last"], 2.55)
        self.assertEqual(result["min"], 1.02)
        self.assertEqual(result["max"], 12)
        self.assertEqual(result["p50"], 2.55)
        self.assertEqual(result["p95NearestRank"], 12)

    def test_all_production_metric_projection_matches_raw_order_and_saved_distribution(self):
        base = Path(__file__).parent
        raw = json.loads((base / "stress-browser.json").read_text())
        qa = json.loads((base / "qa-summary.json").read_text())
        metrics = qa["gates"]["productionChromiumStress"]["metrics"]
        series = production_metric_series(
            raw["checkpoints"],
            raw["checkpoints"][-1]["saveLatencyMs"],
            raw["uiResponsivenessMs"],
        )
        self.assertEqual(set(metrics) - set(series), {"settlementGold", "settlementStages", "automationClickResponseCount"})
        self.assertEqual(metrics["automationClickResponseCount"], len(raw["uiResponsivenessMs"]))
        for name, values in series.items():
            projected = summarize(values)
            for field in ("n", "min", "p50", "p95NearestRank", "max", "first", "last"):
                self.assertEqual(projected[field], metrics[name][field], f"{name}.{field}")
        self.assertEqual(metrics["monsterPopulation"]["first"], 12)
        self.assertEqual(metrics["monsterPopulation"]["last"], 2.5499999999999994)
        self.assertEqual(metrics["cdpNodes"]["last"], 2786)
        self.assertEqual(metrics["jsHeapUsedBytes"]["last"], 18189164)


if __name__ == "__main__":
    unittest.main()
