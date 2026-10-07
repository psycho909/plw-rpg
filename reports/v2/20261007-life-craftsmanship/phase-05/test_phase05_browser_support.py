"""Small smoke tests for Phase 5 source/build provenance helpers."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

PHASE = Path(__file__).resolve().parent
sys.path.insert(0, str(PHASE))
from phase05_browser_support import (  # noqa: E402
    ReferencedAssets, file_map, mapping_fingerprint, sha_file, validate_build,
)


class BrowserSupportSmokeTest(unittest.TestCase):
    def test_recursive_map_includes_untracked_hidden_source_and_is_stable(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "src"
            source.mkdir()
            (source / "tracked.ts").write_text("export const ok = true\n", encoding="utf-8")
            hidden = source / ".local-untracked.ts"
            hidden.write_text("export const local = 1\n", encoding="utf-8")
            first = file_map(root, "src")
            self.assertIn("src/.local-untracked.ts", first)
            self.assertEqual(first, file_map(root, "src"))
            self.assertEqual(mapping_fingerprint(first), mapping_fingerprint(dict(reversed(list(first.items())))))
            hidden.write_text("export const local = 2\n", encoding="utf-8")
            self.assertNotEqual(mapping_fingerprint(first), mapping_fingerprint(file_map(root, "src")))

    def test_build_gate_rejects_changed_src_config_or_dist(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "src").mkdir()
            (root / "dist/assets").mkdir(parents=True)
            (root / "reports").mkdir()
            for name in ("package.json", "package-lock.json", "tsconfig.json", "vite.config.ts", "index.html"):
                (root / name).write_text(name + "\n", encoding="utf-8")
            (root / "src/untracked.ts").write_text("export const phase = 5\n", encoding="utf-8")
            (root / "dist/index.html").write_text('<script src="/assets/app.js"></script>\n', encoding="utf-8")
            (root / "dist/assets/app.js").write_text("void 0;\n", encoding="utf-8")
            build = root / "reports/build-status.json"
            status = {
                "exitCode": 0, "sourceStableDuringRun": True,
                "sourceSha256": file_map(root, "src"),
                "buildInputs": {name: sha_file(root / name) for name in
                                ("package.json", "package-lock.json", "tsconfig.json", "vite.config.ts", "index.html")},
                "distSha256": file_map(root, "dist"),
            }
            build.write_text(json.dumps(status), encoding="utf-8")
            self.assertEqual(validate_build(root, build)["exitCode"], 0)
            (root / "src/.later-untracked.ts").write_text("export const later = 1\n", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "recursive current src"):
                validate_build(root, build)

    def test_asset_parser_only_collects_script_and_stylesheet_paths(self) -> None:
        parser = ReferencedAssets()
        parser.feed('<link rel="stylesheet" href="/assets/app.css?v=1"><script src="/assets/app.js"></script><img src="/logo.png">')
        self.assertEqual(parser.paths, ["assets/app.css", "assets/app.js"])


if __name__ == "__main__":
    unittest.main()
