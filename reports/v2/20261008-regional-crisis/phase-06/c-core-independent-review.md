# Phase6-C Civil Defense 核心獨立審查

- **Disposition：建議 ACCEPT C 純模型範圍；無未解 blocker。** Root 可依專案 gate 決定是否 release D；本報告不代表 D 或 Phase6 整體產品 PASS。
- **範圍：** 僅 `src/engine/civilDefense.ts`、`src/engine/civilDefense.test.ts`、C ticket 與 `civil-defense.md` 模型紀錄。未擴大到 B、C 以外 source 或 UI。
- **審查時間：** `2026-10-07T18:45:01+00:00`。
- **Reviewer：** `g6_luna_max_phase6_core_reviewer`，未參與 C 施工；requested model/effort 為 GPT-6 Luna Max deep review，runtime model telemetry 未提供。依專案 Review Contract 由一位 reviewer 分開檢查 Standards 與 Spec。
- **來源指紋：** `src/engine/civilDefense.ts` `4680ef90f5bc2560fc1e8b7296379aa001a7276e36e54a7131bc46b1754203bd`；`src/engine/civilDefense.test.ts` `c05afe2ab42f334f3284f3b7830ea073db96707995b2336e2b30855d0c84e125`。兩者與 C freeze 公布值一致。對排序後 `path NUL sha256 LF` 位元組計算的 source fingerprint：`54af15e791bce31c087655b7e4f53a846b75893c2fc8bf27b903e131a4465708`。
- **證據指紋：** 下方 C 模型與原始驗證紀錄的排序後路徑／SHA-256 manifest 指紋：`cd3ad0fd5da04bc7db18d7880b395d93d831cea4f8aed7422d9dbe7a111c84b4`。

## Standards

**PASS，無 finding。** 依據 `AGENTS.md` §§3–6、`docs/agents/review.md`、`docs/agents/skill-workflows.md` 與 `docs/agents/agent-routing.md`。純 derivation 收斂於獨立 engine seam，不擴張持久 schema、action、RNG 或 resolver；輸出由本地計算構成，未發現 scope 或架構違規。

## Spec

**PASS（僅 C 純模型）。** `deriveCivilDefense` 對 warning/preparation/active/resolution 回傳資料，其他 phases 回傳 `null`（`civilDefense.ts:71–74, 115–118`）。函式只讀 state/crisis，重複輸出一致，不消耗 RNG 或修改 state（測試 `civilDefense.test.ts:18–41`）。

- 權重為 defenders 30、combat 15、equipment 10、food/supply 12、safety 10、adult logistics 8、stage/prosperity/infrastructure 各 5，總和 100（`civilDefense.ts:141–156`）。readiness 與 success chance 都有界；pressure 對 cause 與 current input 作 clamp，需求取較高值，保留 trigger-time floor（`civilDefense.ts:105–109, 157–161`）。
- 防衛者使用與既有 work eligibility 一致的活著、工作年齡且未退休條件，再排除受傷或加入玩家 party 的 NPC；gear slots 僅計入有效 defenders，且不超出 defender capacity（`civilDefense.ts:76–80, 119–129`；`npcLife.ts:137–140`）。simulation 的 worker、farmer 與人口淨糧公式在 `simulation.ts:16, 175–179`，C 對應使用同一可工作篩選與供給公式（`civilDefense.ts:131–136`）。
- Food forecast 依剩餘 warning、preparation、active 天數至 resolution 推算，防衛窗口另排除 warning；測試驗證三階段時間與 resolution 零剩餘天數（`civilDefense.ts:82–103`；`civilDefense.test.ts:95–155`）。輸出的 forecast 會 clamp 到 0–100，這符合 C 的 readiness/說明用途。
- 測試覆蓋 defender 可用性、隊伍排除、裝備容量、simulation-matched food、cause floor、自然 prepared/unprepared town 的差異，以及玩家能力不成為 C readiness 輸入（`civilDefense.test.ts:43–93, 157–234`）。prepared 與 underprepared fixtures 的 likelihood 分別為 0.9 和 0.1（可讀測試證據及 `civil-defense.md`）。

### 非阻擋的 D handoff

C 的 `projectedAtResolution` 是 clamp 後的 readiness forecast，不是可供捐贈或消耗的 stockroom 餘額。後續 D 需在貢獻操作前依原始庫存做 preflight，並處理零邊際收益；此為 D 的邊界條件，不構成 C blocker。

## 驗證證據

本次沒有重新執行測試；沒有新的疑慮需要重跑，且任務要求重用已保存的實際輸出。

| 原始證據 | 結果 | SHA-256 |
| --- | --- | --- |
| `c-green-expanded-civil-defense.txt` | C 7 tests passed | `4a6fc7387d36836292a71b0585b74aca80e43805a69f6d5573db40acd140b628` |
| `c-regression-civil-defense-regional-crisis.txt` | C + regionalCrisis 16 tests passed | `727184917c4b37c04ea36b8670ec247afcfceac58c9dd0c680af043e411d2a6d` |
| `c-typecheck-final.txt` | `npx vue-tsc --noEmit`, exit 0 | `a5bd41ddc191579a2da22208a50aa789a78f0da44fc6fc375df5e02d6ac97830` |
| `c-red-expanded-underprepared-expectation.txt` | Initial test fixture showed readiness 20 because it retained the full starting workforce; classified as fixture setup issue | `086cbc0d11083141f7dd5c10b1eb64f51aa5751e03d501a6081806a5bd568275` |
| `civil-defense.md` | C model, scope and evidence summary | `a6faee239467f9010249937a524a06ab609d595e30dc1cef91bd6433e260c736` |

Human validation remains `DEFERRED / NOT APPLICABLE AT THIS STAGE` per the C ticket and does not block engineering acceptance.
