"""Pre-fix reproducer: storage-only reload checks miss a changed loaded runtime."""
import json
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from qa_browser_support import core_save_differences

baseline = {"worldSeed": 12, "rngState": 34, "worldTime": 56,
            "npcs": [{"id": "npc-1", "mood": "calm"}]}
persisted_at_load = json.loads(json.dumps(baseline))
runtime_after_reload_and_legal_ui_save = json.loads(json.dumps(baseline))
runtime_after_reload_and_legal_ui_save["worldTime"] += 7
runtime_after_reload_and_legal_ui_save["npcs"][0]["mood"] = "hostile"

# This is the old assertion: it passes because storage itself did not change.
assert core_save_differences(baseline, persisted_at_load) == {}
# The behavior we require fails under the old implementation: the post-load
# runtime save differs, yet there was no comparison against it.
assert core_save_differences(baseline, runtime_after_reload_and_legal_ui_save) != {}
print("RED: storage-only check passes while the post-load runtime payload differs")
