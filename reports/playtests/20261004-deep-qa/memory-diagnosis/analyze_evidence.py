"""Read-only heap analysis and source provenance; publishes diagnosis evidence."""
from collections import deque
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import sys
OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

def analyse(path):
    raw = path.read_bytes()
    data = json.loads(raw)
    meta, nodes, edges, strings = data["snapshot"]["meta"], data["nodes"], data["edges"], data["strings"]
    nf, ef = meta["node_fields"], meta["edge_fields"]
    nw, ew = len(nf), len(ef)
    nt, et = meta["node_types"][nf.index("type")], meta["edge_types"][ef.index("type")]
    node_count = len(nodes) // nw
    starts = [0]
    for index in range(node_count):
        starts.append(starts[-1] + nodes[index * nw + nf.index("edge_count")] * ew)
    def node(index):
        start = index * nw
        return {"index": index, "type": nt[nodes[start + nf.index("type")]],
                "name": strings[nodes[start + nf.index("name")]],
                "id": nodes[start + nf.index("id")],
                "detachedness": nodes[start + nf.index("detachedness")]}
    def edge(offset):
        type_name = et[edges[offset + ef.index("type")]]
        name_index = edges[offset + ef.index("name_or_index")]
        return {"type": type_name, "name": str(name_index) if type_name in ("hidden", "element") else strings[name_index]}
    targets = [index for index in range(node_count)
               if nt[nodes[index * nw + nf.index("type")]] == "native"
               and strings[nodes[index * nw + nf.index("name")]].startswith("<dialog")]
    parents = {0: None}
    queue = deque([0])
    while queue:
        index = queue.popleft()
        for offset in range(starts[index], starts[index + 1], ew):
            if et[edges[offset + ef.index("type")]] == "weak":
                continue
            target = edges[offset + ef.index("to_node")] // nw
            if target not in parents:
                parents[target] = (index, offset)
                queue.append(target)
    target_paths = []
    for target in targets:
        steps, index = [], target
        while parents.get(index) is not None:
            previous, offset = parents[index]
            steps.append({"from": node(previous), "edge": edge(offset), "to": node(index)})
            index = previous
        target_paths.append({"target": node(target), "reachableFromSnapshotRoot": target in parents,
                             "shortestNonWeakPath": list(reversed(steps))})
    return {"file": path.name, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(),
            "snapshotNodeCount": node_count, "nativeDialogCount": len(targets),
            "detachedNativeDialogCount": sum(node(i)["detachedness"] == 2 for i in targets),
            "dialogs": target_paths}

heap = {"status": "completed_analysis", "at": datetime.now(timezone.utc).isoformat(),
        "method": "Breadth-first traversal from snapshot node 0, excluding edge type weak; preserve node IDs, detachedness, exact edge names and full shortest paths. No dominator/retained-size inference. DevTools console is a literal snapshot edge label, not evidence of console.log calls.",
        "snapshots": [analyse(p) for p in sorted(OUT.glob("*.heapsnapshot"))]}
entry = write_recorded(OUT / "retaining-paths.json", json.dumps(heap, ensure_ascii=False, indent=2) + "\n", producer="astra-memory-finish-analysis")

package = Path(importlib.metadata.distribution("playwright").locate_file("playwright"))
source_specs = [
    ("_impl/_locator.py", [(742, 751)]),
    ("_impl/_frame.py", [(386, 400)]),
    ("_impl/_js_handle.py", [(113, 122)]),
    ("_impl/_connection.py", [(180, 217)]),
    ("driver/package/lib/coreBundle.js", [(23192, 23231), (54398, 54400), (58231, 58236)]),
]
sources = []
for relative, ranges in source_specs:
    p = package / relative
    text = p.read_text()
    lines = text.splitlines()
    sources.append({"path": str(p), "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
                    "excerpts": [{"startLine": start, "endLine": end, "text": "\n".join(lines[start - 1:end])} for start, end in ranges]})
source_evidence = {"status": "completed_read_only_inspection", "at": datetime.now(timezone.utc).isoformat(),
                   "pythonPlaywrightVersion": importlib.metadata.version("playwright"),
                   "driverVersion": json.loads((package / "driver/package/package.json").read_text())["version"],
                   "finding": "Installed Python Locator.wait_for awaits Frame.wait_for_selector and discards its Optional[ElementHandle] return without disposal or omitReturnValue. Server returns/adopts the node unless omitReturnValue is requested. The installed JavaScript Locator.waitFor explicitly sends omitReturnValue:true. ChannelOwner registration retains protocol objects until disposal/context destruction.",
                   "scope": "These are exact files in this environment; no claim about every Playwright version or an upstream release history. No installed runtime package was edited.",
                   "notExecuted": ["Public page.wait_for_selector followed by explicit handle.dispose control", "Protocol trace mapping every handle to its release", "Dependency upgrade or monkeypatch"],
                   "sources": sources}
write_recorded(OUT / "playwright-source-evidence.json", json.dumps(source_evidence, ensure_ascii=False, indent=2) + "\n", producer="astra-memory-finish-source-inspection")

follow = json.loads((OUT / "followup-probe.json").read_text())
retainer = json.loads((OUT / "retainer-probe.json").read_text())
cases = {c["name"]: c for c in follow["cases"]}
snapshots = {c["file"]: c for c in heap["snapshots"]}
checks = {
    "followupCompleted": follow["status"] == "completed_observation",
    "allSixFollowupCasesExecuted": len(cases) == 6 and all(c["checkedOpenCycles"] == c["checkedClosedCycles"] == c["cycles"] for c in cases.values()),
    "finalBuildMatches": follow["actualBuildHashes"] == follow["expectedBuildHashes"] == retainer["actualBuildHashes"],
    "mapNoSelectorsExactDOMBaseline": all(v == 0 for v in cases["map-keyboard-no-selectors"]["deltasAfterGC"].values()),
    "mapWaitControlReproducesRetention": cases["map-keyboard-both-waits"]["deltasAfterGC"]["nodes"] == 79920,
    "nativeNoSelectorsExactDOMBaseline": all(v == 0 for v in cases["native-dialog-no-selectors"]["deltasAfterGC"].values()),
    "nativeNoSelectorSnapshotHasNoDialogs": snapshots["native-dialog-no-selectors.heapsnapshot"]["nativeDialogCount"] == 0,
    "nativeVisibleWaitSnapshotHas20DetachedDialogs": snapshots["native-dialog-visible-wait.heapsnapshot"]["detachedNativeDialogCount"] == 20,
    "mapVisibleWaitSnapshotHas4DetachedDialogs": snapshots["map-retainer-before.heapsnapshot"]["detachedNativeDialogCount"] == 4,
    "everyRetainedDialogHasDirectDevToolsGlobalHandleRoot": all(any(s["from"]["name"] == "(Global handles)" and "DevTools console" in s["edge"]["name"] and s["to"]["id"] == d["target"]["id"] for s in d["shortestNonWeakPath"]) for snapshot in heap["snapshots"] for d in snapshot["dialogs"]),
    "retainerAllThreeCasesCompleted": retainer["status"] == "completed_observation" and len(retainer["cases"]) == 3 and all(c["status"] == "completed_observation" for c in retainer["cases"]),
    "noConsoleOrExceptionEventsInRetainerControls": all(not c["consoleEvents"] and not c["exceptionEvents"] for c in retainer["cases"]),
    "additionalCDPConsoleDiscardDidNotReleaseDialogs": all(c["samples"][-1]["dom"] == c["samples"][1]["dom"] for c in retainer["cases"]),
    "noFollowupPageErrors": not follow["pageErrors"],
}
result = {"status": "passed_evidence_consistency" if all(checks.values()) else "failed_evidence_consistency",
          "at": datetime.now(timezone.utc).isoformat(), "checks": checks,
          "scope": "Checks recorded observations and snapshot/source consistency; not product regression coverage or a completed two-hour soak.",
          "harnessSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
write_recorded(OUT / "evidence-checks.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="astra-memory-finish-analysis")
assert all(checks.values()), checks
print(json.dumps({"status": result["status"], "checksPassed": sum(checks.values()), "checksTotal": len(checks), "snapshotBytes": sum(s["bytes"] for s in heap["snapshots"]), "dialogCounts": {s["file"]: s["nativeDialogCount"] for s in heap["snapshots"]}}))
