"""Independent controlled browser check for Phase 4 gear sale UI.

This is a one-off controlled fixture run. It is not a normal-play result or a soak.
Do not launch until the Phase 4 root runner grants its Low gate.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

FIXTURE = HERE / "village-gear-sale-save.json"
METADATA = HERE / "fixture-metadata.json"
BUILD = ROOT / "reports/v2/20261006-reward-core/phase-04/build-status.json"
RUNTIME_STATUS = ROOT / "reports/v2/20261006-reward-core/phase-04/final-runtime-status.json"
OUT = HERE / "controlled-gear-sale.json"
SCREENSHOT = HERE / "gear-compare-390.png"
URL = os.environ.get("PLW_V2_URL", "http://127.0.0.1:5202")
SAVE_KEY = "oakvale-v1"
EXPECTED_HEAD = "d3c689985e7e4553a85148ba2a5ea3be7685cb1f"
EXPECTED_SOURCE_FINGERPRINT = "71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def current_source() -> dict[str, str]:
    paths = subprocess.check_output(["rg", "--files", "src"], cwd=ROOT, text=True).splitlines()
    return {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in sorted(paths)}


class AssetPaths(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.paths: list[str] = []

    def handle_starttag(self, tag, attrs) -> None:
        values = dict(attrs)
        path = values.get("src") if tag == "script" else values.get("href") if tag == "link" else None
        if path and path.split("?", 1)[0].endswith((".js", ".css")):
            self.paths.append(path.split("?", 1)[0].lstrip("/"))


def http_bytes(path: str) -> tuple[int, bytes]:
    with urlopen(URL.rstrip("/") + path, timeout=4) as response:
        return response.status, response.read()


def verify_served_build() -> dict:
    """Prove the selected URL serves the exact frozen dist assets and runtime manifest bytes."""
    runtime = json.loads(RUNTIME_STATUS.read_text(encoding="utf-8"))
    server = runtime.get("server", {})
    if server.get("ready") is not True or server.get("head") != EXPECTED_HEAD:
        raise AssertionError("Original final-runtime-status does not attest a ready server at the expected HEAD.")
    if server.get("sourceSha256") != source:
        raise AssertionError("Original final-runtime-status server source map differs from the current ALL74 map.")
    status, served_index = http_bytes("/")
    disk_index = (ROOT / "dist/index.html").read_bytes()
    if status != 200 or served_index != disk_index:
        raise AssertionError(f"Served index differs from frozen dist/index.html (HTTP {status}).")
    index_sha = hashlib.sha256(served_index).hexdigest()
    if index_sha != server.get("indexSha256") or index_sha != server.get("distIndexSha256"):
        raise AssertionError("Served index does not match the original final-runtime-status and dist hashes.")
    parser = AssetPaths()
    parser.feed(served_index.decode("utf-8"))
    if not parser.paths:
        raise AssertionError("Served index references no local JavaScript/CSS production assets.")
    expected_bundles = {entry.get("urlPath", "").lstrip("/"): entry.get("sha256")
                        for entry in server.get("bundles", [])}
    if set(parser.paths) != set(expected_bundles):
        raise AssertionError("Served bundle paths differ from the original final-runtime-status manifest.")
    bundles = []
    dist_root = (ROOT / "dist").resolve()
    for relative in parser.paths:
        path = (dist_root / relative).resolve()
        if dist_root not in path.parents or not path.is_file():
            raise AssertionError(f"Invalid or missing frozen production asset: {relative}")
        status, served = http_bytes("/" + relative)
        disk = path.read_bytes()
        digest = hashlib.sha256(served).hexdigest()
        if status != 200 or served != disk or digest != expected_bundles.get(relative):
            raise AssertionError(f"Served asset differs from dist or original runtime hash: {relative} (HTTP {status}).")
        bundles.append({"path": relative, "bytes": len(served), "sha256": digest})
    return {"url": URL, "indexBytes": len(served_index), "indexSha256": index_sha, "bundles": bundles,
            "matchedDistBytes": True, "matchedOriginalFinalRuntimeStatus": True,
            "runtimeStatusSha256": digest_file(RUNTIME_STATUS)}


def digest_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


metadata = json.loads(METADATA.read_text(encoding="utf-8"))
fixture_raw = FIXTURE.read_text(encoding="utf-8")
fixture = json.loads(fixture_raw)
source = current_source()
build_status = json.loads(BUILD.read_text(encoding="utf-8"))
head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
if head != metadata["sourceCommit"] or head != EXPECTED_HEAD:
    raise AssertionError(f"Source HEAD changed since controlled fixture prep: {head}")
if source != metadata["sourceSha256"]:
    raise AssertionError("Current ALL74 src fingerprints differ from the controlled fixture metadata.")
fingerprint_payload = json.dumps(source, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
if hashlib.sha256(fingerprint_payload).hexdigest() != EXPECTED_SOURCE_FINGERPRINT:
    raise AssertionError("Current ALL74 source fingerprint differs from the Phase 4 freeze.")
if build_status.get("sourceSha256") != source or build_status.get("sourceStableDuringRun") is not True or build_status.get("exitCode") != 0:
    raise AssertionError("Current production build does not match the frozen ALL74 source fingerprint.")
if digest(FIXTURE) != metadata["fixtureSha256"]:
    raise AssertionError("Controlled save hash differs from its metadata.")
if fixture.get("saveVersion") != 2 or fixture.get("settlement", {}).get("stage") != "village":
    raise AssertionError("Controlled browser fixture is not a migrated legal V2 village save.")

result: dict = {
    "schemaVersion": 1,
    "classification": "controlled fixture browser check; not normal play, not stress, not soak, not a full-suite result",
    "sourceCommit": head,
    "sourceSha256": source,
    "buildStatusSha256": digest(BUILD),
    "fixturePath": str(FIXTURE.relative_to(ROOT)),
    "fixtureSha256": digest(FIXTURE),
    "fixtureMetadataSha256": digest(METADATA),
    "runtimeStatusSha256": digest(RUNTIME_STATUS),
    "fixtureProvenance": metadata["sourceSave"],
    "controlledFields": metadata["controls"]["manuallyControlled"],
    "controlledRewardOrigins": metadata["controls"]["generatedThroughPublicRewardApi"],
    "url": URL,
    "startedAt": datetime.now(timezone.utc).isoformat(),
    "browser": None,
    "checks": [],
    "screenshots": [],
    "servedBuildAssets": None,
    "reloads": 0,
    "errors": [],
    "limitations": [
        "The source save is from a previous recorded normal-UI playthrough, migrated by the current save service.",
        "Character position and next-day open-hours clock are controlled fixture fields; gear comes from public wolf reward APIs.",
        "This verifies sale UI state transitions only. It does not demonstrate normal-play acquisition, economy balance, or long-run stability.",
    ],
}


def publish() -> None:
    write_recorded(OUT, json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="v2x-phase4-controlled-gear-sale")


def check(name: str, **details) -> None:
    result["checks"].append({"name": name, **details})
    publish()
    print("PASS", name, flush=True)


def raw(page):
    saved = page.evaluate("key => localStorage.getItem(key)", SAVE_KEY)
    if saved is None:
        raise AssertionError("Controlled save was not retained by the running app.")
    return json.loads(saved)


def actor(state: dict) -> dict:
    return next(person for person in state["characters"] if person["id"] == state["activeCharacterId"])


def snapshot(state: dict) -> dict:
    person = actor(state)
    return {
        "gold": person["gold"],
        "equipment": person["equipment"],
        "instances": state["reward"]["instances"],
        "equipped": state["reward"]["equipped"],
        "collection": state["reward"]["collection"],
    }


def open_gear(page) -> None:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
    page.keyboard.press("i")
    expect(page.locator("dialog[open]")).to_have_count(1)
    page.get_by_role("button", name="獵獲裝備", exact=True).click()
    expect(page.locator(".gear-detail")).to_be_visible()


def select_gear(page, label: str):
    button = page.locator(".gear-layout .item-list button").filter(has_text=re.compile(label))
    expect(button).to_be_visible()
    button.click()
    expect(page.locator(".gear-detail")).to_be_visible()
    expect(page.locator(".gear-layout .item-list button[aria-pressed='true']")).to_be_visible()
    return button


def price_from(button) -> int:
    match = re.search(r"出售\s+(\d+)\s*金", button.inner_text())
    if not match:
        raise AssertionError(f"Could not read the UI sale price from {button.inner_text()!r}")
    return int(match.group(1))


def main() -> None:
    result["servedBuildAssets"] = verify_served_build()
    fixture_json = json.dumps(fixture, ensure_ascii=False)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        page = context.new_page()
        result["browser"] = browser.version
        page.on("pageerror", lambda error: result["errors"].append(str(error)))
        page.add_init_script(f"if (localStorage.getItem({json.dumps(SAVE_KEY)}) === null) localStorage.setItem({json.dumps(SAVE_KEY)}, {json.dumps(fixture_json)});")
        try:
            page.goto(URL, wait_until="domcontentloaded")
            expect(page.locator(".world-map")).to_be_visible(timeout=15000)
            loaded = raw(page)
            if loaded["reward"] != fixture["reward"] or loaded["settlement"]["stage"] != "village":
                raise AssertionError("The production app did not load the validated controlled village save intact.")
            check("current production app accepts migrated village fixture and preserves legal boss/procedural gear",
                  items=[{ "instanceId": item["instanceId"], "baseId": item["baseId"], "rarity": item["rarity"], "affixes": len(item["affixes"]) }
                         for item in loaded["reward"]["instances"]])

            open_gear(page)
            alpha = next(item for item in fixture["reward"]["instances"] if item["baseId"] != "moonFangSpear")
            boss = next(item for item in fixture["reward"]["instances"] if item["baseId"] == "moonFangSpear")
            select_gear(page, r"^(?:普通|精良|稀有|史詩|傳說) 獵矛\s*Lv\.")
            expect(page.locator(".gear-comparison")).to_contain_text("候選裝備")
            expect(page.locator(".gear-affix-compare .gear-affixes").first).not_to_contain_text("沒有附加詞綴")
            page.set_viewport_size({"width": 390, "height": 844})
            expect(page.locator(".gear-detail")).to_be_visible()
            if page.evaluate("document.documentElement.scrollWidth > window.innerWidth"):
                raise AssertionError("390px gear comparison has horizontal document overflow.")
            page.screenshot(path=str(SCREENSHOT), full_page=True)
            result["screenshots"].append(str(SCREENSHOT.relative_to(ROOT)))
            check("390px same-window stats and affix comparison renders without horizontal overflow",
                  selectedInstanceId=alpha["instanceId"], affixCount=len(alpha["affixes"]))

            before = snapshot(raw(page))
            alpha_sale = page.get_by_role("button", name=re.compile(r"出售\s+\d+\s*金"))
            alpha_price = price_from(alpha_sale)
            alpha_sale.click()
            expect(page.locator(".gear-sale-confirm")).to_be_visible()
            expect(page.locator(".gear-sale-confirm")).to_contain_text(f"取得 {alpha_price} 金")
            page.get_by_role("button", name="保留這件裝備", exact=True).click()
            expect(page.locator(".gear-sale-confirm")).to_have_count(0)
            if snapshot(raw(page)) != before:
                raise AssertionError("Canceling a sale changed gold, inventory, equipped items, or collection.")
            check("cancel sale leaves gold, inventory, equipment, and collection unchanged", salePrice=alpha_price)

            alpha_sale.click()
            page.keyboard.press("Escape")
            expect(page.locator("dialog[open]")).to_have_count(0)
            if snapshot(raw(page)) != before:
                raise AssertionError("Escape from pending sale changed persisted inventory state.")
            open_gear(page)
            select_gear(page, r"^(?:普通|精良|稀有|史詩|傳說) 獵矛\s*Lv\.")
            if snapshot(raw(page)) != before:
                raise AssertionError("Reopening gear view after Escape did not retain gear and save state.")
            check("Escape dismisses pending sale and reopening retains the gear and controlled save state")
            before = snapshot(raw(page))
            alpha_sale = page.get_by_role("button", name=re.compile(r"出售\s+\d+\s*金"))
            alpha_price = price_from(alpha_sale)
            alpha_sale.click()
            page.get_by_role("button", name="確認出售這件裝備", exact=True).click()
            after_alpha = raw(page)
            if actor(after_alpha)["gold"] != before["gold"] + alpha_price:
                raise AssertionError("Procedural gear sale did not pay its displayed itemSellPrice.")
            if any(item["instanceId"] == alpha["instanceId"] for item in after_alpha["reward"]["instances"]):
                raise AssertionError("Sold procedural gear instance remains in inventory.")
            if alpha["baseId"] not in after_alpha["reward"]["collection"]["bases"]:
                raise AssertionError("Selling procedural gear incorrectly removed its discovery collection entry.")
            if alpha["instanceId"] in after_alpha["reward"]["equipped"].get(after_alpha["activeCharacterId"], {}).values():
                raise AssertionError("Sold procedural gear left a ghost equipped reference.")
            check("non-worn procedural gear sale pays displayed price, removes instance, and retains collection",
                  instanceId=alpha["instanceId"], salePrice=alpha_price, goldBefore=before["gold"], goldAfter=actor(after_alpha)["gold"])

            # The boss spear itself exercises the product's current worn-item rule before becoming sellable.
            select_gear(page, r"^(?:普通|精良|稀有|史詩|傳說) 月牙獵矛\s*Lv\.")
            page.get_by_role("button", name="穿戴獵獲裝備", exact=True).click()
            expect(page.locator(".gear-detail")).to_contain_text("已穿戴")
            worn_sale = page.get_by_role("button", name=re.compile(r"出售\s+\d+\s*金"))
            expect(worn_sale).to_be_disabled()
            check("currently worn boss-exclusive gear follows implemented rule and cannot be sold")
            page.get_by_role("button", name="卸下獵獲裝備", exact=True).click()
            expect(page.locator(".gear-detail")).not_to_contain_text("已穿戴")
            boss_sale = page.get_by_role("button", name=re.compile(r"出售\s+\d+\s*金"))
            boss_price = price_from(boss_sale)
            before_boss = snapshot(raw(page))
            boss_sale.click()
            page.get_by_role("button", name="確認出售這件裝備", exact=True).click()
            after_boss = raw(page)
            if actor(after_boss)["gold"] != before_boss["gold"] + boss_price:
                raise AssertionError("Moon Fang Spear sale did not pay its displayed price.")
            if any(item["instanceId"] == boss["instanceId"] for item in after_boss["reward"]["instances"]):
                raise AssertionError("Sold moonFangSpear instance remains in inventory.")
            if boss["baseId"] not in after_boss["reward"]["collection"]["bases"]:
                raise AssertionError("Selling moonFangSpear incorrectly removed its discovery collection entry.")
            slots = after_boss["reward"]["equipped"].get(after_boss["activeCharacterId"], {})
            if boss["instanceId"] in slots.values() or boss["instanceId"] in actor(after_boss)["equipment"].values():
                raise AssertionError("Sold moonFangSpear left a ghost equipped reference.")
            check("legal non-worn moonFangSpear sale pays displayed price with no ghost equipment reference",
                  instanceId=boss["instanceId"], salePrice=boss_price, goldBefore=before_boss["gold"], goldAfter=actor(after_boss)["gold"])

            page.set_viewport_size({"width": 1440, "height": 1000})
            page.keyboard.press("Escape")
            expect(page.locator("dialog[open]")).to_have_count(0)
            save_button = page.locator(".save-button")
            expect(save_button).to_be_visible()
            save_button.click()
            saved = raw(page)
            expected = {"gold": actor(saved)["gold"], "reward": saved["reward"], "equipment": actor(saved)["equipment"]}
            page.reload(wait_until="domcontentloaded")
            expect(page.locator(".world-map")).to_be_visible(timeout=15000)
            reloaded = raw(page)
            observed = {"gold": actor(reloaded)["gold"], "reward": reloaded["reward"], "equipment": actor(reloaded)["equipment"]}
            if observed != expected:
                raise AssertionError("Explicit save/reload did not preserve sales, collection, and equipment state.")
            result["reloads"] += 1
            check("native save/reload retains both sales, gold, collection history, and no equipped ghost",
                  gold=actor(reloaded)["gold"], remainingInstances=len(reloaded["reward"]["instances"]))

            if result["errors"]:
                raise AssertionError(f"Browser runtime page errors prevent PASS: {result['errors']}")
            result["status"] = "PASS"
        except BaseException as error:
            result["status"] = "FAIL"
            result["failure"] = repr(error)
            try:
                result["failureSave"] = raw(page)
                page.screenshot(path=str(HERE / "failure-screen.png"), full_page=True)
            except Exception as diagnostic:
                result["failureDiagnostic"] = repr(diagnostic)
            raise
        finally:
            result["endedAt"] = datetime.now(timezone.utc).isoformat()
            result["errors"] = list(result["errors"])
            publish()
            context.close()
            browser.close()


if __name__ == "__main__":
    main()
