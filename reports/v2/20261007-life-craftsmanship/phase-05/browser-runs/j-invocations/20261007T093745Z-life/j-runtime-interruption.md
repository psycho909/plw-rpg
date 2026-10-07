# J Life runner interruption diagnosis

The Life run has no terminal result. The runner and Chromium process are zombies, but `life-result.json`, `launcher-status.json`, wrapper exit code, and wrapper end time are absent. The run is **interrupted/unknown**, not PASS; actual run duration and exit code are unknown. No rerun was started.

The invocation was requested for 1800 seconds with `gpt-6-luna` / low and started at `2026-10-07T09:38:01.818929Z`. The last checkpoint was at `2026-10-07T09:59:15.091752Z` (`elapsedSeconds=1271.64`, 133 checkpoint records). The last raw operation record was at `2026-10-07T09:59:17.195659Z` (`elapsedSeconds=1273.75`). `operations.jsonl` has 14,343 raw records; there is no canonical result from which to derive UI operation totals, final reload totals, or terminal duration.

At `2026-10-07T10:12:31Z`, PID 3464 was `Z` (PPID 1) and Chromium PID 3511 was `Zs`. Runner stdout/stderr and invocation launcher stdout/stderr are zero bytes. Tool sessions 9011/6704 could not be queried (`Unknown process id`). Invocation metadata does not record whether launch used nohup/detach or an inherited exec session, so that cannot be established.

The observed cgroup limit was 32 GiB, memory peak 4.58 GB, and `memory.events` counters including `oom`/`oom_kill` were all zero. `dmesg` was not readable. These observations provide no evidence of cgroup OOM, but do not prove the cause of process exit.

The existing external watcher log is preserved. Its old `operations` field is a raw JSONL record count, while `elapsedSeconds` is checkpoint elapsed; neither is a canonical UI operation count or terminal duration. The corrected labels are `operationLogRawRecordCount`, `checkpointElapsedSeconds`, `canonicalUiOperationCount` (null without terminal result), and `terminalDurationSeconds` (null without terminal result).

For any later authorized run, use one run at a time, with an external supervisor that records process start/end, heartbeat age, actual `wait()` exit code, and explicit `INTERRUPTED_NO_RESULT` when the process exits without a result. Keep a watchdog that checks the live PID plus newly appended checkpoint/operation mtimes and never interprets a stale last checkpoint as a running process. The current evidence does not identify a code or runtime cause, so no retry is authorized by this report.
