#!/usr/bin/env python3
"""Short real-Chromium preflight for attempt 05; no game-state or clock injection."""
from __future__ import annotations

import hashlib
import json
import shutil
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[5]
SOAK = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent
MANIFEST_PATH = SOAK.parent / "build-manifest.json"
MANIFEST = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
URL = MANIFEST["url"].rstrip("/") + "/"
BUILD = Path(MANIFEST["immutableDist"])
CORE_FIELDS = [
    "saveVersion", "worldSeed", "rngState", "worldTime", "activeCharacterId",
    "characters", "npcs", "tiles", "settlement", "regions", "threat", "dungeon", "life",
    "history", "party", "crops", "eventSequence",
]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded  # noqa: E402

OUT.mkdir(parents=True, exist_ok=True)
RESULT = {
    "sourceCommit": MANIFEST.get("sourceCommit"), "sourceManifest": str(MANIFEST_PATH),
    "url": URL, "startedAtUtc": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
    "status": "running", "checks": [], "browserErrors": [],
    "method": "Fresh disposable Chromium profile; visible UI actions; localStorage reads only; no state or clock edits.",
}
profile = Path(tempfile.mkdtemp(prefix="oakvale-v2-attempt05-preflight-"))
context = None
page = None
passed = False


def read_save(target):
    return target.evaluate("""fields => {
      const raw = localStorage.getItem('oakvale-v1');
      if (!raw) throw new Error('normal save key is missing');
      const save = JSON.parse(raw);
      return {
        coreFields: Object.fromEntries(fields.map(key =>
          [key, {present:Object.hasOwn(save,key),value:Object.hasOwn(save,key) ? save[key] : null}])),
        worldId: save.playJournal?.worldId ?? null,
        worldTime: save.worldTime,
        activeCharacterId: save.activeCharacterId,
        activeActor: save.characters?.find(actor => actor.id === save.activeCharacterId) ?? null,
      };
    }""", CORE_FIELDS)


def verify_manifest():
    if MANIFEST.get("sourceCommit") != "441e3c2b435f199a50cb78ee5b19521bcc084593":
        raise RuntimeError(f"unexpected source SHA in manifest: {MANIFEST.get('sourceCommit')}")
    expected = MANIFEST.get("assetsSha256")
    if not isinstance(expected, dict) or not expected:
        raise RuntimeError("manifest has no assetsSha256")
    local_hashes = {}
    served_hashes = {}
    for name, digest in expected.items():
        local = BUILD / ("index.html" if name == "index.html" else name)
        actual_local = hashlib.sha256(local.read_bytes()).hexdigest()
        if actual_local != digest:
            raise RuntimeError(f"frozen build hash mismatch: {name}")
        local_hashes[name] = actual_local
        if name == "index.html":
            response = urlopen(URL, timeout=8)
        else:
            response = urlopen(URL.rstrip("/") + "/" + name.lstrip("/"), timeout=8)
        actual_served = hashlib.sha256(response.read()).hexdigest()
        if actual_served != digest:
            raise RuntimeError(f"served asset hash mismatch: {name}")
        served_hashes[name] = actual_served
    RESULT["manifestCheck"] = {"sourceCommit": MANIFEST["sourceCommit"],
        "url": MANIFEST["url"], "buildHashesMatch": local_hashes == expected,
        "servedHashesMatch": served_hashes == expected, "assetsSha256": served_hashes}


def main():
    global context, page, passed
    verify_manifest()
    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=str(profile), executable_path="/usr/bin/chromium", headless=True,
            viewport={"width": 1440, "height": 1000}, accept_downloads=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--enable-precise-memory-info"],
        )
        if len(context.pages) != 1 or context.pages[0].url not in ("about:blank", "chrome://newtab/"):
            raise RuntimeError(f"not one fresh blank page: {[p.url for p in context.pages]}")
        page = context.pages[0]
        page.set_default_timeout(5000)
        page.on("pageerror", lambda err: RESULT["browserErrors"].append({"kind":"pageerror","text":str(err)}))
        page.on("console", lambda msg: RESULT["browserErrors"].append({"kind":"console","text":msg.text}) if msg.type == "error" else None)
        page.goto(URL, wait_until="networkidle", timeout=20000)
        page.locator(".world-clock").wait_for(state="visible", timeout=10000)
        page.wait_for_function("() => !document.querySelector('.save-warning')", timeout=10000)
        opening = page.get_by_role("button", name="起身", exact=True)
        if opening.count():
            page.wait_for_function("() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='起身'); return !!b && !b.disabled; }", timeout=10000)
            opening.click()
            page.locator("dialog[open]").wait_for(state="detached", timeout=5000)
        page.get_by_role("button", name="×20", exact=True).click()
        if page.get_by_role("button", name="×20", exact=True).get_attribute("aria-pressed") != "true":
            raise RuntimeError("normal UI did not select ×20")
        RESULT["checks"].append({"name":"normal-ui-start-and-writer-ready","status":"passed"})

        # Verify a second same-origin document is blocked while the first owns the save lease.
        pause = page.locator(".speed-controls").get_by_role("button", name="暫停", exact=True)
        pause.click()
        page.locator(".save-button").click()
        page.wait_for_timeout(250)
        before_raw = page.evaluate("() => localStorage.getItem('oakvale-v1')")
        second = context.new_page()
        try:
            second.goto(URL, wait_until="domcontentloaded", timeout=20000)
            second.locator(".world-clock").wait_for(state="visible", timeout=10000)
            second.wait_for_function("() => document.querySelector('.save-warning')?.innerText.includes('另一個遊戲頁面正在使用此存檔')", timeout=10000)
            warning = second.locator(".save-warning").inner_text()
            second.wait_for_timeout(500)
            after_raw = second.evaluate("() => localStorage.getItem('oakvale-v1')")
            if before_raw != after_raw:
                raise RuntimeError("blocked second page changed localStorage")
            RESULT["checks"].append({"name":"single-writer-exclusion","status":"passed",
                "warning":warning,"blockedPageDidNotWrite":True})
        finally:
            second.close()
        if len(context.pages) != 1 or context.pages[0] is not page:
            raise RuntimeError("preflight did not return to one app page")

        # Save and compare all 13 core fields from read-only localStorage before app startup.
        pause = page.locator(".speed-controls").get_by_role("button", name="暫停", exact=True)
        if pause.get_attribute("aria-pressed") != "true": pause.click()
        page.locator(".save-button").click()
        page.wait_for_timeout(250)
        saved = read_save(page)
        init_script = """(() => {
          const fields = __FIELDS__;
          const raw = localStorage.getItem('oakvale-v1');
          if (!raw) { window.__qaPreAppSave = {present:false,capturePhase:document.readyState}; return; }
          const save = JSON.parse(raw);
          window.__qaPreAppSave = {present:true,capturePhase:document.readyState,
            worldId:save.playJournal?.worldId ?? null,
            coreFields:Object.fromEntries(fields.map(key =>
              [key,{present:Object.hasOwn(save,key),value:Object.hasOwn(save,key) ? save[key] : null}]))};
        })();""".replace("__FIELDS__", json.dumps(CORE_FIELDS))
        page.add_init_script(init_script)
        reload_start = time.monotonic()
        page.reload(wait_until="domcontentloaded", timeout=20000)
        page.locator(".world-clock").wait_for(state="visible", timeout=10000)
        page.wait_for_function("() => !document.querySelector('.save-warning')", timeout=10000)
        preapp = page.evaluate("() => window.__qaPreAppSave || null")
        pause = page.locator(".speed-controls").get_by_role("button", name="暫停", exact=True)
        if pause.get_attribute("aria-pressed") != "true": pause.click()
        loaded = read_save(page)
        diffs = [key for key in CORE_FIELDS if saved["coreFields"].get(key) != (preapp or {}).get("coreFields", {}).get(key)]
        catchup = loaded["worldTime"] - saved["worldTime"]
        reload_elapsed_seconds = time.monotonic() - reload_start
        foreground_limit = reload_elapsed_seconds * 2 + 2
        reload_result = {
            "name":"pause-save-reload-continue-core-fields","status":"passed",
            "preAppCapturePhase":(preapp or {}).get("capturePhase"),"coreFields":CORE_FIELDS,
            "preAppSnapshotPresent":(preapp or {}).get("present") is True,
            "preAppCoreFieldsMatchSaved":not diffs,"preAppCoreFieldDifferences":diffs,
            "worldIdMatches":saved["worldId"] == (preapp or {}).get("worldId"),
            "savedActorId":saved["activeCharacterId"],"loadedActorId":loaded["activeCharacterId"],
            "sameSavedActor":saved["activeCharacterId"] == loaded["activeCharacterId"],
            "sameSavedActorEquipment":saved["activeActor"].get("equipment") == loaded["activeActor"].get("equipment"),
            "savedWorldTime":saved["worldTime"],"loadedWorldTime":loaded["worldTime"],
            "foregroundCatchUpMinutes":catchup,"reloadElapsedSeconds":round(reload_elapsed_seconds,3),
            "foregroundCatchUpLimitMinutes":round(foreground_limit,2),
        }
        if not reload_result["preAppSnapshotPresent"] or diffs or reload_result["preAppCapturePhase"] != "loading":
            raise RuntimeError(f"read-only pre-app save comparison failed: {reload_result}")
        if not reload_result["worldIdMatches"] or not reload_result["sameSavedActor"] or not reload_result["sameSavedActorEquipment"]:
            raise RuntimeError(f"reload did not retain the saved world/actor: {reload_result}")
        if catchup < 0 or catchup > foreground_limit:
            raise RuntimeError(f"unexpected foreground catch-up: {reload_result}")
        RESULT["checks"].append(reload_result)
        page.get_by_role("button", name="×20", exact=True).click()

        pause = page.locator(".speed-controls").get_by_role("button", name="暫停", exact=True)
        pause.click()
        page.locator(".save-button").click()
        page.locator(".menu-trigger").click()
        menu = page.locator(".pixel-menu")
        menu.wait_for(state="visible", timeout=5000)
        export_button = menu.locator("button").filter(has_text="匯出遊玩紀錄")
        texts = menu.locator("button").all_inner_texts()
        if export_button.count() != 1 or not export_button.is_visible() or not export_button.is_enabled():
            raise RuntimeError(f"expected one enabled export button; menu={texts}")
        export_path = OUT / "preflight-play-records.json"
        with page.expect_download(timeout=30000) as download_info:
            export_button.click(timeout=5000)
        download = download_info.value
        download.save_as(str(export_path))
        export_body = export_path.read_text(encoding="utf-8")
        write_recorded(export_path, export_body, producer="soak-preflight")
        exported = json.loads(export_body)
        records = exported.get("records", [])
        RESULT["checks"].append({"name":"normal-ui-play-journal-export","status":"passed",
            "suggestedFilename":download.suggested_filename,"archiveAvailable":exported.get("archiveAvailable"),
            "recordCount":len(records),"pendingCount":len(exported.get("pending",[])),
            "exportSha256":hashlib.sha256(export_path.read_bytes()).hexdigest()})
        if exported.get("archiveAvailable") is not True or not records:
            raise RuntimeError("export completed without a readable non-empty journal archive")
        RESULT["status"] = "passed"
        passed = True


try:
    main()
except Exception as exc:
    RESULT["status"] = "failed"
    RESULT["fatal"] = f"{type(exc).__name__}: {exc}"
    RESULT["profilePreservedForRecovery"] = str(profile)
finally:
    if context is not None:
        try: context.close()
        except Exception: pass
    if passed:
        shutil.rmtree(profile, ignore_errors=True)
    RESULT["endedAtUtc"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    RESULT["elapsedWallSeconds"] = round((datetime.now(timezone.utc) - datetime.fromisoformat(RESULT["startedAtUtc"])).total_seconds(), 3)
    write_recorded(OUT / "preflight.json", json.dumps(RESULT, ensure_ascii=False, indent=2) + "\n", producer="soak-preflight")
    print(json.dumps({"status":RESULT["status"],"checks":RESULT["checks"],"fatal":RESULT.get("fatal"),
        "browserErrors":RESULT["browserErrors"],"profile":RESULT.get("profilePreservedForRecovery")}, ensure_ascii=False), flush=True)
    if not passed:
        raise SystemExit(1)
