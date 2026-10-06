# QA metric endpoint regression reproduction

The summary builder sorted each metric series and then copied the sorted endpoints into `first` and `last`. For `[12, 1.02, 2.55]`, that produces first `1.02` and last `12`, while the chronological endpoints are `12` and `2.55`. The minimum and maximum remain valid.

The production run reproduces this for monster population (published first/last `1.02`/`12`, raw chronological first/last `12`/`2.5499999999999994`), JS used heap (published `6,242,428`/`40,564,800`, raw first/last `6,242,428`/`18,189,164`), and DOM nodes (published `2,174`/`3,354`, raw first/last `2,174`/`2,786`). Exact evidence is in [metrics-repro.json](metrics-repro.json).
