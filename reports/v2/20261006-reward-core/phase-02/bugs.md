# Phase 2 Bugs／Gate Findings

Source baseline f89c2c292aaadb6c22bc0453188661f22e4f15b2 + working-tree source fingerprints in各驗證status／independent review；每輪修正前後保留原始追加版本。

| ID | Severity | Finding | Reproduction evidence | Current disposition |
|---|---|---|---|---|
| B02-01 | P2 | 傳說掉落將拾取者誤記為製作者 | engine-worker-red-provenance.txt | 已改createdBy=null，定向及全量通過 |
| B02-02 | P2 | 素材出售檢查鐵匠，應為雜貨店 | engine-worker-red-material-store.txt | 已改store predicate，真Browser交易通過 |
| B02-03 | P2 | 高防禦的minimum-hit floor吞掉裂傷／狩月額外傷害 | engine-worker-red-high-defense-extras.txt | 已先floor基礎命中再加額外傷害，定向及全量通過 |
| B02-04 | P3 | 出售後／取消fallback選到第一個日常分類而非目前gear | engine-worker-ui-focus-repro.json | 已修選取順序，DOM＋獨立followup通過 |
| B02-05 | P3 | 未解鎖鐵匠時出售提示缺乏村莊資格說明 | ui-independent-review.md | 已加unlock hint，獨立followup通過 |
| B02-06 | P1（工程 build 阻擋） | 7個TS compile errors（6template lookups／1material bias） | build-stdout.txt初版／唯一時間戳rawlog | typed helpers／typedbias修復後typecheck+build通過 |
| B02-07 | P2，Phase2 blocker | 狼族專屬掉落仍再加generic material | engine-worker-red-three-findings.txt：8 vs原stack7 | 已修正wolf-only payout，75項定向通過；待最新全量/Browser |
| B02-08 | P3 | 穿戴／卸下未產生當次事件，通知/journal重播前次訊息 | engine-worker-red-three-findings.txt：缺player.equipped | 已修正factual event，store journal integration通過；待Browser |
| B02-09 | P3 followup | armor wolf loot使用fang，實際路徑未套用hide affinity | engine-worker-red-three-findings.txt：wolfFang vswolfHide | 已套用既有slot material，定向與10k重新抽樣通過；待Browser |

QA harness 首輪disabled hunt逾時另見targeted-original-failure.md：測試等待上限不足，修正後正常UI600秒通過；不列為遊戲bug。全部Gate仍需三項修正後最新source完整重驗。

Phase1 R1 P2 family combat derived stats/root formation crossguard仍在Phase3啟用前必須關閉。V2既有C01/C02/C03維持原案追蹤，不因本輪短測宣稱修復。

最新定稿：三項review修正、過時combatStats assertion均已完成；284/284full、build、strictaudit、20browser smoke與602.915秒targeted全部通過。上述待驗狀態保留為先前歷程，由本段與acceptance.md更新為已驗證。
