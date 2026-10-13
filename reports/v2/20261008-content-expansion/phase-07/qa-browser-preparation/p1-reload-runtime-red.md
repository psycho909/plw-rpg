# Reload runtime check: pre-fix evidence

Reviewer finding: `normal_save_reload` compared the pre-reload baseline to `read_save(page)` immediately after reload. That reads the persisted localStorage value, so unchanged storage could pass even if the application failed to load or reserialize the same core state. The later visible UI save was discarded. `fixture_save_reload` had the same gap.

Pre-fix source hashes are recorded in `p1-reload-runtime-prepatch.sha256` before implementation changes. The mock counterexample is retained in `p1_reload_runtime_red.py`: storage remains identical to baseline while the runtime-save payload changes world time and NPC state. The old storage-only comparison reports equality for this input, which is the false-positive contract being fixed.
