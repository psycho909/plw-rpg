# 最新 V2 QA Baseline

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`；branch `work`。

初始乾淨 baseline 為 `c02b600c6f5f1533374d671b707d333c86d852d7`，見 [舊 baseline](baseline-old/baseline-c02.json)。確認 P1 舊分頁覆寫保存後，修復經獨立審查、229 tests／14 files、typecheck 與 production build 通過，固定最新 source。

- Node v24.19.0；npm 11.9.0；vitest/4.1.11 linux-x64 node-v24.19.0。
- Chromium 151.0.7922.173 built on Debian GNU/Linux 13 (trixie)；Firefox actual smoke 153.4.0；Python Playwright 1.62.0。
- OS：Linux-6.18.44-x86_64-with-glibc2.41；Python 3.12.14。
- 精確 timestamp、預期未提交 QA 狀態及 remote work SHA：[baseline.json](baseline.json)。
- App source 58 檔與 production asset SHA-256：[build-manifest.json](build-manifest.json)。新版服務與舊版獨立，各 QA 明確標記來源。

保存修復未重新建立玩家世界：Web Locks lifetime 單一 writer、取得後重讀 checkpoint，保留既有遷移／保存／日誌補送；其他頁停止操作，關閉 owner 後正常重新整理讀取最新世界。fresh opening 取得前禁止起身，競爭／不支援時警告與復原可達。

Source fix 與 QA 文件交付 commit 分開；QA 文件 commit 不表示另一版 app source。原生 Safari 與手機實機已依使用者排除。Human Fun Gate：PENDING。
