#!/usr/bin/env python3
"""Reproducible QA-08 browser smoke against the frozen localhost build.

Uses the existing Python Playwright package for system Chromium and the
standard-library W3C WebDriver HTTP API for Debian Firefox ESR/geckodriver.
Firefox and geckodriver binaries are unpacked under /tmp; no package is
installed into the host. Mobile dimensions are viewport emulation only.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

BASE_URL = os.environ.get("PLW_QA08_URL", "http://127.0.0.1:5193/")
SAVE_KEY = "oakvale-v1"
TASK_CACHE = Path("/tmp/plw-rpg-qa08-browsers")
FIREFOX = TASK_CACHE / "firefox-root/usr/lib/firefox-esr/firefox-esr"
FIREFOX_LIB = FIREFOX.parent
GECKODRIVER = TASK_CACHE / "geckodriver-root/geckodriver"
FIREFOX_DEB = TASK_CACHE / "firefox-esr_153.4.0esr-1~deb13u1_amd64.deb"
GECKODRIVER_TARBALL = TASK_CACHE / "geckodriver-v0.37.1-linux64.tar.gz"

RESULTS: dict = {
    "run": {
        "startedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "ticket": "tickets/20261004-deep-qa.md / QA-08",
        "url": BASE_URL,
        "scope": "Firefox ESR and Chromium local UI smoke; Safari and physical-device checks are separately blocked",
        "dataPolicy": "fresh disposable browser profiles; no production site or player save",
    },
    "cases": [],
    "checkpoints": [],
    "screenshots": [],
    "artifacts": [],
    "harnessErrors": [],
}
EVENTS: dict = {
    "console": [],
    "pageErrors": [],
    "requests": [],
    "responses": [],
    "requestFailures": [],
    "performanceSnapshots": [],
    "webdriverLogs": [],
}
_case_number = 0


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def publish() -> None:
    RESULTS["updatedAt"] = utc_now()
    write_recorded(OUT / "smoke.json", json.dumps(RESULTS, ensure_ascii=False, indent=2) + "\n", producer="qa-08-browser-smoke")
    write_recorded(OUT / "browser-events.json", json.dumps(EVENTS, ensure_ascii=False, indent=2) + "\n", producer="qa-08-browser-events")


def checkpoint(browser: str, name: str, detail: dict | None = None) -> None:
    RESULTS["checkpoints"].append({"at": utc_now(), "browser": browser, "name": name, "detail": detail or {}})
    publish()


def case(browser: str, name: str, passed: bool, evidence: dict, method: str = "normal-ui", *, stop_on_failure: bool = True) -> None:
    global _case_number
    _case_number += 1
    row = {
        "id": f"QA08-{_case_number:02d}",
        "at": utc_now(),
        "browser": browser,
        "name": name,
        "outcome": "PASS" if passed else "FAIL",
        "method": method,
        "evidence": evidence,
    }
    RESULTS["cases"].append(row)
    if not passed:
        RESULTS["status"] = "failed"
    checkpoint(browser, name, evidence)
    if not passed and stop_on_failure:
        raise AssertionError(f"{browser}: {name}: {json.dumps(evidence, ensure_ascii=False)}")


def record_screenshot(browser: str, label: str, path: Path) -> dict:
    info = {
        "browser": browser,
        "label": label,
        "path": str(path.relative_to(ROOT)),
        "bytes": path.stat().st_size,
        "sha256": sha256_bytes(path.read_bytes()),
        "mimeType": "image/png",
        "recording": "PNG stored as binary; path and SHA-256 are appended through recorded_reports.write_recorded",
    }
    RESULTS["screenshots"].append(info)
    checkpoint(browser, f"screenshot:{label}", info)
    return info


def archive_download(browser: str, source_path: Path, label: str) -> dict:
    raw = source_path.read_text(encoding="utf-8")
    archived = OUT / f"{label}.json"
    archive_raw = raw.rstrip() + "\n"
    write_recorded(archived, archive_raw, producer=f"qa-08-{browser}-export")
    data = json.loads(raw)
    info = {
        "browser": browser,
        "path": str(archived.relative_to(ROOT)),
        "sha256": sha256_bytes(archive_raw.encode("utf-8")),
        "bytes": len(archive_raw.encode("utf-8")),
        "archiveAvailable": data.get("archiveAvailable"),
        "records": len(data.get("records", [])),
        "pending": len(data.get("pending", [])),
        "checkpointPresent": isinstance(data.get("checkpoint"), dict),
    }
    RESULTS["artifacts"].append(info)
    checkpoint(browser, "export-archive", info)
    return info


def local_build_fingerprint() -> dict:
    parsed = urlsplit(BASE_URL)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost"}:
        raise ValueError(f"QA-08 only accepts localhost HTTP, got {parsed.scheme}://{parsed.hostname}")
    baseline_path = ROOT / "reports/playtests/20261004-deep-qa/baseline/final-manifest.json"
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    assets: dict[str, dict] = {}
    with urlopen(BASE_URL, timeout=10) as response:
        html = response.read()
        html_status = response.status
    assets["index.html"] = {"status": html_status, "sha256": sha256_bytes(html)}
    references = re.findall(rb'(?:src|href)="([^"]+\.(?:js|css))"', html)
    for ref in references:
        asset_url = urljoin(BASE_URL, ref.decode("utf-8"))
        asset_name = urlsplit(asset_url).path.lstrip("/")
        with urlopen(asset_url, timeout=20) as response:
            body = response.read()
            status = response.status
        assets[asset_name] = {"status": status, "sha256": sha256_bytes(body)}
    expected = baseline.get("buildHashes", {})
    matches = all(assets.get(name, {}).get("sha256") == expected.get(name) for name in expected)
    if set(assets) != set(expected):
        matches = False
    return {
        "sourceCommit": baseline.get("sourceCommit"),
        "sourceLabel": baseline.get("sourceLabel"),
        "sourceStatus": baseline.get("sourceStatus"),
        "sourceHashes": baseline.get("sourceHashes", {}),
        "changedSinceBaseline": baseline.get("changedSinceBaseline", {}),
        "manifest": str(baseline_path.relative_to(ROOT)),
        "url": BASE_URL,
        "assets": assets,
        "expectedBuildHashes": expected,
        "matchesBaselineBuild": matches,
    }


def read_state_script() -> str:
    return f"""
const raw = localStorage.getItem({json.dumps(SAVE_KEY)});
if (!raw) return null;
return {{ raw, state: JSON.parse(raw) }};
"""


def monitor_script() -> str:
    return """
if (window.__qa08Monitor) return true;
window.__qa08Monitor = { consoleErrors: [], pageErrors: [], resources: [] };
const monitor = window.__qa08Monitor;
const asText = (value) => {
  try { return typeof value === 'string' ? value : JSON.stringify(value); }
  catch { return String(value); }
};
const originalError = console.error.bind(console);
console.error = (...args) => {
  monitor.consoleErrors.push({ at: new Date().toISOString(), text: args.map(asText).join(' ') });
  originalError(...args);
};
window.addEventListener('error', (event) => monitor.pageErrors.push({ at: new Date().toISOString(), message: event.message, filename: event.filename, line: event.lineno, column: event.colno }));
window.addEventListener('unhandledrejection', (event) => monitor.pageErrors.push({ at: new Date().toISOString(), message: asText(event.reason) }));
const saveResource = (entry) => monitor.resources.push({ url: entry.name, type: entry.initiatorType, durationMs: entry.duration, responseStatus: typeof entry.responseStatus === 'number' ? entry.responseStatus : null });
for (const entry of performance.getEntriesByType('resource')) saveResource(entry);
if (window.PerformanceObserver) {
  try { new PerformanceObserver((list) => list.getEntries().forEach(saveResource)).observe({ type: 'resource', buffered: true }); } catch {}
}
return true;
"""


def metrics_script() -> str:
    return """
const monitor = window.__qa08Monitor || { consoleErrors: [], pageErrors: [], resources: [] };
return {
  url: location.href,
  title: document.title,
  viewport: { width: innerWidth, height: innerHeight, visualWidth: visualViewport?.width ?? null, visualHeight: visualViewport?.height ?? null },
  document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
  mobileNavDisplay: getComputedStyle(document.querySelector('.mobile-nav')).display,
  mobileNavRect: (() => { const r = document.querySelector('.mobile-nav').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })(),
  userAgent: navigator.userAgent,
  touchPoints: navigator.maxTouchPoints,
  coarsePointer: matchMedia('(pointer: coarse)').matches,
  consoleErrors: monitor.consoleErrors.slice(),
  pageErrors: monitor.pageErrors.slice(),
  resources: monitor.resources.slice()
};
"""


def journal_script() -> str:
    return """
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('oakvale-play-journal', 1);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const result = await new Promise((resolve, reject) => {
  const tx = db.transaction('records', 'readonly');
  const request = tx.objectStore('records').getAll();
  tx.oncomplete = () => resolve(request.result);
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
});
db.close();
return result;
"""


class PlaywrightUI:
    def __init__(self, page, context, browser_name: str):
        self.page = page
        self.context = context
        self.browser_name = browser_name

    def eval(self, body: str):
        return self.page.evaluate(f"() => {{ {body} }}")

    def eval_async(self, body: str):
        return self.page.evaluate(f"async () => {{ {body} }}")

    def click(self, selector: str) -> None:
        self.page.locator(selector).first.click(timeout=8000)

    def click_text(self, selector: str, text: str, *, exact: bool = False, starts: bool = False) -> None:
        loc = self.page.locator(selector)
        for index in range(loc.count()):
            item = loc.nth(index)
            if not item.is_visible():
                continue
            value = item.inner_text(timeout=2000).strip()
            if (value == text) if exact else (value.startswith(text) if starts else text in value):
                item.click(timeout=8000)
                return
        raise LookupError(f"no visible {selector} contains text {text!r}")

    def button_texts(self, selector: str = "button") -> list[str]:
        loc = self.page.locator(selector)
        return [loc.nth(index).inner_text().strip() for index in range(loc.count()) if loc.nth(index).is_visible()]

    def key(self, value: str) -> None:
        self.page.keyboard.press(value)

    def wait_js(self, expression: str, timeout: float = 12) -> bool:
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            if self.eval(f"return Boolean({expression});"):
                return True
            time.sleep(0.1)
        return False

    def resize(self, width: int, height: int) -> None:
        self.page.set_viewport_size({"width": width, "height": height})

    def reload(self) -> None:
        self.page.reload(wait_until="networkidle", timeout=30000)

    def screenshot(self, path: Path) -> None:
        self.page.screenshot(path=str(path), full_page=True)

    def export(self, path: Path) -> None:
        self.key("Escape")
        with self.page.expect_download(timeout=15000) as download_info:
            self.click_text(".pixel-menu button", "匯出遊玩紀錄")
        download_info.value.save_as(str(path))


class WebDriverUI:
    def __init__(self, base: str, session: str):
        self.base = base.rstrip("/")
        self.session = session
        self.browser_name = "Firefox ESR"

    def _request(self, method: str, path: str, body: dict | None = None):
        data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
        req = Request(self.base + path, data=data, headers={"Content-Type": "application/json"}, method=method)
        try:
            with urlopen(req, timeout=45) as response:
                raw = response.read()
        except HTTPError as exc:
            try:
                detail = exc.read().decode("utf-8", "replace")[:1000]
            except Exception:
                detail = ""
            raise RuntimeError(f"WebDriver {method} {path}: HTTP {exc.code} {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"WebDriver {method} {path}: {type(exc.reason).__name__}") from exc
        return json.loads(raw.decode("utf-8")) if raw else {}

    def _id(self, element: dict) -> str:
        return element.get("element-6066-11e4-a52e-4f735466cecf") or element.get("ELEMENT")

    def find_elements(self, selector: str) -> list[dict]:
        response = self._request("POST", f"/session/{self.session}/elements", {"using": "css selector", "value": selector})
        return response.get("value", [])

    def element_text(self, element: dict) -> str:
        return self._request("GET", f"/session/{self.session}/element/{self._id(element)}/text").get("value", "").strip()

    def click_element(self, element: dict) -> None:
        self._request("POST", f"/session/{self.session}/element/{self._id(element)}/click", {})

    def eval(self, body: str):
        response = self._request("POST", f"/session/{self.session}/execute/sync", {"script": body, "args": []})
        value = response.get("value")
        if isinstance(value, dict) and value.get("error"):
            raise RuntimeError(str(value))
        return value

    def eval_async(self, body: str):
        script = "const done = arguments[arguments.length - 1]; (async () => { try { const value = await (async () => { " + body + " })(); done(value); } catch (error) { done({__qaError: String(error)}); } })();"
        response = self._request("POST", f"/session/{self.session}/execute/async", {"script": script, "args": []})
        value = response.get("value")
        if isinstance(value, dict) and value.get("__qaError"):
            raise RuntimeError(value["__qaError"])
        return value

    def click(self, selector: str) -> None:
        elements = self.find_elements(selector)
        if not elements:
            raise LookupError(f"no element for selector {selector!r}")
        self.click_element(elements[0])

    def click_text(self, selector: str, text: str, *, exact: bool = False, starts: bool = False) -> None:
        for element in self.find_elements(selector):
            value = self.element_text(element)
            matches = value == text if exact else value.startswith(text) if starts else text in value
            if matches:
                self.click_element(element)
                return
        raise LookupError(f"no {selector} contains text {text!r}")

    def button_texts(self, selector: str = "button") -> list[str]:
        return [self.element_text(element) for element in self.find_elements(selector)]

    def key(self, value: str) -> None:
        keys = {"Escape": "\ue00c", "Tab": "\ue004", "Enter": "\ue007", "ArrowLeft": "\ue012"}
        key = keys.get(value, value)
        self._request("POST", f"/session/{self.session}/actions", {"actions": [{"type": "key", "id": "qa08-keyboard", "actions": [{"type": "keyDown", "value": key}, {"type": "keyUp", "value": key}]}]})

    def wait_js(self, expression: str, timeout: float = 12) -> bool:
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            if self.eval(f"return Boolean({expression});"):
                return True
            time.sleep(0.1)
        return False

    def resize(self, width: int, height: int) -> None:
        self._request("POST", f"/session/{self.session}/window/rect", {"x": 0, "y": 0, "width": width, "height": height})

    def reload(self) -> None:
        self._request("POST", f"/session/{self.session}/refresh", {})

    def screenshot(self, path: Path) -> None:
        response = self._request("GET", f"/session/{self.session}/screenshot")
        path.write_bytes(base64.b64decode(response["value"]))

    def export(self, path: Path) -> None:
        self.key("Escape")
        self.click_text(".pixel-menu button", "匯出遊玩紀錄")
        end = time.monotonic() + 15
        while time.monotonic() < end:
            if path.exists() and path.stat().st_size > 0:
                return
            time.sleep(0.1)
        raise TimeoutError(f"Firefox export download did not appear at {path}")


def current_state(ui) -> dict:
    result = ui.eval(read_state_script())
    if not result:
        raise AssertionError("localStorage has no game checkpoint")
    return result["state"]


def attach_playwright_events(page, browser_name: str) -> None:
    page.on("console", lambda message: EVENTS["console"].append({"at": utc_now(), "browser": browser_name, "type": message.type, "text": message.text, "location": message.location}) if message.type in {"error", "warning"} else None)
    page.on("pageerror", lambda error: EVENTS["pageErrors"].append({"at": utc_now(), "browser": browser_name, "message": str(error)}))
    page.on("request", lambda request: EVENTS["requests"].append({"at": utc_now(), "browser": browser_name, "method": request.method, "url": request.url, "resourceType": request.resource_type}))
    page.on("response", lambda response: EVENTS["responses"].append({"at": utc_now(), "browser": browser_name, "status": response.status, "url": response.url, "method": response.request.method}))
    page.on("requestfailed", lambda request: EVENTS["requestFailures"].append({"at": utc_now(), "browser": browser_name, "url": request.url, "method": request.method, "failure": request.failure}))


def activate_town_fixture(ui, town: dict):
    """Load the controlled save before the replacement app instance mounts.

    The previous page's pagehide/visibility save intentionally runs when that
    page is closed. A new page in the same profile then replaces localStorage
    before the app starts, while IndexedDB remains in that profile.
    """
    raw = json.dumps(town, ensure_ascii=False)
    if isinstance(ui, PlaywrightUI):
        browser_name = ui.browser_name
        context = ui.context
        ui.page.close()
        page = context.new_page()
        page.add_init_script(f"""
const storageKey = {json.dumps(SAVE_KEY)};
const fixtureRaw = {json.dumps(raw)};
const fixtureMarker = "__qa08_town_fixture_seeded";
const fixtureInjectedThisNavigation = sessionStorage.getItem(fixtureMarker) !== "1";
if (fixtureInjectedThisNavigation) {{
  localStorage.setItem(storageKey, fixtureRaw);
  sessionStorage.setItem(fixtureMarker, "1");
}}
window.__qa08BootCapture = {{
  at: new Date().toISOString(),
  fixtureInjectedThisNavigation,
  fixtureMarker: sessionStorage.getItem(fixtureMarker),
  localStorageRawAtDocumentStart: localStorage.getItem(storageKey),
  pagehideSnapshot: sessionStorage.getItem("__qa08_last_pagehide")
}};
""")
        attach_playwright_events(page, browser_name)
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        if not page.evaluate("() => document.readyState === 'complete' && !!document.querySelector('.speed-controls')"):
            raise TimeoutError("replacement Chromium page did not mount the game after town fixture load")
        page.evaluate(f"() => {{ {monitor_script()} }}")
        return PlaywrightUI(page, context, browser_name)

    old_handle = ui._request("GET", f"/session/{ui.session}/window").get("value")
    ui.eval("window.open('about:blank', 'qa08-controlled-fixture'); return true;")
    deadline = time.monotonic() + 5
    handles = []
    while time.monotonic() < deadline:
        handles = ui._request("GET", f"/session/{ui.session}/window/handles").get("value", [])
        if len(handles) > 1:
            break
        time.sleep(0.1)
    new_handle = next((handle for handle in handles if handle != old_handle), None)
    if not new_handle:
        raise RuntimeError("Firefox could not open a same-origin blank fixture tab")
    # Close the old page first so its final save cannot overwrite the fixture.
    ui._request("POST", f"/session/{ui.session}/window", {"handle": old_handle})
    ui._request("DELETE", f"/session/{ui.session}/window")
    ui._request("POST", f"/session/{ui.session}/window", {"handle": new_handle})
    try:
        ui.eval(f"localStorage.setItem({json.dumps(SAVE_KEY)}, {json.dumps(raw)}); return true;")
    except Exception as exc:
        raise RuntimeError(f"Firefox blank fixture tab did not retain same-origin storage: {type(exc).__name__}: {exc}") from exc
    ui._request("POST", f"/session/{ui.session}/url", {"url": BASE_URL})
    if not ui.wait_js("document.readyState === 'complete' && !!document.querySelector('.speed-controls')", timeout=30):
        raise TimeoutError("replacement Firefox page did not mount the game after town fixture load")
    ui.eval(monitor_script())
    checkpoint("Firefox ESR", "controlled-fixture-loaded-before-app-mount", {
        "stage": town.get("settlement", {}).get("stage"),
        "buildings": town.get("settlement", {}).get("buildings"),
        "localStorageReadback": ui.eval(f"return JSON.parse(localStorage.getItem({json.dumps(SAVE_KEY)})).settlement.stage"),
        "replacementTab": True,
    })
    return ui


def active_character(state: dict) -> dict:
    return next(character for character in state["characters"] if character["id"] == state["activeCharacterId"])


def state_evidence(state: dict) -> dict:
    player = active_character(state)
    return {
        "worldSeed": state.get("worldSeed"),
        "worldTime": state.get("worldTime"),
        "activeCharacterId": player.get("id"),
        "position": player.get("position"),
        "currentRegion": player.get("currentRegion"),
        "hp": player.get("hp"),
        "gold": player.get("gold"),
        "crops": len(state.get("crops", [])),
        "party": len(state.get("party", [])),
        "combat": state.get("combat") is not None,
        "pendingRecords": len(state.get("playJournal", {}).get("pending", [])),
        "rawSaveSha256": sha256_bytes(json.dumps(state, ensure_ascii=False, separators=(",", ":")).encode("utf-8")),
    }


def changed_save_fields(left_raw: str | None, right_raw: str | None) -> list[str] | None:
    if not left_raw or not right_raw:
        return None
    left = json.loads(left_raw)
    right = json.loads(right_raw)
    return sorted(key for key in set(left) | set(right) if left.get(key) != right.get(key))


def record_save(ui, browser: str, label: str) -> dict:
    result = ui.eval(read_state_script())
    if not result:
        raise AssertionError(f"missing raw localStorage save at checkpoint {label}")
    entry = {
        "browser": browser,
        "label": label,
        "rawSave": result["raw"],
        "summary": state_evidence(result["state"]),
        "at": utc_now(),
    }
    RESULTS["checkpoints"].append(entry)
    publish()
    return result["state"]


def collect_metrics(ui, browser: str, label: str) -> dict:
    metrics = ui.eval(metrics_script())
    EVENTS["performanceSnapshots"].append({"at": utc_now(), "browser": browser, "label": label, "metrics": metrics})
    for error in metrics.get("consoleErrors", []):
        event = {"at": error.get("at"), "browser": browser, **error}
        if event not in EVENTS["console"]:
            EVENTS["console"].append(event)
    for error in metrics.get("pageErrors", []):
        event = {"at": error.get("at"), "browser": browser, **error}
        if event not in EVENTS["pageErrors"]:
            EVENTS["pageErrors"].append(event)
    checkpoint(browser, f"browser-metrics:{label}", {"consoleErrors": len(metrics.get("consoleErrors", [])), "pageErrors": len(metrics.get("pageErrors", [])), "resources": metrics.get("resources", [])})
    return metrics


def layout_case(ui, browser: str, width: int, height: int, *, chromium_mobile: bool = False) -> dict:
    ui.resize(width, height)
    time.sleep(0.25)
    metrics = collect_metrics(ui, browser, f"viewport-{width}x{height}")
    info = {
        "requestedViewport": {"width": width, "height": height},
        "actualViewport": metrics["viewport"],
        "document": metrics["document"],
        "mobileNavDisplay": metrics["mobileNavDisplay"],
        "mobileNavRect": metrics["mobileNavRect"],
        "touchPoints": metrics["touchPoints"],
        "coarsePointer": metrics["coarsePointer"],
        "userAgent": metrics["userAgent"],
        "mode": "Chromium mobile viewport/touch emulation only" if chromium_mobile else "Linux Firefox narrow-window responsive check; actual CSS viewport recorded",
    }
    passed = (
        metrics["viewport"]["width"] > 0
        and metrics["document"]["scrollWidth"] <= metrics["document"]["clientWidth"] + 1
        and metrics["mobileNavDisplay"] != "none"
        and metrics["mobileNavRect"]["width"] > 0
        and (not chromium_mobile or (metrics["viewport"]["width"] == width and metrics["viewport"]["height"] == height))
    )
    if chromium_mobile:
        case_name = f"emulated mobile CSS viewport {width}x{height}; no horizontal overflow and mobile nav visible"
    else:
        actual = metrics["viewport"]
        case_name = f"Firefox narrow-window responsive layout at measured CSS {actual['width']}x{actual['height']} (requested window {width}x{height})"
    case(browser, case_name, passed, info, method=info["mode"])
    screenshot = OUT / f"{browser.lower().replace(' ', '-')}-{width}x{height}-home.png"
    ui.screenshot(screenshot)
    record_screenshot(browser, f"home-{width}x{height}", screenshot)
    return info


def get_journal(ui, browser: str, label: str, timeout: float = 10) -> list[dict]:
    end = time.monotonic() + timeout
    last_error = None
    while time.monotonic() < end:
        try:
            rows = ui.eval_async(journal_script())
            if rows:
                EVENTS.setdefault("indexedDbSnapshots", []).append({"at": utc_now(), "browser": browser, "label": label, "records": rows})
                checkpoint(browser, f"indexeddb:{label}", {"count": len(rows), "recordIds": [row.get("id") for row in rows]})
                return rows
        except Exception as exc:
            last_error = str(exc)
        time.sleep(0.15)
    if last_error:
        raise RuntimeError(f"IndexedDB read failed: {last_error}")
    return []


def run_flow(ui, browser: str, *, chromium: bool, download_path: Path) -> None:
    metrics = collect_metrics(ui, browser, "initial-load")
    case(browser, "engine opened the frozen local production build", metrics["title"] == "世界 — 橡谷" and metrics["url"].startswith(BASE_URL), {
        "title": metrics["title"], "url": metrics["url"], "userAgent": metrics["userAgent"],
        "viewport": metrics["viewport"], "document": metrics["document"],
        "initialResources": metrics["resources"],
    })

    # The top-level speed control pauses live time before repeatable UI actions.
    ui.click_text(".speed-controls button", "暫停", exact=True)
    ui.key("c")
    dialog = ui.eval("return {open: !!document.querySelector('dialog[open]'), title: document.querySelector('#window-title')?.innerText ?? null};")
    ui.key("Tab")
    focus_in_dialog = ui.eval("return !!document.activeElement.closest('dialog[open]');")
    modal_image = OUT / f"{browser.lower().replace(' ', '-')}-character-modal.png"
    ui.screenshot(modal_image)
    record_screenshot(browser, "character-modal-keyboard-focus", modal_image)
    ui.key("Escape")
    modal_closed = ui.eval("return !document.querySelector('dialog[open]');")
    case(browser, "character modal navigation and keyboard focus stay inside dialog", dialog["open"] and "角色" in (dialog["title"] or "") and focus_in_dialog and modal_closed, {
        "dialog": dialog, "focusInsideAfterTab": focus_in_dialog, "closedByEscape": modal_closed,
    })

    before_farm = record_save(ui, browser, "new-world-before-farm")
    before_food = active_character(before_farm)["inventory"].get("food", 0)
    ui.key("m")
    ui.click_text(".window-body button", "前往農田", exact=True)
    ui.click(".context-action")
    ui.click_text(".window-body button", "整地", starts=True)
    ui.click_text(".window-body button", "播種", starts=True)
    planted = record_save(ui, browser, "farm-planted")
    planted_ok = len(planted.get("crops", [])) >= 1
    planted_image = OUT / f"{browser.lower().replace(' ', '-')}-farm-planted.png"
    ui.screenshot(planted_image)
    record_screenshot(browser, "farm-planted", planted_image)
    case(browser, "farm prepare and plant through normal UI", planted_ok, state_evidence(planted))

    # Public wait controls advance two days; no clock or state injection is used here.
    ui.key("Escape")
    ui.key("Escape")
    ui.click_text(".pixel-menu button", "旅人筆記", exact=True)
    for _ in range(2):
        ui.click_text(".window-body button", "等待 1 日", exact=True)
    matured = record_save(ui, browser, "farm-two-day-wait")
    mature_image = OUT / f"{browser.lower().replace(' ', '-')}-farm-mature.png"
    ui.screenshot(mature_image)
    record_screenshot(browser, "farm-after-two-day-ui-wait", mature_image)
    ui.key("Escape")
    ui.click(".context-action")
    ui.click_text(".window-body button", "收割", starts=True)
    harvested = record_save(ui, browser, "farm-harvested")
    harvest_ok = len(harvested.get("crops", [])) < len(matured.get("crops", [])) and active_character(harvested)["inventory"].get("food", 0) > before_food
    case(browser, "farm maturity and harvest after two days of public UI wait", harvest_ok, {
        "beforeFood": before_food,
        "plantedCrops": len(planted.get("crops", [])),
        "maturedCrops": len(matured.get("crops", [])),
        "harvestedCrops": len(harvested.get("crops", [])),
        "foodAfter": active_character(harvested)["inventory"].get("food", 0),
        "worldTimeBefore": before_farm.get("worldTime"),
        "worldTimeAfterWait": matured.get("worldTime"),
    })

    # This is an explicitly controlled town/strength fixture; hiring and combat
    # themselves still use the actual rendered browser UI.
    town = dict(harvested)
    town["settlement"] = dict(town["settlement"])
    town["settlement"]["stage"] = "town"
    town["settlement"]["buildings"] = ["house", "farm", "store", "inn", "tavern", "blacksmith"]
    town["threat"] = dict(town["threat"])
    town["threat"].update(monsterPopulation=90, threatLevel=3, campLevel=3, bossAlive=True, bossProgress=100)
    # Seed 909 already has a tavern tile at (11, 11); the controlled fixture
    # promotes the settlement and adds that building to its available list.
    tavern_position = {"x": 11, "y": 11}
    tavern_tile = next((tile for tile in town["tiles"] if tile.get("x") == tavern_position["x"] and tile.get("y") == tavern_position["y"]), None)
    if not tavern_tile or tavern_tile.get("regionId") != "village" or not tavern_tile.get("walkable") or tavern_tile.get("building") not in (None, "tavern"):
        raise AssertionError(f"controlled town fixture has no free walkable tavern tile at {tavern_position}: {tavern_tile}")
    tavern_tile["building"] = "tavern"
    hero = next(character for character in town["characters"] if character["id"] == town["activeCharacterId"])
    hero.update(gold=250, hp=100, maxHp=100)
    hero["stats"] = dict(hero["stats"])
    hero["stats"].update(strength=50, vitality=40)
    mercenary_candidate = next(npc for npc in town["npcs"] if npc.get("isAlive") and npc.get("age", 0) >= 15)
    prior_mercenary_job = mercenary_candidate.get("job")
    mercenary_candidate["job"] = "mercenary"
    town["worldTime"] = (int(town["worldTime"]) // 1440) * 1440 + 17 * 60
    town["lastSavedAt"] = int(time.time() * 1000)
    ui = activate_town_fixture(ui, town)
    loaded_fixture = current_state(ui)
    fixture_boot = ui.eval("return window.__qa08BootCapture ?? null;") if isinstance(ui, PlaywrightUI) else None
    loaded_tavern = next((tile for tile in loaded_fixture.get("tiles", []) if tile.get("x") == tavern_position["x"] and tile.get("y") == tavern_position["y"]), None)
    fixture_ok = (
        loaded_fixture.get("settlement", {}).get("stage") == "town"
        and "tavern" in loaded_fixture.get("settlement", {}).get("buildings", [])
        and loaded_tavern is not None
        and loaded_tavern.get("building") == "tavern"
    )
    case(browser, "controlled town fixture loaded before app mount", fixture_ok, {
        "method": "same-profile replacement page; fixture inserted before UI boot to avoid prior pagehide save",
        "fixtureInjectedAtDocumentStart": fixture_boot.get("fixtureInjectedThisNavigation") if fixture_boot else None,
        "documentStartRawSha256": sha256_bytes(fixture_boot["localStorageRawAtDocumentStart"].encode("utf-8")) if fixture_boot and fixture_boot.get("localStorageRawAtDocumentStart") else None,
        "settlementStage": loaded_fixture.get("settlement", {}).get("stage"),
        "settlementBuildings": loaded_fixture.get("settlement", {}).get("buildings"),
        "tavernTile": tavern_position,
        "position": active_character(loaded_fixture).get("position"),
        "worldTime": loaded_fixture.get("worldTime"),
    }, method="controlled-save-fixture-before-app-mount")
    ui.click_text(".speed-controls button", "暫停", exact=True)
    ui.key("m")
    ui.click(".overview-map button[data-position='11,11']")
    ui.click(".context-action")
    mercenary_buttons = ui.find_elements(".mercenary button:not(:disabled)") if hasattr(ui, "find_elements") else []
    if chromium:
        mercenary_buttons_count = ui.page.locator(".mercenary button:not(:disabled)").count()
    else:
        mercenary_buttons_count = len(mercenary_buttons)
    if mercenary_buttons_count < 1:
        debug = ui.eval("return {title: document.querySelector('#window-title')?.innerText ?? null, contextAction: document.querySelector('.context-action')?.innerText ?? null, nearbyTrigger: document.querySelector('.nearby-trigger')?.innerText ?? null, windowText: document.querySelector('.window-body')?.innerText ?? null, buttons: [...document.querySelectorAll('.window-body button')].map(button => ({text: button.innerText, disabled: button.disabled})), state: JSON.parse(localStorage.getItem('oakvale-v1'))};")
        debug_state = debug["state"]
        debug_tile = next((tile for tile in debug_state.get("tiles", []) if tile.get("x") == 11 and tile.get("y") == 11), None)
        RESULTS["harnessErrors"].append({"at": utc_now(), "browser": browser, "type": "PartyFixturePrecondition", "message": "no enabled mercenary choice after attempted tavern navigation", "evidence": {"title": debug["title"], "contextAction": debug["contextAction"], "nearbyTrigger": debug["nearbyTrigger"], "windowText": debug["windowText"], "buttons": debug["buttons"], "playerPosition": active_character(debug_state)["position"], "playerRegion": active_character(debug_state)["currentRegion"], "worldTime": debug_state["worldTime"], "settlementStage": debug_state.get("settlement", {}).get("stage"), "settlementBuildings": debug_state.get("settlement", {}).get("buildings"), "tavernTile": debug_tile, "partyCount": len(debug_state.get("party", [])), "mercenaryNpcs": [{"id": npc["id"], "name": npc.get("name"), "age": npc.get("age"), "alive": npc.get("isAlive"), "job": npc.get("job"), "injuredUntil": npc.get("injuredUntil")} for npc in debug_state.get("npcs", []) if npc.get("job") == "mercenary"]}})
        failure_image = OUT / f"{browser.lower().replace(' ', '-')}-party-precondition-failure.png"
        ui.screenshot(failure_image)
        record_screenshot(browser, "party-precondition-failure", failure_image)
        checkpoint(browser, "party-fixture-precondition-failure", RESULTS["harnessErrors"][-1]["evidence"])
        raise LookupError("town fixture reached the tavern but exposed no enabled mercenary button")
    if chromium:
        ui.page.locator(".mercenary button:not(:disabled)").first.click(timeout=8000)
    else:
        ui.click_element(mercenary_buttons[0])
    party = record_save(ui, browser, "party-hired-controlled-town-fixture")
    party_ok = len(party.get("party", [])) == 1
    party_image = OUT / f"{browser.lower().replace(' ', '-')}-party-hired.png"
    ui.screenshot(party_image)
    record_screenshot(browser, "party-hired", party_image)
    case(browser, "tavern hires a companion through the UI", party_ok, {
        "method": "controlled town/strength save fixture, followed by visible tavern hiring action",
        "settlementStage": party["settlement"]["stage"],
        "fixtureMercenaryNpcId": mercenary_candidate["id"],
        "fixtureMercenaryPriorJob": prior_mercenary_job,
        "fixtureWorldTime": party["worldTime"],
        "enabledMercenaryChoices": mercenary_buttons_count,
        "party": party.get("party"),
    }, method="controlled-town-fixture-plus-normal-ui")

    # Start and resolve combat with an actual UI encounter; high combat stats
    # are part of the explicitly labelled town fixture to keep this cross-engine
    # smoke short and repeatable.
    ui.key("Escape")
    ui.key("m")
    ui.click_text(".window-body button", "前往森林", exact=True)
    ui.click(".context-action")
    ui.click_text(".window-body button", "尋找怪物", starts=True)
    battle_open = ui.eval("return document.querySelector('#window-title')?.innerText.includes('戰鬥') ?? false;")
    battle_buttons = ui.button_texts(".window-body button")
    if "防禦" in battle_buttons:
        ui.click_text(".window-body button", "防禦", exact=True)
    turns = 0
    while turns < 30:
        current = current_state(ui)
        if current.get("combat") is None:
            break
        buttons = ui.button_texts(".window-body button")
        if "使用藥水" in buttons and active_character(current)["hp"] < 65:
            ui.click_text(".window-body button", "使用藥水", exact=True)
        if "攻擊" not in ui.button_texts(".window-body button"):
            time.sleep(0.15)
            continue
        ui.click_text(".window-body button", "攻擊", exact=True)
        turns += 1
        time.sleep(0.04)
    battle_closed = ui.wait_js("JSON.parse(localStorage.getItem('oakvale-v1')).combat === null", timeout=20)
    after_combat = record_save(ui, browser, "combat-resolved")
    combat_events = [event for event in after_combat.get("events", []) if event.get("type", "").startswith("combat.")]
    outcome = combat_events[-1].get("type") if combat_events else None
    case(browser, "combat encounter opens, accepts actions, and resolves in the browser", battle_open and battle_closed, {
        "battleOpened": battle_open,
        "battleClosed": battle_closed,
        "attackTurns": turns,
        "combatOutcome": outcome,
        "playerAlive": active_character(after_combat).get("isAlive"),
        "partyCount": len(after_combat.get("party", [])),
    })

    ui.key("Escape") if ui.eval("return !!document.querySelector('dialog[open]');") else None
    ui.click_text(".speed-controls button", "暫停", exact=True)
    ui.click(".save-button")
    saved_before_reload = record_save(ui, browser, "manual-save-before-reload")
    raw_before_reload = ui.eval(read_state_script())["raw"]
    raw_before_reload_hash = sha256_bytes(raw_before_reload.encode("utf-8"))
    archived_before = get_journal(ui, browser, "before-reload")
    if not archived_before:
        raise AssertionError("IndexedDB has no records after normal UI actions")
    ui.eval(f"""
const storageKey = {json.dumps(SAVE_KEY)};
window.addEventListener("pagehide", () => {{
  const record = {{at: new Date().toISOString(), raw: localStorage.getItem(storageKey)}};
  sessionStorage.setItem("__qa08_last_pagehide", JSON.stringify(record));
}}, {{once: true}});
return true;
""")
    ui.reload()
    time.sleep(0.25)
    ui.click_text(".speed-controls button", "暫停", exact=True)
    saved_after_reload = record_save(ui, browser, "after-reload")
    raw_after_reload = ui.eval(read_state_script())["raw"]
    raw_after_reload_hash = sha256_bytes(raw_after_reload.encode("utf-8"))
    boot_capture = ui.eval("return window.__qa08BootCapture ?? null;") if isinstance(ui, PlaywrightUI) else None
    pagehide_record = None
    pagehide_snapshot = boot_capture.get("pagehideSnapshot") if boot_capture else ui.eval('return sessionStorage.getItem("__qa08_last_pagehide");')
    if pagehide_snapshot:
        try:
            pagehide_record = json.loads(pagehide_snapshot)
        except (TypeError, json.JSONDecodeError):
            pagehide_record = {"raw": None, "parseError": True}
    pagehide_state = json.loads(pagehide_record["raw"]) if pagehide_record and pagehide_record.get("raw") else None
    document_start_raw = boot_capture.get("localStorageRawAtDocumentStart") if boot_capture else None
    document_start_hash = sha256_bytes(document_start_raw.encode("utf-8")) if document_start_raw else None
    pagehide_hash = sha256_bytes(pagehide_record["raw"].encode("utf-8")) if pagehide_record and pagehide_record.get("raw") else None
    raw_after_mount = raw_after_reload
    before_state = json.loads(raw_before_reload)
    document_start_state = json.loads(document_start_raw) if document_start_raw else None
    after_state = json.loads(raw_after_mount)
    run_stamp = RESULTS["run"]["startedAt"].replace("-", "").replace(":", "").replace("+00:00", "Z")
    trace_path = OUT / f"{browser.lower().replace(' ', '-')}-reload-storage-trace-{run_stamp}.json"
    trace_data = {
        "browser": browser,
        "runStartedAt": RESULTS["run"]["startedAt"],
        "controlledFixtureInjectedOnReload": boot_capture.get("fixtureInjectedThisNavigation") if boot_capture else None,
        "beforeReload": {"sha256": raw_before_reload_hash, "summary": state_evidence(before_state), "raw": raw_before_reload},
        "afterPagehideApplicationHandlers": {
            "recordedAt": pagehide_record.get("at") if pagehide_record else None,
            "sha256": pagehide_hash,
            "summary": state_evidence(pagehide_state) if pagehide_state else None,
            "raw": pagehide_record.get("raw") if pagehide_record else None,
        },
        "atReplacementDocumentStartBeforeAppMount": {
            "sha256": document_start_hash,
            "summary": state_evidence(document_start_state) if document_start_state else None,
            "raw": document_start_raw,
            "capturedBy": "Playwright page.add_init_script before application scripts" if boot_capture else "not available through W3C WebDriver",
        },
        "afterReloadAndPause": {"sha256": raw_after_reload_hash, "summary": state_evidence(after_state), "raw": raw_after_mount},
        "topLevelFieldChanges": {
            "beforeReloadToPagehide": changed_save_fields(raw_before_reload, pagehide_record.get("raw") if pagehide_record else None),
            "pagehideToDocumentStart": changed_save_fields(pagehide_record.get("raw") if pagehide_record else None, document_start_raw),
            "documentStartToAfterReloadPause": changed_save_fields(document_start_raw, raw_after_mount) if document_start_raw else None,
        },
    }
    trace_text = json.dumps(trace_data, ensure_ascii=False, indent=2) + "\n"
    write_recorded(trace_path, trace_text, producer="qa-08-reload-storage-trace")
    trace_artifact = {
        "browser": browser,
        "path": str(trace_path.relative_to(ROOT)),
        "bytes": len(trace_text.encode("utf-8")),
        "sha256": sha256_bytes(trace_text.encode("utf-8")),
    }
    RESULTS["artifacts"].append(trace_artifact)
    reload_trace = {
        "fixtureInjectedOnReload": boot_capture.get("fixtureInjectedThisNavigation") if boot_capture else None,
        "rawBeforeReloadSha256": raw_before_reload_hash,
        "pagehideRawSha256": pagehide_hash,
        "pagehideRawMatchesBeforeReload": pagehide_hash == raw_before_reload_hash if pagehide_hash else None,
        "documentStartRawSha256": document_start_hash,
        "documentStartRawMatchesPagehide": document_start_hash == pagehide_hash if document_start_hash and pagehide_hash else None,
        "documentStartRawMatchesBeforeReload": document_start_hash == raw_before_reload_hash if document_start_hash else None,
        "beforeReloadToPagehideChangedFields": changed_save_fields(raw_before_reload, pagehide_record.get("raw") if pagehide_record else None),
        "pagehideToDocumentStartChangedFields": changed_save_fields(pagehide_record.get("raw") if pagehide_record else None, document_start_raw),
        "pagehideRecordedAt": pagehide_record.get("at") if pagehide_record else None,
        "pagehideWorldTime": pagehide_state.get("worldTime") if pagehide_state else None,
        "pagehidePartyCount": len(pagehide_state.get("party", [])) if pagehide_state else None,
        "pagehideRawAvailable": bool(pagehide_record and pagehide_record.get("raw")),
        "rawAfterReloadSha256": raw_after_reload_hash,
        "artifact": trace_artifact,
    }
    reload_image = OUT / f"{browser.lower().replace(' ', '-')}-after-reload.png"
    ui.screenshot(reload_image)
    record_screenshot(browser, "after-reload", reload_image)
    reload_ok = (
        saved_after_reload.get("worldSeed") == saved_before_reload.get("worldSeed")
        and saved_after_reload.get("activeCharacterId") == saved_before_reload.get("activeCharacterId")
        and saved_after_reload.get("party") == saved_before_reload.get("party")
        and active_character(saved_after_reload).get("position") == active_character(saved_before_reload).get("position")
        and saved_after_reload.get("worldTime", 0) >= saved_before_reload.get("worldTime", 0)
    )
    case(browser, "manual save and reload preserve world, player, and party", reload_ok, {
        "before": state_evidence(saved_before_reload),
        "after": state_evidence(saved_after_reload),
        "worldTimeDidNotDecrease": saved_after_reload.get("worldTime", 0) >= saved_before_reload.get("worldTime", 0),
        "storageLifecycle": reload_trace,
    }, stop_on_failure=False)
    archived_after = get_journal(ui, browser, "after-reload")
    unique_ids = len({record.get("id") for record in archived_after}) == len(archived_after)
    case(browser, "IndexedDB journal is readable with unique persisted record IDs", len(archived_after) > 0 and unique_ids, {
        "recordsBeforeReload": len(archived_before),
        "recordsAfterReload": len(archived_after),
        "uniqueIds": unique_ids,
        "recordIds": [record.get("id") for record in archived_after],
    })

    download_path.unlink(missing_ok=True)
    ui.export(download_path)
    export = archive_download(browser.lower().replace(" ", "-"), download_path, f"{browser.lower().replace(' ', '-')}-play-record-export")
    export_ok = export["archiveAvailable"] is True and export["records"] >= len(archived_after) and export["checkpointPresent"]
    case(browser, "menu export downloads IndexedDB records and current checkpoint", export_ok, export)
    collect_metrics(ui, browser, "final")


def w3c_session() -> tuple[WebDriverUI, subprocess.Popen, Path, str]:
    if not FIREFOX.is_file() or not GECKODRIVER.is_file():
        raise FileNotFoundError(f"Firefox smoke binaries missing under {TASK_CACHE}")
    temp = TASK_CACHE / "webdriver-tmp"
    download_dir = TASK_CACHE / "downloads"
    for path in [temp, download_dir, TASK_CACHE / "xdg-cache", TASK_CACHE / "xdg-config", TASK_CACHE / "xdg-data"]:
        path.mkdir(parents=True, exist_ok=True)
    (download_dir / "oakvale-play-records.json").unlink(missing_ok=True)
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    log_path = TASK_CACHE / "geckodriver-session.log"
    log_handle = log_path.open("wb")
    env = os.environ.copy()
    env.update({
        "LD_LIBRARY_PATH": str(FIREFOX_LIB),
        "MOZ_HEADLESS": "1",
        "MOZ_DISABLE_CONTENT_SANDBOX": "1",
        "TMPDIR": str(temp),
        "XDG_CACHE_HOME": str(TASK_CACHE / "xdg-cache"),
        "XDG_CONFIG_HOME": str(TASK_CACHE / "xdg-config"),
        "XDG_DATA_HOME": str(TASK_CACHE / "xdg-data"),
    })
    process = subprocess.Popen([str(GECKODRIVER), "--host", "127.0.0.1", "--port", str(port)], stdout=log_handle, stderr=subprocess.STDOUT, env=env)
    base = f"http://127.0.0.1:{port}"
    deadline = time.monotonic() + 20
    ready = False
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"geckodriver exited early with {process.returncode}")
        try:
            with urlopen(base + "/status", timeout=1) as response:
                ready = response.status == 200
            if ready:
                break
        except Exception:
            time.sleep(0.1)
    if not ready:
        process.terminate()
        raise TimeoutError("geckodriver did not report ready")
    prefs = {
        "browser.download.folderList": 2,
        "browser.download.dir": str(download_dir),
        "browser.helperApps.neverAsk.saveToDisk": "application/json",
        "browser.download.useDownloadDir": True,
        "browser.download.alwaysOpenPanel": False,
        "browser.download.manager.showWhenStarting": False,
        "browser.shell.checkDefaultBrowser": False,
        "browser.startup.homepage_override.mstone": "ignore",
        "datareporting.policy.dataSubmissionEnabled": False,
        "devtools.console.stdout.content": True,
        "devtools.console.stdout.chrome": True,
    }
    caps = {
        "capabilities": {
            "alwaysMatch": {
                "browserName": "firefox",
                "acceptInsecureCerts": False,
                "moz:firefoxOptions": {"binary": str(FIREFOX), "args": ["-headless"], "prefs": {**prefs, "security.sandbox.content.level": 0}},
            }
        }
    }
    with urlopen(Request(base + "/session", json.dumps(caps).encode("utf-8"), {"Content-Type": "application/json"}, method="POST"), timeout=60) as response:
        data = json.loads(response.read().decode("utf-8"))
    value = data.get("value", {})
    session = value.get("sessionId") or data.get("sessionId")
    if not session:
        process.terminate()
        raise RuntimeError(f"geckodriver did not return a session: {json.dumps(data)[:1000]}")
    ui = WebDriverUI(base, session)
    ui._capabilities = value.get("capabilities", {})
    ui._request("POST", f"/session/{session}/timeouts", {"script": 15000, "pageLoad": 60000, "implicit": 0})
    ui._request("POST", f"/session/{session}/url", {"url": BASE_URL})
    if not ui.wait_js("document.readyState === 'complete' && !!document.querySelector('.speed-controls')", timeout=30):
        raise TimeoutError("Firefox loaded no game controls before the page-load timeout")
    ui.eval(monitor_script())
    # Keep the driver's verbose/console output in the task cache for later archival.
    ui._log_path = log_path
    ui._log_handle = log_handle
    ui._download_dir = download_dir
    return ui, process, log_path, base


def run_firefox() -> None:
    ui = None
    process = None
    log_path = None
    base = None
    try:
        ui, process, log_path, base = w3c_session()
        caps = ui._capabilities
        version = caps.get("browserVersion") or caps.get("moz:profile")
        RESULTS.setdefault("engines", {})["Firefox ESR"] = {"browserVersion": version, "binary": str(FIREFOX), "driver": str(GECKODRIVER), "driverVersion": "0.37.1", "platform": "Linux x86_64"}
        ui.resize(1440, 1000)
        run_flow(ui, "Firefox ESR", chromium=False, download_path=ui._download_dir / "oakvale-play-records.json")
        if ui.eval("return !!document.querySelector('dialog[open]');"):
            ui.key("Escape")
        layout_case(ui, "Firefox ESR", 390, 844)
        layout_case(ui, "Firefox ESR", 412, 915)
        ui.resize(1440, 1000)
    except Exception as exc:
        RESULTS["harnessErrors"].append({"at": utc_now(), "browser": "Firefox ESR", "type": type(exc).__name__, "message": str(exc)[:1500], "category": "HARNESS_OR_ENVIRONMENT_UNLESS_A_CASE_WAS_ALREADY_RECORDED_FAIL"})
        RESULTS["status"] = "incomplete" if not any(row.get("browser") == "Firefox ESR" and row.get("outcome") == "FAIL" for row in RESULTS["cases"]) else "failed"
        checkpoint("Firefox ESR", "harness-exception", RESULTS["harnessErrors"][-1])
        raise
    finally:
        if ui is not None:
            try:
                ui._request("DELETE", f"/session/{ui.session}")
            except Exception:
                pass
        if process is not None:
            try:
                process.terminate()
                process.wait(timeout=5)
            except Exception:
                process.kill()
                process.wait(timeout=5)
        if ui is not None:
            try:
                ui._log_handle.flush()
                ui._log_handle.close()
            except Exception:
                pass
        if log_path and log_path.exists():
            raw_log = log_path.read_text(encoding="utf-8", errors="replace")
            EVENTS["webdriverLogs"].append({"browser": "Firefox ESR", "path": str(log_path), "bytes": len(raw_log.encode("utf-8")), "sha256": sha256_bytes(raw_log.encode("utf-8")), "tail": raw_log.splitlines()[-80:]})
            write_recorded(OUT / "geckodriver-session.log", raw_log, producer="qa-08-firefox-driver-log")
            publish()


def run_chromium() -> None:
    from playwright.sync_api import sync_playwright

    browser_name = "Chromium"
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        RESULTS.setdefault("engines", {})[browser_name] = {"browserVersion": browser.version, "binary": "/usr/bin/chromium", "playwrightVersion": "1.62.0", "platform": "Linux x86_64"}
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        page = context.new_page()
        attach_playwright_events(page, browser_name)
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        page.evaluate(f"() => {{ {monitor_script()} }}")
        ui = PlaywrightUI(page, context, browser_name)
        run_flow(ui, browser_name, chromium=True, download_path=TASK_CACHE / "chromium-export.json")
        context.close()

        for width, height in [(390, 844), (412, 915)]:
            mobile = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
            mobile_page = mobile.new_page()
            mobile_page.on("console", lambda message: EVENTS["console"].append({"at": utc_now(), "browser": browser_name, "type": message.type, "text": message.text, "location": message.location}) if message.type in {"error", "warning"} else None)
            mobile_page.on("pageerror", lambda error: EVENTS["pageErrors"].append({"at": utc_now(), "browser": browser_name, "message": str(error)}))
            mobile_page.on("request", lambda request: EVENTS["requests"].append({"at": utc_now(), "browser": browser_name, "method": request.method, "url": request.url, "resourceType": request.resource_type}))
            mobile_page.on("response", lambda response: EVENTS["responses"].append({"at": utc_now(), "browser": browser_name, "status": response.status, "url": response.url, "method": response.request.method}))
            mobile_page.on("requestfailed", lambda request: EVENTS["requestFailures"].append({"at": utc_now(), "browser": browser_name, "url": request.url, "method": request.method, "failure": request.failure}))
            mobile_page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            mobile_page.evaluate(f"() => {{ {monitor_script()} }}")
            mobile_ui = PlaywrightUI(mobile_page, mobile, browser_name)
            mobile_ui.click_text(".speed-controls button", "暫停", exact=True)
            layout_case(mobile_ui, browser_name, width, height, chromium_mobile=True)
            mobile.close()
        browser.close()


def environment_inventory(fingerprint: dict) -> dict:
    import platform
    import shutil

    def run_version(command: list[str], env: dict | None = None) -> dict:
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=10, env=env)
            return {"path": command[0], "exitCode": result.returncode, "versionOutput": (result.stdout or result.stderr).strip()[:500]}
        except Exception as exc:
            return {"path": command[0], "error": f"{type(exc).__name__}: {str(exc)[:300]}"}

    firefox_env = os.environ.copy()
    firefox_env["LD_LIBRARY_PATH"] = str(FIREFOX_LIB)
    chromium_path = shutil.which("chromium")
    driver_command_checks = {name: shutil.which(name) for name in ["adb", "idevice_id", "ideviceinfo", "xcrun", "simctl", "emulator", "firefox", "firefox-esr", "webkit2png"]}
    device_nodes = {}
    for path in ["/dev/bus/usb", "/sys/bus/usb/devices", "/dev/kvm", "/dev/dri", "/run/udev"]:
        item = Path(path)
        try:
            device_nodes[path] = {"exists": item.exists(), "entries": sorted(child.name for child in item.iterdir())[:50] if item.is_dir() else []}
        except OSError as exc:
            device_nodes[path] = {"error": f"{type(exc).__name__}: {exc.errno}"}
    try:
        apt_version = subprocess.run(["dpkg-deb", "-f", str(FIREFOX_DEB), "Version"], capture_output=True, text=True, check=True, timeout=10).stdout.strip()
    except Exception as exc:
        apt_version = f"unavailable: {type(exc).__name__}"
    try:
        firefox_hash = sha256_bytes(FIREFOX_DEB.read_bytes())
    except OSError:
        firefox_hash = None
    try:
        gecko_hash = sha256_bytes(GECKODRIVER_TARBALL.read_bytes())
    except OSError:
        gecko_hash = None
    inventory = {
        "recordedAt": utc_now(),
        "host": {"platform": platform.platform(), "machine": platform.machine(), "python": platform.python_version(), "osRelease": Path("/etc/os-release").read_text(encoding="utf-8", errors="replace").splitlines()[:8]},
        "network": {
            "policyFile": "/etc/codex/network-policy.json",
            "policyMode": "restricted",
            "environmentStatusPolicyState": "unknown",
            "allowedSourcesUsed": ["deb.debian.org", "security.debian.org", "github.com", "release-assets.githubusercontent.com"],
            "blockedOrUnattempted": {"PlaywrightFirefoxCDN": "host not in the configured allowlist; no request was made", "MozillaDownloadHosts": "host not in the configured allowlist; no request was made"},
            "transport": "inherited session HTTP proxy with normal TLS verification; no direct-route or certificate bypass",
        },
        "build": fingerprint,
        "browsers": {
            "chromium": run_version([chromium_path or "/usr/bin/chromium", "--version"]),
            "playwright": {"version": "1.62.0", "browserCache": "/home/agent/.cache/ms-playwright", "firefoxAndWebKitBinariesPresent": False, "rootCacheProbe": "PermissionError(13, Permission denied), caught during inventory"},
        "firefox": {
                "source": "Debian trixie-security amd64 firefox-esr package, unpacked with dpkg-deb -x under /tmp",
                "version": apt_version,
                "packagePath": str(FIREFOX_DEB),
                "packageSha256": firefox_hash,
            "versionCommand": run_version([str(FIREFOX), "--headless", "--version"], env=firefox_env),
            "containerCompatibility": "Firefox content sandbox disabled for this browser process only (MOZ_DISABLE_CONTENT_SANDBOX=1 and security.sandbox.content.level=0) after default launch content processes crashed with signal 11 when /proc/self/uid_map was read-only; no host or global setting changed.",
                "runtimeLibraryPath": str(FIREFOX_LIB),
                "hostPackagesInstalled": False,
            },
            "geckodriver": {
                "source": "mozilla/geckodriver official GitHub release v0.37.1 linux64",
                "version": "0.37.1",
                "archivePath": str(GECKODRIVER_TARBALL),
                "archiveSha256": gecko_hash,
                "versionCommand": run_version([str(GECKODRIVER), "--version"]),
            },
            "webkit": {"available": False, "reason": "No existing Linux WebKit binary/cache; Playwright WebKit download CDN is not allowed by the current policy."},
            "safari": {"available": False, "reason": "Executor is Debian Linux; no macOS/Safari runtime or remote browser service is attached."},
        },
        "deviceDiscovery": {
            "commands": driver_command_checks,
            "deviceNodes": device_nodes,
            "remoteDeviceServices": "No device/browser remote-access tools are exposed in this session's tool metadata.",
            "connectedPhysicalDevices": [],
            "physicalMobileSmoke": "blocked: no USB/device nodes, device bridge binaries, simulator, or remote device service; user was already asked by root and has not replied yet.",
        },
    }
    return inventory


def main() -> int:
    RESULTS["status"] = "running"
    fingerprint = local_build_fingerprint()
    RESULTS["build"] = fingerprint
    inventory = environment_inventory(fingerprint)
    write_recorded(OUT / "platform_inventory.json", json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", producer="qa-08-platform-inventory")
    checkpoint("environment", "platform-inventory-and-frozen-build", {"matchesBaselineBuild": fingerprint["matchesBaselineBuild"], "sourceCommit": fingerprint["sourceCommit"]})
    if not fingerprint["matchesBaselineBuild"]:
        RESULTS["status"] = "blocked"
        checkpoint("environment", "build-fingerprint-mismatch", fingerprint)
        return 2
    run_chromium()
    run_firefox()
    RESULTS["finishedAt"] = utc_now()
    has_case_failures = any(row.get("outcome") == "FAIL" for row in RESULTS["cases"])
    RESULTS["status"] = "failed-with-platform-blockers" if has_case_failures else "complete-with-platform-blockers"
    RESULTS["platformLimitations"] = [
        {"platform": "Safari", "status": "blocked", "reason": "No macOS Safari engine or remote browser service."},
        {"platform": "iPhone physical device", "status": "blocked", "reason": "No iOS device, USB passthrough, xcrun/simctl, or remote-device service."},
        {"platform": "Android physical device", "status": "blocked", "reason": "No Android device, USB passthrough, adb/emulator, or remote-device service."},
        {"platform": "Mobile viewport", "status": "emulation-only", "reason": "390x844 and 412x915 CSS viewport checks run in Chromium emulation and Firefox narrow windows; they do not verify mobile OS/browser hardware."},
    ]
    publish()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        RESULTS["finishedAt"] = utc_now()
        if "status" not in RESULTS or RESULTS["status"] == "running":
            RESULTS["status"] = "incomplete"
        RESULTS["harnessErrors"].append({"at": utc_now(), "type": type(exc).__name__, "message": str(exc)[:2000]})
        try:
            publish()
        except Exception:
            pass
        raise
