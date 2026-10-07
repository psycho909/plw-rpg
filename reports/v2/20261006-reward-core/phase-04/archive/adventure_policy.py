"""Pure choice rules for the Phase 4 browser-driven Adventure playtest."""
from __future__ import annotations

from typing import Iterable
import re

LEGACY_EQUIPMENT_SCORE = {("weapon", "sword"): 7.0, ("armor", "armor"): 5.0}


def slot_from_visible_detail(item: dict, detail: str) -> str:
    """Prefer the UI's explicit slot label; stats are a fallback for future base IDs."""
    if "· 武器 ·" in detail or "目前同部位：" in detail and "武器" in detail:
        return "weapon"
    if "· 防具 ·" in detail or "目前同部位：" in detail and "防具" in detail:
        return "armor"
    stats = item.get("rolledStats", {})
    attack, defense = stats.get("attack", 0), stats.get("defense", 0)
    if attack > 0 and defense <= 0:
        return "weapon"
    if defense > 0 and attack <= 0:
        return "armor"
    raise ValueError(f"Cannot determine equipment slot from visible comparison: {detail!r}")


def item_score(item: dict, slot: str) -> float:
    stats = item["rolledStats"]
    if slot == "weapon":
        return stats.get("attack", 0) + stats.get("penetration", 0) + stats.get("bleed", 0) + stats.get("critical", 0) * .03
    if slot == "armor":
        return stats.get("defense", 0) + stats.get("reduction", 0) * .08 + stats.get("block", 0) * .025
    raise ValueError(f"Unknown gear slot: {slot}")


def current_baseline(state: dict, owner: str, slot: str) -> dict:
    reward = state.get("reward", {})
    refs = reward.get("equipped", {}).get(owner, {})
    current_id = refs.get(slot)
    if current_id:
        current = next((i for i in reward.get("instances", []) if i.get("instanceId") == current_id and i.get("ownerId") == owner), None)
        if current:
            # The caller supplies its UI-derived slot; the current item uses the same physical slot.
            return {"score": item_score(current, slot), "source": "currently-equipped-reward-instance", "instanceId": current_id}
    character = next((c for c in state.get("characters", []) if c.get("id") == owner), {})
    legacy_value = character.get("equipment", {}).get(slot)
    if not legacy_value:
        return {"score": 0.0, "source": "empty-slot", "legacyEquipment": None}
    score = LEGACY_EQUIPMENT_SCORE.get((slot, legacy_value))
    if score is None:
        raise ValueError(f"Unknown legacy equipment for {slot}: {legacy_value!r}")
    return {"score": score, "source": "legacy-fixed-equipment", "legacyEquipment": legacy_value}


def page_items(items: list[dict], page_index: int, page_size: int = 20) -> list[tuple[int, dict]]:
    """Map a visible page to the full active-character item list without losing its offset."""
    if page_index < 0 or page_size < 1:
        raise ValueError("page_index must be non-negative and page_size must be positive")
    start = page_index * page_size
    return [(start + offset, item) for offset, item in enumerate(items[start:start + page_size])]


def duration_evidence(status: str, elapsed_seconds: float, minimum_seconds: int = 1800) -> dict:
    completed = status == "PASS" and elapsed_seconds >= minimum_seconds
    if completed:
        claim = f"completed >= {minimum_seconds} real seconds"
    else:
        claim = f"actual only: {elapsed_seconds:.1f} seconds; minimum {minimum_seconds} seconds not completed"
    return {"completed": completed, "claim": claim}


def choose_gear_candidate(candidates: list[dict], equipped_ids: set[str]) -> tuple[dict | None, dict | None]:
    """Return a strictly useful unequipped candidate and best inspected candidate for KEEP evidence."""
    available = [candidate for candidate in candidates
                 if candidate["item"].get("instanceId") not in equipped_ids]
    if not available:
        return None, None
    best = max(available, key=lambda c: (c.get("hasVisibleStatImprovement", c["delta"] > 0),
                                         c["hasGoalSynergy"], c["delta"]))
    if best.get("hasVisibleStatImprovement", best["delta"] > 0) or best["hasGoalSynergy"]:
        return best, best
    return None, best


def reward_value(expectation: dict | None) -> float | None:
    """Score only a structured reward expectation actually projected by the UI."""
    if not isinstance(expectation, dict):
        return None
    chances = expectation.get("rarityChances")
    gear_chance = expectation.get("gearChance")
    if not isinstance(chances, dict) or not isinstance(gear_chance, (int, float)):
        return None
    rarity_value = {"common": 0.0, "uncommon": 1.0, "rare": 2.0, "epic": 3.0, "legendary": 4.0}
    expected_quality = sum(float(probability) * rarity_value.get(rarity, 0.0)
                           for rarity, probability in chances.items())
    exclusive = (expectation.get("exclusiveGear") or expectation.get("exclusiveGearIds")
                 or expectation.get("bossExclusiveItems"))
    exclusive_bonus = 1.0 if isinstance(exclusive, (list, tuple)) and exclusive else 0.0
    return float(gear_chance) * expected_quality + exclusive_bonus


def parse_visible_expectation(text: str) -> dict | None:
    """Parse only percentages and exclusives actually rendered in the UI."""
    if not text:
        return None
    rarity_labels = {"普通": "common", "精良": "uncommon", "稀有": "rare", "史詩": "epic", "傳說": "legendary"}
    rarity_chances = {}
    for label, rarity in rarity_labels.items():
        match = re.search(rf"{label}\s*[:：]?\s*(\d+(?:\.\d+)?)\s*%", text)
        if match:
            rarity_chances[rarity] = float(match.group(1)) / 100
    gear_match = re.search(r"(?:獵裝|裝備(?:掉落|機率|率)?|gear\s*chance)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*%", text, re.IGNORECASE)
    if not rarity_chances or not gear_match:
        return None
    expectation = {"rarityChances": rarity_chances, "gearChance": float(gear_match.group(1)) / 100}
    exclusive_match = re.search(r"(?:首領限定裝備|首領專屬|專屬裝備)\s*[:：]\s*([^\n。；;]+)", text)
    if exclusive_match:
        exclusive_name = exclusive_match.group(1).strip()
        expectation["exclusiveGear"] = [exclusive_name]
    return expectation


def select_target(eligible: list[dict], seen: Iterable[str], defeated: Iterable[str], visible_goal_text: str,
                  reward_expectations: dict[str, dict] | None = None) -> tuple[dict | None, str]:
    """Follow visible goals and discovery progress; repeat only for an observable expected reward goal."""
    if not eligible:
        return None, "no currently eligible target; recover or observe a legal world route"
    def matches_goal(choice: dict) -> bool:
        if choice["label"] and choice["label"] in visible_goal_text:
            return True
        expectation = (reward_expectations or {}).get(choice["definitionId"], {})
        exclusive = (expectation.get("exclusiveGear") or expectation.get("exclusiveGearIds")
                     or expectation.get("bossExclusiveItems") or [])
        return any(isinstance(name, str) and name in visible_goal_text for name in exclusive)

    goal_match = next((choice for choice in eligible if matches_goal(choice)), None)
    if goal_match:
        return goal_match, "matches the target or exclusive reward named in the current visible goal/plan"
    seen_set, defeated_set = set(seen), set(defeated)
    unseen = next((choice for choice in eligible if choice["definitionId"] not in seen_set), None)
    if unseen:
        return unseen, "lowest ordered eligible unseen target advances collection discovery"
    undefeated = next((choice for choice in eligible if choice["definitionId"] not in defeated_set), None)
    if undefeated:
        return undefeated, "lowest ordered eligible undefeated target advances collection progress"
    expectation_scores = []
    for choice in eligible:
        expectation = (reward_expectations or {}).get(choice["definitionId"])
        value = reward_value(expectation)
        if value is not None:
            expectation_scores.append((value, choice, expectation))
    if expectation_scores:
        value, choice, expectation = max(expectation_scores, key=lambda candidate: candidate[0])
        if value > 0:
            return choice, ("all collection targets are complete; repeat for the highest UI-projected expected reward "
                            f"value ({value:.3f}) from {expectation}")
    return None, "all currently eligible targets are already seen and defeated; no new visible goal or usable reward expectation"
