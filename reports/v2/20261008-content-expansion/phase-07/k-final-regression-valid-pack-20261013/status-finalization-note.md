# Build status evidence finalization

The first status-generation attempt compared absolute source paths from the captured build maps with relative paths from `qa_browser_support`. It therefore rejected the maps before writing a canonical status file. The following validation attempt was preserved unchanged in `04-verify-build-status/` and failed because that file did not yet exist.

`build-status-generator.py` normalizes the captured maps to repository-relative paths, verifies source, runner, build-input, and HEAD stability against the post-build workspace, writes the canonical status file, calls `qa_browser_support.validate_build()`, and copies the accepted status into this evidence directory. The build itself was not rerun.
