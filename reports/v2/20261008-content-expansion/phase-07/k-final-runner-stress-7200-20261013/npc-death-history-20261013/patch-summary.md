# NPC death telemetry correction (2026-10-13)

Scope is QA runner plus preparation contracts/evidence only. No Browser run; no product `src`, `dist`, or release manifest changes.

RED is preserved in `red/command-output.txt` (exit 1): the new tests failed because the existing population projection had no distinct live-registry and retained-history-death fields.

Checkpoint `browserState.npcPopulation` now reports `liveRegistryTotal`, `registryAlive`, and `registryDead` from the current `npcs` list, separately from `historicalDeaths`. Historical deaths count only retained `history` records with `type == "npc.died"` and `category == "npc"`; player deaths are excluded. Fields identify `historicalDeathBasis: retained_history_npc.died_events`, `historicalDeathScope: retained_history_only`, `historyLimit: 20000`, `historyAtCap`, and a conservative `historicalDeathsMayBeIncomplete: true`. Thus the telemetry never represents retained history as an all-time death total. Missing history or malformed NPC liveness is reported as null.

GREEN: 41 QA browser contract tests passed; `py_compile` and scoped `git diff --check` passed. Evidence files are under `green/`.

SHA-256:
- `qa_browser_runner.py`: `f65641514aee39d06bc33043965c3c6bc5576165c103e1b1b819290ba037680f`
- `test_qa_browser_contract.py`: `9f85802b4ea9adc76ed00606afe16200a35a661dbbafa1bd328fff6645e9418d`
