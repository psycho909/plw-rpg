# QA runner reload-speed regression

- Classification: QA harness defect, not a product bug.
- Source commit: `e05cc78f1ef452e2672df223f2febf48444dcbd3`.
- Frozen product source fingerprint: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`.
- Reproduction: a visible ×5 speed was selected; `normal_save_reload` paused for the visible save and reload, then returned at speed 0.
- Red assertion: expected speed 5, observed 0. Full output is in `red-output.txt`.
- Fix: the runner reads the visible selected speed, performs the legal paused save/reload comparison, then restores that speed through the visible control. It records speed before reload, after load, and after restoration.
- Green: the focused contract test passes for paused, ×1, ×5, and ×20. The complete QA browser contract suite passes 15/15.
- Product `src/` and frozen `dist/` were not changed by this harness fix.
- The earlier 20-minute stress and 9m49s content-agent runs remain preserved as invalidated diagnostic evidence; they are not counted as valid active-world soaks.
