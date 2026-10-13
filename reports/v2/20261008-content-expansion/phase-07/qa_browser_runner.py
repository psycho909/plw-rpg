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
MODE_DURATION_BOUNDS = {"regression": (60, 300), "stress": (1200, 7200), "content-agent": (60, 3600)}
MODE_DEFAULT_DURATION_SECONDS = {"regression": 60, "stress": 1200, "content-agent": 3600}
CONTENT_KEYS = re.compile(r"monster|enemy|boss|item|recipe|material|crop|farm|craft|loot|reward|content|catalog", re.I)
LAUNCHER_OWNED_RUN_FILES = frozenset({"server.log", "launcher-status.json", "runner.stdout.log", "runner.stderr.log"})
SAFE_DIALOG_CLOSE_NAMES = frozenset({"關閉視窗", "返回", "完成", "確定", "知道了", "close", "back", "done", "ok"})
MAX_DIALOG_SURFACES = 12
MAX_DIALOG_LABEL_USES = 24
IDENTICAL_BLOCKED_MODAL_TURN_LIMIT = 3
DESTRUCTIVE_WORLD_ACTION = re.compile(
    r"重建.{0,8}世界|覆蓋存檔|重設.{0,8}世界|重置.{0,8}世界|刪除.{0,8}世界|重新開始.{0,8}世界|"
    r"\b(?:rebuild|reset|restart)\s+(?:the\s+)?world\b|\boverwrite\b.{0,40}\b(?:save|world)\b", re.I)
INDEXEDDB_SAMPLE_LIMIT = 64
INDEXEDDB_DATABASE_LIMIT = 8
INDEXEDDB_STORE_LIMIT_PER_DATABASE = 32
INDEXEDDB_RECORD_PROJECTION_NODE_LIMIT = 256
INDEXEDDB_RECORD_PROJECTION_DEPTH_LIMIT = 8
INDEXEDDB_RECORD_PROJECTION_TEXT_LIMIT = 1024
INDEXEDDB_RECORD_PROJECTION_TEXT_BUDGET = 4096
INDEXEDDB_RECORD_PROJECTION_PROPERTY_LIMIT = 64


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_run_directory(run_dir: Path) -> None:
    """Allow only files the parent launcher creates before invoking this runner."""
    if not run_dir.exists():
        return
    unexpected = sorted(path.name for path in run_dir.iterdir()
                        if path.name not in LAUNCHER_OWNED_RUN_FILES or not path.is_file())
    if unexpected:
        raise RuntimeError(f"Run directory contains unexpected files; preserving all existing evidence: {unexpected}")


def wait_for_world_time_advance(page, before_time: int, timeout: int = 10000) -> None:
    page.wait_for_function(
        "before => { try { return JSON.parse(localStorage.getItem('oakvale-v1')||'{}').worldTime > before } catch { return false } }",
        arg=before_time,
        timeout=timeout,
    )


def add_tail(mapping, key, row, limit=12):
    tail = mapping.setdefault(key, [])
    tail.append(row)
    del tail[:-limit]


def write_runner_heartbeat(run_dir: Path, turn: int, stage: str) -> dict[str, Any]:
    heartbeat = {"schema": "phase7-runner-heartbeat-v1", "heartbeatUTC": now_utc(),
        "heartbeatMonotonic": time.monotonic(), "pid": os.getpid(), "turn": turn, "stage": stage}
    target = run_dir / "runner-heartbeat.json"
    temporary = run_dir / f".runner-heartbeat-{os.getpid()}.tmp"
    temporary.write_text(json.dumps(heartbeat, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(target)
    return heartbeat


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
    surface_key = row.get("dialogSurfaceKey")
    label = row.get("buttonText")
    if surface_key and label:
        surfaces = status.setdefault("dialogActionUseCounts", {})
        if surface_key not in surfaces:
            while len(surfaces) >= MAX_DIALOG_SURFACES:
                surfaces.pop(next(iter(surfaces)))
            surfaces[surface_key] = {}
        uses = surfaces[surface_key]
        if label not in uses and len(uses) >= MAX_DIALOG_LABEL_USES:
            uses.pop(next(iter(uses)))
        uses[label] = uses.get(label, 0) + 1


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


def player_action_projection(save: dict[str, Any]) -> dict[str, Any]:
    character_id = save.get("activeCharacterId")
    character = next((row for row in save.get("characters", [])
                      if isinstance(row, dict) and row.get("id") == character_id), None)
    character_fields = ("level", "exp", "hp", "maxHp", "stamina", "maxStamina", "stats", "skills",
                        "gold", "inventory", "equipment", "position", "currentRegion", "status", "isAlive")
    active_character = ({key: character.get(key) for key in character_fields} if character else None)
    reward = save.get("reward") or {}
    reward_projection = {
        "materials": (reward.get("materials") or {}).get(character_id),
        "instances": [{key: item.get(key) for key in ("instanceId", "baseId", "level", "ownerId")}
                      for item in reward.get("instances", [])
                      if isinstance(item, dict) and item.get("ownerId") == character_id],
    }
    return {"activeCharacterId": character_id, "character": active_character,
            "combat": save.get("combat"), "party": save.get("party"), "dungeon": save.get("dungeon"),
            "reward": reward_projection}


def observable_action_state_key(url: str, surface: list[str], dialogs: list[str], save: dict[str, Any],
                                controls: list[str] | None = None) -> str:
    observation = {"url": url, "surface": surface, "dialogs": dialogs,
                   "controls": controls or [], "playerActionState": player_action_projection(save)}
    encoded = json.dumps(observation, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode()).hexdigest()


def update_stalled_controls(status: dict[str, Any], state_key: str, attempted_label: str | None = None,
                            progress: bool | None = None) -> set[str]:
    if status.get("noProgressStateKey") != state_key or progress is True:
        status["noProgressStateKey"] = state_key
        status["noProgressControls"] = []
    if attempted_label is not None and progress is False:
        controls = status.setdefault("noProgressControls", [])
        if attempted_label not in controls:
            controls.append(attempted_label)
        status["noProgressActionCount"] = status.get("noProgressActionCount", 0) + 1
        event = {"stateKey": state_key, "buttonText": attempted_label,
                 "noProgress": True, "excludedForCurrentState": True, "atUTC": now_utc()}
        append_tail(status.setdefault("noProgressActionTail", []), event, limit=12)
    return set(status.get("noProgressControls", []))


def action_made_progress(before_key: str, after_key: str, category: str,
                         world_time_before: Any, world_time_after: Any) -> bool:
    if category == "advance" and isinstance(world_time_before, int) and isinstance(world_time_after, int):
        return world_time_after > world_time_before
    return before_key != after_key


def open_dialog(page):
    dialogs = page.locator("dialog[open]")
    return dialogs.last if dialogs.count() else None


def is_safe_dialog_close_name(name: str) -> bool:
    return name.strip().casefold() in SAFE_DIALOG_CLOSE_NAMES


def action_button_label(button) -> str:
    aria_label = (button.get_attribute("aria-label") or "").strip()
    text = button.inner_text().strip()
    label = aria_label if aria_label and aria_label == text else f"{aria_label} {text}".strip()
    return label[:180]


def visible_surface_fingerprint(page) -> list[str]:
    headings = page.get_by_role("heading")
    return [headings.nth(index).inner_text().strip()[:120]
            for index in range(min(headings.count(), 20)) if headings.nth(index).is_visible()]


def visible_control_fingerprint(page) -> list[str]:
    buttons = page.get_by_role("button")
    fingerprint = []
    for index in range(min(buttons.count(), 120)):
        button = buttons.nth(index)
        category = classify_button(button)
        if category:
            fingerprint.append(f"{action_button_label(button)}:{category}:enabled")
    return fingerprint


def dialog_surface_fingerprint(page) -> list[str]:
    dialogs = page.locator("dialog[open]")
    fingerprint = []
    for index in range(dialogs.count()):
        dialog = dialogs.nth(index)
        headings = dialog.locator("h1,h2,h3,[role=heading]").all_inner_texts()
        fingerprint.append("|".join(label.strip()[:120] for label in headings if label.strip()) or "open-dialog")
    return fingerprint


def safe_close_dialog(page):
    dialog = open_dialog(page)
    if dialog is None:
        return True
    for button in dialog.get_by_role("button").all():
        label = (button.get_attribute("aria-label") or button.inner_text()).strip()
        if is_safe_dialog_close_name(label) and button.is_visible() and button.is_enabled():
            button.click()
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
    if DESTRUCTIVE_WORLD_ACTION.search(text):
        return None
    patterns = [
        ("navigate", r"選單|背包|角色|地圖|世界|物品|這一生|住所|產業|日誌|旅人筆記|世界歷史|地方消息與委託|menu|inventory|character|map|world|life|property|home"),
        ("observe", r"觀察|查看|消息|紀錄|圖鑑|筆記|status|journal|codex|inspect"),
        ("explore", r"探索|前往|進入|冒險|採集|挖掘|砍伐|explore|travel|gather|mine"),
        ("loot", r"拾取|撿取|收取|領取|戰利品|掉落|loot|collect|claim|pickup"),
        ("craft", r"製作|合成|鍛造|烹飪|craft|recipe|forge|cook"),
        ("use_equip", r"使用|裝備|穿上|卸下|use|equip|wear"),
        ("shop", r"商店|購買|出售|交易|shop|buy|sell|trade"),
        ("farm", r"播種|澆水|收成|農場|種植|plant|harvest|farm"),
        ("crisis", r"危機|防衛|支援|救援|crisis|defen[ds]e|contribut"),
        ("combat", r"攻擊|防禦|技能|藥水|挑戰|戰鬥|attack|defend|skill|potion|battle|fight"),
        ("advance", r"等待\s*1\s*日|前進\s*1\s*日|休息|下一日|wait\s*(one|1)?\s*day|next day"),
    ]
    for category, pattern in patterns:
        if re.search(pattern, text, re.I):
            return category
    return None


def unrecognized_blocked_modal_fingerprint(page, category):
    if category != "observe_blocked":
        return None
    dialogs = page.locator("dialog[open]")
    if not dialogs.count():
        return None
    dialog = dialogs.last
    buttons = dialog.get_by_role("button")
    if any(classify_button(buttons.nth(index)) for index in range(buttons.count())):
        return None
    try:
        text = re.sub(r"\s+", " ", dialog.inner_text(timeout=500)).strip()[:1500]
    except Exception:
        text = ""
    controls = [action_button_label(buttons.nth(index))[:160] for index in range(buttons.count())]
    payload = json.dumps({"text": text, "controls": controls}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()[:24]


def record_unrecognized_blocked_modal_turn(status, modal_key, row, write_action):
    if modal_key is None:
        status["blockedModalFingerprint"] = None
        status["blockedModalStreak"] = 0
        streak = 0
        failure = None
    else:
        streak = status.get("blockedModalStreak", 0) + 1 if status.get("blockedModalFingerprint") == modal_key else 1
        status["blockedModalFingerprint"] = modal_key
        status["blockedModalStreak"] = streak
        failure = None
        if streak >= IDENTICAL_BLOCKED_MODAL_TURN_LIMIT:
            failure = (f"BlockedModalFailFast: {IDENTICAL_BLOCKED_MODAL_TURN_LIMIT} consecutive identical turns "
                "on an unrecognized modal without an actionable or close control")
            status["blockedModalFailure"] = failure
    row["blockedModalConsecutiveTurns"] = streak
    if failure:
        row["blockedModalFailureReason"] = failure
    write_action(row)
    if failure:
        raise RuntimeError(failure)
    return streak


def choose_visible_action(page, turn: int, prior_categories: dict[str, int], excluded_labels: set[str] | None = None,
                          dialog_label_uses: dict[str, int] | None = None):
    """Small semantic policy: inspect visible cues, vary useful action families, never inject state."""
    excluded_labels = excluded_labels or set()
    dialogs = page.locator("dialog[open]")
    if dialogs.count():
        dialog = dialogs.last
        buttons = dialog.get_by_role("button")
        candidates = []
        for index in range(buttons.count()):
            button = buttons.nth(index)
            category = classify_button(button)
            label = action_button_label(button)
            if category and label not in excluded_labels:
                candidates.append((button, category, label))
        if candidates:
            dialog_label_uses = dialog_label_uses or {}
            priority = ["combat", "crisis", "explore", "loot", "craft", "use_equip", "farm", "shop", "observe", "advance", "navigate"]
            candidates.sort(key=lambda item: (dialog_label_uses.get(item[2], 0),
                priority.index(item[1]) if item[1] in priority else len(priority), item[2]))
            button, category, label = candidates[0]
            return button, category, f"在可見視窗「{label}」輪替可用目的地；此目的地在同一視窗已選 {dialog_label_uses.get(label, 0)} 次。"
        close_result = safe_close_dialog(page)
        if close_result:
            return None, "close_dialog", f"依可見控制關閉視窗：{close_result}。"
        if any(classify_button(buttons.nth(index)) for index in range(buttons.count())) and excluded_labels:
            return None, "observe_blocked", "目前視窗可辨識的控制在相同畫面狀態下皆已無進展，停止重複點擊並記錄阻塞。"
        return None, "observe_blocked", "有未辨識且沒有明確關閉控制的視窗，停止點擊後方介面。"
    buttons = page.get_by_role("button")
    candidates = []
    for index in range(min(buttons.count(), 120)):
        button = buttons.nth(index)
        category = classify_button(button)
        if category:
            label = action_button_label(button)
            if label in excluded_labels:
                continue
            candidates.append((button, category, label))
    if not candidates:
        if excluded_labels:
            return None, "observe_blocked", "目前畫面沒有尚未嘗試的可辨識控制；保留阻塞證據並停止重複點擊。"
        return None, "observe", "沒有可辨識的可見行動；擷取畫面及世界訊息後等待。"
    # Meaningful world/content controls are preferred, but cycle through available families.
    priority = ["combat", "crisis", "explore", "loot", "craft", "use_equip", "farm", "shop", "observe", "advance", "navigate"]
    counts = {name: prior_categories.get(name, 0) for name in priority}
    candidates.sort(key=lambda item: (counts[item[1]], priority.index(item[1]), item[2]))
    button, category, label = candidates[0]
    return button, category, f"觀察頁面文字與可見按鈕「{label}」；選擇已可用且目前較少涵蓋的 {category} 行動。"


def dialog_choice_surface_key(page) -> str | None:
    dialog = open_dialog(page)
    if dialog is None:
        return None
    headings = dialog.locator("h1,h2,h3,[role=heading]").all_inner_texts()
    labels = []
    buttons = dialog.get_by_role("button")
    for index in range(min(buttons.count(), 120)):
        button = buttons.nth(index)
        if classify_button(button):
            labels.append(action_button_label(button))
    if not labels:
        return None
    normalized = json.dumps({"headings": [text.strip()[:120] for text in headings], "labels": labels},
        ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(normalized.encode()).hexdigest()[:24]


def indexeddb_record_projection_js() -> str:
    return f"""const MAX_RECORD_PROJECTION_NODES={INDEXEDDB_RECORD_PROJECTION_NODE_LIMIT};
    const MAX_RECORD_PROJECTION_DEPTH={INDEXEDDB_RECORD_PROJECTION_DEPTH_LIMIT};
    const MAX_RECORD_PROJECTION_TEXT={INDEXEDDB_RECORD_PROJECTION_TEXT_LIMIT};
    const MAX_RECORD_PROJECTION_TEXT_BUDGET={INDEXEDDB_RECORD_PROJECTION_TEXT_BUDGET};
    const MAX_RECORD_PROJECTION_PROPERTIES={INDEXEDDB_RECORD_PROJECTION_PROPERTY_LIMIT};
    const projectIndexedDBRecord=(key,value)=>{{
      let nodes=0,textCharacters=0,truncated=false;const seen=new WeakSet();
      const text=value=>{{const string=String(value);const allowance=Math.max(0,Math.min(MAX_RECORD_PROJECTION_TEXT,MAX_RECORD_PROJECTION_TEXT_BUDGET-textCharacters));const clipped=string.slice(0,allowance);textCharacters+=clipped.length;if(clipped.length<string.length){{truncated=true;return clipped+'[Truncated]';}}return clipped;}};
      const visit=(input,depth)=>{{
        nodes++;if(nodes>MAX_RECORD_PROJECTION_NODES){{truncated=true;return '[NodeLimit]';}}
        if(input===null||typeof input==='boolean')return input;
        if(typeof input==='string')return text(input);
        if(typeof input==='number')return Number.isFinite(input)?input:String(input);
        if(typeof input==='bigint'){{truncated=true;return '[BigInt omitted]';}}
        if(typeof input==='undefined')return '[Undefined]';
        if(typeof input!=='object')return text(typeof input);
        if(depth>=MAX_RECORD_PROJECTION_DEPTH){{truncated=true;return '[DepthLimit]';}}
        if(seen.has(input)){{truncated=true;return '[RepeatedReference]';}}
        if(input instanceof Date)return Number.isNaN(input.getTime())?'[InvalidDate]':input.toISOString();
        if(input instanceof ArrayBuffer)return {{type:'ArrayBuffer',byteLength:input.byteLength}};
        if(ArrayBuffer.isView(input))return {{type:input.constructor.name,byteLength:input.byteLength}};
        if(typeof Blob!=='undefined'&&input instanceof Blob)return {{type:'Blob',size:input.size,mimeType:text(input.type)}};
        seen.add(input);
        let output;
        if(Array.isArray(input)){{
          output=[];const limit=Math.min(input.length,MAX_RECORD_PROJECTION_PROPERTIES);
          for(let index=0;index<limit;index++)output.push(visit(input[index],depth+1));
          if(input.length>limit){{truncated=true;output.push('[PropertyLimit]');}}
        }}else{{
          output={{}};let included=0;
          for(const property in input){{
            if(!Object.prototype.hasOwnProperty.call(input,property))continue;
            if(included>=MAX_RECORD_PROJECTION_PROPERTIES){{truncated=true;output.__truncated__='[PropertyLimit]';break;}}
            output[text(property)]=visit(input[property],depth+1);included++;
          }}
        }}
        seen.delete(input);return output;
      }};
      return {{value:visit({{key,value}},0),truncated,nodes:Math.min(nodes,MAX_RECORD_PROJECTION_NODES),textCharacters}};
    }};"""


def indexeddb_summary(page):
    raw = page.evaluate(f"""async()=>{{
      {indexeddb_record_projection_js()}
      if(!indexedDB.databases)return {{supported:false}};
      const allInfos=await indexedDB.databases(); const infos=allInfos.slice(0,{INDEXEDDB_DATABASE_LIMIT}); const out=[];
      for(const info of infos){{if(!info.name)continue;out.push(await new Promise(resolve=>{{
        const req=indexedDB.open(info.name);req.onupgradeneeded=()=>req.transaction.abort();req.onerror=()=>resolve({{name:info.name,error:String(req.error),stores:{{}}}});
        req.onsuccess=()=>{{const db=req.result;const allStoreNames=[...db.objectStoreNames];const storeNames=allStoreNames.slice(0,{INDEXEDDB_STORE_LIMIT_PER_DATABASE});
          Promise.all(storeNames.map(storeName=>new Promise(done=>{{
            const tx=db.transaction(storeName,'readonly');const store=tx.objectStore(storeName);
            const row={{count:null,sampledRecords:0,sampleLimit:{INDEXEDDB_SAMPLE_LIMIT},serializedSampleBytes:0,serializedSampleCount:0,serializationErrors:0,truncatedSampleRecords:0}};
            let countDone=false,cursorDone=false;
            const finish=()=>{{if(countDone&&cursorDone)done([storeName,row]);}};
            const countRequest=store.count();countRequest.onsuccess=()=>{{row.count=countRequest.result;countDone=true;finish();}};
            countRequest.onerror=()=>{{row.count=null;countDone=true;finish();}};
            const cursorRequest=store.openCursor();cursorRequest.onsuccess=()=>{{
              const cursor=cursorRequest.result;
              if(!cursor||row.sampledRecords>=row.sampleLimit){{cursorDone=true;finish();return;}}
              row.sampledRecords++;
              try{{const projection=projectIndexedDBRecord(cursor.key,cursor.value);if(projection.truncated)row.truncatedSampleRecords++;const serialized=JSON.stringify(projection.value);if(typeof serialized==='string'){{row.serializedSampleBytes+=new TextEncoder().encode(serialized).length;row.serializedSampleCount++;}}else row.serializationErrors++;}}
              catch{{row.serializationErrors++;}}
              if(row.sampledRecords<row.sampleLimit)cursor.continue();else{{cursorDone=true;finish();}}
            }};
            cursorRequest.onerror=()=>{{cursorDone=true;row.serializationErrors++;finish();}};
          }}))).then(rows=>{{const stores=Object.fromEntries(rows);const counts=Object.fromEntries(rows.map(([name,row])=>[name,row.count]));db.close();resolve({{name:info.name,counts,stores,omittedStoreCount:allStoreNames.length-storeNames.length}});}})
            .catch(error=>{{db.close();resolve({{name:info.name,error:String(error),stores:{{}}}});}});
        }};
      }}));}}return {{supported:true,databases:out,omittedDatabaseCount:Math.max(0,allInfos.length-infos.length)}};
    }}""")
    return project_indexeddb_summary(raw)


def project_indexeddb_summary(raw: dict[str, Any]) -> dict[str, Any]:
    """Add bounded UTF-8 JSON value estimates while preserving legacy store counts."""
    if not raw.get("supported"):
        return {"supported": False, "estimateMethod": "unsupported"}
    databases = []
    for database in raw.get("databases", []):
        projected = dict(database)
        stores = {}
        counts = {}
        for name, sample in database.get("stores", {}).items():
            row = dict(sample)
            count = row.get("count")
            sample_count = row.get("serializedSampleCount", 0)
            sample_bytes = row.get("serializedSampleBytes", 0)
            truncated_count = row.get("truncatedSampleRecords", 0)
            serialization_errors = row.get("serializationErrors", 0)
            if isinstance(count, int) and count == 0:
                estimate = 0
            elif isinstance(truncated_count, int) and truncated_count > 0:
                estimate = None
                row["estimateSuppressedReason"] = "sample contains truncated records"
            elif isinstance(serialization_errors, int) and serialization_errors > 0:
                estimate = None
                row["estimateSuppressedReason"] = "sample contains serialization errors"
            elif isinstance(count, int) and count > 0 and isinstance(sample_count, int) and sample_count > 0:
                estimate = round(sample_bytes * count / sample_count)
            else:
                estimate = None
            row["estimatedTotalSerializedRecordBytes"] = estimate
            row["estimationMethod"] = "UTF-8 JSON bounded projection samples by readonly cursor; sample mean multiplied by record count only when untruncated"
            stores[name] = row
            counts[name] = count
        projected["stores"] = stores
        projected["counts"] = counts
        databases.append(projected)
    return {"supported": True,
        "estimateMethod": "Per-store UTF-8 JSON bounded-projection record estimate, not physical IndexedDB or quota bytes; total omitted when any sampled projection is truncated or serialization fails",
        "recordProjectionLimits": {"nodes": INDEXEDDB_RECORD_PROJECTION_NODE_LIMIT,
            "depth": INDEXEDDB_RECORD_PROJECTION_DEPTH_LIMIT, "textCharacters": INDEXEDDB_RECORD_PROJECTION_TEXT_LIMIT,
            "totalTextCharactersPerRecord": INDEXEDDB_RECORD_PROJECTION_TEXT_BUDGET,
            "propertiesPerObjectOrArray": INDEXEDDB_RECORD_PROJECTION_PROPERTY_LIMIT},
        "instrumentationCost": f"Read-only cursor; at most {INDEXEDDB_DATABASE_LIMIT} databases × {INDEXEDDB_STORE_LIMIT_PER_DATABASE} stores/database × {INDEXEDDB_SAMPLE_LIMIT} records/store ({INDEXEDDB_DATABASE_LIMIT * INDEXEDDB_STORE_LIMIT_PER_DATABASE * INDEXEDDB_SAMPLE_LIMIT} bounded projections and serializations) per minute",
        "sampleLimitPerStore": INDEXEDDB_SAMPLE_LIMIT,
        "databaseScanLimit": INDEXEDDB_DATABASE_LIMIT,
        "storeScanLimitPerDatabase": INDEXEDDB_STORE_LIMIT_PER_DATABASE,
        "omittedDatabaseCount": raw.get("omittedDatabaseCount", 0),
        "databases": databases}


def browser_state_summary(save, local_storage_bytes=None):
    """Project V2 save telemetry and explicitly mark unavailable fields."""
    save = save if isinstance(save, dict) else {}
    unsupported = []
    history_limit = 20_000

    def number(value):
        return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None

    def rows(path, value):
        if isinstance(value, list):
            return len(value)
        unsupported.append(path)
        return None

    npcs = save.get("npcs")
    npc_total = rows("npcs", npcs)
    registry_alive = registry_dead = None
    npc_status = "unsupported"
    if isinstance(npcs, list):
        if all(isinstance(npc, dict) and isinstance(npc.get("isAlive"), bool) for npc in npcs):
            registry_alive = sum(npc["isAlive"] for npc in npcs)
            registry_dead = len(npcs) - registry_alive
            npc_status = "supported"
        else:
            unsupported.append("npcs.isAlive")
            npc_status = "partial"
    history_rows = save.get("history")
    history_count = rows("history", history_rows)
    historical_deaths = None
    history_at_cap = None
    if isinstance(history_rows, list):
        historical_deaths = sum(1 for event in history_rows if isinstance(event, dict)
            and event.get("type") == "npc.died" and event.get("category") == "npc")
        history_at_cap = len(history_rows) >= history_limit
    else:
        unsupported.append("history.npc.died_events")
    npc_population_status = "supported" if npc_status == "supported" and historical_deaths is not None else ("partial" if npc_total is not None or historical_deaths is not None else "unsupported")

    settlement_source = save.get("settlement")
    settlement = {}
    settlement_fields = ("name", "stage", "capacity", "food", "prosperity", "safety", "infrastructure", "growth")
    settlement_present = 0
    for key in settlement_fields:
        value = settlement_source.get(key) if isinstance(settlement_source, dict) else None
        value = value if isinstance(value, str) else number(value)
        settlement[key] = value
        if value is None:
            unsupported.append(f"settlement.{key}")
        else:
            settlement_present += 1
    buildings = settlement_source.get("buildings") if isinstance(settlement_source, dict) else None
    settlement["buildingCount"] = len(buildings) if isinstance(buildings, list) else None
    if settlement["buildingCount"] is None:
        unsupported.append("settlement.buildings")
    settlement["status"] = "supported" if settlement_present == len(settlement_fields) and settlement["buildingCount"] is not None else ("partial" if settlement_present or settlement["buildingCount"] is not None else "unsupported")

    characters = save.get("characters")
    rows("characters", characters)
    character_gold = None
    if isinstance(characters, list):
        if all(isinstance(row, dict) and number(row.get("gold")) is not None for row in characters):
            character_gold = sum(row["gold"] for row in characters)
        else:
            unsupported.append("characters.gold")
    active_gold = None
    active_id = save.get("activeCharacterId")
    if isinstance(characters, list) and isinstance(active_id, str):
        active = next((row for row in characters if isinstance(row, dict) and row.get("id") == active_id), None)
        if isinstance(active, dict):
            active_gold = number(active.get("gold"))
    if active_gold is None:
        unsupported.append("activeCharacter.gold")
    npc_gold = None
    if isinstance(npcs, list):
        if all(isinstance(row, dict) and number(row.get("gold")) is not None for row in npcs):
            npc_gold = sum(row["gold"] for row in npcs)
        else:
            unsupported.append("npcs.gold")
    total_gold = character_gold + npc_gold if character_gold is not None and npc_gold is not None else None
    economy_values = (active_gold, character_gold, npc_gold)
    economy = {"activeCharacterGold": active_gold, "allCharacterGold": character_gold, "npcGold": npc_gold,
        "totalGold": total_gold, "status": "supported" if all(v is not None for v in economy_values) else ("partial" if any(v is not None for v in economy_values) else "unsupported")}

    threat_source = save.get("threat")
    threat = {}
    threat_fields = (("level", "threatLevel"), ("monsterPopulation", "monsterPopulation"), ("growthRate", "growthRate"), ("warningLevel", "warningLevel"))
    threat_present = 0
    for output, source in threat_fields:
        value = number(threat_source.get(source)) if isinstance(threat_source, dict) else None
        threat[output] = value
        if value is None:
            unsupported.append(f"threat.{source}")
        else:
            threat_present += 1
    threat["status"] = "supported" if threat_present == len(threat_fields) else ("partial" if threat_present else "unsupported")

    boss_alive = threat_source.get("bossAlive") if isinstance(threat_source, dict) else None
    boss_alive = boss_alive if isinstance(boss_alive, bool) else None
    boss_progress = number(threat_source.get("bossProgress")) if isinstance(threat_source, dict) else None
    camp_level = number(threat_source.get("campLevel")) if isinstance(threat_source, dict) else None
    for name, value in (("threat.bossAlive", boss_alive), ("threat.bossProgress", boss_progress), ("threat.campLevel", camp_level)):
        if value is None:
            unsupported.append(name)
    crisis = save.get("regionalCrisis")
    crisis_phase = crisis.get("phase") if isinstance(crisis, dict) and isinstance(crisis.get("phase"), str) else None
    if crisis_phase is None:
        unsupported.append("regionalCrisis.phase")
    boss_values = (boss_alive, boss_progress, camp_level, crisis_phase)
    boss = {"alive": boss_alive, "progress": boss_progress, "campLevel": camp_level,
        "regionalCrisisPhase": crisis_phase, "status": "supported" if all(v is not None for v in boss_values) else ("partial" if any(v is not None for v in boss_values) else "unsupported")}

    event_count = rows("events", save.get("events"))
    journal = save.get("playJournal")
    journal_count = rows("playJournal.pending", journal.get("pending") if isinstance(journal, dict) else None)
    if not isinstance(local_storage_bytes, int) or isinstance(local_storage_bytes, bool) or local_storage_bytes < 0:
        local_storage_bytes = None
        unsupported.append("saveBytes")

    groups = (npc_status, settlement["status"], economy["status"], threat["status"], boss["status"])
    status = "supported" if not unsupported else ("partial" if any(value != "unsupported" for value in groups) else "unsupported")
    return {"status": status,
        "npcPopulation": {"liveRegistryTotal": npc_total, "registryAlive": registry_alive,
            "registryDead": registry_dead, "historicalDeaths": historical_deaths,
            "historicalDeathBasis": "retained_history_npc.died_events",
            "historicalDeathScope": "retained_history_only", "historyLimit": history_limit,
            "historyAtCap": history_at_cap, "historicalDeathsMayBeIncomplete": True,
            "status": npc_population_status},
        "settlement": settlement, "economy": economy, "threat": threat, "boss": boss,
        "eventCount": event_count, "historyCount": history_count, "journalPendingCount": journal_count,
        "saveBytes": local_storage_bytes, "unsupportedFields": sorted(set(unsupported))}


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
    browser_state = browser_state_summary(save, len((raw or "").encode()))
    row = {
        "atUTC": now_utc(),
        "elapsedRealSeconds": round(time.monotonic() - status["startedMonotonic"], 2),
        "reason": reason,
        "viewport": page.evaluate("() => ({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth})"),
        "url": page.url,
        "visibleText": visible_text(page),
        "openDialogs": page.locator("dialog[open]").all_inner_texts(),
        "localStorageBytes": len((raw or "").encode()),
        "save": {"worldTime": (save or {}).get("worldTime"), "historyCount": browser_state["historyCount"],
                 "eventCount": browser_state["eventCount"], "journalPending": browser_state["journalPendingCount"],
                 "contentCandidates": content_projection(save or {})[:250], "saveParseError": (save or {}).get("__parseError")},
        "browserState": browser_state,
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


def perform_turn(page, status, run_dir, turn, heartbeat=None):
    pulse = lambda stage: heartbeat(turn, stage) if heartbeat else None
    pulse("turn_start")
    pulse("read_before_state")
    before = read_save(page) or {}
    pulse("read_visible_text")
    text = visible_text(page)
    pulse("fingerprint_before_state")
    before_state_key = observable_action_state_key(page.url, visible_surface_fingerprint(page),
        dialog_surface_fingerprint(page), before, visible_control_fingerprint(page))
    dialog_key = dialog_choice_surface_key(page)
    dialog_uses = status.get("dialogActionUseCounts", {}).get(dialog_key, {}) if dialog_key else None
    excluded_labels = update_stalled_controls(status, before_state_key)
    before_candidates = content_projection(before)
    pulse("choose_visible_action")
    button, category, motivation = choose_visible_action(page, turn, status["actionCategoryCounts"], excluded_labels,
        dialog_label_uses=dialog_uses)
    blocked_modal_key = unrecognized_blocked_modal_fingerprint(page, category) if button is None else None
    row = {"atUTC": now_utc(), "turn": turn, "lane": status["mode"], "policy": "runner_driven_agent_heuristic_semantic_visible_control_v1",
           "policyExecution": "runner-driven heuristic Agent Exploratory QA; no model inference; not a human tester",
           "visibleCue": text[:1800], "choice": category, "motivation": motivation,
           "candidateContentBefore": before_candidates[:120], "stateInjected": False, "controlledFixture": False,
           "urlBefore": page.url}
    if button is not None:
        row["buttonText"] = action_button_label(button)
        if dialog_key:
            row["dialogSurfaceKey"] = dialog_key
        interaction_started = time.monotonic()
        pulse("click_visible_control")
        button.click(timeout=5000)
        pulse("post_click_settle")
        page.wait_for_timeout(180)
        row["visibleActionLatencyMs"] = round((time.monotonic() - interaction_started) * 1000, 2)
    if category == "advance" and not page.locator("dialog[open]").count():
        # A visible wait may be a single world-day action. Do not call engine or clock APIs.
        pass
    pulse("read_after_state")
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
    after_state_key = observable_action_state_key(page.url, visible_surface_fingerprint(page),
        dialog_surface_fingerprint(page), after, visible_control_fingerprint(page))
    if button is not None:
        progressed = action_made_progress(before_state_key, after_state_key, category,
            before.get("worldTime"), after.get("worldTime"))
        row["noProgress"] = not progressed
        if row["noProgress"]:
            update_stalled_controls(status, before_state_key, row["buttonText"], progress=False)
            row["stalledForStateKey"] = before_state_key
            row["stalledControlExcludedNextTurn"] = True
        else:
            update_stalled_controls(status, after_state_key, progress=True)
            row["stalledControlExcludedNextTurn"] = False
    elif category == "observe_blocked":
        row["noProgress"] = True
        row["blockedByNoProgressControls"] = sorted(excluded_labels)
    pulse("write_action_record")
    if blocked_modal_key is not None or status.get("blockedModalFingerprint") is not None:
        record_unrecognized_blocked_modal_turn(status, blocked_modal_key, row,
            lambda action: record_action(status, run_dir, action))
    else:
        record_action(status, run_dir, row)
    pulse("turn_complete")


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


def selected_world_speed(page):
    for speed, label in ((0, "暫停"), (1, "×1"), (5, "×5"), (20, "×20")):
        button = page.get_by_role("button", name=label, exact=True)
        if button.get_attribute("aria-pressed") == "true":
            return speed
    raise AssertionError("Could not determine selected world speed from the visible speed controls")


def restore_world_speed(page, speed):
    label = "暫停" if speed == 0 else f"×{speed}"
    button = page.get_by_role("button", name=label, exact=True)
    expect(button).to_be_visible(timeout=5000)
    if button.get_attribute("aria-pressed") != "true":
        button.click()
    expect(button).to_have_attribute("aria-pressed", "true")


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
    world_speed_before = selected_world_speed(page)
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
    loaded_world_speed = selected_world_speed(page)
    ensure_paused(page)
    runtime_saved = visible_save(page)
    proof = reload_payload_proof(before, loaded, runtime_saved)
    after_raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    row = {"atUTC": now_utc(), "reason": reason, "lane": "NORMAL_FRESH", "stateInjected": False,
        "worldSpeedBeforeReload": world_speed_before,
        "worldSpeedAfterReload": loaded_world_speed,
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
    status["lastNormalReload"] = {key: row[key] for key in ("atUTC", "reason", "worldSpeedBeforeReload", "worldSpeedAfterReload", "storageRetainedAtLoad", "runtimeSavedMatchesBaseline", "storageRetentionDifferences", "runtimeReloadDifferences", "worldTimeBefore", "worldTimeAfterLoad")}
    if not proof["accepted"]:
        raise AssertionError("Reload payload mismatch: storage fields "
            f"{sorted(proof['storageRetentionDifferences'])}; post-load runtime fields "
            f"{sorted(proof['runtimeReloadDifferences'])}")
    restore_world_speed(page, world_speed_before)
    row["worldSpeedRestored"] = selected_world_speed(page)
    append_jsonl(run_dir / "reloads.jsonl", {"atUTC": now_utc(), "stage": "speed-restored",
        "lane": "NORMAL_FRESH", "reason": reason, "worldSpeed": row["worldSpeedRestored"],
        "stateInjected": False})
    status["lastNormalReload"]["worldSpeedRestored"] = row["worldSpeedRestored"]
    return row


def ensure_final_normal_reload(page, run_dir, status, mode, requested_seconds, elapsed_seconds, turn, heartbeat):
    """Complete a required ordinary UI reload if a lane ended before its first scheduled one."""
    if mode == "regression" or status.get("normalReloadCount", 0) > 0 or elapsed_seconds < requested_seconds:
        return False
    heartbeat(turn, "final_save_reload")
    reason = "short-content-agent-smoke-final-save-reload" if mode == "content-agent" and requested_seconds < 300 else "final-normal-save-reload"
    normal_save_reload(page, run_dir, status, reason)
    snapshot(page, run_dir, status, f"normal-final-reload-turn-{turn}")
    return True


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
    wait_for_world_time_advance(page, before_time, timeout=10000)
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


def close_runner_resources(cdp, context, browser, playwright, status):
    """Close browser resources while Playwright's event loop is still alive.

    Cleanup failures are recorded instead of escaping the runner's finalizer, so
    they cannot mask the original check failure or prevent result publication.
    """
    for name, resource, method in (
        ("cdp", cdp, "detach"),
        ("context", context, "close"),
        ("browser", browser, "close"),
    ):
        if resource is None:
            continue
        try:
            getattr(resource, method)()
        except Exception as exc:
            status.setdefault("cleanupErrors", []).append(
                f"{name}.{method}: {type(exc).__name__}: {exc}")
    if playwright is not None:
        try:
            playwright.stop()
        except Exception as exc:
            status.setdefault("cleanupErrors", []).append(
                f"playwright.stop: {type(exc).__name__}: {exc}")


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
    seconds = args.seconds if args.seconds is not None else MODE_DEFAULT_DURATION_SECONDS[args.mode]
    if seconds < min_seconds or seconds > max_seconds:
        parser.error(f"{args.mode} duration must be {min_seconds}..{max_seconds} seconds")
    run_dir = args.run_dir.resolve()
    validate_run_directory(run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)
    write_runner_heartbeat(run_dir, 0, "runner_preflight")
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
    status: dict[str, Any] = {"schema": "phase7-browser-result-v1", "status": "RUNNING", "mode": args.mode,
        "runId": args.run_id, "startUTC": now_utc(), "startLocalTaipei": datetime.now().astimezone().isoformat(),
        "execution": {"modelRequested": args.execution_model, "effortRequested": args.execution_effort,
                      "runtimeTelemetry": "unavailable", "policy": "runner_driven_agent_heuristic_semantic_visible_control_v1", "modelInference": False,
                      "humanTester": False, "humanValidation": "DEFERRED"},
        "durationSecondsRequested": seconds, "normalLane": "NORMAL_FRESH", "controlledFixturesExcludedFromNaturalCoverage": True,
        "sourceBefore": before, "buildStatusPath": str(BUILD_PATH), "buildStatusSha256": digest(BUILD_PATH),
        "buildStatus": build, "releasePath": str(RELEASE_PATH), "releaseSha256": hashlib.sha256(release_bytes).hexdigest(),
        "release": release, "actionCount": 0, "actionTail": [], "actionCategoryCounts": {},
        "noProgressActionCount": 0, "noProgressActionTail": [], "noProgressStateKey": None, "noProgressControls": [],
        "checkpointCount": 0, "checkpointTail": [], "normalReloadCount": 0,
        "screenshots": [], "errorCounts": {}, "errorTails": {}, "browserEventCounts": {}, "browserEventTails": {},
        "profilingLimitationsTail": []}
    status["startedMonotonic"] = time.monotonic()
    heartbeat = lambda turn, stage: write_runner_heartbeat(run_dir, turn, stage)
    context = browser = playwright = page = cdp = None
    try:
        heartbeat(0, "runner_startup")
        heartbeat(0, "playwright_start")
        playwright = sync_playwright().start()
        heartbeat(0, "chromium_launch")
        browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        status["chromiumVersion"] = browser.version
        context = browser.new_context(viewport={"width": 1440, "height": 960}, reduced_motion="reduce")
        page = context.new_page()
        heartbeat(0, "page_created")
        attach_early_capture(page)
        wire_errors(page, status, run_dir)
        heartbeat(0, "verify_playable_opening")
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
            perform_turn(page, status, run_dir, turn, heartbeat=heartbeat)
            now = time.monotonic()
            if now >= next_checkpoint:
                heartbeat(turn, "minute_checkpoint")
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
                heartbeat(turn, "save_reload")
                normal_save_reload(page, run_dir, status, "scheduled-stress-save-reload" if args.mode != "regression" else "mandatory-regression-save-reload")
                snapshot(page, run_dir, status, f"normal-reload-turn-{turn}")
                next_reload = elapsed + 300
        elapsed = time.monotonic() - status["startedMonotonic"]
        ensure_final_normal_reload(page, run_dir, status, args.mode, seconds, elapsed, turn, heartbeat)
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
        close_runner_resources(cdp, context, browser, playwright, status)
        if status.get("cleanupErrors") and status["status"].startswith(("PASS", "COMPLETE")):
            status["status"] = "FAILED_CLEANUP"
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
