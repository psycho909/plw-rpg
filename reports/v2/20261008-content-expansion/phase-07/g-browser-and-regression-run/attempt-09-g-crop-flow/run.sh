#!/usr/bin/env bash
set +e
RUN_DIR="reports/v2/20261008-content-expansion/phase-07/g-browser-and-regression-run/attempt-09-g-crop-flow"
SOURCE_PATHS=(
  docs/UI.md
  src/data/content/farmCrops.ts
  src/data/contentRegistry.ts
  src/engine/actions.ts
  src/engine/simulation.ts
  src/engine/rewardActions.ts
  src/components/PlaceWindow.vue
  src/components/InventoryWindow.vue
  src/presentation/worldUI.ts
  src/presentation/worldUI.test.ts
  src/engine/crops.integration.test.ts
  src/engine/contentItems.integration.test.ts
)

date -u +%Y-%m-%dT%H:%M:%S.%NZ > "$RUN_DIR/started-at.txt"
git rev-parse HEAD > "$RUN_DIR/head.txt"
git branch --show-current > "$RUN_DIR/branch.txt"
node --version > "$RUN_DIR/node-version.txt"
npm --version > "$RUN_DIR/npm-version.txt"
chromium --version > "$RUN_DIR/browser-version.txt" 2>&1
sha256sum "${SOURCE_PATHS[@]}" > "$RUN_DIR/source-before.sha256"
sha256sum dist/index.html dist/assets/* > "$RUN_DIR/build-before.sha256"
printf '%s\n' 'node reports/v2/20261008-content-expansion/phase-07/g-browser-and-regression-run/attempt-09-g-crop-flow/run-crop-flow-smoke.mjs' > "$RUN_DIR/command.txt"
node "$RUN_DIR/run-crop-flow-smoke.mjs" > "$RUN_DIR/stdout.txt" 2> "$RUN_DIR/stderr.txt"
browser_status=$?
printf '%s\n' "$browser_status" > "$RUN_DIR/exit-code.txt"
date -u +%Y-%m-%dT%H:%M:%S.%NZ > "$RUN_DIR/finished-at.txt"
sha256sum "${SOURCE_PATHS[@]}" > "$RUN_DIR/source-after.sha256"
sha256sum dist/index.html dist/assets/* > "$RUN_DIR/build-after.sha256"
exit "$browser_status"
