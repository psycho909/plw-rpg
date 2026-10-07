import unittest
from pathlib import Path

from runner_paths import assert_project_root, resolve_project_root


class RunnerPathTests(unittest.TestCase):
    def test_archive_script_resolves_checkout_with_package_and_source_markers(self):
        archive = Path(__file__).resolve().parent
        root = resolve_project_root(archive / "phase04_stress_browser.py")
        self.assertEqual(root, Path(__file__).resolve().parents[5])
        self.assertTrue((root / "package.json").is_file())
        self.assertTrue((root / "src").is_dir())
        self.assertEqual(assert_project_root(root), root)

    def test_incomplete_root_is_rejected(self):
        with self.assertRaises(AssertionError):
            assert_project_root(Path(__file__).resolve().parent)

    def test_non_project_script_ancestry_is_rejected(self):
        with self.assertRaises(AssertionError):
            resolve_project_root(Path("/tmp/not-a-project/runner.py"))


if __name__ == "__main__":
    unittest.main()
