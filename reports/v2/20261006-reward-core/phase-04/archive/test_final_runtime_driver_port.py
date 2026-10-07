"""Pure contract test that one driver port reaches every local endpoint."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest
from urllib.parse import urlsplit


DRIVER_PATH = Path(__file__).with_name("final-runtime-driver.py")
SPEC = importlib.util.spec_from_file_location("phase4_final_runtime_driver_port", DRIVER_PATH)
assert SPEC is not None and SPEC.loader is not None
driver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(driver)


class FinalRuntimePortTests(unittest.TestCase):
    def test_server_listener_readiness_and_browser_helpers_share_free_port(self):
        parts = urlsplit(driver.URL)
        self.assertEqual(parts.hostname, "127.0.0.1")
        self.assertEqual(parts.port, driver.PORT)
        self.assertEqual(driver.PORT, 5214)
        self.assertEqual(driver.server_command()[3], str(driver.PORT))
        self.assertIn(f":{driver.PORT}", driver.listener_query()[-1])
        self.assertEqual(driver.browser_url_environment(), {"PLW_V2_URL": driver.URL})
        self.assertNotIn(5202, driver.server_command())
        self.assertNotIn("4506", driver.KNOWN_STALE_SERVER_PIDS)


if __name__ == "__main__":
    unittest.main()
