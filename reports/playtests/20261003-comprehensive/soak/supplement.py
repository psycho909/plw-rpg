#!/usr/bin/env python3
"""Short independent real-UI check for the soak harness's corrected measurements."""
import json
import time
from datetime import datetime, timezone
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from scripts.recorded_reports import write_recorded
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:5180/"
result = {"started_at_utc": datetime.now(timezone.utc).isoformat(timespec="milliseconds"), "url": URL,
          "fixtures_used": False, "requests": [], "responses_ge_400": [], "page_errors": [], "console_errors": [], "checks": {}}

def stamp():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
                                args=["--no-sandbox", "--disable-dev-shm-usage"])
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    page.set_default_timeout(4000)
    page.on("request", lambda request: result["requests"].append({"url": request.url, "resource_type": request.resource_type}))
    page.on("response", lambda response: result["responses_ge_400"].append({"url": response.url, "status": response.status}) if response.status >= 400 else None)
    page.on("pageerror", lambda error: result["page_errors"].append({"at_utc": stamp(), "text": str(error)}))
    page.on("console", lambda message: result["console_errors"].append({"at_utc": stamp(), "text": message.text}) if message.type == "error" else None)
    try:
        page.goto(URL, wait_until="networkidle", timeout=12000)
        page.locator(".world-clock").wait_for(state="visible")
        page.locator(".save-button").click()
        page.get_by_text("世界已儲存。", exact=True).wait_for(state="visible")
        before = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
        result["checks"]["initial_ui_save"] = {"world_time": before["worldTime"], "last_saved_at_ms": before["lastSavedAt"],
                                                 "character_count": len(before.get("characters", [])), "npc_count": len(before.get("npcs", []))}
        page.reload(wait_until="domcontentloaded", timeout=12000)
        page.locator(".world-clock").wait_for(state="visible", timeout=8000)
        page.get_by_role("button", name="×20", exact=True).click()
        page.locator(".save-button").click()
        page.get_by_text("世界已儲存。", exact=True).wait_for(state="visible")
        after = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
        result["checks"]["reloaded_state_app_resaved"] = {
            "save_warning_visible": page.locator(".save-warning").count() > 0,
            "world_time_non_decreasing": after.get("worldTime", -1) >= before["worldTime"],
            "save_version_preserved": after.get("saveVersion") == before.get("saveVersion"),
            "active_character_present": after.get("activeCharacterId") in {c.get("id") for c in after.get("characters", []) if isinstance(c, dict)},
            "characters_count": len(after.get("characters", [])), "npcs_count": len(after.get("npcs", [])),
            "events_count": len(after.get("events", [])), "history_count": len(after.get("history", [])),
            "tiles_count": len(after.get("tiles", [])), "speed_selected": page.get_by_role("button", name="×20", exact=True).get_attribute("aria-pressed"),
        }
        start_move = time.monotonic()
        old_caption = page.locator(".world-caption").inner_text()
        page.keyboard.press("ArrowRight")
        try:
            page.wait_for_function("before => document.querySelector('.world-caption')?.innerText !== before", arg=old_caption, timeout=2000)
            changed = True
        except Exception:
            changed = page.locator(".world-caption").inner_text() != old_caption
        result["checks"]["corrected_move_sample"] = {"key": "ArrowRight", "position_caption_changed": changed,
                                                        "latency_ms": round((time.monotonic() - start_move) * 1000, 1)}
        result["checks"]["all_reload_checks_pass"] = bool(
            not result["checks"]["reloaded_state_app_resaved"]["save_warning_visible"]
            and result["checks"]["reloaded_state_app_resaved"]["world_time_non_decreasing"]
            and result["checks"]["reloaded_state_app_resaved"]["save_version_preserved"]
            and result["checks"]["reloaded_state_app_resaved"]["active_character_present"])
    except Exception as error:
        result["failure"] = f"{type(error).__name__}: {error}"
    finally:
        context.close()
        browser.close()
        result["ended_at_utc"] = stamp()
        write_recorded(OUT / "supplement.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="soak-supplement")
        print(json.dumps(result, ensure_ascii=False))
