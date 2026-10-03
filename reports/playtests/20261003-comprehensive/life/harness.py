"""Seed-909 production-baseline life/economy playtest through public UI only.

Run from the repository root while the fixed baseline server is listening at
http://127.0.0.1:5180/. Every case uses a fresh disposable Chromium context.
No save-state injection or application source changes are used.
"""
from __future__ import annotations

import json
import argparse
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from scripts.recorded_reports import write_recorded
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, expect

OUT = Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get("PLW_UI_URL", "http://127.0.0.1:5180/")
parsed = urlsplit(URL)
assert parsed.scheme == "http" and parsed.hostname == "127.0.0.1" and parsed.port == 5180, (
    "This harness is restricted to the fixed disposable localhost baseline at 127.0.0.1:5180."
)
os.environ["PLW_UI_URL"] = URL
sys.path.insert(0, str(OUT.parent))
from ui_helpers import interact, new_page, open_notes, player, state, travel  # noqa: E402

STARTED = datetime.now(timezone.utc)
LANE_STARTED = STARTED
PAGE_ERRORS: list[dict] = []
ACTIVE_PAGE = None
ACTIVE_CASE = None
RESULTS: dict = {
    "lane": "life-economy",
    "date_utc": STARTED.strftime("%Y-%m-%d"),
    "started_at_utc": STARTED.isoformat(),
    "baseline": {"commit": "694c6d76df67e3d3dd4da5aa98feba8581ecc2ba", "url": URL},
    "route": "normal seed-909 new worlds, public UI actions only; no fixture injection",
    "cases": [],
    "actions": [],
    "checkpoints": [],
    "page_errors": PAGE_ERRORS,
    "controlled_fixtures": [],
    "known_external_issue": "Parent is separately reproducing the cross-midnight rest/mercenary wage save rejection; this lane does not rely on that route.",
}


def compact(saved: dict) -> dict:
    c = player(saved)
    return {
        "worldTime": saved["worldTime"],
        "day_index": saved["worldTime"] // 1440,
        "seed": saved["worldSeed"],
        "player": {
            "name": c["name"], "age": c["age"], "level": c["level"],
            "hp": c["hp"], "stamina": c["stamina"], "maxStamina": c["maxStamina"],
            "stats": c["stats"], "skills": c["skills"], "gold": c["gold"],
            "inventory": c["inventory"], "equipment": c["equipment"],
            "position": c["position"], "currentRegion": c["currentRegion"],
        },
        "settlement": {k: saved["settlement"][k] for k in ("stage", "growth", "buildings", "food", "prosperity", "safety", "infrastructure")},
        "crops": [{k: crop[k] for k in ("id", "plantedAt", "matureAt", "status")} for crop in saved["crops"]],
        "preparedPlots": saved["preparedPlots"],
        "regions": {name: {"remainingAmount": value["remainingAmount"]} for name, value in saved["regions"].items()},
        "events_tail": [event["message"] for event in saved["events"][-5:]],
    }


def durable(saved: dict) -> dict:
    s = compact(saved)
    return {
        "seed": s["seed"], "player": {k: s["player"][k] for k in ("gold", "inventory", "equipment", "position", "currentRegion", "skills", "stats", "age")},
        "settlement": {k: s["settlement"][k] for k in ("stage", "buildings")},
        "crops": [{k: crop[k] for k in ("id", "plantedAt", "matureAt", "status")} for crop in s["crops"]],
        "preparedPlots": s["preparedPlots"],
    }


def record(label: str, before: dict | None, after: dict | None, detail: dict | str | None = None) -> None:
    RESULTS["actions"].append({"at_utc": datetime.now(timezone.utc).isoformat(), "ui_action": label,
                               "before": before, "after": after, "detail": detail})
    write_recorded(OUT / "results.json", json.dumps(RESULTS, ensure_ascii=False, indent=2) + "\n", producer="life-action")


def on_page(page, case_name: str) -> None:
    global ACTIVE_PAGE, ACTIVE_CASE
    ACTIVE_PAGE, ACTIVE_CASE = page, case_name
    page.on("pageerror", lambda error: PAGE_ERRORS.append({"case": case_name, "type": "pageerror", "message": str(error)}))
    page.on("console", lambda msg: PAGE_ERRORS.append({"case": case_name, "type": "console.error", "message": msg.text}) if msg.type == "error" else None)


def assert_seed909(saved: dict) -> None:
    c = player(saved)
    assert saved["worldSeed"] == 909
    assert saved["settlement"]["stage"] == "hamlet"
    assert (c["level"], c["stats"], c["gold"], c["position"], c["inventory"]["food"], c["inventory"]["potion"]) == (
        1, {"strength": 8, "vitality": 8, "dexterity": 6, "intelligence": 5}, 45, {"x": 7, "y": 9}, 3, 2
    )


def paused(page) -> None:
    button = page.get_by_role("group", name="世界時間速度").get_by_role("button", name="暫停", exact=True)
    if button.get_attribute("aria-pressed") != "true":
        button.click()


def checkpoint(page, case_name: str, label: str, screenshot: str | None = None) -> dict:
    if screenshot:
        page.screenshot(path=str(OUT / screenshot), full_page=True)
    saved = state(page)  # visible Save button, then read this context's own localStorage
    summary = compact(saved)
    page.reload(wait_until="networkidle")
    paused(page)
    loaded = state(page)
    matches = durable(saved) == durable(loaded)
    entry = {"case": case_name, "label": label, "saved": summary, "reload_matches": matches,
             "reloaded": compact(loaded)}
    RESULTS["checkpoints"].append(entry)
    write_recorded(OUT / "results.json", json.dumps(RESULTS, ensure_ascii=False, indent=2) + "\n", producer="life-checkpoint")
    assert matches, f"save/reload mismatch at {case_name}:{label}"
    return loaded


def dialog_title(page) -> str:
    return page.locator("#window-title").inner_text() if page.locator("dialog[open]").count() else ""


def open_expected(page, title: str) -> None:
    if dialog_title(page):
        page.keyboard.press("Escape")
    if not dialog_title(page):
        if page.locator(".context-action").count():
            page.locator(".context-action").click()
        else:
            interact(page)
    if title not in dialog_title(page):
        # Nearby NPCs can share a tile; choose the named building/region from the UI list.
        if page.locator(".nearby-trigger").count():
            page.locator(".nearby-trigger").click()
            page.locator(".interaction-list").get_by_role("button", name=re.compile(re.escape(title))).click()
        elif page.locator(".interaction-list").count():
            page.locator(".interaction-list").get_by_role("button", name=re.compile(re.escape(title))).click()
    expect(page.locator("dialog[open]")).to_have_count(1)
    expect(page.locator("#window-title")).to_contain_text(title)


def action_button(page, pattern: str, do_click: bool = True):
    button = page.get_by_role("button", name=re.compile(pattern))
    expect(button).to_have_count(1)
    if do_click:
        expect(button).to_be_enabled()
        button.click()
    return button


def save_and_record(page, case_name: str, label: str, before: dict, detail: dict | str | None = None) -> dict:
    after_state = state(page)
    after = compact(after_state)
    record(label, before, after, detail)
    return after_state


def go_to_store(page) -> None:
    travel(page, position="10,8")
    open_expected(page, "雜貨店")


def go_to_farm(page) -> None:
    travel(page, label="農田")
    open_expected(page, "農田")


def gather_in(page, case_name: str, region: str, position: str | None, names: list[str]) -> None:
    if position:
        travel(page, position=position)
    else:
        travel(page, label=region)
    title = "北方森林" if region == "森林" else "灰石礦場"
    open_expected(page, title)
    for pattern in names:
        before_state = state(page)
        before = compact(before_state)
        open_expected(page, title)
        action_button(page, pattern)
        after_state = save_and_record(page, case_name, f"{region}:{pattern}（區域採集）", before)
        checkpoint(page, case_name, f"採集 {region} {pattern}")
        # checkpoint closes the place window and pauses the world.


def wait_days(page, case_name: str, days: int = 1) -> dict:
    before_state = state(page)
    before = compact(before_state)
    open_notes(page)
    for _ in range(days):
        page.get_by_role("button", name="等待 1 日", exact=True).click()
    after_state = save_and_record(page, case_name, f"旅人筆記：等待 {days} 日（UI加速）", before,
                                  {"elapsed_game_days": days, "control": "等待 1 日"})
    return after_state


def farm_route(browser) -> None:
    case = "farm_cycles_and_rejections"
    context, page = new_page(browser)
    on_page(page, case)
    initial = state(page)
    assert_seed909(initial)
    before = compact(initial)
    RESULTS["cases"].append({"name": case, "status": "running", "normal_new_world": True})
    RESULTS["checkpoints"].append({"case": case, "label": "seed909 baseline", "saved": before, "reload_matches": None})
    page.screenshot(path=str(OUT / "baseline-initial.png"), full_page=True)
    go_to_farm(page)
    assert action_button(page, "^整地", False).is_enabled()
    assert action_button(page, "^播種", False).is_disabled()
    assert action_button(page, "^收割", False).is_disabled()
    record("農田空狀態：無已整地田時播種停用、無作物時收割停用", before, compact(state(page)))

    # Fill the four plots through the normal action controls.
    for i in range(4):
        prior = compact(state(page))
        open_expected(page, "農田")
        action_button(page, "^整地")
        after = compact(save_and_record(page, case, f"整地第 {i + 1} 格", prior))
    assert after["preparedPlots"] == 4
    open_expected(page, "農田")
    assert action_button(page, "^整地", False).is_disabled()
    checkpoint(page, case, "四格整地後，額外整地停用")

    # Sow crops on separate in-game days, then observe staggered maturity.
    for i in range(4):
        prior = compact(state(page))
        open_expected(page, "農田")
        action_button(page, "^播種")
        saved = save_and_record(page, case, f"播種第 {i + 1} 格", prior)
        if i < 3:
            checkpoint(page, case, f"第 {i + 1} 批播種存檔")
            wait_days(page, case, 1)
            # Wait control leaves notes closed through state(); re-open the farm next iteration.
            go_to_farm(page)
    mature_state = state(page)
    mature = compact(mature_state)
    assert len(mature["crops"]) == 4
    assert len({crop["matureAt"] for crop in mature["crops"]}) == 4
    assert sum(crop["status"] == "mature" for crop in mature["crops"]) >= 2
    assert mature["preparedPlots"] == 0
    go_to_farm(page)
    assert action_button(page, "^整地", False).is_disabled()
    assert action_button(page, "^播種", False).is_disabled()
    assert action_button(page, "^收割", False).is_enabled()
    checkpoint(page, case, "四格播種、不同成熟時間；兩格成熟", "farm-staggered-maturity.png")

    # Harvest only mature crops, waiting one day at a time for the later batches.
    harvested_count = 0
    while harvested_count < 4:
        current = compact(state(page))
        mature_count = sum(crop["status"] == "mature" for crop in current["crops"])
        if mature_count == 0:
            wait_days(page, case, 1)
            go_to_farm(page)
            current = compact(state(page))
            mature_count = sum(crop["status"] == "mature" for crop in current["crops"])
        assert mature_count > 0
        before_harvest = current
        open_expected(page, "農田")
        action_button(page, "^收割")
        after_harvest = compact(save_and_record(page, case, f"收割成熟作物 #{harvested_count + 1}", before_harvest,
                                              {"mature_before": mature_count}))
        harvested_count += 1
        assert len(after_harvest["crops"]) == len(before_harvest["crops"]) - 1
        checkpoint(page, case, f"第 {harvested_count} 次收割存檔")
    final_state = state(page)
    final = compact(final_state)
    assert not final["crops"] and final["preparedPlots"] == 0
    assert final["player"]["inventory"]["food"] > 3
    assert final["player"]["skills"]["farming"]["level"] >= 2
    record("完成四格整地、分日播種與四次收割", mature, final,
           {"distinct_matureAt": 4, "harvested": harvested_count, "farming_skill": final["player"]["skills"]["farming"]})
    RESULTS["cases"][-1].update(status="passed", observed={"plots": 4, "staggered_maturity": 4, "harvested": 4,
                                                            "farming_skill": final["player"]["skills"]["farming"]})
    context.close()


def resource_store_route(browser) -> None:
    case = "forest_mine_store_buy_sell"
    context, page = new_page(browser)
    on_page(page, case)
    initial = state(page)
    assert_seed909(initial)
    RESULTS["cases"].append({"name": case, "status": "running", "normal_new_world": True})
    start = compact(initial)
    gather_in(page, case, "森林", None, ["^🪵 伐木"])
    gather_in(page, case, "礦場", "19,5", ["^🪨 採石", "^⛏️ 採鐵礦"])
    current = compact(state(page))
    assert current["player"]["inventory"]["wood"] >= 2
    assert current["player"]["inventory"]["stone"] >= 2
    assert current["player"]["inventory"]["iron"] >= 2
    assert current["player"]["gold"] == 57
    go_to_store(page)
    # Earn enough cash from ordinary starting supplies to buy the full shop catalogue.
    base = compact(state(page))
    for name, count in [("木材", 1), ("石材", 1), ("鐵礦", 1), ("食物", 2), ("治療藥水", 1)]:
        open_expected(page, "雜貨店")
        row = page.locator(".shop-item").filter(has_text=name)
        for _ in range(count):
            expect(row.get_by_role("button", name=re.compile("^賣")).first).to_be_enabled()
            row.get_by_role("button", name=re.compile("^賣")).first.click()
    sold_start = compact(save_and_record(page, case, "雜貨店出售採集品及初始食物／藥水", base))
    assert sold_start["player"]["gold"] >= 80
    # Buy and sell one of every general-store good, all through visible controls.
    expected_prices = {"木材": 8, "石材": 6, "鐵礦": 16, "食物": 10, "怪物素材": 20, "治療藥水": 20}
    bought_prices = {}
    for name, price in expected_prices.items():
        prior = compact(state(page))
        open_expected(page, "雜貨店")
        row = page.locator(".shop-item").filter(has_text=name)
        buy_button = row.get_by_role("button", name=re.compile("^買")).first
        label = buy_button.inner_text()
        bought_prices[name] = int(re.search(r"(\d+)", label).group(1))
        assert bought_prices[name] == price, {name: label, "expected": price}
        expect(buy_button).to_be_enabled()
        gold_before = player(state(page))["gold"] if False else prior["player"]["gold"]
        buy_button.click()
        # Capture the successful purchase in localStorage after closing by the Save action.
        purchased = compact(save_and_record(page, case, f"雜貨店購買 {name}", prior,
                                           {"displayed_price": bought_prices[name]}))
        assert purchased["player"]["gold"] == gold_before - price
        assert purchased["player"]["inventory"][{"木材":"wood","石材":"stone","鐵礦":"iron","食物":"food","怪物素材":"material","治療藥水":"potion"}[name]] == prior["player"]["inventory"][{"木材":"wood","石材":"stone","鐵礦":"iron","食物":"food","怪物素材":"material","治療藥水":"potion"}[name]] + 1
        checkpoint(page, case, f"購買 {name} 後存檔重載")
        open_expected(page, "雜貨店")
        row = page.locator(".shop-item").filter(has_text=name)
        sell_button = row.get_by_role("button", name=re.compile("^賣")).first
        expect(sell_button).to_be_enabled()
        prior_sale = compact(state(page))
        open_expected(page, "雜貨店")
        row = page.locator(".shop-item").filter(has_text=name)
        row.get_by_role("button", name=re.compile("^賣")).first.click()
        sold = compact(save_and_record(page, case, f"雜貨店出售 {name}", prior_sale))
        assert sold["player"]["inventory"][{"木材":"wood","石材":"stone","鐵礦":"iron","食物":"food","怪物素材":"material","治療藥水":"potion"}[name]] == prior_sale["player"]["inventory"][{"木材":"wood","石材":"stone","鐵礦":"iron","食物":"food","怪物素材":"material","治療藥水":"potion"}[name]] - 1
    final = compact(checkpoint(page, case, "全品項買賣完成", "store-all-products.png"))
    RESULTS["cases"][-1].update(status="passed", observed={"gathered": ["wood", "stone", "iron"], "bought_and_sold": list(expected_prices),
                                                            "hamlet_prices": bought_prices, "gold_final": final["player"]["gold"]})
    context.close()


def free_and_paid_rest_route(browser) -> None:
    case = "home_inn_rest"
    context, page = new_page(browser)
    on_page(page, case)
    initial = state(page)
    assert_seed909(initial)
    RESULTS["cases"].append({"name": case, "status": "running", "normal_new_world": True})
    gather_in(page, case, "森林", None, ["^🪵 伐木"])
    state1 = state(page)
    assert player(state1)["stamina"] < player(state1)["maxStamina"]
    travel(page, label="家")
    open_expected(page, "家")
    before = compact(state(page))
    open_expected(page, "家")
    action_button(page, "^休息 · 1 小時")
    rested = compact(save_and_record(page, case, "家中免費休息一小時", before))
    assert rested["player"]["gold"] == before["player"]["gold"]
    assert rested["player"]["stamina"] > before["player"]["stamina"]
    checkpoint(page, case, "免費休息存檔重載")
    # Spend stamina once through a normal forest action, then use the paid inn.
    gather_in(page, case, "森林", None, ["^🪵 伐木"])
    before_inn = compact(state(page))
    travel(page, position="7,11")
    open_expected(page, "旅店")
    action_button(page, "^住宿 · 8 金／8 小時")
    paid = compact(save_and_record(page, case, "旅店住宿八小時", before_inn,
                                  {"paid_gold": 8, "elapsed_game_minutes": 480}))
    assert paid["player"]["gold"] == before_inn["player"]["gold"] - 8
    assert paid["player"]["stamina"] == paid["player"]["maxStamina"]
    checkpoint(page, case, "旅店住宿存檔重載", "rest-services.png")
    RESULTS["cases"][-1].update(status="passed", observed={"home_free": True, "inn_paid": 8, "inn_restored_stamina": paid["player"]["stamina"]})
    context.close()


def click_wait_season(page) -> dict:
    before_state = state(page)
    before = compact(before_state)
    open_notes(page)
    page.get_by_role("button", name="度過一季", exact=True).click()
    after_state = save_and_record(page, "natural_town_discount", "旅人筆記：度過一季（UI自然成長加速）", before,
                                  {"elapsed_game_days": 30, "control": "度過一季"})
    after = compact(after_state)
    assert after["worldTime"] - before["worldTime"] == 30 * 1440
    return after_state


def wait_service_state(page, is_open, close_hour: int, open_hour: int) -> str:
    if dialog_title(page):
        page.keyboard.press("Escape")
    speed = page.get_by_role("group", name="世界時間速度")
    speed.get_by_role("button", name="×20", exact=True).click()
    deadline = time.monotonic() + 48
    observed = ""
    while time.monotonic() < deadline:
        text = page.locator(".world-clock strong").inner_text()
        match = re.search(r"(\d{2}):(\d{2})", text)
        assert match, f"clock absent: {text}"
        hour, minute = int(match.group(1)), int(match.group(2))
        observed = f"{hour:02d}:{minute:02d}"
        open_now = hour >= open_hour and hour < close_hour
        if open_now == is_open:
            speed.get_by_role("button", name="暫停", exact=True).click()
            return observed
        page.wait_for_timeout(80)
    speed.get_by_role("button", name="暫停", exact=True).click()
    raise AssertionError(f"service did not become {'open' if is_open else 'closed'}; last clock={observed}")


def test_service_hours(page, case: str, title: str, open_hour: int, close_hour: int) -> dict:
    open_expected(page, title)
    current_open = open_hour <= int(re.search(r"(\d{2}):", page.locator(".window-world-status small").inner_text()).group(1)) < close_hour
    shop = title in ("雜貨店", "鐵匠鋪")
    row_buttons = page.locator(".shop-item button") if shop else page.get_by_role("button", name=re.compile("住宿|喝一杯"))
    assert row_buttons.count() > 0
    warning = page.locator(".inline-warning").filter(has_text="現在無法交易") if shop else None
    if not current_open:
        # Explicitly record the currently closed state before UI time acceleration.
        if shop:
            assert warning.is_visible() and row_buttons.first.is_disabled()
        else:
            assert row_buttons.first.is_disabled()
        closed_at = page.locator(".window-world-status small").inner_text()
        opened_at = wait_service_state(page, True, close_hour, open_hour)
        open_expected(page, title)
        if shop:
            assert not page.locator(".inline-warning").filter(has_text="現在無法交易").count()
        else:
            assert row_buttons.first.is_enabled()
        record(f"{title} closed→open 營業邊界", None, None, {"closed_at": closed_at, "opened_at": opened_at})
    else:
        if shop:
            assert not warning.count()
        else:
            assert row_buttons.first.is_enabled()
        opened_at = page.locator(".window-world-status small").inner_text()
        record(f"{title} 開門營業", None, None, {"opened_at": opened_at})
    closed_at = wait_service_state(page, False, close_hour, open_hour)
    open_expected(page, title)
    if title in ("雜貨店", "鐵匠鋪"):
        assert page.locator(".inline-warning").filter(has_text="現在無法交易").is_visible()
        assert page.locator(".shop-item button").first.is_disabled()
    else:
        assert page.get_by_role("button", name=re.compile("住宿|喝一杯")).first.is_disabled()
    record(f"{title} close boundary", None, None, {"closed_at": closed_at, "disabled": True})
    return {"service": title, "open_hour": open_hour, "close_hour": close_hour, "opened_and_closed": True, "closed_at": closed_at}


def natural_town_discount_route(browser) -> None:
    case = "natural_town_discount"
    context, page = new_page(browser)
    on_page(page, case)
    initial = state(page)
    assert_seed909(initial)
    RESULTS["cases"].append({"name": case, "status": "running", "normal_new_world": True, "ui_time_acceleration": []})
    start = compact(initial)
    # Earn ordinary gold and stock by gathering in all three regions; rest only at home.
    gather_in(page, case, "森林", None, ["^🪵 伐木"] * 5)
    travel(page, label="家")
    open_expected(page, "家")
    action_button(page, "^休息 · 1 小時")
    checkpoint(page, case, "家中恢復體力以繼續採集")
    gather_in(page, case, "礦場", "19,5", ["^🪨 採石"] * 5)
    travel(page, label="家")
    open_expected(page, "家")
    action_button(page, "^休息 · 1 小時")
    checkpoint(page, case, "家中恢復體力後採鐵")
    gather_in(page, case, "礦場", "19,5", ["^⛏️ 採鐵礦"] * 5)
    gathered = compact(state(page))
    assert gathered["player"]["gold"] == 105
    assert gathered["player"]["inventory"]["wood"] == 10
    assert gathered["player"]["inventory"]["stone"] == 10
    assert gathered["player"]["inventory"]["iron"] >= 10

    # Natural settlement growth uses only the visible season-wait control.
    seasons = 0
    observed_stages = [gathered["settlement"]["stage"]]
    while gathered["settlement"]["stage"] != "town" and seasons < 20:
        before_day = gathered["day_index"]
        gathered_state = click_wait_season(page)
        gathered = compact(gathered_state)
        seasons += 1
        RESULTS["cases"][-1]["ui_time_acceleration"].append({"control": "度過一季", "game_days": 30,
                                                                  "from_day_index": before_day,
                                                                  "to_day_index": gathered["day_index"],
                                                                  "stage_after": gathered["settlement"]["stage"],
                                                                  "growth": gathered["settlement"]["growth"]})
        observed_stages.append(gathered["settlement"]["stage"])
        checkpoint(page, case, f"自然經過第 {seasons} 季後存檔重載")
        if gathered["settlement"]["stage"] != "town":
            open_notes(page)
            gathered = compact(state(page))
    assert gathered["settlement"]["stage"] == "town", f"natural Town not reached after {seasons} seasons"
    assert seasons * 30 >= 40
    assert "tavern" in gathered["settlement"]["buildings"] and "blacksmith" in gathered["settlement"]["buildings"]
    # Open the settlement panel in the public UI and preserve natural growth evidence.
    page.keyboard.press("m")
    page.get_by_role("button", name="聚落", exact=True).click()
    expect(page.locator("dialog")).to_contain_text("城鎮")
    page.screenshot(path=str(OUT / "natural-town.png"), full_page=True)
    record("正常等待推進聚落 Hamlet→Village→Town", start, gathered,
           {"seasons": seasons, "elapsed_game_days": seasons * 30, "stages_observed": observed_stages,
            "growth": gathered["settlement"]["growth"], "buildings": gathered["settlement"]["buildings"]})
    page.keyboard.press("Escape")

    # Sell gathered goods and original supplies before discounted Town shopping.
    # If town is closed, the hour probe below safely advances only through the UI controls.
    travel(page, position="10,8")
    open_expected(page, "雜貨店")
    if int(re.search(r"(\d{2}):", page.locator(".window-world-status small").inner_text()).group(1)) >= 20:
        # store is closed; advancing the visible world clock reaches its next open period
        wait_service_state(page, True, 20, 8)
        open_expected(page, "雜貨店")
    elif int(re.search(r"(\d{2}):", page.locator(".window-world-status small").inner_text()).group(1)) < 8:
        wait_service_state(page, True, 20, 8)
        open_expected(page, "雜貨店")
    # Ensure an 08:00 start for the long sequence of sells.
    clock = page.locator(".window-world-status small").inner_text()
    if not 8 <= int(re.search(r"(\d{2}):", clock).group(1)) < 20:
        wait_service_state(page, True, 20, 8)
        open_expected(page, "雜貨店")
    inventory_map = {"木材": "wood", "石材": "stone", "鐵礦": "iron", "食物": "food", "治療藥水": "potion"}
    for name, item in inventory_map.items():
        row = page.locator(".shop-item").filter(has_text=name)
        count = player(state(page))["inventory"][item]
        if count:
            prior = compact(state(page))
            open_expected(page, "雜貨店")
            row = page.locator(".shop-item").filter(has_text=name)
            for _ in range(count):
                row.get_by_role("button", name=re.compile("^賣")).first.click()
                if _ < count - 1:
                    row = page.locator(".shop-item").filter(has_text=name)
            sold = compact(save_and_record(page, case, f"城鎮雜貨店出售 {name} ×{count}", prior))
            assert sold["player"]["inventory"][item] == 0
            checkpoint(page, case, f"城鎮出售 {name} 存檔重載")
            open_expected(page, "雜貨店")
    before_supplies = compact(state(page))
    open_expected(page, "雜貨店")
    # Sell starting food/potions too, after confirming the ordinary stock was exhausted.
    for name in ("食物", "治療藥水"):
        row = page.locator(".shop-item").filter(has_text=name)
        count = player(state(page))["inventory"][inventory_map[name]]
        for _ in range(count):
            row.get_by_role("button", name=re.compile("^賣")).first.click()
            row = page.locator(".shop-item").filter(has_text=name)
    sold_all = compact(save_and_record(page, case, "出售採集素材、初始食物與藥水", before_supplies))
    assert sold_all["player"]["gold"] >= 200
    checkpoint(page, case, "城鎮出售素材後存檔重載")

    town_prices = {"木材": 7, "石材": 5, "鐵礦": 13, "食物": 8, "怪物素材": 16, "治療藥水": 16}
    town_items = {"木材": "wood", "石材": "stone", "鐵礦": "iron", "食物": "food", "怪物素材": "material", "治療藥水": "potion"}
    for name, expected in town_prices.items():
        before_buy = compact(state(page))
        open_expected(page, "雜貨店")
        row = page.locator(".shop-item").filter(has_text=name)
        button = row.get_by_role("button", name=re.compile("^買")).first
        actual = int(re.search(r"(\d+)", button.inner_text()).group(1))
        assert actual == expected, {name: actual, "town_expected": expected}
        button.click()
        bought = compact(save_and_record(page, case, f"城鎮折扣購買 {name}", before_buy,
                                         {"town_price": actual, "base_price": {"木材":8,"石材":6,"鐵礦":16,"食物":10,"怪物素材":20,"治療藥水":20}[name]}))
        assert bought["player"]["gold"] == before_buy["player"]["gold"] - expected
        checkpoint(page, case, f"城鎮折扣 {name} 存檔重載")
        open_expected(page, "雜貨店")
    after_store = compact(state(page))
    assert after_store["player"]["gold"] >= 100

    # Buy two of each Town equipment item so one can remain equipped while its duplicate is sold.
    travel(page, position="12,8")
    open_expected(page, "鐵匠鋪")
    equipment_prices = {"鐵劍": 56, "皮甲": 44}
    equipment_ids = {"鐵劍": "sword", "皮甲": "armor"}
    for name, price in equipment_prices.items():
        open_expected(page, "鐵匠鋪")
        row = page.locator(".shop-item").filter(has_text=name)
        button = row.get_by_role("button", name=re.compile("^買")).first
        assert int(re.search(r"(\d+)", button.inner_text()).group(1)) == price
        for copy_index in range(2):
            prior = compact(state(page))
            open_expected(page, "鐵匠鋪")
            row = page.locator(".shop-item").filter(has_text=name)
            row.get_by_role("button", name=re.compile("^買")).first.click()
            bought = compact(save_and_record(page, case, f"城鎮折扣購買{name}第{copy_index + 1}件", prior,
                                             {"town_price": price, "base_price": {"鐵劍":70,"皮甲":55}[name]}))
            checkpoint(page, case, f"城鎮購買{name}存檔重載")
    # Equip both items through inventory, then verify duplicate can sell and equipped last copy is blocked.
    for name, item in equipment_ids.items():
        page.keyboard.press("i")
        selector = page.locator(".item-list").get_by_role("button", name=re.compile(name))
        selector.click()
        equip_button = page.locator(".item-detail").get_by_role("button", name="裝備", exact=True)
        equip_button.click()
        equipped = compact(state(page))
        assert equipped["player"]["equipment"]["weapon" if item == "sword" else "armor"] == item
        record(f"背包裝備{name}", None, equipped)
        checkpoint(page, case, f"裝備{name}存檔重載")
        travel(page, position="12,8")
        open_expected(page, "鐵匠鋪")
        row = page.locator(".shop-item").filter(has_text=name)
        sell = row.get_by_role("button", name=re.compile("^賣")).first
        assert sell.is_enabled(), f"duplicate {name} should be sellable while one is equipped"
        prior = compact(state(page))
        open_expected(page, "鐵匠鋪")
        row = page.locator(".shop-item").filter(has_text=name)
        row.get_by_role("button", name=re.compile("^賣")).first.click()
        after_duplicate_sale = compact(save_and_record(page, case, f"穿戴時出售多出的{name}", prior))
        assert after_duplicate_sale["player"]["inventory"][item] == 1
        open_expected(page, "鐵匠鋪")
        sell_last = page.locator(".shop-item").filter(has_text=name).get_by_role("button", name=re.compile("^賣")).first
        assert sell_last.is_disabled()
        record(f"拒售最後一件已裝備{name}", after_duplicate_sale, after_duplicate_sale,
               {"disabled": True, "equipped_last_copy": True})
        checkpoint(page, case, f"拒售最後一件{name}存檔重載")
        # Toggle the equipped item off and on through the inventory control.
        page.keyboard.press("i")
        page.locator(".item-list").get_by_role("button", name=re.compile(name)).click()
        toggle = page.locator(".item-detail").get_by_role("button", name="卸下裝備", exact=True)
        toggle.click()
        unequipped = compact(state(page))
        assert unequipped["player"]["equipment"]["weapon" if item == "sword" else "armor"] is None
        record(f"卸下{name}切換裝備狀態", after_duplicate_sale, unequipped)
        checkpoint(page, case, f"卸下{name}存檔重載")
        # Re-equip so the final state preserves both purchased items for inspection.
        page.keyboard.press("i")
        page.locator(".item-list").get_by_role("button", name=re.compile(name)).click()
        page.locator(".item-detail").get_by_role("button", name="裝備", exact=True).click()
        checkpoint(page, case, f"重新裝備{name}存檔重載")

    equipment_state = compact(state(page))
    assert equipment_state["settlement"]["stage"] == "town"
    assert equipment_state["player"]["equipment"] == {"weapon": "sword", "armor": "armor"}
    assert equipment_state["player"]["inventory"]["sword"] == 1 and equipment_state["player"]["inventory"]["armor"] == 1
    service_results = []
    travel(page, position="10,8")
    service_results.append(test_service_hours(page, case, "雜貨店", 8, 20))
    travel(page, position="12,8")
    service_results.append(test_service_hours(page, case, "鐵匠鋪", 8, 18))
    travel(page, position="11,11")
    service_results.append(test_service_hours(page, case, "酒館", 17, 24))
    equipment_state = compact(checkpoint(page, case, "城鎮商店營業邊界存檔重載"))
    assert equipment_state["player"]["equipment"] == {"weapon": "sword", "armor": "armor"}
    record("Town折扣／商品／裝備／最後一件保護完成", start, equipment_state,
           {"store_prices": town_prices, "equipment_prices": equipment_prices,
            "town_days": seasons * 30, "natural_stages": observed_stages, "service_boundaries": service_results})
    RESULTS["cases"][-1].update(status="passed", observed={"natural_stages": observed_stages, "seasons": seasons,
                                                            "game_days": seasons * 30, "town_prices": town_prices,
                                                            "equipment_prices": equipment_prices,
                                                            "last_equipped_sale_blocked": True,
                                                            "service_boundaries": service_results,
                                                            "equipment_toggle": "equip/unequip/re-equip through inventory UI"})
    context.close()


def farm_low_stamina_route(browser) -> None:
    case = "insufficient_stamina_rejection"
    context, page = new_page(browser)
    on_page(page, case)
    initial = state(page)
    assert_seed909(initial)
    RESULTS["cases"].append({"name": case, "status": "running", "normal_new_world": True})
    go_to_farm(page)
    action_button(page, "^整地")
    action_button(page, "^整地")
    action_button(page, "^播種")
    wait_days(page, case, 2)
    go_to_farm(page)
    state_now = compact(state(page))
    assert len(state_now["crops"]) == 1
    # Spend stamina with six normal gather actions, then create one prepared plot; 5 points remain.
    gather_in(page, case, "森林", None, ["^🪵 伐木"] * 6)
    state_now = compact(state(page))
    assert state_now["player"]["stamina"] <= 14
    go_to_farm(page)
    state_now = compact(state(page))
    # Explore the fog and use the normal five-stamina dungeon-entry action to reach a sub-action threshold.
    travel(page, position="20,3")
    open_expected(page, "迷霧山谷")
    enter = page.get_by_role("button", name=re.compile("進入廢棄礦坑"))
    if enter.is_disabled():
        # A second farm action leaves enough stamina for the five-point entry only when legal.
        raise AssertionError(f"cannot test sub-threshold harvest at natural stamina {state_now['player']['stamina']}")
    enter.click()
    page.get_by_role("button", name="離開礦坑", exact=True).click()
    travel(page, label="農田")
    open_expected(page, "農田")
    low = compact(state(page))
    assert low["player"]["stamina"] < 4
    assert len(low["crops"]) == 1 and low["crops"][0]["status"] == "mature"
    assert low["preparedPlots"] == 1
    open_expected(page, "農田")
    harvest = action_button(page, "^收割", False)
    plant = action_button(page, "^播種", False)
    prepare = action_button(page, "^整地", False)
    assert harvest.is_disabled() and plant.is_disabled() and prepare.is_disabled()
    record("體力不足時成熟作物收割／有整地時播種／新增整地皆停用", low, low,
           {"stamina": low["player"]["stamina"], "mature_crop": True, "prepared_plot": True,
            "disabled": ["收割", "播種", "整地"]})
    checkpoint(page, case, "低體力拒絕邊界存檔重載", "low-stamina-rejections.png")
    RESULTS["cases"][-1].update(status="passed", observed={"stamina": low["player"]["stamina"], "harvest_disabled_for_stamina": True,
                                                            "plant_disabled_for_stamina": True, "prepare_disabled_for_stamina": True})
    context.close()


def main() -> None:
    global LANE_STARTED
    RESULTS["environment"] = {"python": sys.version.split()[0], "chromium": "/usr/bin/chromium",
                              "playwright": "Python Playwright", "production_baseline_mode": "fixed local build; no server stop/restart"}
    cases = [farm_route, resource_store_route, free_and_paid_rest_route,
             farm_low_stamina_route, natural_town_discount_route]
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=[run.__name__ for run in cases])
    selected = parser.parse_args().only
    old_result_path = OUT / "results.json"
    if selected and old_result_path.exists():
        old = json.loads(old_result_path.read_text(encoding="utf-8"))
        lane_case = {
            "farm_route": "farm_cycles_and_rejections",
            "resource_store_route": "forest_mine_store_buy_sell",
            "free_and_paid_rest_route": "home_inn_rest",
            "farm_low_stamina_route": "insufficient_stamina_rejection",
            "natural_town_discount_route": "natural_town_discount",
        }[selected]
        RESULTS["cases"] = [case for case in old.get("cases", []) if case.get("name") != lane_case]
        RESULTS["actions"] = old.get("actions", [])
        RESULTS["checkpoints"] = old.get("checkpoints", [])
        PAGE_ERRORS.extend(old.get("page_errors", []))
        RESULTS["harness_errors"] = [error for error in old.get("harness_errors", []) if error.get("case") != selected]
        RESULTS["started_at_utc"] = old.get("started_at_utc", RESULTS["started_at_utc"])
        LANE_STARTED = datetime.fromisoformat(RESULTS["started_at_utc"])
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        if selected:
            cases = [run for run in cases if run.__name__ == selected]
        for run in cases:
            name = run.__name__
            try:
                run(browser)
            except Exception as exc:
                # Keep independent disposable cases running; save the visible failure evidence first.
                entry = next((c for c in reversed(RESULTS["cases"]) if c.get("status") == "running"), None)
                if entry and entry.get("status") == "running":
                    entry.update(status="failed", failure=f"{type(exc).__name__}: {exc}")
                else:
                    RESULTS["cases"].append({"name": name, "status": "failed", "failure": f"{type(exc).__name__}: {exc}"})
                RESULTS.setdefault("harness_errors", []).append({"case": name, "error": f"{type(exc).__name__}: {exc}"})
                if ACTIVE_PAGE is not None:
                    try:
                        ACTIVE_PAGE.screenshot(path=str(OUT / f"failure-{name}.png"), full_page=True)
                    except Exception:
                        pass
                print(f"FAILED {name}: {type(exc).__name__}: {exc}", flush=True)
        browser.close()
    ended = datetime.now(timezone.utc)
    RESULTS["ended_at_utc"] = ended.isoformat()
    RESULTS["elapsed_seconds"] = round((ended - LANE_STARTED).total_seconds(), 3)
    RESULTS["page_errors"] = PAGE_ERRORS
    RESULTS["overall"] = "passed" if all(c.get("status") == "passed" for c in RESULTS["cases"]) and not PAGE_ERRORS else "findings"
    write_recorded(OUT / "results.json", json.dumps(RESULTS, ensure_ascii=False, indent=2) + "\n", producer="life")
    lines = [
        "# Life and economy UI playtest",
        "",
        f"- Baseline: `694c6d76df67e3d3dd4da5aa98feba8581ecc2ba` at `{URL}`.",
        f"- Started: `{RESULTS['started_at_utc']}`; ended: `{RESULTS['ended_at_utc']}`; elapsed: `{RESULTS['elapsed_seconds']}` seconds.",
        "- Route: normal public UI with fresh disposable seed-909 worlds; no state fixtures or direct storage writes.",
        f"- Overall: **{RESULTS['overall']}**; page errors: **{len(PAGE_ERRORS)}**.",
        "",
        "## Cases",
        "",
    ]
    for case in RESULTS["cases"]:
        lines.append(f"- **{case['name']}** — {case.get('status')}: {case.get('observed', case.get('failure', 'in progress'))}")
    lines += ["", "## Evidence", "", "Detailed UI actions, before/after state summaries, save/reload checks, and errors are in `results.json`.",
              "Screenshots: `baseline-initial.png`, `farm-staggered-maturity.png`, `rest-services.png`, `natural-town.png`, and `low-stamina-rejections.png` when those cases reach their checkpoints.",
              "", "## Limits", "", "Unreached or failed cases remain explicitly listed; this is one normal seed and one baseline browser/runtime, not a platform-wide zero-defect claim.", ""]
    write_recorded(OUT / "report.md", "\n".join(lines), producer="life")
    print(json.dumps({"overall": RESULTS["overall"], "elapsed_seconds": RESULTS["elapsed_seconds"],
                      "cases": [{"name": c["name"], "status": c.get("status"), "failure": c.get("failure")} for c in RESULTS["cases"]],
                      "page_errors": PAGE_ERRORS}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
