#!/usr/bin/env python3
"""Persistent, agent-directed Life playtest driver. Does not auto-play or wait unattended."""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

OUT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:5197/"
PROFILE = Path("/tmp/oakvale-v2-life-final-seed-909")
CDP = "http://127.0.0.1:9259"
TARGET_SECONDS = 3900
page = None
context = None
browser = None
source_sha = None
manifest_path = None
started_utc = None
started_mono = None
observations = []
actions = []
errors = {"page": [], "console": [], "driver": []}


def utc():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def current_save():
    raw = page.evaluate("() => localStorage.getItem('oakvale-v1')")
    return json.loads(raw) if raw else None


def character(save=None):
    save = save or current_save() or {}
    return next((c for c in save.get("characters", []) if c.get("id") == save.get("activeCharacterId")), {})


def elapsed():
    return round(time.monotonic() - started_mono, 2) if started_mono is not None else 0


def active_time_controls():
    selected = page.locator('.speed-controls button[aria-pressed="true"]')
    return selected.inner_text().strip() if selected.count() else None


def visible_text():
    return page.locator("body").inner_text()[-5000:]


def fingerprint():
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path else {}
    with urlopen(URL, timeout=10) as response:
        html = response.read()
        status = response.status
    assets = {"/": {"httpStatus": status, "bytes": len(html), "sha256": hashlib.sha256(html).hexdigest()}}
    paths = sorted(set(re.findall(rb'(?:src|href)="([^"]+\.(?:js|css))', html)))
    for item in paths:
        path = item.decode("ascii")
        with urlopen(URL.rstrip("/") + path, timeout=10) as response:
            body = response.read()
            assets[path] = {"httpStatus": response.status, "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()}
    expected = manifest.get("assetsSha256", {})
    mismatches = {path: row["sha256"] for path, row in assets.items()
                  if path != "/" and expected.get(path.lstrip("/")) != row["sha256"]}
    if mismatches:
        raise RuntimeError(f"Served assets do not match build manifest: {mismatches}")
    return {"sourceCommit": manifest.get("sourceCommit"), "manifest": str(manifest_path),
            "assets": assets, "allAssetHashesMatch": not mismatches}


def publish(status="prepared"):
    data = {
        "route": "life", "status": status, "sourceCommit": source_sha,
        "buildManifest": str(manifest_path), "url": URL, "profile": str(PROFILE),
        "browser": getattr(browser, "version", None) or getattr(context, "browser", None) and context.browser.version or "Chromium via Playwright",
        "worldSeed": 909, "seedSetup": "fresh persistent profile; normal app UI createGame seed 909; no save/state/resource/time injection",
        "runStartedAtUtc": started_utc, "updatedAtUtc": utc(),
        "activeElapsedSeconds": elapsed(), "targetActiveSeconds": TARGET_SECONDS,
        "humanPlaytest": False, "observations": observations, "actions": actions, "errors": errors,
    }
    write_recorded(OUT / "results.json", json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                   producer="life-final-interactive")


def snapshot(label="agent observation", screenshot=True):
    save = current_save() or {}
    c = character(save)
    dialog = page.locator("dialog[open]")
    row = {
        "atUtc": utc(), "activeElapsedSeconds": elapsed(), "label": label,
        "clockUi": page.locator(".world-clock").inner_text() if page.locator(".world-clock").count() else None,
        "selectedSpeed": active_time_controls(), "worldSeed": save.get("worldSeed"),
        "worldTime": save.get("worldTime"), "rngState": save.get("rngState"),
        "character": {k: c.get(k) for k in ("id", "name", "age", "level", "exp", "hp", "maxHp", "stamina", "maxStamina", "gold", "position", "currentRegion", "skills", "equipment", "inventory", "isAlive")},
        "identity": (save.get("life", {}).get("characters", {}).get(c.get("id"), {}) if c else {}),
        "settlement": save.get("settlement"), "properties": save.get("life", {}).get("properties"),
        "npcs": [{"id": n.get("id"), "name": n.get("name"), "age": n.get("age"), "job": n.get("job"),
                  "alive": n.get("isAlive"), "life": save.get("life", {}).get("npcs", {}).get(n.get("id"), {})}
                 for n in save.get("npcs", [])[:10]],
        "eventCount": len(save.get("events", [])), "historyCount": len(save.get("history", [])),
        "recentEvents": [e.get("message") for e in save.get("events", [])[-8:]],
        "recentHistory": [e.get("message") for e in save.get("history", [])[-8:]],
        "openDialog": dialog.inner_text()[-3000:] if dialog.count() else None,
        "visibleText": visible_text(),
    }
    observations.append(row)
    if screenshot and started_mono is not None:
        page.screenshot(path=str(OUT / f"checkpoint-{len(observations):02d}.png"), full_page=True)
    publish("running" if started_mono is not None else "prepared")
    print("SNAPSHOT " + json.dumps(row, ensure_ascii=False), flush=True)
    return row


def remember(kind, detail):
    actions.append({"atUtc": utc(), "activeElapsedSeconds": elapsed(), "kind": kind, "detail": detail})
    publish("running" if started_mono is not None else "prepared")
    print("RECORDED " + kind, flush=True)


def decision(reason):
    remember("agent decision and motivation", reason)


def pause():
    buttons = page.locator(".speed-controls button")
    control = buttons.filter(has_text="暫停")
    if control.count() and control.get_attribute("aria-pressed") != "true":
        control.click(timeout=2500)
    return active_time_controls()


def resume(speed="×1"):
    if speed not in ("×1", "×5", "×20"):
        raise ValueError("speed must be ×1, ×5, or ×20")
    control = page.get_by_role("button", name=speed, exact=True)
    if not control.count():
        raise RuntimeError(f"Missing speed control {speed}")
    if control.get_attribute("aria-pressed") != "true":
        control.click(timeout=2500)
    return active_time_controls()


def close_dialog():
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
        page.wait_for_timeout(100)


def open_panel(key_or_name):
    close_dialog()
    keys = {"c": "c", "i": "i", "l": "l", "m": "m"}
    if key_or_name.lower() in keys:
        page.keyboard.press(keys[key_or_name.lower()])
    else:
        menu = page.get_by_role("button", name=re.compile("選單"))
        if menu.count():
            menu.first.click()
        target = page.get_by_role("button", name=key_or_name, exact=True)
        if not target.count():
            raise RuntimeError(f"Could not find menu entry: {key_or_name}")
        target.click()
    page.wait_for_timeout(120)
    print("PANEL " + (page.locator("dialog[open]").inner_text()[:5000] if page.locator("dialog[open]").count() else "no dialog"), flush=True)


def buttons(scope="dialog"):
    root = page.locator("dialog[open]") if scope == "dialog" else page
    if scope == "dialog" and not root.count():
        print("BUTTONS []", flush=True)
        return
    rows = root.get_by_role("button").evaluate_all("xs=>xs.filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(x).visibility!=='hidden'}).map(x=>({label:(x.getAttribute('aria-label')||x.innerText||'').replace(/\\s+/g,' ').trim(),disabled:x.disabled}))")
    print("BUTTONS " + json.dumps(rows, ensure_ascii=False), flush=True)


def click_exact(label, scope="dialog"):
    root = page.locator("dialog[open]") if scope == "dialog" else page
    if scope == "dialog" and not root.count():
        print("CLICK no dialog", flush=True)
        return
    # Emoji ZWJ sequences can make Playwright's computed accessible name differ
    # from the visible text. Match the rendered button text exactly as shown.
    wanted = re.sub(r"\s+", " ", label).strip()
    candidates = root.get_by_role("button").all()
    matches = [button for button in candidates
               if re.sub(r"\s+", " ", button.inner_text()).strip() == wanted]
    if len(matches) != 1 or not matches[0].is_visible() or matches[0].is_disabled():
        buttons(scope)
        print(f"CLICK unavailable or ambiguous: {label!r}", flush=True)
        return
    before = current_save() or {}
    matches[0].click(timeout=3000)
    page.wait_for_timeout(120)
    after = current_save() or {}
    remember("visible UI button", {"label": label, "scope": scope,
              "worldTimeBefore": before.get("worldTime"), "worldTimeAfter": after.get("worldTime"),
              "resultText": page.locator("dialog[open]").inner_text()[-1200:] if page.locator("dialog[open]").count() else page.locator(".world-bottom").inner_text()})


def map_info():
    open_panel("m")
    dialog = page.locator("dialog[open]")
    print("MAP " + json.dumps({"text": dialog.inner_text()[:3500], "buttons": dialog.get_by_role("button").all_inner_texts()}, ensure_ascii=False), flush=True)


def travel(label):
    close_dialog()
    open_panel("m")
    control = page.get_by_role("button", name="前往" + label, exact=True)
    if not control.count():
        print("TRAVEL options " + json.dumps(page.locator("dialog[open]").get_by_role("button").all_inner_texts(), ensure_ascii=False), flush=True)
        return
    before = current_save() or {}
    control.click(timeout=3000)
    page.wait_for_timeout(180)
    after = current_save() or {}
    remember("map travel", {"destination": label, "worldTimeBefore": before.get("worldTime"), "worldTimeAfter": after.get("worldTime"), "position": character(after).get("position")})


def nearby():
    close_dialog()
    control = page.locator(".nearby-trigger")
    if control.count():
        control.click(timeout=2500)
    elif page.locator(".context-action").count():
        page.locator(".context-action").click(timeout=2500)
    page.wait_for_timeout(120)
    print("NEARBY " + (page.locator("dialog[open]").inner_text()[:3000] if page.locator("dialog[open]").count() else page.locator(".context-prompt").inner_text()), flush=True)


def interact(term):
    close_dialog()
    prompt = page.locator(".context-action")
    if prompt.count() and term in prompt.inner_text():
        prompt.click(timeout=2500)
        page.wait_for_timeout(120)
    else:
        nearby()
        choices = page.locator("dialog[open] .interaction-list button")
        matches = [i for i in range(choices.count()) if term in choices.nth(i).inner_text()]
        if len(matches) != 1:
            print("INTERACTION choices " + json.dumps(choices.all_inner_texts(), ensure_ascii=False), flush=True)
            return
        choices.nth(matches[0]).click(timeout=2500)
        page.wait_for_timeout(120)
    remember("open nearby interaction", {"term": term, "dialog": page.locator("dialog[open]").inner_text()[:3000] if page.locator("dialog[open]").count() else None})


def save_reload():
    prior = active_time_controls()
    pause()
    page.locator(".save-button").click(timeout=2500)
    before = current_save() or {}
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".world-map", timeout=12000)
    pause()
    after = current_save() or {}
    b, a = character(before), character(after)
    check = {"seedPreserved": before.get("worldSeed") == after.get("worldSeed") == 909,
             "worldTimeUnchangedWhileReloadPaused": before.get("worldTime") == after.get("worldTime"),
             "characterPreserved": (b.get("id"), b.get("name"), b.get("gold"), b.get("inventory"), b.get("equipment")) == (a.get("id"), a.get("name"), a.get("gold"), a.get("inventory"), a.get("equipment")),
             "propertiesPreserved": before.get("life", {}).get("properties") == after.get("life", {}).get("properties"),
             "rngPreserved": before.get("rngState") == after.get("rngState"), "speedBeforeReload": prior}
    remember("normal save and paused UI reload", check)
    print("RELOAD " + json.dumps(check, ensure_ascii=False), flush=True)


def start_play():
    global started_utc, started_mono
    if started_mono is not None:
        raise RuntimeError("active timer already started")
    save = current_save() or {}
    c = character(save)
    if save.get("worldSeed") != 909 or c.get("gold") != 45 or c.get("age") != 16:
        raise RuntimeError(f"fresh default profile check failed: seed={save.get('worldSeed')} gold={c.get('gold')} age={c.get('age')}")
    button = page.get_by_role("button", name="起身", exact=True)
    if button.count():
        button.click(timeout=3000)
        page.wait_for_selector(".world-map", timeout=12000)
        page.wait_for_timeout(250)
    if page.locator(".world-map").count() != 1 or page.locator(".save-button").count() != 1:
        raise RuntimeError("normal game UI did not mount exactly one world map and save control")
    fingerprint_info = fingerprint()
    if fingerprint_info.get("sourceCommit") != source_sha:
        raise RuntimeError(f"served source {fingerprint_info.get('sourceCommit')} != expected {source_sha}")
    pause()
    started_utc = utc()
    started_mono = time.monotonic()
    actions.append({"atUtc": started_utc, "activeElapsedSeconds": 0, "kind": "active exploration started via normal UI",
                    "motivation": "I have inspected the ordinary opening and am choosing a first life goal from the world and identity/property choices.",
                    "initialState": {"seed": save.get("worldSeed"), "worldTime": save.get("worldTime"), "character": {k: c.get(k) for k in ("name", "age", "gold", "inventory", "equipment")}},
                    "productionFingerprint": fingerprint_info})
    resume("×1")
    publish("running")
    snapshot("formal active start, default normal UI world", True)
    print(f"STARTED {started_utc} seed=909 activeTarget={TARGET_SECONDS}s", flush=True)


def main():
    global source_sha, manifest_path
    if len(sys.argv) != 3:
        raise SystemExit("usage: python3 interactive.py <source-sha> <build-manifest-path>")
    source_sha, manifest_path = sys.argv[1], Path(sys.argv[2]).resolve()
    with sync_playwright() as p:
        _connect_with(p)
        print("PREPARED; timer not started. Commands: start,status,map,open <c|i|l|m|這一生|住所與產業|地方消息與委託>,buttons [dialog|page],click <exact label>,click-page <exact label>,travel <map route>,interact <term>,nearby,speed <×1|×5|×20>,pause,save-reload,decision <motivation>,note <observation>,sleep <1..30>,screenshot,quit", flush=True)
        for line in sys.stdin:
            raw = line.strip()
            if not raw:
                continue
            op, _, arg = raw.partition(" ")
            try:
                if op == "quit":
                    break
                if op == "start": start_play()
                elif op in ("status", "note"): snapshot(arg or "agent observation", True)
                elif op == "map": map_info()
                elif op == "open": open_panel(arg or "m")
                elif op == "buttons": buttons(arg or "dialog")
                elif op == "click": click_exact(arg)
                elif op == "click-page": click_exact(arg, "page")
                elif op == "travel": travel(arg)
                elif op == "interact": interact(arg)
                elif op == "nearby": nearby()
                elif op == "decision": decision(arg)
                elif op == "pause": print("PAUSED " + str(pause()), flush=True)
                elif op == "speed": print("SPEED " + str(resume(arg or "×1")), flush=True)
                elif op == "save-reload": save_reload()
                elif op == "screenshot":
                    name = f"manual-{len(observations)+1:02d}.png"
                    page.screenshot(path=str(OUT / name), full_page=True)
                    print("SCREENSHOT " + name, flush=True)
                elif op == "sleep":
                    seconds = int(arg or "1")
                    if not 1 <= seconds <= 30:
                        raise ValueError("sleep accepts 1..30 seconds only; unattended gaps do not count")
                    page.wait_for_timeout(seconds * 1000)
                    print(f"WAITED {seconds}s; inspect the resulting UI now", flush=True)
                else:
                    print("Unknown command: " + op, flush=True)
            except Exception as error:
                errors["driver"].append({"atUtc": utc(), "command": raw, "error": str(error), "trace": traceback.format_exc()})
                publish("running" if started_mono is not None else "prepared")
                print("DRIVER_ERROR " + json.dumps(errors["driver"][-1], ensure_ascii=False), flush=True)
        publish("completed" if elapsed() >= TARGET_SECONDS else "stopped-short")
        context.close()


def _connect_with(p):
    global browser, context, page
    PROFILE.mkdir(parents=True, exist_ok=True)
    try:
        browser = p.chromium.connect_over_cdp(CDP, timeout=1500)
        contexts = browser.contexts
        context = contexts[0] if contexts else None
        if context is None:
            raise RuntimeError("CDP endpoint has no browser context")
        candidates = [pg for ctx in contexts for pg in ctx.pages if pg.url.startswith(URL.rstrip("/"))]
        if len(candidates) > 1:
            raise RuntimeError(f"CDP recovery found {len(candidates)} app tabs; refusing multiple save writers")
        page = candidates[0] if candidates else None
        if page is None:
            page = context.new_page()
        page.set_default_timeout(3000)
        if not page.url.startswith(URL.rstrip("/")):
            page.goto(URL, wait_until="domcontentloaded")
    except Exception as error:
        if "multiple save writers" in str(error):
            raise
        context = p.chromium.launch_persistent_context(str(PROFILE), executable_path="/usr/bin/chromium", headless=True,
            args=["--no-sandbox", "--remote-debugging-port=9259"], viewport={"width": 1440, "height": 1000})
        browser = context
        candidates = [pg for pg in context.pages if pg.url.startswith(URL.rstrip("/"))]
        if len(candidates) > 1:
            raise RuntimeError(f"persistent context has {len(candidates)} app tabs; refusing multiple save writers")
        page = candidates[0] if candidates else (context.pages[0] if context.pages else context.new_page())
        page.set_default_timeout(3000)
        if not page.url.startswith(URL.rstrip("/")):
            page.goto(URL, wait_until="domcontentloaded")
    page.on("pageerror", lambda error: (errors["page"].append(str(error)), publish("running" if started_mono is not None else "prepared")))
    page.on("console", lambda msg: errors["console"].append(msg.text) if msg.type == "error" and "favicon" not in msg.text else None)
    page.wait_for_selector(".world-map, button:has-text('起身')", timeout=20000)
    if page.locator(".world-map").count() == 0:
        raise RuntimeError("no normal world map; refusing to generate or inject save data")
    save = current_save() or {}
    c = character(save)
    if save.get("worldSeed") != 909 or c.get("gold") != 45 or c.get("age") != 16:
        raise RuntimeError(f"profile is not the expected fresh default: seed={save.get('worldSeed')} gold={c.get('gold')} age={c.get('age')}")
    page.screenshot(path=str(OUT / "prepared-before-start.png"), full_page=True)
    publish("prepared-awaiting-start")
    print("READY_TO_START " + json.dumps({"url": page.url, "seed": save.get("worldSeed"), "worldTime": save.get("worldTime"),
        "character": {k: c.get(k) for k in ("name", "age", "gold", "inventory", "equipment")},
        "oneAppPage": True, "timerStarted": False, "cdp": CDP}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
