"""Released Phase 7 Chromium UI regression and long-play harness.

Normal lanes use fresh contexts and visible application controls only. Controlled
fixture cases are executed in separate contexts and never count as natural access.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import time
from typing import Any

from playwright.sync_api import expect, sync_playwright

from qa_browser_support import (append_jsonl, attach_early_capture, core_save_differences, core_save_payload,
    now_utc, provenance, publish, reload_due, reload_payload_proof, save_latency_sample, sha_file, validate_build, validate_controlled_fixture_case)


def project_root(script: Path) -> Path:
    for candidate in script.resolve().parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir():
            return candidate
    raise RuntimeError(f"Cannot find project root above {script}")


ROOT = project_root(Path(__file__))
PHASE = ROOT / "reports/v2/20261008-content-expansion/phase-07"
PREP = PHASE / "qa-browser-preparation"
RUNS = PHASE / "qa-browser-runs"
DRIVER = Path(__file__).resolve()
SUPPORT = PHASE / "qa_browser_support.py"
LAUNCHER = PHASE / "qa_browser_launcher.py"
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", PREP / "phase7-build-status.json"))
RELEASE_PATH = Path(os.environ.get("PHASE7_BROWSER_RELEASE", PREP / "phase7-browser-release.json"))
FIXTURE_MANIFEST = Path(os.environ.get("PHASE7_FIXTURE_MANIFEST", PREP / "controlled-fixtures.json"))
CHECKPOINT_SECONDS = 60
MODE_DURATION_BOUNDS = {"regression": (60, 300), "stress": (1200, 1800), "content-agent": (1800, 3600)}
CONTENT_KEYS = re.compile(r"monster|enemy|boss|item|recipe|material|crop|farm|craft|loot|reward|content|catalog", re.I)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def add_tail(mapping, key, row, limit=12):
    tail = mapping.setdefault(key, [])
    tail.append(row)
    del tail[:-limit]


def append_tail(rows, row, limit=12):
    rows.append(row)
    del rows[:-limit]


def wire_errors(page, status, run_dir):
    def record(kind, detail):
        row = {"atUTC": now_utc(), "kind": kind, "detail": detail}
        append_jsonl(run_dir / "browser-errors.jsonl", row)
        status["errorCounts"][kind] = status["errorCounts"].get(kind, 0) + 1
        add_tail(status["errorTails"], kind, row)
    page.on("pageerror", lambda error: record("pageErrors", str(error)))
    page.on("console", lambda message: record("consoleErrors", message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: record("requestFailures", {"url": request.url, "error": request.failure}))
    page.on("response", lambda response: record("httpFailures", {"url": response.url, "status": response.status}) if response.status >= 400 else None)


def record_action(status, run_dir, row):
    append_jsonl(run_dir / "actions.jsonl", row)
    status["actionCount"] += 1
    append_tail(status["actionTail"], {key: row.get(key) for key in ("turn", "choice", "motivation", "buttonText", "atUTC")})
    category = row.get("choice")
    if category:
        status["actionCategoryCounts"][category] = status["actionCategoryCounts"].get(category, 0) + 1


def drain_browser_events(page, run_dir, status):
    batch = save_latency_sample(page)
    per_interval = {}
    for source, kind in (("writes", "saveWrites"), ("storageErrors", "storageErrors"),
                         ("unhandledRejections", "unhandledRejections"), ("longTasks", "longTasks")):
        events = batch.get(source, [])
        per_interval[kind] = len(events)
        for event in events:
            row = {"atUTC": now_utc(), "kind": kind, "detail": event}
            append_jsonl(run_dir / "browser-events.jsonl", row)
            status["browserEventCounts"][kind] = status["browserEventCounts"].get(kind, 0) + 1
            add_tail(status["browserEventTails"], kind, row)
    writes = batch.get("writes", [])
    latencies = [float(event["elapsedMs"]) for event in writes if isinstance(event.get("elapsedMs"), (int, float))]
    interval_summary = {"eventCounts": per_interval, "saveWriteLatencyMs": {"samples": len(latencies),
        "max": max(latencies) if latencies else None,
        "mean": round(sum(latencies) / len(latencies), 3) if latencies else None}}
    return interval_summary


def visible_text(page) -> str:
    return page.locator("body").inner_text(timeout=5000)[:5000]


def open_dialog(page):
    dialogs = page.locator("dialog[open]")
    return dialogs.last if dialogs.count() else None


def safe_close_dialog(page):
    dialog = open_dialog(page)
    if dialog is None:
        return True
    for name in (re.compile("關閉|返回|完成|確定|知道了|close|back|done|ok", re.I),):
        button = dialog.get_by_role("button", name=name)
        if button.count() and button.last.is_visible() and button.last.is_enabled():
            label = button.last.inner_text().strip()
            button.last.click()
            expect(dialog).to_have_count(0, timeout=3000)
            return label
    return False


def snapshot(page, run_dir: Path, status, label: str):
    safe = re.sub(r"[^a-zA-Z0-9_-]+", "-", label).strip("-")[:80] or "screen"
    path = run_dir / f"{safe}-{len(status['screenshots']) + 1:03d}.png"
    page.screenshot(path=str(path), full_page=True)
    status["screenshots"].append({"path": path.name, "sha256": digest(path)})


def read_save(page) -> dict[str, Any]:
    return page.evaluate("""() => { const raw=localStorage.getItem('oakvale-v1'); if(!raw)return null;
      try{return JSON.parse(raw)}catch(error){return {__parseError:String(error),__raw:raw}} }""")


def content_projection(value: Any, path: str = "$") -> list[dict[str, Any]]:
    """Find candidate IDs in evolving catalog/save shapes without assuming new IDs."""
    found: list[dict[str, Any]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if CONTENT_KEYS.search(key):
                if isinstance(child, list):
                    for row in child:
                        if isinstance(row, dict):
                            ident = row.get("id") or row.get("baseId") or row.get("instanceId") or row.get("key")
                            if ident is not None:
                                found.append({"path": child_path, "id": str(ident), "label": row.get("name") or row.get("label")})
                        elif isinstance(row, (str, int)):
                            found.append({"path": child_path, "id": str(row)})
                elif isinstance(child, dict):
                    for ident, row in child.items():
                        if isinstance(row, (dict, list)):
                            found.append({"path": child_path, "id": str(ident), "label": row.get("name") if isinstance(row, dict) else None})
                        elif isinstance(row, (str, int)):
                            found.append({"path": child_path, "id": str(ident), "value": row})
            found.extend(content_projection(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(content_projection(child, f"{path}[{index}]"))
    return found


def classify_button(button) -> str | None:
    try:
        label = (button.get_attribute("aria-label") or "") + " " + button.inner_text(timeout=300)
    except Exception:
        return None
    text = label.strip()
    if not text or not button.is_visible() or not button.is_enabled():
        return None
    patterns = [
        ("observe", r"觀察|查看|消息|紀錄|圖鑑|筆記|status|journal|codex|inspect"),
        ("explore", r"探索|前往|進入|冒險|區域|採集|挖掘|砍伐|explore|travel|gather|mine"),
        ("loot", r"拾取|撿取|收取|領取|戰利品|掉落|loot|collect|claim|pickup"),
        ("craft", r"製作|合成|鍛造|烹飪|craft|recipe|forge|cook"),
        ("use_equip", r"使用|裝備|穿上|卸下|use|equip|wear"),
        ("shop", r"商店|購買|出售|交易|shop|buy|sell|trade"),
        ("farm", r"播種|澆水|收成|農場|種植|plant|harvest|farm"),
        ("crisis", r"危機|防衛|支援|救援|crisis|defen[ds]e|contribut"),
        ("combat", r"攻擊|防禦|技能|藥水|挑戰|戰鬥|attack|defend|skill|potion|battle|fight"),
        ("advance", r"等待\s*1\s*日|前進\s*1\s*日|休息|下一日|wait\s*(one|1)?\s*day|next day"),
        ("navigate", r"選單|背包|角色|地圖|世界|物品|menu|inventory|character|map|world"),
    ]
    for category, pattern in patterns:
        if re.search(pattern, text, re.I):
            return category
    return None


def choose_visible_action(page, turn: int, prior_categories: dict[str, int]):
    """Small semantic policy: inspect visible cues, vary useful action families, never inject state."""
    dialogs = page.locator("dialog[open]")
    if dialogs.count():
        dialog = dialogs.last
        buttons = dialog.get_by_role("button")
        for index in range(buttons.count()):
            button = buttons.nth(index)
            category = classify_button(button)
            if category and category != "navigate":
                return button, category, "在目前可見視窗中選擇可用的實際行動。"
        close_result = safe_close_dialog(page)
        if close_result:
            return None, "close_dialog", f"依可見控制關閉視窗：{close_result}。"
        return None, "observe_blocked", "有未辨識且沒有明確關閉控制的視窗，停止點擊後方介面。"
    buttons = page.get_by_role("button")
    candidates = []
    for index in range(min(buttons.count(), 120)):
        button = buttons.nth(index)
        category = classify_button(button)
        if category:
            label = ((button.get_attribute("aria-label") or "") + " " + button.inner_text()).strip()[:180]
            candidates.append((button, category, label))
    if not candidates:
        return None, "observe", "沒有可辨識的可見行動；擷取畫面及世界訊息後等待。"
    # Meaningful world/content controls are preferred, but cycle through available families.
    priority = ["combat", "crisis", "explore", "loot", "craft", "use_equip", "farm", "shop", "observe", "advance", "navigate"]
    counts = {name: prior_categories.get(name, 0) for name in priority}
    candidates.sort(key=lambda item: (counts[item[1]], priority.index(item[1]), item[2]))
    button, category, label = candidates[0]
    return button, category, f"觀察頁面文字與可見按鈕「{label}」；選擇已可用且目前較少涵蓋的 {category} 行動。"


def indexeddb_summary(page):
    return page.evaluate("""async()=>{
      if(!indexedDB.databases)return {supported:false};
      const infos=await indexedDB.databases(); const out=[];
      for(const info of infos){if(!info.name)continue;out.push(await new Promise(resolve=>{
        const req=indexedDB.open(info.name);req.onerror=()=>resolve({name:info.name,error:String(req.error)});
        req.onsuccess=()=>{const db=req.result;const stores=[...db.objectStoreNames];if(!stores.length){db.close();resolve({name:info.name,counts:{}});return;}
          const tx=db.transaction(stores,'readonly'),counts={};let left=stores.length;
          for(const store of stores){const q=tx.objectStore(store).count();q.onsuccess=()=>{counts[store]=q.result;if(!--left){db.close();resolve({name:info.name,counts});}};q.onerror=()=>{counts[store]=null;if(!--left){db.close();resolve({name:info.name,counts});}};}}
      }));}return {supported:true,databases:out};
    }""")


def checkpoint(page, cdp, run_dir, status, reason):
    profile = {}
    if cdp:
        for command in ("Memory.getDOMCounters", "Runtime.getHeapUsage", "Performance.getMetrics"):
            try:
                profile[command] = cdp.send(command)
            except Exception as exc:
                row = {"atUTC": now_utc(), "command": command, "error": str(exc)}
                append_jsonl(run_dir / "profiling-limitations.jsonl", row)
                append_tail(status["profilingLimitationsTail"], row)
    save = read_save(page)
    raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    row = {
        "atUTC": now_utc(),
        "elapsedRealSeconds": round(time.monotonic() - status["startedMonotonic"], 2),
        "reason": reason,
        "viewport": page.evaluate("() => ({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth})"),
        "url": page.url,
        "visibleText": visible_text(page),
        "openDialogs": page.locator("dialog[open]").all_inner_texts(),
        "localStorageBytes": len((raw or "").encode()),
        "save": {"worldTime": (save or {}).get("worldTime"), "historyCount": len((save or {}).get("history", [])),
                 "eventCount": len((save or {}).get("events", [])), "journalPending": len(((save or {}).get("playJournal") or {}).get("pending", [])),
                 "contentCandidates": content_projection(save or {})[:250], "saveParseError": (save or {}).get("__parseError")},
        "indexedDB": indexeddb_summary(page),
        "cdp": profile,
        "saveLatencyInterval": drain_browser_events(page, run_dir, status),
        "errorCounts": dict(status["errorCounts"]),
        "browserEventCounts": dict(status["browserEventCounts"]),
    }
    append_jsonl(run_dir / "checkpoints.jsonl", row)
    status["checkpointCount"] += 1
    status["lastCheckpoint"] = {"atUTC": row["atUTC"], "elapsedRealSeconds": row["elapsedRealSeconds"],
        "localStorageBytes": row["localStorageBytes"], "worldTime": row["save"]["worldTime"],
        "errorCounts": row["errorCounts"], "browserEventCounts": row["browserEventCounts"]}
    append_tail(status["checkpointTail"], status["lastCheckpoint"], limit=3)
    status["nextCheckpointMonotonic"] = time.monotonic() + CHECKPOINT_SECONDS


def perform_turn(page, status, run_dir, turn):
    before = read_save(page) or {}
    text = visible_text(page)
    before_candidates = content_projection(before)
    button, category, motivation = choose_visible_action(page, turn, status["actionCategoryCounts"])
    row = {"atUTC": now_utc(), "turn": turn, "lane": status["mode"], "policy": "runner_driven_agent_heuristic_semantic_visible_control_v1",
           "policyExecution": "runner-driven heuristic Agent Exploratory QA; no model inference; not a human tester",
           "visibleCue": text[:1800], "choice": category, "motivation": motivation,
           "candidateContentBefore": before_candidates[:120], "stateInjected": False, "controlledFixture": False,
           "urlBefore": page.url}
    if button is not None:
        row["buttonText"] = (button.get_attribute("aria-label") or "") + " " + button.inner_text()[:180]
        interaction_started = time.monotonic()
        button.click(timeout=5000)
        page.wait_for_timeout(180)
        row["visibleActionLatencyMs"] = round((time.monotonic() - interaction_started) * 1000, 2)
    if category == "advance" and not page.locator("dialog[open]").count():
        # A visible wait may be a single world-day action. Do not call engine or clock APIs.
        pass
    after = read_save(page) or {}
    after_candidates = content_projection(after)
    before_keys = {(item["path"], item["id"]) for item in before_candidates}
    after_keys = {(item["path"], item["id"]) for item in after_candidates}
    row["candidateContentAfter"] = after_candidates[:120]
    row["savedContentCandidatesAdded"] = [{"path": path, "id": ident} for path, ident in sorted(after_keys - before_keys)][:120]
    row["savedContentCandidatesRemoved"] = [{"path": path, "id": ident} for path, ident in sorted(before_keys - after_keys)][:120]
    row["worldTimeBefore"] = before.get("worldTime")
    row["worldTimeAfter"] = after.get("worldTime")
    row["visibleCueAfter"] = visible_text(page)[:1200]
    row["urlAfter"] = page.url
    record_action(status, run_dir, row)


def assert_visible_labels(page, labels, context):
    for label in labels:
        matches = page.get_by_text(label, exact=False)
        if not any(matches.nth(index).is_visible() for index in range(matches.count())):
            raise AssertionError(f"{context}: expected visible target/content label {label!r} was absent")


def require_playable_opening(page, url, run_dir, status):
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    expect(page.locator(".game-shell")).to_be_visible(timeout=15000)
    expect(page.locator(".game-name")).to_contain_text("橡谷", timeout=15000)
    opening = page.locator("dialog.pixel-window[open]")
    expect(opening).to_have_count(1, timeout=15000)
    expect(opening).to_contain_text("在陌生的天空下")
    start = opening.get_by_role("button", name="起身", exact=True)
    expect(start).to_be_visible()
    expect(start).to_be_enabled(timeout=15000)
    snapshot(page, run_dir, status, "normal-fresh-opening")
    cue = visible_text(page)
    start.click()
    expect(opening).to_have_count(0, timeout=5000)
    expect(page.locator(".world-map:not(.overview-map)")).to_be_visible(timeout=15000)
    expect(page.locator(".world-clock")).to_be_visible()
    expect(page.get_by_role("alert")).to_have_count(0)
    expect(page.get_by_role("button", name="選單", exact=False)).to_be_visible()
    for label in ("存檔", "暫停"):
        expect(page.get_by_role("button", name=label, exact=True)).to_be_visible()
    row = {"atUTC": now_utc(), "turn": 0, "lane": "NORMAL_FRESH", "policy": "visible_opening_control",
        "choice": "start_from_opening", "visibleCue": cue[:1800], "motivation": "依一般新世界開場的可見『起身』控制開始遊戲。",
        "stateInjected": False, "controlledFixture": False, "worldTimeAfter": (read_save(page) or {}).get("worldTime"),
        "playableSurface": {"worldMap": True, "worldClock": True, "menu": True, "save": True, "pause": True}}
    record_action(status, run_dir, row)
    status["normalOpeningVerified"] = True
    status["normalWorldVisibleAfterOpening"] = visible_text(page)
    snapshot(page, run_dir, status, "normal-fresh-world-after-opening")


def ensure_paused(page):
    pause = page.get_by_role("button", name="暫停", exact=True)
    expect(pause).to_be_visible(timeout=5000)
    if pause.get_attribute("aria-pressed") != "true":
        pause.click()
    expect(pause).to_have_attribute("aria-pressed", "true")


def visible_save(page):
    if page.locator("dialog.pixel-window[open]").count():
        closed = safe_close_dialog(page)
        if not closed:
            raise AssertionError("Cannot use ordinary save control while a modal without a visible close owns the UI")
    save = page.get_by_role("button", name="存檔", exact=True)
    expect(save).to_be_visible()
    save.click()
    expect(page.get_by_role("status")).to_contain_text("世界已儲存", timeout=5000)
    raw = read_save(page)
    core_save_payload(raw)
    return raw


def preserve_reload_baseline(page, run_dir, lane, ordinal, save_payload):
    raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    if not isinstance(raw, str) or not raw:
        raise AssertionError("Visible app save is missing before reload; cannot preserve a trustworthy baseline")
    if json.loads(raw) != save_payload:
        raise AssertionError("Saved payload changed before the reload baseline could be retained")
    safe_lane = re.sub(r"[^a-zA-Z0-9_-]+", "-", lane).strip("-")
    path = run_dir / f"reload-baseline-{safe_lane}-{ordinal:03d}.json"
    with path.open("xb") as output:
        output.write(raw.encode())
        output.flush()
        os.fsync(output.fileno())
    return raw, path


def normal_save_reload(page, run_dir, status, reason):
    """Legal UI pause/save, reload, pause/save again, compare every GameState field."""
    if page.locator("dialog.pixel-window[open]").count() and not safe_close_dialog(page):
        raise AssertionError("Normal save/reload is blocked by a modal without its own visible close control")
    ensure_paused(page)
    before = visible_save(page)
    before_core = core_save_payload(before)
    before_raw, baseline_path = preserve_reload_baseline(page, run_dir, "normal", status["normalReloadCount"] + 1, before)
    append_jsonl(run_dir / "reloads.jsonl", {"atUTC": now_utc(), "stage": "reload-started", "lane": "NORMAL_FRESH",
        "reason": reason, "baselineFile": baseline_path.name, "baselineSha256": hashlib.sha256(before_raw.encode()).hexdigest(),
        "baselineCoreStateKeys": sorted(before_core), "stateInjected": False})
    page.reload(wait_until="domcontentloaded", timeout=30000)
    expect(page.locator(".game-shell")).to_be_visible(timeout=15000)
    expect(page.locator(".world-map:not(.overview-map)")).to_be_visible(timeout=15000)
    expect(page.get_by_role("alert")).to_have_count(0)
    loaded = read_save(page)
    loaded_core = core_save_payload(loaded)
    loaded_raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    expect(page.get_by_role("button", name="選單", exact=False)).to_be_visible()
    for label in ("存檔", "暫停"):
        expect(page.get_by_role("button", name=label, exact=True)).to_be_visible()
    ensure_paused(page)
    runtime_saved = visible_save(page)
    proof = reload_payload_proof(before, loaded, runtime_saved)
    after_raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    row = {"atUTC": now_utc(), "reason": reason, "lane": "NORMAL_FRESH", "stateInjected": False,
        "storageRetainedAtLoad": proof["storageRetained"],
        "storageRetentionDifferences": proof["storageRetentionDifferences"],
        "runtimeSavedMatchesBaseline": proof["runtimeSavedMatchesBaseline"],
        "runtimeReloadDifferences": proof["runtimeReloadDifferences"],
        "runtimeSaveComparedAfterLegalPauseAndVisibleSave": True,
        "excludedMetadataKeys": sorted({"lastSavedAt", "playJournal"}),
        "comparedCoreGameStateFields": sorted(set(before_core) | set(loaded_core)),
        "coreGameStateKeyCount": len(loaded_core),
        "saveBytesBefore": len((before_raw or "").encode()), "saveBytesAfter": len((after_raw or "").encode()),
        "saveSha256Before": hashlib.sha256((before_raw or "").encode()).hexdigest(),
        "saveSha256After": hashlib.sha256((after_raw or "").encode()).hexdigest(),
        "loadedSaveBytes": len((loaded_raw or "").encode()),
        "loadedSaveSha256": hashlib.sha256((loaded_raw or "").encode()).hexdigest(),
        "worldTimeBefore": before_core.get("worldTime"), "worldTimeAfterLoad": loaded_core.get("worldTime"),
        "reloadVisibleLabels": ["橡谷", "選單", "存檔", "暫停"]}
    append_jsonl(run_dir / "reloads.jsonl", row)
    status["normalReloadCount"] += 1
    status["normalReloadVerified"] = proof["accepted"]
    status["lastNormalReload"] = {key: row[key] for key in ("atUTC", "reason", "storageRetainedAtLoad", "runtimeSavedMatchesBaseline", "storageRetentionDifferences", "runtimeReloadDifferences", "worldTimeBefore", "worldTimeAfterLoad")}
    if not proof["accepted"]:
        raise AssertionError("Reload payload mismatch: storage fields "
            f"{sorted(proof['storageRetentionDifferences'])}; post-load runtime fields "
            f"{sorted(proof['runtimeReloadDifferences'])}")
    return row


def regression_legal_save_reload(page, run_dir, status):
    """Exercise visible ordinary advancement and save/reload in the mandatory regression lane."""
    ensure_paused(page)
    page.get_by_role("button", name="選單", exact=False).click()
    menu = page.locator("dialog.pixel-window[open]")
    expect(menu).to_contain_text("選單")
    menu.get_by_role("button", name="旅人筆記", exact=True).click()
    notes = page.locator("dialog.pixel-window[open]")
    expect(notes).to_contain_text("讓時間往前走")
    wait = notes.get_by_role("button", name="等待 1 日", exact=True)
    expect(wait).to_be_visible()
    expect(wait).to_be_enabled()
    before_time = (read_save(page) or {}).get("worldTime")
    wait.click()
    page.wait_for_function("before => { try { return JSON.parse(localStorage.getItem('oakvale-v1')||'{}').worldTime > before } catch { return false } }", before_time, timeout=10000)
    after_time = (read_save(page) or {}).get("worldTime")
    if not isinstance(after_time, int) or not isinstance(before_time, int) or after_time <= before_time:
        raise AssertionError(f"Visible one-day wait did not advance persisted world time: {before_time} -> {after_time}")
    record_action(status, run_dir, {"atUTC": now_utc(), "turn": 0, "lane": "NORMAL_FRESH",
        "policy": "fixed_regression_ui_contract", "policyExecution": "visible UI regression; no state injection",
        "choice": "advance", "buttonText": "等待 1 日", "visibleCue": notes.inner_text()[:1800],
        "motivation": "以遊戲明示的一日等待推進一般新世界，驗證合法操作後的存檔與重載。",
        "worldTimeBefore": before_time, "worldTimeAfter": after_time,
        "stateInjected": False, "controlledFixture": False})
    row = normal_save_reload(page, run_dir, status, "regression-visible-one-day-wait-save-reload")
    status["normalLegalWaitVerified"] = {"button": "等待 1 日", "worldTimeBefore": before_time, "worldTimeAfter": after_time}
    return row


def controlled_fixture_smoke(browser, base_url, run_dir, status):
    if not FIXTURE_MANIFEST.is_file():
        status["controlledFixtureLane"] = {"status": "NOT_CONFIGURED", "reason": "No accepted manifest released", "countsAsNaturalCoverage": False}
        return
    manifest_bytes = FIXTURE_MANIFEST.read_bytes()
    manifest = json.loads(manifest_bytes)
    cases = manifest.get("cases")
    if not isinstance(cases, list) or not cases:
        raise RuntimeError("Controlled fixture manifest requires at least one target-specific case")
    status["controlledFixtureLane"] = {"status": "IN_PROGRESS", "manifest": str(FIXTURE_MANIFEST.relative_to(ROOT)),
        "manifestSha256": hashlib.sha256(manifest_bytes).hexdigest(), "cases": [], "countsAsNaturalCoverage": False}
    for case in manifest.get("cases", []):
        contract = validate_controlled_fixture_case(case)
        name = str(case["name"])
        state_path = (FIXTURE_MANIFEST.parent / case["storageState"]).resolve()
        if FIXTURE_MANIFEST.parent.resolve() not in state_path.parents or digest(state_path) != case["sha256"]:
            raise RuntimeError(f"Controlled fixture path/hash mismatch: {name}")
        state = json.loads(state_path.read_text(encoding="utf-8"))
        storage_key = case.get("storageKey", "oakvale-v1")
        storage_value = state.get("localStorageValue")
        if not isinstance(storage_value, str):
            raise RuntimeError(f"Fixture {name} requires literal localStorageValue")
        context = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
        context.add_init_script(f"if (!localStorage.getItem({json.dumps(storage_key)})) localStorage.setItem({json.dumps(storage_key)}, {json.dumps(storage_value)});")
        page = context.new_page()
        wire_errors(page, status, run_dir)
        page.goto(base_url, wait_until="domcontentloaded", timeout=30000)
        expect(page.locator(".game-shell")).to_be_visible(timeout=15000)
        expect(page.locator(".world-map:not(.overview-map)")).to_be_visible(timeout=15000)
        expect(page.get_by_role("alert")).to_have_count(0)
        assert_visible_labels(page, contract["expectedVisible"], f"controlled fixture {name} before action")
        before = visible_text(page)
        snapshot(page, run_dir, status, f"controlled-{name}-before-reload")
        operation_results = []
        for index, operation in enumerate(contract["operations"], 1):
            target = page.get_by_role("button", name=operation["buttonLabel"], exact=True)
            expect(target).to_be_visible()
            expect(target).to_be_enabled()
            target.click()
            assert_visible_labels(page, [operation["expectedVisibleAfter"]], f"controlled fixture {name} operation {index}")
            operation_results.append({"buttonLabel": operation["buttonLabel"],
                "expectedVisibleAfter": operation["expectedVisibleAfter"], "passed": True})
        after_operations = visible_text(page)
        fixture_save_reload(page, run_dir, status, name, contract["expectedAfterReload"])
        reloaded = visible_text(page)
        result = {"name": name, "sha256": case["sha256"], "status": "PASS_TARGET_OPERATIONS_RELOAD",
                  "countsAsNaturalCoverage": False, "expectedVisible": contract["expectedVisible"],
                  "operations": operation_results, "expectedAfterReload": contract["expectedAfterReload"],
                  "beforeVisibleText": before[:3500], "afterOperationsVisibleText": after_operations[:3500],
                  "afterReloadVisibleText": reloaded[:3500]}
        status["controlledFixtureLane"]["cases"].append(result)
        append_jsonl(run_dir / "controlled-fixtures.jsonl", result)
        context.close()
    status["controlledFixtureLane"]["status"] = "COMPLETE"


def fixture_save_reload(page, run_dir, status, name, expected_after_reload):
    if page.locator("dialog.pixel-window[open]").count() and not safe_close_dialog(page):
        raise AssertionError(f"Controlled fixture {name} leaves a modal that blocks legal save/reload controls")
    ensure_paused(page)
    before = visible_save(page)
    ordinal = len(status.get("controlledFixtureLane", {}).get("cases", [])) + 1
    before_raw, baseline_path = preserve_reload_baseline(page, run_dir, f"controlled-{name}", ordinal, before)
    append_jsonl(run_dir / "reloads.jsonl", {"atUTC": now_utc(), "stage": "reload-started", "lane": "CONTROLLED_FIXTURE",
        "fixtureName": name, "baselineFile": baseline_path.name, "baselineSha256": hashlib.sha256(before_raw.encode()).hexdigest(),
        "baselineCoreStateKeys": sorted(core_save_payload(before)), "countsAsNaturalCoverage": False})
    page.reload(wait_until="domcontentloaded", timeout=30000)
    expect(page.locator(".game-shell")).to_be_visible(timeout=15000)
    expect(page.locator(".world-map:not(.overview-map)")).to_be_visible(timeout=15000)
    expect(page.get_by_role("alert")).to_have_count(0)
    assert_visible_labels(page, expected_after_reload, f"controlled fixture {name} after reload")
    loaded = read_save(page)
    loaded_raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    expect(page.get_by_role("button", name="選單", exact=False)).to_be_visible()
    for label in ("存檔", "暫停"):
        expect(page.get_by_role("button", name=label, exact=True)).to_be_visible()
    ensure_paused(page)
    runtime_saved = visible_save(page)
    proof = reload_payload_proof(before, loaded, runtime_saved)
    after_raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    row = {"atUTC": now_utc(), "lane": "CONTROLLED_FIXTURE", "fixtureName": name,
        "countsAsNaturalCoverage": False, "storageRetainedAtLoad": proof["storageRetained"],
        "storageRetentionDifferences": proof["storageRetentionDifferences"],
        "runtimeSavedMatchesBaseline": proof["runtimeSavedMatchesBaseline"],
        "runtimeReloadDifferences": proof["runtimeReloadDifferences"],
        "runtimeSaveComparedAfterLegalPauseAndVisibleSave": True,
        "excludedMetadataKeys": ["lastSavedAt", "playJournal"],
        "saveSha256Before": hashlib.sha256((before_raw or "").encode()).hexdigest(),
        "loadedSaveSha256": hashlib.sha256((loaded_raw or "").encode()).hexdigest(),
        "saveSha256After": hashlib.sha256((after_raw or "").encode()).hexdigest(),
        "expectedAfterReload": expected_after_reload}
    append_jsonl(run_dir / "reloads.jsonl", row)
    snapshot(page, run_dir, status, f"controlled-{name}-after-reload")
    if not proof["accepted"]:
        raise AssertionError(f"Controlled fixture {name} reload payload mismatch: storage fields "
            f"{sorted(proof['storageRetentionDifferences'])}; post-load runtime fields "
            f"{sorted(proof['runtimeReloadDifferences'])}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true", help="Required execution latch; use only after Root release")
    parser.add_argument("--mode", choices=("regression", "stress", "content-agent"), default="regression")
    parser.add_argument("--seconds", type=int)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--url", required=True)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--execution-model", default="GPT-6 Luna")
    parser.add_argument("--execution-effort", default="low")
    args = parser.parse_args()
    if not args.go:
        parser.error("runner is inert without --go")
    min_seconds, max_seconds = MODE_DURATION_BOUNDS[args.mode]
    seconds = args.seconds if args.seconds is not None else min_seconds
    if seconds < min_seconds or seconds > max_seconds:
        parser.error(f"{args.mode} duration must be {min_seconds}..{max_seconds} seconds")
    build = validate_build(ROOT, BUILD_PATH)
    own = [LAUNCHER, DRIVER, SUPPORT]
    before = provenance(ROOT, BUILD_PATH, own)
    if not RELEASE_PATH.is_file():
        raise RuntimeError(f"Root Phase 7 release manifest is missing: {RELEASE_PATH}")
    release_bytes = RELEASE_PATH.read_bytes()
    release = json.loads(release_bytes)
    expected_release = {"head": before["head"], "sourceFingerprint": before["sourceFingerprint"],
                        "buildStatusSha256": sha_file(BUILD_PATH), "distFingerprint": before["distFingerprint"]}
    release_mismatches = {key: {"release": release.get(key), "current": value}
                          for key, value in expected_release.items() if release.get(key) != value}
    if release.get("status") != "RELEASED" or release_mismatches:
        raise RuntimeError(f"Root release/build correlation is missing or stale: {json.dumps(release_mismatches, ensure_ascii=False)}")
    run_dir = args.run_dir.resolve()
    if run_dir.exists() and any(run_dir.iterdir()):
        raise RuntimeError(f"Run directory is not empty; preserving all existing evidence: {run_dir}")
    run_dir.mkdir(parents=True, exist_ok=True)
    status: dict[str, Any] = {"schema": "phase7-browser-result-v1", "status": "RUNNING", "mode": args.mode,
        "runId": args.run_id, "startUTC": now_utc(), "startLocalTaipei": datetime.now().astimezone().isoformat(),
        "execution": {"modelRequested": args.execution_model, "effortRequested": args.execution_effort,
                      "runtimeTelemetry": "unavailable", "policy": "runner_driven_agent_heuristic_semantic_visible_control_v1", "modelInference": False,
                      "humanTester": False, "humanValidation": "DEFERRED"},
        "durationSecondsRequested": seconds, "normalLane": "NORMAL_FRESH", "controlledFixturesExcludedFromNaturalCoverage": True,
        "sourceBefore": before, "buildStatusPath": str(BUILD_PATH), "buildStatusSha256": digest(BUILD_PATH),
        "buildStatus": build, "releasePath": str(RELEASE_PATH), "releaseSha256": hashlib.sha256(release_bytes).hexdigest(),
        "release": release, "actionCount": 0, "actionTail": [], "actionCategoryCounts": {},
        "checkpointCount": 0, "checkpointTail": [], "normalReloadCount": 0,
        "screenshots": [], "errorCounts": {}, "errorTails": {}, "browserEventCounts": {}, "browserEventTails": {},
        "profilingLimitationsTail": []}
    status["startedMonotonic"] = time.monotonic()
    context = browser = playwright = page = cdp = None
    try:
        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        status["chromiumVersion"] = browser.version
        context = browser.new_context(viewport={"width": 1440, "height": 960}, reduced_motion="reduce")
        page = context.new_page()
        attach_early_capture(page)
        wire_errors(page, status, run_dir)
        require_playable_opening(page, args.url, run_dir, status)
        status["startedMonotonic"] = time.monotonic()
        if args.mode == "regression":
            regression_legal_save_reload(page, run_dir, status)
        # Regression viewport coverage uses desktop and narrow desktop-sized mobile emulation only.
        if args.mode == "regression":
            for viewport in ({"width": 1280, "height": 800}, {"width": 390, "height": 844}):
                page.set_viewport_size(viewport)
                status.setdefault("viewportEvidence", []).append({"viewport": viewport, "scrollWidth": page.evaluate("document.documentElement.scrollWidth"), "text": visible_text(page)[:2200]})
                snapshot(page, run_dir, status, f"normal-fresh-{viewport['width']}x{viewport['height']}")
            page.set_viewport_size({"width": 1440, "height": 960})
        deadline = time.monotonic() + seconds
        next_checkpoint = time.monotonic()
        next_reload = 300
        turn = 0
        while time.monotonic() < deadline:
            turn += 1
            perform_turn(page, status, run_dir, turn)
            now = time.monotonic()
            if now >= next_checkpoint:
                try:
                    cdp = cdp or context.new_cdp_session(page)
                    cdp.send("Performance.enable")
                    cdp.send("Memory.enable")
                except Exception as exc:
                    row = {"atUTC": now_utc(), "setup": str(exc)}
                    append_jsonl(run_dir / "profiling-limitations.jsonl", row)
                    append_tail(status["profilingLimitationsTail"], row)
                checkpoint(page, cdp, run_dir, status, "minute checkpoint" if turn > 1 else "initial")
                next_checkpoint = now + CHECKPOINT_SECONDS
            elapsed = time.monotonic() - status["startedMonotonic"]
            due = reload_due(args.mode, elapsed, status["normalReloadCount"] > 0, next_reload)
            if due:
                normal_save_reload(page, run_dir, status, "scheduled-stress-save-reload" if args.mode != "regression" else "mandatory-regression-save-reload")
                snapshot(page, run_dir, status, f"normal-reload-turn-{turn}")
                next_reload = elapsed + 300
        if args.mode == "regression":
            controlled_fixture_smoke(browser, args.url, run_dir, status)
            if not status.get("normalOpeningVerified") or not status.get("normalLegalWaitVerified") or not status.get("normalReloadVerified") or status["normalReloadCount"] < 1:
                raise AssertionError("Regression cannot pass without a verified normal opening, visible legal wait, and core-equivalent save/reload")
        elif status["normalReloadCount"] < 1:
            raise AssertionError("Long browser lane ended without its required normal save/reload checkpoint")
        status["status"] = "PASS_BROWSER_REGRESSION" if args.mode == "regression" else "COMPLETE_STRESS_REVIEW_REQUIRED"
    except BaseException as exc:
        status["status"] = "FAILED"
        status["error"] = f"{type(exc).__name__}: {exc}"
        status["failureUTC"] = now_utc()
        if page is not None:
            try:
                snapshot(page, run_dir, status, "failure")
            except Exception as shot_error:
                status["screenshotError"] = f"{type(shot_error).__name__}: {shot_error}"
    finally:
        if page is not None:
            try:
                final_save = read_save(page)
                status["finalSaveSummary"] = {"worldTime": (final_save or {}).get("worldTime"),
                    "coreGameStateKeyCount": len(core_save_payload(final_save)) if final_save else 0}
                drain_browser_events(page, run_dir, status)
            except Exception as exc:
                status["finalCaptureError"] = str(exc)
        for resource in (cdp, context, browser):
            if resource is not None:
                try:
                    resource.detach() if resource is cdp else resource.close()
                except Exception as exc:
                    status.setdefault("cleanupErrors", []).append(str(exc))
        if playwright is not None:
            try:
                playwright.stop()
            except Exception as exc:
                status.setdefault("cleanupErrors", []).append(str(exc))
        status["endUTC"] = now_utc()
        status["durationSecondsActual"] = round(time.monotonic() - status["startedMonotonic"], 2)
        status.pop("startedMonotonic", None)
        status["browserErrors"] = bool(any(status["errorCounts"].values())
                                      or status["browserEventCounts"].get("storageErrors", 0)
                                      or status["browserEventCounts"].get("unhandledRejections", 0))
        try:
            status["sourceAfter"] = provenance(ROOT, BUILD_PATH, own)
            status["sourceStableDuringRun"] = before == status["sourceAfter"]
            if not status["sourceStableDuringRun"]:
                status["status"] = "FAILED_PROVENANCE_CHANGED"
        except Exception as exc:
            status["sourceAfterError"] = str(exc)
            status["status"] = "FAILED_PROVENANCE_CHECK"
        if status["browserErrors"] and status["status"].startswith(("PASS", "COMPLETE")):
            status["status"] = "FAILED_BROWSER_ERRORS"
        status["resultPath"] = "qa-browser-result.json"
        try:
            publish(ROOT, run_dir / "qa-browser-result.json", status, "g6-luna-low-phase7-browser-qa")
        except Exception as exc:
            status["reportPublishError"] = str(exc)
            # Preserve a raw fallback without overwriting the publication target.
            fallback = run_dir / "qa-browser-result.raw-fallback.json"
            fallback.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
        print(json.dumps(status, ensure_ascii=False, indent=2), flush=True)
    return 0 if status["status"].startswith(("PASS", "COMPLETE")) and status.get("sourceStableDuringRun") and not status.get("browserErrors") else 1


if __name__ == "__main__":
    raise SystemExit(main())
