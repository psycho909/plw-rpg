# Raw output whitespace diagnostic

Initial full staged `git diff --cached --check` returned exit2 for blank lines at EOF in four unmodified Vitest raw-output .txt/.log files: full-regression-in-progress-stdout.log, full-regression-stdout.txt, migration-red-stdout.txt and validation-green-stdout.txt. These are preserved byte-for-byte, including expected RED failures; whitespace normalization would change the original evidence.

Source, Markdown, JSON and other non-raw artifacts are checked separately with raw `.txt`/`.log` paths excluded. This is a scoped source/document formatting check, not a claim the raw tool output has no whitespace diagnostics. No feature test was bypassed.
