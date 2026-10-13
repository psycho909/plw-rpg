import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile, copyFile, cp } from 'node:fs/promises'
import { join, resolve, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../../../../')
const own=join(root,'reports/v2/20261008-content-expansion/phase-07/d-evidence-retention-run')
const artifacts=join(own,'artifacts'), work=join(own,'work')
const sha=b=>createHash('sha256').update(b).digest('hex')
const tracked=['src','scripts','package.json','package-lock.json','tsconfig.json','vite.config.ts','reports/v2/20261008-content-expansion/phase-07/content-baseline.json']
async function hashTree(path,rel='') { let out={}; for(const ent of await readdir(path,{withFileTypes:true})){ const name=join(path,ent.name), key=join(rel,ent.name).replaceAll('\\','/'); if(ent.isDirectory()) Object.assign(out,await hashTree(name,key)); else if(ent.isFile()) out[key]=sha(await readFile(name)) } return out }
async function map(){let o={};for(const p of tracked){try{const s=await hashTree(join(root,p),p);Object.assign(o,s)}catch{}}return o}
function run(name,command,args,opts={}) { const stamp=()=>new Date().toISOString(); const started=stamp(); const r=spawnSync(command,args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,...opts}); const ended=stamp(); const result={name,command,args,cwd:root,startedUtc:started,endedUtc:ended,startedTaipei:new Date(started).toLocaleString('sv-SE',{timeZone:'Asia/Taipei',hour12:false}),endedTaipei:new Date(ended).toLocaleString('sv-SE',{timeZone:'Asia/Taipei',hour12:false}),exitCode:r.status,signal:r.signal,error:r.error?`${r.error.name}: ${r.error.message}`:null,stdout:r.stdout??'',stderr:r.stderr??''};return result }
async function save(name,r){await writeFile(join(artifacts,`${name}.stdout.txt`),r.stdout);await writeFile(join(artifacts,`${name}.stderr.txt`),r.stderr);await writeFile(join(artifacts,`${name}.result.json`),JSON.stringify({...r,stdout:undefined,stderr:undefined},null,2)+'\n')}
async function copyHashTree(source,dest){await cp(source,dest,{recursive:true});return hashTree(dest)}
await mkdir(artifacts,{recursive:true});await mkdir(work,{recursive:true})
const start={utc:new Date().toISOString(),head:run('head','git',['rev-parse','HEAD']).stdout.trim(),sources:await map(),fullWorktreeStatus:run('status','git',['status','--short']).stdout}
await writeFile(join(artifacts,'before.json'),JSON.stringify(start,null,2)+'\n')
const pubStart=(await readFile(join(root,'reports/v2/20261008-content-expansion/phase-07/playlog.jsonl'))).toString().trimEnd().split('\n').length
const old=run('old-source','git',['show','f026b6b4947d18aadc0f551c642c31750db5768c:scripts/validate_content_batch.mjs']); if(old.exitCode!==0) throw Error('git show failed')
const baseline=join(root,'reports/v2/20261008-content-expansion/phase-07/d-evidence-retention-run/legacy-validator.mjs'); await writeFile(baseline,old.stdout)
const validOriginal=join(root,'reports/v2/20261008-content-expansion/phase-07/b-run/minimal-valid-pack.json')
const valid=join(work,'minimal-valid-pack.json');await copyFile(validOriginal,valid)
const report=join(work,'report.md')
const oldBad=join(work,'old-malformed.json');await writeFile(oldBad,'{ malformed JSON')
const oldRun=run('A-old-cli-malformed','node',[relative(root,baseline),'--pack',relative(root,oldBad),'--report',relative(root,report)]);await save('A-old-cli-malformed',oldRun)
const oldEvidenceExists=await readFile(report).then(()=>true).catch(()=>false)
const oldRunsExists=await readdir(join(work,'.qa-runs')).then(x=>x.length>0).catch(()=>false)
const input=join(work,'minimal-valid-pack.json')
const runB=run('B-valid','node',['scripts/validate_content_batch.mjs','--pack',relative(root,input),'--report',relative(root,report)]);await save('B-valid',runB)
const bReport=(await readFile(report)).toString(); const bArchive=(await readFile(join(work,'playlog.jsonl'))).toString().trimEnd().split('\n').length
const bRuns=await readdir(join(work,'.qa-runs'));const bPack=await readFile(input)
const semantic=JSON.parse(bPack);semantic.monsters[0].stats.hp=0;await writeFile(input,JSON.stringify(semantic,null,2)+'\n')
const runC=run('C-semantic-negative','node',['scripts/validate_content_batch.mjs','--pack',relative(root,input),'--report',relative(root,report)]);await save('C-semantic-negative',runC)
const cReport=(await readFile(report)).toString(); const cArchive=(await readFile(join(work,'playlog.jsonl'))).toString().trimEnd().split('\n').length
const bad=join(work,'malformed.json');const badBytes=Buffer.from('{ malformed JSON');await writeFile(bad,badBytes)
const runD=run('D-malformed-new-cli','node',['scripts/validate_content_batch.mjs','--pack',relative(root,bad),'--report',relative(root,report)]);await save('D-malformed-new-cli',runD)
const savedReport=join(work,'saved-readable-report.md');await writeFile(savedReport,cReport)
const previousReport=join(work,'publisher-protected-report.md');await writeFile(previousReport,'PRIOR-READABLE-REPORT\n')
const shim=join(work,'shim');await mkdir(shim,{recursive:true});const py=join(shim,'python3');await writeFile(py,'#!/bin/sh\nprintf "CONTROLLED-PUBLISHER-SENTINEL\\n" >&2\nexit 23\n');const chmod=run('chmod-shim','chmod',['+x',py]);
const runE=run('E-controlled-publisher-failure','node',['scripts/validate_content_batch.mjs','--pack',relative(root,valid),'--report',relative(root,previousReport)],{env:{...process.env,PATH:`${shim}:${process.env.PATH??''}`}});await save('E-controlled-publisher-failure',runE)
const runDirs=await readdir(join(work,'.qa-runs')).catch(()=>[]);let manifests=[]
for(const d of runDirs){const dir=join(work,'.qa-runs',d);const m=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));const inputPath=join(dir,m.input.snapshot);let artifact={dir:relative(root,dir),manifestSha256:sha(await readFile(join(dir,'manifest.json'))),packSnapshotSha256:sha(await readFile(inputPath)),expectedInputSha256:m.input.sha256,sourceSnapshotHashes:{}};for(const [p,f] of Object.entries(m.sourceFiles))artifact.sourceSnapshotHashes[p]={declared:f.sha256,actual:sha(await readFile(join(dir,f.snapshot)))};manifests.push(artifact)}
const allRuns={A:{exit:oldRun.exitCode,noReadableReport:!oldEvidenceExists,noQARuns:!oldRunsExists},B:{exit:runB.exitCode,report:bReport,runDirs:bRuns},C:{exit:runC.exitCode,report:cReport,priorReportStillInArchive:bArchive<=cArchive},D:{exit:runD.exitCode,inputSha:sha(badBytes)},E:{exit:runE.exitCode,stderr:runE.stderr,reportPreserved:(await readFile(previousReport,'utf8'))==='PRIOR-READABLE-REPORT\n'},manifests}
await writeFile(join(artifacts,'scenarios.json'),JSON.stringify(allRuns,null,2)+'\n')
const end={utc:new Date().toISOString(),head:run('head-after','git',['rev-parse','HEAD']).stdout.trim(),sources:await map(),fullWorktreeStatus:run('status-after','git',['status','--short']).stdout,phasePlaylogLines:(await readFile(join(root,'reports/v2/20261008-content-expansion/phase-07/playlog.jsonl'),'utf8')).trimEnd().split('\n').length,expectedPlaylogAppends:pubStart}
await writeFile(join(artifacts,'after.json'),JSON.stringify(end,null,2)+'\n')
await writeFile(join(artifacts,'harness-files.sha256'),(await hashTree(artifacts)).constructor===Object?Object.entries(await hashTree(artifacts)).map(([p,h])=>`${h}  ${p}`).join('\n')+'\n':'')
