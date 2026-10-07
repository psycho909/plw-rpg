# J 長測 driver：操作控制項選擇器診斷

狀態：QA driver freeze，等待獨立 Medium review 與 Root 決定新的 release marker。此報告只記錄 driver 契約與短 UI smoke，不代表 H 接受、20–30 分鐘壓力測試、30–60 分鐘 Life Agent 測試或人工驗收。

## 範圍與作者／執行者

- 本次只修改 `phase05_browser_driver.py`、`test_phase05_browser_driver.py` 與本報告；遊戲 `src/`、build input、`dist/`、launcher、`browser-release.json` 均未修改。
- 作者標籤：`g6_luna_max_phase5_influence_contract_fixer`，請求設定 GPT-6 Luna / max；後端實際模型驗證狀態為 `false`。
- 短 UI 執行：本 Agent 執行 Playwright sync driver 的一般 deterministic UI policy，無模型推論；Chromium `151.0.7922.173`。本 smoke 是 normal fresh context，不是 Life／Stress soak。

## 失敗與診斷

最新保留的 J retries 為 stress `36.02s / 349 ops / 4 reloads / 4 checkpoints`、life `39.88s / 388 ops / 5 reloads / 5 checkpoints`。兩者都在全頁 `get_by_role("button", name=re.compile(r"^休息"))` 上發生 strict-mode violation：頁面下方 `.recent-event` 的「休息後，你恢復了生命與體力。 L」與 native place dialog 內的實際「休息 · 1 小時」同時符合。原始 run logs 未改動。

修復將操作選擇限制在唯一的可見 native dialog、其實際標題與所屬 section，再使用精確或完整錨定的控制項名稱。rest、resource、combat、shop row、recipe/material/submit、equipment detail、menu/window、clock 都使用各自 UI 範圍；缺少或重複控制項時直接失敗。driver 不再使用 `.first`、全頁 role-button lookup 或 forced click。

## RED／GREEN

RED 在 driver 修正前新增並執行 `test_home_rest_uses_the_exact_action_inside_the_matching_place_dialog`，因舊 driver 尚無 exact house-rest contract 而失敗。RED stdout SHA-256：`7e2828829695436ab38ec399c0fc1d339c4ec3f657cd7f9523131f9d3aec4006`。

```text
F
======================================================================
FAIL: test_home_rest_uses_the_exact_action_inside_the_matching_place_dialog (test_phase05_browser_driver.BrowserDriverLifecycleTest.test_home_rest_uses_the_exact_action_inside_the_matching_place_dialog)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/plw-rpg/reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py", line 224, in test_home_rest_uses_the_exact_action_inside_the_matching_place_dialog
    self.assertTrue('self.place_button("house", "休息 · 1 小時")' in DRIVER_SOURCE,
AssertionError: False is not true : house rest must use the exact action inside the current place dialog

----------------------------------------------------------------------
Ran 1 test in 0.000s

FAILED (failures=1)
```

修正後 driver + support tests：26/26 PASS；Python syntax check PASS。GREEN stdout SHA-256：`302eeb377533462251c3e4f1f8191d6d6ff75eba9b20a3aead2086f06c946ffe`。

```text
..........................
----------------------------------------------------------------------
Ran 26 tests in 0.005s

OK
```

## 短 UI smoke 與 404 分類

首次透過 Vite dev server 的短 smoke 走完了 craft/save/reload 與兩次 house-rest 控制流程，但初始 smoke assertion 因瀏覽器 console error 以失敗結束：`RuntimeError: Browser/page/storage errors occurred during short UI smoke`。同一 Vite origin 的唯讀 Playwright 網路追蹤將唯一 console error 定位為 `http://127.0.0.1:4173/favicon.ico` 的 404；Vite app modules 均為 200，沒有 page error、request failure、unhandled rejection 或 storage error。這是 dev server 缺少 favicon 路由的探測環境錯誤。沒有略過此錯誤；改用專案既有 `owned_http_server_code()`，其 favicon 回應契約為空的 HTTP 204，並重新執行同一短 smoke。

以下為經 `recorded_reports` 保存的 static-dist 短 smoke 原始 JSON stdout；SHA-256：`b1d735baba3f08926bdc6fceaf2eb583ec4ab963760d285bd4108824b9d55326`。它不是長測結果，也不取代先前失敗紀錄。

```json
{
  "status": "PASS_SHORT_SELECTOR_SMOKE",
  "mode": "normal fresh context, visible UI only",
  "scope": "short selector smoke; not a 20-30 minute stress or life-gate result",
  "producer": {
    "agent": "g6_luna_max_phase5_influence_contract_fixer",
    "requestedModel": "GPT-6 Luna",
    "requestedEffort": "max",
    "backendRuntimeVerified": false,
    "execution": "Playwright sync driver in current agent runtime; no model inference in UI policy",
    "browserVersion": "151.0.7922.173"
  },
  "freshContextGuard": {
    "readyState": "loading",
    "present": false,
    "error": null
  },
  "sourceStableDuringSmoke": true,
  "sourceFingerprintBefore": "64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb",
  "sourceFingerprintAfter": "64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb",
  "buildStatusSha256": "29b54af491df360466d61e43da51e4ac22b94f333d0c46aa90def67da85aa442",
  "buildSourceFingerprint": null,
  "distFingerprintFromServedManifest": "6824067c45cb8bcda82376c05fa763e1ca109d3be1dbdc8815b00549e5371d16",
  "servedAssets": {
    "index": {
      "status": 200,
      "bytes": 448,
      "sha256": "02dfd359e60ae0cde25de6bbbddb2369ac3633b7916d97b9e3fa1c3fce96741f"
    },
    "assets": [
      {
        "path": "assets/index-D5p_OlSI.js",
        "status": 200,
        "bytes": 296898,
        "sha256": "463c9612fa7a4a7026d5247e10371c36142bfbd4d54046a9543e1e9ebbf9c146"
      },
      {
        "path": "assets/index-N61qMvza.css",
        "status": 200,
        "bytes": 29768,
        "sha256": "230de3747a4d005dcba6d2984cd2930d9f6430e59ff7eb4d119a3befeadff20e"
      }
    ],
    "favicon": {
      "status": 204,
      "bytes": 0
    }
  },
  "visibleUiOperations": 83,
  "nativeSaveReloads": 3,
  "craftedItem": {
    "instanceId": "item-2",
    "recipeId": "starterSpear",
    "influenceMaterial": "wolfFang",
    "equippedAfterNativeReload": true,
    "remainingWolfFang": 1
  },
  "homeRestEvents": [
    {
      "id": 19,
      "at": 897,
      "type": "player.rested",
      "category": "player",
      "message": "休息後，你恢復了生命與體力。",
      "tier": "gameplay"
    },
    {
      "id": 20,
      "at": 957,
      "type": "player.rested",
      "category": "player",
      "message": "休息後，你恢復了生命與體力。",
      "tier": "gameplay"
    }
  ],
  "recentEventAtSecondRestClick": "› 休息後，你恢復了生命與體力。 L",
  "browserTelemetry": {
    "pageErrors": [],
    "consoleErrors": [],
    "requestFailures": [],
    "httpFailures": [],
    "rejections": [],
    "storageErrors": []
  }
}
```

static smoke 使用 fresh isolated browser context，native opening action 後依一般可見 UI 完成灰狼素材取得、`starterSpear` craft、穿戴、原生存檔／重載，以及第一次 house rest。重載後 `.recent-event` 顯示同一休息訊息，再次以精確 home-rest 控制完成第二次正常 rest。兩個 `player.rested` events 分別為 id 19、20；83 次可見 UI actions、3 次 native reload。所有 browser、network、storage、rejection telemetry 為空。`validate_build()` 與 HTTP asset checks 通過；index、JS、CSS bytes/hash 均符合既有 build manifest，favicon 為 HTTP 204。source fingerprint 前後皆為 `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb`。

## Freeze

- Driver 現在 SHA-256：`82d73b11f54f68929f7730ddb07ca0e4f65345729ac81ddae3249395ca7ccdfa`。
- Test 現在 SHA-256：`19c39828f7bef4bd8360fb440e7ad67410ec54904718a8d68e4878c8f1719639`。
- 修改前 driver body 以 `recorded_reports.capture_existing` 歸檔，SHA-256 `fbb1af096b0b83b7d14f6da20a88e02ac264298183ec93ec15dc4a66375c0f12`，record id `9113a367-299b-4f40-91f1-390c0fb64fde`；修改前 test SHA-256 `b28f9ce23cf252041f0778144272d6d91c8caa774d66a7f27b1a318b8c1807ee`，record id `15c4414c-6b0f-4d2c-b261-41e8c9e850ac`。
- 目前 browser release marker 仍由 Root 控制，未建立新 marker；本 Agent 沒有啟動任何 20–30 分鐘或 30–60 分鐘 run。下一步只需獨立 Medium review；長測由 Root 在 review 與新 marker 後安排。
