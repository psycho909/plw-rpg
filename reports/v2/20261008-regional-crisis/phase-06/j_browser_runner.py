"""Phase 6-J fresh-world stress and agent crisis browser runner."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from typing import Any

from playwright.sync_api import expect, sync_playwright

from j_browser_support import append_jsonl, attach_early_capture, now_utc, provenance, publish, save_latency_sample, validate_build, verify_http_dist


def project_root(script: Path) -> Path:
    for candidate in script.resolve().parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir(): return candidate
    raise RuntimeError(f"Cannot find project root above {script}")


ROOT = project_root(Path(__file__))
PHASE = ROOT / "reports/v2/20261008-regional-crisis/phase-06"
DRIVER = Path(__file__).resolve()
SUPPORT = PHASE / "j_browser_support.py"
FIXTURE_GENERATOR = PHASE / "j_fixture_generator.py"
RUNS = PHASE / "j-browser-runs"
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", PHASE / "j-build-status.json"))
PRODUCER = "g6-luna-low-phase6-j-browser-qa"
CHECKPOINT_SECONDS = 60


def publish_status(run_dir: Path, status: dict[str, Any]) -> None:
    publish(ROOT, run_dir / "j-browser-result.json", status, PRODUCER)


def wire_errors(page, status):
    page.on("pageerror", lambda error: status["pageErrors"].append(str(error)))
    page.on("console", lambda message: status["consoleErrors"].append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: status["requestFailures"].append({"url": request.url, "error": request.failure}))
    page.on("response", lambda response: status["httpFailures"].append({"url": response.url, "status": response.status}) if response.status >= 400 else None)


def action(log, lane, label, page, **extra):
    row = {"atUTC": now_utc(), "lane": lane, "label": label, "url": page.url, **extra}
    append_jsonl(log, row)
    return row


def close_visible_dialogs(page):
    """Close only the top visible dismissible native dialog, then verify it is gone."""
    dialogs=page.locator("dialog.pixel-window[open]")
    while dialogs.count():
        dialog=dialogs.last
        close=dialog.get_by_role("button",name="關閉視窗")
        if not close.count() or not close.is_visible():
            return False
        close.click()
        expect(dialog).to_have_count(0,timeout=3000)
    return True


def require_world_surface(page):
    if page.locator("dialog.pixel-window[open]").count() and not close_visible_dialogs(page):
        raise AssertionError("A non-dismissible visible dialog still owns the UI; refusing to click behind it")
    expect(page.locator("dialog.pixel-window[open]")).to_have_count(0,timeout=3000)


def snapshot(page, run_dir, name, status):
    path = run_dir / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    status.setdefault("screenshots", []).append({"path": path.name, "sha256": __import__("hashlib").sha256(path.read_bytes()).hexdigest()})


def checkpoint(page, run_dir, status, log, *, cdp=None, reason="scheduled", force=False):
    now = time.monotonic()
    if not force and now < status.get("nextCheckpointMonotonic", 0):
        return
    profile = {}
    if cdp is not None:
        for command in ("Memory.getDOMCounters", "Runtime.getHeapUsage", "Performance.getMetrics"):
            try:
                profile[command] = cdp.send(command)
            except Exception as exc:
                status.setdefault("profilingLimitations", []).append({"command": command, "error": str(exc)})
    browser = page.evaluate("""async () => {
      const raw = localStorage.getItem('oakvale-v1') || '';
      let save = null; try { save = JSON.parse(raw); } catch {}
      const databases = indexedDB.databases ? await indexedDB.databases() : [];
      const db = await Promise.all(databases.filter(x => x.name).map(info => new Promise(resolve => {
        const request = indexedDB.open(info.name);
        request.onerror = () => resolve({name:info.name,error:String(request.error)});
        request.onsuccess = () => { const database=request.result; const stores=[...database.objectStoreNames];
          if (!stores.length) { database.close(); resolve({name:info.name,stores:[]}); return; }
          const tx=database.transaction(stores,'readonly'); const counts={}; let left=stores.length;
          for (const store of stores) { const q=tx.objectStore(store).count(); q.onsuccess=()=>{counts[store]=q.result;if(!--left){database.close();resolve({name:info.name,counts});}}; q.onerror=()=>{counts[store]=null;if(!--left){database.close();resolve({name:info.name,counts});}}; }
        };
      })));
      return {utc:new Date().toISOString(), url:location.href, viewport:{width:innerWidth,height:innerHeight},
        worldClock:document.querySelector('.world-clock')?.innerText ?? null,
        visibleText:(document.querySelector('.world-map')?.innerText ?? '').slice(0,1200),
        openDialogs:[...document.querySelectorAll('dialog.pixel-window[open]')].map(x=>x.innerText.slice(0,500)),
        localStorageBytes:new TextEncoder().encode(raw).length, save:{worldTime:save?.worldTime,historyCount:save?.history?.length,
          eventCount:save?.events?.length,journalPending:save?.playJournal?.pending?.length,crisisPhase:save?.regionalCrisis?.phase,
        crisisSequence:save?.regionalCrisis?.sequence,crisisOutcome:save?.regionalCrisis?.outcome,
        crisisSummary:save?.regionalCrisis?.resolutionSummary,crisisEvents:(save?.history||[]).filter(x=>String(x.type||'').startsWith('regional-crisis.')),
        storageKeyPresent:!!raw}, indexedDB:db};
    }""")
    save_latency=save_latency_sample(page)
    status["saveLatencySamples"]=save_latency
    row={"atUTC":now_utc(),"elapsedRealSeconds":round(now-status["startedMonotonic"],2),"reason":reason,
         "browser":browser,"cdp":profile,"saveLatency":save_latency,"pageErrors":len(status["pageErrors"]),"consoleErrors":len(status["consoleErrors"]),
         "requestFailures":len(status["requestFailures"]),"httpFailures":len(status["httpFailures"])}
    append_jsonl(run_dir/"checkpoints.jsonl",row); status.setdefault("checkpoints",[]).append(row)
    if status.get("normalRunStartedMonotonic"):
        phase=browser["save"].get("crisisPhase")
        previous=status.get("normalLastObservedPhase")
        transitions=status.setdefault("normalPhaseTrace",[])
        if previous!=phase:
            phase_row={"atUTC":row["atUTC"],"elapsedNormalSeconds":round(now-status["normalRunStartedMonotonic"],2),
                "phase":phase,"worldTime":browser["save"].get("worldTime"),"outcome":browser["save"].get("crisisOutcome"),
                "resolutionSummary":browser["save"].get("crisisSummary"),"crisisEvents":browser["save"].get("crisisEvents"),
                "normalFresh":True,"controlledFixture":False}
            transitions.append(phase_row)
            append_jsonl(run_dir/"normal-phase-trace.jsonl",phase_row)
            status["normalLastObservedPhase"]=phase
            try: snapshot(page,run_dir,f"normal-phase-{phase}-{len(transitions):02d}",status)
            except Exception as exc: status.setdefault("snapshotErrors",[]).append(f"{phase}: {type(exc).__name__}: {exc}")
    status["nextCheckpointMonotonic"]=now+CHECKPOINT_SECONDS
    status["lastCheckpoint"]=row
    # Bounded supervisor projection is durable even while the browser action loop is active.
    append_jsonl(run_dir/"supervisor.jsonl",{"atUTC":row["atUTC"],"checkpointCount":len(status["checkpoints"]),
         "crisisPhase":browser["save"]["crisisPhase"],"pageErrors":row["pageErrors"],"consoleErrors":row["consoleErrors"]})


def observe_normal_phase(page, run_dir, status):
    save=page.evaluate("() => { try { return JSON.parse(localStorage.getItem('oakvale-v1')||'{}') } catch { return {} } }")
    crisis=save.get("regionalCrisis") or {}
    phase=crisis.get("phase")
    previous=status.get("normalLastObservedPhase")
    transitioned=previous!=phase
    trace=status.setdefault("normalPhaseTrace",[])
    row={"atUTC":now_utc(),"elapsedNormalSeconds":round(time.monotonic()-status["normalRunStartedMonotonic"],2),
         "phase":phase,"worldTime":save.get("worldTime"),"outcome":crisis.get("outcome"),
         "resolutionSummary":crisis.get("resolutionSummary"),"crisisEvents":[x for x in save.get("history",[]) if str(x.get("type","" )).startswith("regional-crisis.")],
         "normalFresh":True,"controlledFixture":False,"capture":"post-visible-policy-turn","phaseTransition":transitioned,
         "policyTurn":status.get("agentChoiceCount"),"policyChoice":status.get("lastAgentChoice",{}).get("choice")}
    trace.append(row); append_jsonl(run_dir/"normal-phase-trace.jsonl",row)
    status["normalLastObservedPhase"]=phase
    if transitioned:
        try: snapshot(page,run_dir,f"normal-phase-{phase}-{len(trace):02d}",status)
        except Exception as exc: status.setdefault("snapshotErrors",[]).append(f"{phase}: {type(exc).__name__}: {exc}")


def visible_agent_turn(page, run_dir, log, status, turn):
    """Observe live world/news, choose a lawful goal, and log the evidence and motivation."""
    save=page.evaluate("() => { try { return JSON.parse(localStorage.getItem('oakvale-v1')||'{}') } catch { return {} } }")
    phase=(save.get("regionalCrisis") or {}).get("phase","dormant")
    visible=page.locator(".world-map").inner_text()[:1500] if page.locator(".world-map").count() else ""
    dialogs=page.locator("dialog.pixel-window[open]")
    choice="wait_one_day"; action_done=False
    reason=f"讀取目前可見世界與危機階段 {phase}；若無更急迫的居民／防衛需求，前進一個世界日觀察變化。"
    actor=next((ch for ch in save.get("characters",[]) if ch.get("id")==save.get("activeCharacterId")),{})
    if actor and actor.get("isAlive") is False:
        successor=page.locator("dialog.pixel-window[open]")
        expect(successor).to_contain_text("選一位居民，接續旅程")
        candidates=successor.locator(".successor-list button")
        # The production screen includes anyone age 15+, while its copy calls these
        # adults. Select only an explicitly visible adult (18+) when possible.
        adult_candidates=[]
        for index in range(candidates.count()):
            candidate=candidates.nth(index)
            label=candidate.inner_text()
            match=re.search(r"·\s*(\d+)\s*歲",label)
            if match and int(match.group(1)) >= 18:
                adult_candidates.append((candidate,label))
        if adult_candidates:
            before_successor={key:save.get(key) for key in ("worldSeed","rngState","worldTime","regionalCrisis","threat","settlement","tiles","regions")}
            before_npcs=save.get("npcs",[])
            label=adult_candidates[0][1]
            adult_candidates[0][0].click()
            page.locator(".world-map").wait_for(timeout=15000)
            expect(page.locator("dialog.pixel-window[open]")).to_have_count(0,timeout=5000)
            after_successor=saved_game(page)
            after_character=next((ch for ch in after_successor.get("characters",[]) if ch.get("id")==after_successor.get("activeCharacterId")),{})
            invariant_mismatches={key:{"before":before_successor[key],"after":after_successor.get(key)}
                for key in before_successor if before_successor[key]!=after_successor.get(key)}
            if invariant_mismatches:
                raise AssertionError(f"Visible successor selection unexpectedly replaced world state: {invariant_mismatches}")
            expected_npcs=[npc for npc in before_npcs if npc.get("id")!=after_successor.get("activeCharacterId")]
            if expected_npcs!=after_successor.get("npcs",[]):
                raise AssertionError("Visible successor selection changed unrelated world residents")
            if after_character.get("age",0)<18 or after_character.get("isAlive") is False:
                raise AssertionError("Visible successor is not a living adult character")
            choice="visible_choose_world_successor"
            reason=f"角色已離世，依可見名單接續世界中既有成年居民：{label}；已核對 worldSeed、RNG、時間與世界/危機狀態延續。"
            status["successorContinuity"]={"verified":True,"selectedVisibleLabel":label,"worldSeed":after_successor.get("worldSeed"),
                "worldTimeBefore":before_successor["worldTime"],"worldTimeAfter":after_successor.get("worldTime"),
                "activeCharacterId":after_successor.get("activeCharacterId"),"unrelatedNpcRosterPreserved":True,"invariantMismatches":invariant_mismatches}
        else:
            waiting=successor.get_by_role("button",name=re.compile("等待新居民抵達 · 15 日"))
            expect(waiting).to_be_enabled(); waiting.click()
            choice="visible_wait_for_successor_15_days"
            reason="離世畫面目前沒有可選的成年居民，使用明示的等待選項讓世界自然接續。"
        append_jsonl(log,{"atUTC":now_utc(),"lane":"AGENT_CRISIS" if status["mode"]=="agent-crisis" else "STRESS_AGENT",
            "turn":turn,"choice":choice,"reason":reason,"visibleWorld":visible,"observedCrisisPhase":phase,"stateInjected":False,"url":page.url})
        status["agentChoiceCount"]=status.get("agentChoiceCount",0)+1
        status["lastAgentChoice"]={"turn":turn,"choice":choice,"reason":reason,"observedCrisisPhase":phase}
        if status.get("normalRunStartedMonotonic"):
            observe_normal_phase(page,run_dir,status)
        return
    if status.get("mode")=="dry" and status.get("dryContextModalPending") and not save.get("combat"):
        open_dialog=page.locator("dialog.pixel-window[open]")
        expect(open_dialog).to_contain_text("等待不會自動恢復生命與體力")
        require_world_surface(page)
        page.locator(".context-action").click()
        context_dialog=page.locator("dialog.pixel-window[open]")
        expect(context_dialog).to_be_visible()
        title=context_dialog.locator("h2").inner_text()
        if not title.strip():
            raise AssertionError("Visible context action opened a place dialog without a title")
        require_world_surface(page)
        page.get_by_role("button",name="選單").click()
        menu=page.locator("dialog.pixel-window[open]"); menu.get_by_role("button",name="旅人筆記").click()
        notes=page.locator("dialog.pixel-window[open]")
        expect(notes).to_contain_text("等待不會自動恢復生命與體力")
        notes.get_by_role("button",name="等待 1 日").click()
        require_world_surface(page)
        choice="dry_modal_close_then_context_interaction_after_save_reload"
        reason=f"保存/重載後先以筆記彈窗遮住世界，透過彈窗自身關閉按鈕恢復世界，再執行可見互動（{title}）並合法等待一日。"
        status["dryContextActionValidated"]={"verified":True,"modalBefore":"旅人筆記","visibleContextDialog":title,
            "modalClosedBeforeContextClick":True,"contextDialogClosed":True,"legalWait":"等待 1 日"}
        status["dryContextModalPending"]=False
        append_jsonl(log,{"atUTC":now_utc(),"lane":"NORMAL_FRESH","turn":turn,"choice":choice,"reason":reason,
            "dialogClosedViaVisibleControl":True,"contextDialogTitle":title,"stateInjected":False,"url":page.url})
        status["agentChoiceCount"]=status.get("agentChoiceCount",0)+1
        status["lastAgentChoice"]={"turn":turn,"choice":choice,"reason":reason,"observedCrisisPhase":phase}
        if status.get("normalRunStartedMonotonic"):
            observe_normal_phase(page,run_dir,status)
        return
    if save.get("combat"):
        # A live battle dialog owns the screen; otherwise close the current visible pane first.
        battle=dialogs.last if dialogs.count() and "回合制戰鬥" in dialogs.last.inner_text() else None
        if battle is None:
            require_world_surface(page)
            page.get_by_role("button",name="返回戰鬥").click()
            battle=page.locator("dialog.pixel-window[open]")
        expect(battle).to_contain_text("回合制戰鬥")
        actor=next((ch for ch in save.get("characters",[]) if ch.get("id")==save.get("activeCharacterId")),{})
        hp=actor.get("hp"); potion=actor.get("inventory",{}).get("potion",0)
        if hp is not None and hp < 35 and potion:
            action_button=battle.get_by_role("button",name="使用藥水"); choice="combat_potion"; reason=f"戰鬥畫面顯示生命 {hp} 且有藥水，先恢復再承受敵方回合。"
        elif hp is not None and hp < 25:
            action_button=battle.get_by_role("button",name="防禦"); choice="combat_defend"; reason=f"戰鬥畫面顯示生命 {hp} 偏低且沒有可用藥水，先防禦降低承受傷害。"
        else:
            action_button=battle.get_by_role("button",name="攻擊"); choice="combat_attack"; reason="戰鬥仍在進行且角色狀態可承受；使用可見攻擊指令推進當前遭遇。"
        action_button.click(); action_done=True
        if save_game := page.evaluate("() => JSON.parse(localStorage.getItem('oakvale-v1')||'{}')"):
            if save_game.get("combat"):
                append_jsonl(log,{"atUTC":now_utc(),"lane":"AGENT_CRISIS" if status["mode"]=="agent-crisis" else "STRESS_AGENT",
                    "turn":turn,"choice":choice,"reason":reason,"visibleWorld":visible,"observedCrisisPhase":phase,"stateInjected":False,"url":page.url})
                status["agentChoiceCount"]=status.get("agentChoiceCount",0)+1; status["lastAgentChoice"]={"turn":turn,"choice":choice,"reason":reason,"observedCrisisPhase":phase}
                return
    elif dialogs.count():
        # Close the dialog through its own visible control and verify the world surface is clear.
        require_world_surface(page)
    if not action_done and phase in ("warning","preparation"):
        page.get_by_role("button",name="選單").click()
        menu=page.locator("dialog.pixel-window[open]")
        menu.get_by_role("button",name="地方消息與委託").click()
        report=page.locator("[data-crisis-report]")
        expect(report).to_be_visible()
        actions=report.locator(".crisis-actions")
        if actions.count():
            food=actions.get_by_role("button",name=re.compile("支援食物"))
            gold=actions.get_by_role("button",name=re.compile("支援後勤"))
            gear=report.locator(".crisis-gear-row button").filter(has_text="選擇交付")
            # Decide from visible shortage labels and real available support, preserving gear unless food/gold are unavailable.
            needs=report.locator("[data-need]")
            needed=[(needs.nth(i).get_attribute("data-need"),needs.nth(i).get_attribute("data-state")) for i in range(needs.count())]
            if food.count() and food.is_enabled():
                food.click(); choice="contribute_food"; reason=f"警訊/準備階段，眼前需求 {needed}，可見食物支援按鈕；以背包糧食支援防衛。"
                action_done=True
            elif gold.count() and gold.is_enabled():
                gold.click(); choice="contribute_gold"; reason=f"警訊/準備階段，眼前需求 {needed}，可見後勤支援按鈕；以可用金幣支援防衛。"
                action_done=True
            elif gear.count() and gear.first.is_enabled():
                gear.first.click(); confirm=report.locator("[data-crisis-gear-confirm]")
                if confirm.count() and confirm.is_visible(): confirm.click()
                choice="contribute_equipment"; reason=f"警訊/準備階段，眼前需求 {needed}，可見食物/後勤不足或不可用；選擇交付可見閒置裝備。"
                action_done=True
            else:
                choice="inspect_preparation"; reason=f"檢查可見防衛需求 {needed}；目前沒有可用且可見的支援行動，避免虛構貢獻。"
        else:
            choice="observe_crisis"; reason="警訊已出現；檢視危機與防衛準備資訊，待下一階段再選擇行動。"
        require_world_surface(page)
    elif not action_done and phase in ("warning","preparation","active") and save.get("characters"):
        actor=next((ch for ch in save.get("characters",[]) if ch.get("id")==save.get("activeCharacterId")),{})
        if actor.get("currentRegion")=="forest":
            page.locator(".context-action").click()
            place=page.locator("dialog.pixel-window[open]")
            camp=place.locator("[data-camp-raid]")
            chief=place.get_by_role("button",name=re.compile("挑戰哥布林酋長"))
            if camp.count() and camp.is_enabled():
                camp.click(); choice="start_visible_goblin_camp_raid"; reason="身處北方森林且危機仍在進行；可見營地突襲行動，以角色冒險支援聚落。"; action_done=True
            elif chief.count() and chief.is_enabled():
                chief.click(); choice="challenge_visible_goblin_chief"; reason="北方酋長仍在場且角色位於森林；依危機目標挑戰可見首領。"; action_done=True
            else:
                require_world_surface(page)
    elif not action_done and turn % 5 == 2:
        # Resolve an open resident request when its visible action is enabled.
        page.get_by_role("button",name="選單").click()
        menu=page.locator("dialog.pixel-window[open]"); menu.get_by_role("button",name="地方消息與委託").click()
        news=page.locator("dialog.pixel-window[open]"); requests=news.locator(".request-entry")
        for index in range(requests.count()):
            row=requests.nth(index); candidate=row.get_by_role("button").first
            if candidate.is_enabled():
                request_text=row.inner_text()[:500]; candidate.click(); choice="fulfill_visible_resident_request"
                reason=f"地方消息顯示一項可處理的居民請求：{request_text}；按可見行動回應。"; action_done=True; break
        if not action_done:
            news_text=news.locator(".life-news-window").inner_text()[:500]
            choice="inspect_local_news"; reason=f"目前無可用請求，檢查居民與北方消息以決定下一步：{news_text}。"
        require_world_surface(page)
    elif not action_done and turn % 4 == 0:
        # Walk toward the visibly identified north forest instead of repeating clock-only actions.
        coords=re.search(r"(\d+)\s*,\s*(\d+)",page.locator(".world-caption").inner_text())
        if coords:
            x,y=int(coords.group(1)),int(coords.group(2))
            direction="往上" if y>4 else "往下" if y<4 else "往左" if x>5 else "往右"
            reason=f"目前地圖座標為 {x},{y}，北方森林互動可調查警訊／營地；朝可見區域路線前進。"
            choice="move_toward_north_forest"
            page.get_by_role("button",name=direction).click(); action_done=True
            post=page.evaluate("() => JSON.parse(localStorage.getItem('oakvale-v1')||'{}')")
            if post.get("combat"):
                # Next turn is reserved for the visible battle pane.
                pass
    elif not action_done and turn % 11 == 1:
        previous=page.locator(".world-clock").inner_text()
        page.get_by_role("button",name="×20").click(); page.wait_for_timeout(700)
        page.get_by_role("button",name="暫停").click(); current=page.locator(".world-clock").inner_text()
        choice="visible_speed_x20"; reason=f"觀察世界時鐘 {previous}；短暫使用既有 ×20 速度觀察即時世界活動，再暫停檢查變化。"; action_done=True
    elif not action_done:
        actor=next((ch for ch in save.get("characters",[]) if ch.get("id")==save.get("activeCharacterId")),{})
        if actor and (actor.get("hp",100)<60 or actor.get("stamina",100)<35) and actor.get("currentRegion")=="village":
            page.locator(".context-action").click()
            place=page.locator("dialog.pixel-window[open]")
            rest=place.get_by_role("button",name=re.compile("休息 · 1 小時"))
            if rest.count() and rest.is_enabled():
                rest.click(); choice="visible_rest"; reason=f"角色生命/體力偏低（生命 {actor.get('hp')}、體力 {actor.get('stamina')}），選擇可見休息行動恢復。"; action_done=True
            else: require_world_surface(page)
    if choice in {"contribute_food","contribute_gold","contribute_equipment","start_visible_goblin_camp_raid","challenge_visible_goblin_chief","combat_potion","combat_defend","combat_attack"}:
        status["normalCrisisActionCount"] = status.get("normalCrisisActionCount",0)+1
    append_jsonl(log,{"atUTC":now_utc(),"lane":"AGENT_CRISIS" if status["mode"]=="agent-crisis" else "STRESS_AGENT",
        "turn":turn,"choice":choice,"reason":reason,"visibleWorld":visible,"observedCrisisPhase":phase,"stateInjected":False,"url":page.url})
    status.setdefault("agentChoiceCount",0); status["agentChoiceCount"]+=1
    status["lastAgentChoice"]={"turn":turn,"choice":choice,"reason":reason,"observedCrisisPhase":phase}
    # Progress time using the actual visible World Records wait action in Traveller Notes.
    latest=page.evaluate("() => JSON.parse(localStorage.getItem('oakvale-v1')||'{}')")
    if not latest.get("combat") and (not action_done or choice in ("inspect_local_news","inspect_preparation","observe_crisis")):
        require_world_surface(page)
        page.get_by_role("button",name="選單").click()
        menu=page.locator("dialog.pixel-window[open]")
        menu.get_by_role("button",name="旅人筆記").click()
        notes=page.locator("dialog.pixel-window[open]")
        expect(notes).to_contain_text("等待不會自動恢復生命與體力")
        wait=notes.get_by_role("button",name="等待 1 日")
        expect(wait).to_be_enabled(); wait.click()
        require_world_surface(page)
    if status.get("normalRunStartedMonotonic"):
        observe_normal_phase(page,run_dir,status)


def visible_save_reload(page, run_dir, log, status, *, label):
    """Use the ordinary menu save and browser reload; compare crisis and clock state."""
    require_world_surface(page)
    before=saved_game(page)
    started=time.perf_counter()
    page.get_by_role("button",name="選單").click()
    menu=page.locator("dialog.pixel-window[open]")
    menu.get_by_role("button",name="儲存世界").click()
    expect(menu).to_contain_text("世界已儲存")
    require_world_surface(page)
    saved=page.evaluate("() => localStorage.getItem('oakvale-v1')")
    page.reload(wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
    restored=saved_game(page)
    keys=("worldTime","eventSequence","activeCharacterId","regionalCrisis")
    mismatches={key:{"before":before.get(key),"after":restored.get(key)} for key in keys if before.get(key)!=restored.get(key)}
    latency_ms=round((time.perf_counter()-started)*1000,2)
    row={"atUTC":now_utc(),"lane":"NORMAL_FRESH","label":label,"latencyMs":latency_ms,"savedBytes":len(saved or ""),
         "historyCount":len(restored.get("history",[])),"journalPending":len(restored.get("playJournal",{}).get("pending",[])),
         "worldTime":restored.get("worldTime"),"crisisPhase":restored.get("regionalCrisis",{}).get("phase"),"invariantMismatches":mismatches}
    append_jsonl(log,row); status.setdefault("uiLatencySamples",[]).append({"action":label,"latencyMs":latency_ms})
    if mismatches: raise AssertionError(f"Visible save/reload changed {mismatches}")
    status["periodicSaveReloads"]=status.get("periodicSaveReloads",0)+1
    status["lastSaveReload"]=row


def normal_lane(page, context, log, status, deadline):
    page.set_viewport_size({"width": 1280, "height": 900})
    page.goto(status["url"], wait_until="domcontentloaded")
    opening = page.locator("dialog.pixel-window[open]")
    expect(opening).to_have_count(1, timeout=15000)
    expect(opening).to_contain_text("在陌生的天空下")
    start = opening.get_by_role("button", name="起身")
    expect(start).to_be_enabled(timeout=15000)
    start.click()
    page.locator(".world-map").wait_for(timeout=15000)
    action(log, "NORMAL_FRESH", "click visible opening action 起身", page)
    status["lanes"]["NORMAL_FRESH"] = {"status": "IN_PROGRESS", "stateInjected": False, "debugTimeOrStateInjection": False}
    page.get_by_role("button", name="暫停").click()
    clock=page.locator(".world-clock").inner_text()
    status["lanes"]["NORMAL_FRESH"]={"status":"IN_PROGRESS","stateInjected":False,"debugTimeOrStateInjection":False,"startClockText":clock}
    action(log,"NORMAL_FRESH","start fresh save through visible opening action; pause real-time clock before policy turn",page,startClockText=clock)


def controlled_lane(page, log, status, fixture: dict[str, Any]):
    status["lanes"][fixture["lane"]] = {"status": "FIXTURE_REQUIRED", "fixtureLabel": fixture["lane"], "source": fixture.get("path"),
        "fixtureSha256": fixture.get("sha256"), "method": fixture.get("method"), "normalFreshEquivalent": False}
    storage = fixture.get("storageState")
    if not storage:
        return
    if not Path(storage).is_file(): raise RuntimeError(f"Missing released fixture storage state: {storage}")
    if __import__("hashlib").sha256(Path(storage).read_bytes()).hexdigest() != fixture.get("storageStateSha256"):
        raise RuntimeError(f"Fixture storage-state hash mismatch: {storage}")
    raise RuntimeError("Fixture execution requires separate browser context orchestration; storage state was not loaded into NORMAL_FRESH context")


def load_controlled_save(context, path: Path):
    state = json.loads(path.read_text(encoding="utf-8"))
    packed = {**state, "playJournal": {"version": 1, "worldId": "g-controlled-fixture", "pending": []}}
    # This isolated context starts empty. Guarding makes injection one-shot: Playwright
    # init scripts also run on reload, where re-injecting would erase real UI actions.
    context.add_init_script("if (!localStorage.getItem('oakvale-v1')) localStorage.setItem('oakvale-v1', " + json.dumps(json.dumps(packed, ensure_ascii=False)) + ");")
    return state


def saved_game(page):
    raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    if not raw: raise AssertionError("Expected app save in isolated browser storage")
    return json.loads(raw)


def controlled_cases(browser, run_dir, log, status, fixture_manifest):
    fixtures = fixture_manifest["fixtures"]
    base = PHASE
    # Controlled warning profile is separate from both the normal opening and the later
    # preparation/contribution profile. Verify the world event affordance and Life News.
    warning_spec=fixtures["CONTROLLED_WARNING_UI_FIXTURE"]; warning_path=base/warning_spec["path"]
    if __import__("hashlib").sha256(warning_path.read_bytes()).hexdigest()!=warning_spec["sha256"]: raise AssertionError("Controlled warning fixture hash differs from its manifest")
    warning_context=browser.new_context(viewport={"width":1280,"height":900},reduced_motion="reduce"); load_controlled_save(warning_context,warning_path)
    warning_page=warning_context.new_page(); wire_errors(warning_page,status); warning_page.goto(status["url"],wait_until="domcontentloaded"); warning_page.locator(".world-map").wait_for(timeout=15000)
    warning=warning_page.locator(".crisis-warning-event"); expect(warning).to_be_visible(); expect(warning).to_contain_text("危機警訊"); snapshot(warning_page,run_dir,"controlled-warning-world",status)
    warning.click(); expect(warning_page.locator("dialog.pixel-window[open]")).to_contain_text("北方哥布林活動升高")
    warning_page.keyboard.press("Escape"); expect(warning_page.locator("dialog.pixel-window[open]")).to_have_count(0)
    warning_page.get_by_role("button",name="選單").click(); warning_page.locator("dialog.pixel-window[open]").get_by_role("button",name="地方消息與委託").click()
    warning_report=warning_page.locator("[data-crisis-report]"); expect(warning_report).to_be_visible(); expect(warning_report.locator("[data-need]")).to_have_count(4)
    warning_page.set_viewport_size({"width":390,"height":844})
    if warning_page.evaluate("document.documentElement.scrollWidth > window.innerWidth"): raise AssertionError("Controlled warning Life News overflows narrow viewport")
    snapshot(warning_page,run_dir,"controlled-warning-life-news-narrow",status)
    action(log,"CONTROLLED_WARNING_UI_FIXTURE","visible warning event and four needs inspected in Life News at narrow viewport",warning_page,fixturePath=warning_spec["path"])
    status["lanes"]["CONTROLLED_WARNING_UI_FIXTURE"]={"status":"PASS_WARNING_AND_NEEDS","fixturePath":warning_spec["path"],"fixtureSha256":warning_spec["sha256"],"normalFreshEquivalent":False,"keyboardEscapeVerified":True,"narrowViewportNoHorizontalOverflow":True}
    warning_context.close()
    # Preparation fixture: all actions are visible Life News controls and use a separate profile.
    spec = fixtures["CONTROLLED_UI_FIXTURE"]
    path = base / spec["path"]
    if __import__("hashlib").sha256(path.read_bytes()).hexdigest() != spec["sha256"]:
        raise AssertionError("Controlled preparation fixture hash differs from its manifest")
    context = browser.new_context(viewport={"width":1280,"height":900}, reduced_motion="reduce")
    initial = load_controlled_save(context, path)
    page = context.new_page(); wire_errors(page, status)
    page.goto(status["url"], wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
    status["lanes"]["CONTROLLED_UI_FIXTURE"] = {"status":"IN_PROGRESS", "fixturePath":spec["path"], "fixtureSha256":spec["sha256"], "normalFreshEquivalent":False}
    page.get_by_role("button", name="選單").click()
    menu=page.locator("dialog.pixel-window[open]"); menu.get_by_role("button",name="地方消息與委託").click()
    dialog=page.locator("dialog.pixel-window[open]"); report=dialog.locator("[data-crisis-report]")
    expect(report).to_be_visible(); expect(report).to_contain_text("備戰期間"); expect(report.locator("[data-need]")).to_have_count(4)
    snapshot(page,run_dir,"controlled-preparation-before",status)
    before=saved_game(page); crisis_id=before["regionalCrisis"]["id"]
    food=report.get_by_role("button",name=re.compile("支援食物")); gold=report.get_by_role("button",name=re.compile("支援後勤"))
    food_visible=bool(food.count()); gold_visible=bool(gold.count()); gear_visible=bool(report.locator(".crisis-gear-row").count())
    if food.count():
        food.click(); after_food=saved_game(page)
        if after_food["regionalCrisis"]["contributions"]["food"]["supplied"] <= before["regionalCrisis"]["contributions"]["food"]["supplied"]: raise AssertionError("Visible food contribution did not update current crisis ledger")
        action(log,"CONTROLLED_UI_FIXTURE","visible food support updated preparation ledger",page,crisisId=crisis_id)
        before=after_food
    else: status["foodContribution"]="UNAVAILABLE_IN_FIXTURE"
    if gold.count():
        gold.click(); after_gold=saved_game(page)
        if after_gold["regionalCrisis"]["contributions"]["gold"]["spent"] <= before["regionalCrisis"]["contributions"]["gold"]["spent"]: raise AssertionError("Visible logistics contribution did not update current crisis ledger")
        action(log,"CONTROLLED_UI_FIXTURE","visible logistics support updated preparation ledger",page,crisisId=crisis_id)
        before=after_gold
    else: status["goldContribution"]="UNAVAILABLE_IN_FIXTURE"
    gear_rows=report.locator(".crisis-gear-row")
    if gear_rows.count():
        gear_rows.first.get_by_role("button",name="選擇交付").click()
        confirm=report.get_by_role("group",name="確認交付裝備")
        expect(confirm).to_be_visible(); snapshot(page,run_dir,"controlled-gear-confirm",status)
        confirm.get_by_role("button",name="確認交付").click()
        after_gear=saved_game(page)
        if len(after_gear["regionalCrisis"]["contributions"]["equipment"]) != len(before["regionalCrisis"]["contributions"]["equipment"])+1: raise AssertionError("Visible gear confirmation did not create exactly one allocation")
        initial_gear_ids={item["instanceId"] for item in initial["reward"]["instances"]}
        if any(item["instanceId"] in initial_gear_ids for item in after_gear["reward"]["instances"]):
            raise AssertionError("Delivered gear remains in player inventory")
        snapshot(page,run_dir,"controlled-gear-delivered",status)
        action(log,"CONTROLLED_UI_FIXTURE","confirmed visible gear delivery updated allocation and removed item",page,crisisId=crisis_id)
    else: status["gearDelivery"]="UNAVAILABLE_IN_FIXTURE"
    # Current crisis save is automatically persisted; reload and re-check its phase/ledger.
    persisted=saved_game(page); pre_reload_raw=page.evaluate("localStorage.getItem('oakvale-v1')")
    pre_reload_sha=__import__("hashlib").sha256(pre_reload_raw.encode()).hexdigest()
    page.reload(wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
    page.get_by_role("button",name="選單").click(); page.locator("dialog.pixel-window[open]").get_by_role("button",name="地方消息與委託").click()
    reloaded=saved_game(page); post_reload_raw=page.evaluate("localStorage.getItem('oakvale-v1')")
    post_reload_sha=__import__("hashlib").sha256(post_reload_raw.encode()).hexdigest()
    ledger_matches = reloaded["regionalCrisis"]["id"] == persisted["regionalCrisis"]["id"] and reloaded["regionalCrisis"]["contributions"] == persisted["regionalCrisis"]["contributions"]
    if not ledger_matches:
        status["controlledReloadMismatch"] = {"fixturePath":spec["path"], "crisisId":crisis_id,
            "expectedPersisted":persisted["regionalCrisis"]["contributions"], "actualAfterReload":reloaded["regionalCrisis"]["contributions"],
            "expectedId":persisted["regionalCrisis"]["id"], "actualId":reloaded["regionalCrisis"]["id"],
            "storageBytes":len(post_reload_raw or ""), "preReloadSaveSha256":pre_reload_sha,
            "postReloadSaveSha256":post_reload_sha, "fixtureSha256":spec["sha256"]}
        status["lanes"]["CONTROLLED_UI_FIXTURE"]={"status":"FAIL_RELOAD_LEDGER_MISMATCH", "normalFreshEquivalent":False}
        action(log,"CONTROLLED_UI_FIXTURE","reload ledger mismatch captured; continuing independent fixtures",page,crisisId=crisis_id)
    else:
        action(log,"CONTROLLED_UI_FIXTURE","reload preserved phase and contribution ledger",page,crisisId=crisis_id,preReloadSaveSha256=pre_reload_sha,postReloadSaveSha256=post_reload_sha)
        status["lanes"]["CONTROLLED_UI_FIXTURE"].update({"status":"PASS_UI_ACTIONS", "foodVisible":food_visible,"goldVisible":gold_visible,"gearVisible":gear_visible,"reloadPreservedLedger":True})
    context.close()

    # Separate explicitly controlled forest contexts prove both visible actions and their
    # actual combat effect; these are UI-entry checks, not normal-opening progression.
    forest_spec=fixtures["CONTROLLED_FOREST_CAMP_CHIEF"]; forest_path=base/forest_spec["path"]
    if __import__("hashlib").sha256(forest_path.read_bytes()).hexdigest()!=forest_spec["sha256"]: raise AssertionError("Controlled forest fixture hash differs from its manifest")
    for action_name, button_selector, label in (("campRaid","[data-camp-raid]","CONTROLLED_FOREST_CAMP_RAID"),("chief","button","CONTROLLED_FOREST_CHIEF")):
        context=browser.new_context(viewport={"width":1280,"height":900},reduced_motion="reduce"); load_controlled_save(context,forest_path)
        page=context.new_page(); wire_errors(page,status); page.goto(status["url"],wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
        page.locator(".world-map").press("Enter")
        if action_name=="campRaid":
            target=page.locator(button_selector); expect(target).to_be_visible(); expect(target).to_be_enabled(); target.click()
        else:
            target=page.get_by_role("button",name=re.compile("挑戰哥布林酋長")); expect(target).to_be_visible(); expect(target).to_be_enabled(); target.click()
        current=saved_game(page)
        if not current.get("combat"): raise AssertionError(f"Visible {action_name} action did not enter combat")
        action(log,label,f"visible {action_name} action opened actual combat",page,crisisPhase=current["regionalCrisis"]["phase"],combat=current["combat"])
        snapshot(page,run_dir,label.lower(),status); status["lanes"][label]={"status":"PASS_VISIBLE_ACTION_COMBAT","fixturePath":forest_spec["path"],"normalFreshEquivalent":False}
        context.close()

    for label, lane, expected in (("CONTROLLED_UI_FIXTURE_KNOWN_AFTERMATH","CONTROLLED_UI_FIXTURE_KNOWN_AFTERMATH",None),("LEGACY_UNKNOWN_FIXTURE","LEGACY_UNKNOWN_FIXTURE","較早的危機紀錄沒有結算摘要，結果未知。")):
        spec=fixtures[label]; path=base/spec["path"]
        if __import__("hashlib").sha256(path.read_bytes()).hexdigest()!=spec["sha256"]: raise AssertionError(f"Fixture hash mismatch: {label}")
        state=json.loads(path.read_text(encoding="utf-8")); context=browser.new_context(viewport={"width":1280,"height":900},reduced_motion="reduce")
        load_controlled_save(context,path); page=context.new_page(); wire_errors(page,status)
        page.goto(status["url"],wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
        page.get_by_role("button",name="選單").click(); page.locator("dialog.pixel-window[open]").get_by_role("button",name="地方消息與委託").click()
        report=page.locator("[data-crisis-report]"); expect(report).to_be_visible()
        if expected: expect(report).to_contain_text(expected)
        else:
            actual = {"outcome":state["regionalCrisis"]["outcome"],"summary":state["regionalCrisis"]["resolutionSummary"]}
            outcome_labels={"decisive_success":"守住了橡谷","costly_success":"橡谷守住了，但付出代價","setback":"北方局勢惡化","local_defeat":"北方防線失守"}
            expect(report).to_contain_text(outcome_labels[actual["outcome"]]); expect(report).to_contain_text("目前不需要額外救援" if actual["summary"]["recovery"]["status"]=="not_required" else "救援居民")
        snapshot(page,run_dir,lane.lower()+"-before-reload",status); page.reload(wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
        page.get_by_role("button",name="選單").click(); page.locator("dialog.pixel-window[open]").get_by_role("button",name="地方消息與委託").click()
        report=page.locator("[data-crisis-report]")
        if expected: expect(report).to_contain_text(expected)
        else: expect(report).to_contain_text(outcome_labels[actual["outcome"]])
        action(log,lane,"visible aftermath result persisted after reload",page)
        status["lanes"][lane]={"status":"PASS_RESULT_RELOAD","fixturePath":spec["path"],"fixtureSha256":spec["sha256"],"normalFreshEquivalent":False,"legacyUnknown":bool(expected)}
        context.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true")
    parser.add_argument("--mode", choices=("stress","agent-crisis","dry"), default="dry")
    parser.add_argument("--seconds", type=int, default=30)
    parser.add_argument("--run-id", required=False)
    parser.add_argument("--url", default=os.environ.get("PLW_V2_URL", ""))
    parser.add_argument("--run-dir", type=Path)
    parser.add_argument("--execution-model", default="GPT-6 Luna")
    parser.add_argument("--execution-effort", default="low")
    args = parser.parse_args()
    if not args.go:
        print("PREPARED ONLY: pass --go after Root J release and current production build")
        return 0
    if not args.url or not args.run_id or not args.run_dir: parser.error("use the launcher-provided run id, URL, and run directory")
    limits={"stress":(1200,1800),"agent-crisis":(1800,3600),"dry":(20,120)}
    minimum,maximum=limits[args.mode]
    if not minimum <= args.seconds <= maximum: parser.error(f"{args.mode} mode must be {minimum}..{maximum} seconds")
    build=validate_build(ROOT,BUILD_PATH)
    evidence={"build":build,"provenance":provenance(ROOT,BUILD_PATH,[PHASE/"j_browser_launcher.py",DRIVER,SUPPORT,FIXTURE_GENERATOR])}
    release={"authorization":"Phase 6-J released by Root","markerRequired":False}
    run_dir = args.run_dir.resolve()
    if not run_dir.is_dir() or any((run_dir / name).exists() for name in ("operations.jsonl", "j-browser-result.json")):
        raise RuntimeError("Launcher must provide an empty run directory")
    status: dict[str, Any] = {"status": "IN_PROGRESS", "runId": args.run_id, "mode": args.mode,"startedMonotonic":time.monotonic(),
        "producer": PRODUCER, "runnerExecution": {"requestedModel": args.execution_model, "requestedEffort": args.execution_effort, "backendRuntimeVerified": False},
        "policyExecution": {"controller": "visible-world goal selection with recorded reasons", "modelInference": "none", "humanEnjoymentClaim": False},
        "releaseMarker": release, "sourceBefore": evidence["provenance"], "buildStatus": evidence["build"], "buildStatusPath": str(BUILD_PATH),
        "url": args.url, "startUTC": now_utc(), "lanes": {}, "pageErrors": [], "consoleErrors": [], "requestFailures": [], "httpFailures": [],
        "screenshots": [], "humanValidation": {"status": "DEFERRED / NOT APPLICABLE AT THIS STAGE"},
        "limitations": ["Runner-driven browser QA is not human product validation.", "Controlled UI fixtures are separate from normal fresh-save play.", "Human Safari and physical phones are excluded."]}
    log = run_dir / "operations.jsonl"; page = context = browser = playwright = None; error = None
    try:
        status["servedAssets"] = verify_http_dist(ROOT, args.url, evidence["build"])
        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
        page = context.new_page(); wire_errors(page, status)
        attach_early_capture(page)
        cdp=context.new_cdp_session(page)
        for command in ("Performance.enable",):
            try: cdp.send(command); status.setdefault("profilingCapabilities",{})[command]=True
            except Exception as exc: status.setdefault("profilingLimitations",[]).append({"command":command,"error":str(exc)})
        normal_lane(page, context, log, status, time.monotonic()+2)
        normal_start=time.monotonic(); status["normalRunStartedMonotonic"]=normal_start; status["normalStartUTC"]=now_utc()
        status["nextCheckpointMonotonic"]=normal_start
        # Keep the fresh save alive for the complete independent run. Agent actions are chosen from
        # observed crisis, news, needs, and world text; every turn records its evidence and motive.
        run_deadline=normal_start+args.seconds; turn=0
        reload_interval=min(300,max(20,args.seconds/2)) if args.mode=="dry" else 300
        next_reload=time.monotonic()+reload_interval
        if status["lanes"]["NORMAL_FRESH"].get("status")=="WARNING_OBSERVED":
            status["freshCrisisWarningObserved"]={"realSeconds":status["lanes"]["NORMAL_FRESH"].get("elapsedRealSeconds"),"worldStatus":status["lanes"]["NORMAL_FRESH"].get("warningClockText")}
        while time.monotonic()<run_deadline:
            turn+=1
            visible_agent_turn(page,run_dir,log,status,turn)
            if time.monotonic()>=next_reload:
                visible_save_reload(page,run_dir,log,status,label=f"periodic-save-reload-{status.get('periodicSaveReloads',0)+1}")
                next_reload=time.monotonic()+reload_interval
                if args.mode=="dry" and not status.get("dryContextActionValidated"):
                    require_world_surface(page)
                    page.get_by_role("button",name="選單").click()
                    menu=page.locator("dialog.pixel-window[open]"); menu.get_by_role("button",name="旅人筆記").click()
                    expect(page.locator("dialog.pixel-window[open]")).to_contain_text("等待不會自動恢復生命與體力")
                    status["dryContextModalPending"]=True
                    action(log,"NORMAL_FRESH","dry stage notes modal after periodic save/reload",page,visibleModal="旅人筆記",stateInjected=False)
            checkpoint(page,run_dir,status,log,cdp=cdp,reason="agent-turn")
            # Observe/act at one-day granularity using ordinary World Records controls only.
            if time.monotonic()<run_deadline: page.wait_for_timeout(1000)
        crisis_now=page.evaluate("() => JSON.parse(localStorage.getItem('oakvale-v1')||'{}').regionalCrisis")
        if crisis_now and crisis_now.get("phase") in ("aftermath","cooldown") and crisis_now.get("resolutionSummary"):
            visible_save_reload(page,run_dir,log,status,label="normal-arc-aftermath-save-reload")
            status["normalArcAftermathReload"]={"verified":True,"phase":crisis_now.get("phase"),"outcome":crisis_now.get("outcome")}
        normal_elapsed=time.monotonic()-normal_start
        status["normalDurationSeconds"]=round(normal_elapsed,2)
        status["lanes"]["NORMAL_FRESH"].update({"status":"COMPLETED_BUDGET","elapsedNormalSeconds":status["normalDurationSeconds"],
            "normalPhaseTrace":status.get("normalPhaseTrace",[]),"realArcActionCount":status.get("normalCrisisActionCount",0),
            "aftermathReload":status.get("normalArcAftermathReload")})
        checkpoint(page,run_dir,status,log,cdp=cdp,reason="final-normal",force=True)
        fixture_manifest_path = PHASE / "j-fixture-manifest.json"
        fixture_manifest = json.loads(fixture_manifest_path.read_text(encoding="utf-8"))
        if fixture_manifest.get("status") != "PASS" or fixture_manifest.get("head") != status["sourceBefore"]["head"]:
            raise RuntimeError("Current-source controlled fixture manifest is missing or does not match the frozen HEAD")
        status["fixtureManifest"] = {"path":str(fixture_manifest_path.relative_to(ROOT)),"sha256":__import__("hashlib").sha256(fixture_manifest_path.read_bytes()).hexdigest(),"sourceFingerprint":fixture_manifest.get("sourceFingerprint")}
        # This controlled lane is deliberately a separate context after the normal fresh-save run.
        controlled_cases(browser, run_dir, log, status, fixture_manifest)
        status["controlledFixturesExecuted"] = list(status["lanes"].keys())
        required_lanes=("CONTROLLED_WARNING_UI_FIXTURE","CONTROLLED_UI_FIXTURE","CONTROLLED_FOREST_CAMP_RAID","CONTROLLED_FOREST_CHIEF","CONTROLLED_UI_FIXTURE_KNOWN_AFTERMATH","LEGACY_UNKNOWN_FIXTURE")
        missing=[lane for lane in required_lanes if not status["lanes"].get(lane,{}).get("status","").startswith("PASS")]
        status["controlledLaneStatus"]="PASS_WITH_FIXTURES_SEPARATE" if not missing else "FAIL_MISSING_OR_FAILED_LANES"
        status["missingControlledLanes"]=missing
        phases=[entry.get("phase") for entry in status.get("normalPhaseTrace",[])]
        arc_phases=["warning","preparation","active","aftermath"]
        ordered=iter(phases); complete_arc=all(any(found==required for found in ordered) for required in arc_phases)
        has_real_action=status.get("normalCrisisActionCount",0)>0
        has_aftermath_reload=bool(status.get("normalArcAftermathReload",{}).get("verified"))
        status["normalArcAssessment"]={"phasesObserved":phases,"requiredOrderedPhases":arc_phases,"orderedPhasesObserved":complete_arc,
            "realUIActionObserved":has_real_action,"aftermathSaveReloadVerified":has_aftermath_reload,"complete":complete_arc and has_real_action and has_aftermath_reload,
            "normalFreshOnly":True,"controlledFixturesExcluded":True}
        run_minimum=0 if args.mode=="dry" else minimum
        duration_ok=normal_elapsed+0.5>=run_minimum
        status["normalDurationRequirement"]={"minimumSeconds":run_minimum,"actualSeconds":round(normal_elapsed,2),"passed":duration_ok}
        last_save_errors=status.get("saveLatencySamples",{})
        status["browserErrors"] = bool(status["pageErrors"] or status["consoleErrors"] or status["requestFailures"] or status["httpFailures"]
            or last_save_errors.get("storageErrors") or last_save_errors.get("unhandledRejections") or status.get("snapshotErrors"))
        errors=status["browserErrors"]
        if missing or not duration_ok or errors:
            status["status"]="FAILED_J_ACCEPTANCE"
        elif args.mode=="dry":
            dry_context_ok=bool(status.get("dryContextActionValidated",{}).get("verified"))
            reload_ok=status.get("periodicSaveReloads",0)>=1
            status["dryPolicyGate"]={"policyTurns":status.get("agentChoiceCount",0),"checkpointCount":len(status.get("checkpoints",[])),
                "periodicSaveReload":reload_ok,"modalClosedThenContextInteraction":dry_context_ok}
            status["status"]="PASS_DRY" if status["agentChoiceCount"]>0 and status["checkpoints"] and reload_ok and dry_context_ok else "FAILED_DRY_PATH_NOT_EXERCISED"
        elif complete_arc:
            status["status"]="PASS_J_BROWSER_NORMAL_ARC"
        else:
            status["status"]="PASS_STABILITY_WITH_NORMAL_ARC_UNREACHED"
    except BaseException as exc:
        error = exc; status["status"] = "FAILED"; status["error"] = f"{type(exc).__name__}: {exc}"; status["failureUTC"] = now_utc()
        if page is not None:
            try: snapshot(page, run_dir, "failure", status)
            except BaseException as shot_error: status["screenshotError"] = f"{type(shot_error).__name__}: {shot_error}"
    finally:
        for resource in (context, browser):
            if resource is not None:
                try: resource.close()
                except BaseException as exc: status.setdefault("cleanupErrors", []).append(str(exc))
        if playwright is not None:
            try: playwright.stop()
            except BaseException as exc: status.setdefault("cleanupErrors", []).append(str(exc))
        try:
            status["sourceAfter"] = provenance(ROOT, BUILD_PATH, [PHASE / "j_browser_launcher.py", DRIVER, SUPPORT, FIXTURE_GENERATOR])
            status["sourceStableDuringRun"] = status["sourceBefore"] == status["sourceAfter"]
            if not status["sourceStableDuringRun"]: status["status"] = "FAILED_PROVENANCE_CHANGED"
        except BaseException as exc: status["sourceAfterError"] = str(exc); status["status"] = "FAILED_PROVENANCE_CHECK"
        status["endUTC"] = now_utc(); status["durationSeconds"] = round((datetime.now(timezone.utc) - datetime.fromisoformat(status["startUTC"])).total_seconds(), 2)
        last_save_errors=status.get("saveLatencySamples",{})
        status["browserErrors"] = bool(status["pageErrors"] or status["consoleErrors"] or status["requestFailures"] or status["httpFailures"]
            or last_save_errors.get("storageErrors") or last_save_errors.get("unhandledRejections"))
        if status["browserErrors"] and status["status"].startswith("PASS"): status["status"] = "FAILED_BROWSER_ERRORS"
        try: publish_status(run_dir, status)
        except BaseException as exc: status["reportPublishError"] = str(exc)
        print(json.dumps(status, ensure_ascii=False, indent=2), flush=True)
    return 0 if status["status"].startswith("PASS") and status.get("sourceStableDuringRun") else 1


if __name__ == "__main__": raise SystemExit(main())
