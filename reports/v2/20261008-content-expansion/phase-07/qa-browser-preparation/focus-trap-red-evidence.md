# PixelWindow focus trap regression evidence

The preserved Chromium selector smoke `20261013114847Z-selector-smoke` is the RED reproduction. It recorded 41 passing checks and 1 failing check, `gear-search-reachable-by-keyboard-tab`: after 32 Tabs the active element remained the `BUTTON` “穿戴獵獲裝備” rather than reaching the visible `input[data-content-search=gear]`. The input itself worked when filled directly. The run had zero browser errors and zero unhandled rejections, and reported `sourceStableDuringRun: true`. This run, including its screenshots and logs, was not edited.

Root cause was `PixelWindow.vue` enumerating only enabled buttons, links, and exact `[tabindex="0"]` elements in its focus trap; native inputs were absent from the sequence. The correction adds enabled, non-hidden native inputs/selects/textareas, nonnegative explicit tabindex elements, and contenteditable elements; it retains visibility/disabled filtering, tab wraparound, and positive-tabindex ordering.

Validation after the correction:

- `npm exec vue-tsc -- --noEmit` — passed.
- `git diff --check -- src/components/PixelWindow.vue` — passed.
- The preserved RED run above remains unchanged. The corrected frozen-source Chromium selector smoke `k-ui-selector-20261013/runs/20261013115257Z-selector-smoke/status.json` is the GREEN result: 42/42 checks passed, including keyboard reachability, with zero browser errors or unhandled rejections and `sourceStableDuringRun: true`. Its playlog and screenshot hashes are in the same run directory. The source fingerprint is `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`.

Independent Medium standards review confirmed the corrected focus order against the visible, enabled form-control contract in `docs/UI.md:49`; no additional finding was raised.

SHA-256 of preserved RED artifacts:

- `status.json`: `5c72697a1a6b32af3c86fa5eceac6d12ab5d8136bb3f7dad22bdda717d9989ba`
- `playlog.jsonl`: `1f46b0a7891f4dc388bf36f24802952e0a2b4b5a796371cfdb228dd33ff315bb`
- inventory screenshot: `4b3bf75a96e8e9054556942f97279911d43ee20612c76364ff721a0fb44d6b22`
- corrected `PixelWindow.vue`: `7534d4dd48d93742fb74ced23c7a77999282ac51a08eb1842be54745cb026b4d`
