# C pilot runner cleanup repair

The retained first attempt `browser-runs/c-normal-20261007T033633Z-pid61803/` remains unchanged. Its `attempt-diagnosis.json` records the failure as `FAILED_RUNNER_CLEANUP_MASKED_INNER_FAILURE`. `actions.jsonl` ends after the successful equip checkpoint and contains no save action. Therefore the inner save-stage cause remains unknown, and this attempt is neither a C acceptance nor a product defect.

The harness now owns Playwright explicitly and closes the browser context and browser before stopping the Playwright manager. Cleanup exceptions are recorded in `browserCleanupErrors`; when an operation already failed, its original `error` stays primary. Final source provenance and `pilot-result.json` publication run after browser cleanup, so a browser close failure no longer skips them. Cleanup failure by itself marks the run failed. The pilot remains inert without `--go`.

Focused QA: `c-runner-cleanup-red.txt` captured the pre-fix missing behavior; `c-runner-cleanup-green.txt` records the passing regression test, Python compilation, and inert prepared-mode check. The test simulates an operation error and a throwing `browser.close()`, then checks the primary error, source fingerprint, and recorded final report.

No browser retry was run. A new unique run still requires Root release after capturing this harness SHA.
