import json
import unittest
from pathlib import Path

BASE = Path(__file__).parent
ROW_METRICS = {
    "Living population": ("population",),
    "Living NPC / dead NPC": ("livingNPC", "deadNPC"),
    "Player gold": ("playerGold",),
    "Monster population": ("monsterPopulation",),
    "Goblin boss progress": ("goblinBossProgress",),
    "Event ring entries": ("eventRing",),
    "Major history entries": ("majorHistory",),
    "Pending journal": ("journalPending",),
    "Save bytes": ("saveBytes",),
    "Origin storage estimate bytes": ("originStorageEstimateBytes",),
    "CDP DOM nodes": ("cdpNodes",),
    "Actual JS listeners": ("actualJsListeners",),
    "JS used heap bytes": ("jsHeapUsedBytes",),
}

def cells(line):
    return [cell.strip() for cell in line.strip().strip("|").split("|")]

def endpoint_text(values, metric_names, endpoint):
    if len(metric_names) == 1:
        value = values[metric_names[0]][endpoint]
        return f"{value:,.2f}" if isinstance(value, float) else f"{value:,}"
    return " / ".join(str(values[name][endpoint]) for name in metric_names)

class PerformanceTableProjectionTests(unittest.TestCase):
    def test_all_rows_have_seven_cells_and_endpoints_match_verified_json(self):
        report = (BASE / "performance.md").read_text()
        table = report.split("## Checkpoint metrics", 1)[1].split("\n\nSettlement remained", 1)[0]
        lines = [line for line in table.splitlines() if line.startswith("|")]
        self.assertEqual(len(cells(lines[0])), 7)
        rows = {cells(line)[0]: cells(line) for line in lines[2:]}
        self.assertEqual(set(rows), set(ROW_METRICS))
        metrics = json.loads((BASE / "qa-summary.json").read_text())["gates"]["productionChromiumStress"]["metrics"]
        for label, metric_names in ROW_METRICS.items():
            row = rows[label]
            self.assertEqual(len(row), 7, label)
            self.assertEqual(row[5], endpoint_text(metrics, metric_names, "first"), label)
            self.assertEqual(row[6], endpoint_text(metrics, metric_names, "last"), label)
        self.assertEqual(rows["Player gold"][5:], ["45", "322"])
        self.assertEqual(rows["Event ring entries"][5:], ["1", "150"])
        self.assertEqual(rows["Origin storage estimate bytes"][5:], ["2,398", "794,592"])

if __name__ == "__main__":
    unittest.main()
