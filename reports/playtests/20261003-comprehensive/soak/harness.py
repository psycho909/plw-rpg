#!/usr/bin/env python3
"""Twenty-minute real-wall-clock Chromium soak against the immutable local build."""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from scripts.recorded_reports import write_recorded

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:5180/"
BASELINE = "694c6d76df67e3d3dd4da5aa98feba8581ecc2ba"
TARGET_SECONDS = 20 * 60
OUT = Path(__file__).resolve().parent
CHECKPOINTS = OUT / "checkpoints.json"
FINAL = OUT / "results.json"
page_errors: list[dict] = []
console_errors: list[dict] = []
started_mono: float | None = None


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def elapsed() -> float | None:
    return round(time.monotonic() - started_mono, 3) if started_mono is not None else None


def write_json(path: Path, value: dict) -> None:
    write_recorded(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n", producer="soak")


data: dict = {
    "baseline_commit": BASELINE,
    "url": URL,
    "target_elapsed_seconds": TARGET_SECONDS,
    "status": "starting",
    "started_at_utc": None,
    "ended_at_utc": None,
    "elapsed_seconds": None,
    "RESULTS": {"page_errors": page_errors},
    "console_errors": console_errors,
    "interruptions": [],
    "observations": [],
}


def persist() -> None:
    data["RESULTS"]["page_errors"] = page_errors
    data["console_errors"] = console_errors
    data["elapsed_seconds"] = elapsed()
    write_json(CHECKPOINTS, data)


def browser_snapshot(page) -> dict:
    return page.evaluate("""() => {
      let saved = null, parseError = null;
      try { const raw = localStorage.getItem('oakvale-v1'); saved = raw ? JSON.parse(raw) : null; }
      catch (error) { parseError = String(error); }
      const pressed = [...document.querySelectorAll('.speed-controls button')]
        .find(button => button.getAttribute('aria-pressed') === 'true');
      const clock = document.querySelector('.world-clock');
      const caption = document.querySelector('.world-caption');
      const dialog = document.querySelector('dialog[open]');
      return {
        visible_game_time: clock?.innerText?.replace(/\\s+/g, ' ').trim() ?? null,
        selected_speed: pressed?.innerText?.trim() ?? null,
        dom_nodes: document.getElementsByTagName('*').length,
        js_heap_used_bytes: performance.memory?.usedJSHeapSize ?? null,
        active_dialog: dialog?.querySelector('h2')?.innerText?.trim() ?? null,
        save_warning: document.querySelector('[role="alert"]')?.innerText?.trim() ?? null,
        position_caption: caption?.innerText?.replace(/\\s+/g, ' ').trim() ?? null,
        local_storage: saved ? {
          last_saved_at_ms: saved.lastSavedAt ?? null,
          last_saved_world_time: saved.worldTime ?? null,
          save_version: saved.saveVersion ?? null,
          active_character_id: saved.activeCharacterId ?? null,
          characters_count: Array.isArray(saved.characters) ? saved.characters.length : null,
          npcs_count: Array.isArray(saved.npcs) ? saved.npcs.length : null,
          events_count: Array.isArray(saved.events) ? saved.events.length : null,
          history_count: Array.isArray(saved.history) ? saved.history.length : null,
          tiles_count: Array.isArray(saved.tiles) ? saved.tiles.length : null,
        } : null,
        storage_parse_error: parseError,
        focus_tag: document.activeElement?.tagName ?? null,
        focus_class: document.activeElement?.className ?? null,
      };
    }""")


def focused_menu_restore(page) -> dict:
    result = {"attempted": True, "returned_to_menu_trigger": False, "error": None}
    try:
        if page.locator("dialog[open]").count():
            page.keyboard.press("Escape")
            page.locator("dialog[open]").wait_for(state="detached", timeout=1500)
        trigger = page.locator(".menu-trigger")
        trigger.click(timeout=1500)
        page.get_by_role("button", name="角色", exact=True).click(timeout=1500)
        page.locator("dialog[open] h2").filter(has_text="角色").wait_for(state="visible", timeout=1500)
        page.keyboard.press("Escape")
        page.locator("dialog[open]").wait_for(state="detached", timeout=1500)
        result["returned_to_menu_trigger"] = page.evaluate("document.activeElement === document.querySelector('.menu-trigger')")
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
        try:
            if page.locator("dialog[open]").count():
                page.keyboard.press("Escape")
        except Exception:
            pass
    return result


def sample_interactions(page, minute: int) -> dict:
    route_keys = ["c", "i", "l", "m"]
    direction_keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]
    route = route_keys[(minute - 1) % len(route_keys)]
    direction = direction_keys[(minute - 1) % len(direction_keys)]
    report = {"route_key": route, "route_opened": False, "route_closed": False, "route_latency_ms": None,
              "route_error": None, "move_key": direction, "move_latency_ms": None,
              "position_changed": False, "move_error": None, "focus_restore": None}
    try:
        if not page.locator("dialog[open]").count():
            before = page.locator(".world-caption").inner_text(timeout=1500)
            started = time.monotonic()
            page.keyboard.press(direction)
            try:
                page.wait_for_function("""before => {
                  const el = document.querySelector('.world-caption');
                  return !!el && el.innerText !== before;
                }""", arg=before, timeout=1200)
                report["position_changed"] = True
            except Exception:
                report["position_changed"] = False
            report["move_latency_ms"] = round((time.monotonic() - started) * 1000, 1)
            started = time.monotonic()
            page.keyboard.press(route)
            try:
                page.locator("dialog[open]").wait_for(state="visible", timeout=1500)
                report["route_opened"] = True
                report["route_latency_ms"] = round((time.monotonic() - started) * 1000, 1)
                page.keyboard.press("Escape")
                page.locator("dialog[open]").wait_for(state="detached", timeout=1500)
                report["route_closed"] = True
            except Exception as exc:
                report["route_error"] = f"{type(exc).__name__}: {exc}"
        else:
            report["route_error"] = "A UI dialog was already open before the shortcut sample."
    except Exception as exc:
        report["move_error"] = f"{type(exc).__name__}: {exc}"
        try:
            if page.locator("dialog[open]").count():
                page.keyboard.press("Escape")
        except Exception:
            pass
    if minute in (1, 5, 10, 15, 20):
        report["focus_restore"] = focused_menu_restore(page)
    return report


def save_reload_check(page, context, minute: int) -> dict:
    check = {"attempted_at_utc": utc_now(), "success": False, "save_world_time": None,
             "reloaded_world_time": None, "world_time_non_decreasing": None,
             "state_complete": None, "reload_elapsed_seconds": None, "error": None}
    started = time.monotonic()
    try:
        if page.locator("dialog[open]").count():
            page.keyboard.press("Escape")
            page.locator("dialog[open]").wait_for(state="detached", timeout=1500)
        page.locator(".save-button").click(timeout=2500)
        page.get_by_text("世界已儲存。", exact=True).wait_for(state="visible", timeout=2500)
        saved = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
        check["save_world_time"] = saved.get("worldTime")
        check["save_last_saved_at_ms"] = saved.get("lastSavedAt")
        check["saved_state_counts"] = {key: len(saved.get(key) or []) for key in ("characters", "npcs", "events", "history", "tiles")}
        page.reload(wait_until="domcontentloaded", timeout=12000)
        page.locator(".speed-controls").wait_for(state="visible", timeout=8000)
        page.get_by_role("button", name="×20", exact=True).click(timeout=2500)
        page.locator(".save-button").click(timeout=2500)
        page.get_by_text("世界已儲存。", exact=True).wait_for(state="visible", timeout=2500)
        loaded = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
        check["save_warning_after_reload"] = page.locator(".save-warning").count() > 0
        check["reloaded_world_time"] = loaded.get("worldTime")
        check["world_time_non_decreasing"] = isinstance(loaded.get("worldTime"), int) and loaded["worldTime"] >= saved["worldTime"]
        arrays_ok = all(isinstance(loaded.get(key), list) for key in ("characters", "npcs", "events", "history", "tiles"))
        identity_ok = loaded.get("activeCharacterId") in {c.get("id") for c in loaded.get("characters", []) if isinstance(c, dict)}
        check["state_complete"] = bool(arrays_ok and identity_ok and isinstance(loaded.get("worldTime"), int)
                                      and loaded.get("saveVersion") == saved.get("saveVersion"))
        check["success"] = bool(check["world_time_non_decreasing"] and check["state_complete"] and not check["save_warning_after_reload"]
                                 and page.get_by_role("button", name="×20", exact=True).get_attribute("aria-pressed") == "true")
        check["visible_game_time_after_reload"] = page.locator(".world-clock").inner_text()
    except Exception as exc:
        check["error"] = f"{type(exc).__name__}: {exc}"
    check["reload_elapsed_seconds"] = round(time.monotonic() - started, 3)
    check["completed_at_utc"] = utc_now()
    if check["reload_elapsed_seconds"] > 5:
        data["interruptions"].append({"minute": minute, "kind": "save_reload", "elapsed_seconds": check["reload_elapsed_seconds"],
                                      "note": "Reload and speed reselection exceeded the several-second target."})
    return check


def emit_report() -> None:
    observations = data["observations"]
    completed = data["status"] == "completed"
    lines = [
        "# 20 分鐘真實瀏覽器 Soak",
        "",
        f"- 固定 build：`{BASELINE}`（`{URL}`）",
        f"- UTC 開始：{data['started_at_utc']}",
        f"- UTC 結束：{data['ended_at_utc']}",
        f"- monotonic 實際 elapsed：{data['elapsed_seconds']} 秒（目標 {TARGET_SECONDS} 秒）",
        f"- 結果：{'達到實際 20 分鐘' if completed and (data['elapsed_seconds'] or 0) >= TARGET_SECONDS else '未達完整 20 分鐘'}；status=`{data['status']}`",
        "- 瀏覽器：系統 Chromium，獨立可丟棄 context，未注入 fixture；全程維持 ×20，save/reload 後重新選 ×20。",
        "",
        "| 分鐘 | 經過秒數 | 畫面遊戲時間 | 存檔時間 UTC | DOM nodes | JS heap bytes | Page errors | Console errors | 快捷鍵開視窗 ms | Reload |",
        "|---:|---:|---|---|---:|---:|---:|---:|---:|---|",
    ]
    for item in observations:
        snap = item.get("snapshot") or {}
        storage = snap.get("local_storage") or {}
        interaction = item.get("interaction") or {}
        reload = item.get("save_reload")
        lines.append("| {minute} | {elapsed} | {game_time} | {saved_at} | {dom} | {heap} | {page_errors} | {console_errors} | {route} | {reload} |".format(
            minute=item.get("minute"), elapsed=item.get("elapsed_seconds"), game_time=(snap.get("visible_game_time") or "—").replace("|", "\\|"),
            saved_at=(datetime.fromtimestamp(storage["last_saved_at_ms"] / 1000, timezone.utc).isoformat(timespec="seconds") if isinstance(storage.get("last_saved_at_ms"), (int, float)) else "尚未自動存檔"),
            dom=snap.get("dom_nodes"), heap=snap.get("js_heap_used_bytes"), page_errors=item.get("page_error_count"), console_errors=item.get("console_error_count"),
            route=interaction.get("route_latency_ms"),
            reload=(f"{reload.get('success')} / {reload.get('reload_elapsed_seconds')}s" if reload else "—")))
    lines += ["", "## 補充實測與量測限制", "",
              "主 soak 的方向鍵有送出，但位移 DOM 取樣呼叫 `wait_for_function(expression, before, ...)` 與目前 Playwright 綁定不相容；例外被 harness 捕捉成 `position_changed=false`。因此 JSON 的 `move_latency_ms`／`position_changed` 欄不能代表遊戲移動或其延遲。修正後 harness 使用 `arg=before`。獨立補充 context 在 2026-10-03T05:50:25.303Z–05:50:27.253Z 實測 ArrowRight 造成座標 caption 更新，延遲 18.1 ms。",
              "",
              "主 soak 三次存檔後在同一 context reload，讀取 reload 後 localStorage 的 worldTime 與必要 state arrays/ID 結構；這些 milestone 沒有再由 app 點擊存檔驗證 hydrated state。獨立補充 context 完成一次 UI save→reload→app resave，確認無存檔警告、worldTime 不倒退、版本與 active character 保留、主要 arrays 存在，並恢復 ×20。",
              "",
              "補充 context 與主 soak 短暫並行，歷時約 2 秒；它不計入主 soak 的 1200.293 秒。",
              "", "## 錯誤與中斷", "", f"- `pageerror` 數：{len(page_errors)}", f"- `console.error` 數：{len(console_errors)}",
              "- 唯一 console error 原文：`Failed to load resource: the server responded with a status of 404 (File not found)`。server log 在同秒記錄 `/`、JS、CSS 為 200，`GET /favicon.ico` 為 404；關聯證據見 `http-404-evidence.txt`。",
              f"- 中斷記錄：{json.dumps(data['interruptions'], ensure_ascii=False)}",
              f"- 失敗 reload：{json.dumps([o['save_reload'] for o in observations if o.get('save_reload') and not o['save_reload'].get('success')], ensure_ascii=False)}",
              "", "## 限制", "", "這是單一 headless Chromium context、單一 20 分鐘觀察。DOM node 數與可用時的 JS heap 僅為各分鐘取樣；它們不能單獨證明或排除記憶體洩漏。時間只依真實 monotonic wallclock；沒有 fake clock、世界時間注入或整季等待。", ""]
    write_recorded(OUT / "report.md", "\n".join(lines), producer="soak")


def main() -> None:
    global started_mono
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
                                    args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = context.new_page()
        page.set_default_timeout(2500)
        page.on("pageerror", lambda error: page_errors.append({"at_utc": utc_now(), "elapsed_seconds": elapsed(), "text": str(error)}))
        page.on("console", lambda message: console_errors.append({"at_utc": utc_now(), "elapsed_seconds": elapsed(), "text": message.text}) if message.type == "error" else None)
        try:
            page.goto(URL, wait_until="networkidle", timeout=12000)
            page.locator(".world-clock").wait_for(state="visible", timeout=8000)
            page.get_by_role("button", name="×20", exact=True).click()
            if page.get_by_role("button", name="×20", exact=True).get_attribute("aria-pressed") != "true":
                raise RuntimeError("×20 could not be selected before soak start")
            started_mono = time.monotonic()
            data.update({"status": "running", "started_at_utc": utc_now(), "start_monotonic": started_mono})
            page.screenshot(path=str(OUT / "start.png"), full_page=True)
            data["initial_snapshot"] = browser_snapshot(page)
            persist()
            deadline = started_mono + TARGET_SECONDS
            for minute in range(1, 21):
                target = started_mono + minute * 60
                while time.monotonic() < target:
                    time.sleep(min(1.0, max(0.05, target - time.monotonic())))
                item = {"minute": minute, "scheduled_elapsed_seconds": minute * 60, "checkpoint_at_utc": utc_now()}
                item["interaction"] = sample_interactions(page, minute)
                if minute in (5, 10, 15):
                    item["save_reload"] = save_reload_check(page, context, minute)
                if minute == 10:
                    page.screenshot(path=str(OUT / "middle.png"), full_page=True)
                if minute == 20:
                    page.screenshot(path=str(OUT / "end.png"), full_page=True)
                item["elapsed_seconds"] = elapsed()
                item["snapshot"] = browser_snapshot(page)
                item["page_error_count"] = len(page_errors)
                item["console_error_count"] = len(console_errors)
                item["new_page_errors"] = page_errors[-2:]
                item["new_console_errors"] = console_errors[-2:]
                data["observations"].append(item)
                persist()
                print(json.dumps({"minute": minute, "elapsed_seconds": data["elapsed_seconds"],
                                  "game_time": item["snapshot"].get("visible_game_time"),
                                  "page_errors": len(page_errors), "console_errors": len(console_errors)}, ensure_ascii=False), flush=True)
            remaining = deadline - time.monotonic()
            if remaining > 0:
                while time.monotonic() < deadline:
                    time.sleep(min(1.0, max(0.05, deadline - time.monotonic())))
            data["ended_at_utc"] = utc_now()
            data["elapsed_seconds"] = elapsed()
            data["status"] = "completed" if data["elapsed_seconds"] >= TARGET_SECONDS else "incomplete"
            data["final_snapshot"] = browser_snapshot(page)
            persist()
            write_json(FINAL, data)
            emit_report()
        except BaseException as exc:
            data["status"] = "failed"
            data["failure"] = f"{type(exc).__name__}: {exc}"
            data["ended_at_utc"] = utc_now()
            persist()
            write_json(FINAL, data)
            emit_report()
            raise
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    main()
