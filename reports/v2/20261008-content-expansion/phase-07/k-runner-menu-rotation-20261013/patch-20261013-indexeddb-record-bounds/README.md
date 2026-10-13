# 2026-10-13 IndexedDB sample projection bounds

This follow-up addresses the standards review finding that a cursor sample count alone did not bound serialization of each IndexedDB value. The runner now projects each key/value record before JSON serialization, with limits of 256 visited nodes, depth 8, 1024 characters per text value, 4096 total text characters, and 64 properties per object or array. It records the number of truncated samples. A store total estimate is suppressed if any sampled record was truncated or serialization failed; record counts remain available.

`red/output.txt` preserves the two new contracts failing before the implementation: a truncated sample still produced an extrapolated total, and the generated cursor script serialized the original full record. `green/` contains the complete 31-test contract run, Python compilation, Node syntax check of the generated cursor script, inert launcher, runner help, release-manifest parse, scoped diff check, and checksums.

No Browser, application server, build, or product source was changed or run. Earlier RED evidence and raw failed diagnostics were left intact.
