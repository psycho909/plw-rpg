from pathlib import Path
import subprocess, sys, os, json, hashlib
from datetime import datetime, timezone
root=Path(__file__).resolve().parents[4]
out=Path(__file__).resolve().parent
sys.path.insert(0,str(root))
from scripts.recorded_reports import write_recorded
start=datetime.now(timezone.utc).isoformat()
env=dict(os.environ);env['PLW_V2_URL']='http://127.0.0.1:5201';env['PLW_NATIVE_V1']=str(root/'reports/v2/20261004-life-emergence/fixtures/native-v1.json')
r=subprocess.run([sys.executable,str(out/'verify_browser.py')],cwd=root,env=env,text=True,capture_output=True)
write_recorded(out/'browser-stdout.txt',r.stdout,producer='root-baseline-browser')
write_recorded(out/'browser-stderr.txt',r.stderr,producer='root-baseline-browser')
write_recorded(out/'browser-status.json',json.dumps({'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'startUTC':start,'endUTC':datetime.now(timezone.utc).isoformat(),'exitCode':r.returncode,'url':'http://127.0.0.1:5201','sourceSha256':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((root/'src').rglob('*')) if p.is_file()}},indent=2)+'\n',producer='root-baseline-browser')
print(r.stdout[-2000:]);print(r.stderr[-2000:]);sys.exit(r.returncode)
