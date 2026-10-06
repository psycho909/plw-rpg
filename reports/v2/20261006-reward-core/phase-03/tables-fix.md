# Performance table projection fix

The table had seven header cells but some data rows had six; in affected rows, a statistic occupied a chronological endpoint column. The corrected table is rendered from the already-verified `qa-summary.json` metric objects. The regression test checks every mapped row has seven cells, both endpoint columns match the JSON, and the gold, event-ring and origin-storage examples match their known chronological values.
