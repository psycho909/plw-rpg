# Original selector smoke failure

- Command and exit code are recorded alongside this note.
- Failure occurred in `browser.close()` after `sync_playwright()` exited; the cleanup exception prevented the runner from writing its final `status.json` and check summary.
- Original screenshots from the run remain unchanged in this directory. Their hashes are in `screenshots.sha256`.
- No product source or build was changed during this attempt.
- The run is retained as a QA runner failure; it is not a product/UI pass or fail result.
