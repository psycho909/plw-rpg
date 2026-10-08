"""Independent fresh-save normal UI recorder for a same-ID regional-crisis arc.

Reads the live save for evidence and policy observation; all state changes use visible UI.
It never injects fixtures, writes localStorage, or calls engine/debug APIs.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
import zlib
import base64

from playwright.sync_api import sync_playwright, expect
from j_browser_support import append_jsonl, attach_early_capture, now_utc, provenance, save_latency_sample, validate_build, verify_http_dist


def project_root(script: Path) -> Path:
    for candidate in script.resolve().parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir(): return candidate
    raise RuntimeError(f"Cannot find project root above {script}")

ROOT = project_root(Path(__file__))
PHASE = ROOT / "reports/v2/20261008-regional-crisis/phase-06"
BUILD = Path(os.environ.get("PLW_BUILD_STATUS", PHASE / "j-build-status.json"))
OUT_ROOT = PHASE / "j-normal-arc-runs"
OWNED = [Path(__file__), PHASE / "j_browser_support.py"]
REQUIRED = ("warning", "preparation", "active", "aftermath")


def server_code() -> str:
    return r'''import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  if self.path.split('?',1)[0] == '/favicon.ico': self.send_response(204); self.end_headers()
  else: super().do_GET()
 def do_HEAD(self):
  if self.path.split('?',1)[0] == '/favicon.ico': self.send_response(204); self.end_headers()
  else: super().do_HEAD()
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),partial(Handler,directory=sys.argv[2])).serve_forever()
'''


def read_save(page):
    raw = page.evaluate("() => localStorage.getItem('oakvale-v1')")
    if not raw: raise AssertionError("Normal fresh save is absent from browser storage")
    return raw, json.loads(raw)


def packed_full_save(raw: str) -> dict:
    data = raw.encode("utf-8")
    return {"encoding":"zlib+base64", "uncompressedBytes":len(data), "sha256":hashlib.sha256(data).hexdigest(),
            "data":base64.b64encode(zlib.compress(data,level=6)).decode("ascii")}


def persist_status(path: Path, status: dict) -> None:
    temporary=path.with_suffix(".tmp")
    temporary.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    temporary.replace(path)


def state_fields(save: dict) -> dict:
    crisis=save.get("regionalCrisis") or {}
    return {"worldSeed":save.get("worldSeed"), "worldTime":save.get("worldTime"), "activeCharacterId":save.get("activeCharacterId"),
            "isAlive":next((x.get("isAlive") for x in save.get("characters",[]) if x.get("id")==save.get("activeCharacterId")),None),
            "currentRegion":next((x.get("currentRegion") for x in save.get("characters",[]) if x.get("id")==save.get("activeCharacterId")),None),
            "crisisId":crisis.get("id"), "crisisSequence":crisis.get("sequence"), "phase":crisis.get("phase"),
            "phaseStartedAt":crisis.get("phaseStartedAt"), "phaseEndsAt":crisis.get("phaseEndsAt"),
            "outcome":crisis.get("outcome"), "resolutionSummary":crisis.get("resolutionSummary"),
            "crisisContributions":crisis.get("contributions"), "crisisAdventure":crisis.get("adventure"), "chiefOutcome":crisis.get("chiefOutcome"),
            "threat":save.get("threat"), "settlement":{"food":(save.get("settlement") or {}).get("food"),
            "safety":(save.get("settlement") or {}).get("safety")}, "historyCount":len(save.get("history",[])),
            "historyCrisisEvents":[event for event in save.get("history",[]) if str(event.get("type","" )).startswith("regional-crisis.")]}


def record_snapshot(run_dir: Path, log_path: Path, page, *, kind: str, turn: int, action: str, reason: str):
    raw, save=read_save(page); fields=state_fields(save)
    row={"atUTC":now_utc(),"kind":kind,"turn":turn,"action":action,"reason":reason,"uiURL":page.url,
         "visibleClock":page.locator(".world-clock").inner_text() if page.locator(".world-clock").count() else None,
         "visibleCaption":page.locator(".world-caption").inner_text() if page.locator(".world-caption").count() else None,
         "fullSave":packed_full_save(raw),"state":fields,"normalFresh":True,"fixtureInjected":False,"directMutation":False}
    append_jsonl(log_path,row)
    return raw,save,fields


def open_menu_choice(page, label: str):
    if page.locator("dialog.pixel-window[open]").count(): page.keyboard.press("Escape")
    page.get_by_role("button",name="選單").click()
    menu=page.locator("dialog.pixel-window[open]")
    menu.get_by_role("button",name=label).click()
    return page.locator("dialog.pixel-window[open]")


def visible_wait(page, button_name: str):
    notes=open_menu_choice(page,"旅人筆記")
    expect(notes).to_contain_text("等待不會自動恢復生命與體力")
    wait=notes.get_by_role("button",name=button_name)
    expect(wait).to_be_enabled(timeout=5000)
    wait.click()
    return button_name


def visible_successor(page, save_before: dict):
    """Continue a deceased protagonist through the real, non-dismissible UI."""
    dialog=page.locator("dialog.pixel-window[open]")
    expect(dialog).to_contain_text("選一位居民，接續旅程")
    continue_button=dialog.get_by_role("button",name="繼續時間")
    if continue_button.count() and continue_button.is_visible():
        pause_verified=True
    else:
        pause=dialog.get_by_role("button",name="暫停時間")
        expect(pause).to_be_visible(timeout=5000)
        pause.click()
        expect(page.locator("dialog.pixel-window[open]").get_by_role("button",name="繼續時間")).to_be_visible()
        pause_verified=True
    buttons=dialog.locator(".successor-list button")
    adults=[]
    for index in range(buttons.count()):
        candidate=buttons.nth(index); label=candidate.inner_text()
        match=re.search(r"·\s*(\d+)\s*歲",label)
        if match and int(match.group(1))>=18: adults.append((candidate,label,int(match.group(1))))
    if not adults:
        wait=dialog.get_by_role("button",name=re.compile("等待新居民抵達"))
        if not wait.count() or not wait.is_enabled():
            raise AssertionError("Dead character dialog has neither a visible adult successor nor its ordinary wait option")
        before_world_time=save_before.get("worldTime")
        wait_label=wait.inner_text()
        wait.click()
        expect(page.locator("dialog.pixel-window[open]")).to_have_count(0,timeout=8000)
        raw_after,after=read_save(page)
        after_crisis=after.get("regionalCrisis") or {}
        before_crisis=save_before.get("regionalCrisis") or {}
        verified=(after.get("worldSeed")==save_before.get("worldSeed")
            and after_crisis.get("id")==before_crisis.get("id")
            and after.get("worldTime",0)>before_world_time
            and after.get("activeCharacterId")==save_before.get("activeCharacterId"))
        result={"verified":verified,"waitedForNewResident":True,"visibleLabel":wait_label,
            "worldTimeBefore":before_world_time,"worldTimeAfter":after.get("worldTime"),
            "crisisIdPreserved":after_crisis.get("id")==before_crisis.get("id"),
            "worldSeedPreserved":after.get("worldSeed")==save_before.get("worldSeed"),
            "activeCharacterUnchanged":after.get("activeCharacterId")==save_before.get("activeCharacterId"),
            "afterSaveSha256":hashlib.sha256(raw_after.encode()).hexdigest()}
        if not verified: raise AssertionError(f"Ordinary wait for a resident changed the current world unexpectedly: {result}")
        return "visible_wait_for_existing_world_resident",result
    button,label,age=adults[0]
    selected_id=next((npc.get("id") for npc in save_before.get("npcs",[])
        if npc.get("name") and npc.get("name") in label and npc.get("age")==age),None)
    if not selected_id: raise AssertionError(f"Visible adult successor does not match an existing NPC: {label}")
    before_world={key:save_before.get(key) for key in ("worldSeed","rngState","worldTime","regionalCrisis","threat","settlement","tiles","regions")}
    before_npcs=save_before.get("npcs",[]); before_characters=save_before.get("characters",[]); before_history=save_before.get("history",[])
    button.click()
    expect(page.locator("dialog.pixel-window[open]")).to_have_count(0,timeout=8000)
    page.wait_for_function("id => { const s=JSON.parse(localStorage.getItem('oakvale-v1')||'{}'); return s.activeCharacterId===id; }",arg=selected_id,timeout=10000)
    raw_after,after=read_save(page)
    mismatches={key:{"before":before_world[key],"after":after.get(key)} for key in before_world if before_world[key]!=after.get(key)}
    expected_npcs=[npc for npc in before_npcs if npc.get("id")!=selected_id]
    roster_preserved=expected_npcs==after.get("npcs",[])
    selected=next((actor for actor in after.get("characters",[]) if actor.get("id")==selected_id),None)
    dead=next((actor for actor in after.get("characters",[]) if actor.get("id")==save_before.get("activeCharacterId")),None)
    character_roster_preserved=bool(selected) and after.get("characters",[])[:-1]==before_characters and after.get("characters",[])[-1].get("id")==selected_id
    appended_history=after.get("history",[])[len(before_history):]
    successor_event=after.get("eventSequence",0)-save_before.get("eventSequence",0)==len(appended_history) and any(
        event.get("type")=="character.successor" and "接續了旅程" in event.get("message","") for event in appended_history)
    result={"verified":pause_verified and not mismatches and roster_preserved and character_roster_preserved and bool(selected)
        and selected.get("isAlive") is True and bool(dead) and dead.get("isAlive") is False and successor_event,
        "selectedNpcId":selected_id,"selectedVisibleLabel":label,"selectedAge":age,"pauseControlVerified":pause_verified,"worldMismatches":mismatches,
        "preservedWorldFields":list(before_world),"unrelatedNpcRosterPreserved":roster_preserved,
        "characterRosterPreserved":character_roster_preserved,"deadCharacterRetained":bool(dead and dead.get("isAlive") is False),
        "successorEventObserved":successor_event,"activeCharacterIdAfter":after.get("activeCharacterId"),
        "beforeSaveSha256":hashlib.sha256(json.dumps(save_before,ensure_ascii=False,separators=(",",":")).encode()).hexdigest(),
        "afterSaveSha256":hashlib.sha256(raw_after.encode()).hexdigest()}
    if not result["verified"]: raise AssertionError(f"Visible successor broke same-world continuity: {result}")
    return "visible_choose_existing_adult_successor",result


def visible_crisis_contribution(page, save: dict):
    report=open_menu_choice(page,"地方消息與委託")
    report=page.locator("[data-crisis-report]")
    expect(report).to_be_visible(timeout=5000)
    available=[]
    for label in ("支援食物","支援後勤"):
        button=report.get_by_role("button",name=re.compile(label))
        if button.count() and button.first.is_enabled(): available.append((label,button.first))
    gear=report.locator(".crisis-gear-row button").filter(has_text="選擇交付")
    if gear.count() and gear.first.is_enabled(): available.append(("選擇交付裝備",gear.first))
    if available:
        label,button=available[0]
        before=state_fields(save)
        button.click()
        if label=="選擇交付裝備":
            confirm=report.locator("[data-crisis-gear-confirm]")
            if confirm.count() and confirm.is_visible(): confirm.click()
            label="貢獻裝備"
        return "crisis_contribution_"+label,before
    return "inspect_crisis_report_no_available_support",state_fields(save)


def visible_rest(page):
    if page.locator("dialog.pixel-window[open]").count(): page.keyboard.press("Escape")
    page.get_by_role("button",name="選單").click()
    menu=page.locator("dialog.pixel-window[open]")
    menu.get_by_role("button",name="地圖與世界").click()
    world=page.locator("dialog.pixel-window[open]")
    paths=world.get_by_role("button",name="前往家")
    if paths.count() and paths.is_enabled():
        paths.click()
        page.wait_for_timeout(300)
    _,routed=read_save(page)
    routed_actor=next((x for x in routed.get("characters",[]) if x.get("id")==routed.get("activeCharacterId")),{})
    if routed_actor.get("currentRegion")!="village":
        return "visible_rest_unavailable_at_current_place"
    if page.locator("dialog.pixel-window[open]").count(): page.keyboard.press("Escape")
    if page.locator(".world-caption").inner_text().find("聚落")<0:
        # If the world caption uses coordinates, the place interaction still decides whether the house is nearby.
        pass
    page.locator(".context-action").click()
    place=page.locator("dialog.pixel-window[open]")
    rest=place.get_by_role("button",name=re.compile("休息 · 1 小時"))
    if not rest.count() or not rest.is_enabled():
        page.keyboard.press("Escape")
        return "visible_rest_unavailable_at_current_place"
    rest.click()
    return "visible_rest_one_hour"


def visible_combat_turn(page, save: dict):
    dialogs=page.locator("dialog.pixel-window[open]")
    if not dialogs.count(): page.get_by_role("button",name="返回戰鬥").click()
    battle=page.locator("dialog.pixel-window[open]")
    expect(battle).to_contain_text("回合制戰鬥")
    actor=next((x for x in save.get("characters",[]) if x.get("id")==save.get("activeCharacterId")),{})
    hp=actor.get("hp",100); potion=actor.get("inventory",{}).get("potion",0)
    if hp<35:
        battle.get_by_role("button",name="逃跑").click(); return "visible_combat_flee"
    if hp<50 and potion: battle.get_by_role("button",name="使用藥水").click(); return "visible_combat_potion"
    battle.get_by_role("button",name="攻擊").click(); return "visible_combat_attack"


def visible_aftermath_reload(page, run_dir: Path, log_path: Path, turn: int, crisis_id: str, world_seed):
    before_raw,before,before_fields=record_snapshot(run_dir,log_path,page,kind="aftermath-before-explicit-save",turn=turn,
        action="aftermath_save_reload",reason="capture full resolved aftermath before ordinary visible save")
    if before_fields["crisisId"]!=crisis_id or before_fields["phase"]!="aftermath":
        raise AssertionError("Expected same-ID aftermath before save/reload")
    if before_fields["worldSeed"]!=world_seed: raise AssertionError("worldSeed changed before aftermath reload")
    if page.locator("dialog.pixel-window[open]").count(): page.keyboard.press("Escape")
    page.get_by_role("button",name="選單").click()
    menu=page.locator("dialog.pixel-window[open]")
    menu.get_by_role("button",name="儲存世界").click()
    expect(menu).to_contain_text("世界已儲存")
    page.keyboard.press("Escape")
    saved_raw,saved=read_save(page)
    append_jsonl(log_path,{"atUTC":now_utc(),"kind":"full-save-before-reload","turn":turn,"crisisId":crisis_id,"worldSeed":world_seed,
        "fullSave":packed_full_save(saved_raw),"state":state_fields(saved),"normalFresh":True,"fixtureInjected":False})
    page.reload(wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
    restored_raw,restored,restored_fields=record_snapshot(run_dir,log_path,page,kind="aftermath-after-reload",turn=turn,
        action="aftermath_save_reload",reason="full save restored after ordinary visible save and browser reload")
    # Save writer metadata may be normalized during reload; compare the complete canonical parsed state.
    mismatches={key:{"before":saved.get(key),"after":restored.get(key)} for key in saved.keys()|restored.keys() if saved.get(key)!=restored.get(key)}
    verified=not mismatches and restored_fields["crisisId"]==crisis_id and restored_fields["phase"]=="aftermath" and restored_fields["worldSeed"]==world_seed
    result={"verified":verified,"crisisId":crisis_id,"worldSeed":world_seed,"fullStateExact":not mismatches,
        "mismatches":mismatches,"beforeSha256":hashlib.sha256(saved_raw.encode()).hexdigest(),"afterSha256":hashlib.sha256(restored_raw.encode()).hexdigest(),
        "beforePhase":state_fields(saved)["phase"],"afterPhase":restored_fields["phase"]}
    append_jsonl(run_dir/"aftermath-save-reload.jsonl",{"atUTC":now_utc(),**result})
    if not verified: raise AssertionError(f"Same-ID aftermath full-save reload mismatch: {mismatches}")
    return result


def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode",choices=("dry","arc"),default="dry")
    parser.add_argument("--max-days",type=int)
    parser.add_argument("--max-seconds",type=int)
    args=parser.parse_args()
    if args.mode=="dry":
        max_days=args.max_days or 1; max_seconds=args.max_seconds or 120
    else:
        max_days=args.max_days or 600; max_seconds=args.max_seconds or 900
    if max_days<1 or max_seconds<10: parser.error("max-days must be positive; max-seconds at least 10")
    build=validate_build(ROOT,BUILD)
    OUT_ROOT.mkdir(parents=True,exist_ok=True)
    run_id=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")+f"-pid{os.getpid()}"
    run_dir=OUT_ROOT/run_id; run_dir.mkdir()
    before=provenance(ROOT,BUILD,OWNED)
    status={"status":"IN_PROGRESS","runId":run_id,"mode":args.mode,"head":before["head"],"sourceFingerprint":before["sourceFingerprint"],
        "buildStatusSha256":before["buildStatusSha256"],"distFingerprint":before["distFingerprint"],"ownedFilesSha256":before["qaFilesSha256"],
        "maxDays":max_days,"maxSeconds":max_seconds,"startUTC":now_utc(),"normalFresh":True,"fixtureInjected":False,"directMutation":False,
        "worldSeed":None,"crisisId":None,"policyTurns":0,"crisisActions":[],"pendingChiefChallenge":None,"phaseSequence":[],
        "errors":{"page":[],"console":[],"request":[],"http":[]}}
    (run_dir/"run-status.json").write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n")
    log_path=run_dir/"full-save-policy-trace.jsonl"; trace_path=run_dir/"supervisor.jsonl"
    server_log=(run_dir/"server.log").open("wb"); server=None; playwright=browser=context=page=None; error=None; arc_reload=None
    try:
        with socket.socket() as sock: sock.bind(("127.0.0.1",0)); port=sock.getsockname()[1]
        server=subprocess.Popen([sys.executable,"-c",server_code(),str(port),str((ROOT/"dist").resolve())],cwd=ROOT,stdout=server_log,stderr=subprocess.STDOUT)
        url=f"http://127.0.0.1:{port}"; status["url"]=url
        deadline=time.monotonic()+15
        while True:
            try: status["servedAssets"]=verify_http_dist(ROOT,url,build); break
            except Exception:
                if time.monotonic()>=deadline: raise
                time.sleep(.2)
        playwright=sync_playwright().start(); browser=playwright.chromium.launch(executable_path="/usr/bin/chromium",headless=True,args=["--no-sandbox"])
        context=browser.new_context(viewport={"width":1280,"height":900},reduced_motion="reduce")
        page=context.new_page()
        page.on("pageerror",lambda e:status["errors"]["page"].append(str(e)))
        page.on("console",lambda m:status["errors"]["console"].append(m.text) if m.type=="error" else None)
        page.on("requestfailed",lambda r:status["errors"]["request"].append({"url":r.url,"error":r.failure}))
        page.on("response",lambda r:status["errors"]["http"].append({"url":r.url,"status":r.status}) if r.status>=400 else None)
        attach_early_capture(page)
        page.goto(url,wait_until="domcontentloaded")
        opening=page.locator("dialog.pixel-window[open]"); expect(opening).to_contain_text("在陌生的天空下")
        opening.get_by_role("button",name="起身").click(); page.locator(".world-map").wait_for(timeout=15000)
        if page.get_by_role("button",name="暫停").count(): page.get_by_role("button",name="暫停").click()
        status["normalStartUTC"]=now_utc(); start_monotonic=time.monotonic()
        raw,save,fields=record_snapshot(run_dir,log_path,page,kind="fresh-start",turn=0,action="visible_opening_start",reason="fresh run created from ordinary visible opening action")
        status["worldSeed"]=fields["worldSeed"]
        append_jsonl(trace_path,{"atUTC":now_utc(),"event":"fresh-start","worldSeed":fields["worldSeed"],"worldTime":fields["worldTime"],"normalFresh":True})
        waited_days=0; turn=0; same_id=None; action_count=0
        while time.monotonic()-start_monotonic<max_seconds and waited_days<max_days:
            turn+=1; status["policyTurns"]=turn
            raw_before,save_before,before_fields=record_snapshot(run_dir,log_path,page,kind="policy-before",turn=turn,action="observe",reason="read full current save and visible world before selecting an action")
            crisis=save_before.get("regionalCrisis") or {}; phase=crisis.get("phase","dormant"); cid=crisis.get("id")
            if phase!="dormant":
                if not cid: raise AssertionError(f"Non-dormant crisis has no identity at turn {turn}")
                if same_id is None: same_id=cid; status["crisisId"]=cid; status["crisisStartedAtWorldTime"]=save_before.get("worldTime")
                elif cid!=same_id: raise AssertionError(f"Crisis ID changed inside observed arc: {same_id} -> {cid}")
            phase_row={"atUTC":now_utc(),"turn":turn,"worldSeed":fields["worldSeed"],"crisisId":cid,"phase":phase,
                "worldTime":save_before.get("worldTime"),"outcome":crisis.get("outcome"),"normalFresh":True}
            status["phaseSequence"].append(phase_row); append_jsonl(trace_path,phase_row)
            action_name=""; reason=""; successor_result=None
            active_actor=next((actor for actor in save_before.get("characters",[]) if actor.get("id")==save_before.get("activeCharacterId")),{})
            if active_actor.get("isAlive") is False:
                action_name,successor_result=visible_successor(page,save_before)
                reason="the visible non-dismissible successor dialog showed an existing adult; selected it and verified world seed/RNG/time and unrelated residents remained unchanged"
            elif save_before.get("combat"):
                action_name=visible_combat_turn(page,save_before); reason="choose a visible combat response from current health/inventory and active encounter"
            elif active_actor.get("hp",100)<55 or active_actor.get("stamina",100)<30:
                action_name=visible_rest(page)
                reason=f"health or stamina was low (HP {active_actor.get('hp')}, stamina {active_actor.get('stamina')}); use ordinary map travel and the visible one-hour rest when available"
                if action_name=="visible_rest_unavailable_at_current_place":
                    action_name=visible_wait(page,"等待 1 日")
                    reason="the ordinary one-hour rest was not available at the current place; advance one legal visible day"
                    waited_days+=1
            elif phase in ("warning","preparation"):
                action_name,_=visible_crisis_contribution(page,save_before); reason="inspect current visible shortages and contribute the UI-calculated feasible amount from real inventory or gold"
                if action_name=="inspect_crisis_report_no_available_support":
                    action_name=visible_wait(page,"等待 1 日")
                    reason="visible crisis needs offered no available support; use the legal one-day UI wait to observe the next phase"
                    waited_days+=1
            elif phase=="active":
                action_name=visible_wait(page,"等待 1 日")
                reason="after recording any real visible preparation contribution, advance one ordinary day and observe the crisis outcome; this Life-oriented arc does not initiate combat"
                waited_days+=1
            elif phase=="aftermath":
                arc_reload=visible_aftermath_reload(page,run_dir,log_path,turn,same_id,fields["worldSeed"])
                status["aftermathSaveReload"]=arc_reload
                action_name="aftermath_save_reload"; reason="save and reload visible normal world; verify complete parsed save and same crisis id/phase/worldSeed"
            elif phase in ("resolution","cooldown"):
                action_name="observe_post_resolution"; reason="record canonical post-resolution phase and continue legal daily UI time"
            elif phase=="dormant":
                # One legal day at a time so a naturally triggered warning cannot be skipped.
                action_name=visible_wait(page,"等待 1 日"); reason="advance exactly one ordinary game day while observing dormant-world progression"
                waited_days+=1
            else: raise AssertionError(f"Unknown crisis phase from saved world: {phase}")
            action_count+=1 if action_name.startswith("visible_combat_") else 0
            raw_after,save_after,after_fields=record_snapshot(run_dir,log_path,page,kind="policy-after",turn=turn,action=action_name,reason=reason)
            after_crisis=save_after.get("regionalCrisis") or {}; after_phase=after_crisis.get("phase","dormant"); after_id=after_crisis.get("id")
            if same_id is not None and after_phase!="dormant" and after_id!=same_id: raise AssertionError(f"After action {action_name}, crisis identity changed {same_id} -> {after_id}")
            verified_effect=None; result_flag={"verified":False,"effect":None}
            if action_name=="visible_choose_existing_adult_successor":
                verified_effect="visible adult successor selected; world seed/RNG/time, crisis and resident roster preserved"
                result_flag={"verified":bool(successor_result and successor_result.get("verified")),"effect":verified_effect,
                    "scope":"character continuity only; this is not a crisis contribution","continuity":successor_result}
            elif action_name.startswith("crisis_contribution_"):
                before_ledger=(save_before.get("regionalCrisis") or {}).get("contributions")
                after_ledger=after_crisis.get("contributions")
                if before_ledger==after_ledger: raise AssertionError(f"Visible crisis contribution click did not change its ledger: {action_name}")
                verified_effect="regionalCrisis.contributions changed"
                result_flag={"verified":True,"effect":verified_effect,"beforeLedger":before_ledger,"afterLedger":after_ledger}
            if verified_effect:
                status["crisisActions"].append({"worldTime":save_before.get("worldTime"),"crisisId":cid,"action":action_name,"verifiedEffect":verified_effect})
                action_count+=1
            row={"atUTC":now_utc(),"turn":turn,"worldSeed":fields["worldSeed"],"crisisIdBefore":cid,"phaseBefore":phase,
                "worldTimeBefore":save_before.get("worldTime"),"action":action_name,"reason":reason,"crisisIdAfter":after_id,
                "phaseAfter":after_phase,"worldTimeAfter":save_after.get("worldTime"),"normalFresh":True,"fixtureInjected":False,
                "directMutation":False,"fullSaveBeforeSha256":hashlib.sha256(raw_before.encode()).hexdigest(),
                "fullSaveAfterSha256":hashlib.sha256(raw_after.encode()).hexdigest(),"resultFlag":result_flag}
            append_jsonl(run_dir/"actions.jsonl",row)
            append_jsonl(trace_path,{"atUTC":now_utc(),"event":"turn-complete","turn":turn,"action":action_name,"phaseBefore":phase,
                "phaseAfter":after_phase,"crisisId":after_id,"worldTime":after_fields["worldTime"],"crisisActions":len(status["crisisActions"])})
            persist_status(run_dir/"run-status.json",status)
            if arc_reload and arc_reload.get("verified") and all(any(x.get("phase")==p for x in status["phaseSequence"]) for p in REQUIRED): break
            if args.mode=="dry" and waited_days>=max_days: break
            # Persist a compact supervisor snapshot after every legal UI action.
            append_jsonl(trace_path,{"atUTC":now_utc(),"event":"supervisor","turn":turn,"elapsedSeconds":round(time.monotonic()-start_monotonic,2),
                "waitedDays":waited_days,"pageErrors":len(status["errors"]["page"]),"consoleErrors":len(status["errors"]["console"])})
        phases=[x.get("phase") for x in status["phaseSequence"]]
        ordered=iter(phases); ordered_phases=all(any(x==required for x in ordered) for required in REQUIRED)
        same_id_by_trace=bool(status.get("crisisId")) and all(x.get("crisisId")==status.get("crisisId") for x in status["phaseSequence"] if x.get("phase") in REQUIRED)
        status["normalArcAssessment"]={"requiredOrderedPhases":list(REQUIRED),"orderedPhasesObserved":ordered_phases,
            "observedPhaseSequence":phases,"sameCrisisId":same_id_by_trace,"crisisActions":status["crisisActions"],
            "verifiedRealCrisisAction":any(x.get("verifiedEffect") for x in status["crisisActions"]),
            "aftermathFullSaveReload":status.get("aftermathSaveReload"),"worldSeed":status["worldSeed"],
            "complete":ordered_phases and same_id_by_trace and any(x.get("verifiedEffect") for x in status["crisisActions"])
                and bool(status.get("aftermathSaveReload",{}).get("verified"))}
        if args.mode=="dry": status["status"]="PASS_DRY" if not any(status["errors"].values()) and waited_days>=1 else "FAILED_DRY"
        elif any(status["errors"].values()): status["status"]="FAILED_BROWSER_ERRORS"
        elif status["normalArcAssessment"]["complete"]: status["status"]="PASS_NORMAL_FRESH_ARC_SAME_ID"
        else: status["status"]="INCOMPLETE_NORMAL_ARC"
    except BaseException as exc:
        error=f"{type(exc).__name__}: {exc}"; status["status"]="FAILED"; status["error"]=error; status["failureUTC"]=now_utc()
        if page is not None:
            try: page.screenshot(path=str(run_dir/"failure.png"),full_page=True)
            except Exception: pass
    finally:
        status["endUTC"]=now_utc(); status["durationSeconds"]=round((datetime.now(timezone.utc)-datetime.fromisoformat(status["startUTC"])).total_seconds(),2)
        status["saveLatency"]=save_latency_sample(page) if page else {}
        if context:
            try: context.close()
            except Exception: pass
        if browser:
            try: browser.close()
            except Exception: pass
        if playwright:
            try: playwright.stop()
            except Exception: pass
        if server:
            server.terminate()
            try: status["serverExitCode"]=server.wait(timeout=5)
            except subprocess.TimeoutExpired: server.kill(); status["serverExitCode"]=server.wait(timeout=5)
        server_log.close()
        try:
            after=provenance(ROOT,BUILD,OWNED); status["sourceAfter"]=after; status["sourceStableDuringRun"]=before==after
            if not status["sourceStableDuringRun"]: status["status"]="FAILED_PROVENANCE_CHANGED"
        except BaseException as exc: status["provenanceError"]=str(exc); status["status"]="FAILED_PROVENANCE_CHECK"
        status["error"] = error
        (run_dir/"run-status.json").write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n")
        print(json.dumps({"runId":run_id,"status":status.get("status"),"artifact":str(run_dir),"durationSeconds":status.get("durationSeconds"),
            "normalArcAssessment":status.get("normalArcAssessment"),"error":status.get("error")},ensure_ascii=False,indent=2))
    return 0 if status.get("status") in ("PASS_DRY","PASS_NORMAL_FRESH_ARC_SAME_ID") else 1

if __name__=="__main__": raise SystemExit(main())
