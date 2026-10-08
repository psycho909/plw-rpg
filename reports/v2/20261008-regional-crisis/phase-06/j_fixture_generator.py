#!/usr/bin/env python3
"""Generate current-source G CONTROLLED_UI_FIXTURE and LEGACY_UNKNOWN_FIXTURE saves."""
from __future__ import annotations
from datetime import datetime, timezone
import hashlib, json, subprocess, tempfile, sys, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
EXPECTED_HEAD = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
PRODUCER = 'g6-luna-med-phase6-j-browser-fixtures'

def sha(data: bytes): return hashlib.sha256(data).hexdigest()
def publish(path: Path, body: str):
    sys.path.insert(0,str(ROOT))
    from scripts.recorded_reports import write_recorded
    write_recorded(path,body,producer=PRODUCER)

def source_map(root: Path):
    return {p.relative_to(root).as_posix():sha(p.read_bytes()) for p in sorted((root/'src').rglob('*')) if p.is_file()}

def main():
    current_head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    if current_head != EXPECTED_HEAD: raise SystemExit(f'HEAD changed; expected {EXPECTED_HEAD}, got {current_head}')
    live_source=source_map(ROOT)
    with tempfile.TemporaryDirectory(prefix='plw-phase6-g-fixtures-') as td:
        root=Path(td)
        shutil.copytree(ROOT/'src',root/'src')
        for name in ('package.json','package-lock.json','vite.config.ts','tsconfig.json','index.html'): shutil.copy2(ROOT/name,root/name)
        (root/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
        current=source_map(root)
        if current != live_source: raise SystemExit('Temporary fixture source differs from current recursive src map')
        runner=root/'.phase6-g-fixture-runner.mjs'
        runner.write_text(r'''import { createServer } from 'vite'; import { resolve } from 'node:path'
const root=process.cwd(); const server=await createServer({configFile:resolve(root,'vite.config.ts'),root,server:{middlewareMode:true},appType:'custom'})
try {
 const {CONFIG}=await server.ssrLoadModule('/src/data/config.ts')
 const {createGame,player,simulate}=await server.ssrLoadModule('/src/engine/simulation.ts')
 const {emit}=await server.ssrLoadModule('/src/engine/events.ts')
 const {tryStartRegionalCrisis}=await server.ssrLoadModule('/src/engine/regionalCrisis.ts')
 const {generateItem}=await server.ssrLoadModule('/src/engine/itemGeneration.ts')
 const {availableCivilDefenseDefenders}=await server.ssrLoadModule('/src/engine/civilDefense.ts')
 const {contributeCrisisEquipment,contributeCrisisFood,contributeCrisisGold}=await server.ssrLoadModule('/src/engine/crisisContributions.ts')
 const {serialize,deserialize}=await server.ssrLoadModule('/src/services/saveService.ts')
 const DAY=CONFIG.minutesPerDay, seed=20261010, s=createGame(seed)
 if(CONFIG.saveVersion!==7 || s.saveVersion!==7) throw new Error(`Expected current V7 save, got ${CONFIG.saveVersion}/${s.saveVersion}`)
 s.threat.monsterPopulation=30; s.threat.threatLevel=2; s.threat.campLevel=2; s.settlement.safety=60; s.settlement.food=20
 for(const n of s.npcs){ n.job='guard'; n.age=Math.max(18,n.age); n.isAlive=true; n.injuredUntil=s.worldTime; n.equipment.weapon=null; n.equipment.armor=null; s.life.npcs[n.id].career='worker'; s.life.npcs[n.id].careerJob='guard' }
 const c=player(s); c.position={x:10,y:10}; c.currentRegion='village'; c.inventory.food=Math.max(c.inventory.food,10); c.gold=Math.max(c.gold,100)
 const rolls=[]; if(!tryStartRegionalCrisis(s,()=>{rolls.push(0);return 0})) throw new Error('Public trigger did not start crisis')
 const warningState=structuredClone(s); warningState.life.openingSeen=true; const warningSave=serialize(warningState,1000)
 if(deserialize(warningSave).state.regionalCrisis.phase!=='warning') throw new Error('Controlled warning save did not round trip')
 simulate(s,(CONFIG.regionalCrisis.warningDays+1)*DAY)
 if(s.regionalCrisis.phase!=='preparation') throw new Error('Canonical simulation did not enter preparation'); s.life.openingSeen=true
 const item=generateItem(s,{baseId:'moonFangSpear',level:5,material:'moonStone',bossSource:'wolfKing'}); s.reward.instances.push(item); s.reward.collection.bases.push(item.baseId); s.reward.collection.bosses.push('wolfKing'); s.reward.collection.seen.push('wolfKing')
 const def=availableCivilDefenseDefenders(s)[0]; if(!def) throw new Error('No public eligible defender')
 const prep=serialize(s,1001); if(deserialize(prep).state.regionalCrisis.phase!=='preparation') throw new Error('Preparation save did not round trip')
 const forest=structuredClone(s); const forestPlayer=player(forest); forestPlayer.position={x:5,y:4}; forestPlayer.currentRegion='forest'; forest.threat.bossAlive=true; forest.life.openingSeen=true
 const forestSave=serialize(forest,1002); if(deserialize(forestSave).state.characters.find(ch=>ch.id===forest.activeCharacterId).currentRegion!=='forest') throw new Error('Controlled forest fixture did not round trip')
 const aftermath=structuredClone(s); const activeEnd=aftermath.regionalCrisis.triggeredAt+(CONFIG.regionalCrisis.warningDays+CONFIG.regionalCrisis.preparationDays+CONFIG.regionalCrisis.activeDays)*DAY; simulate(aftermath,activeEnd+DAY-aftermath.worldTime); aftermath.life.openingSeen=true; if(aftermath.regionalCrisis.phase!=='aftermath' || !aftermath.regionalCrisis.resolutionSummary) throw new Error('Canonical simulation did not produce measured aftermath '+JSON.stringify({time:aftermath.worldTime,crisis:aftermath.regionalCrisis,combat:aftermath.combat,eventSequence:aftermath.eventSequence}))
 const known=serialize(aftermath,1003); if(deserialize(known).state.regionalCrisis.resolutionSummary===null) throw new Error('Known aftermath summary lost')
 const legacy=JSON.parse(known); legacy.regionalCrisis.resolutionSummary=null
 const unknown=JSON.stringify(legacy); if(deserialize(unknown).state.regionalCrisis.resolutionSummary!==null) throw new Error('Legacy unknown summary changed')
 const historyBase=structuredClone(s); const historyPlayer=player(historyBase); historyPlayer.position={x:5,y:4}; historyPlayer.currentRegion='forest'; historyBase.life.openingSeen=true
 for(let i=0;i<20000;i++) emit(historyBase,'qa.history-profile','world',`受控重大歷史紀錄 ${String(i+1).padStart(5,'0')}`,true)
 if(historyBase.history.length!==20000 || historyBase.history[0].id!==historyBase.eventSequence-19999) throw new Error('Engine-emitted history fixture is not exactly 20,000 bounded major events')
 const noF=serialize(historyBase,1004); if(deserialize(noF).state.history.length!==20000) throw new Error('No-F history fixture did not round trip')
 const fSensitive=structuredClone(historyBase); fSensitive.regionalCrisis.phase='active'; fSensitive.regionalCrisis.phaseStartedAt=fSensitive.worldTime; fSensitive.regionalCrisis.phaseEndsAt=fSensitive.worldTime+5
 const fSave=serialize(fSensitive,1005); if(deserialize(fSave).state.regionalCrisis.phase!=='active' || deserialize(fSave).state.history.length!==20000) throw new Error('F-sensitive history fixture did not round trip')
 process.stdout.write(JSON.stringify({saveVersion:CONFIG.saveVersion,seed,warningDays:CONFIG.regionalCrisis.warningDays,warning:{raw:warningSave},preparation:{raw:prep,crisisId:s.regionalCrisis.id,defenderId:def.id,gearId:item.instanceId},forestCampChief:{raw:forestSave},knownAftermath:{raw:known,outcome:aftermath.regionalCrisis.outcome,resolutionSummary:aftermath.regionalCrisis.resolutionSummary},legacyUnknown:{raw:unknown,resolutionSummary:null},history20kNoF:{raw:noF},history20kFSensitive:{raw:fSave},history20k:{count:historyBase.history.length,eventSequence:historyBase.eventSequence,method:'20,000 major events emitted with src/engine/events.ts emit() on a canonical serialized preparation state; the isolated F-sensitive clone is explicitly controlled by setting its active phase boundary five minutes ahead; no-F baseline shares the exact pre-action state/history/RNG.'},method:'CONTROLLED fixture generation from current source; warning fixture captured immediately after public crisis trigger; controlled eligibility fields explicit; crisis trigger and preparation progression use public trigger + canonical simulate; gear through current item generation; known aftermath and measured resolution use canonical simulate; forest/boss flags and position are labeled controlled; saves through current serializer and deserializer.'}))
} finally { await server.close() }
''',encoding='utf-8')
        run=subprocess.run(['node',str(runner)],cwd=root,text=True,capture_output=True)
        lines=[line for line in run.stdout.splitlines() if line.lstrip().startswith('{')]
        if run.returncode or not lines:
            payload={'status':'FAILED','head':current_head,'sourceSha256':current,'stdout':run.stdout,'stderr':run.stderr,'exitCode':run.returncode,'generatedAtUTC':datetime.now(timezone.utc).isoformat()}
            publish(OUT/'j-fixture-generation-failure.json',json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
            raise SystemExit('Current-source fixture generation failed; recorded raw failure.')
        data=json.loads(lines[-1]); specs=[('warning','CONTROLLED_WARNING_UI_FIXTURE'),('preparation','CONTROLLED_UI_FIXTURE'),('forestCampChief','CONTROLLED_FOREST_CAMP_CHIEF'),('knownAftermath','CONTROLLED_UI_FIXTURE_KNOWN_AFTERMATH'),('legacyUnknown','LEGACY_UNKNOWN_FIXTURE'),('history20kNoF','HISTORY_20K_NO_F'),('history20kFSensitive','HISTORY_20K_F_SENSITIVE')]
        files={}
        for key,label in specs:
            path=OUT/f'j-fixture-{key}.json'; raw=data[key].pop('raw').encode(); publish(path,raw.decode()); files[label]={'path':path.name,'sha256':sha(raw),'bytes':len(raw),'lane':label}
        manifest={'status':'PASS','head':current_head,'sourceSha256':current,'sourceFingerprint':sha(json.dumps(current,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()),'workspaceSourceFingerprint':sha(json.dumps(current,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()),'generatorSha256':sha(Path(__file__).read_bytes()),'runtime':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'exitCode':run.returncode,'stdoutSha256':sha(run.stdout.encode()),'stderrSha256':sha(run.stderr.encode())},'method':data['method'],'saveVersion':data['saveVersion'],'fixtures':files,'audit':'Every fixture is labeled controlled; fixture state is never loaded into NORMAL_FRESH. Save payloads serialized and deserialized by frozen current source.'}
        publish(OUT/'j-fixture-manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(manifest,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
