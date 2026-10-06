#!/usr/bin/env python3
"""Real-time Chromium soak. No game clock, timers, or application state are injected."""
from __future__ import annotations

import hashlib, json, os, re, shutil, signal, sys, tempfile, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

REPO_ROOT = next(parent for parent in Path(__file__).resolve().parents
                 if (parent / "scripts" / "recorded_reports.py").is_file())
sys.path.insert(0, str(REPO_ROOT))
from scripts.recorded_reports import write_recorded

URL = os.environ["PLW_SOAK_URL"]
BASELINE = os.environ["PLW_SOAK_BASELINE"]
BUILD = Path(os.environ["PLW_SOAK_BUILD"])
TARGET_SECONDS = int(os.environ.get("PLW_SOAK_TARGET_SECONDS", "7200"))
OUT = Path(os.environ["PLW_SOAK_OUT"])
SOURCE_LABEL = os.environ.get("PLW_SOAK_SOURCE_LABEL", BASELINE)
SOURCE_STATUS = os.environ.get("PLW_SOAK_SOURCE_STATUS", "not specified")
MANIFEST_PATH = Path(os.environ["PLW_SOAK_MANIFEST"])
OUT.mkdir(parents=True, exist_ok=True)
CAP = 500
CORE_RELOAD_FIELDS = [
    "saveVersion", "worldSeed", "rngState", "worldTime", "activeCharacterId",
    "characters", "npcs", "tiles", "settlement", "regions", "threat", "dungeon", "life",
    "history", "party", "crops", "eventSequence",
]

if TARGET_SECONDS < 7200 or TARGET_SECONDS > 14400:
    raise ValueError("PLW_SOAK_TARGET_SECONDS must be between 7200 and 14400")

def utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")

def fingerprint() -> dict:
    """Hash index and the JS/CSS assets actually served by the fixed loopback URL."""
    with urlopen(URL, timeout=8) as response:
        html = response.read()
    paths = sorted(set(re.findall(rb"(?:src|href)=\"([^\"]+\.(?:js|css))\"", html)))
    assets = {"/": hashlib.sha256(html).hexdigest()}
    for raw in paths:
        path = raw.decode("ascii")
        with urlopen(URL.rstrip("/") + path, timeout=12) as response:
            body = response.read()
            assets[path] = hashlib.sha256(body).hexdigest()
    return {"assets": assets, "asset_count": len(assets)}

def verify_manifest(manifest: dict) -> dict:
    manifest_commit = manifest.get("sourceCommit")
    if not manifest_commit or SOURCE_LABEL != manifest_commit:
        raise RuntimeError(f"source SHA mismatch: configured={SOURCE_LABEL!r}, manifest={manifest_commit!r}")
    if SOURCE_STATUS == "not specified":
        raise RuntimeError("PLW_SOAK_SOURCE_STATUS must describe the frozen source")
    manifest_url = str(manifest.get("url", "")).rstrip("/")
    if not manifest_url or manifest_url != URL.rstrip("/"):
        raise RuntimeError(f"runtime URL mismatch: manifest={manifest_url!r}, configured={URL!r}")
    expected = manifest.get("assetsSha256")
    if not isinstance(expected, dict) or not expected:
        raise RuntimeError("source manifest has no assetsSha256 map")
    expected_served = {
        ("/" if name in ("index.html", "/") else "/" + name.lstrip("/")): digest
        for name, digest in expected.items()
    }
    local_assets = {}
    for name, digest in expected.items():
        path = BUILD / ("index.html" if name in ("index.html", "/") else name.lstrip("/"))
        if not path.is_file():
            raise RuntimeError(f"manifest asset is missing from build: {path}")
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != digest:
            raise RuntimeError(f"build asset does not match manifest: {name}")
        local_assets[name] = actual
    served = fingerprint()
    if served["assets"] != expected_served:
        raise RuntimeError(f"served assets do not match manifest: expected={expected_served}, actual={served['assets']}")
    return {"sourceCommit": manifest.get("sourceCommit"), "url": manifest_url,
            "assetCount": len(expected), "assetNames": sorted(expected),
            "buildAssetsMatch": True, "servedAssetsMatch": True,
            "servedFingerprint": served}

def capped_add(target: list, value: dict, counters: dict, name: str) -> None:
    counters[name] = counters.get(name, 0) + 1
    if len(target) < CAP:
        target.append(value)

def rss_for(profile: str) -> dict:
    try:
        import psutil
        roots = []
        for proc in psutil.process_iter(["pid", "cmdline", "memory_info"]):
            try:
                args = proc.info["cmdline"] or []
                if f"--user-data-dir={profile}" in args:
                    roots.append(proc)
            except (psutil.Error, OSError):
                pass
        if not roots:
            return {"rss_bytes": None, "process_count": 0, "available": False, "reason": "Chromium root not found"}
        root = roots[0]
        tree = [root, *root.children(recursive=True)]
        unique = {proc.pid: proc for proc in tree}
        rss = 0
        for proc in unique.values():
            try: rss += proc.memory_info().rss
            except (psutil.Error, OSError): pass
        return {"rss_bytes": rss, "process_count": len(unique), "root_pid": root.pid,
                "pids": sorted(unique), "available": True,
                "note": "RSS is summed over the Chromium process tree; shared pages may be counted more than once."}
    except Exception as exc:
        return {"rss_bytes": None, "process_count": None, "available": False, "reason": f"{type(exc).__name__}: {exc}"}

def browser_storage(page, *, include_lifecycle=False, include_journal_tail=False, include_core=False) -> dict:
    return page.evaluate("""async ({ includeLifecycle, includeJournalTail, includeCore }) => {
      const keyBytes = (k, v) => new TextEncoder().encode(k + v).length;
      let saved = null, parseError = null, localStorageBytes = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || '', v = localStorage.getItem(k) || '';
          localStorageBytes += keyBytes(k, v);
          if (k === 'oakvale-v1') saved = JSON.parse(v);
        }
      } catch (e) { parseError = String(e); }
      let idbCount = null, idbError = null, idbLatestRecord = null, idbTailError = null;
      try {
        idbCount = await new Promise((resolve, reject) => {
          const req = indexedDB.open('oakvale-play-journal', 1);
          req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('records')) { db.close(); resolve(0); return; }
            const tx = db.transaction('records', 'readonly');
            const count = tx.objectStore('records').count();
            count.onsuccess = () => resolve(count.result);
            count.onerror = () => reject(count.error || new Error('IndexedDB count failed'));
            tx.oncomplete = () => db.close();
            tx.onabort = () => { db.close(); reject(tx.error || new Error('IndexedDB count aborted')); };
          };
        });
      } catch (e) { idbError = String(e); }
      if (includeJournalTail) {
        try {
          idbLatestRecord = await new Promise((resolve, reject) => {
            const req = indexedDB.open('oakvale-play-journal', 1);
            req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
            req.onsuccess = () => {
              const db = req.result;
              if (!db.objectStoreNames.contains('records')) { db.close(); resolve(null); return; }
              const tx = db.transaction('records', 'readonly');
              const cursor = tx.objectStore('records').openCursor(null, 'prev');
              let latest = null;
              cursor.onsuccess = () => {
                const record = cursor.result?.value;
                if (record) latest = {
                  ordinal: record.ordinal ?? null, id: record.id ?? null,
                  worldId: record.worldId ?? null, at: record.at ?? null,
                  kind: record.kind ?? null, from: record.from ?? null,
                  to: record.to ?? null, characterId: record.characterId ?? null,
                  eventTypes: Array.isArray(record.events) ? record.events.map(e => e.type).slice(-20) : [],
                };
              };
              cursor.onerror = () => reject(cursor.error || new Error('IndexedDB tail cursor failed'));
              tx.oncomplete = () => { db.close(); resolve(latest); };
              tx.onerror = () => { db.close(); reject(tx.error || new Error('IndexedDB tail read failed')); };
              tx.onabort = () => { db.close(); reject(tx.error || new Error('IndexedDB tail read aborted')); };
            };
          });
        } catch (e) { idbTailError = String(e); }
      }
      let estimate = null, estimateError = null;
      try { estimate = await navigator.storage.estimate(); } catch (e) { estimateError = String(e); }
        const speed = [...document.querySelectorAll('.speed-controls button')]
          .find(b => b.getAttribute('aria-pressed') === 'true')?.innerText?.trim() ?? null;
      const actor = saved?.characters?.find(c => c.id === saved.activeCharacterId);
      const lifecycleHistoryTail = includeLifecycle && Array.isArray(saved?.history)
        ? saved.history.filter(e => ['npc.died', 'character.successor'].includes(e?.type)).slice(-20)
          .map(e => ({id:e.id,at:e.at,type:e.type,category:e.category,message:e.message})) : [];
      const journal = saved?.playJournal;
      const coreFieldNames = ["saveVersion", "worldSeed", "rngState", "worldTime", "activeCharacterId",
        "characters", "npcs", "tiles", "settlement", "regions", "threat", "dungeon", "life",
        "history", "party", "crops", "eventSequence"];
      const coreFields = includeCore && saved ? Object.fromEntries(coreFieldNames.map(key =>
        [key, { present: Object.hasOwn(saved, key), value: Object.hasOwn(saved, key) ? saved[key] : null }])) : null;
      const aliveNpcs = (saved?.npcs ?? []).filter(n => n.isAlive);
      const deadNpcs = (saved?.npcs ?? []).filter(n => !n.isAlive);
      return {
        worldTime: saved?.worldTime ?? null,
        coreFields,
        population: aliveNpcs.length,
        livingNpcCount: aliveNpcs.length,
        deadNpcCount: deadNpcs.length,
        featuredNpcs: aliveNpcs.filter(n => saved?.life?.npcs?.[n.id]?.featured).slice(0,10).map(n => ({id:n.id,name:n.name,age:n.age,job:n.job,career:saved?.life?.npcs?.[n.id]?.career,traits:saved?.life?.npcs?.[n.id]?.traits,concern:saved?.life?.npcs?.[n.id]?.concern,memories:saved?.life?.npcs?.[n.id]?.memories ?? []})),
        settlement: saved?.settlement ?? null,
        gold: actor?.gold ?? null,
        threat: saved?.threat ?? null,
        boss: {alive:saved?.threat?.bossAlive ?? null,progress:saved?.threat?.bossProgress ?? null},
        eventCount: Array.isArray(saved?.events) ? saved.events.length : null,
        historyCount: Array.isArray(saved?.history) ? saved.history.length : null,
        ownershipCount: Array.isArray(saved?.life?.properties) ? saved.life.properties.filter(p=>p.ownerId===saved.activeCharacterId).length : null,
        journalBytesApprox: new TextEncoder().encode(JSON.stringify(saved?.playJournal ?? {})).length,
        journalVersion: journal?.version ?? null,
        journalWorldId: journal?.worldId ?? null,
        journalPendingTail: Array.isArray(journal?.pending) ? journal.pending.slice(-5).map(r => ({
          id:r.id, worldId:r.worldId, at:r.at, kind:r.kind, from:r.from, to:r.to,
          characterId:r.characterId, eventTypes:Array.isArray(r.events) ? r.events.map(e => e.type).slice(-20) : [],
        })) : [],
        lifecycleHistoryTail,
        activeCharacterId: saved?.activeCharacterId ?? null,
        activeCharacterStatus: actor?.status ?? null,
        activeCharacterDeathYear: actor?.deathYear ?? null,
        activeCharacterDeathCause: actor?.deathCause ?? null,
        pendingRecords: Array.isArray(saved?.playJournal?.pending) ? saved.playJournal.pending.length : null,
        worldId: saved?.playJournal?.worldId ?? null,
        saveVersion: saved?.saveVersion ?? null,
        lastSavedAt: saved?.lastSavedAt ?? null,
        localStorageBytes,
        indexedDbRecordCount: idbCount,
        indexedDbLatestRecord: idbLatestRecord,
        indexedDbTailError: idbTailError,
        indexedDbError: idbError,
        storageEstimate: estimate ? { usage: estimate.usage ?? null, quota: estimate.quota ?? null,
          usageDetails: estimate.usageDetails ?? null } : null,
        storageEstimateError: estimateError,
        storageParseError: parseError,
        visibleClock: document.querySelector('.world-clock')?.innerText?.replace(/\\s+/g, ' ').trim() ?? null,
        selectedSpeed: speed,
        alive: saved?.characters?.find(c => c.id === saved.activeCharacterId)?.isAlive ?? null,
        saveError: [...document.querySelectorAll('.save-warning,[role="alert"],.inline-warning')]
          .map(e => e.innerText.trim()).filter(Boolean).join(' | ') || null,
        domNodes: document.getElementsByTagName('*').length,
        activeDialog: document.querySelector('dialog[open] h2')?.innerText?.trim() ?? null,
      };
    }""", {"includeLifecycle": include_lifecycle, "includeJournalTail": include_journal_tail,
           "includeCore": include_core})

def page_rows(context) -> list[dict]:
    return [{"url": page.url} for page in context.pages]

def is_app_page(page) -> bool:
    base = URL.rstrip("/")
    return page.url == base or page.url.startswith(base + "/")

def require_single_app_page(context, page, phase: str, data: dict) -> None:
    rows = page_rows(context)
    audit = {"phase": phase, "pages": rows, "pageCount": len(rows)}
    data.setdefault("pageAudit", []).append(audit)
    valid = len(context.pages) == 1 and context.pages[0] is page and is_app_page(page)
    audit["singleAppPage"] = valid
    if not valid:
        data.setdefault("pageSafetyViolations", []).append(audit)
        raise RuntimeError(f"single app page invariant failed at {phase}: {rows}")

def percentile(values: list[float], q: float):
    if not values: return None
    xs = sorted(values)
    return round(xs[min(len(xs)-1, max(0, int((len(xs)-1)*q)))], 2)

def core_field_hashes(snapshot: dict) -> dict:
    return {field: hashlib.sha256(json.dumps(snapshot.get(field), sort_keys=True,
        separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()
        for field in CORE_RELOAD_FIELDS}

def main() -> None:
    def stop_signal(signum, _frame):
        raise KeyboardInterrupt(f"signal {signum}")
    signal.signal(signal.SIGINT, stop_signal)
    signal.signal(signal.SIGTERM, stop_signal)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if OUT.name != "attempt-05":
        raise RuntimeError(f"refusing to write outside a dedicated attempt-05 directory: {OUT}")
    data = {
        "baselineCommit": BASELINE, "sourceCommit": manifest.get("sourceCommit", BASELINE), "sourceLabel": SOURCE_LABEL, "sourceStatus": SOURCE_STATUS,
        "sourceManifest": str(MANIFEST_PATH), "sourceHashes": manifest.get("sourceSha256"),
        "buildHashes": manifest.get("assetsSha256"), "changedSinceBaseline": manifest.get("changedSinceBaseline"),
        "buildPath": str(BUILD), "url": URL,
        "targetElapsedSeconds": TARGET_SECONDS, "status": "starting",
        "startedAtUtc": None, "targetEndUtc": None, "endedAtUtc": None,
        "elapsedSeconds": None, "fingerprintStart": None, "fingerprintEnd": None,
        "observations": [], "uiLatenciesMs": [], "pageErrors": [], "consoleErrors": [],
        "resourceFailures": [], "unhandledRejections": [], "droppedDiagnostics": {}, "interruptions": [],
        "runtimeManifestVerified": None,
        "limitations": ["Single disposable Chromium profile and frozen local build; no forced GC.",
                        "Per-checkpoint IndexedDB records count and latest entry. Final normal-UI export validates the full archive.",
                        "Chromium RSS is summed over the process tree; shared pages may be counted more than once."]
    }
    mono_start = None
    def elapsed(): return round(time.monotonic() - mono_start, 3) if mono_start else None
    def persist(path=OUT / "checkpoints.json"):
        data["elapsedSeconds"] = elapsed()
        write_recorded(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n", producer="soak")
    def emit_snapshot_jsonl(item):
        with (OUT / "raw_profiles.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n")

    profile = tempfile.mkdtemp(prefix="plw-rpg-qa-20261005-soak-attempt05-profile-")
    context = None
    try:
        data["runtimeManifestVerified"] = verify_manifest(manifest)
        data["fingerprintStart"] = data["runtimeManifestVerified"]["servedFingerprint"]
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir=profile, executable_path="/usr/bin/chromium", headless=True,
                viewport={"width": 1440, "height": 1000}, accept_downloads=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--enable-precise-memory-info"])
            page = context.pages[0] if context.pages else context.new_page()
            page.set_default_timeout(4000)
            initial_pages = page_rows(context)
            if len(context.pages) != 1 or page.url not in ("about:blank", "chrome://newtab/"):
                raise RuntimeError(f"refusing navigation from non-fresh Chromium profile: {initial_pages}")
            data["pageAudit"] = [{"phase": "before-navigation", "pages": initial_pages,
                                  "pageCount": len(initial_pages), "singleFreshBlankPage": True}]
            page.add_init_script("""(() => {
              const s = {events: [], read: 0, total: 0, dropped: 0, error: null};
              window.__soakLongTasks = s;
              window.__soakUnhandledRejections = [];
              addEventListener('unhandledrejection', e => {
                if (window.__soakUnhandledRejections.length < 100)
                  window.__soakUnhandledRejections.push({reason:String(e.reason),at:performance.now()});
              });
              try {
                new PerformanceObserver(list => {
                  for (const e of list.getEntries()) {
                    s.total++;
                    if (s.events.length < 500) s.events.push({startTime:e.startTime,duration:e.duration,name:e.name});
                    else s.dropped++;
                  }
                }).observe({type:'longtask', buffered:true});
              } catch (e) { s.error = String(e); }
            })();""")
            counters = data["droppedDiagnostics"]
            page.on("pageerror", lambda err: capped_add(data["pageErrors"], {"atUtc": utc(), "elapsed": elapsed(), "text": str(err)}, counters, "pageErrors"))
            page.on("console", lambda msg: capped_add(data["consoleErrors"], {"atUtc": utc(), "elapsed": elapsed(), "text": msg.text,
                "url": (msg.location or {}).get("url")}, counters, "consoleErrors") if msg.type == "error" else None)
            page.on("requestfailed", lambda req: capped_add(data["resourceFailures"], {"atUtc": utc(), "elapsed": elapsed(), "url": req.url,
                "failure": req.failure}, counters, "resourceFailures"))
            page.on("response", lambda resp: capped_add(data["resourceFailures"], {"atUtc": utc(), "elapsed": elapsed(), "url": resp.url,
                "status": resp.status}, counters, "resourceFailures") if resp.status >= 400 else None)
            cdp = None
            try: cdp = context.new_cdp_session(page)
            except Exception as exc: data["cdpSetupError"] = f"{type(exc).__name__}: {exc}"
            try:
                page.goto(URL, wait_until="networkidle", timeout=20000)
                page.locator(".world-clock").wait_for(state="visible", timeout=10000)
                require_single_app_page(context, page, "after-navigation", data)
                writer_wait_start = time.monotonic()
                page.wait_for_function("() => !document.querySelector('.save-warning')", timeout=10000)
                data["writerReadyWaitMs"] = round((time.monotonic() - writer_wait_start) * 1000, 1)
                # launch_persistent_context has a new empty profile: this is a real new world.
                opening = page.get_by_role("button", name="起身", exact=True)
                if opening.count():
                    opening.wait_for(state="visible", timeout=5000)
                    page.wait_for_function("() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='起身'); return !!b && !b.disabled; }", timeout=10000)
                    opening.click(timeout=2500)
                    page.locator("dialog[open]").wait_for(state="detached", timeout=5000)
                page.get_by_role("button", name="×20", exact=True).click()
                if page.get_by_role("button", name="×20", exact=True).get_attribute("aria-pressed") != "true":
                    raise RuntimeError("UI did not select ×20")
                start_state = page.evaluate("""() => {
                  const saved = JSON.parse(localStorage.getItem('oakvale-v1') || 'null');
                  return {worldTime:saved?.worldTime ?? null, worldId:saved?.playJournal?.worldId ?? null,
                          activeCharacterId:saved?.activeCharacterId ?? null,
                          selectedSpeed:[...document.querySelectorAll('.speed-controls button')].find(b=>b.getAttribute('aria-pressed')==='true')?.innerText?.trim() ?? null};
                }""")
                started_wall = datetime.now(timezone.utc)
                mono_start = time.monotonic()
                data.update({"status": "running", "startedAtUtc": started_wall.isoformat(timespec="milliseconds"),
                             "targetEndUtc": (started_wall + timedelta(seconds=TARGET_SECONDS)).isoformat(timespec="milliseconds"),
                             "startMonotonic": mono_start, "chromiumProfile": profile,
                             "initialGameState": start_state})
                page.screenshot(path=str(OUT / "start.png"), full_page=True)
                persist()
                print(json.dumps({"event":"SOAK_START", "pid":os.getpid(), "startedAtUtc":data["startedAtUtc"],
                    "targetEndUtc":data["targetEndUtc"], "targetElapsedSeconds":TARGET_SECONDS,
                    "url":URL, "baseline":BASELINE, "sourceCommit":manifest.get("sourceCommit"),
                    "sourceLabel":SOURCE_LABEL, "profile":profile,
                    "sourceManifest":str(MANIFEST_PATH)}, ensure_ascii=False), flush=True)
                routes = ["c", "i", "l", "m", "Escape", "c", "m", "i", "l", "Escape"]
                arrows = ["往右", "往下", "往左", "往上"]
                data["reloadChecks"] = []
                data["uiCoverage"] = {"windows": [], "attempts": [], "completed": []}
                def open_menu_item(label):
                    if page.locator("dialog[open]").count():
                        page.keyboard.press("Escape")
                    if not page.locator("dialog[open]").count():
                        page.locator(".menu-trigger").click(timeout=2500)
                    page.locator(".pixel-menu").get_by_role("button", name=label, exact=True).click(timeout=2500)
                    page.locator("dialog[open]").wait_for(state="visible", timeout=2500)
                    data["uiCoverage"]["windows"].append(label)
                def close_modal():
                    if page.locator("dialog[open]").count():
                        page.keyboard.press("Escape")
                        page.locator("dialog[open]").wait_for(state="detached", timeout=2500)
                def act_if_enabled(label, exact=True):
                    matches = page.get_by_role("button", name=label, exact=exact)
                    if matches.count() and matches.first.is_enabled():
                        matches.first.click(timeout=2500)
                        return True
                    return False
                def travel_and_open(x, y):
                    travel_to_position(x, y)
                    prompt = page.locator(".context-action")
                    if prompt.count() and prompt.is_enabled(): prompt.click(timeout=3500)
                    page.locator("dialog[open]").wait_for(state="visible", timeout=5000)
                def travel_to_position(x, y):
                    if page.locator("dialog[open]").count(): close_modal()
                    open_menu_item("地圖與世界")
                    tile = page.locator(f'.world-map.overview-map .tile[data-position="{x},{y}"]')
                    if not tile.count(): tile = page.locator(f'.world-map .tile[data-position="{x},{y}"]').last
                    tile.click(timeout=3500)
                    page.locator("dialog[open]").wait_for(state="detached", timeout=10000)
                    page.wait_for_timeout(250)
                def record_success(entry, note):
                    entry["outcome"] = note
                    data["uiCoverage"]["completed"].append({"checkpoint":entry["checkpoint"],"action":entry["decision"],"result":note})
                def do_decision_cycle(checkpoint):
                    choices = ["farm", "home_rest", "mine", "shop", "npc", "gear", "ownership", "forest", "dungeon", "tavern", "news", "farm", "gather", "rest"]
                    choice = choices[((checkpoint // 4)-1) % len(choices)]
                    entry = {"checkpoint":checkpoint,"decision":choice,"outcome":"attempted"}
                    data["uiCoverage"]["attempts"].append(entry)
                    try:
                        if choice in ("farm", "ownership"):
                            if choice == "ownership":
                                open_menu_item("住所與產業")
                                buy_buttons = page.locator(".property-offer-actions button.primary")
                                enabled = [b for b in range(buy_buttons.count()) if buy_buttons.nth(b).is_enabled()]
                                if enabled:
                                    buy_buttons.nth(enabled[0]).click(timeout=3000); record_success(entry,"property purchased via UI")
                                else:
                                    entry["outcome"]="ownership inspected; eligibility unavailable"
                                close_modal()
                            travel_and_open(16, 10)
                            state = page.evaluate("() => JSON.parse(localStorage.getItem('oakvale-v1'))")
                            mature = any(c.get("status")=="mature" for c in state.get("crops", []))
                            prepared = state.get("preparedPlots", 0) > 0
                            actions = (["收割 · 體力 4／15 分"] if mature else []) + (["播種 · 體力 4／10 分"] if prepared and not mature else []) + ["整地 · 體力 6／20 分"]
                            for label in actions:
                                if act_if_enabled(label): record_success(entry, f"farm UI: {label}"); break
                            close_modal()
                        elif choice in ("home_rest", "rest"):
                            travel_and_open(7, 9)
                            if act_if_enabled("休息 · 1 小時"): entry["outcome"]="rested at home via UI"
                            close_modal()
                        elif choice in ("mine", "gather"):
                            travel_and_open(19, 5)
                            if act_if_enabled(re.compile("採石"), exact=False): record_success(entry,"gathered stone via UI")
                            elif act_if_enabled(re.compile("採鐵礦"), exact=False): record_success(entry,"gathered iron via UI")
                            close_modal()
                        elif choice == "shop":
                            travel_and_open(10, 8)
                            buy = page.get_by_role("button", name=re.compile("買 "))
                            sell = page.get_by_role("button", name=re.compile("賣 "))
                            if buy.count() and buy.first.is_enabled(): buy.first.click(timeout=3000); record_success(entry,"bought item via shop UI")
                            elif sell.count() and sell.first.is_enabled(): sell.first.click(timeout=3000); record_success(entry,"sold item via shop UI")
                            else: entry["outcome"]="shop inspected; closed/price/resource gate"
                            close_modal()
                        elif choice == "npc":
                            open_menu_item("地圖與世界")
                            page.get_by_role("button",name="居民",exact=True).click(timeout=3000)
                            people=page.locator(".people-list button")
                            if people.count():
                                resident=page.evaluate("""() => { const s=JSON.parse(localStorage.getItem('oakvale-v1')); const n=s.npcs.find(x=>x.isAlive); const c=s.characters.find(x=>x.id===s.activeCharacterId); return n ? {id:n.id,name:n.name,x:n.position.x,y:n.position.y,cx:c.position.x,cy:c.position.y} : null }""")
                                people.first.click(timeout=3000); close_modal()
                                if resident:
                                    for _ in range(2):
                                        if abs(resident["cx"]-resident["x"])+abs(resident["cy"]-resident["y"]) <= 1: break
                                        travel_to_position(resident["x"],resident["y"])
                                        resident=page.evaluate("""id => { const s=JSON.parse(localStorage.getItem('oakvale-v1')); const n=s.npcs.find(x=>x.id===id); const c=s.characters.find(x=>x.id===s.activeCharacterId); return n ? {id:n.id,name:n.name,x:n.position.x,y:n.position.y,cx:c.position.x,cy:c.position.y} : null }""", resident["id"])
                                    nearby=page.locator(".nearby-trigger")
                                    if nearby.count():
                                        nearby.click(timeout=3000)
                                        page.locator(".interaction-list").get_by_role("button",name=re.compile(r"(?<!\w)"+re.escape(resident["name"])+r"(?!\d)")).click(timeout=3000)
                                    elif page.locator(".context-action").count() and resident["name"] in page.locator(".context-action").inner_text():
                                        page.locator(".context-action").click(timeout=3000)
                                    talk=page.get_by_role("button",name="交談",exact=True)
                                    if talk.count() and talk.is_enabled(): talk.click(timeout=3000); record_success(entry,"inspected and talked to a resident via UI")
                                    else: entry["outcome"]="resident inspected; moved to current map position but not adjacent for conversation"
                                else: entry["outcome"]="no living resident available"
                            else: entry["outcome"]="resident list empty"
                            close_modal()
                        elif choice == "gear":
                            state=page.evaluate("() => JSON.parse(localStorage.getItem('oakvale-v1'))")
                            if "blacksmith" in state.get("settlement",{}).get("buildings",[]):
                                travel_and_open(12,8)
                                for item_name in ("鐵劍","皮甲"):
                                    row=page.locator(".shop-item").filter(has_text=item_name)
                                    buy=row.get_by_role("button",name=re.compile("買 "))
                                    if row.count() and buy.count() and buy.first.is_enabled(): buy.first.click(timeout=3000); record_success(entry,f"purchased {item_name} via blacksmith UI")
                                close_modal()
                            page.keyboard.press("i"); page.locator("dialog[open]").wait_for(state="visible",timeout=3000)
                            sword=page.locator(".item-list button").filter(has_text="鐵劍")
                            if sword.count():
                                sword.first.click(timeout=2500)
                                if act_if_enabled("裝備"): record_success(entry,"equipment action via inventory UI")
                                else: entry["outcome"]="gear inspected; item unavailable or already equipped"
                            close_modal()
                        elif choice == "forest":
                            travel_and_open(5, 4)
                            if act_if_enabled(re.compile("伐木"), exact=False): record_success(entry,"gathered wood via UI")
                            boss=page.get_by_role("button",name=re.compile("挑戰哥布林酋長"))
                            if boss.count() and boss.is_enabled():
                                boss.click(timeout=3000); record_success(entry,"challenged regional boss via UI")
                            elif act_if_enabled(re.compile("尋找怪物"), exact=False):
                                record_success(entry,"forest encounter initiated via UI")
                            if page.get_by_role("button",name="攻擊",exact=True).count():
                                attack=page.get_by_role("button",name="攻擊",exact=True)
                                for _ in range(12):
                                    if not attack.count() or not attack.first.is_visible(): break
                                    attack.first.click(timeout=1800)
                            close_modal()
                        elif choice == "dungeon":
                            travel_and_open(20, 3)
                            enter=page.get_by_role("button",name=re.compile("進入廢棄礦坑"))
                            if enter.count() and enter.is_enabled():
                                enter.click(timeout=3000); record_success(entry,"entered dungeon via UI")
                                for _ in range(3):
                                    explore=page.get_by_role("button",name=re.compile("探索下一段"))
                                    if not explore.count() or not explore.is_enabled(): break
                                    explore.click(timeout=3000)
                                    attack=page.get_by_role("button",name="攻擊",exact=True)
                                    for _ in range(12):
                                        if not attack.count() or not attack.first.is_visible(): break
                                        attack.first.click(timeout=1800)
                                leave=page.get_by_role("button",name="離開礦坑",exact=True)
                                if leave.count(): leave.click(timeout=2500)
                            else: entry["outcome"]="dungeon inspected; discovery/adjacency/stamina gate"
                            close_modal()
                        elif choice == "tavern":
                            travel_and_open(11, 11)
                            hire=page.get_by_role("button",name="聘請",exact=True)
                            if hire.count() and hire.first.is_enabled(): hire.first.click(timeout=3000); record_success(entry,"mercenary hired via tavern UI")
                            else: entry["outcome"]="tavern inspected; hours/reputation/gold gate"
                            close_modal()
                        elif choice == "news":
                            open_menu_item("地方消息與委託")
                            route=page.get_by_role("button",name=re.compile("前往"))
                            if route.count() and route.first.is_enabled(): route.first.click(timeout=3000); entry["outcome"]="news route followed via UI"
                            else: entry["outcome"]="news and requests inspected"
                            close_modal()
                    except Exception as exc:
                        entry["outcome"]="UI action failed"
                        entry["error"]=f"{type(exc).__name__}: {exc}"
                        try: close_modal()
                        except Exception: pass
                    return entry
                last_world_time = start_state.get("worldTime")
                next_checkpoint = mono_start + 60
                n = 0
                while time.monotonic() < mono_start + TARGET_SECONDS:
                    while time.monotonic() < next_checkpoint:
                        time.sleep(min(1.0, max(0.05, next_checkpoint-time.monotonic())))
                    n += 1
                    action = {"route": routes[(n-1) % len(routes)], "opened": False, "closed": False, "errors": []}
                    try:
                        dialog = page.locator("dialog[open]")
                        title = dialog.locator("h2").inner_text(timeout=700) if dialog.count() else ""
                        # Handle naturally occurring mandatory states through their normal UI.
                        if "這一生結束" in title:
                            candidates = dialog.locator(".successor-list button")
                            if candidates.count(): candidates.first.click(); action["inheritance"] = "selected first eligible resident via UI"
                            else:
                                dialog.get_by_role("button", name=re.compile("等待新居民抵達")).click()
                                action["inheritance"] = "used documented wait-for-resident UI"
                            action["opened"] = True
                        elif "戰鬥" in title:
                            attack = dialog.get_by_role("button", name="攻擊", exact=True)
                            for _ in range(8):
                                if not attack.is_visible(): break
                                attack.click(timeout=1500)
                                if not page.locator("dialog[open]").count(): break
                            action["combat"] = "resolved with attack buttons via UI"
                        elif "礦坑" in title:
                            leave = dialog.get_by_role("button", name="離開礦坑", exact=True)
                            if leave.count(): leave.click(timeout=1500); action["dungeon"] = "left via UI"
                        else:
                            if dialog.count():
                                t0=time.monotonic(); page.keyboard.press("Escape"); dialog.wait_for(state="detached",timeout=2500)
                                page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
                                action["closed"] = True; data["uiLatenciesMs"].append({"kind":"closeModal","ms":round((time.monotonic()-t0)*1000,1)})
                            key = action["route"]
                            t0=time.monotonic()
                            if key == "Escape":
                                page.locator(".menu-trigger").click(timeout=2500)
                            else:
                                page.keyboard.press(key)
                            opened = page.locator("dialog[open]")
                            if opened.count():
                                opened.wait_for(state="visible",timeout=2000)
                                page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
                                action["opened"] = True
                                data["uiLatenciesMs"].append({"kind":"openModal","ms":round((time.monotonic()-t0)*1000,1)})
                                t0=time.monotonic(); page.keyboard.press("Escape"); opened.wait_for(state="detached",timeout=2500)
                                page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
                                action["closed"] = True
                                data["uiLatenciesMs"].append({"kind":"closeModal","ms":round((time.monotonic()-t0)*1000,1)})
                        if n % 10 == 0 and not page.locator("dialog[open]").count():
                            before = page.locator(".world-caption").inner_text()
                            t0=time.monotonic(); page.get_by_role("button",name=arrows[(n//10-1)%4],exact=True).click(timeout=2500)
                            try:
                                page.wait_for_function("before => document.querySelector('.world-caption')?.innerText !== before",arg=before,timeout=1000)
                                page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
                                action["moved"] = True
                            except Exception: action["moved"] = False
                            data["uiLatenciesMs"].append({"kind":"move","ms":round((time.monotonic()-t0)*1000,1)})
                        # Make one in-world decision every four minutes using only visible UI.
                        if n % 4 == 0 and not page.locator("dialog[open]").count():
                            decision = do_decision_cycle(n)
                            action["decision"] = decision
                        if n % 5 == 0 and not page.locator("dialog[open]").count():
                            t0=time.monotonic(); page.locator(".save-button").click(timeout=2500)
                            page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
                            data["uiLatenciesMs"].append({"kind":"manualSave","ms":round((time.monotonic()-t0)*1000,1)})
                        # At 30/60/90 minutes, pause, save, fully reload and prove no offline advance.
                        if n in (30, 60, 90):
                            reload_start=time.monotonic()
                            close_modal()
                            page.locator(".speed-controls").get_by_role("button", name="暫停", exact=True).click(timeout=2500)
                            page.locator(".save-button").click(timeout=2500)
                            page.wait_for_timeout(250)
                            paused = browser_storage(page, include_core=True)
                            core_fields_json = json.dumps(CORE_RELOAD_FIELDS)
                            preapp_script = """(() => {
                              const fields = __CORE_FIELDS__;
                              const raw = localStorage.getItem('oakvale-v1');
                              if (!raw) { window.__qaPreAppSave = {present:false,capturePhase:document.readyState}; return; }
                              const saved = JSON.parse(raw);
                              window.__qaPreAppSave = {
                                present:true, capturePhase:document.readyState,
                                worldId:saved.playJournal?.worldId ?? null,
                                coreFields:Object.fromEntries(fields.map(key =>
                                  [key, {present:Object.hasOwn(saved,key), value:Object.hasOwn(saved,key) ? saved[key] : null}]))
                              };
                            })();""".replace("__CORE_FIELDS__", core_fields_json)
                            page.add_init_script(preapp_script)
                            page.reload(wait_until="domcontentloaded", timeout=20000)
                            page.locator(".world-clock").wait_for(state="visible", timeout=10000)
                            require_single_app_page(context, page, f"reload-{n}", data)
                            page.wait_for_function("() => !document.querySelector('.save-warning')", timeout=10000)
                            preapp = page.evaluate("() => window.__qaPreAppSave || null")
                            page.locator(".speed-controls").get_by_role("button", name="暫停", exact=True).click(timeout=2500)
                            loaded = browser_storage(page, include_core=True)
                            paused_core = paused.get("coreFields") or {}
                            preapp_core = (preapp or {}).get("coreFields") or {}
                            loaded_core = loaded.get("coreFields") or {}
                            preapp_differences = [field for field in CORE_RELOAD_FIELDS
                                if paused_core.get(field) != preapp_core.get(field)]
                            preapp_world_time = (preapp_core.get("worldTime") or {}).get("value")
                            foreground_catch_up = (loaded.get("worldTime") - preapp_world_time
                                if isinstance(loaded.get("worldTime"), int) and isinstance(preapp_world_time, int) else None)
                            loaded_actor = next((c for c in (loaded_core.get("characters") or {}).get("value", [])
                                if c.get("id") == loaded.get("activeCharacterId")), None)
                            paused_actor = next((c for c in (paused_core.get("characters") or {}).get("value", [])
                                if c.get("id") == paused.get("activeCharacterId")), None)
                            reload_elapsed_seconds = time.monotonic() - reload_start
                            foreground_limit = reload_elapsed_seconds * 2 + 2
                            check = {"checkpoint":n,"savedWorldTime":paused.get("worldTime"),
                                     "preAppWorldTime":preapp_world_time,
                                     "postPauseWorldTime":loaded.get("worldTime"),
                                     "foregroundCatchUpMinutes":foreground_catch_up,
                                     "reloadElapsedSeconds":round(reload_elapsed_seconds,3),
                                     "foregroundCatchUpLimitMinutes":round(foreground_limit,2),
                                     "sameWorldId":paused.get("worldId")==((preapp or {}).get("worldId")),
                                     "sameCharacterId":paused.get("activeCharacterId")==loaded.get("activeCharacterId"),
                                     "sameSavedActorEquipment":(paused_actor or {}).get("equipment")== (loaded_actor or {}).get("equipment"),
                                     "preAppCapturePhase":(preapp or {}).get("capturePhase"),
                                     "preAppSnapshotPresent":(preapp or {}).get("present") is True,
                                     "coreFields":CORE_RELOAD_FIELDS,
                                     "preAppCoreFieldsMatchSaved":not preapp_differences,
                                     "preAppCoreFieldDifferences":preapp_differences,
                                     "preAppCoreFieldHashes":{"saved":core_field_hashes(paused_core),
                                                               "preApp":core_field_hashes(preapp_core)},
                                     "noOfflineAdvance":paused.get("worldTime")==((preapp_core.get("worldTime") or {}).get("value"))}
                            data["reloadChecks"].append(check)
                            data["uiLatenciesMs"].append({"kind":"saveReloadContinue","ms":round((time.monotonic()-reload_start)*1000,1)})
                            if not check["noOfflineAdvance"] or not check["sameWorldId"] or not check["sameCharacterId"] \
                                    or not check["preAppSnapshotPresent"] or check["preAppCapturePhase"] != "loading" \
                                    or not check["preAppCoreFieldsMatchSaved"]:
                                raise RuntimeError(f"save/reload continuity failed: {check}")
                            if check["foregroundCatchUpMinutes"] is None or check["foregroundCatchUpMinutes"] < 0 \
                                    or check["foregroundCatchUpMinutes"] > foreground_limit:
                                raise RuntimeError(f"unexpected foreground progress before pause: {check}")
                            if not check["sameSavedActorEquipment"]:
                                raise RuntimeError(f"saved actor equipment changed across reload: {check}")
                            page.locator(".speed-controls").get_by_role("button", name="×20", exact=True).click(timeout=2500)
                            data["uiCoverage"]["completed"].append("pause_save_reload_continue")
                        selected = page.get_by_role("button", name="×20", exact=True)
                        if selected.get_attribute("aria-pressed") != "true" and not page.locator(".save-warning").count():
                            selected.click(timeout=2500); action["speedRestoredViaUI"] = True
                    except Exception as exc:
                        action["errors"].append(f"{type(exc).__name__}: {exc}")
                        data["interruptions"].append({"atUtc":utc(),"elapsed":elapsed(),"kind":"ui_action","error":action["errors"][-1]})
                        try:
                            if page.locator("dialog[open]").count(): page.keyboard.press("Escape")
                        except Exception: pass
                    sample = {"checkpoint":n,"scheduledElapsedSeconds":n*60,"sampledAtUtc":utc(),"elapsedSeconds":elapsed(),"action":action}
                    try:
                        # Tick-driven saves persist world time continuously; manual UI saves occur every five minutes.
                        sample["browser"] = browser_storage(page)
                        sample["unhandledRejections"] = page.evaluate("() => window.__soakUnhandledRejections || []")
                        data["unhandledRejections"].extend(sample["unhandledRejections"])
                        sample["rss"] = rss_for(profile)
                        try:
                            sample["longTasks"] = page.evaluate("""() => {
                              const s = window.__soakLongTasks;
                              if (!s) return {available:false,reason:'PerformanceObserver state missing'};
                              const entries = s.events.slice(s.read); s.read = s.events.length;
                              return {available:!s.error,error:s.error,total:s.total,dropped:s.dropped,newEntries:entries};
                            }""")
                        except Exception as exc: sample["longTaskSampleError"] = f"{type(exc).__name__}: {exc}"
                        if cdp:
                            try: sample["cdpHeap"] = cdp.send("Runtime.getHeapUsage")
                            except Exception as exc: sample["cdpHeapError"] = f"{type(exc).__name__}: {exc}"
                            try: sample["cdpDom"] = cdp.send("Memory.getDOMCounters")
                            except Exception as exc: sample["cdpDomError"] = f"{type(exc).__name__}: {exc}"
                    except Exception as exc:
                        sample["sampleError"] = f"{type(exc).__name__}: {exc}"
                    live_time = (sample.get("browser") or {}).get("worldTime")
                    sample["worldTimeAdvanced"] = None if last_world_time is None or live_time is None else live_time > last_world_time
                    if live_time is not None: last_world_time = live_time
                    if sample.get("browser", {}).get("saveError"):
                        warning = {"event":"SOAK_WARNING","kind":"save_error","elapsed":elapsed(),
                                   "text":sample["browser"]["saveError"]}
                        print(json.dumps(warning,ensure_ascii=False),flush=True)
                    if sample["worldTimeAdvanced"] is False:
                        warning = {"event":"SOAK_WARNING","kind":"world_time_stalled","elapsed":elapsed(),
                                   "worldTime":live_time,"selectedSpeed":(sample.get("browser") or {}).get("selectedSpeed")}
                        print(json.dumps(warning,ensure_ascii=False),flush=True)
                    sample["pageErrorCount"] = data["droppedDiagnostics"].get("pageErrors", 0)
                    sample["consoleErrorCount"] = data["droppedDiagnostics"].get("consoleErrors", 0)
                    sample["resourceFailureCount"] = data["droppedDiagnostics"].get("resourceFailures", 0)
                    data["observations"].append(sample)
                    # Keep the harness profile bounded at checkpoint granularity.
                    data["uiLatenciesMs"] = data["uiLatenciesMs"][-1200:]
                    emit_snapshot_jsonl(sample)
                    persist()
                    print(json.dumps({"event":"CHECKPOINT","n":n,"elapsed":sample.get("elapsedSeconds"),
                        "worldTime":live_time,"clock":(sample.get("browser") or {}).get("visibleClock"),
                        "heap":sample.get("cdpHeap"),"dom":sample.get("cdpDom"),
                        "idbCount":(sample.get("browser") or {}).get("indexedDbRecordCount"),
                        "speed":(sample.get("browser") or {}).get("selectedSpeed"),"saveError":(sample.get("browser") or {}).get("saveError")},ensure_ascii=False),flush=True)
                    if n == 60: page.screenshot(path=str(OUT / "hour-1.png"), full_page=True)
                    next_checkpoint = mono_start + (n+1)*60

                # Resolve any mandatory state through its normal UI before exporting.
                for _ in range(5):
                    end_dialog = page.locator("dialog[open]")
                    if not end_dialog.count(): break
                    title = end_dialog.locator("h2").inner_text(timeout=1200)
                    if "這一生結束" in title:
                        candidates = end_dialog.locator(".successor-list button")
                        if candidates.count(): candidates.first.click(timeout=2500)
                        else: end_dialog.get_by_role("button", name=re.compile("等待新居民抵達")).click(timeout=2500)
                    elif "戰鬥" in title:
                        attack = end_dialog.get_by_role("button", name="攻擊", exact=True)
                        for _ in range(12):
                            if not attack.is_visible(): break
                            attack.click(timeout=2000)
                            if not page.locator("dialog[open]").count(): break
                    elif "礦坑" in title:
                        leave = end_dialog.get_by_role("button", name="離開礦坑", exact=True)
                        if leave.count(): leave.click(timeout=2000)
                    else:
                        page.keyboard.press("Escape")
                    try: end_dialog.wait_for(state="detached", timeout=3000)
                    except Exception: pass

                export_path = OUT / "oakvale-play-records.json"
                try:
                    if page.locator("dialog[open]").count():
                        raise RuntimeError("mandatory dialog remained open after normal UI resolution")
                    page.locator(".menu-trigger").click(timeout=3000)
                    menu = page.locator(".pixel-menu")
                    menu.wait_for(state="visible", timeout=5000)
                    export_button = menu.locator("button").filter(has_text="匯出遊玩紀錄")
                    button_texts = menu.locator("button").all_inner_texts()
                    data["exportUiAudit"] = {"buttonTexts": button_texts,
                        "matchingButtonCount": export_button.count(),
                        "pageAudit": page_rows(context)}
                    require_single_app_page(context, page, "before-export", data)
                    if export_button.count() != 1 or not export_button.is_visible() or not export_button.is_enabled():
                        raise RuntimeError(f"expected one visible enabled export menu button; texts={button_texts}")
                    with page.expect_download(timeout=60000) as download_info:
                        export_button.click(timeout=5000)
                    download = download_info.value
                    download.save_as(str(export_path))
                    export_body = export_path.read_text(encoding="utf-8")
                    write_recorded(export_path, export_body, producer="soak")
                    exported=json.loads(export_body)
                    records=exported.get("records",[]); pending=exported.get("pending",[])
                    ids=[r.get("id") for r in records if isinstance(r,dict)]
                    ordinals=[r.get("ordinal") for r in records if isinstance(r,dict)]
                    valid_ordinals = all(isinstance(value, int) for value in ordinals)
                    data["exportValidation"]={"downloadCompleted":True,
                        "suggestedFilename":download.suggested_filename,
                        "archiveAvailable":exported.get("archiveAvailable"),"recordCount":len(records),
                        "uniqueIdCount":len(set(ids)),"ordinalCount":len(ordinals),"ordinalsStrictlyIncreasing":valid_ordinals and all(a<b for a,b in zip(ordinals,ordinals[1:])),
                        "firstOrdinal":ordinals[0] if ordinals else None,"lastOrdinal":ordinals[-1] if ordinals else None,
                        "pendingCount":len(pending),"pendingUniqueIdCount":len({r.get("id") for r in pending if isinstance(r,dict)}),
                        "checkpointWorldId":(exported.get("checkpoint",{}).get("playJournal",{}) or {}).get("worldId"),
                        "fileBytes":export_path.stat().st_size,
                        "fileSha256":hashlib.sha256(export_path.read_bytes()).hexdigest(),
                        "worldIds":sorted({r.get("worldId") for r in records if isinstance(r,dict)}),
                        "ordinalsContiguousFromOne":valid_ordinals and ordinals==list(range(1,len(ordinals)+1))}
                    data["uiCoverage"]["completed"].append("full_play_journal_export_via_menu_ui")
                except Exception as exc:
                    data["exportValidation"]={"downloadCompleted":False,
                        "error":f"{type(exc).__name__}: {exc}",
                        "partialFileExists":export_path.exists(),
                        "uiAudit":data.get("exportUiAudit")}
                    data["interruptions"].append({"atUtc":utc(),"elapsed":elapsed(),
                        "kind":"final_export","error":data["exportValidation"]["error"]})
                try:
                    if page.locator("dialog[open]").count(): page.keyboard.press("Escape")
                    data["endSnapshot"] = browser_storage(page)
                    data["endRss"] = rss_for(profile)
                    if cdp:
                        data["endCdpHeap"] = cdp.send("Runtime.getHeapUsage")
                        data["endCdpDom"] = cdp.send("Memory.getDOMCounters")
                except Exception as exc: data["endSnapshotError"] = f"{type(exc).__name__}: {exc}"
                try: page.screenshot(path=str(OUT / "end.png"), full_page=True)
                except Exception as exc: data["endScreenshotError"] = f"{type(exc).__name__}: {exc}"
                data["fingerprintEnd"] = fingerprint()
                if data["fingerprintEnd"].get("assets") != data["fingerprintStart"].get("assets"):
                    raise RuntimeError("served runtime asset fingerprint changed during soak")
                data["endedAtUtc"] = utc(); data["elapsedSeconds"] = elapsed()
                data["actualElapsedSeconds"] = data["elapsedSeconds"]
                data["status"]="completed" if (data["elapsedSeconds"] or 0)>=TARGET_SECONDS else "incomplete"
                data["uiLatencySummaryMs"]={kind:{"count":len([x["ms"] for x in data["uiLatenciesMs"] if x["kind"]==kind]),
                    "p50":percentile([x["ms"] for x in data["uiLatenciesMs"] if x["kind"]==kind],.50),
                    "p95":percentile([x["ms"] for x in data["uiLatenciesMs"] if x["kind"]==kind],.95)}
                    for kind in sorted({x["kind"] for x in data["uiLatenciesMs"]})}
                persist(OUT / "results.json")
                persist()
                print(json.dumps({"event":"SOAK_END","status":data["status"],"elapsed":data["elapsedSeconds"],
                    "endedAtUtc":data["endedAtUtc"],"exportValidation":data.get("exportValidation")},ensure_ascii=False),flush=True)
            except KeyboardInterrupt as exc:
                data.update({"status":"incomplete", "endedAtUtc":utc(), "actualElapsedSeconds":elapsed(),
                             "terminationReason":str(exc) or "Interrupted by operator before duration target."})
                try: data["fingerprintEnd"] = fingerprint()
                except Exception as fp_exc: data["fingerprintEndError"] = f"{type(fp_exc).__name__}: {fp_exc}"
                data["elapsedSeconds"] = elapsed()
                persist(OUT / "results.json"); persist()
                print(json.dumps({"event":"SOAK_INCOMPLETE","elapsed":data["elapsedSeconds"],
                    "endedAtUtc":data["endedAtUtc"],"reason":data["terminationReason"]},ensure_ascii=False),flush=True)
            except BaseException as exc:
                data.update({"status":"failed","endedAtUtc":utc(),"failure":f"{type(exc).__name__}: {exc}"})
                persist(OUT / "results.json"); persist()
                raise
            finally:
                if context is not None:
                    context.close()
    finally:
        # Preserve the fresh profile when export did not produce the complete archive.
        if data.get("exportValidation", {}).get("downloadCompleted"):
            shutil.rmtree(profile, ignore_errors=True)
        else:
            data["chromiumProfilePreservedForRecovery"] = profile
            try:
                persist(OUT / "results.json")
                persist()
            except Exception as exc:
                print(json.dumps({"event":"PROFILE_PRESERVED_REPORT_WRITE_FAILED",
                    "profile":profile,"error":f"{type(exc).__name__}: {exc}"}),flush=True)

if __name__ == "__main__":
    main()
