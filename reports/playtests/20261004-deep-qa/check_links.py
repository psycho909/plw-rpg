"""Read-only local Markdown link checks for this delivery scope."""
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]
EXTRA = [ROOT / "tickets/20261004-deep-qa.md", ROOT / "TODO.md",
         ROOT / "reports/v1/20261004-v1-delivery-summary.md",
         ROOT / ".scratch/20261004-deep-qa/handoff.md"]
files = sorted(BASE.rglob("*.md")) + [path for path in EXTRA if path.is_file()]
failures = []
checked = 0
for document in files:
    content = re.sub(r"```[\s\S]*?```|~~~[\s\S]*?~~~", "", document.read_text())
    content = re.sub(r"`+[^`\n]*`+", "", content)
    for match in re.finditer(r"\[[^\]\n]*\]\(([^)]+)\)", content):
        target = match.group(1).strip()
        if target.startswith("<") and ">" in target:
            target = target[1:target.index(">")]
        else:
            target = target.split(' "', 1)[0]
        url = urlsplit(target)
        if url.scheme or url.netloc or not url.path:
            continue
        local = unquote(url.path)
        local = re.sub(r":\d+$", "", local)
        resolved = Path(local) if local.startswith("/") else document.parent / local
        checked += 1
        if not resolved.exists():
            failures.append({"document": str(document.relative_to(ROOT)), "target": target})
result = {"status": "pass" if not failures else "fail", "documents": len(files),
          "localLinksChecked": checked, "failures": failures,
          "scope": "QA route Markdown plus current ticket, TODO, V1 postscript and existing task handoff; anchors and external URLs are not validated."}
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(0 if result["status"] == "pass" else 1)
