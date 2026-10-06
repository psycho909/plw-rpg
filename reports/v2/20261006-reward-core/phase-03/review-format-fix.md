# Review artifact format corrections

The three review JSON projections contained literal backslash-n text after the closing brace. `JSONDecoder.raw_decode` could parse the object, but `json.loads` rejected the complete file as extra data. Their original invalid byte streams are preserved in `playlog.jsonl`; corrected projections end with a real newline and decode to the identical objects. SHA-256 values and exact suffix evidence are recorded in [review-format-fix.json](review-format-fix.json).

The authored `bugfix.md` and `harness-review.md` metadata lines used trailing spaces for hard line breaks. Those spaces were removed and paragraph spacing added; the text itself is unchanged. No raw logs, text captures, JSONL evidence, findings, metrics, source, or configuration were changed.
